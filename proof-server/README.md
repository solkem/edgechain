# EdgeChain Proof Server

Farmer-owned proof server for EdgeChain Freedom Nodes (Linux x86 or ARM).

## Overview

The proof server receives LoRa transmissions from ESP32-S3 IoT devices and generates ZK proofs for submission to the Midnight network. It is designed to be farmer-owned to maintain the privacy guarantees of the BRACE and ACR protocols.

```
┌─────────────────────┐         ┌─────────────────────┐
│   ESP32-S3 Device   │  LoRa   │    Freedom Node     │
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

- **Freedom Node Compute**: Dell OptiPlex 7060 Micro class x86 host (i5-8500T, 16GB RAM recommended)
- **LoRa Module**: RYLR896 connected via USB-UART adapter (CP2102, 3.3V)
- **LTE Modem**: Huawei E3372-325 (Band 3 capable for Zimbabwe deployments)
- **Storage**: 64GB+ SSD/NVMe

## Installation

Recommended (Ubuntu Freedom Node host):

```bash
bash deploy/install.sh
```

Manual:

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
    "networkId": 6,
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
| `HOST` | Bind host | `0.0.0.0` |
| `LORA_PORT` | Serial port for LoRa module | /dev/ttyUSB0 |
| `LORA_BAUD` | LoRa serial baud | 115200 |
| `LORA_NETWORK_ID` | LoRa network ID | 6 |
| `LORA_ADDRESS` | LoRa receiver address | 1 |
| `LORA_FREQUENCY` | LoRa frequency in Hz | 915000000 |
| `LORA_SF` | LoRa spreading factor | 9 |
| `LORA_BW` | LoRa bandwidth (kHz) | 125 |
| `LORA_TX_POWER` | LoRa TX power (dBm) | 20 |
| `MIDNIGHT_NODE_URL` | Midnight network URL | testnet URL |
| `MIDNIGHT_CONTRACT` | Contract address override | empty |
| `MIDNIGHT_WALLET_PATH` | Wallet file path | `./wallet.json` |
| `MERKLE_STORAGE_PATH` | Merkle tree state path | `./data/merkle-tree.json` |
| `LOG_LEVEL` | Logging level | info |
| `LOG_FILE` | Log file path | `./logs/proof-server.log` |

Compatibility note: legacy installer variable names (`SERVER_PORT`, `LORA_SERIAL_PORT`, `LORA_BAUD_RATE`) are still accepted.

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
# Render service file with your user/home
EDGECHAIN_USER="$USER"
EDGECHAIN_HOME="$HOME"
sed \
  -e "s|__EDGECHAIN_USER__|$EDGECHAIN_USER|g" \
  -e "s|__EDGECHAIN_HOME__|$EDGECHAIN_HOME|g" \
  deploy/edgechain-proof-server.service | sudo tee /etc/systemd/system/edgechain-proof-server.service >/dev/null

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
