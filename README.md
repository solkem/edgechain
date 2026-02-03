# EdgeChain 🌾

**Privacy-Preserving IoT and AI for Farmers on Midnight Network**

EdgeChain is a decentralized IoT and federated learning platform that brings AI-powered agricultural predictions to farmers while protecting sensitive farm data through zero-knowledge proofs and hardware-backed security.

## 🏗️ Architecture: Msingi

EdgeChain uses the **Msingi** architecture (Swahili: *foundation*) for device-level privacy:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Midnight Network                                       │
│  - ZK proof verification on-chain                                │
│  - Nullifier-based replay prevention                             │
│  - NIGHT-DUST tokenomics (zero marginal cost transactions)       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ ZK proofs
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Proof Server (Raspberry Pi 5)                          │
│  - Farmer-owned (critical for privacy)                           │
│  - Generates ZK proofs locally                                   │
│  - Receives LoRa transmissions from devices                      │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ LoRa (encrypted)
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: IoT Device                                             │
│  - ESP32-S3-WROOM-1 microcontroller                              │
│  - ATECC608B secure element (P-256 keys)                         │
│  - RYLR896 LoRa module (2+ km range)                             │
│  - Environmental sensors (BME280, soil)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Why Farmer-Owned Proof Servers?

**Privacy cannot be compromised even for cost considerations.**

Shared gateways/browsers see device identity before ZK proofs are generated—destroying anonymity. With farmer-owned proof servers, device identity and raw data never leave farmer control.

## 💡 Core Privacy Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Device Anonymity** | Can't identify which device submitted (1/N probability) |
| **Unlinkability** | Can't link submissions across time (epoch-based nullifiers) |
| **Data Confidentiality** | Learn only predicate result, not raw sensor values |
| **Replay Resistance** | Can't resubmit same attestation (nullifier tracking) |
| **Key Secrecy** | Can't extract keys even with physical access (ATECC608B) |

## 🔐 Key Protocols

### BRACE (Blind Registration via Anonymous Commitment Enrollment)

1. Device generates P-256 keypair inside ATECC608B secure element
2. Device samples random blinding factor `r`
3. Device computes commitment `C = H(pk || r)`
4. Only `C` is transmitted—`pk` and `r` remain secret
5. Proof server adds `C` to Merkle tree

### ACR (Anonymous Contribution Rewards)

Devices earn rewards for data contributions without revealing identity:
- Data buyers post bounties with predicates (e.g., "temperature > 30°C")
- Device generates ZK proof that their data satisfies predicate
- Device claims reward using nullifier (no identity linkage)

## 📦 Hardware Requirements

### IoT Device (~$50)

| Component | Purpose | Cost |
|-----------|---------|------|
| ESP32-S3-WROOM-1 | Microcontroller | $8 |
| ATECC608B | Secure element (P-256) | $2.50 |
| RYLR896 | LoRa transceiver (2+ km) | $6 |
| BME280 | Temperature/humidity/pressure | $4 |
| Capacitive Soil Sensor | Soil moisture | $2 |
| Solar + Battery | Power | $16 |
| Enclosure | Weather protection | $10 |

### Proof Server (~$110)

| Component | Purpose | Cost |
|-----------|---------|------|
| Raspberry Pi 5 / CM5 | ZK proof generation | $110 |

**Total per farmer: ~$160**

## 🚀 Quick Start

### 1. Flash ESP32-S3 Firmware

```bash
# Requires PlatformIO
cd firmware/esp32-msingi
pio run --target upload
```

### 2. Start Proof Server (Raspberry Pi 5 or Dev Machine)

```bash
cd proof-server
npm install
npm run dev
```

The server starts on http://localhost:3002 with:
- `/health` - Health check
- `/status` - Server statistics
- `/register-commitment` - Register device commitment
- `/claim-reward` - ACR reward claims
- WebSocket at `/ws` for real-time updates

### 3. Start Backend API Server

```bash
cd server
npm install
npm run dev
```

### 4. Start Web Interface

```bash
cd packages/ui
npm install
npm run dev
```

Open http://localhost:5173

## 📁 Project Structure

```
edgechain/
├── firmware/
│   └── esp32-msingi/              # ESP32-S3 firmware
│       ├── src/
│       │   ├── main.cpp           # Entry point
│       │   ├── secure_element.cpp # ATECC608B driver
│       │   ├── lora_comm.cpp      # LoRa communication
│       │   └── brace_client.cpp   # BRACE protocol
│       └── platformio.ini
├── proof-server/                   # Farmer-owned proof server (NEW)
│   ├── circuits/
│   │   └── attestation.compact    # ZK attestation circuit
│   ├── src/
│   │   ├── index.ts               # Express API + WebSocket
│   │   ├── lora-receiver.ts       # RYLR896 LoRa interface
│   │   ├── midnight-prover.ts     # Midnight SDK integration
│   │   ├── brace-verifier.ts      # BRACE protocol handler
│   │   ├── acr-handler.ts         # ACR reward processing
│   │   └── merkle-tree.ts         # Device registry
│   └── MIDNIGHT_INTEGRATION.md    # SDK setup guide
├── packages/
│   ├── contract/                  # Compact smart contracts
│   │   └── src/
│   │       ├── device-iot.compact # IoT registration + attestation
│   │       ├── bounty.compact     # ACR bounty contract (NEW)
│   │       └── edgechain.compact  # Federated learning
│   └── ui/                        # React frontend
├── server/                        # Express.js backend API
└── Msingi.md                      # Architecture reference
```

## 🔧 Smart Contracts

### device-iot.compact

- **Merkle Proof Verification**: 20-level binary tree (supports 1M+ devices)
- **Nullifier Storage**: Map-based (prevents race conditions)
- **Admin Authentication**: Signature verification for root updates

### bounty.compact (ACR Protocol)

- **createBounty()**: Data buyers post predicate-based bounties
- **claimBounty()**: Devices claim rewards anonymously with ZK proofs
- **Nullifier Tracking**: Prevents double-claiming per epoch

### edgechain.compact

- **Federated Learning**: Private witness functions for farmer identity
- **Aggregation**: Threshold-triggered model aggregation
- **Privacy**: Only aggregated model hash stored on-chain

## 🧪 Testing the API

### Register a Device Commitment

```bash
curl -X POST http://localhost:3002/register-commitment \
  -H "Content-Type: application/json" \
  -d '{"commitment": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}'
```

### Claim a Reward (ACR)

```bash
curl -X POST http://localhost:3002/claim-reward \
  -H "Content-Type: application/json" \
  -d '{
    "nullifier": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    "proof": "base64encodedproof...",
    "sensorDataHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }'
```

### Check Server Status

```bash
curl http://localhost:3002/status
```

## 🎯 Deployment

### Service Ports

| Service | Default Port | Environment Variable |
|---------|--------------|---------------------|
| Backend API Server | 3001 | `PORT` |
| Proof Server | 3002 | `PORT` |
| IPFS Service | 3003 | `IPFS_SERVICE_PORT` |
| Web Interface (Vite) | 5173 | `VITE_PORT` |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` (server) / `3002` (proof-server) |
| `DEMO_MODE` | Enable demo endpoints (reset, etc.) | `false` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `STORACHA_EMAIL` | w3up.storage email (IPFS) | - |
| `STORACHA_TOKEN` | w3up.storage token (IPFS) | - |
| `LORA_PORT` | Serial port for LoRa module | `/dev/ttyUSB0` |
| `NODE_ENV` | Environment mode | `development` |

### Midnight Testnet

| Contract | Address |
|----------|---------|
| Device IoT | `02001d62...b30a` |
| Bounty (ACR) | TBD |
| Federated Learning | `02002f44...be39` |

### Raspberry Pi 5 Deployment

See [proof-server/MIDNIGHT_INTEGRATION.md](proof-server/MIDNIGHT_INTEGRATION.md) for:
- Docker setup for local proof generation
- Wallet configuration
- Circuit compilation
- Real ZK proof enablement

## 🛡️ Security Considerations

> **Production Deployment Checklist**

### Critical
- [x] Remove wallet/seed files from repository (C1)
- [x] Fix DB schema/query mismatches (C2)
- [x] Ensure deterministic Merkle roots (C3)
- [x] Resolve service port conflicts (C4)

### High Priority
- [x] Add authentication to sensitive endpoints (H1)
- [x] Configure restrictive CORS origins (H2)
- [x] Standardize epoch calculations (H4)

### Medium Priority
- [x] Persist ACR nullifiers to survive restarts (M2)
- [x] Rate limit auto-registration (M3)
- [x] Consolidate signature schema (M1)

### Deployment Readiness
- [ ] Deploy proof server on Raspberry Pi 5
- [ ] Provision ATECC608B devices with unique keys
- [ ] Set `DEMO_MODE=false` to disable test endpoints
- [ ] Set `CORS_ORIGINS` to production domains
- [ ] Configure LoRa network parameters for deployment region
- [ ] Set up systemd service for proof server auto-start

## 📚 Documentation

- [Msingi Architecture](Msingi.md) - Detailed architecture and protocols
- [Midnight Integration](proof-server/MIDNIGHT_INTEGRATION.md) - SDK setup guide
- [Hardware Guide](HARDWARE_GUIDE.md) - Bill of materials and wiring
- [CLAUDE.md](CLAUDE.md) - Development guide
- [ZK_IOT_PROOF.md](ZK_IOT_PROOF.md) - ZK proof flow documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built for Zimbabwe's smallholder farmers** 🇿🇼

*Privacy that grows with every device that joins.*

