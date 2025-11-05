# Transaction Signing Implementation

## Overview

EdgeChain implements secure transaction signing using the Midnight wallet (Lace Midnight Preview) for all critical operations. This ensures authenticity, non-repudiation, and privacy-preserving verification of user actions.

---

## Supported Transaction Types

### 1. 🌾 Farmer Registration

**Purpose:** Sign and verify farmer profile data during registration

**Payload Structure:**
```typescript
{
  type: 'registration',
  payload: {
    name: string;           // Farm name (optional)
    region: string;         // Geographic region (optional)
    crops: string[];        // Primary crops (optional)
    privacyLevel: 'basic' | 'enhanced' | 'detailed';
    farmSize?: string;      // For detailed privacy level
    soilType?: string;      // For detailed privacy level
    irrigationType?: string;
    yearsExperience?: number;
  }
}
```

**Use Cases:**
- Verify farmer identity on-chain
- Prove registration timestamp
- Link profile to Midnight address
- Enable privacy-preserving reputation system

---

### 2. 🤖 Model Weight Submission

**Purpose:** Sign ML model weights before submitting to federated learning aggregator

**Payload Structure:**
```typescript
{
  type: 'model_submission',
  payload: {
    modelId: string;        // Unique model version identifier
    weights: object;        // Model parameters (can be encrypted)
    accuracy: number;       // Local model accuracy
    trainingRounds: number; // Number of local training iterations
    dataPoints: number;     // Size of training dataset
    privacyLevel: string;   // Level of privacy applied
  }
}
```

**Use Cases:**
- Prevent model poisoning attacks
- Verify contribution authenticity
- Track model provenance
- Enable reward distribution based on contributions
- Prove model was trained by legitimate farmer

**Privacy Features:**
- Weights can be encrypted before signing
- ZK-proof proves training occurred without revealing data
- Only hash of weights needs to be public

---

### 3. 🗳️ Voting on Predictions

**Purpose:** Sign votes on prediction accuracy to improve model quality

**Payload Structure:**
```typescript
{
  type: 'voting',
  payload: {
    predictionId: string;      // ID of prediction being voted on
    vote: 'accurate' | 'inaccurate' | 'partially_accurate';
    confidence: number;        // Voter's confidence (0-1)
    actualOutcome?: string;    // What actually happened
    comments?: string;         // Optional feedback
  }
}
```

**Use Cases:**
- Create ground truth dataset
- Identify bad models/predictions
- Reward accurate models
- Enable prediction market
- Improve model over time

**Privacy Features:**
- Vote is signed but can be submitted anonymously
- ZK-proof proves voter is legitimate farmer
- Prevents sybil attacks (one vote per farmer)

---

### 4. 💰 Claiming Rewards

**Purpose:** Sign reward claims for model contributions, accurate predictions, etc.

**Payload Structure:**
```typescript
{
  type: 'claim_rewards',
  payload: {
    rewardId: string;       // Unique reward identifier
    amount: number;         // Reward amount
    currency: string;       // 'tDUST' for testnet
    reason: string;         // Why reward is being claimed
    period: string;         // Time period for reward
    contributionProof?: string; // Optional proof of contribution
  }
}
```

**Use Cases:**
- Claim rewards for model contributions
- Claim rewards for accurate predictions
- Claim rewards for data quality
- Prove eligibility without revealing full history

**Privacy Features:**
- Can prove contribution without revealing all activities
- Amount can be private
- ZK-proof verifies eligibility

---

## Implementation Details

### Architecture

```
User Action → Transaction Data → Midnight Wallet Signature →
Backend Verification → On-Chain Recording
```

### Transaction Flow

1. **Prepare Transaction**
   ```typescript
   const txData: TransactionData = {
     type: 'registration',
     payload: { /* data */ }
   };
   ```

2. **Sign with Wallet**
   ```typescript
   const signedTx = await signTransaction(txData);
   // Returns: { signature, txHash, timestamp }
   ```

3. **Submit to Backend**
   ```typescript
   await fetch('/api/endpoint', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       ...txData,
       signature: signedTx.signature,
       txHash: signedTx.txHash,
     }),
   });
   ```

4. **Backend Verifies Signature**
   - Extract public key from signature
   - Verify signature matches payload
   - Check signature is from registered Midnight address
   - Verify timestamp is recent (prevent replay attacks)

5. **Record on Midnight Blockchain**
   - Store transaction hash on-chain
   - Link to farmer's Midnight address
   - Enable future verification

---

## Code Examples

### Basic Usage

```typescript
import { useWallet } from './providers/WalletProvider';

function MyComponent() {
  const { signTransaction } = useWallet();

  const handleRegister = async () => {
    const txData = {
      type: 'registration',
      payload: {
        name: 'My Farm',
        region: 'California',
        crops: ['Wheat'],
        privacyLevel: 'enhanced',
      },
    };

    try {
      const signedTx = await signTransaction(txData);
      console.log('Signed!', signedTx.txHash);

      // Submit to backend
      await submitToBackend(txData, signedTx);
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  return <button onClick={handleRegister}>Register</button>;
}
```

### Advanced Usage with Error Handling

```typescript
async function signAndSubmit<T>(
  txData: TransactionData,
  onSuccess: (result: T) => void,
  onError: (error: Error) => void
) {
  try {
    // 1. Sign transaction
    const signedTx = await signTransaction(txData);

    // 2. Submit to backend
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...txData,
        signature: signedTx.signature,
        txHash: signedTx.txHash,
        timestamp: signedTx.timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    // 3. Success callback
    onSuccess(result);

  } catch (error) {
    console.error('Transaction failed:', error);
    onError(error as Error);
  }
}
```

### Batch Signing

```typescript
async function signMultipleTransactions(
  transactions: TransactionData[]
): Promise<SignedTransaction[]> {
  const signed: SignedTransaction[] = [];

  for (const tx of transactions) {
    try {
      const signedTx = await signTransaction(tx);
      signed.push(signedTx);
    } catch (error) {
      console.error(`Failed to sign ${tx.type}:`, error);
      // Continue with other transactions
    }
  }

  return signed;
}
```

---

## Security Features

### 1. **Non-Repudiation**

Once signed, a farmer cannot deny they performed an action:
- Signature cryptographically proves ownership
- Timestamp prevents backdating
- Transaction hash provides immutable record

### 2. **Replay Attack Prevention**

Each transaction includes:
- Timestamp: Must be recent (e.g., within 5 minutes)
- Nonce: Unique per transaction
- Address: Tied to specific Midnight wallet

### 3. **Privacy Preservation**

Midnight's ZK-proofs enable:
- Prove transaction validity without revealing payload
- Selective disclosure of attributes
- Private smart contract execution
- Shielded addresses

### 4. **Signature Verification**

Backend verifies:
```typescript
function verifySignature(
  signature: string,
  message: string,
  expectedAddress: string
): boolean {
  // 1. Recover public key from signature
  const publicKey = recoverPublicKey(signature, message);

  // 2. Derive address from public key
  const derivedAddress = deriveAddress(publicKey);

  // 3. Check if matches expected address
  return derivedAddress === expectedAddress;
}
```

---

## Integration with Midnight Features

### Zero-Knowledge Proofs

Transaction signing leverages Midnight's ZK capabilities:

1. **Private Voting**
   - Prove you're a farmer without revealing which farmer
   - Vote is counted but identity stays private
   - Prevents vote buying/coercion

2. **Private Model Submission**
   - Prove model was trained without revealing data
   - Submit encrypted weights
   - ZK-SNARK proves correctness

3. **Private Reward Claims**
   - Prove eligibility without revealing all contributions
   - Claim rewards privately
   - Amount can be shielded

### Shielded Transactions

```typescript
// Public transaction (default)
const publicTx = await signTransaction({
  type: 'registration',
  payload: { /* public data */ }
});

// Shielded transaction (private)
const shieldedTx = await signTransaction({
  type: 'registration',
  payload: {
    ...data,
    _shielded: true,  // Flag for private tx
  }
});
```

---

## Testing

### Test Suite

```typescript
describe('Transaction Signing', () => {
  it('should sign farmer registration', async () => {
    const txData = {
      type: 'registration',
      payload: { name: 'Test Farm' }
    };

    const signed = await signTransaction(txData);

    expect(signed.signature).toBeDefined();
    expect(signed.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(signed.timestamp).toBeGreaterThan(Date.now() - 1000);
  });

  it('should reject invalid transaction type', async () => {
    const txData = {
      type: 'invalid_type',
      payload: {}
    };

    await expect(signTransaction(txData))
      .rejects.toThrow('Invalid transaction type');
  });

  it('should include wallet address in signature', async () => {
    const txData = {
      type: 'registration',
      payload: { name: 'Test' }
    };

    const signed = await signTransaction(txData);
    const recovered = recoverAddress(signed.signature);

    expect(recovered).toBe(walletAddress);
  });
});
```

---

## Roadmap

### Phase 1: Basic Signing ✅
- [x] Farmer registration
- [x] Model weight submission
- [x] Voting on predictions
- [x] Reward claims

### Phase 2: Advanced Features 🚧
- [ ] Batch transaction signing
- [ ] Transaction queueing
- [ ] Offline signing support
- [ ] Multi-sig support

### Phase 3: Privacy Enhancement 📋
- [ ] Fully shielded transactions
- [ ] Private smart contract integration
- [ ] ZK-SNARK proof generation
- [ ] Cohort-based signatures

### Phase 4: Optimization 📋
- [ ] Gas optimization
- [ ] Transaction bundling
- [ ] Signature caching
- [ ] WebAssembly acceleration

---

## Best Practices

### 1. Always Validate Before Signing

```typescript
function validatePayload(payload: any): boolean {
  // Check required fields
  // Validate data types
  // Sanitize inputs
  return true;
}

async function safeSignTransaction(txData: TransactionData) {
  if (!validatePayload(txData.payload)) {
    throw new Error('Invalid payload');
  }
  return await signTransaction(txData);
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  const signed = await signTransaction(txData);
  // Success path
} catch (error) {
  if (error.message.includes('User denied')) {
    // User rejected signing
    showUserMessage('Transaction cancelled');
  } else if (error.message.includes('not connected')) {
    // Wallet not connected
    showConnectWalletPrompt();
  } else {
    // Other errors
    logError(error);
    showErrorMessage('Failed to sign transaction');
  }
}
```

### 3. Store Signatures Securely

- Never log full signatures in production
- Store transaction hashes for verification
- Keep payload and signature together
- Use secure backend storage

### 4. Implement Retry Logic

```typescript
async function signWithRetry(
  txData: TransactionData,
  maxRetries = 3
): Promise<SignedTransaction> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await signTransaction(txData);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Troubleshooting

### Issue: "Wallet not connected"

**Solution:** Ensure wallet is connected before signing
```typescript
const { isConnected, connectWallet } = useWallet();

if (!isConnected) {
  await connectWallet();
}
```

### Issue: "signData is not a function"

**Solution:** Update Lace Midnight Preview to latest version
- Fallback signing will be used automatically
- Check console for warnings

### Issue: "Transaction expired"

**Solution:** Timestamp validation failed
- Ensure system clock is accurate
- Reduce server-side timestamp tolerance
- Sign and submit immediately

---

## Resources

- [Midnight Network Documentation](https://docs.midnight.network/)
- [Lace Wallet Documentation](https://www.lace.io/docs)
- [Zero-Knowledge Proof Basics](https://ethereum.org/en/zero-knowledge-proofs/)
- [Transaction Signing Examples](./packages/ui/src/examples/TransactionSigningExample.tsx)
- [WalletProvider Source](./packages/ui/src/providers/WalletProvider.tsx)

---

## Summary

Transaction signing in EdgeChain provides:

✅ **Authenticity** - Cryptographically prove actions
✅ **Privacy** - ZK-proofs hide sensitive data
✅ **Security** - Prevent forgery and replay attacks
✅ **Auditability** - Immutable transaction records
✅ **Flexibility** - Support multiple transaction types

This creates a secure foundation for privacy-preserving federated learning with user-controlled data sovereignty.
