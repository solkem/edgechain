# Verifiable Edge AI: Moving Beyond Identity to Validity

## Context
EdgeChain currently leverages the Midnight Network to solve the **Identity** and **Privacy** problems in decentralized IoT. By using Zero-Knowledge (ZK) proofs, we successfully prove that a device belongs to a trusted anonymity set without revealing which specific device it is. This prevents tracking and enables privacy-preserving Federated Learning.

However, a critical challenge remains in decentralized AI networks: **Data Integrity**. While we can prove *who* sent the data (a valid member), we currently trust the client to be honest about *what* data they are sending or *how* they trained the model.

## The Challenge: The "Lazy Worker" Problem
In a decentralized Federated Learning network, a malicious or "lazy" node can:
1.  **Poison the Model:** Submit random weights or adversarial updates to degrade the global model.
2.  **Fake the Work:** Submit copied weights from a previous round to claim rewards without expending compute power.
3.  **Spoof Data:** Submit physically impossible sensor readings (e.g., 200°C soil temp) to skew agricultural predictions.

## The Solution: ZK Proofs of Validity

Implementing a full "Proof of Training" (proving the entire backpropagation process in ZK) is computationally prohibitive for IoT devices today. However, we can implement two lightweight cryptographic checks that significantly harden the network: **Proof of Data Validity** and **Proof of Inference**.

### 1. Proof of Data Validity (Range & Consistency Checks)
Instead of just proving membership, the ZK circuit in `arduino-iot.compact` can be expanded to enforce physical constraints on the private sensor data *before* it is accepted.

**Implementation Strategy:**
The ZK circuit accepts private sensor readings as witnesses and asserts:
*   **Range Check:** `assert(temp > -20 && temp < 60)`
*   **Delta Check:** `assert(abs(current_reading - last_reading) < max_change)`
*   **Consistency:** `assert(humidity <= 100)`

**Benefit:** This filters out sensor glitches and obvious spoofing attacks at the cryptographic level. Invalid data literally cannot generate a valid proof, so it never touches the blockchain.

### 2. Proof of Inference (Spot Checking)
To discourage "lazy workers" who submit fake model updates, we can implement a probabilistic "Spot Check" mechanism.

**Implementation Strategy:**
1.  **Commitment:** The farmer submits their local model update hash to the chain.
2.  **Challenge:** The smart contract deterministically selects a random "test vector" (a synthetic sensor input).
3.  **Response:** The farmer must provide the inference result $Y = Model(X_{test})$ and a ZK proof that $Y$ was computed using the committed model weights.

**Why this works:**
Since the test vector is random and unknown until after commitment, a farmer cannot pre-calculate the result. They must have the actual model loaded and running. While this doesn't prove they trained on *all* data, it proves they possess a functional model that matches their commitment.

## Roadmap: From "Trusted Identity" to "Trustless Compute"

| Phase | Feature | Status | Description |
|-------|---------|--------|-------------|
| **Phase 1** | **Proof of Identity** | ✅ Live | Device proves membership in Merkle tree (Anonymity Set). |
| **Phase 2** | **Proof of Validity** | 🚧 Next | Device proves sensor data is within physical bounds (Range Checks). |
| **Phase 3** | **Proof of Inference** | 🔮 Future | Device proves it ran the model correctly on a challenge input. |

## Conclusion
By moving from proving *identity* to proving *validity*, EdgeChain evolves from a privacy network into a **Verifiable Compute Network**. This ensures that the agricultural AI models we build are not just private, but also robust, accurate, and resistant to manipulation.
