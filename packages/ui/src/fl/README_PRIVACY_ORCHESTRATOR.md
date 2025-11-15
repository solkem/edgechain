

 # EdgeChain Privacy Orchestrator

**Complete End-to-End Privacy-Preserving Federated Learning**

The Privacy Orchestrator coordinates all 4 layers of EdgeChain's privacy architecture to ensure that sensitive farm data is protected throughout the entire federated learning lifecycle.

---

## 🏗️ 4-Tier Privacy Architecture

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
│ L4: COMMITMENTS (Blockchain)                                    │
│ ✅ Only cryptographic commitments on-chain                      │
│ ✅ ZK proof of device registration (identity not revealed)      │
│ ✅ Nullifiers prevent double-claiming                           │
│ ✅ NO raw data, features, or gradients                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { PrivacyOrchestrator } from './privacyOrchestrator';
import * as tf from '@tensorflow/tfjs';

// 1. Initialize orchestrator
const orchestrator = new PrivacyOrchestrator();
await orchestrator.initialize(
  'farmerPassword',  // Derives encryption keys
  'DEVICE_001',      // Your device ID
  walletApi,         // Midnight wallet API (optional)
  contractAddress    // Contract address (optional)
);

// 2. Store raw IoT readings (L1: encrypted locally)
await orchestrator.storeReading({
  temperature: 28.5,
  humidity: 65.2,
  soil_moisture: 42.8,
  pH: 6.5,
  timestamp: Date.now(),
  device_id: 'DEVICE_001',
  location: { latitude: -19.015438, longitude: 32.673260 }
});

// 3. Execute privacy-preserving FL training cycle
const globalModel = /* get from aggregator */;
const result = await orchestrator.executeTrainingCycle(
  globalModel,
  roundId,
  'DEVICE_001',
  {
    merkleProof: [...],  // Proof of device registration
    leafIndex: 42
  }
);

console.log(`IPFS CID: ${result.ipfs_cid}`);
console.log(`Reward: ${result.reward_earned} tDUST`);
```

---

## 📊 What Happens During Training?

### Step-by-Step Breakdown

1. **L1: Retrieve Encrypted Readings**
   - Reads from browser localStorage (AES-256-GCM encrypted)
   - Decrypts with farmer's key
   - Raw data NEVER leaves the device

2. **L2: Extract Features**
   - Normalizes sensor values to [0,1] range
   - Calculates trends (hides specific readings)
   - Creates temporal abstractions
   - Features exist ONLY in memory

3. **L2: Train Local Model**
   - Runs TensorFlow.js in browser
   - Computes gradients: `Δw = w_local - w_global`
   - Calculates data quality score (for rewards)

4. **L2: DELETE Features** ⚠️ **CRITICAL**
   - Clears feature array from memory
   - JavaScript garbage collection handles cleanup
   - No persistent storage of intermediate data

5. **L3: Encrypt Gradients**
   - Encrypts gradient bundle with farmer key (AES-256-GCM)
   - Uploads encrypted blob to IPFS
   - Returns IPFS CID (content identifier)

6. **L3: Generate Commitment**
   - `Commitment = Hash(gradients || farmer_key || round_id)`
   - Cryptographic proof of contribution
   - Can be verified without revealing gradients

7. **L4: Submit to Smart Contract**
   - Submits commitment + IPFS CID
   - Provides ZK proof of device registration
   - Derives nullifier to prevent double-claiming
   - Earns rewards based on quality score

---

## 🔒 Privacy Guarantees

### What is NEVER Stored On-Chain?

❌ **Raw IoT Data**
- Temperature readings
- Humidity values
- Soil moisture levels
- pH measurements
- GPS coordinates

❌ **ML Features**
- Normalized values
- Calculated trends
- Temporal features

❌ **Gradient Values**
- Model weight updates
- Training parameters

### What IS Stored On-Chain?

✅ **Commitments** (cryptographic hashes)
- `Hash(gradients || farmer_key || round_id)`

✅ **IPFS CIDs** (pointers, not data)
- `QmXyZ...abc123` (points to encrypted blob)

✅ **Quality Scores** (public metrics)
- Integer 0-100 (for reward calculation)

✅ **Nullifiers** (prevent double-spending)
- `Hash(device_secret || round_id)`

---

## 🛡️ Attack Resistance

### Database Operator

**Has Access To:**
- Backend database
- IPFS CIDs
- Quality scores

**CANNOT Access:**
- ❌ Raw IoT readings (not in database)
- ❌ ML features (deleted, never stored)
- ❌ Gradient values (encrypted on IPFS)
- ❌ Farmer identity (ZK proof)

### Blockchain Observer

**Has Access To:**
- All on-chain transactions
- Smart contract state
- Public ledger data

**CANNOT Access:**
- ❌ Raw sensor data (only commitments)
- ❌ Farmer identity (nullifiers unlinkable)
- ❌ Device location (not on-chain)
- ❌ Gradient values (IPFS CID only)

### IPFS Node Operator

**Has Access To:**
- Encrypted gradient blobs
- IPFS metadata

**CANNOT Access:**
- ❌ Gradient values (AES-256-GCM encrypted)
- ❌ Farmer identity (no metadata)
- ❌ Original data source

### Network Eavesdropper

**Can Monitor:**
- HTTPS traffic (encrypted at transport layer)
- IPFS uploads
- Contract transactions

**CANNOT Access:**
- ❌ Raw readings (never transmitted)
- ❌ ML features (never transmitted)
- ❌ Gradient values (encrypted payloads)

---

## 🎯 Use Cases

### 1. Privacy-Preserving Crop Yield Prediction

```typescript
// Farmer stores daily readings
for (const reading of dailyReadings) {
  await orchestrator.storeReading(reading);
}

// Participates in FL without revealing sensitive data
const result = await orchestrator.executeTrainingCycle(
  globalModel,
  currentRound,
  deviceId,
  privateInputs
);

// Earns rewards based on data quality
console.log(`Earned ${result.reward_earned} tDUST`);
```

**Privacy Benefits:**
- ✅ Raw soil/weather data stays on device
- ✅ GPS coordinates never revealed
- ✅ Farm identity protected via ZK proofs

### 2. Selective Data Sharing (Programmable Privacy)

```typescript
// Farmer can selectively share encrypted gradients
// by providing decryption key to trusted researcher

const encryptedGradients = await ipfs.get(result.ipfs_cid);

// Only farmer has decryption key
const gradients = await decrypt(encryptedGradients, farmerKey);

// Can grant access to specific researchers
await grantAccess(researcher_id, farmerKey);
```

**Privacy Benefits:**
- ✅ Farmer controls who can decrypt
- ✅ Access can be revoked
- ✅ Granular permission system

### 3. Auditable Privacy Compliance

```typescript
// Verify privacy guarantees maintained
const audit = orchestrator.verifyPrivacyGuarantees();

console.log(`Privacy Valid: ${audit.valid}`);
audit.guarantees.forEach(g => console.log(`✅ ${g}`));

// Check specific layer compliance
const result = await orchestrator.executeTrainingCycle(...);
console.log('Privacy Audit:', result.privacy_audit);
// {
//   l1_readings_encrypted: 50,
//   l2_features_created: 50,
//   l2_features_deleted: true,
//   l3_gradients_encrypted: true,
//   l3_ipfs_upload: true,
//   l4_commitment_submitted: true
// }
```

---

## 🧪 Testing & Verification

### Run Complete Test Suite

```typescript
import { runAllOrchestratorTests } from './privacyOrchestrator.test';

// Runs comprehensive end-to-end tests
await runAllOrchestratorTests();
```

### Individual Tests

```typescript
// Test L2 feature deletion
await testL2FeatureDeletion();

// Test privacy guarantees
await testLayerPrivacyGuarantees();

// Test multiple rounds
await testMultipleRounds();
```

---

## 📈 Privacy Audit Trail

Every training cycle produces an audit trail:

```typescript
{
  privacy_audit: {
    l1_readings_encrypted: 50,     // Number of encrypted readings
    l2_features_created: 50,        // Features extracted
    l2_features_deleted: true,      // ✅ Critical check
    l3_gradients_encrypted: true,   // Encrypted before IPFS
    l3_ipfs_upload: true,           // Uploaded successfully
    l4_commitment_submitted: true   // On-chain submission
  }
}
```

**Key Indicator: `l2_features_deleted`**
- ✅ `true` = Privacy maintained (features deleted)
- ❌ `false` = PRIVACY VIOLATION (features leaked)

---

## 🔐 Cryptographic Primitives

### Encryption (L1 & L3)
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 (100,000 iterations, SHA-256)
- **IV:** Random 12 bytes per encryption

### Commitments (L4)
- **Algorithm:** SHA-256
- **Format:** `Hash("edgechain:commitment:" || ipfs_cid || farmer_key || round)`

### Nullifiers (L4)
- **Algorithm:** SHA-256
- **Format:** `Hash("edgechain:nullifier:" || round || device_secret)`
- **Purpose:** Prevent double-claiming rewards

### ZK Proofs (L4)
- **Merkle Proofs:** 10-level tree (up to 1024 devices)
- **Purpose:** Prove device registration without revealing ID

---

## ⚙️ Configuration

### Environment Variables

```env
# IPFS Service
REACT_APP_IPFS_SERVICE_URL=http://localhost:3002

# Midnight Network
VITE_MIDNIGHT_INDEXER_URL=https://indexer.devnet.midnight.network
VITE_CONTRACT_ADDRESS=edgechain_privacy_v1_devnet
```

### Custom IPFS Provider

```typescript
// In gradientManager.ts, update:
this.ipfsServiceUrl = 'https://your-ipfs-service.com';
```

---

## 🚨 Security Considerations

### Critical Security Requirements

1. **L2 Feature Deletion**
   - MUST call `featureExtractor.deleteFeatures()` after training
   - Failure to delete = privacy leak

2. **Farmer Password Security**
   - Store in secure password manager
   - NEVER hardcode in source
   - Use strong passwords (12+ chars, mixed case, symbols)

3. **Device Secret Protection**
   - Generated randomly on initialization
   - Should be backed up securely
   - Loss of secret = loss of reward access

4. **IPFS Encryption**
   - ALWAYS encrypt before upload
   - Verify encryption in tests
   - Monitor for unencrypted uploads

### Threat Model

**Assumptions:**
- ✅ Farmer device is trusted
- ✅ Farmer controls their password
- ✅ Browser localStorage is secure

**Adversaries:**
- 🛡️ Database operator (no plaintext access)
- 🛡️ Blockchain observer (only commitments visible)
- 🛡️ IPFS node (encrypted blobs only)
- 🛡️ Network eavesdropper (HTTPS + encryption)

---

## 📚 API Reference

### PrivacyOrchestrator

#### `initialize()`
Initialize orchestrator with farmer credentials.

```typescript
await orchestrator.initialize(
  farmerPassword: string,
  deviceId: string,
  walletApi?: DAppConnectorAPI,
  contractAddress?: string
): Promise<void>
```

#### `storeReading()`
Store raw IoT reading (L1: encrypted locally).

```typescript
await orchestrator.storeReading(
  reading: RawIoTReading
): Promise<void>
```

#### `executeTrainingCycle()`
Execute complete privacy-preserving FL cycle (L1→L2→L3→L4).

```typescript
await orchestrator.executeTrainingCycle(
  globalModel: tf.LayersModel,
  roundId: number,
  deviceId: string,
  privateInputs?: {
    merkleProof: Uint8Array[];
    leafIndex: number;
  }
): Promise<FLTrainingResult>
```

#### `verifyPrivacyGuarantees()`
Verify all privacy guarantees are maintained.

```typescript
orchestrator.verifyPrivacyGuarantees(): {
  valid: boolean;
  guarantees: string[];
  violations: string[];
}
```

---

## 🎓 Related Documentation

- [Layer 1: Local Data Vault](../iot/README_PRIVACY_LAYER1.md)
- [Layer 2: Feature Extractor](../iot/featureExtractor.ts)
- [Layer 3: Gradient Manager](./README_PRIVACY_LAYER3.md)
- [Layer 4: Smart Contract](../../contract/src/edgechain_privacy.compact)

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built for the **Midnight Summit Hackathon** to demonstrate privacy-preserving federated learning for agriculture in Zimbabwe using Midnight Network's programmable privacy features.

**Privacy Architecture Designed By:** EdgeChain Team
**Implemented Using:** Midnight Network, Compact, IPFS, TensorFlow.js
