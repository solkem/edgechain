# Mobile-Constrained Trust Model (Odzi Pilot)

**Purpose:** define a realistic trust architecture when farmers primarily use low-cost Android phones and native trustless wallet support is not practical on those devices in Phase A.

## 1) Problem

Field reality:
- farmers use cheap Android phones
- Midnight/Cardano wallet connector flows are extension-first (desktop/browser-extension model)

Constraint:
- we cannot require every farmer to run a native trustless wallet flow on their own phone in Phase A.

## 2) Model Summary

Use a two-lane model:

1. **Farmer lane (mobile-first)**
- Farmers use the field app to submit events and receive deterministic receipts.
- No mandatory wallet on farmer phone.

2. **Anchor lane (desktop custodial bridge)**
- A controlled operator desktop (Lace + Midnight connector capable) anchors daily Merkle roots on Midnight.
- This lane is initially custodial for transaction submission authority.
- Each farmer receipt maps to an inclusion proof under that anchored root.

This preserves:
- usability for cheap Android devices
- public verifiability of anchored pilot data
- a clear migration path to stronger participant-assisted trust later

## 2.1 Why this still uses Midnight trustless technology

Phase A keeps trustless verification artifacts even with custodial submission:
1. deterministic fingerprints can be recomputed independently
2. anchor tx hashes are publicly checkable
3. inclusion proofs can be validated against anchored roots
4. third-party reviewers can verify without trusting private app databases

## 3) Data Flow

1. Farmer submits event in mobile app.
2. Backend stores canonical event and computes receipt fingerprint.
3. Backend groups day events and builds Merkle tree.
4. End of day, operator anchors Merkle root on Midnight through the custodial desktop lane.
5. Backend stores anchor tx hash and links receipts to inclusion proofs.
6. Farmer/operator/reviewer can verify:
- receipt exists
- receipt is included in anchored root
- anchored root exists on-chain (tx hash)

## 4) Trust Assumptions (Explicit)

Phase A assumptions:
1. Operator can delay/misbehave in anchoring if uncontrolled.
2. Backend can be faulty if no audit path exists.
3. Custodial key handling introduces concentration risk.

Mitigations:
1. Daily anchoring SLA (within 24h of event day close).
2. Public anchor log (date, root hash, tx hash, anchored_by).
3. Deterministic receipt fingerprint reproducibility checks.
4. Inclusion proof generation for each receipt.
5. Two-person anchor control where practical (operator + reviewer sign-off).
6. Incident escalation for delayed or failed anchoring.

## 5) Minimum Verification Artifacts

For each receipt:
1. `receipt_id`
2. `fingerprint`
3. `event_day`
4. `anchored_root_hash`
5. `merkle_proof`
6. `anchor_tx_hash`
7. `anchored_at_iso`

This is enough for a third-party verifier to check inclusion against anchored root.

## 6) What This Model Is and Is Not

It is:
- practical for current device constraints
- auditable
- Midnight-aligned for verifiable proof flows
- compatible with progressive Midnight hardening

It is not:
- per-farmer fully trustless wallet execution
- final-state architecture for long-term decentralization goals
- a claim that custody risk is eliminated in Phase A

## 7) Migration Path to Stronger Trustlessness

When mobile-compatible wallet flows become practical:
1. enable optional farmer wallet-sign lane
2. shift anchoring authority from operator-centric to participant-assisted controls
3. phase in direct farmer-side cryptographic actions

## 8) Operational KPIs for This Model

1. Anchoring coverage `%`
- anchored pilot days / active pilot days

2. Anchoring timeliness `%`
- days anchored within 24h / active pilot days

3. Inclusion proof success `%`
- verifications passed / verifications attempted

4. Receipt reproducibility `%`
- receipts recomputed successfully / sampled receipts

## 9) Recommended Messaging

Field-facing:
- "You record events and receive receipts. We can later verify these receipts."

Reviewer/funder-facing:
- "Given low-end Android constraints, this pilot uses an initial custodial desktop anchoring lane plus trustless verification artifacts: deterministic receipts, daily Midnight root anchors, and inclusion proofs."
