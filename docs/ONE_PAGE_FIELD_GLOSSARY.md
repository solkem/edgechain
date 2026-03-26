# One-Page Field Glossary (Odzi Pilot)

**Purpose:** simple shared language for field team, operators, and reviewers.

## Core Terms

1. **Minimum Midnight App**
- The smallest useful pilot app: capture events, issue receipts, and verify later.
- It is not a lending app in Phase A.

2. **Phase A**
- First pilot stage.
- Focus: event capture, deterministic receipts, offline reliability, daily anchoring.

3. **Phase B**
- Hardening stage after Phase A evidence.
- Adds deeper Midnight privacy logic and stronger participant-assisted trust controls.

4. **Trust**
- How confident farmers feel that records are fair and reliable.
- Measured with survey questions (usually 1-5 scores).

5. **Usage**
- What farmers actually do in practice.
- Examples: first-time activation, weekly return rate, number of valid submissions.

6. **Trust Baseline**
- Starting trust score before pilot improvements.
- Used as the comparison point for trust lift.

7. **Trust Lift**
- Current trust average minus baseline trust average.
- Example: baseline `2.8`, now `3.6`, lift is `+0.8`.

8. **Receipt**
- Proof slip for one event record.
- Includes a receipt ID and fingerprint so the record can be checked later.

9. **Fingerprint**
- Deterministic hash created from event fields.
- Same input always gives the same fingerprint.

10. **Deterministic**
- Predictable and reproducible.
- Anyone using the same formula and same input gets the same output.

11. **Anchor / Anchoring**
- Daily tamper-evident seal of that day’s records on Midnight.
- We publish one daily root hash and store the transaction reference.

12. **Merkle Root**
- One summary hash representing many records.
- Lets us verify a single record belongs to the anchored set.

13. **Inclusion Proof**
- Proof data showing a receipt is included under a specific anchored root.

14. **Anchor TX Hash**
- Transaction reference for the on-chain anchor.
- Used by reviewers to check that the anchor was actually posted.

15. **Initial Custodial Anchoring Lane**
- In Phase A, a trusted operator desktop submits anchors.
- Farmer phones do not hold wallet keys in this stage.

16. **Trustless Verification Outputs**
- Even with custodial submission, verification can be done independently:
  - recompute fingerprint
  - check inclusion proof
  - check on-chain tx reference

17. **Two-Person Sign-off**
- Operator + reviewer both sign the anchor operation.
- Reduces single-person control risk.

18. **Anchoring SLA**
- Time rule for anchor posting.
- Pilot target: post within 24 hours of event-day close.

19. **Tracker (KPI Tracker)**
- Weekly scoreboard CSV for pilot health and decision-making.
- Used to assign `GO`, `ITERATE`, or `NO-GO`.

20. **Anchor Log**
- Daily CSV log of anchor details:
  - day
  - root hash
  - tx hash
  - who anchored
  - reviewer sign-off

## Decision Terms

1. **GO**
- Continue and scale within current plan.

2. **ITERATE**
- Continue, but fix specific weak areas first.

3. **NO-GO**
- Stop or redesign due to major trust, safety, or compliance failure.

## Levels (Simple)

1. **Pack-level**
- Whole pilot document set and execution order.

2. **Phase-level**
- Stage of delivery (Phase A, Phase B).

3. **Workflow-level**
- Step sequence in the app (session -> event -> receipt -> history).

4. **Record-level**
- One event submitted by one farmer.

5. **Pilot-level**
- Overall weekly outcomes and decisions.
