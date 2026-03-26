# Minimum Midnight Privacy Blueprint for Odzi Pilot

**Date:** March 22, 2026  
**Goal:** Prove interaction with real farmers in Odzi while preserving identity privacy  
**Scope:** Minimum app (`HARVEST`, `BALE_PREP`, `DISPATCH`) with selective disclosure and compliance-ready controls

Phase note:
- **Phase A** uses off-chain deterministic receipts for field operations.
- **Phase B** adds on-chain Midnight commitments/nullifier logic.

---

## 1) The Paradox and the Design Target

You need to prove:
1. The pilot involved real humans in Odzi (not bots).
2. You did not expose personally identifiable farmer data on-chain.

This is exactly a rational privacy problem:
- verification must be strong enough for trust and funding decisions;
- disclosure must be minimal and controlled.

The design target is therefore:

> **Publicly verifiable participation proofs, privately held identity data, selectively disclosable compliance evidence.**

---

## 2) What Official Midnight Docs Enable (Research Summary)

## 2.1 Privacy by default, disclosure by exception
- Midnight docs describe selective disclosure and proving correctness without revealing sensitive data.
- Compact requires explicit disclosure via `disclose()` when potentially private witness-derived data is written to public ledger state or returned from exported circuits.

Practical implication:
- accidental data leakage is harder because disclosure must be intentional in code.

## 2.2 Witness model for private inputs
- Compact contracts use `witness` callbacks supplied by the DApp for private inputs.
- Data that is not ledger state and not explicitly disclosed can remain private.

Practical implication:
- identity data can stay off-chain/local while still proving eligibility.

## 2.3 Commitment + Merkle + nullifier patterns
- Midnight docs explicitly recommend commitments/hashes, Merkle membership proofs, and commitment/nullifier patterns for private membership and single-use actions.

Practical implication:
- we can prove "authorized member acted once in epoch" without revealing which member.

## 2.4 Wallet + connector + privacy-respecting infrastructure
- DApp Connector API supports wallet connect and service config discovery.
- Docs note DApps should follow wallet-configured node/indexer/prover URIs for user privacy preferences.
- Proof server guidance emphasizes local or controlled proof infrastructure due to private data handling.

Practical implication:
- for pilot integrity, use a controlled desktop connector lane for anchoring plus controlled proving infrastructure.

## 2.5 Ecosystem direction on identity and human authenticity
- Midnight ecosystem posts describe DID/VC work and research into proving "human not AI" with privacy.

Practical implication:
- your use case is aligned with active ecosystem direction, even if MVP starts simpler than full DID.

---

## 3) Simplicity-First Architecture for the Minimum App

## 3.1 Three-layer data model
1. **Private identity layer (off-chain)**
   - Farmer identity details kept by cooperative process, not on public chain.
2. **Proof layer (on-chain commitments)**
   - Member commitments, event commitments, and nullifiers.
3. **Selective disclosure layer (controlled reveal)**
   - Time-bound reveal packages for approved reviewers.

## 3.2 Roles
1. Farmer (mobile app user)
2. Cooperative Registrar (trusted local attester for pilot)
3. Pilot Operator (app support + policy enforcement)
4. Anchor Operator (desktop Lace/Midnight connector lane)
   - Phase A is initially custodial for anchor submission authority
5. Reviewer/Auditor (gets selective evidence, not full identity dump)

---

## 4) Minimum Midnight App: Privacy-Aware Flow

## 4.1 Enrollment (humanity gate)
1. In-person registration with cooperative facilitator.
2. Registrar issues pilot identity token/attestation in local process.
3. System derives a **member commitment** from private secret material.
4. Commitment map is stored off-chain in Phase A and prepared for Phase B anchoring.

Output:
- farmer is privately eligible.
- chain has no real-world identity details.

## 4.2 Event submission (harvest season operations)
Event types:
- `HARVEST`
- `BALE_PREP`
- `DISPATCH`

For each event:
1. App creates private event payload.
2. App computes event commitment.
3. Backend stores canonical event + deterministic receipt fingerprint.
4. End-of-day backend builds Merkle root over receipt commitments.
5. Anchor operator submits day root on Midnight.
6. App returns receipt ID and later anchor status/proof link.

Output:
- publicly verifiable that submitted receipts are included in anchored day roots.
- privately protected who submitted each specific event.

Phase A clarification:
- anchoring submission is custodial in this phase due to low-end Android constraints
- verification remains trust-minimized via deterministic receipts, tx hash references, and inclusion proofs

## 4.3 Selective disclosure (compliance-ready)
When reviewer needs evidence:
1. Generate reveal package with minimum required fields (for example: event type + day bucket + coop segment).
2. Provide proof that revealed fields correspond to committed event.
3. Do not reveal full identity unless policy requires and participant consent/legal basis exists.
4. Include anchor transaction reference for independent verification.

Output:
- "show enough to satisfy review" without blanket de-anonymization.

---

## 5) Anti-Bot / Real-Human Assurance Without Identity Exposure

Use layered checks:

1. **In-person bootstrap attestation**
- Cooperative registrar verifies physical presence at onboarding.
- Issues attestation used to create authorized member commitment.

2. **Device/session possession proof**
- Farmer completes guided challenge flow on mobile during assisted sessions.

3. **Nullifier one-time constraints**
- Prevent duplicated/replayed submissions under same rule window.

4. **Session-bound liveness challenge (optional, simple)**
- Daily/weekly facilitator challenge code included in signed payload.
- Raises bar against remote scripted bot farms.

5. **Optional wallet possession proof (non-blocking lane)**
- Run only on extension-capable devices for champion subgroup.

Important:
- no single mechanism is perfect.
- combined mechanism gives strong practical assurance for pilot phase.

---

## 6) Data Disclosure Matrix (Simple and Defensible)

## 6.1 Public by default
- Anchored day root hashes
- Anchor transaction hashes
- Aggregate participation metrics

## 6.2 Private by default
- Farmer legal identity
- Raw event narrative details
- Secret keys, witness outputs
- Full mapping from receipt/fingerprint to real person

## 6.3 Selectively disclosable
- Proof that event is from authorized member
- Proof of event-class participation over period
- Limited metadata required for operational audits

---

## 7) Minimal Compact Pattern (Conceptual)

```compact
pragma language_version 0.22;
import CompactStandardLibrary;

witness farmerSecret(): Bytes<32>;
witness membershipPath(memberPk: Bytes<32>): MerkleTreePath<20, Bytes<32>>;

export ledger memberRoot: HistoricMerkleTree<20, Bytes<32>>;
export ledger spentNullifiers: Set<Bytes<32>>;
export ledger eventCommitments: HistoricMerkleTree<24, Bytes<32>>;
export ledger currentEpoch: Counter;

circuit memberPk(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "odzi:member"), sk]);
}

circuit eventNullifier(sk: Bytes<32>, epoch: Field): Bytes<32> {
  return persistentHash<Vector<3, Bytes<32>>>([pad(32, "odzi:nullifier"), epoch as Bytes<32>, sk]);
}

export circuit submitEvent(eventCommitment: Bytes<32>): [] {
  const sk = farmerSecret();
  const pk = memberPk(sk);
  const path = membershipPath(pk);
  assert(memberRoot.checkRoot(merkleTreePathRoot<20, Bytes<32>>(path)), "not authorized");

  const nul = eventNullifier(sk, currentEpoch);
  assert(!spentNullifiers.member(nul), "duplicate");
  spentNullifiers.insert(disclose(nul));

  eventCommitments.insert(disclose(eventCommitment));
}
```

Notes:
- This is a conceptual skeleton, not production-ready code.
- `disclose()` is intentional at the exact ledger disclosure points.

---

## 8) Smallest Possible Implementation Plan (No Over-Engineering)

## Phase A (1-3 days): Pilot-safe MVP
1. Event form for `HARVEST`, `BALE_PREP`, `DISPATCH`.
2. Receipt generation and local history.
3. Off-chain commitment pipeline and day-level Merkle build.
4. Anchor status view + proof package retrieval.
5. Custodial anchor controls: dual sign-off, SLA tracking, and anchor-operation logging.

Important:
- Phase A receipts are not on-chain proofs yet.
- They are deterministic artifacts designed for Phase B anchoring.
- Phase A anchoring is custodial at submission time, but verification outputs remain independently checkable.

## Phase B (4-10 days): Midnight-hardening
1. Contract for member commitments + nullifier checks + event commitment insert.
2. On-chain receipt anchoring.
3. Basic reviewer proof package endpoint.

## Phase C (weeks 2-6): Field reliability
1. Tune friction points from Odzi sessions.
2. Expand anchor reliability and proof verification checks.
3. Optional champion wallet lane on compatible devices.
4. Produce evidence dossier for Midnight.

---

## 9) Compliance-by-Design Guardrails (Simple Policy)

1. Data minimization
- collect only fields needed for pilot decisions.

2. Explicit consent
- participants understand non-financial pilot scope.

3. Role-bound access
- operator and reviewer access are separated and logged.

4. Selective reveal workflow
- reveal only required fields for specific review purpose.

5. Incident protocol
- any trust/privacy incident gets immediate containment and written audit trail.

---

## 10) What to Show Midnight After This

1. Real participation evidence (with privacy preserved)
- number of unique authorized contributors (proof-backed)
- repeat activity metrics

2. Trust evidence
- farmer understanding of receipt/proof model
- willingness to continue usage

3. Privacy evidence
- no raw identity leak on-chain
- selective disclosure used for reviewer checks

4. Technical evidence
- controlled desktop connector flow for custodial anchoring (Phase A)
- commitment/nullifier pattern in production pilot path

---

## 11) Practical Recommendation

For the next 6 weeks, optimize for:
- **strong human-verification signal**
- **low farmer friction**
- **strict data minimization**
- **credible custodial controls with publicly verifiable outputs**

Do not optimize for:
- full identity stack complexity on day one
- maximal cryptographic sophistication before behavior is validated

---

## 12) Source Links (Primary / Official)

1. Midnight docs home (selective disclosure, compliance framing):  
   https://docs.midnight.network/
2. Compact explicit disclosure (`disclose()` model):  
   https://docs.midnight.network/compact/reference/explicit-disclosure
3. Compact writing contract (witness, confidentiality, round-based unlinkability):  
   https://docs.midnight.network/compact/writing
4. Private data strategies (commitments, Merkle paths, nullifier pattern):  
   https://docs.midnight.network/concepts/how-midnight-works/keeping-data-private
5. DApp connector API (wallet connect, config, signing/transfers):  
   https://docs.midnight.network/api-reference/dapp-connector
6. React wallet connector guide (Lace integration flow):  
   https://docs.midnight.network/guides/react-wallet-connect
7. Proof server guidance (local/controlled prover, privacy note):  
   https://docs.midnight.network/guides/run-proof-server
8. Midnight identity ecosystem direction (DID/VC/humanness research):  
   https://midnight.network/blog/meet-the-partners-building-midnight-decentralized-identity
9. Rational privacy framing in practice:  
   https://midnight.network/blog/rational-privacy-for-real-world-data-protection
