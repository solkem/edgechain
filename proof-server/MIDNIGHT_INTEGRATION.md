# Midnight SDK Integration Guide

This guide explains how to enable real ZK proof generation using the Midnight SDK.

## Prerequisites

1. **Node.js 18+** installed
2. **Docker** installed (for local proof server)
3. **tDUST tokens** for testnet transactions

## Step 1: Install Dependencies

```bash
cd proof-server
npm install
```

This will install the Midnight SDK packages:
- `@midnight-ntwrk/midnight-js-contracts`
- `@midnight-ntwrk/midnight-js-types`
- `@midnight-ntwrk/compact-runtime`
- `@midnight-ntwrk/zswap`

## Step 2: Start Local Proof Server

The proof server generates ZK proofs locally. Run it in Docker:

```bash
docker run -d \
  --name midnight-proof-server \
  -p 6300:6300 \
  midnightnetwork/proof-server:latest
```

Verify it's running:

```bash
curl http://localhost:6300/health
```

## Step 3: Configure Wallet

Create a wallet for submitting proofs:

```bash
# Generate a new wallet
npx midnight-cli wallet create --output wallet.json

# Request tDUST tokens from faucet
npx midnight-cli faucet request --wallet wallet.json --network testnet
```

## Step 4: Update Configuration

Edit `config/default.json`:

```json
{
  "midnight": {
    "nodeUrl": "https://rpc.testnet.midnight.network",
    "proofServerUrl": "http://localhost:6300",
    "contractAddress": "YOUR_DEPLOYED_CONTRACT_ADDRESS",
    "walletPath": "./wallet.json"
  }
}
```

## Step 5: Compile Circuits

Compile the attestation circuit:

```bash
cd proof-server/circuits
npx compactc attestation.compact --output ../compiled/
```

## Step 6: Enable Real Proofs

In `config/default.json`, set:

```json
{
  "midnight": {
    "useMockProofs": false
  }
}
```

## Step 7: Run the Proof Server

```bash
npm run dev
```

You should see:

```
Connected to Midnight network
Proof server running on http://0.0.0.0:3002
Using real ZK proofs
```

## Verification

Test proof generation:

```bash
curl -X POST http://localhost:3002/register-commitment \
  -H "Content-Type: application/json" \
  -d '{"commitment": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}'
```

Check if proofs are real:

```bash
curl http://localhost:3002/status
```

Response should show `"isMock": false` for recent proofs.

## Troubleshooting

### "SDK not available"

Make sure dependencies are installed:

```bash
npm install @midnight-ntwrk/midnight-js-contracts
```

### "Proof server connection failed"

Check Docker container is running:

```bash
docker logs midnight-proof-server
```

### "Insufficient funds"

Request more tDUST from the faucet:

```bash
npx midnight-cli faucet request --wallet wallet.json --network testnet
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Proof Server (Node.js)                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ LoRa Receiver   │→ │ Midnight Prover  │→ │ Contract Call  │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│                              ↓                                   │
│                    ┌──────────────────┐                          │
│                    │ Local Proof      │                          │
│                    │ Server (Docker)  │                          │
│                    └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │ Midnight Testnet │
                    └──────────────────┘
```

## Resources

- [Midnight Developer Docs](https://docs.midnight.network)
- [Midnight Academy](https://academy.midnight.network)
- [Compact Language Reference](https://docs.midnight.network/develop/compact)
- [Discord Community](https://discord.gg/midnight)
