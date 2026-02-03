# Msingi Project Reference Document

## Project Overview

**Msingi** (Swahili: *foundation*) is a research project enabling IoT devices to hold wallets, earn revenue, and transact anonymously on privacy-preserving blockchain infrastructure.

### Core Thesis
> "Anonymity requires device-held keys, and ZK-enforced spending policies make device wallets safe."

### One-Sentence Summary
Msingi enables IoT devices to hold wallets, earn revenue, and transact anonymously, because anonymity requires device-held keys, and ZK-enforced spending policies make it safe.

---

## Research Architecture

The project has evolved into a **two-paper architecture**:

| Paper | Focus | Target Venue | Key Contribution |
|-------|-------|--------------|------------------|
| **EdgeChain** | Anonymous attestation protocols | USENIX Security (systems) | Privacy layer, BRACE protocol |
| **Msingi** | Bounded autonomy & economic agency | Financial Cryptography (mechanism design) | Economic layer, ACR protocol |

### Why Two Papers?
- Original single paper conflated privacy infrastructure and economic mechanisms
- Separation allows targeting appropriate academic communities
- Each paper can stand alone while referencing the other

---

## Core Technical Insight

**The Anonymity-Payment Paradox:**
```
Device submits anonymous attestation → Anonymous ✓
Human wallet pays gas fee → Links to human identity ✗
```

The payment creates a side-channel that destroys anonymity. For device anonymity to hold, the device must transact from keys not linked to human identity. This is not a design preference—it is a logical requirement of the threat model.

**Solution: Bounded Autonomy**
- Devices hold their own wallets with ZK-enforced spending policies
- Owners define policy P (max spend, approved types, daily limits)
- Every transaction requires ZK proof that P(tx) = true
- Blockchain rejects non-compliant transactions regardless of valid signature

---

## System Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Midnight Network                                       │
│  - Dual-ledger blockchain with private contract state            │
│  - Halo2 proving system (BLS12-381 curves)                       │
│  - NIGHT-DUST tokenomics (zero marginal cost transactions)       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ ZK proofs
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Proof Server (Raspberry Pi 5)                          │
│  - Farmer-owned (critical for privacy)                           │
│  - Generates ZK proofs (devices too constrained)                 │
│  - Receives LoRa transmissions from devices                      │
│  - Cost: ~$110                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ LoRa (encrypted)
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: IoT Device                                             │
│  - ESP32-S3-WROOM-1 microcontroller                              │
│  - ATECC608B secure element (P-256 keys)                         │
│  - RYLR896 LoRa module                                           │
│  - Environmental sensors (BME280, soil)                          │
│  - Cost: ~$50                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Architecture Decision: Farmer-Owned Proof Servers

**Previous Design (Trusted Gateway):**
- Shared community gateways generated proofs
- **Fatal Flaw:** Gateways accessed device identity AND raw sensor data during proof generation
- Privacy guarantees completely undermined

**Current Design (Farmer-Owned Proof Server):**
- Each farmer owns their own Raspberry Pi 5 proof server
- Device identity and raw data never leave farmer's control
- Hardware cost increased (~$50 → ~$160 total) but privacy preserved
- **Principle:** Privacy cannot be compromised even for cost considerations

---

## Protocols

### BRACE (Blind Registration via Anonymous Commitment Enrollment)

**Purpose:** Anonymous device registration

**Protocol Flow:**
1. Device generates keypair (pk, sk) inside ATECC608B secure element
2. Device samples random blinding factor r
3. Device computes commitment C = H(pk || r)
4. Device transmits C to proof server (pk and r remain secret)
5. Proof server adds C to Merkle tree, publishes new root

**Attestation:**
- Device sends (data, signature, pk, r, Merkle path) to proof server
- Proof server generates ZK proof: "I know (pk, r, path) such that H(pk||r) is in the registered tree AND signature is valid"
- Chain verifies proof, records nullifier

### ACR (Anonymous Contribution Rewards)

**Purpose:** Payment for anonymous work via nullifier-based claim tickets

**Protocol Flow:**
1. Buyer posts bounty: "Pay R tokens for attestation satisfying predicate P"
2. Buyer deposits R tokens in escrow contract
3. Device computes nullifier N = H(device_secret || bounty_id || epoch)
4. Device generates ZK proof: "I am registered ∧ my value satisfies P ∧ N is correctly formed"
5. Proof server submits (proof, N) to bounty contract
6. Contract verifies proof, records N, marks bounty claimable against N
7. Device later proves: "I know secret such that N = H(secret || bounty_id || epoch)"
8. Contract releases R tokens to device's wallet

### IAR (Incentivized Anonymous Relay) - REMOVED FROM SCOPE

**Reason:** Agricultural sensors are stationary, not mobile. Simple reciprocal relay agreements or community-based trust relationships are more practical than sophisticated economic incentive structures for relay routing.

---

## Guarantees

### Privacy Guarantees (PG1-PG6) - Phase 1

| Label | Name | Meaning |
|-------|------|---------|
| PG1 | Device Anonymity | Can't identify which device submitted (1/N + negl(λ)) |
| PG2 | Unlinkability | Can't link submissions across time (epoch-based nullifiers) |
| PG3 | Data Confidentiality | Learn only predicate result, not raw value |
| PG4 | Replay Resistance | Can't resubmit same attestation (nullifier set) |
| PG5 | Metadata Protection | Proof server learns only timing window |
| PG6 | Key Secrecy | Can't extract key even with physical access (ATECC608B) |

### Economic Guarantees (EG1-EG4) - Phase 2

| Label | Name | Meaning |
|-------|------|---------|
| EG1 | Payment Integrity | Valid work paid; invalid work not paid |
| EG2 | Budget Compliance | Spending can't exceed policy bounds |
| EG3 | Relay Fairness | Paid iff message delivered |
| EG4 | Sybil Resistance | Fake registration is costly |

---

## Threat Model

### Privacy Adversaries

| Adversary | Capabilities | Objective |
|-----------|--------------|-----------|
| A_gov (Government) | ISP cooperation, telecom metadata, long-term analysis | Identify individuals for targeting |
| A_corp (Corporate) | Historical data purchase, public records correlation | Competitive intelligence, differential pricing |
| A_gw (Compromised Gateway) | Observe all traffic, timing analysis | May be coerced/bribed |

### Economic Adversaries

| Adversary | Behavior | Constraint |
|-----------|----------|------------|
| A_free (Freeloading) | Receive services without payment | Economic incentives |
| A_grief (Griefing) | Disrupt mechanisms, spam network | ZK proof costs |
| A_sybil (Sybil) | Register fake devices | Registration costs, ATECC608B requirement |

---

## Hardware

### Bill of Materials (Device Layer)

| Component | Function | Cost (USD) |
|-----------|----------|------------|
| ESP32-S3-WROOM-1 | Microcontroller | ~$8 |
| ATECC608B | Secure element | ~$2.50 |
| RYLR896 | LoRa transceiver | ~$6 |
| BME280 + soil sensor | Environmental sensing | ~$6 |
| Solar panel + battery | Power | ~$16 |
| Enclosure | Weather protection | ~$10 |
| **Device Total** | | **~$50** |

### Proof Server

| Component | Function | Cost (USD) |
|-----------|----------|------------|
| Raspberry Pi 5 / CM5 | Proof generation | ~$110 |

### Total Deployment Cost: ~$160 per farmer

### Key Hardware Constraint: Curve Compatibility

| Component | Supported Curves | Issue |
|-----------|------------------|-------|
| ATECC608B | P-256 only | Limited to NIST curves |
| Midnight Network | Pluto-Eris (BLS12-381) | Different curve family |

**Resolution:** Architectural separation—device signs with P-256, proof server handles curve translation during ZK proof generation.

---

## Midnight Network Integration

### Why Midnight?

1. **Private contract state:** Commitment trees stored in encrypted private state (adversaries cannot enumerate registered devices)
2. **Public verification:** Proofs verified publicly on-chain
3. **NIGHT-DUST tokenomics:** Zero marginal cost transactions
4. **Compact language:** TypeScript-based smart contracts
5. **Halo2 proving system:** Efficient ZK proofs

### NIGHT-DUST Tokenomics

| Token | Type | Function |
|-------|------|----------|
| NIGHT | Unshielded, transferable | Governance, block rewards, generates DUST |
| DUST | Shielded, non-transferable, decaying | Transaction fees (burned on use) |

**Key Property:** NIGHT generates DUST continuously. Holding NIGHT = ability to transact without per-transaction costs.

### Smart Contracts (487 LOC total)

| Contract | LOC | Function |
|----------|-----|----------|
| Registry | 89 | Device commitment Merkle tree (private state) |
| Attestation | 112 | ZK proof verification, nullifier tracking |
| Wallet | 156 | Device balances, ZK-policy enforcement |
| Bounty | 130 | ACR escrow, claim ticket verification |

---

## The Five Hypes (Common IoT-Blockchain Critiques)

| # | Critique | Msingi's Response |
|---|----------|-------------------|
| 1 | **Micropayment Paradox** | NIGHT-DUST tokenomics: zero marginal cost transactions |
| 2 | **Oracle Problem** | Honestly unsolved; focus on making deception economically expensive via spatial correlation |
| 3 | **Interoperability** | Midnight's Partner-Chains framework, BLS12-381 compatibility |
| 4 | **Regulatory/Legal Vacuum** | DUST is non-transferable (addresses privacy coin concerns); selective disclosure |
| 5 | **Solution Seeking Problem** | Real deployment in Zimbabwe with identified farmers and concrete use case |

---

## Deployment

### Target Region
- Zimbabwe's Manicaland Province
- Agricultural IoT (soil moisture, temperature sensors)
- Addressing surveillance risks for farmers

### Pilot Results (March-August 2025)
- 47 devices across 3 villages
- 94.2% submission success rate
- Average mesh relay: 340m
- Maximum gateway distance: 2.1km
- Average submission latency: 8.3 minutes

### Qualitative Feedback
> "My yield data stays private from the cooperative chairman"
> "The sensor could pay for its own connectivity"

---

## Project Status

### Current State
- **Waiting for reviews** of academic papers and vision documents
- Hardware validation in progress (ESP32-S3 + ATECC608B wiring/testing)
- IAR protocol removed from scope (stationary sensors don't need mobile relay incentives)

### Open Work
- G1 anonymity game security proofs
- TypeScript interfaces and ZK circuit structures
- Edge cases: key rotation, commitment collisions
- BRACE ↔ ACR integration points

### Co-Author Needs

| Area | Open Questions |
|------|----------------|
| Incentive Design | Nash equilibrium proofs, collusion resistance |
| Security Proofs | Full security games for PG1, EG1 |
| Economic Modeling | ACR market dynamics, bounty pricing, Sybil cost analysis |
| Related Work | Positioning vs. multi-agent systems, mechanism design |
| Broader Impact | Development economics implications, policy |

---

## Key Definitions

**Bounded Autonomy:** Devices that can spend autonomously within cryptographically-enforced policy constraints. The "bound" is the owner-defined spending policy P that limits device transactions, with compliance enforced through ZK proofs rather than trust.

**Anonymous Attestation Market:** A market where buyers post bounties for data meeting predicates (e.g., "temperature < 4°C") and sellers (devices) respond anonymously. Neither party learns the other's identity.

**Zero Marginal Cost Transactions:** Through Midnight's NIGHT-DUST mechanism, holding NIGHT tokens generates DUST continuously, allowing transactions without per-use fees.

---

## Collaboration Approach

### Spine Document Methodology
- Central coordination of core terms, notation, section dependencies
- Shared notation conventions across co-authors
- Academic norms (not NDAs) for collaboration
- Clear authorship agreements

### Research Principles
- Honest acknowledgment of limitations (especially oracle problem)
- Focus on making deception economically expensive, not cryptographically impossible
- Privacy principles cannot be compromised even for cost considerations
- Practical, implementable solutions over theoretical elegance

---

## File Locations

| Document | Path |
|----------|------|
| Msingi Paper V1 | `/mnt/project/Msingi_Paper_V1.docx` |
| Vision Doc V1 | `/mnt/project/Msingi_Vision_Doc_V1.docx` |
| Vision Doc PDF | `/mnt/project/Msingi_Vision_Doc_V1.pdf` |
| Midnight Litepaper | `/mnt/project/Midnight_litepaper.pdf` |
| Midnight Tokenomics | `/mnt/project/MidnightTokenomicsAndIncentivesWhitepaper_1.pdf` |

---

## Quick Reference

### Core Argument Flow
1. IoT devices generate value but capture none
2. Existing systems pay owners, not devices
3. Device-held wallets are required for anonymity (payment side-channel)
4. ZK-enforced policies make device wallets safe (bounded autonomy)
5. Same ZK primitives enable both privacy AND economic agency

### What's Novel
- No production system currently enables devices to hold wallets and transact autonomously
- Anonymous economic agents with bounded autonomy
- Attestation markets where both buyers and sellers are anonymous
- ZK-enforced spending policies on autonomous devices

### What's Established
- Hash commitments, Merkle trees, ZK proofs, nullifiers (cryptographic primitives)
- Secure elements for key storage (ATECC608B)
- Privacy-preserving blockchains (Zcash, Aztec, Midnight patterns)

---

*Last Updated: January 2026*
*Project Lead: Solomon Kembo*
