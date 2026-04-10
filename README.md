# EdgeChain

> **Prove quality. Keep privacy. Own rewards.**
>
> Privacy-preserving agricultural intelligence for smallholder farmers, built on Midnight's zero-knowledge infrastructure.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Midnight Testnet](https://img.shields.io/badge/Midnight-testnet02-8B5CF6)](https://midnight.network)
[![Midnight Summit Hackathon](https://img.shields.io/badge/Midnight%20Summit%20Hackathon-Top%2016%20of%2046-gold)](https://midnight.network)
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
Reward logic, replay resistance, and private coordination can happen on-chain without forcing a coordinator to custody farmer identities.

The strongest "why Midnight" moment is the reward-eligibility flow: EdgeChain needs to verify contribution quality, prevent double claims, and distribute rewards without revealing which device belongs to which farmer. That specific combination makes Midnight a structural requirement, not a branding choice.

---

## Why It Matters

EdgeChain is built for a context where privacy is not a luxury feature. It is the condition that makes participation possible.

For smallholder farmers, privacy-preserving verification can unlock:

- payment for data contributions without surrendering identity
- stronger local agronomic models
- cooperative bargaining power
- future insurance and marketplace participation without central data extraction

For institutions, it enables collaboration with farmer communities without demanding full access to the raw data that creates political, legal, and ethical risk.

---

## SDG Alignment

| SDG | Connection |
|-----|------------|
| **SDG 1 - No Poverty** | Farmers can earn rewards for verified contributions instead of having data extracted without compensation. |
| **SDG 2 - Zero Hunger** | Hyper-local microclimate signals support better timing of inputs, interventions, and forecasts. |
| **SDG 10 - Reduced Inequalities** | Farmers can prove eligibility and quality without surrendering identity data that can be used against them. |
| **SDG 17 - Partnerships for the Goals** | The architecture supports collaboration among cooperatives, NGOs, insurers, and buyers without creating a new centralized data dependency. |

---

## Research Lineage

EdgeChain was not invented as a hackathon concept and then reverse-fitted into a use case. It comes out of a longer research program on privacy-preserving IoT, edge systems, and cooperative data ownership in agricultural settings.

| Year | Venue | Contribution |
|------|-------|--------------|
| 2020 | IEOM | Freedom Node / LoRa / K3S edge pattern that later informed Layer 2 |
| 2020 | IEOM | Privacy and adversarial-environment reasoning for Zimbabwean agricultural IoT |
| 2023 | Emerald IJIEOM | [Privacy-preserving federated learning on edge endpoints](https://doi.org/10.1108/IJIEOM-02-2023-0020) |
| 2023 | Emerald IJIEOM | [Attribute-based credentials and permissioned blockchain design](https://doi.org/10.1108/IJIEOM-02-2023-0021) |

The core problem definition predates Midnight's public developer tooling. Midnight became compelling because it finally offered infrastructure that could satisfy the privacy and coordination requirements the system already had.

---

## Architecture

```text
Layer 4 - Settlement (pluggable)
Cardano-linked treasury and reward rails are the current direction, but settlement is intentionally adaptable.

Layer 3 - Midnight Network (non-negotiable)
Private contract state, Compact contracts, nullifier-based replay prevention, and ZK-aware reward logic.

Layer 2 - Freedom Node (farmer-owned proof server)
Receives LoRa packets, manages commitment state, generates or coordinates proofs, and submits to Midnight.

Layer 1 - Sensor Node
ESP32-S3 + ATECC608B + LoRa + environmental sensors, with keys protected in hardware.
```

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

### Honest Scope

These are cryptographic and architectural guarantees, not a claim to defeat every form of coercion. EdgeChain improves privacy in specific technical interactions. It does not claim to solve physical coercion, account seizure, or hostile legal process by itself.

---

## What Is Built vs What Is Next

### Phase A - Built Today

This is the current, demonstrable system footprint:

- ESP32 firmware path in [`firmware/esp32-msingi`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/firmware/esp32-msingi)
- Freedom Node / proof-server stack in [`proof-server`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/proof-server)
- Unified backend flows in [`server`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/server)
- React UI in [`packages/ui`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/packages/ui)
- IPFS integration in [`ipfs-service`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/ipfs-service)
- Compact contracts and deployment artifacts in [`packages/contract`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/packages/contract)
- Contracts deployed on Midnight testnet/testnet-02
- Live demo services on Fly.io

### Phase B - In Progress

These are the most important remaining steps before a stronger field-grade Midnight integration:

- end-to-end ZK proof generation and submission across all live flows
- full anonymous device registration and reward-claim path
- reduction of simulated contract paths in the UI/backend
- production observability, queueing, and failure handling
- a smallholder pilot in Odzi, Manicaland

### Phase C - Cooperative Scale

Longer-term directions:

- cooperative risk pools
- attestation marketplace services
- offline-first farmer knowledge agents

---

## Repository Layout

```text
edgechain/
|- packages/
|  |- contract/   Compact contracts and deployment scripts
|  |- ui/         React frontend
|  |- api/        Workspace API package
|  |- cli/        CLI tools and scripts
|- server/        Unified backend
|- proof-server/  Farmer-owned proof server
|- firmware/      ESP32 firmware
|- ipfs-service/  Storacha/IPFS microservice
|- docs/          Project and handoff documentation
|- gateway/       Legacy gateway tooling
|- compact/       Contract compilation artifacts
```

### Deployed Contracts

Current deployment artifacts recorded in [`packages/contract/deployment.json`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/packages/contract/deployment.json):

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

### Key Commands

```bash
yarn build:node
yarn build:ui
yarn build
yarn dev
yarn test
yarn lint
```

---

## Hardware Reference

### Sensor Node

| Component | Part | Cost |
|-----------|------|------|
| MCU | ESP32-S3-DevKitC-1 | about $8 |
| Secure element | ATECC608B breakout | about $2.50 |
| Radio | RYLR896 | about $6 |
| Sensors | BME280 + capacitive soil sensor | about $6 |
| Power | CN3065 + 18650 + solar | about $16 |
| Enclosure | IP65 polycarbonate | about $10 |

### Freedom Node

| Component | Cost |
|-----------|------|
| Dell OptiPlex 7060 Micro | about $80 |
| SMA extension cable | about $8 |
| Huawei E3372-325 LTE modem | about $25 |

### LoRa Baseline

```text
Frequency: 915000000
Network ID: 6
Proof-server address: 1
Spreading factor: 9
Bandwidth: 125
TX power: 20
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

---

## Team

| Name | Role | Location |
|------|------|----------|
| **Solomon Hopewell Kembo** | Architecture, strategy, integration | Bethesda, Maryland, US |
| **Shankar Rao Mata** | Blockchain / Compact contracts | India |
| **Lokesh Yadav** | Frontend / React UI | India |

Solomon Kembo is the originating researcher behind EdgeChain's privacy architecture and has been building IoT systems for emerging-market contexts since 2016.

---

## Impact Goals

These are targets, not promises. Field validation starts in the next implementation phase.

| Horizon | Goal |
|---------|------|
| Pilot | 5-10 farmers in Odzi, Manicaland |
| Year 1 | 50-100 enrolled farmers and one B2B pilot |
| Year 2 | 500+ farmers and a parametric-risk pilot |
| Year 3 | path toward economic self-sustainability |

The design principle is simple: day-one value should not require blockchain literacy. Midnight-based privacy and rewards should strengthen adoption, not gate it.

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
| [`docs/README.md`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/docs/README.md) | project documentation entry point |
| [`docs/codex-handoff.md`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/docs/codex-handoff.md) | architecture and handoff notes |
| [`docs/codex-handoff-quick.md`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/docs/codex-handoff-quick.md) | shorter handoff summary |
| [`proof-server/README.md`](/C:/Users/s.kembo.SEVERN/Downloads/edgechain/proof-server/README.md) | proof-server operations |

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
