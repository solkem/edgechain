# EdgeChain

> **Prove quality. Keep privacy. Own rewards.**
>
> AI-powered, and privacy-preserving, microclimate intelligence for smallholder agriculture, built on Midnight's zero-knowledge infrastructure.

EdgeChain is built on the Midnight Network.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Midnight Testnet](https://img.shields.io/badge/Midnight-Network-8B5CF6)](https://midnight.network)
[![Python Lab CI](https://github.com/solkem/edgechain/actions/workflows/python-lab-ci.yml/badge.svg)](https://github.com/solkem/edgechain/actions/workflows/python-lab-ci.yml)
[![SDG 1](https://img.shields.io/badge/SDG-1%20No%20Poverty-E5243B)](https://sdgs.un.org/goals/goal1)
[![SDG 2](https://img.shields.io/badge/SDG-2%20Zero%20Hunger-DDA63A)](https://sdgs.un.org/goals/goal2)
[![SDG 10](https://img.shields.io/badge/SDG-10%20Reduced%20Inequalities-DD1367)](https://sdgs.un.org/goals/goal10)
[![SDG 17](https://img.shields.io/badge/SDG-17%20Partnerships-19486A)](https://sdgs.un.org/goals/goal17)

**Live app:** [edgechain-midnight.fly.dev](https://edgechain-midnight.fly.dev)
**Project platform:** [DisruptiveIoT.org](https://disruptiveiot.org)  
**Contact:** [Solomon Kembo](https://linkedin.com/in/solomonkembo)

---

## The Problem

In Manicaland Province, Zimbabwe, smallholder tobacco and maize farmers generate something buyers, insurers, climate modelers, and agricultural researchers all need: hyper-local microclimate data. Soil moisture, rainfall, humidity, and temperature measured at farm level are far more useful than regional averages from a distant weather station.

But farmers cannot safely share that data in the open.

In fragile and adversarial environments, farm-level data can be turned against the people who produce it. The same information that could improve crop forecasts or unlock better insurance products can also be used to calibrate underpayment, reject credit, or expose politically sensitive identities and locations. The result is a trust failure with real economic cost:

- valuable data remains unused
- collective AI models stay weak
- farmers lose bargaining power
- institutions cannot collaborate without creating new risk

**The data exists. The trust does not.**

EdgeChain is designed to close that gap.

---

## What EdgeChain Does

EdgeChain lets a device prove facts about agricultural data without revealing the underlying data itself.

```text
Device proves: "My soil moisture reading is above threshold"
Chain verifies: yes
Buyer receives: proof of quality
Buyer cannot see: which farm, which farmer, or the raw sensor value
```

That capability becomes is achieved through these privacy-preserving technologies:

1. **Federated learning**
Local models train on-device. Raw farm data never has to leave the farm.

2. **Zero-knowledge proofs**
Devices can prove contribution quality, threshold conditions, or eligibility without revealing identity, location, or raw values.

3. **Midnight smart contracts**
Reward eligibility, replay resistance, and private coordination can happen on-chain without forcing a coordinator to custody farmer identities.

The strongest "why Midnight" moment is the reward-eligibility flow: EdgeChain needs to verify contribution quality, prevent double claims, and support private settlement without revealing which device belongs to which farmer. That specific combination makes Midnight a structural requirement, not a branding choice.

### How to read this repository

EdgeChain is not a single chatbot demo. The repository combines a privacy protocol prototype, a reproducible AI oversight lab, and an applied farmer pilot:

| Area | What it demonstrates | What it is not |
|------|----------------------|----------------|
| **Core protocol / infrastructure** | Midnight contracts, MARS contribution scoring, firmware scaffolding, Freedom Node services, IPFS artifact paths, and the privacy-preserving reward-eligibility direction. | A fully production-hardened, end-to-end deployed farmer payment network. |
| **AI Oversight Lab** | Synthetic experiments for adversarial federated learning, MARS scoring behavior, and privacy-safe LLM oversight of ambiguous failures. | A system trained on real pilot farmer data. |
| **Applied farmer pilot** | AI Farm Manager, Virtual Ndani Kit manual observations, coordinator administration, timelines, reports, monitoring, and a low-friction farmer PIN login. | A replacement for the long-term wallet, hardware identity, and farmer-owned data architecture. |

For the shortest status-oriented review, start with [`CODEBASE_STATUS.md`](CODEBASE_STATUS.md).

### Two product experiences

The current application intentionally supports two audiences from one codebase:

| Experience | Entry point | Purpose |
|------------|-------------|---------|
| **EdgeChain MVP** | `/` on real domains | Wallet-first Midnight, privacy, federated learning, proof, and reward-eligibility story. |
| **Farmer pilot** | `/pilot-login` or `/` on farmer-oriented domains | Farmer number + PIN access to the AI Farm Manager, Virtual Ndani Kit, manual readings, and coordinator support without requiring wallet literacy on day one. |

This is a staged adoption strategy, not a split vision. Farmers can receive immediate value through a low-friction pilot while EdgeChain continues toward farmer-controlled data, hardware identity, AI memory, privacy-preserving proofs, and federated model participation.

---

## Why It Matters

EdgeChain is built for a context where privacy is not a luxury feature. It is the condition that makes participation possible.

For smallholder farmers, privacy-preserving verification can unlock:

- compensation for data contributions without surrendering identity
- stronger local agronomic models
- cooperative bargaining power
- future insurance and marketplace participation without central data extraction

For institutions, it enables collaboration with farmer communities without demanding full access to the raw data that creates political, legal, and ethical risk.

---

## SDG Alignment

| SDG | Connection |
|-----|------------|
| **SDG 1 - No Poverty** | Farmers can earn compensation for verified contributions instead of having data extracted without compensation. |
| **SDG 2 - Zero Hunger** | Hyper-local microclimate signals support better timing of inputs, interventions, and forecasts. |
| **SDG 10 - Reduced Inequalities** | Farmers can prove eligibility and quality without surrendering identity data that can be used against them. |
| **SDG 17 - Partnerships for the Goals** | The architecture supports collaboration among cooperatives, NGOs, insurers, and buyers without creating a new centralized data dependency. |

---

## Research Lineage

EdgeChain was not invented as a hackathon concept and then reverse-fitted into a use case. It comes out of a longer research program on privacy-preserving IoT, edge systems, and cooperative data ownership in agricultural settings.

| Year | Venue | Contribution |
|------|-------|--------------|
| 2020 | IEOM | [Privacy-Preserving IoT Edge and Fog Architecture](https://index.ieomsociety.org/index.cfm/item/47585) |
| 2020 | IEOM | [GDPR-inspired “data portability” and personal data monetization opportunities](https://index.ieomsociety.org/index.cfm/item/47584) |
| 2023 | Emerald IJIEOM | [Privacy-preserving federated learning on edge endpoints](https://doi.org/10.1108/IJIEOM-02-2023-0020) |
| 2023 | Emerald IJIEOM | [Attribute-based credentials and permissioned blockchain design](https://doi.org/10.1108/IJIEOM-02-2023-0021) |

The core problem definition predates Midnight's public developer tooling. Midnight became compelling because it finally offered infrastructure that could satisfy the privacy and coordination requirements the system already had.

---

## Python Research Lab

EdgeChain includes a Python AI Oversight Lab for testing contribution scoring, adversarial federated learning behavior, and oversight under privacy constraints.

The lab uses synthetic data only. It does not expose farmer identities, private keys, wallet data, real GPS coordinates, raw pilot readings, or production secrets.

It currently includes:

- synthetic Odzi microclimate generation
- MARS contribution scoring
- adversarial FL attack scenarios
- baseline aggregation comparison
- LLM oversight dry-run evaluation

The lab is the fellowship/research-facing oversight layer. It is separate from the applied AI Farm Manager pilot: the pilot helps farmers manage observations and decisions, while the lab evaluates how EdgeChain can detect unsafe contribution behavior when raw data is intentionally hidden.

See [`research/python-lab`](research/python-lab) for the implementation, tests, and experiment entry points.

Reward values in the lab are abstract accounting units for simulation and fairness analysis. They are not DUST or tDUST; DUST/tDUST are transaction-execution resources, not farmer compensation. A production reward layer should use a separate settlement or redemption instrument such as NIGHT, a stablecoin, cooperative credits, or mobile money.

---

## Prototype Boundaries

EdgeChain currently demonstrates the privacy-preserving FL/Midnight direction and the Odzi farmer pilot path, but several components are intentionally prototype-grade. Local model training runs in the browser with TensorFlow.js, demo datasets are used when live sensor-node data is unavailable, and some infrastructure paths use simulated ZK proofs, mock IPFS CIDs, local browser storage, and simulation-mode contract calls. These choices keep the prototype runnable while preserving the intended architecture.

The current Odzi pilot implementation is also deliberately human-assisted. Most pilot farmers do not yet have physical Ndani Kit hardware, so the app provides a **Virtual Ndani Kit** that records human-entered observations, labels them correctly as manual observations, and shows how future physical hardware will automate more readings. Manual pilot observations must never be described as physical sensor measurements.

The AI Farm Manager is an applied pilot layer, not the whole EdgeChain architecture. It now includes farmer AI profiles, structured memories, weekly check-ins, generated plans, recommendation outcomes, prompt invocation telemetry, timeline/report views, monitoring, and coordinator onboarding. Its job is to make the farmer pilot useful now while the protocol, hardware, and decentralized data-control layers continue toward production maturity.

IPFS is used as an artifact layer for model, proof, and audit data; it should not be treated as privacy or permanence by itself. Sensitive artifacts must be encrypted before upload, and production durability requires pinning, replicated storage providers, lifecycle rules, and potentially Filecoin-style storage deals.

The production path replaces these scaffolds with hardware-backed device identity, real Compact/Midnight proof generation, durable encrypted model storage, native or edge-node local training, persistent aggregation state, and audited on-chain reward settlement.

---

## Architecture

```text
Layer 4 - Settlement (forward-looking)
Cardano-linked treasury and reward rails are a direction under exploration. Phase A and Phase B both run on Midnight testnet02 today; nothing in the current code path requires a separate settlement layer.

Layer 3 - Midnight Network (non-negotiable)
Private contract state, Compact contracts, nullifier-based replay prevention, and ZK-aware reward-eligibility logic.

Layer 2 - Freedom Node (farmer-owned proof server)
Receives LoRa packets, manages commitment state, generates or coordinates proofs, and submits to Midnight.

Layer 1 - Sensor Node
ESP32-S3 + ATECC608B + LoRa + environmental sensors, with keys protected in hardware.
```
### Curve separation

ATECC608B is a NIST-curve part (P-256). Midnight uses Pluto-Eris for ZK circuits. The two coexist by separation, not bridging:

1. Devices sign sensor packets with P-256 inside the secure element. The private key never leaves the chip.
2. P-256 verification happens **outside** the circuit, on the Freedom Node, in normal code.
3. Inside the circuit, the device pubkey bytes are treated as arbitrary input data and hashed with Poseidon (~250 constraints), not verified as a curve point (which would force ~25k constraints via SHA-256).

The circuit attests *"I know a valid P-256 signature from a registered device"* without performing P-256 curve operations on Pluto-Eris. The secure element's NIST constraint and Midnight's curve choice are mutually compatible without replacing either.

**Critical design choice:** proof generation can expose witness-level information. Because of that, the proof server is part of the privacy model. EdgeChain is designed around a farmer-owned "Freedom Node" rather than a trusted third-party gateway.

### Privacy Guarantees

| Label | Guarantee |
|-------|-----------|
| PG1 | Device anonymity within an anonymity set |
| PG2 | Cross-epoch unlinkability for attestations |
| PG3 | Proofs reveal predicate satisfaction, not raw values |
| PG4 | Replay resistance through nullifier tracking |
| PG5 | Limited metadata exposure at the proof-server layer |
| PG6 | Hardware-backed key protection via ATECC608B |

---

## Pilot Phasing

The Odzi pilot now has two complementary goals:

1. **Demonstrate Full Privacy and FL Features:** show why EdgeChain’s long-term privacy, wallet, Midnight, hardware, and federated-learning architecture matters.
2. **Farmer Pilot:** show each pilot farmer that an AI Farm Manager can remember their farm, organize observations, advise practically, and follow up without forcing wallet usage on day one.

### Phase A - Farmer-first AI + Virtual Ndani Kit pilot

Phase A delivers immediate farmer value and documentation without requiring any Midnight transaction from pilot farmers. It is designed for a 20-farmer Odzi cohort using:

- farmer number + PIN login,
- one coordinator/admin account,
- one shared Gemini account at provider level with farmer context isolated in EdgeChain,
- one EdgeChain profile and farm profile per farmer,
- one Virtual Ndani Kit per farmer/farm,
- manual field observations entered by farmers or a coordinator,
- coordinator review for risky or uncertain readings,
- AI Farm Manager profile onboarding,
- weekly check-ins and farm-manager plans as the next implementation phase.

The Phase A promise is:

```text
Today:
Farmers enter observations manually. EdgeChain remembers, organizes, advises, and follows up.

Next:
Ndani Kit hardware automates more readings.

Future:
Farmers build private, farmer-controlled intelligence records. In production, EdgeChain should let farmers control access to their data, Ndani Kit hardware identity, AI agent memory, and participation in federated learning or research.
```

### Phase B - Physical Ndani Kit and first load-bearing Midnight transaction

Phase B introduces physical Ndani Kit hardware and Midnight at the precise point where its guarantees become structurally irreplaceable: an anonymous contribution proof that simultaneously verifies data quality, prevents double-claiming, and supports private reward eligibility **without revealing device-to-farmer linkage**. That specific combination is what makes Midnight a structural requirement, not a branding choice.

### Current implementation footprint

Demonstrable today:

- ESP32 firmware scaffolding in [`firmware/esp32-ndani`](firmware/esp32-ndani)
- In-repo Node.js proof server in [`apps/freedom-node/proof-server`](apps/freedom-node/proof-server)
- Unified backend flows in [`apps/freedom-node`](apps/freedom-node)
- React UI in [`apps/web`](apps/web)
- IPFS integration in [`apps/ipfs-service`](apps/ipfs-service)
- Compact contracts and deployment artifacts in [`packages/contract`](packages/contract)
- Python research lab in [`research/python-lab`](research/python-lab) for synthetic FL, MARS scoring, adversarial scenarios, and oversight evaluation
- AI Farm Agent and Farm Assistant foundation
- Virtual Ndani Kit manual-observation workflow
- coordinator dashboard for fleet, farmer administration, review, evidence CSV, and operations metrics
- farmer creation, update, PIN reset, deletion, and AI Farm Manager profile onboarding
- AI Farm Manager profiles, structured memories, weekly check-ins, generated plans, outcomes, prompt invocation telemetry, chat context packs, timeline, reports, monitoring, and evals
- domain/site-mode foundation for separate full features and farmer experiences
- Two contracts deployed on Midnight testnet02
- Live demo services on Fly.io
- Freedom Node validated end-to-end in Maryland (Ubuntu Server 24.04 LTS + Docker + `midnightntwrk/proof-server:7.0.0`)


In progress before Phase B:

- end-to-end ZK proof generation and submission across all live flows
- full anonymous device registration and reward-eligibility path
- reduction of simulated contract paths in the UI/backend
- production observability, queueing, and failure handling

Longer-term directions:

- cooperative risk pools
- attestation marketplace services
- offline-first farmer knowledge agents
---

## Repository Layout

For a production-domain view of the current folders and the recommended target
shape, including the Farmer-Owned Nodes and Exit Rights principle, see
[`ARCHITECTURE.md`](ARCHITECTURE.md).

```text
edgechain/
|- .github/
|  |- workflows/        CI/CD, including Python Lab validation
|- apps/
|  |- web/              React frontend
|  |- freedom-node/     Unified backend and Freedom Node services
|  |  |- src/ai-farm-manager/  AI Farm Manager profiles, memory, plans, chat, timeline, reports, monitoring, and evals
|  |  |- proof-server/  In-repo proof/device orchestration service
|  |- ipfs-service/     Storacha/IPFS microservice
|- packages/
|  |- contract/         Compact contracts and deployment scripts
|  |- fl/               Production FL aggregation and model-update types
|  |- mars/             Production MARS scoring and reward eligibility
|  |- cli/              CLI tools and scripts
|- research/
|  |- python-lab/       Synthetic FL, MARS scoring, attack, and oversight experiments
|- firmware/            ESP32 firmware
|- docs/                Project documentation
|- scripts/             Repository toolchain checks
|- demo/                Demo assets and supporting material
```

### Testnet Deployment Artifacts

Current Midnight testnet02 deployment artifacts recorded in [`packages/contract/deployment.json`](packages/contract/deployment.json). These contracts support prototype validation and are not production deployments.

| Contract | Address |
|----------|---------|
| Sensor Node | `02001d6243d08ba466d6a3e32d9a04dd1d283d8fe2b9714cde81a25fa9081087b30a` |
| Federated Learning | `02002f44e466b8c8a1422e269156a6bb4e098cde1007203adf7181eb6659211dbe39` |

### Live Services

| Service | URL |
|---------|-----|
| Unified app and backend | [edgechain-midnight.fly.dev](https://edgechain-midnight.fly.dev) |
| IPFS Service | [edgechain-ipfs.fly.dev](https://edgechain-ipfs.fly.dev) |

The unified Fly app serves both the React frontend and backend API. Code-level site mode support is in place for separate custom domains:

| Domain type | Behavior |
|-------------|----------|
| Real / technical domain | `/` remains wallet-first and highlights privacy, Midnight, federated learning, and proof infrastructure. |
| Farmer / pilot domain | `/` redirects to `/pilot-login` for farmer number + PIN access without wallet friction. |

Custom domains still require Fly certificate and DNS configuration outside the repository.

---

## Local Development

### Prerequisites

- Node.js 22+
- Yarn 4.x
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/) for the research lab
- npm for standalone service folders such as `apps/ipfs-service` and `apps/freedom-node/proof-server`
- PlatformIO for firmware work
- CompactC >= 0.28.0 only when running root-level commands that build/check Compact contracts
- Optional hardware for full integration testing

### Setup

```bash
git clone https://github.com/solkem/edgechain.git
cd edgechain
yarn install

# Backend database for local development
docker run --name edgechain-postgres \
  -e POSTGRES_USER=edgechain \
  -e POSTGRES_PASSWORD=edgechain \
  -e POSTGRES_DB=edgechain \
  -p 5432:5432 \
  -d postgres:16
export DATABASE_URL=postgresql://edgechain:edgechain@localhost:5432/edgechain

# Build contract/api/cli workspaces. Root build/dev commands run the
# CompactC toolchain check.
yarn build:node

# Build the UI workspace
yarn build:ui

# Start all package dev tasks. Requires CompactC on PATH because the root
# predev check validates the full Midnight toolchain.
yarn dev

# Or run pilot/web services individually without CompactC
npm run dev --workspace @edgechain/freedom-node
npm run dev --workspace @edgechain/web

# Optional standalone services
cd apps/freedom-node/proof-server && npm install && npm run dev
cd apps/ipfs-service && npm install && npm run dev
```

`apps/freedom-node` initializes its PostgreSQL schema from
`apps/freedom-node/src/database/schema.sql` during startup. Production and Fly
deployments must provide `DATABASE_URL` through secrets or a managed Postgres
attachment.

Health checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Local farmer pilot testing

For local pilot testing, the web app needs pilot feature flags at startup. `apps/web/.env.local` can contain:

```bash
VITE_API_URL=http://localhost:3001
VITE_AGENT_ENABLED=true
VITE_VIRTUAL_NDANI_ENABLED=true
VITE_VIRTUAL_NDANI_COORDINATOR_ENABLED=true
VITE_VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED=false
VITE_VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED=false
VITE_WALLET_SITE_HOSTS=localhost,127.0.0.1
VITE_FARMER_SITE_HOSTS=odzi.localhost,farmers.localhost,pilot.localhost
```

Restart the Vite dev server after changing `VITE_*` values.

Useful local URLs:

| URL | Purpose |
|-----|---------|
| `http://localhost:8080/` | wallet-first home |
| `http://localhost:8080/pilot-login` | farmer / coordinator PIN login |
| `http://localhost:8080/coordinator` | coordinator dashboard after admin login |
| `http://localhost:8080/virtual-ndani` | farmer Virtual Ndani Kit after farmer login |

Pilot integration tests that touch PostgreSQL require `DATABASE_URL`, for example:

```bash
npm run test:ai-farm-manager:integration --workspace @edgechain/freedom-node
npm run test:coordinator:integration --workspace @edgechain/freedom-node
npm run test:virtual-ndani:integration --workspace @edgechain/freedom-node
```

Wallet note:
- Use 1AM Wallet for Midnight dApp access
- Lace with Midnight enabled can be used as a fallback compatible wallet
- For local proving, the proof-server endpoint is typically `http://localhost:6300`

### Python Lab

```bash
cd research/python-lab
uv sync
uv run pytest
uv run ruff check .
uv run mypy src

# Example experiment entry points
uv run python -m edgechain_lab.experiments.synthetic_odzi
uv run python -m edgechain_lab.experiments.mars_baselines
uv run python -m edgechain_lab.experiments.llm_oversight
```

The lab uses synthetic data only. Generated `data/`, `evals/`, and `reports/` artifacts are ignored by git and can be regenerated locally.

### Key Commands

Root `yarn dev`, `yarn build`, `yarn test`, and `yarn lint` run repository-level toolchain checks. Use workspace commands when you only need the farmer pilot/web/backend path.

```bash
yarn build:node
yarn build:ui
yarn build
yarn dev
yarn test
yarn lint

cd research/python-lab && uv run pytest
cd research/python-lab && uv run ruff check .
cd research/python-lab && uv run mypy src
```

---

## Hardware Reference

### Sensor Node

| Component | Part | Notes |
|-----------|------|-------|
| MCU | ESP32-S3-DevKitC-1 | I2C on GPIO8/9, UART on GPIO17/18 |
| Secure element | ATECC608B (Adafruit breakout) | P-256 key, never leaves chip |
| Radio | RYLR896 | LoRa, SMA antenna |
| Air | BME280 | I2C; temp / humidity / pressure |
| Soil moisture | Songhe capacitive (5-pack) | analog GPIO1 |
| Soil temp | DROK DS18B20 waterproof (5-pack) | 1-Wire on GPIO3, **requires 4.7 kΩ pullup to 3V3** — without it the library silently returns `-127.0 °C` |
| Light | HiLetgo BH1750 | I2C |
| Rain | DIYables (5-pack) | analog GPIO2 |
| Power | solar + battery | per-site sizing |
| Enclosure | qBox DIY IOT Enclosure | weatherproof, IP-rated |

Soil pH/NPK sensors are deferred to Phase 2; a manual Luster Leaf Rapitest kit is the interim.

### Freedom Node

| Component | Notes |
|-----------|-------|
| Compute | Dell OptiPlex 7060 Micro (i5-8500T, 16 GB RAM) |
| OS | Ubuntu Server 24.04 LTS |
| Stack | Docker + `midnightntwrk/proof-server:7.0.0` (6 workers) + in-repo proof-server service |
| Database | PostgreSQL on a LUKS-encrypted `/var/lib/postgresql` partition |
| Disk scheme | Two-tier: root unencrypted (unattended auto-boot after solar power loss), DB partition encrypted (theft protection) |
| Hostname | `freedom-node-0001` |
| Network | Tailscale (key expiry disabled — critical for unattended solar nodes) |
| LoRa bridge | RYLR896 Module 2 via CP2102 USB-UART (4 jumper wires, TX/RX crossed) |
| Antenna | OptiPlex stays indoors; 3 m SMA extension cable routes the LoRa antenna to a window |
| LTE | Huawei E3372-325 (Band 3 capable) |

The Phase 2 Freedom Node target is a Raspberry Pi 5 (~60% power-system cost reduction). Pi 5 is **not** the Phase A platform.

### LoRa Baseline

```text
Frequency:          915000000
Network ID:         6
Proof-server addr:  1
Spreading factor:   9
Bandwidth:          125
TX power:           20
```

---

## Environment Variables

### Backend (`apps/freedom-node/`)

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string used by the backend |
| `DATABASE_SSL` | Set to `true` only when the Postgres provider requires SSL |
| `PORT` | backend port |
| `CORS_ORIGINS` | comma-separated allowed frontend origins; include any custom real/pilot domains |
| `DEMO_MODE` | mock fallback behavior |
| `IPFS_SERVICE_URL` | URL for the Storacha/IPFS service |
| `STORACHA_EMAIL` | IPFS auth |
| `AGENT_ENABLED` | enables AI Farm Agent backend routes |
| `VIRTUAL_NDANI_ENABLED` | enables Virtual Ndani Kit backend routes |
| `VIRTUAL_NDANI_COORDINATOR_ENABLED` | enables coordinator routes |
| `VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED` | enables future physical Kit binding flow |
| `VIRTUAL_NDANI_PHYSICAL_INGESTION_ENABLED` | enables future physical Kit ingestion |
| `VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED` | enables optional pipeline demonstration features |
| `FARMER_SESSION_SECONDS` | farmer/coordinator session lifetime |
| `GEMINI_API_KEY` | server-side Gemini key; never expose through `VITE_*` |
| `GEMINI_TEXT_MODEL` | Gemini model used by server-side AI features |
| `GEMINI_TIMEOUT_MS` | server-side Gemini timeout |
| `GEMINI_INPUT_USD_PER_MILLION` / `GEMINI_OUTPUT_USD_PER_MILLION` | cost telemetry estimates |
| `AI_FARM_MANAGER_LLM_ENABLED` | set to `true` to let weekly AI Farm Manager plans call Gemini; otherwise deterministic fallback plans are used |
| `AI_FARM_MANAGER_TEMPERATURE` / `AI_FARM_MANAGER_TOP_P` | optional Gemini sampling controls for weekly farm plans |
| `AI_FARM_MANAGER_MAX_OUTPUT_TOKENS` | optional weekly farm plan output cap; defaults to 1200 |
| `AI_FARM_MANAGER_CHAT_MAX_OUTPUT_TOKENS` | optional memory-based Farm Assistant chat output cap; defaults to 800 |

### Frontend (`apps/web/`)

| Variable | Notes |
|----------|-------|
| `VITE_API_URL` | API origin. Empty in production means same-origin API calls, which supports multiple custom domains on one Fly app. |
| `VITE_AGENT_ENABLED` | enables pilot routes in the frontend |
| `VITE_VIRTUAL_NDANI_ENABLED` | enables Virtual Ndani Kit UI |
| `VITE_VIRTUAL_NDANI_COORDINATOR_ENABLED` | enables coordinator UI |
| `VITE_VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED` | enables future physical binding UI |
| `VITE_VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED` | enables optional pipeline demo UI |
| `VITE_WALLET_SITE_HOSTS` | comma-separated hostnames that should show the wallet-first home |
| `VITE_FARMER_SITE_HOSTS` | comma-separated hostnames that should route `/` to `/pilot-login` |
| `VITE_CONTRACT_ADDRESS` | Midnight contract address for wallet-first flows |
| `VITE_MIDNIGHT_INDEXER_URL`, `VITE_MIDNIGHT_INDEXER_WS`, `VITE_MIDNIGHT_NODE_URL` | Midnight testnet endpoints |

### Current Fly Backend Settings

`apps/freedom-node/fly.toml` deploys the unified backend with:

| Setting | Value |
|---------|-------|
| App | `edgechain-midnight` |
| Region | `iad` |
| Port | `3001` |
| Health check | `GET /api/db-stats` |
| Required secret | `DATABASE_URL` |
| IPFS service | `https://edgechain-ipfs.fly.dev` |
| Pilot backend flags | `AGENT_ENABLED=true`, `VIRTUAL_NDANI_ENABLED=true`, `VIRTUAL_NDANI_COORDINATOR_ENABLED=true` |
| Production frontend API mode | same-origin API calls from the unified app build |
| Legacy mount | `edgechain_data` at `/app/data`; retained only while the existing Fly machine still has the old volume attached |

The backend stores operational data in PostgreSQL. The Fly volume is not used
for database persistence; it can be removed later after the old attached volume
is destroyed from Fly.

When adding custom farmer/real domains, update:

- Fly certificates and DNS outside the repository,
- backend `CORS_ORIGINS`,
- GitHub Actions repository variables `VITE_WALLET_SITE_HOSTS` and `VITE_FARMER_SITE_HOSTS` if exact host matching is desired.

For Fly, create or attach Postgres before deploying:

```bash
fly postgres create --name edgechain-postgres --region iad
fly postgres attach edgechain-postgres --app edgechain-midnight
```

`fly postgres attach` sets the `DATABASE_URL` secret for the backend app.
EdgeChain backend gets Postgres credentials from the Fly secret
`DATABASE_URL`; rotate via Fly if needed. Do not commit generated Postgres
passwords to the repository.

### Proof Server (`apps/freedom-node/proof-server/`)

| Variable | Notes |
|----------|-------|
| `MIDNIGHT_NODE_URL` | Midnight node endpoint |
| `MIDNIGHT_CONTRACT` | contract address |
| `MIDNIGHT_WALLET_PATH` | proof-server wallet path |
| `LORA_PORT`, `LORA_BAUD` | serial configuration |
| `MERKLE_STORAGE_PATH` | persistence path |

### Python Lab (`research/python-lab/`)

| Variable | Notes |
|----------|-------|
| `EDGECHAIN_LIVE_LLM` | Set to `1` to enable live Anthropic API oversight runs; omitted by default for dry-run tests |
| `ANTHROPIC_API_KEY` | Required only when `EDGECHAIN_LIVE_LLM=1` |

---

## Team

| Name | Role | Location |
|------|------|----------|
| **Solomon Hopewell Kembo** | Architecture, strategy, integration | Bethesda, Maryland, US |
| **Shankar Rao Mata** | Blockchain / Compact contracts | India |
| **Lokesh Yadav** | Frontend / React UI | India |
| Odzi Coordinator | Farmer relationships, pilot onboarding, weekly check-ins, and coordinator review | Odzi, Manicaland |

Solomon Kembo is the originating researcher behind EdgeChain's privacy architecture and has been building IoT systems for emerging-market contexts since 2016.

---

## Impact Goals

These are targets, not promises. Field validation starts in the next implementation phase.

| Horizon | Goal |
|---------|------|
| Pilot | 20-farmer Odzi pilot with farmer PIN access, AI Farm Manager onboarding, Virtual Ndani Kit observations, and coordinator review |
| Year 1 | 50-100 enrolled farmers and one B2B pilot |
| Year 2 | 500+ farmers and a parametric-risk pilot |
| Year 3 | path toward economic self-sustainability |

The design principle is simple: day-one value should not require blockchain literacy. Midnight-based privacy and reward eligibility should strengthen adoption, not gate it.

---

## Security Notes

- never commit wallet seeds or deployment secrets
- treat proof-server wallet storage as sensitive
- restrict CORS and disable demo endpoints in production
- keep LoRa settings synchronized across firmware and proof-server deployments

---

## Related Documentation

| File | Contents |
|------|----------|
| [`docs/README.md`](docs/README.md) | project documentation entry point |
| [`docs/ai-farm-manager-personalization-spec.md`](docs/ai-farm-manager-personalization-spec.md) | AI Farm Manager personalization, prompt architecture, safety, evaluation, and phased implementation spec |
| [`docs/user_stories.html`](docs/user_stories.html) | product user stories |
| [`research/python-lab/README.md`](research/python-lab/README.md) | Python research lab overview, commands, and experiment framing |
| [`apps/freedom-node/proof-server/README.md`](apps/freedom-node/proof-server/README.md) | proof-server operations |

---

## Contributing

1. Create a branch.
2. Make focused changes.
3. Add tests or validation notes where feasible.
4. Open a PR with a clear behavior summary and operational impact notes.

---

## License

MIT - see [LICENSE](LICENSE)

---

*Built from long-horizon research, field-driven constraints, and the belief that farmers should be able to benefit from their data without having to surrender themselves with it.*
