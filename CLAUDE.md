# CLAUDE.md - EdgeChain Project Guide

## Project Overview

EdgeChain is a **Privacy-Preserving IoT and AI Platform for Farmers on Midnight Network**. It combines zero-knowledge proofs, federated learning, and Arduino IoT devices to enable decentralized agricultural AI while protecting farmer data privacy.

### Key Innovations
- **Anonymity Sets with ZK Proofs**: IoT devices hide among 10,000+ devices using Merkle tree proofs
- **Nullifier-Based Replay Prevention**: Unlinkable submissions prevent device tracking across epochs
- **Federated Learning with Privacy**: Farmers train models locally; only aggregated results stored on-chain
- **SMS Interface**: Predictions accessible via simple text messages

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Blockchain | Midnight Network, Compact language (ZK smart contracts) |
| Frontend | React 19, TypeScript, Vite, TailwindCSS, Shadcn UI |
| Backend | Node.js, Express.js, SQLite, TypeScript |
| **IoT (Current)** | **ESP32-S3 + ATECC608B + LoRa** (Msingi architecture) |
| IoT (Legacy) | ~~Arduino Nano 33 BLE Sense~~ (deprecated) |
| ML | TensorFlow.js (in-browser training) |
| Storage | IPFS (Storacha) |
| Wallet | Lace Midnight Preview |
| Build | Turbo monorepo, Yarn 4.9.2 workspaces |

## Quick Commands

```bash
# Install dependencies
yarn install

# Build all packages
yarn build:all

# Start development servers (UI + backend)
yarn dev

# Compile Compact contracts
cd packages/contract && npm run compact:arduino

# Deploy contract
cd packages/contract && npm run deploy:arduino

# Run tests
yarn test

# Lint
yarn lint
```

## Project Structure

```
edgechain-midnight-hackathon/
├── packages/
│   ├── contract/           # Midnight Compact smart contracts
│   │   ├── src/
│   │   │   ├── arduino-iot.compact       # IoT contract (DEPLOYED)
│   │   │   ├── arduino-iot-private.compact
│   │   │   └── edgechain.compact         # FL contract
│   │   └── deployment.json               # Deployment info
│   ├── ui/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── providers/     # WalletProvider, ContractProvider
│   │   │   ├── routes/        # Page routes
│   │   │   ├── fl/            # Federated learning logic
│   │   │   └── iot/           # Arduino BLE integration
│   ├── api/                # Shared API types
│   └── cli/                # Deployment CLI
├── proof-server/           # Farmer-owned proof server (Msingi Layer 2)
│   ├── circuits/           # ZK circuits in Compact
│   ├── src/                # Express server + Midnight SDK
│   └── MIDNIGHT_INTEGRATION.md
├── firmware/               # ESP32-S3 firmware (Msingi Layer 1)
│   └── esp32-msingi/       # PlatformIO project
├── server/                 # Backend aggregation + Arduino API
│   ├── src/
│   │   ├── routes/         # aggregation.ts, arduino.ts
│   │   ├── services/       # Core business logic
│   │   └── database/       # SQLite schema
├── arduino/                # ⚠️ DEPRECATED - Legacy Arduino firmware
│   └── edgechain_iot/      # Use firmware/esp32-msingi instead
├── gateway/                # ⚠️ DEPRECATED - Legacy BLE gateway
│   └── ble_receiver.ts     # Use proof-server instead
├── docs/                   # Documentation
└── turbo.json              # Turbo build config
```

## Key Files

### Smart Contracts
- `packages/contract/src/arduino-iot.compact` - IoT device registration, ZK proofs, rewards
- `packages/contract/src/edgechain.compact` - Federated learning model submission/aggregation

### Frontend
- `packages/ui/src/App.tsx` - Main router (7 routes)
- `packages/ui/src/providers/WalletProvider.tsx` - Lace Midnight wallet integration
- `packages/ui/src/providers/ContractProvider.tsx` - Smart contract interaction
- `packages/ui/src/fl/training.ts` - TensorFlow.js local model training
- `packages/ui/src/fl/aggregation.ts` - FedAvg algorithm

### Backend
- `server/src/index.ts` - Express app entry point
- `server/src/routes/aggregation.ts` - FL endpoints (`/api/fl/submit`, `/api/fl/aggregate`)
- `server/src/routes/arduino.ts` - IoT endpoints (`/api/arduino/submit`, `/api/arduino/register`)
- `server/src/services/zkProofService.ts` - ZK proof generation/verification
- `server/src/services/deviceRegistry.ts` - Merkle tree management
- `server/src/services/nullifierTracking.ts` - Replay attack prevention

### Proof Server (NEW - Msingi Architecture)
- `proof-server/src/index.ts` - Express API + WebSocket
- `proof-server/src/lora-receiver.ts` - LoRa packet processing
- `proof-server/src/brace-verifier.ts` - BRACE protocol implementation
- `proof-server/src/acr-handler.ts` - Anonymous contribution rewards

### Arduino (DEPRECATED)
> ⚠️ **The Arduino BLE code is deprecated.** Use the ESP32-S3 firmware in `firmware/esp32-msingi/` instead.
> The new Msingi architecture provides better range (LoRa vs BLE), hardware security (ATECC608B), 
> and privacy (farmer-owned proof servers vs browser-based ZK).

- `arduino/edgechain_iot/edgechain_iot.ino` - ~~Sensor firmware (temp/humidity via BLE)~~ DEPRECATED

## Architecture Patterns

### Msingi Architecture (Current)
```
ESP32-S3 Device → LoRa → Raspberry Pi 5 (Proof Server) → Midnight Network
                         (farmer-owned)
```

### Federated Learning Flow
```
Farmer Device → Train Locally → Extract Weights → Submit to Contract
              (data never leaves device)
                                                        ↓
                                          Backend aggregates (FedAvg)
                                                        ↓
                                          Global model on-chain
```

### Zero-Knowledge Privacy Flow
```
IoT Device → Generates ZK Proof (device secret as witness)
                ↓
        Proves membership in anonymity set (10,000+ devices)
                ↓
        Blockchain verifies without knowing which device
```

## Development Notes

### Midnight Integration
- Requires **Lace Midnight Preview** wallet extension (not regular Lace)
- Only works on Midnight devnet/testnet
- ZK proof generation requires proof server access
- Contract compilation via `compact` CLI

### ESP32-S3 Setup (Current)
- Requires PlatformIO with ESP-IDF framework
- ATECC608B secure element for P-256 keys
- LoRa RYLR896 module for long-range communication
- See [HARDWARE_GUIDE.md](HARDWARE_GUIDE.md) for assembly instructions

### Arduino Setup (DEPRECATED)

### Environment Variables
Key variables in `.env`:
```
VITE_MIDNIGHT_NETWORK=devnet
VITE_CONTRACT_ADDRESS=[deployed contract]
VITE_API_URL=http://localhost:3001
VITE_ENABLE_CONTRACT_INTEGRATION=true
```

## Deployed Resources

- **Frontend**: https://edgechain-midnight-ui.fly.dev/
- **Backend**: https://edgechain-api.fly.dev/
- **IoT Contract**: `02001d6243d08ba466d6a3e32d9a04dd1d283d8fe2b9714cde81a25fa9081087b30a`
- **Network**: Midnight Testnet (testnet-02)

## Common Tasks

### Adding a new API endpoint
1. Add route handler in `server/src/routes/`
2. Add service logic in `server/src/services/`
3. Register route in `server/src/index.ts`

### Modifying smart contracts
1. Edit `.compact` file in `packages/contract/src/`
2. Run `npm run compact:arduino` to compile
3. Run `npm run deploy:arduino` to deploy
4. Update `deployment.json` with new address

### Adding UI components
1. Create component in `packages/ui/src/components/`
2. Use Shadcn UI primitives from `components/ui/`
3. Add route in `App.tsx` if needed

## Gotchas

1. **Merkle tree**: Single root for all devices; must rebuild when adding devices
2. **TensorFlow.js**: Large models may cause browser memory issues
3. **Nullifiers**: Deterministic (hash of secret + epoch) - tracked per epoch
4. **SQLite**: Local persistence only; not for production scale
5. **Contract deployment**: Testnet only; proof server must be accessible
