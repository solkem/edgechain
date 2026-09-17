# EdgeChain

> **Prove quality. Keep privacy. Own rewards.**
>
> AI-powered, privacy-preserving microclimate intelligence for smallholder agriculture, built on Midnight's zero-knowledge infrastructure.

EdgeChain is built on the Midnight Network.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Midnight Testnet](https://img.shields.io/badge/Midnight-Network-8B5CF6)](https://midnight.network)
[![Python Lab CI](https://github.com/solkem/edgechain/actions/workflows/python-lab-ci.yml/badge.svg)](https://github.com/solkem/edgechain/actions/workflows/python-lab-ci.yml)

**Live app:** [edgechain-midnight.fly.dev](https://edgechain-midnight.fly.dev)  
**Project platform:** [DisruptiveIoT.org](https://disruptiveiot.org)  
**Contact:** [Solomon Kembo](https://linkedin.com/in/solomonkembo)

---

## The Problem

Smallholder farms generate hyper-local microclimate data that can support better agricultural decisions, climate research, insurance, forecasting, and collaborative AI. Soil moisture, rainfall, humidity, temperature, and related farm-level observations can provide information that regional averages cannot.

But useful agricultural data can also be sensitive. Farm-level observations may reveal identity, location, production conditions, or economic vulnerability. Centralized data collection can therefore create privacy, trust, and control concerns for the people who generate the data.

The result is a recurring coordination problem:

- valuable data may remain unused
- collaborative AI models may remain weak
- farmers may lose control over information they generate
- institutions may struggle to collaborate without creating additional privacy risk

**The data can be valuable. Participation requires trust.**

EdgeChain is designed to explore how privacy-preserving Edge AI and decentralized infrastructure can close that gap.

---

## What EdgeChain Does

EdgeChain combines farmer-facing AI with privacy-preserving infrastructure designed to let useful facts be verified without routinely exposing the underlying raw agricultural data.

```text
Device proves: "My soil moisture reading is above threshold"
Chain verifies: yes
Authorized participant receives: proof of the condition
Proof does not need to reveal: farmer identity, precise location, or raw sensor value
```

The architecture combines three core technologies:

1. **Federated learning**  
   Models can be trained across distributed endpoints while reducing the need to centralize raw farm data.

2. **Zero-knowledge proofs**  
   Devices can prove contribution quality, threshold conditions, or eligibility while minimizing disclosure of identity, location, and raw values.

3. **Midnight smart contracts**  
   Private contract state, replay resistance, and privacy-preserving eligibility logic can support coordination without requiring a central operator to custody every participant's underlying data.

---

## Current MVP and Research Platform

EdgeChain is not a single chatbot demonstration. The repository combines a functioning farmer-facing MVP with an implemented research and technical platform whose deeper infrastructure continues through prototype and research-validation stages.

| Area | Current role |
|------|--------------|
| **Farmer-facing MVP** | AI Farm Manager, farmer profiles, structured memory, check-ins, plans, recommendations, outcomes, timelines, reports, monitoring, Virtual Ndani Kit observations, and farmer PIN access. |
| **Coordinator tools** | Farmer administration, onboarding, observation review, evidence exports, fleet visibility, and operational monitoring. |
| **AI Oversight Lab** | Reproducible synthetic experiments for adversarial federated learning, MARS scoring, aggregation comparison, and privacy-safe AI/LLM oversight. |
| **Core protocol / infrastructure** | Midnight contracts, MARS contribution scoring, federated-learning packages, firmware scaffolding, Freedom Node services, proof-server orchestration, IPFS paths, and privacy-preserving reward-eligibility research. |
| **Physical Edge AI** | ESP32-based Ndani Kit firmware and hardware-development path for environmental sensing, secure device identity, LoRa communication, and local/edge processing. |

For a concise reviewer-facing distinction between implemented, simulated, and future components, see [`CODEBASE_STATUS.md`](CODEBASE_STATUS.md).

---

## Farmer Experience

The current application supports a low-friction farmer workflow without requiring blockchain or wallet literacy on day one.

The farmer-facing experience includes:

- farmer number + PIN access
- AI Farm Manager onboarding
- farmer and farm profiles
- structured AI memory
- Virtual Ndani Kit manual observations
- periodic check-ins
- generated plans and recommendations
- recommendation outcome tracking
- timeline and reporting views
- coordinator support and review

The **Virtual Ndani Kit** is a transition mechanism. Current manual observations are human-entered observations and must not be represented as measurements produced by physical sensor hardware. Physical Ndani Kit hardware is intended to automate more observations as hardware development and field validation progress.

This staged approach allows the farmer-facing AI workflow to be evaluated while the physical sensing, decentralized infrastructure, federated-learning, and privacy-preserving proof layers continue to mature.

---

## Why Privacy Matters

EdgeChain treats privacy as an architectural requirement rather than an optional feature.

For farmers, privacy-preserving infrastructure can support:

- greater control over farm-generated information
- participation in collaborative AI without routine surrender of raw datasets
- contribution verification with reduced identity disclosure
- stronger local and cooperative intelligence
- future participation in research, insurance, or marketplace systems with data-minimization safeguards

For institutions, the architecture explores ways to collaborate with distributed agricultural communities without requiring unrestricted access to all underlying raw data.

---

## Research Lineage

EdgeChain grows from a longer research program on privacy-preserving IoT, edge systems, federated learning, decentralized authentication, and data ownership.

| Year | Venue | Contribution |
|------|-------|--------------|
| 2020 | IEOM | [Privacy-Preserving IoT Edge and Fog Architecture](https://index.ieomsociety.org/index.cfm/item/47585) |
| 2020 | IEOM | [GDPR-inspired data portability and personal data monetization opportunities](https://index.ieomsociety.org/index.cfm/item/47584) |
| 2023 | Emerald IJIEOM | [Privacy-preserving federated learning on edge endpoints](https://doi.org/10.1108/IJIEOM-02-2023-0020) |
| 2023 | Emerald IJIEOM | [Attribute-based credentials and permissioned blockchain design](https://doi.org/10.1108/IJIEOM-02-2023-0021) |

The underlying research questions predate the current EdgeChain implementation and Midnight developer tooling. EdgeChain provides a practical environment for integrating and testing those research directions in distributed agricultural settings.

---

## Python AI Oversight Lab

EdgeChain includes a Python research environment for testing contribution scoring, adversarial federated-learning behavior, aggregation methods, and AI-assisted oversight under privacy constraints.

The lab uses **synthetic microclimate data** for controlled smallholder-agriculture scenarios. It does not expose farmer identities, private keys, wallet data, real GPS coordinates, raw pilot readings, or production secrets.

Current research capabilities include:

- synthetic microclimate data generation
- MARS contribution scoring
- adversarial federated-learning attack scenarios
- baseline aggregation comparison
- heuristic oversight
- LLM oversight dry-run evaluation

See [`research/python-lab`](research/python-lab) for implementation, tests, and experiment entry points.

Reward values used in research simulations are abstract accounting units for experimentation and fairness analysis; they are not production farmer payments.

---

## Architecture

```text
Layer 4 - Settlement / incentive rails (forward-looking)
Potential settlement and reward mechanisms remain an area of exploration.

Layer 3 - Midnight Network
Private contract state, Compact contracts, nullifier-based replay prevention,
and privacy-preserving eligibility logic.

Layer 2 - Freedom Node
Locally controlled edge/proof infrastructure that receives device messages,
manages relevant state, coordinates proofs, and interacts with Midnight.

Layer 1 - Sensor Node
ESP32-S3 + secure element + LoRa + environmental sensors,
with device keys protected in hardware.
```

### Farmer-Owned Nodes and Exit Rights

EdgeChain is intended as a reference implementation for farmer-controlled digital infrastructure rather than a system that requires permanent dependence on one centralized operator.

The architecture therefore aims toward:

- exportable observations
- documented data formats
- auditable and replaceable firmware where feasible
- pluggable transports and infrastructure providers
- farmer-controlled access to data and AI memory
- meaningful ability to withdraw from participation

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the production-domain architecture and ownership principles.

---

## Privacy Guarantees Under Development

| Label | Goal |
|-------|------|
| PG1 | Device anonymity within an anonymity set |
| PG2 | Cross-epoch unlinkability for attestations |
| PG3 | Proofs reveal predicate satisfaction rather than raw values |
| PG4 | Replay resistance through nullifier tracking |
| PG5 | Limited metadata exposure at the proof-server layer |
| PG6 | Hardware-backed key protection |

The current repository contains prototype/testnet implementations and should not be interpreted as a claim that every privacy guarantee is production-hardened across every application flow.

---

## Implementation Phasing

### Phase A - Farmer-first AI + Virtual Ndani Kit

Phase A provides immediate farmer-facing value while minimizing technical barriers to participation.

The reusable workflow supports:

- farmer number + PIN login
- coordinator/admin support
- isolated farmer and farm profiles
- Virtual Ndani Kit manual observations
- coordinator review for uncertain or higher-risk observations
- AI Farm Manager onboarding
- structured memories and contextual chat
- check-ins, plans, recommendations, and outcomes
- timelines, reports, monitoring, and evaluation

```text
Today:
Farmers can enter observations manually. EdgeChain remembers, organizes,
advises, and follows up.

Next:
Physical Ndani Kit hardware can automate selected observations.

Future:
Farmers can participate through increasingly local, privacy-preserving,
farmer-controlled intelligence infrastructure.
```

### Phase B - Physical Ndani Kit + Privacy-Preserving Contribution Workflow

Phase B introduces physical Ndani Kit hardware and advances the privacy infrastructure toward a load-bearing contribution workflow: verifying that an eligible device supplied a qualifying contribution, preventing duplicate claims, and supporting private eligibility without unnecessarily revealing device-to-farmer linkage.

---

## Current Implementation Footprint

Demonstrable in the repository today:

- ESP32 firmware scaffolding in [`firmware/esp32-ndani`](firmware/esp32-ndani)
- in-repo Node.js proof server in [`apps/freedom-node/proof-server`](apps/freedom-node/proof-server)
- unified backend flows in [`apps/freedom-node`](apps/freedom-node)
- React UI in [`apps/web`](apps/web)
- IPFS integration in [`apps/ipfs-service`](apps/ipfs-service)
- Compact contracts and deployment artifacts in [`packages/contract`](packages/contract)
- Python AI Oversight Lab in [`research/python-lab`](research/python-lab)
- production-oriented federated-learning components in [`packages/fl`](packages/fl)
- MARS scoring and reward-eligibility components in [`packages/mars`](packages/mars)
- AI Farm Manager and Farm Assistant foundation
- Virtual Ndani Kit manual-observation workflow
- coordinator administration and monitoring tools
- farmer profiles, structured memories, check-ins, plans, outcomes, timeline, reports, and evaluations
- Midnight testnet deployment artifacts
- live demonstration services on Fly.io

### In Progress

- end-to-end ZK proof generation and submission across live flows
- anonymous device registration and privacy-preserving eligibility paths
- reduction of simulated contract paths
- physical Ndani Kit development and validation
- stronger production observability, queueing, persistence, and failure handling
- field-derived federated-learning research where appropriate data and permissions become available

---

## Prototype Boundaries

The repository intentionally distinguishes a functioning application-level MVP from deeper infrastructure that remains experimental or prototype-grade.

Current limitations include:

- the Python research lab uses synthetic data
- some application paths use demo data or simulated infrastructure
- some ZK/proof and contract flows remain prototype or testnet implementations
- Virtual Ndani Kit observations are manual, not physical sensor measurements
- physical Ndani Kit hardware is under development and validation
- production anonymous reward settlement is not claimed as complete
- the system is not claimed to have a production agronomic model with validated disease, yield, or financial predictions
- fully decentralized farmer-owned nodes and data custody are longer-term architecture goals

These boundaries are documented so that reviewers can distinguish what is demonstrable today from what remains part of the research and implementation roadmap.

---

## Repository Layout

```text
edgechain/
|- .github/workflows/       CI/CD and research-lab validation
|- apps/
|  |- web/                  React frontend
|  |- freedom-node/         Backend, AI Farm Manager, and Freedom Node services
|  |  |- proof-server/      Proof/device orchestration service
|  |- ipfs-service/         Storacha/IPFS service
|- packages/
|  |- contract/             Compact contracts and deployment scripts
|  |- fl/                   Federated-learning aggregation and model-update types
|  |- mars/                 MARS scoring and reward eligibility
|  |- cli/                  CLI tools and scripts
|- research/python-lab/     Synthetic FL, MARS, attack, and oversight experiments
|- firmware/                ESP32 / Ndani Kit firmware
|- docs/                    Project documentation
|- scripts/                 Repository toolchain checks
|- demo/                    Demo assets and supporting material
```

---

## Live Services

| Service | URL |
|---------|-----|
| Unified app and backend | [edgechain-midnight.fly.dev](https://edgechain-midnight.fly.dev) |
| IPFS Service | [edgechain-ipfs.fly.dev](https://edgechain-ipfs.fly.dev) |

The unified application supports both a technical/wallet-first experience and a farmer-oriented pilot experience from the same codebase.

---

## Hardware Reference

### Sensor Node / Ndani Kit Direction

| Component | Reference |
|-----------|-----------|
| MCU | ESP32-S3-DevKitC-1 |
| Secure element | ATECC608B |
| Radio | RYLR896 LoRa |
| Air environment | BME280 |
| Soil moisture | capacitive soil-moisture sensor |
| Soil temperature | waterproof DS18B20 |
| Light | BH1750 |
| Rain | rain-sensing component |
| Power | solar + battery, sized per deployment |
| Enclosure | weather-resistant IoT enclosure |

Hardware specifications remain subject to validation and revision as field requirements are tested.

### Freedom Node Reference Platform

Current development has used general-purpose edge compute with Ubuntu Server, Docker, PostgreSQL, Midnight proof-server infrastructure, local proof/device orchestration, LoRa connectivity, and secure storage. The architecture is intended to remain portable to lower-power edge hardware as requirements are validated.

---

## Local Development

### Prerequisites

- Node.js 22+
- Yarn 4.x
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- npm for standalone service folders
- PlatformIO for firmware work
- CompactC when building/checking Compact contracts
- optional hardware for full integration testing

### Setup

```bash
git clone https://github.com/solkem/edgechain.git
cd edgechain
yarn install

docker run --name edgechain-postgres \
  -e POSTGRES_USER=edgechain \
  -e POSTGRES_PASSWORD=edgechain \
  -e POSTGRES_DB=edgechain \
  -p 5432:5432 \
  -d postgres:16

export DATABASE_URL=postgresql://edgechain:edgechain@localhost:5432/edgechain

yarn build:node
yarn build:ui
```

Pilot/web services can be run individually with workspace commands documented in the relevant application folders.

### Python Lab

```bash
cd research/python-lab
uv sync
uv run pytest
uv run ruff check .
uv run mypy src
uv run python -m edgechain_lab.experiments.mars_baselines
uv run python -m edgechain_lab.experiments.llm_oversight
```

The lab uses synthetic data only. Generated research artifacts can be regenerated locally.

---

## Team

EdgeChain is developed through a combination of architecture, software, AI governance/security, frontend, blockchain, and field/pilot coordination roles. Deployment-specific collaborators and locations can vary by pilot and are documented separately where relevant.

Solomon Hopewell Kembo is the originating researcher behind EdgeChain's privacy architecture and leads architecture, strategy, and integration.

---

## Research and Impact Direction

EdgeChain's objective is not limited to a single deployment location. Smallholder agriculture provides a demanding application environment for investigating broader questions in privacy-preserving Edge AI and decentralized IoT, including:

- how distributed participants can contribute to collaborative AI without routinely centralizing raw data
- how contribution quality can be evaluated under privacy constraints
- how edge devices can establish trustworthy identity without exposing unnecessary participant information
- how local or farmer-controlled infrastructure can reduce centralized data dependency
- how AI systems can remain useful under intermittent connectivity and resource constraints
- how participants can retain meaningful data ownership and exit rights

Field expansion, adoption, and economic-impact claims will be based on documented results rather than assumed deployment numbers.

---

## Security Notes

- never commit wallet seeds or deployment secrets
- treat proof-server wallet storage as sensitive
- restrict CORS and disable demonstration endpoints in production
- keep LoRa settings synchronized across firmware and proof-server deployments
- encrypt sensitive artifacts before external storage
- distinguish testnet/prototype infrastructure from production systems

---

## Related Documentation

| File | Contents |
|------|----------|
| [`CODEBASE_STATUS.md`](CODEBASE_STATUS.md) | implemented, simulated, and not-yet-complete functionality |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | production-domain architecture and farmer-owned nodes principle |
| [`docs/README.md`](docs/README.md) | project documentation entry point |
| [`docs/ai-farm-manager-personalization-spec.md`](docs/ai-farm-manager-personalization-spec.md) | AI Farm Manager personalization, safety, evaluation, and phased implementation |
| [`research/python-lab/README.md`](research/python-lab/README.md) | Python AI Oversight Lab overview and experiments |
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

*Built from long-horizon research, field-driven constraints, and the principle that farmers should be able to benefit from their data without having to surrender control of it.*