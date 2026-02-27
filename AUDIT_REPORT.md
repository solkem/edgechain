# EdgeChain Repository Audit Report

Date: 2026-02-27
Scope: Full repository static review + targeted build/runtime validation

## Publication Status

This report revision is currently committed on the working branch and is intended to be merged to `main` through a standard pull request workflow.

Until that PR is merged and the branch is pushed to GitHub, users browsing `main` may continue to see the previous report revision.

## 1) Executive Summary

EdgeChain currently implements a broad prototype of the stated Msingi architecture (ESP32 firmware, proof server, unified backend, UI, contract scaffolding), but there are several **production-blocking correctness and assurance gaps** across the backend and operational pipeline.

Overall maturity assessment:

- **Architecture completeness:** Medium (major components exist)
- **Cryptographic/data-path correctness:** Low-Medium (mock paths still active in core flows)
- **Operational hardening:** Low-Medium (auth, test coverage, CI confidence not yet at production level)
- **Build health:** Medium (proof-server builds; server build currently fails)

Top priority findings from this audit:

1. **Schema–code drift in `server` causes runtime SQL failures** for multiple write paths.
2. **`server` TypeScript build fails** due to invalid type import paths.
3. **Mock proof/reward behavior is still active on critical routes**, with limited hard fail gating.
4. **Sensitive reset/control routes are inconsistently protected** (`/api/fl/reset` open).
5. **Validation/test posture is weak** (proof-server has no tests; backend test script target is missing).

---

## 2) Requirements-to-Implementation Traceability

Reference requirements were taken from `README.md` (architecture, current-state claims, ports/endpoints, and implementation caveats).

### Requirement A: Msingi 3-layer architecture present

Status: **Partially satisfied**

- Layered components exist in repo structure:
  - Layer 1 firmware (`firmware/esp32-msingi`)
  - Layer 2 proof server (`proof-server`)
  - Layer 3 contract workspace (`packages/contract`)
- However, proof generation/submission still includes mock fallback behavior in core flows, so end-to-end cryptographic guarantees are not yet consistently “real mode.”

### Requirement B: Unified backend (FL + IoT) with SQLite persistence

Status: **Partially satisfied (with critical correctness defects)**

- Unified backend routing and DB initialization are present.
- But schema and query/write code are out of sync in multiple places (details in Findings F1), resulting in runtime failure for some table writes.

### Requirement C: Proof server + LoRa + Merkle + API/WebSocket surface

Status: **Mostly satisfied**

- Proof server starts with API and WebSocket surfaces, LoRa receiver integration, Merkle state load/save.
- Still allows operation in API-only/offline/mock modes, which is useful for demos but not a hard-assurance production mode.

### Requirement D: Explicit documentation that parts are still mock/in-progress

Status: **Satisfied**

- README acknowledges mixed real/mock state.
- Code behavior aligns with that caveat (mock proof generation and mock tx results are in active paths).

---

## 3) Detailed Findings

## F1 (Critical): Server schema-code drift causes runtime SQL errors

Severity: **Critical**  
Impact: Proof submission, aggregation persistence, and Merkle root persistence code paths can fail at runtime despite successful service startup.

Evidence:

- `server/src/database/index.ts` inserts/queries columns that are not present in `server/src/database/schema.sql`:
  - `batch_proofs.collection_mode` referenced by insert but not defined.
  - `merkle_roots.collection_mode` referenced by insert/query but not defined.
  - `zk_proof_submissions.collection_mode` inserted in route code but not defined.
- Reproduction check (executed in this audit) confirms SQL exceptions:
  - `table batch_proofs has no column named collection_mode`
  - `table zk_proof_submissions has no column named collection_mode`

Recommendation:

- Reconcile schema and data access layer immediately.
- Add migration strategy and schema-version guard at startup.
- Add integration tests that execute representative insert/query paths against a fresh DB.

## F2 (High): Server TypeScript build currently fails

Severity: **High**  
Impact: Reduces release confidence; can mask additional regressions.

Evidence:

- `npm run build` in `server/` fails due to unresolved imports from `../types/arduino` while only `server/src/types/iot.ts` exists.

Recommendation:

- Fix type import paths in affected services (`bleReceiver.ts`, `databasePersistence.ts`) to existing type modules.
- Add CI gate to fail PRs on backend build/typecheck failure.

## F3 (High): Mock cryptographic and reward paths remain in critical APIs

Severity: **High**  
Impact: Users/integrators can mistake demo behavior for verifiable cryptographic enforcement.

Evidence:

- IoT proof generation route explicitly returns mock proof structures.
- IoT submit/claim and proof-server components include mock verification/proof/tx fallback behavior.

Recommendation:

- Introduce explicit mode controls:
  - `DEMO_MODE=true` enables mock routes.
  - Default production mode should reject mock-only operations with clear `501/503` responses.
- Add response metadata fields indicating `assurance_level` (`mock`, `simulated`, `verified`).

## F4 (Medium): Control-plane reset routes are inconsistently protected

Severity: **Medium**  
Impact: Remote callers can reset state in exposed environments.

Evidence:

- `/api/arduino/reset` is gated behind `DEMO_MODE`.
- `/api/fl/reset` remains openly callable without auth or mode checks.

Recommendation:

- Apply consistent admin gating pattern across all reset/admin routes.
- Add optional API key or local-only binding for administrative endpoints.

## F5 (Medium): Validation/test posture is insufficient for production confidence

Severity: **Medium**  
Impact: Regressions can ship undetected.

Evidence:

- `proof-server` test command returns “No tests found”.
- `server` package test script points to a missing file (`src/test-single-tree.ts`).
- Root build requires unavailable external tool (`compact`) without fallback, limiting full CI reproducibility in generic environments.

Recommendation:

- Add smoke tests for core backend routes and DB writes.
- Add at least one proof-server unit test suite (Merkle, nullifier, API contracts).
- Split contract compilation into optional job or provide deterministic tool bootstrap in CI.

---

## 4) Positive Observations

- The repository clearly documents architectural intent and openly states mock/in-progress areas.
- LoRa baseline config values are aligned across proof-server and firmware defaults.
- Several prior hardening improvements appear present (e.g., deterministic sorting in device registry Merkle root rebuild; partial CORS tightening in backend).

---

## 5) Priority Remediation Plan

### Phase 0 (Immediate: correctness blockers)

1. Fix schema-code drift (`collection_mode` and other mismatches).
2. Fix server build/type import errors.
3. Add startup self-check that validates required table/column presence.

### Phase 1 (Security + assurance)

1. Lock all reset/admin endpoints behind explicit auth or DEMO_MODE gates.
2. Enforce strict production mode that disallows mock proof/reward routes.
3. Standardize and enforce CORS policy across all services.

### Phase 2 (Quality + operability)

1. Add CI for typecheck/build/tests across server/proof-server/ui.
2. Add deterministic integration tests for DB schema and key route paths.
3. Add operational metrics for mode status (`mock vs real`), proof success ratio, and replay rejection counts.

---

## 6) Validation Commands Run During This Audit

- `npm run build` (in `server/`) → failed (type import path errors)
- `npm run build` (in `proof-server/`) → passed
- `npm test` (in `proof-server/`) → failed (no tests discovered)
- `yarn build` (repo root) → failed in contract package (`compact` command not found)
- In-memory SQLite reproduction script against `server/src/database/schema.sql` → confirmed missing column runtime failures for `collection_mode` writes
