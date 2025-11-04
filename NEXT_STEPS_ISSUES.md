# EdgeChain - Development Issues for Next Steps

This document contains 5 prioritized issues for completing the EdgeChain implementation. Each issue is formatted for easy copy-paste into GitHub Issues.

---

## Issue #1: Integrate Lace Wallet Connection

**Priority**: High
**Labels**: `frontend`, `wallet`, `integration`, `blockchain`
**Estimated Effort**: 3-5 days

### Description

Replace the mock wallet connection in the UI with real Lace wallet integration for Midnight Network. Currently, the app simulates wallet connection using localStorage. We need to implement actual wallet connectivity.

### Current State

- Mock wallet connection generates fake addresses: `packages/ui/src/App.tsx:72-75`
- Simulated wallet object stored in React state
- No real transaction signing capability

### Requirements

1. **Install Lace SDK**
   - Add `@lace-io/wallet` or appropriate Midnight wallet connector to `packages/ui/package.json`
   - Review Midnight Network documentation for correct wallet library

2. **Implement Wallet Provider**
   - Create `packages/ui/src/providers/WalletProvider.tsx`
   - Handle wallet detection (check if Lace is installed)
   - Manage wallet connection state globally
   - Handle wallet disconnection and account changes

3. **Update Login Screen**
   - Replace mock connection in `packages/ui/src/App.tsx` (line 71-75)
   - Add real Lace wallet connection flow
   - Display proper error messages if wallet not found
   - Show wallet installation instructions if needed

4. **Transaction Signing**
   - Implement transaction signing for:
     - Farmer registration
     - Model weight submission
     - Voting on predictions
     - Claiming rewards

5. **Network Configuration**
   - Support testnet/mainnet switching
   - Display current network in UI
   - Warn users if on wrong network

### Acceptance Criteria

- [ ] Users can connect their actual Lace wallet
- [ ] App detects if Lace is not installed
- [ ] Wallet address displays correctly in UI
- [ ] Users can disconnect wallet
- [ ] App handles account switching
- [ ] Transactions require wallet signature
- [ ] Network (testnet/mainnet) is displayed
- [ ] No console errors during connection flow

### Technical Resources

- [Midnight Wallet Integration Docs](https://docs.midnight.network/wallet/lace/)
- [Lace Developer Docs](https://www.lace.io/developers)
- Existing wallet hooks pattern: `packages/ui/src/hookes/` (note: typo in folder name)

### Related Files

- `packages/ui/src/App.tsx` - Main app logic
- `packages/ui/src/providers/` - Provider pattern directory
- `packages/ui/src/hookes/` - Custom hooks directory

---

## Issue #2: Connect to Midnight Smart Contracts

**Priority**: High
**Labels**: `smart-contracts`, `backend`, `blockchain`, `integration`
**Estimated Effort**: 5-7 days

### Description

Integrate the UI and backend with deployed Midnight smart contracts written in Compact. Currently, all contract interactions are simulated. We need to connect to real on-chain state and circuits.

### Current State

- Smart contract code exists in `packages/contract/src/edgechain.compact`
- No deployment scripts configured
- UI simulates all contract calls
- No real ZK-proof generation

### Requirements

#### 1. Contract Deployment Setup

- [ ] Configure deployment scripts in `packages/contract/`
- [ ] Deploy contract to Midnight testnet
- [ ] Document contract addresses
- [ ] Create deployment guide for mainnet

#### 2. Contract Interface Layer

Create `packages/api/src/services/blockchain.ts`:

```typescript
interface EdgeChainContract {
  // Farmer operations
  registerFarmer(proof: ZKProof): Promise<TxHash>;
  submitWeights(weights: EncryptedWeights, proof: ZKProof): Promise<TxHash>;

  // Aggregator operations
  registerAggregator(): Promise<TxHash>;
  submitAggregation(result: AggregationResult): Promise<TxHash>;

  // Voting operations
  voteOnPrediction(predictionId: string, vote: boolean, proof: ZKProof): Promise<TxHash>;

  // Reward operations
  claimRewards(): Promise<TxHash>;

  // Query operations
  getCurrentRound(): Promise<number>;
  getModelVersion(): Promise<number>;
  getAggregatorInfo(address: string): Promise<AggregatorInfo>;
  getSubmissions(round: number): Promise<Submission[]>;
}
```

#### 3. Update Frontend to Use Contracts

Replace simulated calls in `packages/ui/src/App.tsx`:

- Line 108-114: `submitUpdate()` should call real contract
- Line 39-44: Fetch real round/version from chain
- Registration flow should submit on-chain

#### 4. ZK-Proof Generation

- Implement proof generation for weight submissions
- Use Midnight's ZK parameters (already downloaded via `fetch-zk-params.sh`)
- Create proof verification in circuits
- Handle proof serialization/deserialization

#### 5. Event Listening

- Listen for contract events:
  - `WeightsSubmitted`
  - `AggregationComplete`
  - `VoteRecorded`
  - `RewardsClaimed`
- Update UI state when events occur
- Show real-time notifications

### Acceptance Criteria

- [ ] Contract deployed to Midnight testnet
- [ ] Contract address documented in `.env` files
- [ ] Farmer registration writes to chain
- [ ] Weight submission generates real ZK-proofs
- [ ] UI displays real round/version from chain
- [ ] Aggregation state reads from contract
- [ ] Event listeners update UI in real-time
- [ ] All transactions show in Midnight explorer
- [ ] Error handling for failed transactions

### Technical Resources

- Contract code: `packages/contract/src/edgechain.compact`
- ZK parameters location: `packages/cli/` (via `fetch-zk-params.sh`)
- [Midnight Smart Contract Docs](https://docs.midnight.network/develop/reference/compact/)
- [Compact Language Guide](https://docs.midnight.network/develop/reference/compact/)

### Dependencies

- Requires Issue #1 (Lace Wallet) for transaction signing

---

## Issue #3: Implement Actual ML Training Logic

**Priority**: Medium
**Labels**: `machine-learning`, `federated-learning`, `backend`
**Estimated Effort**: 7-10 days

### Description

Replace simulated ML training with real federated learning implementation. Currently, model training, weight aggregation, and predictions are all mocked. We need to implement actual TensorFlow.js-based local training and federated averaging.

### Current State

- No real ML model exists
- Training/aggregation buttons are UI-only
- Predictions use hardcoded responses
- No model download/upload functionality

### Requirements

#### 1. Model Architecture

Create `packages/api/src/services/ml.ts`:

```typescript
interface CropPredictionModel {
  // Model structure
  layers: LayerConfig[];
  weights: Float32Array;
  version: number;

  // Training
  train(localData: FarmData[]): Promise<Weights>;

  // Inference
  predict(input: CropInput): Promise<CropPrediction>;

  // Serialization
  serialize(): Uint8Array;
  deserialize(data: Uint8Array): void;
}

interface FarmData {
  rainfall: number;
  soilType: string;
  temperature: number;
  cropType: string;
  yield: number; // actual harvest result
}

interface CropPrediction {
  expectedYield: number;
  confidence: number;
  plantingDate: Date;
  estimatedCost: number;
}
```

#### 2. Client-Side Training (Browser)

Update `packages/ui/src/lib/ml-training.ts`:

- [ ] Implement TensorFlow.js model loading
- [ ] Create local training function (runs in browser)
- [ ] Generate synthetic farm data for demo
- [ ] Extract and encrypt model weights
- [ ] Show training progress in UI
- [ ] Handle training errors gracefully

#### 3. Federated Averaging Algorithm

Create `packages/api/src/services/aggregation.ts`:

```typescript
interface FederatedAveraging {
  // Core FedAvg algorithm
  aggregate(submissions: WeightSubmission[]): Promise<AggregatedWeights>;

  // Weighted by accuracy
  weightedAverage(weights: Weights[], accuracies: number[]): Weights;

  // Validation
  validateSubmission(submission: WeightSubmission): boolean;
}
```

Implementation details:
- Weight submissions from multiple farmers
- Accuracy-weighted averaging (farmers with better historical accuracy have more influence)
- Outlier detection (reject malicious submissions)
- Differential privacy (add noise to protect individual contributions)

#### 4. Model Serving for Predictions

Create inference service in `packages/api/src/services/inference.ts`:

- [ ] Load latest aggregated model
- [ ] Parse SMS prediction requests
- [ ] Run model inference
- [ ] Format prediction response
- [ ] Cache predictions for performance

#### 5. Model Versioning & Storage

- [ ] Store model versions on IPFS or Midnight-compatible storage
- [ ] Track model version on-chain
- [ ] Download model by version
- [ ] Rollback to previous version if needed

### Acceptance Criteria

- [ ] Users can download a real ML model in browser
- [ ] Training runs locally using TensorFlow.js
- [ ] Weight extraction works correctly
- [ ] Federated averaging combines multiple submissions
- [ ] New model version produces valid predictions
- [ ] SMS predictions return real ML inference results
- [ ] Model versions are tracked on-chain
- [ ] Training progress shows in UI
- [ ] Predictions are accurate for demo data

### Technical Resources

- TensorFlow.js: https://www.tensorflow.js.org/
- Federated Learning algorithm: https://arxiv.org/abs/1602.05629
- Existing placeholder: `packages/ui/src/lib/ml-training.ts`
- Model architecture inspiration: Simple regression or small neural network

### Data Sources for Demo

- Synthetic farm data generator
- Historical crop yield datasets (Kaggle, USDA)
- Weather data APIs

### Dependencies

- Can be developed in parallel with other issues
- Integration with Issue #2 for on-chain model versioning

---

## Issue #4: Build Backend API Endpoints

**Priority**: High
**Labels**: `backend`, `api`, `infrastructure`
**Estimated Effort**: 5-7 days

### Description

Implement the backend API server to handle SMS requests, coordinate federated learning rounds, and serve as middleware between the UI and blockchain. Currently, the backend structure exists but endpoints are not implemented.

### Current State

- Directory structure exists: `packages/api/src/`
- Route files are placeholders
- No actual Express server running
- No API documentation

### Requirements

#### 1. API Server Setup

Update `packages/api/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { trainingRouter } from './routes/training';
import { submissionRouter } from './routes/submission';
import { aggregationRouter } from './routes/aggregation';
import { votingRouter } from './routes/voting';
import { rewardsRouter } from './routes/rewards';
import { smsRouter } from './routes/sms';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/training', trainingRouter);
app.use('/api/submission', submissionRouter);
app.use('/api/aggregation', aggregationRouter);
app.use('/api/voting', votingRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/sms', smsRouter);

app.listen(3000, () => console.log('API running on port 3000'));
```

#### 2. Training Endpoints

Implement `packages/api/src/routes/training.ts`:

```
GET  /api/training/model/:version
     → Download model for local training

POST /api/training/start
     → Initialize new training round

GET  /api/training/status/:address
     → Get training status for farmer
```

#### 3. Submission Endpoints

Implement `packages/api/src/routes/submission.ts`:

```
POST /api/submission/weights
     Body: { weights: EncryptedWeights, proof: ZKProof, address: string }
     → Submit trained weights

GET  /api/submission/list/:round
     → Get all submissions for a round

GET  /api/submission/verify/:submissionId
     → Verify ZK-proof for submission
```

#### 4. Aggregation Endpoints

Implement `packages/api/src/routes/aggregation.ts`:

```
POST /api/aggregation/trigger/:round
     → Trigger aggregation (admin/automated)

GET  /api/aggregation/status/:round
     → Get aggregation progress

GET  /api/aggregation/result/:round
     → Get aggregated model
```

#### 5. Voting Endpoints

Implement `packages/api/src/routes/voting.ts`:

```
POST /api/voting/vote
     Body: { predictionId: string, vote: boolean, proof: ZKProof }
     → Submit vote on prediction accuracy

GET  /api/voting/results/:predictionId
     → Get voting results

GET  /api/voting/history/:address
     → Get farmer's voting history
```

#### 6. Rewards Endpoints

Implement `packages/api/src/routes/rewards.ts`:

```
GET  /api/rewards/balance/:address
     → Get token balance

POST /api/rewards/claim
     Body: { address: string, proof: ZKProof }
     → Claim pending rewards

GET  /api/rewards/history/:address
     → Get reward claim history
```

#### 7. SMS Endpoints (for bot)

Implement `packages/api/src/routes/sms.ts`:

```
POST /api/sms/webhook
     Body: { from: string, body: string }
     → Receive SMS from Twilio/similar

POST /api/sms/predict
     Body: { phoneNumber: string, input: CropInput }
     → Process prediction request

POST /api/sms/vote
     Body: { phoneNumber: string, predictionId: string, vote: boolean }
     → Process vote via SMS
```

#### 8. Database/Storage Layer

- [ ] Choose database (PostgreSQL, MongoDB, or SQLite for MVP)
- [ ] Create schema for:
  - Farmers
  - Training rounds
  - Submissions
  - Predictions
  - Votes
  - Rewards
- [ ] Set up connection pooling
- [ ] Add database migrations

#### 9. Authentication & Security

- [ ] Verify wallet signatures for all authenticated endpoints
- [ ] Rate limiting (especially for SMS endpoints)
- [ ] Input validation (use Zod or Joi)
- [ ] CORS configuration for production
- [ ] API key for SMS webhook

### Acceptance Criteria

- [ ] API server runs on port 3000
- [ ] All endpoints documented (Swagger/OpenAPI)
- [ ] Endpoints connect to Midnight contracts
- [ ] Database stores necessary state
- [ ] Authentication works for protected routes
- [ ] Rate limiting prevents abuse
- [ ] Error responses follow consistent format
- [ ] API tested with Postman/curl
- [ ] Frontend successfully calls all endpoints
- [ ] Docker-compose includes API service

### Technical Resources

- Express.js: https://expressjs.com/
- Existing route files: `packages/api/src/routes/`
- Service layer: `packages/api/src/services/`

### Environment Variables

Create `packages/api/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://localhost:5432/edgechain
MIDNIGHT_RPC_URL=https://rpc.testnet.midnight.network
CONTRACT_ADDRESS=0x...
SMS_API_KEY=...
JWT_SECRET=...
```

### Dependencies

- Requires Issue #2 (Smart Contracts) for blockchain interactions
- Requires Issue #3 (ML Logic) for predictions

---

## Issue #5: Deploy SMS Bot Infrastructure

**Priority**: Medium
**Labels**: `sms`, `infrastructure`, `bot`, `deployment`
**Estimated Effort**: 4-6 days

### Description

Build and deploy the SMS prediction bot that allows farmers to get crop predictions via simple text messages. This is a core feature for accessibility—farmers without smartphones can still use the system.

### Current State

- CLI structure exists: `packages/cli/src/`
- SMS handler files are placeholders
- No SMS provider integration
- No deployment configuration

### Requirements

#### 1. SMS Provider Integration

Choose and integrate SMS provider (recommend **Twilio** or **Africa's Talking**):

Create `packages/cli/src/sms/provider.ts`:

```typescript
interface SMSProvider {
  sendMessage(to: string, message: string): Promise<void>;
  receiveWebhook(req: Request): SMSMessage;
}

interface SMSMessage {
  from: string;
  to: string;
  body: string;
  timestamp: Date;
}
```

Setup steps:
- [ ] Create Twilio account (or Africa's Talking for African farmers)
- [ ] Purchase phone number
- [ ] Configure webhook URL
- [ ] Set up authentication (API keys)

#### 2. SMS Command Parser

Implement `packages/cli/src/sms/handler.ts`:

```typescript
interface CommandParser {
  parse(message: string): Command;
}

type Command =
  | { type: 'PREDICT', crop: string, params: CropInput }
  | { type: 'VOTE', predictionId: string, vote: boolean }
  | { type: 'BALANCE' }
  | { type: 'HELP' }
  | { type: 'UNKNOWN' };

// Example commands:
// "PREDICT maize rainfall:720 soil:loamy temp:22"
// "VOTE YES pred_12345"
// "BALANCE"
// "HELP"
```

#### 3. Inference Service

Implement `packages/cli/src/sms/inference.ts`:

```typescript
interface InferenceService {
  // Load latest model from API/IPFS
  loadModel(version: number): Promise<Model>;

  // Run prediction
  predict(input: CropInput): Promise<CropPrediction>;

  // Cache for performance
  cache: Map<string, CropPrediction>;
}
```

#### 4. Response Formatter

Create `packages/cli/src/sms/responses.ts`:

```typescript
interface ResponseFormatter {
  formatPrediction(prediction: CropPrediction): string;
  formatVoteConfirmation(vote: Vote): string;
  formatBalance(balance: number): string;
  formatHelp(): string;
  formatError(error: string): string;
}

// Example responses:
// "Prediction for Maize:
//  Yield: 4.1 tons/hectare
//  Confidence: 84%
//  Best Planting: Apr 25, 2024
//  Cost: $0.10
//  Reply VOTE YES/NO after harvest!"
```

Considerations:
- Keep messages under 160 characters when possible (standard SMS)
- Support multi-part messages for detailed predictions
- Use simple language (low literacy)
- Include emoji for visual clarity (if supported)

#### 5. Phone Number → Wallet Mapping

Create database schema for linking phone numbers to wallets:

```sql
CREATE TABLE phone_wallets (
  phone_number VARCHAR(20) PRIMARY KEY,
  wallet_address VARCHAR(100) NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE
);
```

Registration flow via SMS:
```
Farmer: "REGISTER addr1qyx..."
Bot: "✓ Wallet linked! Reply PREDICT to get started."
```

#### 6. Webhook Server

Implement `packages/cli/src/sms/webhook.ts`:

```typescript
import express from 'express';
import { handleIncomingSMS } from './handler';

const app = express();

app.post('/sms/webhook', async (req, res) => {
  const message = extractMessageFromProvider(req.body);
  const response = await handleIncomingSMS(message);

  // Respond in provider's expected format
  res.type('text/xml');
  res.send(formatTwilioResponse(response));
});

app.listen(4000);
```

#### 7. Deployment Configuration

- [ ] Dockerize SMS bot (`packages/cli/Dockerfile`)
- [ ] Deploy to cloud (AWS, GCP, or DigitalOcean)
- [ ] Set up HTTPS endpoint for webhook
- [ ] Configure environment variables
- [ ] Set up logging (CloudWatch, Datadog)
- [ ] Add health check endpoint

#### 8. Cost Management

- [ ] Implement payment tracking (predictions cost $0.10)
- [ ] Deduct from user balance
- [ ] Send low balance warnings
- [ ] Payment via wallet or mobile money

#### 9. Testing

Create `packages/cli/src/sms/__tests__/`:

- [ ] Unit tests for command parser
- [ ] Unit tests for response formatter
- [ ] Integration test with mock SMS provider
- [ ] End-to-end test with real phone number

### Acceptance Criteria

- [ ] SMS webhook receives messages from Twilio
- [ ] Command parser handles all command types
- [ ] PREDICT command returns real ML prediction
- [ ] VOTE command records vote on-chain
- [ ] BALANCE command shows token balance
- [ ] HELP command explains available commands
- [ ] Responses are clear and concise
- [ ] Phone numbers map to wallet addresses
- [ ] SMS bot is deployed and publicly accessible
- [ ] Webhook URL is configured in Twilio dashboard
- [ ] Rate limiting prevents spam
- [ ] Costs are tracked and deducted
- [ ] Error handling for invalid commands

### Technical Resources

- Twilio SMS Docs: https://www.twilio.com/docs/sms
- Africa's Talking: https://africastalking.com/sms
- Existing SMS structure: `packages/cli/src/sms/`
- Webhook handling examples: Twilio Node.js SDK

### Environment Variables

Create `packages/cli/.env`:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
WEBHOOK_PORT=4000
API_URL=http://localhost:3000
```

### Cost Estimates

- Twilio SMS: ~$0.0075 per message (send + receive)
- Phone number rental: ~$1/month
- Server hosting: ~$5-10/month (small VPS)

**Target**: Keep prediction cost at $0.10, with ~$0.08 going to farmers/aggregators as rewards.

### Dependencies

- Requires Issue #3 (ML Logic) for predictions
- Requires Issue #4 (Backend API) for state management
- Requires Issue #2 (Smart Contracts) for on-chain votes

---

## Additional Recommendations

### Issue #6: Integration Testing & E2E Tests (Suggested)

Once issues 1-5 are complete, create comprehensive integration tests:

- Wallet → Contract → API → UI flow
- SMS → API → ML → SMS response flow
- Full federated learning round (submit → aggregate → new model)

### Issue #7: Documentation & Developer Onboarding (Suggested)

- API documentation (Swagger/Postman collection)
- Smart contract documentation
- Deployment guides
- Architecture diagrams

### Issue #8: Production Hardening (Suggested)

- Error monitoring (Sentry)
- Performance monitoring (Datadog, New Relic)
- Load testing
- Security audit
- Penetration testing

---

## Priority Order for Development

Based on dependencies and impact:

1. **Issue #1** (Wallet) + **Issue #2** (Contracts) → Can be done in parallel
2. **Issue #4** (Backend API) → Depends on 1 & 2
3. **Issue #3** (ML Logic) → Can start in parallel, integrates with 4
4. **Issue #5** (SMS Bot) → Depends on 3 & 4

---

## Questions for Product Owner

Before starting development, clarify:

1. **Target Network**: Midnight testnet or mainnet for initial deployment?
2. **Geographic Focus**: Which region/country for SMS (affects provider choice)?
3. **Budget**: SMS costs, infrastructure costs?
4. **Timeline**: Hard deadline for hackathon submission?
5. **MVP Scope**: Are all 5 issues required, or can we defer some?

---

## Getting Started

For developers picking up these issues:

1. Read the [README.md](README.md) for project overview
2. Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for current UI state
3. Check [docs/user_stories.html](docs/user_stories.html) for user flows
4. Set up local environment:
   ```bash
   git clone <repo>
   cd edgechain-midnight-hackathon
   yarn install
   yarn build:all
   ```

5. Join the team communication channel (Discord/Slack)
6. Ask questions early and often!

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Author**: EdgeChain Team
