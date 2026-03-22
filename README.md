# EdgeChain

This project is built on the Midnight Network.

Privacy-preserving IoT + federated learning infrastructure for smallholder farming use cases, built around the Msingi architecture and implemented on the Midnight network.

## Overview

EdgeChain combines:
- IoT sensor devices with hardware-backed keys (ESP32-S3 + ATECC608B)
- Farmer-owned proof servers (Freedom Nodes)
- Privacy-preserving submission and reward flows (BRACE/ACR concepts)
- Federated learning pipelines and dashboards

## Msingi Architecture

```
Layer 3: Midnight Network
  - Proof verification and private-state contract workflows
  - Nullifier-based replay resistance

Layer 2: Freedom Node (farmer-owned proof server)
  - Receives LoRa packets from devices
  - Verifies packets and manages commitment Merkle tree
  - Generates/submits proofs 

Layer 1: IoT Device
  - ESP32-S3 + ATECC608B + RYLR896
  - Collects sensor readings and transmits attestations over LoRa
```

Why farmer-owned proof servers: the proof-generation step can expose witness-level data at Layer 2, so ownership of the proof server is part of the privacy model.

## Current State

What is implemented:
- ESP32 firmware path (`firmware/esp32-msingi`) with ATECC608B + RYLR896 integration
- Proof server with LoRa receiver, Merkle tree, and API/WebSocket surface
- Unified backend (`server`) for FL and IoT flows
- UI dashboards for FL + IoT workflows
- Contract workspace scaffolding in `packages/contract`

What is still partially mock or in-progress:
- Parts of Midnight proof generation/submission paths are simulated in code paths (not full production-grade cryptographic flow end-to-end)
- Operational failover/queueing and production observability are incomplete
- Several research/economic decisions (e.g., DUST/NIGHT operating model at scale) remain open

## Repository Layout

- `server/`: Unified Express backend (FL + IoT), SQLite-backed
- `proof-server/`: Farmer-owned proof server (Express + WebSocket + LoRa serial)
- `firmware/esp32-msingi/`: ESP32-S3 firmware (ATECC608B, RYLR896, sensors)
- `packages/ui/`: React frontend
- `packages/api/`: Shared workspace constants/types (no standalone FL HTTP server)
- `packages/contract/`: Compact contracts and deployment scripts
- `ipfs-service/`: Storacha/IPFS microservice (with mock fallback mode)
- `gateway/`: Legacy/browser gateway tooling
- `arduino/`: Deprecated BLE-era firmware path

## Prerequisites

- Node.js 22+ (root workspace expects this)
- Yarn 4.x (workspace manager)
- npm (used in non-workspace service folders)
- PlatformIO (for firmware work)
- Optional hardware for full integration tests:
  - RYLR896 + CP2102 USB-UART
  - Huawei E3372-325 LTE modem

## Local Development

Canonical local development commands and ports are maintained in:
- [`docs/README.md`](docs/README.md#local-dev-command-matrix)

Run services in separate terminals.

### 1) Install dependencies (from repository root)

```bash
yarn install
npm --prefix server install
npm --prefix proof-server install
npm --prefix ipfs-service install   # Optional
```

### 2) Start services (from repository root)

```bash
# Optional preflight check (dependencies + ports)
yarn dev:stack:check
yarn dev:stack:check:full   # includes local IPFS checks

# Single-command launcher (required local stack)
yarn dev:stack

# Or run services individually
yarn dev:server
yarn dev:proof-server
yarn dev:ui
yarn dev:ipfs   # Optional
```

If LoRa hardware is not connected, the proof server falls back to API-only mode.

### Basic health checks

```bash
yarn dev:health
```

Open UI at `http://localhost:8080`.

## Freedom Node Hardware Baseline

Current procurement baseline reflected in this repo's docs:

- Compute: Dell OptiPlex 7060 Micro class (i5-8500T, 16GB RAM)
- LoRa bridge: RYLR896 + CP2102 USB-UART (3.3V)
- LTE modem: Huawei E3372-325 (Band 3 capable)
- Typical compute stack cost target: about $255 (excluding new solar install)

## LoRa Baseline Configuration

These defaults are aligned across firmware and proof-server configs:

- Frequency: `915000000`
- Network ID: `6`
- Proof server address: `1`
- Spreading factor: `9`
- Bandwidth: `125`
- TX power: `20`

Relevant files:
- `proof-server/config/default.json`
- `proof-server/src/utils/config.ts`
- `firmware/esp32-msingi/include/config.h`
- `firmware/esp32-msingi/platformio.ini`

## Service Ports

- Backend API: `3001`
- Proof server: `3002`
- IPFS service: `3003`
- UI (Vite): `8080`

## FL API Surface

EdgeChain now uses a single FL HTTP API surface:
- `server` on port `3001` (`/api/fl/*`)

The legacy standalone FL API runtime in `packages/api` has been deprecated and removed.

## Key Environment Variables

### Backend (`server`)

- `PORT` (default `3001`)
- `CORS_ORIGINS`
- `DEMO_MODE`
- `STORACHA_EMAIL`
- `STORACHA_TOKEN`

### Proof server (`proof-server`)

- `PORT`, `HOST`
- `LORA_PORT`, `LORA_BAUD`
- `LORA_NETWORK_ID`, `LORA_ADDRESS`, `LORA_FREQUENCY`
- `LORA_SF`, `LORA_BW`, `LORA_TX_POWER`
- `MIDNIGHT_NODE_URL`, `MIDNIGHT_CONTRACT`, `MIDNIGHT_WALLET_PATH`
- `MERKLE_STORAGE_PATH`
- `LOG_LEVEL`, `LOG_FILE`

Compatibility: legacy env names (`SERVER_PORT`, `LORA_SERIAL_PORT`, `LORA_BAUD_RATE`) are still accepted in proof-server config loading.

## High-Value Endpoints

### Backend API (`server`)

- `GET /health`
- `GET /api/fl/status`
- `POST /api/fl/submit`
- `POST /api/arduino/zk/generate-proof`
- `POST /api/arduino/zk/submit-private-reading`

### Proof server (`proof-server`)

- `GET /health`
- `GET /status`
- `POST /register-commitment`
- `GET /merkle-proof/:commitment`
- `POST /claim-reward`
- `WS /ws`

## Freedom Node Deployment (Linux host)

Use the deployment script:

```bash
cd /edgechain/proof-server
bash deploy/install.sh
```

What it does:
- Installs Node/tooling dependencies
- Clones/updates repo under user home
- Builds proof-server
- Creates `.env` defaults (aligned LoRa settings)
- Renders and installs systemd unit with user/home paths

Systemd template:
- `proof-server/deploy/edgechain-proof-server.service`

## Security Notes

- Do not commit wallet seeds, private keys, or deployment secrets.
- Treat proof-server wallet storage as sensitive; encrypt/segment host access.
- Restrict CORS and disable demo/test endpoints in production.
- Keep firmware/proof-server LoRa settings synchronized across deployments.

## Related Documentation

- `Msingi.md`: Architecture and research context
- `HARDWARE_GUIDE.md`: Device + Freedom Node hardware guidance
- `proof-server/README.md`: Proof server operations and config details
- `proof-server/MIDNIGHT_INTEGRATION.md`: Midnight integration notes
- `CLAUDE.md`: Contributor/dev guidance
- `AUDIT_REPORT.md`: Codebase audit snapshot

## Contributing

1. Create a branch.
2. Make focused changes with tests where feasible.
3. Open a PR with:
   - behavior change summary
   - validation evidence
   - operational/security impact notes

## License

MIT
