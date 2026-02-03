# EdgeChain Proof Server

Farmer-owned proof server for the EdgeChain platform, designed to run on Raspberry Pi 5.

## Overview

The proof server receives LoRa transmissions from ESP32-S3 IoT devices and generates ZK proofs for submission to the Midnight network. It is designed to be farmer-owned to maintain the privacy guarantees of the BRACE and ACR protocols.

```
┌─────────────────────┐         ┌─────────────────────┐
│   ESP32-S3 Device   │  LoRa   │   Raspberry Pi 5    │
│   (Field Sensor)    │ ──────► │   (Proof Server)    │
│                     │         │                     │
│  • ATECC608B        │         │  • ZK Proof Gen     │
│  • BME280 Sensor    │         │  • Midnight SDK     │
│  • Soil Moisture    │         │  • Merkle Tree      │
└─────────────────────┘         └─────────────────────┘
                                          │
                                          │ ZK Proofs
                                          ▼
                                ┌─────────────────────┐
                                │   Midnight Network  │
                                │   (Blockchain)      │
                                └─────────────────────┘
```

## Hardware Requirements

- **Raspberry Pi 5** (4GB+ RAM recommended)
- **LoRa Module**: RYLR896 connected via USB-Serial (e.g., USB-TTL adapter)
- **Storage**: 32GB+ SD card

## Installation

```bash
# Clone the repository
git clone https://github.com/solkem/edgechain.git
cd edgechain/proof-server

# Install dependencies
npm install

# Build
npm run build

# Configure (copy and edit)
cp config/default.json config/local.json
nano config/local.json
```

## Configuration

Edit `config/local.json`:

```json
{
  "server": {
    "port": 3002,
    "host": "0.0.0.0"
  },
  "lora": {
    "serialPort": "/dev/ttyUSB0",
    "baudRate": 115200,
    "networkId": 18,
    "address": 1,
    "frequency": 915000000
  },
  "midnight": {
    "nodeUrl": "https://testnet.midnight.network",
    "contractAddress": "YOUR_CONTRACT_ADDRESS",
    "walletPath": "./wallet.json"
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 3002 |
| `LORA_PORT` | Serial port for LoRa module | /dev/ttyUSB0 |
| `MIDNIGHT_NODE_URL` | Midnight network URL | testnet URL |
| `LOG_LEVEL` | Logging level | info |

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### As a systemd Service

```bash
# Copy service file
sudo cp edgechain-proof-server.service /etc/systemd/system/

# Enable and start
sudo systemctl enable edgechain-proof-server
sudo systemctl start edgechain-proof-server

# Check status
sudo systemctl status edgechain-proof-server
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns server health status including LoRa and Midnight connection.

### Server Status

```bash
GET /status
```

Returns statistics about proofs generated, devices registered, etc.

### Register Commitment (Testing)

```bash
POST /register-commitment
Content-Type: application/json

{
  "commitment": "0x..."
}
```

### Get Merkle Proof

```bash
GET /merkle-proof/:commitment
```

### Claim Reward

```bash
POST /claim-reward
Content-Type: application/json

{
  "nullifier": "0x...",
  "proof": "0x...",
  "sensorDataHash": "0x..."
}
```

## WebSocket

Real-time updates are available via WebSocket at `ws://localhost:3002/ws`.

Events:
- `proof:submitted` - When a proof is submitted to Midnight
- `packet:invalid` - When an invalid packet is received
- `packet:error` - When packet processing fails

## Architecture

```
proof-server/
├── src/
│   ├── index.ts           # Entry point, Express server
│   ├── lora-receiver.ts   # RYLR896 LoRa module driver
│   ├── midnight-prover.ts # ZK proof generation (Midnight SDK)
│   ├── brace-verifier.ts  # BRACE protocol handler
│   ├── acr-handler.ts     # ACR reward claim processing
│   ├── merkle-tree.ts     # Device commitment Merkle tree
│   └── utils/
│       ├── logger.ts      # Winston logger
│       └── config.ts      # Configuration loader
├── config/
│   └── default.json       # Default configuration
└── data/
    └── merkle-tree.json   # Persisted Merkle tree
```

## Security Notes

1. **Keep the proof server physically secure** - It holds the Merkle tree of all registered devices
2. **Backup the Merkle tree** regularly (`data/merkle-tree.json`)
3. **Protect the wallet file** used for submitting proofs to Midnight
4. **Use encrypted LoRa** communication (enabled by default)

## Development Status

- [x] LoRa receiver (RYLR896)
- [x] BRACE protocol (commitment registration)
- [x] ACR protocol (anonymous rewards)
- [x] Merkle tree (20-level, 1M+ devices)
- [ ] Midnight SDK integration (pending SDK access)
- [ ] Full ZK proof verification

## License

MIT
