# EdgeChain 🌾

**Privacy-Preserving AI for Farmers on Midnight Network**

EdgeChain is a decentralized federated learning platform that brings AI-powered agricultural predictions to farmers while protecting sensitive farm data through zero-knowledge proofs.

## 🚀 Live Demo

**Try it now:** https://edgechain-midnight-ui.fly.dev/

- Train ML models locally on African agricultural data
- See zero-knowledge proofs generated in real-time
- Participate in multi-device federated learning
- View privacy-preserving model aggregation

**API Backend:** https://edgechain-api.fly.dev/health

---

## 🎯 Vision

Traditional agriculture AI solutions require farmers to upload sensitive farm data (soil composition, yield history, financial info) to centralized servers. EdgeChain changes this: farmers train AI models locally on their own data, participate in decentralized model aggregation, and access predictions through simple SMS—all while keeping their data completely private.

## ✨ Features

- **🔐 Privacy-First** - Uses Midnight Network's zero-knowledge proofs. Sensitive farm data never leaves the farmer's device
- **📡 IoT Sensor Integration** - Arduino Nano 33 BLE Sense collects real-time environmental data (temperature, humidity) with cryptographic authentication
- **🔑 Unique Device Identity** - Each Arduino generates unique Ed25519 keypairs from hardware serial numbers for secure device authentication
- **📱 SMS Predictions** - Works on any phone, no app download needed. Farmers text commands to get crop predictions instantly
- **🤝 Decentralized Aggregation** - Multiple aggregators can submit, system picks the best one by historical accuracy
- **💰 Incentive System** - Farmers and honest aggregators earn rewards for participation (0.1 DUST per verified IoT reading)
- **⚡ Federated Learning** - Train models locally, aggregate globally. Each farmer's data stays on-device
- **🌐 Accessible** - Designed for smallholder farmers with limited tech literacy and connectivity
- **☁️ Decentralized Storage** - ZK proofs and sensor data stored on IPFS for transparency and immutability

## 🔐 4-Tier Privacy Architecture

EdgeChain implements a **cryptographically verifiable 4-tier privacy architecture** that protects sensitive farm data at every stage of federated learning:

```
┌─────────────────────────────────────────────────────────────────┐
│ L1: RAW DATA (Local Device Only)                               │
│ ✅ AES-256-GCM encrypted in browser localStorage                │
│ ✅ NEVER transmitted over network                               │
│ ✅ Farmer controls encryption key (derived from password)       │
├─────────────────────────────────────────────────────────────────┤
│ L2: ML FEATURES (Temporary, In-Memory Only)                     │
│ ✅ Normalized to [0,1] range (no absolute values)               │
│ ✅ Trends calculated (hides specific readings)                  │
│ ✅ Deleted immediately after local training                     │
│ ✅ NEVER stored persistently                                    │
├─────────────────────────────────────────────────────────────────┤
│ L3: GRADIENTS (Encrypted on IPFS)                               │
│ ✅ Encrypted with farmer key before upload                      │
│ ✅ Stored on IPFS (decentralized storage)                       │
│ ✅ Database stores ONLY IPFS CID (not gradients)                │
│ ✅ Programmable privacy (selective key sharing)                 │
├─────────────────────────────────────────────────────────────────┤
│ L4: COMMITMENTS (Midnight Blockchain)                           │
│ ✅ Only cryptographic commitments on-chain                      │
│ ✅ ZK proof of device registration (identity not revealed)      │
│ ✅ Nullifiers prevent double-claiming                           │
│ ✅ NO raw data, features, or gradients                          │
└─────────────────────────────────────────────────────────────────┘
```

### Privacy Guarantees

**What is NEVER stored on-chain or in centralized databases:**
- ❌ Raw IoT sensor data (temperature, humidity, soil moisture, pH)
- ❌ GPS coordinates or farm locations
- ❌ ML feature vectors
- ❌ Gradient values or model weight updates
- ❌ Farmer identity (proven via ZK, not revealed)

**What IS stored:**
- ✅ **L1 (Local Device):** Encrypted raw data in browser localStorage
- ✅ **L3 (IPFS):** Encrypted gradients with IPFS CID
- ✅ **L4 (Blockchain):** Cryptographic commitments + IPFS CID (pointers, not data)

**Attack Resistance:**
- 🛡️ **Database Operator:** Cannot see raw data (encrypted on IPFS)
- 🛡️ **Blockchain Observer:** Cannot see gradients (only commitments visible)
- 🛡️ **IPFS Node:** Cannot decrypt gradients (no farmer key)
- 🛡️ **Network Eavesdropper:** Cannot see raw data (never transmitted)

**Programmable Privacy (Midnight Feature):**
Farmers can selectively grant/revoke access to encrypted gradients stored on IPFS. This enables:
- Trusted researchers to access specific datasets
- Time-limited data sharing for audits
- Revokable permissions for collaborators

**See [PRIVACY_ARCHITECTURE_SUMMARY.md](./PRIVACY_ARCHITECTURE_SUMMARY.md) for complete details.**

## 🏗️ Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                            EdgeChain Ecosystem                                 │
│         Privacy-Preserving AI + IoT Data Collection + Federated Learning       │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            IoT DATA COLLECTION LAYER                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         BLE (Web Bluetooth)        ┌──────────────────┐
│  Arduino Nano 33 BLE │ ──────────────────────────────────>│  Gateway (Web)   │
│      Sense (Rev2)    │     Encrypted + Signed Payload     │   Browser UI     │
│                      │                                     │                  │
│ ┌──────────────────┐ │                                     │ ┌──────────────┐ │
│ │ HS300x Sensor    │ │                                     │ │Auto-Register │ │
│ │ • Temperature    │ │    Payload Format:                 │ │ Device       │ │
│ │ • Humidity       │ │    ┌─────────────────────┐         │ └──────────────┘ │
│ └──────────────────┘ │    │ [JSON: temp, humid] │         │                  │
│                      │    │ [EdDSA Signature]   │         │ ┌──────────────┐ │
│ ┌──────────────────┐ │    │ [Device Public Key] │         │ │Parse Payload │ │
│ │ Unique Device ID │ │    └─────────────────────┘         │ │Verify Sig    │ │
│ │ (from HW Serial) │ │                                     │ └──────────────┘ │
│ │                  │ │    Every 5 seconds                 └─────────┬────────┘
│ │ Ed25519 Keypair: │ │                                              │
│ │ • Public Key     │ │                                              │
│ │ • Private Key    │ │                                              ↓
│ │   (Derived from  │ │                              ┌───────────────────────┐
│ │    NRF_FICR)     │ │                              │ Backend API (Node.js) │
│ └──────────────────┘ │                              │                       │
│                      │                              │ • Device Registry     │
│ BLE Name:            │                              │ • Merkle Tree         │
│ "EdgeChain-XXXX"     │                              │ • Reward Tracking     │
└──────────────────────┘                              │ • ZK Proof Service    │
                                                      └───────────┬───────────┘
                                                                  │
                                                                  ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DECENTRALIZED STORAGE LAYER (IPFS)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────────────────┐
                              │   IPFS Microservice (Storacha)  │
                              │   https://edgechain-ipfs.fly.dev│
                              │                                 │
                              │  Stores:                        │
                              │  • ZK Proofs (CID: bafybei...)  │
                              │  • Sensor Readings (immutable)  │
                              │  • Device Metadata              │
                              │                                 │
                              │  Mock Mode: Works without creds │
                              └─────────────────────────────────┘
                                             │
                                             ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FEDERATED LEARNING LAYER                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐                     ┌──────────────────────────┐
│  Farmer #1 UI   │                     │   Midnight Smart         │
│  (Browser)      │                     │   Contract (Compact)     │
│                 │                     │                          │
│ ┌─────────────┐ │   submitModel()     │ Ledger State:            │
│ │TensorFlow.js│ │────────────────────>│ - currentRound           │
│ │Local Train  │ │   ZK-Proof          │ - submissionCount        │
│ │ (on IoT +   │ │                     │ - globalModelHash        │
│ │  Manual)    │ │                     │ - deviceRegistry         │
│ └─────────────┘ │                     │ - rewardPool             │
│                 │                     │                          │
│ ┌─────────────┐ │                     │ Circuits:                │
│ │ Lace Wallet │ │                     │ - submitModel()          │
│ │ (Sign Tx)   │ │                     │ - completeAggregation()  │
│ └─────────────┘ │                     │ - claimRewards()         │
└─────────────────┘                     │ - verifyDeviceProof()    │
                                        └────────────┬─────────────┘
┌─────────────────┐                                 │
│  Farmer #2 UI   │   submitModel()                 │ Watch Events
│  (Browser)      │────────────────────>            │
│                 │   ZK-Proof                      │
│ ┌─────────────┐ │                                 │
│ │TensorFlow.js│ │                                 │
│ │Local Train  │ │                                 │
│ └─────────────┘ │                                 │
└─────────────────┘                                 │
                                                    │
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
│  5. Stores global model on IPFS                          │
│  6. Distributes rewards (0.1 DUST per verified reading)  │
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
│  3. Run TensorFlow.js inference (IoT + manual data)      │
│  4. SMS response: "Yield: 4.1 tons/ha..."                │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PRIVACY & SECURITY GUARANTEES                           │
└─────────────────────────────────────────────────────────────────────────────────┘

✅ Device Identity:  Unique per Arduino (derived from hardware serial)
✅ Data Authenticity: EdDSA signatures verify sensor readings
✅ Replay Protection: Nullifiers prevent double-claiming rewards
✅ Privacy-Preserving: ZK proofs hide device identity (reveal only Merkle root)
✅ Decentralized:    IPFS storage for immutability and transparency
✅ Incentive-Aligned: 0.1 DUST reward for automatic collection (IoT devices)
                      0.02 DUST reward for manual data entry
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

**For Web Application:**
- Node.js >= 22.0.0
- Yarn >= 4.9.2
- Git >= 2.0.0
- Lace Midnight wallet (for on-chain participation)
- Chrome, Edge, or Opera browser (for Web Bluetooth)

**For Arduino IoT Devices (Optional):**
- Arduino Nano 33 BLE Sense or Sense Rev2
- Arduino IDE 2.x or PlatformIO
- USB cable for programming
- Required libraries:
  - Arduino_HS300x (by Arduino)
  - ArduinoBLE (by Arduino)
  - Crypto (by Rhys Weatherley)

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

### Arduino IoT Setup (Optional)

**Setup Your Arduino Nano 33 BLE Sense:**

```bash
# 1. Install Arduino IDE 2.x
# Download from: https://www.arduino.cc/en/software

# 2. Install Board Support
# Arduino IDE → Board Manager → Search "Arduino Mbed OS Nano Boards" → Install

# 3. Install Required Libraries
# Arduino IDE → Library Manager → Install:
#   - Arduino_HS300x
#   - ArduinoBLE
#   - Crypto (by Rhys Weatherley)

# 4. Flash EdgeChain Firmware
# Open: arduino/edgechain_iot/edgechain_iot.ino
# Select: Tools → Board → Arduino Nano 33 BLE
# Select: Tools → Port → [Your Arduino Port]
# Click: Upload

# 5. Verify Operation
# Open: Tools → Serial Monitor (115200 baud)
# You should see:
#   [1/4] Generating UNIQUE device identity...
#   Hardware Serial: XXXXXXXXXXXXXXXX
#   Device ID: EDGECHAIN_XXXXXXXX
#   [4/4] BLE advertising as: EdgeChain-XXXX
```

**Connect Arduino to EdgeChain:**

1. Visit: https://edgechain-midnight.fly.dev/arduino (use Chrome/Edge/Opera)
2. Connect your wallet
3. Click "Connect IoT Kit via BLE"
4. Select your Arduino from the list (named "EdgeChain-XXXX")
5. Device auto-registers on first reading
6. Start earning 0.1 DUST per verified sensor reading!

**Troubleshooting:**
- Arduino not appearing? Check Serial Monitor for "BLE advertising" message
- Browser issues? Make sure you're using Chrome/Edge/Opera (not Safari/Firefox)
- See [private-docs/ARDUINO_RAW_BOARD_ONBOARDING.md](private-docs/ARDUINO_RAW_BOARD_ONBOARDING.md) for detailed guide
```

## 📁 Project Structure

```
edgechain-midnight-hackathon/
├── arduino/                         # ✅ IMPLEMENTED - IoT Device Firmware
│   └── edgechain_iot/
│       └── edgechain_iot.ino        # Arduino Nano 33 BLE Sense firmware
│                                    # - Unique device identity from HW serial
│                                    # - Ed25519 signing of sensor readings
│                                    # - BLE transmission (Web Bluetooth)
│                                    # - HS300x temp/humidity sensors
│
├── ipfs-service/                    # ✅ IMPLEMENTED - Decentralized Storage
│   ├── index.mjs                    # Express microservice (ESM)
│   ├── fly.toml                     # Deployed to edgechain-ipfs.fly.dev
│   └── package.json                 # Storacha IPFS client
│
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
│   │   │   │   ├── ArduinoDashboard.tsx    # ✅ IoT device dashboard
│   │   │   │   │                           # - Web Bluetooth integration
│   │   │   │   │                           # - Auto-registration flow
│   │   │   │   │                           # - Real-time sensor charts
│   │   │   │   │                           # - Reward tracking
│   │   │   │   └── (other UI components)
│   │   │   ├── fl/
│   │   │   │   ├── types.ts                # FL type definitions
│   │   │   │   ├── training.ts             # TensorFlow.js local training
│   │   │   │   ├── dataCollection.ts       # Mock farm data generation
│   │   │   │   ├── arduinoIntegration.ts   # ✅ BLE device integration
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
│   │   │   ├── aggregation.ts       # Submission & download endpoints
│   │   │   └── arduino.ts           # ✅ IoT device registry & rewards
│   │   │                            # - Device registration
│   │   │                            # - Merkle tree maintenance
│   │   │                            # - ZK proof submission
│   │   │                            # - Reward distribution
│   │   ├── services/
│   │   │   ├── aggregation.ts       # FedAvg implementation
│   │   │   ├── ipfsStorage.ts       # ✅ IPFS microservice client
│   │   │   ├── zkProofService.ts    # ✅ Mock ZK proof generation
│   │   │   ├── deviceAuth.ts        # ✅ EdDSA signature verification
│   │   │   ├── nullifierTracking.ts # ✅ Replay protection
│   │   │   └── databasePersistence.ts # ✅ SQLite persistence
│   │   ├── database/
│   │   │   ├── index.ts             # Database connection
│   │   │   └── schema.sql           # Production schema
│   │   └── types/
│   │       └── fl.ts                # Backend FL types
│   ├── data/
│   │   └── edgechain.db             # SQLite database
│   ├── package.json
│   └── tsconfig.json
│
├── gateway/                         # ✅ IMPLEMENTED - Standalone BLE Gateway
│   └── ble_receiver.html            # Test page for Arduino BLE connection
│
├── 📄 DOCUMENTATION
│   ├── README.md                          # This file (main overview)
│   └── private-docs/                      # Internal documentation
│       ├── IMPLEMENTATION_STATUS.md       # Complete architecture overview
│       ├── ARDUINO_RAW_BOARD_ONBOARDING.md # Arduino setup guide
│       ├── ARDUINO_DEVICE_REGISTRATION.md  # Device registry documentation
│       └── ARDUINO_TOOLCHAIN_FIX.md       # Troubleshooting guide
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
- 🏗️ **[Implementation Status](private-docs/IMPLEMENTATION_STATUS.md)** - Complete architecture overview, ZK privacy system, and deployment status
- 📡 **[Arduino Onboarding Guide](private-docs/ARDUINO_RAW_BOARD_ONBOARDING.md)** - End-to-end setup from raw Arduino board to earning rewards
- 🔐 **[Device Registration System](private-docs/ARDUINO_DEVICE_REGISTRATION.md)** - Merkle tree registry and reward distribution
- 🔧 **[Arduino Troubleshooting](private-docs/ARDUINO_TOOLCHAIN_FIX.md)** - Common issues and fixes for Arduino IDE

### External Resources
- [Midnight Network Docs](https://docs.midnight.network/)
- [Compact Language Guide](https://docs.midnight.network/develop/reference/compact/)
- [Lace Wallet Integration](https://docs.midnight.network/wallet/lace/)
- [Zero-Knowledge Proofs](https://docs.midnight.network/learn/zk-proofs/)
- [Federated Learning Basics](https://ai.google/education/federated-learning/)
- [Arduino Nano 33 BLE Sense](https://docs.arduino.cc/hardware/nano-33-ble-sense/)
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)


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
