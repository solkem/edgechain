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
- Compute nullifier: `N = H(device_secret || epoch)`
- Generate ZK proof of valid contribution
- Claim rewards using nullifier (no identity linkage)

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

### 2. Start Backend Server

```bash
cd server
npm install
npm run dev
```

### 3. Access Web Interface

Open http://localhost:3000

## 📁 Project Structure

```
edgechain/
├── firmware/
│   └── esp32-msingi/          # ESP32-S3 firmware (NEW)
│       ├── src/
│       │   ├── main.cpp        # Entry point
│       │   ├── secure_element.cpp  # ATECC608B driver
│       │   ├── lora_comm.cpp   # LoRa communication
│       │   └── brace_client.cpp    # BRACE protocol
│       └── platformio.ini
├── packages/
│   ├── contract/              # Compact smart contracts
│   │   └── src/
│   │       ├── arduino-iot.compact     # IoT registration + attestation
│   │       └── edgechain.compact       # Federated learning
│   └── ui/                    # React frontend
├── server/                    # Express.js backend
└── Msingi.md                  # Architecture reference
```

## 🔧 Smart Contracts

### arduino-iot.compact

- **Merkle Proof Verification**: 20-level binary tree (supports 1M+ devices)
- **Nullifier Storage**: Map-based (prevents race conditions)
- **Admin Authentication**: Signature verification for root updates

### edgechain.compact

- **Federated Learning**: Private witness functions for farmer identity
- **Aggregation**: Threshold-triggered model aggregation
- **Privacy**: Only aggregated model hash stored on-chain

## 🎯 Deployment

### Midnight Testnet

| Contract | Address |
|----------|---------|
| Arduino IoT | `02001d62...b30a` |
| Federated Learning | `02002f44...be39` |

### Live Demo

- **Frontend**: https://edgechain-midnight-ui.fly.dev/
- **API**: https://edgechain-api.fly.dev/health

## 🛡️ Security Considerations

> **Production Deployment Checklist**

- [ ] Integrate Midnight SDK for real ZK proofs (currently mocked)
- [ ] Deploy proof server software on Raspberry Pi 5
- [ ] Provision ATECC608B devices with unique keys
- [ ] Set `DEMO_MODE=false` to disable test endpoints
- [ ] Configure LoRa network parameters for deployment region

## 📚 Documentation

- [Msingi Architecture](Msingi.md) - Detailed architecture and protocols
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
