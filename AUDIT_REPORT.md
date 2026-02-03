# EdgeChain Codebase Audit Report

Date: 2026-02-03

## Executive summary

This repo is a monorepo (Yarn 4 + Turbo) containing:

- `server/`: unified Express backend (FL + Arduino/IoT + SQLite) on port 3001.
- `ipfs-service/`: IPFS/Storacha microservice (ESM Express) on port 3002.
- `proof-server/`: farmer-owned Raspberry Pi proof server (Express + WebSocket + LoRa serial) with Merkle tree persistence.
- `packages/ui`, `packages/contract`, etc.

The codebase is **hackathon-stage** with multiple “mock” proof paths and several places where production-looking endpoints exist without strong gating.

Top issues:

- **Critical secret exposure risk**: wallet seed/address files exist in the repo root.
- **Correctness drift**: DB schema vs query mismatch (`spent_nullifiers.collection_mode`).
- **Merkle root non-determinism**: registry Merkle root/proofs can change across restarts due to unstable device ordering.
- **Port collision**: `proof-server` and `ipfs-service` both default to 3002.

---

## Architecture map

### Tooling / build

- Root `package.json`: Yarn 4.9.2 workspaces + Turbo.
- Node engine at root: `>=22`, but docker and workflows use Node 20; proof-server engine says `>=18`. This creates potential runtime API differences.

### Runtime services

#### 1) `server/` (Unified backend)

- Entry point: `server/src/index.ts`
- Port: `process.env.PORT || 3001`
- Responsibilities:
  - Federated Learning routes: `/api/fl/*`
  - Arduino/IoT + ZK flows: `/api/arduino/*`
  - SQLite persistence via `better-sqlite3` at `data/edgechain.db`
  - Serves:
    - `/gateway` static files from `../gateway`
    - SPA static from `../packages/ui/dist`

#### 2) `ipfs-service/` (IPFS microservice)

- Entry point: `ipfs-service/index.mjs`
- Default port: `3002` (hardcoded)
- Responsibilities:
  - `POST /upload`: stores ZK proof submissions in IPFS (Storacha) or returns mock CID
  - `GET /retrieve/:cid`: fetches from gateway or returns mock
  - `GET /health`

#### 3) `proof-server/` (Farmer-owned proof server)

- Entry point: `proof-server/src/index.ts`
- Default port: `3002` (from `proof-server/src/utils/config.ts`)
- Responsibilities:
  - Receives LoRa packets via `serialport`
  - BRACE commitment registry via Merkle tree
  - (Mock) proof generation & (mock) submission to Midnight
  - WebSocket updates
  - Persists Merkle leaves list to `./data/merkle-tree.json`

### Deployment / CI

- GitHub Actions contains a Fly.io deploy workflow (`.github/workflows/deploy-flyio.yml`).
- `server/fly.toml` deploys `Dockerfile.unified`, mounts `/app/data` volume, and sets `IPFS_SERVICE_URL=https://edgechain-ipfs.fly.dev`.
- No CI workflow is present for tests/lint/typecheck on PRs.

---

## Critical findings

### C1) Wallet seed material is present in the repository

Evidence:

- Repo root contains `DEPLOYMENT_WALLET_SEED.txt` and `DEPLOYMENT_WALLET_ADDRESS.txt`.

Impact:

- Treat as **full compromise** of that wallet.
- If the repo is public (or becomes public), funds can be drained and deployments can be impersonated.

Recommendation:

- Rotate keys immediately and remove from git history.
- Move secrets into a secret manager and/or environment variables.
- Add defensive ignore rules (e.g. `*SEED*`, `*WALLET*`, `*.mnemonic`, etc.).

### C2) DB schema vs code mismatch: `spent_nullifiers` query references nonexistent column

Evidence:

- Schema `server/src/database/schema.sql` defines table `spent_nullifiers` with columns:
  - `nullifier`, `epoch`, `data_hash`, `reward`, `spent_at`.
- `server/src/services/nullifierTracking.ts` method `getNullifierDistribution()` queries `collection_mode`, which does not exist.

Impact:

- Any endpoint that calls this will throw SQL errors at runtime.

Recommendation:

- Either:
  - add `collection_mode` column to `spent_nullifiers` and write it in `markNullifierSpent()`, or
  - remove that dimension from the query.

### C3) Merkle root / proof generation is non-deterministic across restarts (server registry)

Evidence:

- `DeviceRegistryService` builds leaves and computes `leaf_index` based on `Array.from(this.devices.values())`.
- Devices are loaded from DB using `SELECT * FROM devices` without `ORDER BY`.

Impact:

- Merkle root can change between restarts even when device set is identical.
- Proofs and root-matching checks can intermittently fail.

Recommendation:

- Enforce deterministic ordering:
  - Load devices with `ORDER BY device_pubkey` (or `created_at`), and
  - Sort `allDevices` before building leaves/proofs.

### C4) Port collision: proof-server and ipfs-service both default to port 3002

Evidence:

- `ipfs-service/index.mjs` uses `PORT = 3002`.
- `proof-server/src/utils/config.ts` default config uses `port: 3002`.

Impact:

- Both services cannot run locally simultaneously with defaults; documentation becomes ambiguous.

Recommendation:

- Standardize ports via env vars and update docs:
  - `server`: 3001
  - `proof-server`: 3002
  - `ipfs-service`: 3003 (or swap, but pick one consistent scheme)

---

## High severity findings

### H1) Missing authentication/authorization for sensitive endpoints

Evidence:

- `server`:
  - `/api/fl/reset` resets aggregation state.
  - `/api/arduino/reset` resets in-memory registry.
  - Device registration and proof endpoints are generally open.
- `proof-server`:
  - `/register-commitment` is open.

Impact:

- Anyone can reset state, spam registries, and abuse resources.

Recommendation:

- Add a minimal admin gate:
  - `DEMO_MODE` gating (default false) for reset endpoints,
  - or API key / shared secret header,
  - or bind admin endpoints to localhost.

### H2) CORS is fully open across services

Evidence:

- `app.use(cors())` is used without restrictions in `server`, `proof-server`, and `ipfs-service`.

Impact:

- Increases attack surface and enables browser-origin abuse.

Recommendation:

- Restrict allowed origins via `CORS_ORIGIN` allowlist.

### H3) “ZK proof” flows are mostly mock implementations but exposed as normal endpoints

Evidence:

- `/api/arduino/prove` returns mock structures.
- `ZKProofService.generateProof()` generates a mock proof string.
- `proof-server/MidnightProver` generates mock proofs and mock tx results.

Impact:

- Easy to accidentally treat mock proofs as real, leading to insecure acceptance/reward behavior.

Recommendation:

- Introduce a global feature flag `REAL_ZK_ENABLED`.
- If false, return `501 Not Implemented` unless `DEMO_MODE=true`.

### H4) Time/epoch semantics are inconsistent across code paths and DB

Evidence:

- `NullifierTrackingService` epoch is days since epoch.
- `proof-server` computes epoch from device timestamp (seconds) and uses seconds-vs-millis in other areas.
- `DatabasePersistenceService.registerDevice` stores `registration_epoch` and `expiry_epoch` as Unix seconds, but `DeviceRegistryService` uses “epoch days”.

Impact:

- Replay protection and expiry/consistency logic can be wrong or bypassed.

Recommendation:

- Pick canonical units (seconds recommended for DB) and distinguish:
  - `*_ts` for timestamps (seconds)
  - `epoch_day` for daily epochs

---

## Medium severity findings

### M1) Schema/design drift around signatures

Evidence:

- Schema stores `signature_r` and `signature_s`.
- Code stores full signature in `signature_r` and empty in `signature_s`.

Impact:

- Confusing invariants; easy to break consumers.

Recommendation:

- Store as a single `signature` column, or store properly split values.

### M2) Critical state kept only in memory

Evidence:

- FL aggregation state in `AggregationService` is in-memory.
- Device auth challenges are in-memory.
- Proof-server spent nullifiers are in-memory in `AcrHandler`.

Impact:

- Restarts reset state and allow replay/duplication.

Recommendation:

- Persist critical state (DB/Redis) or explicitly gate as demo-only.

### M3) proof-server auto-registers unknown commitments

Evidence:

- `BraceVerifier.verifyPacket()` auto-registers a commitment if it is unknown.

Impact:

- Enables registry growth/spam. Weakens enrollment controls.

Recommendation:

- Add rate-limiting and/or an explicit enrollment policy.

---

## Low severity / hygiene

### L1) Missing CI workflow for PR validation

Evidence:

- Only deploy workflow exists.

Recommendation:

- Add CI on PRs that runs:
  - install
  - typecheck
  - lint
  - unit tests

### L2) Node version inconsistency

Evidence:

- Root engine `>=22`, docker uses Node 20, proof-server engine `>=18`.

Impact:

- Potential runtime differences (`fetch`, `Blob`, ESM behaviors).

Recommendation:

- Standardize to one version and enforce in all package `engines` + Docker + workflows.

---

## Suggested remediation roadmap

### Phase 0 (immediate)

- Remove/rotate wallet seed material.
- Fix `spent_nullifiers` query/schema mismatch.
- Resolve port collisions and update documentation.

### Phase 1 (hardening)

- Deterministic Merkle ordering for roots/proofs.
- Gate sensitive endpoints with auth or `DEMO_MODE`.
- Restrict CORS.

### Phase 2 (correctness alignment)

- Normalize timestamp/epoch semantics across services and DB.
- Consolidate proof pipeline and enforce `REAL_ZK_ENABLED`.

---

## Appendix: key files reviewed

- Root: `package.json`, `turbo.json`, `.env.example`, `.github/workflows/deploy-flyio.yml`, `Dockerfile.unified`, `README.md`
- Server: `server/src/index.ts`, `server/src/routes/aggregation.ts`, `server/src/routes/iot.ts`, `server/src/database/index.ts`, `server/src/database/schema.sql`, `server/src/services/*`
- IPFS: `ipfs-service/index.mjs`, `ipfs-service/package.json`, `ipfs-service/fly.toml`
- Proof-server: `proof-server/src/index.ts`, `proof-server/src/utils/config.ts`, `proof-server/src/merkle-tree.ts`, `proof-server/src/brace-verifier.ts`, `proof-server/src/acr-handler.ts`, `proof-server/src/midnight-prover.ts`, `proof-server/src/lora-receiver.ts`
