# Phase A Custodial Midnight Implementation Roadmap

**Date:** March 23, 2026  
**Context:** Cardano/Midnight wallet connector support is not practical on the low-end Android devices used by the target farmer cohort.

## 1) Strategy Statement

For Phase A, EdgeChain will use an **initial custodial anchoring model** while preserving **trustless verification outputs**:

1. Farmers submit records from low-end Android phones (no wallet requirement).
2. System creates deterministic receipt fingerprints for each event.
3. Backend builds daily Merkle roots over receipt fingerprints.
4. A controlled desktop operator lane anchors roots on Midnight.
5. Any reviewer can independently verify receipt inclusion against anchored roots.

This is a mobile-reality strategy, not a compromise on verifiability goals.

## 2) What Is Trustless vs What Is Custodial in Phase A

Trustless outputs we keep now:
1. Deterministic fingerprint reproducibility.
2. Publicly checkable Midnight anchor transaction references.
3. Inclusion proof verification per receipt.
4. Independent re-check capability by third-party reviewers.

Custodial assumptions we acknowledge now:
1. Anchor submission is operator-controlled.
2. Anchor timing can be delayed without controls.
3. Receipt-to-person identity mapping stays in controlled off-chain systems.

## 3) Required Custodial Controls (Non-Negotiable)

1. Two-person anchor control (operator + reviewer sign-off).
2. Daily anchoring SLA: anchor within 24h of event day close.
3. Public anchor log entries: event day, root hash, tx hash, timestamp, anchored_by.
4. Receipt reproducibility spot checks every day.
5. Inclusion proof sampling checks with pass/fail logging.
6. Incident escalation path for delayed/missing/invalid anchors.
7. No private key material in field app logs.

## 4) Reference Architecture (Phase A)

1. **Farmer Android app**
- Start session with consent.
- Create `HARVEST`, `BALE_PREP`, `DISPATCH` events.
- Generate and display deterministic receipt.
- Work offline and queue sync.

2. **Backend service**
- Canonical event store.
- Deterministic fingerprint + receipt ID generation.
- Daily Merkle root builder.
- Proof package generator and receipt status API.

3. **Custodial anchor operator station (desktop)**
- Pull daily root bundle.
- Submit root to Midnight via connector-capable environment.
- Record tx hash and anchor metadata.

4. **Verifier lane**
- Internal or external reviewer checks:
  - receipt exists
  - proof path resolves to anchored root
  - anchored root exists on Midnight tx reference

## 5) 10-Day Execution Sequence

## Days 1-2: Field App Stability
1. Freeze event schemas and validation rules.
2. Complete offline queue and retry sync behavior.
3. Run low-end Android smoke tests on at least 2 devices.

## Days 3-4: Deterministic Receipt Integrity
1. Lock fingerprint input format and hashing implementation.
2. Add reproducibility test script.
3. Verify receipt ID formatting and copy flow.

## Days 5-6: Anchor Pipeline
1. Implement daily Merkle root generation job.
2. Build anchor metadata store and status endpoints.
3. Add proof package endpoint for anchored receipts.

## Days 7-8: Custodial Controls
1. Add operator checklist and sign-off fields.
2. Enforce anchoring SLA flags in dashboard/log.
3. Add inclusion proof sampling routine and report template.

## Days 9-10: Pilot Readiness Pack
1. Validate end-to-end acceptance tests.
2. Pre-fill tracker templates for kickoff week.
3. Finalize field script language:
   - no financing claims
   - explain receipts simply
   - explain anchoring is initially operator-run but publicly verifiable

## 6) Phase A Exit Criteria

1. `>= 90%` anchoring coverage of active pilot days.
2. `>= 80%` anchors posted within 24h.
3. `>= 99%` inclusion proof checks pass on sample set.
4. Receipt reproducibility checks pass on daily sample.
5. No unresolved critical trust/compliance incidents.

## 7) Phase B Transition Plan (When Device Reality Improves)

1. Preserve `event_id` + `fingerprint` compatibility.
2. Add stronger on-chain commitment/nullifier logic.
3. Expand optional participant-side signing where practical.
4. Move from fully operator-centric custody to participant-assisted trust controls.

## 8) Field Messaging (Recommended)

Farmer-facing:
- "You record your events and get a receipt. We can verify receipts later."

Reviewer/funder-facing:
- "Phase A uses a custodial desktop anchoring lane due to low-end Android constraints, while maintaining trustless verification outputs through deterministic receipts, daily Midnight roots, and inclusion proofs."
