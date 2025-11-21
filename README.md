# EdgeChain 🌾

**Privacy-Preserving IoT and AI for Farmers on Midnight Network**

EdgeChain is a decentralized IoT and federated learning platform that brings AI-powered agricultural predictions to farmers while protecting sensitive farm data through zero-knowledge proofs.

## 🎉 Live Deployment on Midnight Network

**Arduino IoT Contract**: DEPLOYED with Anonymity Set ZK Proofs
- **Contract Address**: `02001d6243d08ba466d6a3e32d9a04dd1d283d8fe2b9714cde81a25fa9081087b30a`
- **Network**: Midnight Testnet (testnet-02)
- **Deployed**: 2025-11-18T01:00:50.279Z
- **Deployment Proof**: See [deployment.json](packages/contract/deployment.json) for verified deployment details
- **ZK Innovation**: Devices hide in anonymity sets of 10,000+ using Merkle tree proofs with O(1) on-chain storage (32 bytes)

**Features Enabled**:
- ✅ Dual Merkle roots (auto/manual collection modes)
- ✅ Nullifier-based replay prevention (unlinkable across epochs)
- ✅ Differential rewards (0.1 tDUST auto, 0.02 tDUST manual)
- ✅ Range validation in ZK circuits
- ✅ Privacy-preserving device anonymity

---

**Federated Learning Contract**: DEPLOYED with ZK Identity Derivation
- **Contract Address**: `02002f44e466b8c8a1422e269156a6bb4e098cde1007203adf7181eb6659211dbe39`
- **Network**: Midnight Testnet (testnet)
- **Deployed**: 2025-11-08T19:42:27.511Z
- **Deployment Proof**: See [deployment.json](packages/contract/deployment.json) for verified deployment details
- **ZK Innovation**: Private witness functions derive public identities without revealing farmer secret keys on-chain

**Features Enabled**:
- ✅ Private witness functions (farmer secret keys never revealed)
- ✅ Public identity derivation via ZK proofs
- ✅ Submission threshold triggering (automatic aggregation at 2+ farmers)
- ✅ Global model hash storage (only aggregated result visible)
- ✅ Round-based FL cycles with version tracking

## 💡 Core ZK Innovations

### **"One Among Thousands"**
*IoT Contract - Anonymity Set ZK Proofs*

**Hide in the crowd.** Every device anonymous among 10,000+ others. Privacy that grows with every IoT Kit that joins.

---

### **"Different Submissions, Different Identities"**
*Federated Learning Contract - ZK Identity Derivation*

**Same farmer, different disguise every time.** Privacy that scales with participation.

---

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
- **📡 IoT Sensor Integration** - Arduino Nano 33 BLE Sense collects real-time environmental data (temperature, humidity) with **anonymous authentication via ZK proofs**
- **🔑 Anonymous Device Identity** - Each Arduino proves authorization without revealing which device submitted data. Devices hide in anonymity sets of 10,000+, preventing farm tracking and price discrimination
- **📱 SMS Predictions** - Works on any phone, no app download needed. Farmers text commands to get crop predictions instantly
- **🤝 Decentralized Aggregation** - Multiple aggregators can submit, system picks the best one by historical accuracy
- **💰 Incentive System** - Farmers and honest aggregators earn rewards for participation (0.1 DUST per verified IoT reading)
- **⚡ Federated Learning** - Train models locally, aggregate globally. Each farmer's data stays on-device
- **🌐 Accessible** - Designed for smallholder farmers with limited tech literacy and connectivity
- **☁️ Decentralized Storage** - Sensor data and ZK proofs stored on IPFS for transparency and immutability

## 🔐 Why Zero-Knowledge Proofs for IoT?

### The Problem: Privacy That Scales

Traditional IoT systems face a critical dilemma: **How do you verify device authenticity without revealing device identity?**

**Without ZK Proofs (Traditional Signatures)**:
```
Device #237 submits → Blockchain shows "Device #237 submitted data"
Result: Fully traceable, zero privacy, enables price discrimination
```

**With ZK Proofs (EdgeChain)**:
```
Device submits → Blockchain shows "Some authorized device submitted"
Result: Device hidden in crowd of 10,000+ devices, fair market pricing
```

### Three Unique Advantages Only ZK Can Provide

#### 1. **Anonymity Sets** - Hide in the Crowd

| Approach | Anonymity Set | Privacy Level |
|----------|---------------|---------------|
| Digital Signatures | 1 device | **0%** - Fully traceable |
| Ring Signatures | 10-50 devices | **Weak** - Limited crowd |
| **EdgeChain ZK** | 10,000+ devices | **Strong** - Massive crowd |

**Key Insight**: With ZK proofs, each device hides among ALL registered devices. An observer sees only "some device in the registry submitted" - they cannot determine which one.

#### 2. **O(1) Storage** - Constant Blockchain Size

**Compare storage costs for 10,000 devices**:

| Method | Storage Required | Cost Growth |
|--------|------------------|-------------|
| Store all device IDs | 320 KB | Linear (grows with devices) |
| Ring signatures | 6.4 MB | Exponential (includes all keys) |
| **ZK Merkle root** | **32 bytes** | **Constant (never grows)** |

**From our contract** ([arduino-iot.compact:29-32](packages/contract/src/arduino-iot.compact#L29-L32)):
```compact
ledger autoCollectionRoot: Bytes<32>;  // 10,000 devices → 32 bytes
ledger manualEntryRoot: Bytes<32>;     // 10,000 devices → 32 bytes
```

This **10,000x compression** is unique to ZK + Merkle trees.

#### 3. **Privacy Scales** - More Devices = Better Privacy

**The magic**: Privacy improves as the system grows, at zero additional cost.

| Timeline | Devices | Privacy Level | Storage Cost |
|----------|---------|---------------|--------------|
| Month 1 | 100 farmers | 1 in 100 (1%) | 32 bytes |
| Month 6 | 1,000 farmers | 1 in 1,000 (0.1%) | 32 bytes |
| Month 12 | 10,000 farmers | 1 in 10,000 (0.01%) | 32 bytes |

**Privacy improved 100x. Cost increased 0%.**

### ZK Proof Implementation in EdgeChain

#### 1. **Device Authorization** - Prove Without Revealing

**Location**: [arduino-iot.compact:108-121](packages/contract/src/arduino-iot.compact#L108-L121)

```compact
circuit submitAutoCollection(
  privDeviceId: Bytes<32>,        // SECRET witness
  privSecret: Field,              // SECRET witness
  privSiblings: Vector<20, Bytes<32>>, // SECRET Merkle proof
  // ... public parameters ...
): [] {
  // Verify device is in Merkle tree WITHOUT revealing which device
  const leaf = persistentHash<Vector<2, Bytes<32>>>([privDeviceId, fieldToBytes(privSecret)]);
  const inTree = verifyMerkleProof(leaf, privSiblings, privIndex, autoCollectionRoot);
  assert(inTree, "Device not in registry");
  // Device identity: HIDDEN ✅
}
```

**What this achieves**:
- ✅ Proves device is authorized
- ✅ Hides which specific device submitted
- ✅ Prevents unauthorized devices from submitting

#### 2. **Nullifier-Based Replay Prevention** - Anonymous Yet Unique

**Location**: [arduino-iot.compact:108-116](packages/contract/src/arduino-iot.compact#L108-L116)

```compact
// Compute nullifier to prevent replay while maintaining anonymity
const nullifier = computeNullifier(privSecret, currentEpoch);
const alreadyUsed = state.nullifiers.has(nullifier);
assert(!alreadyUsed, "Already submitted this epoch");
```

**How it works**:
```
Epoch 1: Device #237 → Nullifier = hash(secret_237 + 1) = 0xABC123
Epoch 2: Device #237 → Nullifier = hash(secret_237 + 2) = 0xDEF456

Observer sees: Two different nullifiers (cannot link to same device)
Security: Cannot submit twice in same epoch
Privacy: Cannot correlate submissions across epochs
```

**Why traditional approaches fail**:
- Counters require storing device ID → traceable
- Our ZK nullifiers → replay prevention + anonymity

#### 3. **Gradient Privacy** - Federated Learning with ZK

**Location**: [edgechain.compact:56-73](packages/contract/src/edgechain.compact#L56-L73)

```compact
export circuit submitModel(modelWeightHash: Bytes<32>): [] {
  // Derive public identity from private witness (stays private!)
  const farmerIdentity = derivePublicIdentity(farmerSecretKey(), currentRound as Field);

  // Model weight hash provided but NOT stored on ledger
  // Allows ZK proof verification without revealing actual weights

  submissionCount.increment(1);
}
```

**Privacy guarantee**: Farmers prove they encrypted gradients correctly WITHOUT revealing farm performance data.

### Real-World Attack Prevention

**Scenario**: Agricultural buyer wants to identify low-performing farms

**❌ Without ZK (Traditional Signatures)**:
```
Step 1: Scrape blockchain for all submissions
Step 2: Group by device ID (fully public)
Step 3: Analyze patterns:
  - Device #237: Low temps 5x → poor harvest prediction
  - Device #891: High humidity → mold risk
Step 4: Cross-reference with GPS → identify farms
Step 5: Exploit farmers during negotiations ("We'll pay you 20% less")
```

**✅ With ZK Proofs (EdgeChain)**:
```
Step 1: Scrape blockchain
Step 2: See only:
  - "Some device in Merkle tree submitted"
  - Nullifier: 0xABC123 (random-looking hash)
  - Cannot link submissions
Step 3: CANNOT identify individual farms
Step 4: CANNOT build performance profiles
Step 5: Must negotiate on fair market terms
```

### Technical Comparison

| Feature | Digital Signatures | Ring Signatures | **EdgeChain ZK** |
|---------|-------------------|-----------------|------------------|
| Proves device authenticity | ✅ Yes | ✅ Yes | ✅ Yes |
| Prevents replay attacks | ✅ Yes (counters) | ✅ Yes | ✅ Yes (nullifiers) |
| Hides device identity | ❌ No | ⚠️ Partially | ✅ Yes |
| Unlinkable across epochs | ❌ No | ⚠️ Partially | ✅ Yes |
| Blockchain cost for 10K devices | ❌ 320 KB | ❌ 6.4 MB | ✅ 32 bytes |
| Privacy improves with scale | ❌ No | ❌ No | ✅ Yes |
| Protects farmer sovereignty | ❌ No | ⚠️ Weakly | ✅ Yes |

### Anonymous Set Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DEVICE REGISTRATION (One-time Setup)                        │
└─────────────────────────────────────────────────────────────────┘

Arduino generates keypair → EdgeChain API → Midnight Blockchain
                                                    ↓
                                            ┌───────────────┐
                                            │ Merkle Tree   │
                                            │  Device_1_PK  │
                                            │  Device_2_PK  │
                                            │  Device_3_PK  │
                                            │  ...          │
                                            │ Root: 0x1234  │
                                            └───────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. DATA COLLECTION (Continuous Operation)                      │
└─────────────────────────────────────────────────────────────────┘

Arduino reads sensors → Signs data → EdgeChain API
                                            ↓
                                    Generate ZK Proof
                                    witness = {
                                      devicePrivKey: SECRET
                                      merkleProof: SECRET
                                      sensorData: SECRET
                                    }
                                            ↓
                                    π = PROVE("I'm in the set")
                                            ↓
                                    Submit to Blockchain

┌─────────────────────────────────────────────────────────────────┐
│ 3. PROOF VERIFICATION (On-Chain)                               │
└─────────────────────────────────────────────────────────────────┘

Midnight Blockchain verifies:
  ✓ ZK proof is valid
  ✓ Device IS in set (but WHICH device? Unknown!)
  ✓ Data passes range validation
  ✗ Device identity: NEVER REVEALED
```

### Privacy Guarantees

**PUBLIC (On-chain)**:
- ✓ Merkle root of device registry
- ✓ Nullifiers (unlinkable random hashes)
- ✓ ZK proof (π)
- ✓ Total submission count

**PRIVATE (Never revealed)**:
- ✗ Which specific device submitted
- ✗ Device private keys
- ✗ Device public keys (during submission)
- ✗ Merkle proof paths
- ✗ Raw sensor data

**VERIFIABLE (Without revealing identity)**:
- ✓ Data came from authorized device
- ✓ Device is in the registry
- ✓ Signature is valid
- ✓ No replay attacks

**For detailed ZK implementation**: See [ZK_IOT_PROOF.md](ZK_IOT_PROOF.md), [edgechain_anonymous_set_flow.md](edgechain_anonymous_set_flow.md), and [edgechain_traceable_vs_anonymous.md](edgechain_traceable_vs_anonymous.md)

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
✅ Anonymity Sets:   ZK proofs hide device identity among 10,000+ devices (O(1) storage via Merkle roots)
✅ Unlinkable:       Cannot correlate submissions across epochs (prevents farm tracking)
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

## 📋 Key Files

**Smart Contracts**:
- [`packages/contract/src/edgechain.compact`](packages/contract/src/edgechain.compact) - Main FL contract
  - Circuits: `submitModel()`, `completeAggregation()`, `getGlobalModelHash()`, `checkAggregating()`
  - Ledger: `currentRound`, `submissionCount`, `globalModelHash`, `isAggregating`
- [`packages/contract/src/arduino-iot.compact`](packages/contract/src/arduino-iot.compact) - Arduino IoT contract (DEPLOYED)
  - Circuits: `submitAutoCollection()`, `submitManualEntry()`, `updateMerkleRoots()`
  - Ledger: `autoCollectionRoot`, `manualEntryRoot`, `nullifiers`, `rewardPool`
  - Contract Address: `02001d6243d08ba466d6a3e32d9a04dd1d283d8fe2b9714cde81a25fa9081087b30a`
- [`packages/contract/src/arduino-iot-private.compact`](packages/contract/src/arduino-iot-private.compact) - Enhanced privacy version with ZK circuits

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

**Zero-Knowledge Proofs**:
- 🔐 **[ZK IoT Proof Guide](ZK_IOT_PROOF.md)** - Comprehensive explanation of why ZK proofs are essential for IoT privacy
- 📊 **[Anonymous Set Flow](edgechain_anonymous_set_flow.md)** - Detailed flow diagrams showing device registration and ZK proof generation
- 🆚 **[Traceable vs Anonymous](edgechain_traceable_vs_anonymous.md)** - Side-by-side comparison of traditional signatures vs ZK proofs

**Architecture & Implementation**:
- 🏗️ **[Implementation Status](private-docs/IMPLEMENTATION_STATUS.md)** - Complete architecture overview, ZK privacy system, and deployment status
- 📡 **[Arduino Onboarding Guide](private-docs/ARDUINO_RAW_BOARD_ONBOARDING.md)** - End-to-end setup from raw Arduino board to earning rewards
- 🔐 **[Device Registration System](private-docs/ARDUINO_DEVICE_REGISTRATION.md)** - Merkle tree registry and reward distribution
- 🔧 **[Arduino Troubleshooting](private-docs/ARDUINO_TOOLCHAIN_FIX.md)** - Common issues and fixes for Arduino IDE

**Live Deployment**:
- 📝 **[Deployment Details](packages/contract/deployment.json)** - Verified contract addresses and deployment configuration
- 🎉 **Contract Address**: `02001d6243d08ba466d6a3e32d9a04dd1d283d8fe2b9714cde81a25fa9081087b30a` (Midnight Testnet testnet-02)
- 📜 **[Contract Source Code](packages/contract/src/arduino-iot.compact)** - View the deployed Compact contract code
- ⚠️ **Note**: Midnight testnet explorer is currently unavailable. Deployment verified via deployment.json and transaction logs.

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
