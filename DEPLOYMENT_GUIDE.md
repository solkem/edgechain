# EdgeChain Midnight Devnet Deployment Guide

## Overview

This guide walks through deploying the EdgeChain Federated Learning smart contract to Midnight Network devnet and integrating it with the frontend.

**Current Status**: Contract compiled ✅ | Deployment pending ⏳

---

## Prerequisites

### 1. Lace Midnight Preview Wallet

**Download**: https://www.lace.io/midnight

**Setup**:
1. Install the Lace Midnight Preview browser extension
2. Create a new wallet or import existing seed phrase
3. Switch to "Midnight Devnet" network
4. Get test tDUST tokens from faucet

**Faucet** (get test tokens):
- URL: https://faucet.devnet.midnight.network
- Connect your wallet
- Request tDUST tokens (used for transaction fees)

### 2. Midnight CLI Tools

**Install Midnight CLI**:
```bash
npm install -g @midnight-ntwrk/midnight-cli
```

**Verify Installation**:
```bash
midnight-cli --version
```

### 3. Node.js & Yarn

- Node.js 18+ (already configured in project)
- Yarn 1.22+ (already configured in project)

---

## Step 1: Install Midnight.js Packages

Add the following packages to [`packages/ui/package.json`](packages/ui/package.json):

```json
{
  "dependencies": {
    "@midnight-ntwrk/midnight-js-contracts": "^0.1.0",
    "@midnight-ntwrk/midnight-js-node-provider": "^0.1.0",
    "@midnight-ntwrk/midnight-js-http-client-provider": "^0.1.0",
    "@midnight-ntwrk/midnight-js-proof-provider": "^0.1.0",
    "@midnight-ntwrk/midnight-js-utils": "^0.1.0"
  }
}
```

**Install**:
```bash
cd packages/ui
yarn install
```

**Note**: Package versions may vary. Check Midnight Network documentation for latest versions:
https://docs.midnight.network/develop/

---

## Step 2: Deploy Smart Contract to Devnet

### 2.1 Compile Contract (Already Done)

The contract is already compiled. Verify with:

```bash
cd packages/contract
yarn compact
```

**Expected Output**:
```
✓ Compiling edgechain.compact
✓ Generated TypeScript API: dist/managed/edgechain/contract/index.d.cts
✓ Generated ZK keys: dist/managed/edgechain/keys/
✓ Generated circuit IR: dist/managed/edgechain/zkir/
```

### 2.2 Deploy to Midnight Devnet

**Deploy Command**:
```bash
cd packages/contract
midnight-cli deploy dist/edgechain.compact --network devnet
```

**Interactive Prompts**:
1. "Connect wallet?" → Yes (Lace Midnight Preview will open)
2. "Approve transaction?" → Yes (confirm in wallet popup)
3. "Use tDUST for fees?" → Yes

**Expected Output**:
```
✓ Contract deployed successfully
Contract Address: 0x1234567890abcdef... (save this!)
Transaction Hash: 0xabcdef1234567890...
View on Explorer: https://explorer.devnet.midnight.network/tx/0xabcdef...
```

**IMPORTANT**: Save the contract address! You'll need it in Step 3.

### 2.3 Verify Deployment

**Check Contract on Explorer**:
1. Go to https://explorer.devnet.midnight.network
2. Search for your contract address
3. Verify contract status shows "Active"

**Query Contract State**:
```bash
midnight-cli query <CONTRACT_ADDRESS> --method getCurrentRound
```

**Expected Output**:
```json
{
  "currentRound": 1,
  "currentModelVersion": 0,
  "submissionCount": 0,
  "isAggregating": false
}
```

---

## Step 3: Configure Environment Variables

Create [`packages/ui/.env`](packages/ui/.env):

```env
# Contract Configuration
VITE_CONTRACT_ADDRESS=0x1234567890abcdef...  # Replace with your deployed address

# Midnight Devnet Endpoints
VITE_MIDNIGHT_INDEXER_URL=https://indexer.devnet.midnight.network
VITE_MIDNIGHT_NODE_URL=https://rpc.devnet.midnight.network

# ZK Configuration (relative to public dir)
VITE_ZK_KEYS_PATH=/keys/
VITE_ZKIR_PATH=/zkir/
```

**Update** [`packages/ui/.env.example`](packages/ui/.env.example):
```bash
cp packages/ui/.env packages/ui/.env.example
# Then edit .env.example to remove actual contract address (use placeholder)
```

---

## Step 4: Update ContractProvider with Real Implementation

Open [`packages/ui/src/providers/ContractProvider.tsx`](packages/ui/src/providers/ContractProvider.tsx)

### 4.1 Add Imports

Replace the import section:

```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useWallet } from './WalletProvider';
import type { DAppConnectorAPI } from '@midnight-ntwrk/dapp-connector-api';

// Midnight.js SDK imports
import { createZkConfigProvider } from '@midnight-ntwrk/midnight-js-contracts';
import { createHttpClientProvider } from '@midnight-ntwrk/midnight-js-http-client-provider';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-proof-provider';

// Import the compiled Midnight contract
import { Contract } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';
import type { Ledger } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';
```

### 4.2 Update `initializeContract()` Function

Find the `initializeContract()` function (around line 163) and replace the TODO section with:

```typescript
const initializeContract = async () => {
  try {
    console.log('🔧 Initializing EdgeChain FL contract...');

    // Step 1: Get DApp Connector API from Lace Midnight Preview wallet
    const api = await getDAppConnectorAPI();
    if (!api) {
      throw new Error('Midnight DApp Connector API not available. Please install Lace Midnight Preview wallet.');
    }
    console.log('✅ DApp Connector API obtained');

    // Step 2: Initialize ZK Config Provider (loads proving keys)
    const zkConfigProvider = await createZkConfigProvider({
      keysPath: import.meta.env.VITE_ZK_KEYS_PATH || '/keys/',
      zkirPath: import.meta.env.VITE_ZKIR_PATH || '/zkir/'
    });
    console.log('✅ ZK Config Provider initialized');

    // Step 3: Initialize Indexer Provider (queries blockchain state)
    const indexerUrl = import.meta.env.VITE_MIDNIGHT_INDEXER_URL;
    if (!indexerUrl) {
      throw new Error('VITE_MIDNIGHT_INDEXER_URL not configured');
    }
    const indexerProvider = createHttpClientProvider(indexerUrl);
    console.log('✅ Indexer Provider initialized');

    // Step 4: Initialize Proof Provider (generates ZK-proofs)
    const proofProvider = createProofProvider(zkConfigProvider);
    console.log('✅ Proof Provider initialized');

    // Step 5: Create providers object
    const providers = {
      zkConfigProvider,
      indexerProvider,
      proofProvider,
      walletProvider: api
    };

    // Step 6: Load deployed contract
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('VITE_CONTRACT_ADDRESS not configured. Deploy contract first.');
    }

    console.log(`📡 Connecting to contract at ${contractAddress}...`);
    const contractInstance = await Contract.deploy(providers, contractAddress);

    setContract(contractInstance);
    console.log('✅ Contract initialized successfully');

    // Step 7: Load initial ledger state
    await refreshLedger();

    setIsInitialized(true);
    setError(null);
  } catch (err: any) {
    console.error('Contract initialization error:', err);
    setError(err.message);
    setIsInitialized(false);
  }
};
```

### 4.3 Update Circuit Call Functions

Replace the `submitModel()` function TODO section:

```typescript
// Replace line ~209:
// const result = await contract.submitModel(witnesses);
// with:
const result = await contract.submitModel({});
await result.wait(); // Wait for transaction confirmation
```

Replace the `completeAggregation()` function TODO section:

```typescript
// Replace line ~260:
// const result = await contract.completeAggregation(witnesses);
// with:
const result = await contract.completeAggregation({});
await result.wait();
```

Update `getGlobalModelHash()`:

```typescript
// Replace line ~298:
// const result = await contract.getGlobalModelHash({});
// return result.value;
const result = await contract.getGlobalModelHash({});
return new Uint8Array(result.value); // Convert Bytes<32> to Uint8Array
```

Update `checkAggregating()`:

```typescript
// Replace line ~324:
// const result = await contract.checkAggregating({});
// return result.value;
const result = await contract.checkAggregating({});
return result.value;
```

### 4.4 Update `refreshLedger()` Function

Replace the mock ledger creation (line ~262):

```typescript
const refreshLedger = async (): Promise<void> => {
  if (!isInitialized || !contract) {
    return;
  }

  try {
    console.log('🔄 Refreshing contract ledger state...');

    // Query actual ledger state from contract
    const [
      currentRound,
      currentModelVersion,
      submissionCount,
      globalModelHash,
      isAggregating
    ] = await Promise.all([
      contract.getCurrentRound({}),
      contract.getCurrentModelVersion({}),
      contract.getSubmissionCount({}),
      contract.getGlobalModelHash({}),
      contract.checkAggregating({})
    ]);

    const ledgerState: Ledger = {
      currentRound: BigInt(currentRound.value),
      currentModelVersion: BigInt(currentModelVersion.value),
      submissionCount: BigInt(submissionCount.value),
      globalModelHash: new Uint8Array(globalModelHash.value),
      isAggregating: isAggregating.value
    };

    setLedger(ledgerState);
    console.log('✅ Ledger state refreshed:', ledgerState);
  } catch (err: any) {
    console.error('Refresh ledger error:', err);
  }
};
```

---

## Step 5: Update FLDashboard to Use Contract

Open [`packages/ui/src/components/FLDashboard.tsx`](packages/ui/src/components/FLDashboard.tsx)

### 5.1 Import Contract Hook

Add to imports (line ~8):

```typescript
import { useContract } from '../providers/ContractProvider';
```

### 5.2 Use Contract in Component

Find line ~72 where `useWallet()` is called, add:

```typescript
const wallet = useWallet();
const contract = useContract(); // Add this line
```

### 5.3 Replace HTTP Call with Contract Call

Find the `handleSubmitModel()` function (around line 189). Replace:

```typescript
// OLD CODE (remove):
const response = await fetch('http://localhost:3001/api/fl/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(submission)
});

if (!response.ok) {
  throw new Error('Failed to submit model to aggregator');
}
```

**WITH**:

```typescript
// NEW CODE (contract-based):
console.log('📤 Submitting model to Midnight contract...');

// Call submitModel circuit
const success = await contract.submitModel();

if (!success) {
  throw new Error('Failed to submit model to contract');
}

console.log('✅ Model submitted to contract');

// Check if aggregation started
const isAggregating = await contract.checkAggregating();
if (isAggregating) {
  console.log('🔄 Aggregation triggered! Waiting for backend...');
  setStatus('Aggregation in progress...');
}
```

---

## Step 6: Build and Test

### 6.1 Build Frontend

```bash
cd packages/ui
yarn build
```

**Expected Output**:
```
✓ Built successfully
✓ Copied ZK keys to dist/keys/
✓ Copied zkir to dist/zkir/
```

### 6.2 Start Frontend

```bash
yarn start
```

**Expected Output**:
```
Server running at http://localhost:8080
```

### 6.3 Test Wallet Connection

1. Open http://localhost:8080 in browser
2. Click "Connect Wallet"
3. Lace Midnight Preview should open
4. Approve connection
5. Check browser console for:
   ```
   ✅ DApp Connector API obtained
   ✅ ZK Config Provider initialized
   ✅ Indexer Provider initialized
   ✅ Proof Provider initialized
   ✅ Contract initialized successfully
   ```

### 6.4 Test Model Submission

1. Click "Collect Data" (generates mock farm data)
2. Click "Train Model" (trains local model with TensorFlow.js)
3. Click "Submit to Network"
4. Watch console for:
   ```
   📤 Calling submitModel circuit...
   ⚡ Generating ZK-proof for model submission...
   📡 Submitting proof to Midnight contract...
   ✅ Model submitted to contract
   ```
5. Check Midnight Explorer for your transaction

### 6.5 Verify On-Chain State

**Using Midnight CLI**:
```bash
midnight-cli query <CONTRACT_ADDRESS> --method getCurrentRound
```

**Expected Output** (after 1 submission):
```json
{
  "currentRound": 1,
  "currentModelVersion": 0,
  "submissionCount": 1,
  "isAggregating": false
}
```

**Expected Output** (after 2+ submissions):
```json
{
  "currentRound": 1,
  "currentModelVersion": 0,
  "submissionCount": 2,
  "isAggregating": true  // Aggregation triggered!
}
```

---

## Step 7: Backend Aggregator Integration

The backend needs to watch contract events and trigger FedAvg when `isAggregating` becomes true.

### 7.1 Install Midnight.js in Backend

Add to [`server/package.json`](server/package.json):

```json
{
  "dependencies": {
    "@midnight-ntwrk/midnight-js-contracts": "^0.1.0",
    "@midnight-ntwrk/midnight-js-http-client-provider": "^0.1.0"
  }
}
```

### 7.2 Create Contract Watcher Service

Create [`server/src/services/contractWatcher.ts`](server/src/services/contractWatcher.ts):

```typescript
import { Contract } from '@edgechain/contract/dist/managed/edgechain/contract/index.cjs';
import { createHttpClientProvider } from '@midnight-ntwrk/midnight-js-http-client-provider';
import { performAggregation } from './aggregation.js';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const INDEXER_URL = process.env.MIDNIGHT_INDEXER_URL || 'https://indexer.devnet.midnight.network';

export async function startContractWatcher() {
  console.log('🔍 Starting Midnight contract watcher...');

  // Initialize provider
  const indexerProvider = createHttpClientProvider(INDEXER_URL);

  // Connect to contract (read-only)
  const contract = await Contract.deploy({ indexerProvider }, CONTRACT_ADDRESS);

  // Poll for aggregation status every 10 seconds
  setInterval(async () => {
    try {
      const isAggregating = await contract.checkAggregating({});

      if (isAggregating.value) {
        console.log('🚨 Aggregation triggered! Starting FedAvg...');

        // Fetch submitted models (TODO: implement model storage)
        const models = await fetchSubmittedModels();

        // Perform FedAvg
        const aggregatedModel = await performAggregation(models);

        // Call completeAggregation circuit
        // Note: This requires a wallet with tDUST
        // TODO: Set up backend wallet for contract calls
        console.log('✅ Aggregation complete. Call completeAggregation().');
      }
    } catch (err) {
      console.error('Contract watcher error:', err);
    }
  }, 10000); // Check every 10 seconds
}

async function fetchSubmittedModels() {
  // TODO: Implement model retrieval
  // Options:
  // 1. IPFS (store model hashes on-chain, actual weights on IPFS)
  // 2. Off-chain database (backend stores models temporarily)
  // 3. Direct farmer-to-aggregator communication
  return [];
}
```

### 7.3 Update Server Entry Point

Update [`server/src/index.ts`](server/src/index.ts):

```typescript
import { startContractWatcher } from './services/contractWatcher.js';

// ... existing Express setup ...

// Start contract watcher
startContractWatcher();

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔍 Watching Midnight contract for aggregation events`);
});
```

---

## Step 8: Two-Farmer Demo Test

### Test Scenario: Complete FL Round

**Farmer 1**:
1. Open http://localhost:8080 in Chrome
2. Connect Lace Midnight Preview (Wallet A)
3. Collect data → Train model → Submit
4. Check contract: `submissionCount` should be `1`

**Farmer 2**:
1. Open http://localhost:8080 in Firefox (or incognito)
2. Connect Lace Midnight Preview (Wallet B - different wallet!)
3. Collect data → Train model → Submit
4. Check contract: `submissionCount` should be `2`, `isAggregating` should be `true`

**Backend**:
1. Watch backend logs: should detect aggregation trigger
2. Backend performs FedAvg computation
3. Backend calls `contract.completeAggregation()`
4. Check contract: `currentModelVersion` incremented, `isAggregating` back to `false`

**Verification**:
```bash
midnight-cli query <CONTRACT_ADDRESS> --method getCurrentModelVersion
# Should return 1 (incremented from 0)

midnight-cli query <CONTRACT_ADDRESS> --method getCurrentRound
# Should return 2 (incremented from 1)
```

---

## Troubleshooting

### Issue: "DApp Connector API not available"

**Solution**:
- Ensure Lace Midnight Preview extension is installed
- Refresh browser page
- Check extension is enabled for localhost
- Try `window.cardano.midnight.mnLace` in browser console

### Issue: "Contract not found at address"

**Solution**:
- Verify contract address in `.env` matches deployed address
- Check contract on explorer: https://explorer.devnet.midnight.network
- Ensure you're on Midnight Devnet (not testnet/mainnet)

### Issue: "Transaction failed: Insufficient tDUST"

**Solution**:
- Visit faucet: https://faucet.devnet.midnight.network
- Request more tDUST tokens
- Wait 1-2 minutes for tokens to arrive

### Issue: "ZK proof generation failed"

**Solution**:
- Check `dist/keys/` and `dist/zkir/` folders exist
- Rebuild: `yarn build` (copies keys to dist)
- Verify key files are accessible at `/keys/` in browser

### Issue: "Ledger query returns null"

**Solution**:
- Check indexer URL in `.env`
- Verify contract is active on explorer
- Try increasing timeout in `createHttpClientProvider(url, { timeout: 30000 })`

---

## Next Steps

### Production Readiness

1. **IPFS Integration**: Store model weights on IPFS, only hashes on-chain
2. **Backend Wallet**: Set up dedicated wallet for `completeAggregation()` calls
3. **Event Listening**: Replace polling with Midnight event subscriptions
4. **Error Handling**: Add retry logic for failed transactions
5. **Gas Optimization**: Batch multiple submissions if needed

### Security Enhancements

1. **ZK-Proof Witnesses**: Add private inputs for model validation
2. **Access Control**: Add farmer registration circuit
3. **Slashing**: Penalize farmers who submit invalid models
4. **Differential Privacy**: Add noise to model updates

### UX Improvements

1. **Transaction Status**: Show pending/confirmed states
2. **Gas Estimation**: Display estimated tDUST cost
3. **Progress Indicators**: Show proof generation progress
4. **Mobile Support**: Test on mobile Lace wallet

---

## Resources

- **Midnight Docs**: https://docs.midnight.network/
- **Compact Reference**: https://docs.midnight.network/develop/reference/compact/
- **Devnet Explorer**: https://explorer.devnet.midnight.network
- **Lace Wallet**: https://www.lace.io/midnight
- **EdgeChain Status**: [MIDNIGHT_INTEGRATION_STATUS.md](MIDNIGHT_INTEGRATION_STATUS.md)

---

**Last Updated**: November 4, 2025
**Status**: Ready for deployment to Midnight Devnet ✅
