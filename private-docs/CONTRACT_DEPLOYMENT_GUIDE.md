# EdgeChain Contract Deployment Guide

**Last Updated**: 2025-11-14
**Target Network**: Midnight Devnet
**Compact Version**: 0.2.0

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Available Contracts](#available-contracts)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Overview

EdgeChain uses **three Compact smart contracts** for different functionality:

1. **`edgechain.compact`** - Main Federated Learning contract (3.0 KB)
2. **`arduino-iot.compact`** - IoT device registry (5.8 KB)
3. **`arduino-iot-private.compact`** - Private IoT with ZK proofs (7.9 KB)

For the hackathon demo, we'll deploy **`edgechain.compact`** which handles:
- Model submission tracking
- Round management
- Aggregation coordination
- Global model versioning

**Important**: Contract deployment happens **ONCE** via CLI. Users don't deploy contracts - they interact with the already-deployed contract address.

---

## Prerequisites

### Required Tools

✅ **Already Installed** (verified):
- Compact CLI v0.2.0 (`/home/codespace/.local/bin/compact`)
- Node.js >= 22.0.0
- Git

### Required Accounts

You'll need:
1. **Lace Midnight Preview Wallet**
   - Download: https://www.lace.io/
   - Switch to "Midnight Preview" mode
   - Ensure you're on Midnight Devnet

2. **Test DUST tokens** (tDUST)
   - Deployment requires ~1 tDUST for gas fees
   - Get from Midnight faucet: https://faucet.devnet.midnight.network/

### Environment Setup

Check your environment:
```bash
# Verify Compact is installed
compact --version
# Expected: compact 0.2.0

# Verify contracts exist
ls -lh packages/contract/dist/*.compact

# Check Lace wallet is connected
# Open Lace → Settings → Network → Should show "Midnight Devnet"
```

---

## Available Contracts

### 1. EdgeChain Federated Learning Contract
**File**: `packages/contract/dist/edgechain.compact` (3.0 KB)

**Purpose**: Main FL coordination contract

**Ledger State**:
```compact
export ledger currentRound: Counter;
export ledger currentModelVersion: Counter;
export ledger submissionCount: Counter;
export ledger globalModelHash: Bytes<32>;
export ledger isAggregating: Boolean;
```

**Circuits**:
- `submitModel()` - Farmers submit model weights (ZK proof of validity)
- `completeAggregation()` - Aggregator publishes new global model
- `derivePublicIdentity()` - Privacy-preserving farmer identification

**Privacy Model**:
- ✅ Farmer secret keys stay private (via witness functions)
- ✅ Only submission count visible on-chain
- ✅ Individual model weights never stored publicly
- ✅ Aggregated model hash published

---

### 2. Arduino IoT Registry Contract
**File**: `packages/contract/dist/arduino-iot.compact` (5.8 KB)

**Purpose**: Device registration and reward tracking

**Features**:
- Merkle tree-based device registry
- EdDSA signature verification
- Reward calculation (0.1 tDUST per reading)
- Nullifier tracking (prevent replay attacks)

---

### 3. Arduino IoT Private Contract
**File**: `packages/contract/dist/arduino-iot-private.compact` (7.9 KB)

**Purpose**: Enhanced privacy for IoT data

**Features**:
- All features of arduino-iot.compact
- ZK proofs hide device identity
- Only Merkle root revealed on-chain
- Maximum privacy for sensor data

---

## Deployment Steps

### Step 1: Compile Contract (Already Done)

The contracts are already compiled in `packages/contract/dist/`. If you need to recompile:

```bash
cd packages/contract
yarn build
# Or manually:
compact src/edgechain.compact -o dist/edgechain.compact
```

### Step 2: Choose Deployment Method

There are **two ways** to deploy Midnight contracts:

#### Method A: Using Midnight CLI Tools (Recommended)

This requires the full Midnight SDK with deployment utilities:

```bash
# Install Midnight CLI tools (if not already installed)
npm install -g @midnight-ntwrk/cli

# Deploy contract
midnight deploy \
  --contract packages/contract/dist/edgechain.compact \
  --network devnet \
  --wallet lace
```

**Note**: As of writing (Nov 2025), the Midnight CLI deployment tools may still be in development. Check latest docs: https://docs.midnight.network/develop/

#### Method B: Using Lace Wallet DApp Connector (Browser-Based)

If CLI deployment isn't available, you can deploy via a deployment DApp:

1. Visit Midnight deployment tool (if available): `https://deploy.midnight.network`
2. Connect Lace Midnight Preview wallet
3. Upload `packages/contract/dist/edgechain.compact`
4. Confirm transaction (costs ~1 tDUST gas)
5. Copy the deployed contract address

#### Method C: Manual via compact-cli

```bash
# Navigate to contract directory
cd packages/contract

# Compile and deploy (syntax may vary based on Compact version)
compact deploy dist/edgechain.compact \
  --network https://rpc.devnet.midnight.network \
  --private-key-file ~/.midnight/deployer.key
```

**⚠️ Important**: Save your private key securely if generating one for deployment.

---

### Step 3: Record Contract Address

After successful deployment, you'll receive a contract address like:

```
Contract deployed successfully!
Address: 0x1a2b3c4d5e6f7890abcdef1234567890abcdef12
Transaction hash: 0xabcdef1234567890...
Block: 1234567
Gas used: 98765
```

**SAVE THIS ADDRESS** - you'll need it for configuration.

---

## Post-Deployment Configuration

### Step 1: Update Environment Variables

#### For Local Development

Create/update `.env` in project root:

```bash
# Midnight Network Configuration
VITE_MIDNIGHT_INDEXER_URL=https://indexer.devnet.midnight.network
VITE_MIDNIGHT_INDEXER_WS=wss://indexer.devnet.midnight.network
VITE_MIDNIGHT_NODE_URL=https://rpc.devnet.midnight.network

# ✨ ADD YOUR DEPLOYED CONTRACT ADDRESS HERE
VITE_CONTRACT_ADDRESS=0x1a2b3c4d5e6f7890abcdef1234567890abcdef12

# Backend API
VITE_API_URL=http://localhost:3001
```

#### For Production (Fly.io)

Set secrets via Fly.io CLI:

```bash
# Set contract address as Fly secret
flyctl secrets set \
  VITE_CONTRACT_ADDRESS=0x1a2b3c4d5e6f7890abcdef1234567890abcdef12 \
  --app edgechain-midnight

# Or edit fly.toml and add to [env] section
```

**Note**: For Vite environment variables to work in production, they must be set **at build time**, not runtime.

### Step 2: Update GitHub Actions Workflow

Edit `.github/workflows/deploy-flyio.yml`:

```yaml
- name: Build UI package
  run: yarn workspace edgechain-ui build
  env:
    NODE_ENV: production
    VITE_CONTRACT_ADDRESS: ${{ secrets.VITE_CONTRACT_ADDRESS }}  # Add this
```

Then set the GitHub secret:

```bash
# Via GitHub CLI
gh secret set VITE_CONTRACT_ADDRESS \
  --body "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12" \
  --repo solkem/edgechain-midnight-hackathon

# Or via GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret
# Name: VITE_CONTRACT_ADDRESS
# Value: 0x1a2b3c4d5e6f7890abcdef1234567890abcdef12
```

### Step 3: Update UI Code (Remove Deployment Button)

Edit `packages/ui/src/App.tsx` to remove the "Deploy Contract" section since contract is already deployed:

```typescript
// BEFORE: Shows deployment button
{!contractContext.isDeployed && <DeploymentSection />}

// AFTER: Contract is always deployed, skip to dashboard
{contractContext.isDeployed && <ArduinoDashboard />}
```

### Step 4: Rebuild and Redeploy

```bash
# Rebuild with new contract address
yarn workspace edgechain-ui build

# Test locally first
yarn dev

# Push to trigger production deployment
git add .
git commit -m "chore: Configure deployed EdgeChain contract address"
git push
```

---

## Verification

### Verify Deployment Succeeded

1. **Check Midnight Explorer**
   - Visit: https://explorer.devnet.midnight.network/
   - Search for your contract address
   - Verify contract bytecode matches

2. **Query Contract State**

```typescript
// In browser console on your app
const contract = useContract();
const round = await contract.getCurrentRound();
console.log('Current round:', round); // Should be 0n initially
```

3. **Check Contract in UI**

After redeploying with the contract address:
- Visit https://edgechain-midnight.fly.dev/
- Connect Lace wallet
- Should see "Contract Deployed ✅" status
- Arduino dashboard should be accessible

---

## Troubleshooting

### Problem: "Compact CLI not found"

```bash
# Install Compact compiler
curl -fsSL https://get.midnight.network/compact | sh

# Or via npm (if available)
npm install -g @midnight-ntwrk/compact
```

### Problem: "Insufficient funds for deployment"

- Deployment requires ~1 tDUST for gas fees
- Get test tokens from faucet: https://faucet.devnet.midnight.network/
- Wait for faucet transaction to confirm (~30 seconds)

### Problem: "Contract deployment failed: Invalid bytecode"

```bash
# Recompile contract with correct Compact version
cd packages/contract
rm -rf dist/
yarn build

# Verify compiled output
file dist/edgechain.compact
# Should show: binary file
```

### Problem: "VITE_CONTRACT_ADDRESS not defined in production"

**Cause**: Vite environment variables must be set at **build time**, not runtime.

**Fix**:
1. Set in GitHub Actions workflow BEFORE build step
2. Or set in Fly.io build args in fly.toml:

```toml
[build]
  [build.args]
    VITE_CONTRACT_ADDRESS = "0x..."
```

### Problem: "Contract not found at address"

1. Verify network (devnet vs testnet vs mainnet)
2. Check contract address in Midnight Explorer
3. Ensure Lace wallet is connected to Midnight Devnet
4. Clear browser cache and reconnect wallet

---

## Next Steps After Deployment

1. ✅ **Contract Deployed** - Address saved and configured
2. ⏭️ **Test Contract Interaction** - Submit a test model weight
3. ⏭️ **Deploy Arduino Demo** - Connect real IoT devices
4. ⏭️ **Document Demo Flow** - Create user guide for judges

---

## Reference Links

- **Midnight Docs**: https://docs.midnight.network/
- **Compact Language Guide**: https://docs.midnight.network/develop/reference/compact/
- **Contract Examples**: https://github.com/midnight-ntwrk/compact-examples
- **Lace Wallet**: https://www.lace.io/
- **Midnight Devnet Explorer**: https://explorer.devnet.midnight.network/

---

## Deployment History

| Date       | Contract              | Address | Deployer | Status |
|------------|-----------------------|---------|----------|--------|
| 2025-11-14 | edgechain.compact     | TBD     | TBD      | Pending|
| -          | arduino-iot.compact   | -       | -        | Not deployed |
| -          | arduino-iot-private   | -       | -        | Not deployed |

**Update this table after successful deployment!**

---

**Questions?** Check the [Midnight Discord](https://discord.gg/midnight) for community support.
