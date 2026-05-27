# EdgeChain

> **Prove quality. Keep privacy. Own rewards.**
>
> AI-powered privacy-preserving microclimate intelligence for smallholder agriculture, built on Midnight's zero-knowledge infrastructure.

EdgeChain is built on the Midnight Network.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Midnight Testnet](https://img.shields.io/badge/Midnight-testnet02-8B5CF6)](https://midnight.network)
[![Midnight Summit Hackathon](https://img.shields.io/badge/Midnight%20Summit%20Hackathon-Top%2016%20of%2046-gold)](https://midnight.network)
[![Python Lab CI](https://github.com/solkem/edgechain/actions/workflows/python-lab-ci.yml/badge.svg)](https://github.com/solkem/edgechain/actions/workflows/python-lab-ci.yml)
[![SDG 1](https://img.shields.io/badge/SDG-1%20No%20Poverty-E5243B)](https://sdgs.un.org/goals/goal1)
[![SDG 2](https://img.shields.io/badge/SDG-2%20Zero%20Hunger-DDA63A)](https://sdgs.un.org/goals/goal2)
[![SDG 10](https://img.shields.io/badge/SDG-10%20Reduced%20Inequalities-DD1367)](https://sdgs.un.org/goals/goal10)
[![SDG 17](https://img.shields.io/badge/SDG-17%20Partnerships-19486A)](https://sdgs.un.org/goals/goal17)

**Live demo:** [edgechain-midnight-ui.fly.dev](https://edgechain-midnight-ui.fly.dev)  
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

That capability becomes meaningful when combined with two more properties:

1. **Federated learning**
Local models train on-device. Raw farm data never has to leave the farm.

2. **Zero-knowledge proofs**
Devices can prove contribution quality, threshold conditions, or eligibility without revealing identity, location, or raw values.

3. **Midnight smart contracts**
Reward eligibility, replay resistance, and private coordination can happen on-chain without forcing a coordinator to custody farmer identities.

The strongest "why Midnight" moment is the reward-eligibility flow: EdgeChain needs to verify contribution quality, prevent double claims, and support private settlement without revealing which device belongs to which farmer. That specific combination makes Midnight a structural requirement, not a branding choice.

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

EdgeChain includes a Python research lab for testing contribution scoring, adversarial federated learning behavior, and oversight under privacy constraints.

The lab uses synthetic data only. It does not expose farmer identities, private keys, wallet data, real GPS coordinates, raw pilot readings, or production secrets.

It currently includes:

- synthetic Odzi microclimate generation
- MARS contribution scoring
- adversarial FL attack scenarios
- baseline aggregation comparison
- LLM oversight dry-run evaluation

See [`research/python-lab`](research/python-lab) for the implementation, tests, and experiment entry points.

Reward values in the lab are abstract accounting units for simulation and fairness analysis. They are not DUST or tDUST; DUST/tDUST are transaction-execution resources, not farmer compensation. A production reward layer should use a separate settlement or redemption instrument such as NIGHT, a stablecoin, cooperative credits, or mobile money.

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

The Odzi pilot is split into two phases by **what Midnight is structurally required for**, not by implementation milestone.

### Phase A - Off-chain field recording (no Midnight dependency)

Phase A delivers immediate farmer value and funder-grade documentation without requiring any Midnight transaction. Cohort topology:

- **1 hardware site:** full sensor node (ESP32-S3 + ATECC608B + LoRa) feeding a Freedom Node
- **6 WhatsApp manual-observation sites:** structured weekly/monthly forms distributed by an on-ground coordinator in Odzi
- **7 farmers total** — 5 horticulture (weekly observations), 2 tobacco (monthly off-season reflections)

### Phase B - First load-bearing Midnight transaction

Phase B introduces Midnight at the precise point where its guarantees become structurally irreplaceable: an anonymous contribution proof that simultaneously verifies data quality, prevents double-claiming, and supports private reward eligibility **without revealing device-to-farmer linkage**. That specific combination is what makes Midnight a structural requirement, not a branding choice.

### Current implementation footprint

Demonstrable today:

- ESP32 firmware scaffolding in [`firmware/esp32-msingi`](firmware/esp32-msingi)
- In-repo Node.js proof server in [`proof-server`](proof-server)
- Unified backend flows in [`server`](server)
- React UI in [`packages/ui`](packages/ui)
- IPFS integration in [`ipfs-service`](ipfs-service)
- Compact contracts and deployment artifacts in [`packages/contract`](packages/contract)
- Python research lab in [`research/python-lab`](research/python-lab) for synthetic FL, MARS scoring, adversarial scenarios, and oversight evaluation
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

```text
edgechain/
|- .github/
|  |- workflows/        CI/CD, including Python Lab validation
|- packages/
|  |- contract/         Compact contracts and deployment scripts
|  |- ui/               React frontend
|  |- api/              Workspace API package
|  |- cli/              CLI tools and scripts
|- research/
|  |- python-lab/       Synthetic FL, MARS scoring, attack, and oversight experiments
|- server/              Unified backend
|- proof-server/        In-repo Node.js service (Express + WS + LoRa serial). Distinct from the official `midnightntwrk/proof-server:7.0.0` Docker container (Midnight's ZK prover, 6 workers); both run on the Freedom Node alongside each other.
|- firmware/            ESP32 firmware
|- ipfs-service/        Storacha/IPFS microservice
|- docs/                Project documentation
|- scripts/             Repository toolchain checks
|- demo/                Demo assets and supporting material
|- arduino/             Deprecated BLE-era firmware path (kept for reference)
|- gateway/             Legacy gateway tooling
|- compact/             Contract compilation artifacts
```

### Deployed Contracts

Current deployment artifacts recorded in [`packages/contract/deployment.json`](packages/contract/deployment.json):

| Contract | Address |
|----------|---------|
| Arduino IoT | `02001d6243d08ba466d6a3e32d9a04dd1d283d8fe2b9714cde81a25fa9081087b30a` |
| Federated Learning | `02002f44e466b8c8a1422e269156a6bb4e098cde1007203adf7181eb6659211dbe39` |

### Live Services

| Service | URL |
|---------|-----|
| Demo UI | [edgechain-midnight-ui.fly.dev](https://edgechain-midnight-ui.fly.dev) |
| API Backend | [edgechain-api.fly.dev](https://edgechain-api.fly.dev) |
| IPFS Service | [edgechain-ipfs.fly.dev](https://edgechain-ipfs.fly.dev) |

---

## Local Development

### Prerequisites

- Node.js 22+
- Yarn 4.x
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/) for the research lab
- npm for non-workspace folders
- PlatformIO for firmware work
- Optional hardware for full integration testing

### Setup

```bash
git clone https://github.com/solkem/edgechain.git
cd edgechain
yarn install

# Build contract/api/cli workspaces
yarn build:node

# Build the UI workspace
yarn build:ui

# Start package dev tasks
yarn dev

# Or run services individually
cd server && npm install && npm run dev
cd proof-server && npm install && npm run dev
cd ipfs-service && npm install && npm run dev
yarn workspace edgechain-ui dev
```

Health checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

Wallet note:
- Use the main Lace wallet with Midnight/Beta features enabled
- Or use another compatible Midnight wallet
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

### Backend (`server/`)

| Variable | Notes |
|----------|-------|
| `PORT` | backend port |
| `CORS_ORIGINS` | allowed origins |
| `DEMO_MODE` | mock fallback behavior |
| `STORACHA_EMAIL` | IPFS auth |

### Proof Server (`proof-server/`)

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
| Odzi Coordinator | Farmer relationships, WhatsApp form distribution | Odzi, Manicaland |

Solomon Kembo is the originating researcher behind EdgeChain's privacy architecture and has been building IoT systems for emerging-market contexts since 2016.

---

## Impact Goals

These are targets, not promises. Field validation starts in the next implementation phase.

| Horizon | Goal |
|---------|------|
| Pilot | 7 farmers in Odzi, Manicaland (1 hardware + 6 WhatsApp observation sites) |
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
| [`docs/user_stories.html`](docs/user_stories.html) | product user stories |
| [`research/python-lab/README.md`](research/python-lab/README.md) | Python research lab overview, commands, and experiment framing |
| [`proof-server/README.md`](proof-server/README.md) | proof-server operations |

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
