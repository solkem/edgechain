# EdgeChain 🌾

**Privacy-Preserving AI for Farmers on Midnight Network**

EdgeChain is a decentralized federated learning platform that brings AI-powered agricultural predictions to farmers while protecting sensitive farm data through zero-knowledge proofs.

---

## 🚀 Current Status (Midnight Hackathon)

**Implementation Progress**: 60% Complete

✅ **Completed**:
- Midnight smart contract (Compact) - compiled successfully
- Federated learning algorithm (FedAvg) - working
- Local model training (TensorFlow.js) - browser-based
- Frontend UI with wallet integration (Lace Midnight Preview)
- Contract provider architecture (React Context)
- Aggregation backend (Node.js/Express)

⚠️ **In Progress**:
- Midnight.js SDK integration (contract deployment pending)
- ZK-proof generation in frontend
- Backend contract event watching

📋 **Next Steps**:
- Deploy contract to Midnight devnet
- Replace HTTP calls with contract circuits
- End-to-end testing with 2 farmers

**Time Remaining**: 12 days | **Confidence**: High (85%)

📄 See detailed status: [`MIDNIGHT_INTEGRATION_STATUS.md`](MIDNIGHT_INTEGRATION_STATUS.md)

---

## 🎯 Vision

Traditional agriculture AI solutions require farmers to upload sensitive farm data (soil composition, yield history, financial info) to centralized servers. EdgeChain changes this: farmers train AI models locally on their own data, participate in decentralized model aggregation, and access predictions through simple SMS—all while keeping their data completely private.

## ✨ Features

- **🔐 Privacy-First** - Uses Midnight Network's zero-knowledge proofs. Sensitive farm data never leaves the farmer's device
- **📱 SMS Predictions** - Works on any phone, no app download needed. Farmers text commands to get crop predictions instantly
- **🤝 Decentralized Aggregation** - Multiple aggregators can submit, system picks the best one by historical accuracy 
- **💰 Incentive System** - Farmers and honest aggregators earn rewards for participation and verification
- **⚡ Federated Learning** - Train models locally, aggregate globally. Each farmer's data stays on-device
- **🌐 Accessible** - Designed for smallholder farmers with limited tech literacy and connectivity

## 🏗️ Architecture

### Current Implementation (Midnight Smart Contract)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         EdgeChain FL System                          │
│                    (Federated Learning on Midnight)                  │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐                    ┌──────────────────────────┐
│  Farmer #1 UI   │                    │   Midnight Smart         │
│  (Browser)      │                    │   Contract (Compact)     │
│                 │                    │                          │
│ ┌─────────────┐ │    submitModel()   │ Ledger State:            │
│ │TensorFlow.js│ │───────────────────>│ - currentRound           │
│ │Local Train  │ │    ZK-Proof        │ - submissionCount        │
│ └─────────────┘ │                    │ - globalModelHash        │
│                 │                    │ - isAggregating          │
│ ┌─────────────┐ │                    │                          │
│ │ Lace Wallet │ │                    │ Circuits:                │
│ │ (Sign Tx)   │ │                    │ - submitModel()          │
│ └─────────────┘ │                    │ - completeAggregation()  │
└─────────────────┘                    │ - getGlobalModelHash()   │
                                       │ - checkAggregating()     │
┌─────────────────┐                    └────────────┬─────────────┘
│  Farmer #2 UI   │                                 │
│  (Browser)      │    submitModel()                │
│                 │────────────────────>            │
│ ┌─────────────┐ │    ZK-Proof                     │
│ │TensorFlow.js│ │                                 │
│ │Local Train  │ │                                 │
│ └─────────────┘ │                                 │
└─────────────────┘                                 │
                                                    │ Watch Events
        ┌───────────────────────────────────────────┘
        │
        ↓
┌──────────────────────────────────────────────────────────┐
│  Backend Aggregator (Node.js)                            │
│                                                           │
│  1. Watches contract for submissionCount >= threshold    │
│  2. Retrieves model weights from farmers                 │
│  3. Runs FedAvg algorithm (weighted averaging)           │
│  4. Calls contract.completeAggregation(newModelHash)     │
│  5. Stores global model on IPFS/distributed storage      │
└──────────────────────────────────────────────────────────┘
        │
        │ Global model available
        ↓
┌──────────────────────────────────────────────────────────┐
│  SMS Inference Service (Africa's Talking API)            │
│                                                           │
│  Farmer texts: "PREDICT maize rainfall:720..."           │
│       ↓                                                   │
│  1. Query contract.getGlobalModelHash()                  │
│  2. Download model from IPFS                             │
│  3. Run TensorFlow.js inference                          │
│  4. SMS response: "Yield: 4.1 tons/ha..."                │
└──────────────────────────────────────────────────────────┘
```

### Data Flow (Privacy-Preserving)

```
1. TRAINING PHASE (Local, Private)
   ┌─────────────┐
   │   Farmer    │
   │   Device    │
   │             │
   │ [Raw Data]  │ ← NEVER leaves device
   │     ↓       │
   │ [TF.js      │
   │  Training]  │
   │     ↓       │
   │ [Model      │
   │  Weights]   │
   └──────┬──────┘
          │
          │ Only weights submitted (NOT raw data)
          ↓

2. SUBMISSION PHASE (On-Chain)
   ┌─────────────────────────────────┐
   │  Midnight Smart Contract        │
   │                                 │
   │  ✅ Stores: Hash of weights     │
   │  ✅ Stores: Submission count    │
   │  ✅ Verifies: ZK-proof          │
   │  ❌ NEVER stores: Raw weights   │
   │  ❌ NEVER stores: Farm data     │
   └─────────────────────────────────┘

3. AGGREGATION PHASE (Backend)
   ┌─────────────────────────────────┐
   │  Backend Aggregator             │
   │                                 │
   │  Computes: FedAvg algorithm     │
   │  Result: New global model       │
   │  Submits: Hash to contract      │
   │  Stores: Model on IPFS          │
   └─────────────────────────────────┘

4. INFERENCE PHASE (SMS)
   ┌─────────────────────────────────┐
   │  SMS Service                    │
   │                                 │
   │  Downloads: Global model        │
   │  Runs: Inference (ephemeral)    │
   │  Returns: Prediction via SMS    │
   │  Deletes: Input data after use  │
   └─────────────────────────────────┘
```

## 🔑 Key Concepts

### Federated Learning
Instead of centralizing data, models are trained locally on each farmer's device. Only model updates are submitted to aggregators, not raw farm data.

### Zero-Knowledge Proofs
Farmers can prove they own data and participated honestly without revealing the data itself. Aggregators can verify proofs without seeing the actual data.

### Decentralized Aggregation
- Multiple aggregators can register (no permission needed)
- Each submits their version of the aggregated model
- Honest participants are rewarded

### SMS Interface
Predictions available via simple text messages. Farmers don't need smartphones or internet—works on basic phones with SMS.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.0.0
- Yarn >= 4.9.2
- Git >= 2.0.0
- Lace Midnight wallet (for on-chain participation)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-team/edgechain-midnight-hackathon.git
cd edgechain-midnight-hackathon

# 2. Install dependencies
yarn install

# 3. Download ZK parameters
cd packages/cli
curl -O https://raw.githubusercontent.com/bricktowers/midnight-proof-server/main/fetch-zk-params.sh
chmod +x fetch-zk-params.sh
./fetch-zk-params.sh

# 4. Build all packages
cd ../..
yarn build:all
```

### Quick Start

**For Developers:**

```bash
# Run development servers
yarn dev

# Run tests
yarn test

# Compile Compact contracts
cd packages/contract
npm run compact

# Build everything
yarn build:all

# Start local infrastructure
cd packages/cli
docker compose -f standalone.yml up -d
```

## 📁 Project Structure

```
edgechain-midnight-hackathon/
├── packages/
│   ├── contract/                    # ✅ IMPLEMENTED - Midnight Smart Contract
│   │   ├── src/
│   │   │   ├── edgechain.compact    # FL smart contract (Compact language)
│   │   │   ├── managed/edgechain/   # Generated TypeScript API
│   │   │   │   ├── contract/
│   │   │   │   │   └── index.d.cts  # Contract type definitions
│   │   │   │   ├── compiler/
│   │   │   │   │   └── contract-info.json
│   │   │   │   ├── keys/            # ZK proving/verification keys
│   │   │   │   └── zkir/            # Circuit intermediate representation
│   │   │   └── index.ts
│   │   ├── dist/                    # Compiled contract output
│   │   └── package.json
│   │
│   ├── ui/                          # ✅ IMPLEMENTED - React Frontend
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── WalletProvider.tsx      # Lace Midnight wallet
│   │   │   │   └── ContractProvider.tsx    # Smart contract integration
│   │   │   ├── components/
│   │   │   │   ├── FLDashboard.tsx         # FL training interface
│   │   │   │   └── (other UI components)
│   │   │   ├── fl/
│   │   │   │   ├── types.ts                # FL type definitions
│   │   │   │   ├── training.ts             # TensorFlow.js local training
│   │   │   │   ├── dataCollection.ts       # Mock farm data generation
│   │   │   │   └── aggregation.ts          # FedAvg algorithm
│   │   │   ├── main.tsx                    # App entry (providers setup)
│   │   │   └── App.tsx                     # Main application
│   │   ├── dist/
│   │   └── package.json
│   │
│   ├── api/                         # Backend API (planned)
│   │   └── (to be implemented)
│   │
│   └── cli/                         # CLI tools
│       └── (to be implemented)
│
├── server/                          # ✅ IMPLEMENTED - FL Aggregation Backend
│   ├── src/
│   │   ├── index.ts                 # Express server
│   │   ├── routes/
│   │   │   └── aggregation.ts       # Submission & download endpoints
│   │   ├── services/
│   │   │   └── aggregation.ts       # FedAvg implementation
│   │   └── types/
│   │       └── fl.ts                # Backend FL types
│   ├── package.json
│   └── tsconfig.json
│
├── 📄 DOCUMENTATION
│   ├── README.md                    # This file (main overview)
│   ├── MIDNIGHT_INTEGRATION_STATUS.md    # Implementation status & roadmap
│   └── SMS_VIABILITY_ANALYSIS.md         # SMS approach justification
│
├── turbo.json                       # Monorepo configuration
├── tsconfig.json                    # Root TypeScript config
├── package.json                     # Root dependencies & scripts
└── yarn.lock                        # Dependency lock file
```

### Key Files

**Smart Contract**:
- [`packages/contract/src/edgechain.compact`](packages/contract/src/edgechain.compact) - Main FL contract
  - Circuits: `submitModel()`, `completeAggregation()`, `getGlobalModelHash()`, `checkAggregating()`
  - Ledger: `currentRound`, `submissionCount`, `globalModelHash`, `isAggregating`

**Frontend**:
- [`packages/ui/src/providers/WalletProvider.tsx`](packages/ui/src/providers/WalletProvider.tsx) - Lace wallet integration
- [`packages/ui/src/providers/ContractProvider.tsx`](packages/ui/src/providers/ContractProvider.tsx) - Contract calls
- [`packages/ui/src/components/FLDashboard.tsx`](packages/ui/src/components/FLDashboard.tsx) - Training UI
- [`packages/ui/src/fl/training.ts`](packages/ui/src/fl/training.ts) - TensorFlow.js training
- [`packages/ui/src/fl/aggregation.ts`](packages/ui/src/fl/aggregation.ts) - FedAvg algorithm

**Backend**:
- [`server/src/services/aggregation.ts`](server/src/services/aggregation.ts) - FedAvg service
- [`server/src/routes/aggregation.ts`](server/src/routes/aggregation.ts) - API endpoints

**Documentation**:
- [`MIDNIGHT_INTEGRATION_STATUS.md`](MIDNIGHT_INTEGRATION_STATUS.md) - Current status & next steps
- [`SMS_VIABILITY_ANALYSIS.md`](SMS_VIABILITY_ANALYSIS.md) - SMS approach validation
```

## 🔧 Development Guide

### Smart Contract Development

The Midnight smart contract is in [`packages/contract/src/edgechain.compact`](packages/contract/src/edgechain.compact):

```compact
pragma language_version >= 0.16.0;
import CompactStandardLibrary;

// Public on-chain state (Ledger)
export ledger currentRound: Counter;
export ledger currentModelVersion: Counter;
export ledger submissionCount: Counter;
export ledger globalModelHash: Bytes<32>;
export ledger isAggregating: Boolean;

// Constructor - runs when contract is deployed
constructor() {
  globalModelHash = "00000000000000000000000000000000";
  isAggregating = false;
}

// Farmer submits model (triggers aggregation at threshold)
export circuit submitModel(): Boolean {
  submissionCount.increment(1);
  if (submissionCount >= 2) {
    isAggregating = true;
  }
  return true;
}

// Backend completes aggregation
export circuit completeAggregation(): Boolean {
  currentModelVersion.increment(1);
  currentRound.increment(1);
  isAggregating = false;
  return true;
}

// Query global model hash
export circuit getGlobalModelHash(): Bytes<32> {
  return globalModelHash;
}
```

**To compile the contract**:
```bash
cd packages/contract
yarn compact  # Compiles and generates TypeScript API
yarn build    # Builds the package
```

### Frontend Development

The UI integrates with the contract via React providers:

**1. Wallet Connection** ([`WalletProvider.tsx`](packages/ui/src/providers/WalletProvider.tsx)):
```typescript
import { useWallet } from './providers/WalletProvider';

function MyComponent() {
  const { isConnected, address, connectWallet } = useWallet();

  return (
    <button onClick={connectWallet}>
      {isConnected ? address : 'Connect Wallet'}
    </button>
  );
}
```

**2. Contract Interaction** ([`ContractProvider.tsx`](packages/ui/src/providers/ContractProvider.tsx)):
```typescript
import { useContract } from './providers/ContractProvider';

function FLComponent() {
  const { submitModel, ledger } = useContract();

  const handleSubmit = async () => {
    const success = await submitModel();
    console.log('Submission count:', ledger?.submissionCount);
  };

  return <button onClick={handleSubmit}>Submit Model</button>;
}
```

**3. FL Training** ([`packages/ui/src/fl/training.ts`](packages/ui/src/fl/training.ts)):
```typescript
import { trainLocalModel } from './fl/training';

async function trainAndSubmit() {
  // Train locally with TensorFlow.js
  const result = await trainLocalModel(farmDataset, config);

  // Submit to contract
  await contract.submitModel();
}
```

### Backend Development

The aggregation backend watches the contract and performs FedAvg:

**Current Implementation** ([`server/src/services/aggregation.ts`](server/src/services/aggregation.ts)):
```typescript
// FedAvg algorithm implementation
async aggregateModelUpdates(submissions) {
  // Weighted averaging by dataset size
  const totalSamples = submissions.reduce((sum, s) => sum + s.datasetSize, 0);
  const weights = submissions.map(s => s.datasetSize / totalSamples);

  // Aggregate each layer
  const aggregatedModel = this.weightedAverage(submissions, weights);

  return aggregatedModel;
}
```

**Next Step** - Watch contract events:
```typescript
// TODO: Replace HTTP polling with contract event watching
async function watchContract() {
  contract.on('submissionCountChanged', async (count) => {
    if (count >= threshold) {
      const aggregated = await aggregateModels();
      await contract.completeAggregation(hash(aggregated));
    }
  });
}
```

## 📊 Data Flow

### Training Round Flow

```
1. Farmer trains model locally
   ↓
2. Generates ZK proof of data ownership
   ↓
3. Submits encrypted weights to contract
   ↓
4. Multiple aggregators download weights
   ↓
5. Aggregators run federated averaging
   ↓
6. Aggregators submit results to contract
   ↓
7. Farmers & aggregators claim rewards
```

## 🎮 Usage Examples

### Farmer Workflow

```bash
# 1. Connect wallet and register

# 2. Train model locally

# 3. Submit weights

# 4. Claim rewards

```

### Aggregator Workflow

```bash
# 1. Register as aggregator

# 2. Download farmer submissions

# 3. Run federated averaging

# 4. Submit result

# 5. Monitor rewards

```

### SMS Prediction (Farmer)

```
Farmer texts: "PREDICT maize rainfall:700"
↓
Bot responds: "Expected yield: 4.2 t/ha (89% confidence) 📈
Plant on: March 15 | Cost estimate: $250"
```

## 🧪 Testing

```bash
# Run unit tests
yarn test

# Run integration tests
yarn test:integration

# Test contract compilation
cd packages/contract
yarn test:compact

# Test SMS bot locally
cd packages/cli
yarn test:sms
```

## 🚢 Deployment

### Local Testnet

```bash
# Start Midnight testnet
cd packages/cli
docker compose -f testnet.yml up -d

# Deploy contract
yarn edgechain deploy:contract

# Start API & bot
yarn edgechain start:api
yarn edgechain start:bot
```

### Production (Midnight Mainnet)

```bash
# Build optimized bundle
yarn build:all

# Deploy to Midnight mainnet
cd packages/contract
yarn deploy:mainnet

# Start services
yarn start:production
```

## 📚 Resources

### Project Documentation
- ⭐ **[SMS Viability Analysis](SMS_VIABILITY_ANALYSIS.md)** - Why SMS is the right choice for agricultural AI (with case studies, academic validation, and responses to common objections)
- 📊 **[Midnight Integration Status](MIDNIGHT_INTEGRATION_STATUS.md)** - Current implementation status, architecture, and roadmap

### External Resources
- [Midnight Network Docs](https://docs.midnight.network/)
- [Compact Language Guide](https://docs.midnight.network/develop/reference/compact/)
- [Lace Wallet Integration](https://docs.midnight.network/wallet/lace/)
- [Zero-Knowledge Proofs](https://docs.midnight.network/learn/zk-proofs/)
- [Federated Learning Basics](https://ai.google/education/federated-learning/)


## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the IOG Midnight Developer Challenge Hackathon
- Powered by [Midnight Network](https://midnight.network/)
- Uses [Compact](https://docs.midnight.network/develop/reference/compact/) smart contract language
- Wallet integration with [Lace](https://www.lace.io/)


---

**Made with ❤️ (NeRudo) for smallholder farmers** 🌾

*EdgeChain: Privacy-Preserving AI, Farmer-Owned Data*
