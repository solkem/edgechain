# Arduino Device Registration - How It Works

## Overview

Device registration connects your Arduino sensor to the EdgeChain backend, enabling data collection, verification, and rewards. The system uses a **dual Merkle tree** approach for different collection modes.

## Registration Flow

### Step 1: User Clicks "Register Arduino Device"

**Location**: Arduino Dashboard (`/arduino`)

**Requirements**:
- ✅ Wallet must be connected (Midnight Preview)
- ✅ User must be logged in

### Step 2: Generate Device Public Key

```typescript
// Frontend (ArduinoDashboard.tsx)
const devicePubkey = `device_${wallet.address?.substring(0, 16)}`;
// Example: "device_0x1234567890abcdef"
```

**Why**: Each device needs a unique identifier derived from the owner's wallet address.

### Step 3: Send Registration Request

```typescript
POST /api/arduino/registry/register
{
  "device_pubkey": "device_0x1234567890abcdef",
  "collection_mode": "auto",        // "auto" or "manual"
  "device_id": "arduino-001",       // Human-readable ID
  "metadata": {
    "owner": "0x1234567890abcdef", // Wallet address
    "location": "Farm"             // Optional metadata
  }
}
```

### Step 4: Backend Processes Registration

**Location**: `server/src/routes/arduino.ts`

**What happens**:
1. **Validate input**:
   - Check `device_pubkey` is provided
   - Verify `collection_mode` is "auto" or "manual"

2. **Register device** (`DeviceRegistryService`):
   - Add device to appropriate registry (auto or manual)
   - Generate Merkle tree leaf
   - Update Merkle root
   - Store in memory (or database in production)

3. **Return response**:
   ```json
   {
     "success": true,
     "registration": {
       "device_pubkey": "device_0x1234567890abcdef",
       "collection_mode": "auto",
       "registered_at": 1699808000000,
       "approved": true
     },
     "global_auto_collection_root": "abc123...",
     "global_manual_entry_root": "def456..."
   }
   ```

### Step 5: Frontend Updates UI

**What you see**:
- ✅ Green success box appears
- Device ID displayed
- Device pubkey shown
- Collection mode confirmed
- "Start Collecting" button enabled

## Collection Modes

### Auto Collection (`collection_mode: "auto"`)

**Purpose**: Automated sensor data collection (higher rewards)

**How it works**:
1. Arduino automatically sends data via BLE
2. Gateway receives and forwards to backend
3. Backend verifies device is in auto-collection registry
4. Data is signed and timestamped
5. ZK-proof generated for authenticity
6. Reward: **0.1 DUST** per verified reading

**Use case**: Farmers with BLE-enabled Arduino sensors

### Manual Entry (`collection_mode: "manual"`)

**Purpose**: Manual data input (lower rewards, testing/fallback)

**How it works**:
1. User manually enters sensor readings
2. Data submitted to backend
3. Backend verifies device is in manual-entry registry
4. Basic validation applied
5. Reward: **0.02 DUST** per verified reading

**Use case**: Testing, fallback when Arduino is unavailable

## Dual Merkle Tree System

### Why Two Trees?

**Problem**: Different collection modes need different verification and rewards.

**Solution**: Maintain separate Merkle trees:
- **Auto-Collection Tree**: For automated sensors (higher trust, higher rewards)
- **Manual-Entry Tree**: For manual inputs (lower trust, lower rewards)

### How It Works

```
Auto-Collection Registry          Manual-Entry Registry
├─ device_wallet1_001            ├─ device_wallet3_001
├─ device_wallet2_001            ├─ device_wallet4_001
└─ device_wallet2_002            └─ device_wallet5_001
       ↓                                ↓
   Merkle Tree                      Merkle Tree
       ↓                                ↓
Global Auto Root: abc123...     Global Manual Root: def456...
```

### Verification Process

When submitting a reading:
1. Device claims collection mode (auto or manual)
2. Backend checks appropriate Merkle root
3. Verifies device exists in claimed registry
4. Generates Merkle proof
5. Validates proof against global root
6. Awards appropriate reward amount

## What Happens After Registration

### 1. Device is Approved
- Device pubkey added to registry
- Merkle tree updated with new leaf
- Global root recalculated
- Device can now submit readings

### 2. You Can Start Collecting
**Auto-collection**:
```typescript
// Click "Start Collecting"
// Every 10 seconds:
POST /api/arduino/simulate
{
  "temperature": 25.3,
  "humidity": 68.5,
  "device_pubkey": "device_0x1234567890abcdef"
}
```

**Manual reading**:
```typescript
// Click "Manual Read"
// Single reading collected
```

### 3. Data is Stored Locally
```typescript
// localStorage: "arduino_sensor_data"
{
  sensorData: [
    { timestamp, temperature, humidity, source: "simulated" }
  ],
  averages: { temperature, humidity, readings },
  farmMetadata: { cropType, soilType, ... },
  timestamp: Date.now()
}
```

### 4. Ready for Training
- Minimum 5 readings required
- Click "Train FL Model" button
- Data converted to training format
- Navigate to FL training dashboard

## Current Implementation vs Production

### Current (Demo/Testing)
- **Device pubkey**: Derived from wallet address
- **Collection mode**: Hardcoded to "auto"
- **Data source**: Simulated via `/api/arduino/simulate`
- **Storage**: In-memory registry
- **Verification**: Mock ZK-proofs

### Production (Future)
- **Device pubkey**: From actual Arduino Ed25519 keypair
- **Collection mode**: User selects based on hardware
- **Data source**: Real Arduino via BLE gateway
- **Storage**: Persistent database (SQLite/PostgreSQL)
- **Verification**: Real ZK-proofs with Midnight SDK

## Testing Device Registration

### Test 1: Register via UI
1. Open https://edgechain-midnight.fly.dev/
2. Login with Midnight wallet
3. Navigate to Arduino IoT
4. Click "Register Arduino Device"
5. ✅ Should see green success box

### Test 2: Register via API
```bash
curl -X POST https://edgechain-midnight.fly.dev/api/arduino/registry/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_pubkey": "test_device_001",
    "collection_mode": "auto",
    "device_id": "ARDUINO_TEST",
    "metadata": {
      "owner": "0xtest",
      "location": "Test Farm"
    }
  }'
```

**Expected response**:
```json
{
  "success": true,
  "registration": {
    "device_pubkey": "test_device_001",
    "device_id": "ARDUINO_TEST",
    "registered_at": 1699808000000,
    "approved": true
  },
  "global_auto_collection_root": "abc123...",
  "global_manual_entry_root": "def456..."
}
```

### Test 3: Verify Device
```bash
curl -X POST https://edgechain-midnight.fly.dev/api/arduino/registry/check \
  -H "Content-Type: application/json" \
  -d '{"device_pubkey": "test_device_001"}'
```

**Expected response**:
```json
{
  "approved": true,
  "device_pubkey": "test_device_001"
}
```

### Test 4: Get Merkle Proof
```bash
curl -X POST https://edgechain-midnight.fly.dev/api/arduino/registry/proof \
  -H "Content-Type: application/json" \
  -d '{"device_pubkey": "test_device_001"}'
```

**Expected response**:
```json
{
  "merkle_proof": ["hash1", "hash2", "hash3"],
  "leaf_index": 0,
  "merkle_root": "abc123..."
}
```

## Device Registry Service

### Key Functions

#### `registerDevice(pubkey, mode, id, metadata)`
- Adds device to registry
- Updates Merkle tree
- Returns registration details

#### `isDeviceApproved(pubkey)`
- Checks if device exists in registry
- Returns boolean

#### `getMerkleProof(pubkey)`
- Generates Merkle proof for device
- Returns proof array, index, and root

#### `getStatus()`
- Returns current registry state
- Auto/manual device counts
- Global Merkle roots

#### `reset()`
- Clears all devices (demo purposes only)
- Resets Merkle trees

## Security Considerations

### Current (Demo)
- ⚠️ No cryptographic signing
- ⚠️ Device pubkey can be spoofed
- ⚠️ In-memory storage (lost on restart)
- ⚠️ Mock ZK-proofs

### Production Requirements
- ✅ Real Ed25519 signatures from Arduino
- ✅ Nonce-based replay protection
- ✅ Persistent storage
- ✅ Real ZK-proofs with Midnight SDK
- ✅ Rate limiting
- ✅ Device attestation

## Troubleshooting

### "device_pubkey required"
**Cause**: Request missing `device_pubkey` field
**Fix**: Ensure wallet is connected before registering

### "collection_mode must be 'auto' or 'manual'"
**Cause**: Invalid collection mode
**Fix**: Use only "auto" or "manual"

### "Device already registered"
**Cause**: Device pubkey already exists in registry
**Fix**: Use different device ID or reset registry (demo only)

### Registration succeeds but can't collect data
**Cause**: Device info not stored in frontend state
**Fix**: Check console for errors, ensure `setDeviceInfo()` is called

### Merkle root is all zeros
**Cause**: No devices registered yet
**Fix**: Register at least one device to generate valid root

## Next Steps

### Phase 1: Hardware Integration
- [ ] Connect real Arduino via BLE
- [ ] Implement Ed25519 signing on Arduino
- [ ] Add BLE gateway (Web Bluetooth API)
- [ ] Real-time data streaming

### Phase 2: Enhanced Security
- [ ] Implement device attestation
- [ ] Add rate limiting per device
- [ ] Enable replay protection with nonces
- [ ] Deploy real ZK-proof generation

### Phase 3: Production Deployment
- [ ] Migrate to persistent database
- [ ] Add device management UI
- [ ] Enable device deregistration
- [ ] Implement reward distribution

## Documentation References

- **Device Registry Service**: [server/src/services/deviceRegistry.ts](../server/src/services/deviceRegistry.ts)
- **Arduino Routes**: [server/src/routes/arduino.ts](../server/src/routes/arduino.ts)
- **Arduino Types**: [server/src/types/arduino.ts](../server/src/types/arduino.ts)
- **Integration Guide**: [ARDUINO_FL_INTEGRATION.md](./ARDUINO_FL_INTEGRATION.md)
- **Incentive Layer**: [INCENTIVE_LAYER_SUMMARY.md](./INCENTIVE_LAYER_SUMMARY.md)

---

**Summary**: Device registration creates a trusted link between your wallet, Arduino device, and the EdgeChain network, enabling verified data collection with privacy-preserving rewards.
