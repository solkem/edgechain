# EdgeChain 🌾

**Privacy-Preserving AI for Farmers on Midnight Network**

EdgeChain is a decentralized federated learning platform that brings AI-powered agricultural predictions to farmers while protecting sensitive farm data through zero-knowledge proofs.

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

```
┌─────────────────────────────────────────────────────────────┐
│                      EdgeChain System                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🌾 FARMERS                                                 │
│  ├─ Train models locally on device                          │
│  ├─ Submit encrypted model weights                          │
│  ├─ Aggregation to generate global model used for inference │
│  └─ Claim rewards via Lace wallet                          │
│                                                             │
│  🔗 MIDNIGHT NETWORK (Smart Contract)                       │
│  ├─ Register aggregators (permissionless)                   │
│  ├─ Accept submitted model weights                          │
│  └─ Distribute rewards                                      │
│                                                             │
│  🔄 AGGREGATORS                                             │
│  ├─ Download submitted weights from farmers                 │
│  ├─ Run federated averaging locally                         │
│  ├─ Submit aggregation results                              │
│  └─ Earn rewards for honest participation                   │
│                                                             │
│  💬 SMS BOT (Inference Service)                             │
│  ├─ Accepts farmer SMS queries (any phone)                  │
│  ├─ Runs inference on latest model                          │
│  ├─ Returns predictions (rainfall, yield, etc.)             │
│  └─ Accessible to farmers without tech skills              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
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
│   ├── contract/           # Smart contracts (Compact)
│   │   ├── src/
│   │   │   ├── edgechain.compact    # Main contract
│   │   │   ├── aggregation/         # Aggregation logic
│   │   │   ├── voting/              # Voting & verification
│   │   │   └── rewards/             # Reward distribution
│   │   └── dist/
│   │
│   ├── api/                 # Backend API (TypeScript/Express)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── training.ts      # Local training endpoints
│   │   │   │   ├── submission.ts    # Weight submission
│   │   │   │   ├── aggregation.ts   # Aggregator endpoints
│   │   │   │   ├── voting.ts        # Verification & voting
│   │   │   │   └── rewards.ts       # Claim rewards
│   │   │   ├── services/
│   │   │   │   ├── ml.ts            # ML training logic
│   │   │   │   ├── crypto.ts        # Encryption/ZK proofs
│   │   │   │   └── blockchain.ts    # Midnight interaction
│   │   │   └── index.ts
│   │   └── dist/
│   │
│   ├── ui/                  # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── LoginScreen.tsx           # Lace wallet login
│   │   │   │   ├── RegistrationScreen.tsx   # Farmer profile
│   │   │   │   ├── TrainingScreen.tsx       # Model training
│   │   │   │   ├── SubmissionScreen.tsx     # Weight submission
│   │   │   │   ├── VerificationScreen.tsx   # Voting interface
│   │   │   │   ├── RewardsScreen.tsx        # Claim rewards
│   │   │   │   └── DashboardScreen.tsx      # Overview
│   │   │   ├── hooks/
│   │   │   │   ├── useLaceWallet.ts
│   │   │   │   ├── useEdgeChain.ts
│   │   │   │   └── useModel.ts
│   │   │   ├── lib/
│   │   │   │   ├── midnight.ts       # Midnight client setup
│   │   │   │   ├── ml-training.ts    # TensorFlow.js integration
│   │   │   │   └── crypto.ts         # ZK proof generation
│   │   │   └── main.tsx
│   │   └── dist/
│   │
│   └── cli/                 # CLI & SMS Bot (TypeScript/Node)
│       ├── src/
│       │   ├── commands/
│       │   │   ├── train.ts          # Train command
│       │   │   ├── submit.ts         # Submit weights
│       │   │   ├── vote.ts           # Vote command
│       │   │   ├── claim.ts          # Claim rewards
│       │   │   └── predict.ts        # SMS prediction
│       │   ├── sms/
│       │   │   ├── handler.ts        # SMS message handler
│       │   │   ├── inference.ts      # Model inference
│       │   │   └── responses.ts      # SMS templates
│       │   ├── config.ts
│       │   └── index.ts
│       └── dist/
│
├── turbo.json              # Monorepo configuration
├── tsconfig.json           # TypeScript config
├── package.json            # Root dependencies
├── .eslintrc.js            # Linting rules
├── README.md               # This file
└── LICENSE                 # Apache 2.0
```

## 🔧 Development Guide

### Contract Development

Edit `/packages/contract/src/edgechain.compact`:

```compact
pragma language_version >= 0.16;
import CompactStandardLibrary;

// Public state
export ledger round: Counter;
export ledger aggregators: Map<Address, AggregatorInfo>;
export ledger votes: Map<Address, Vote>;

// Circuit for farmer submission
export circuit submitWeights(): [] {
  // TODO: Implement weight submission logic
  round.increment(1);
}

// Circuit for finalization
export circuit finalizeRound(): [] {
  // TODO: Implement round finalization and reward distribution
}
```

### Frontend Development

Add components to `/packages/ui/src/components/`:

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