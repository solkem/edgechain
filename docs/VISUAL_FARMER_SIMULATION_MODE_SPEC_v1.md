# Visual Farmer Simulation Mode Spec (Phase A Add-on)

**Date:** March 25, 2026  
**Purpose:** ensure pilot farmers can understand the full flow through a visual simulation, while keeping proof slips (receipts) in the process.

## 1) Why this mode exists

Pilot feedback indicates that a form + receipt-only flow is too abstract for many rural farmer sessions.

This mode provides a guided visual storyline that farmers can watch:
1. simulated field data capture (no physical IoT hardware required)
2. local model update on device
3. co-op/global model aggregation
4. download of newer global model
5. inference from newer global model
6. proof slip generation

## 2) Scope for Phase A

In-scope:
1. visual simulation only (non-production ML execution)
2. simple, understandable values (moisture, temperature, trend)
3. before/after inference comparison
4. simulated proof slip at end of flow

Out-of-scope:
1. live sensor hardware integration
2. production FL orchestration
3. cryptographic claims about model training correctness

## 3) Required Demo Steps

The simulation must present these steps in order:
1. `Simulated field data`
2. `Local model update`
3. `Global model aggregation`
4. `Download newer global model`
5. `Inference from newer model`
6. `Proof slip generated`

Each step must show:
1. current state (`pending`, `active`, `done`)
2. one plain-language sentence about what just happened

## 4) UX Rules (Farmer-facing)

1. Visual-first and low text density.
2. Avoid deep technical terms in farmer view (`Merkle`, `nullifier`, `hash`).
3. Keep large tap targets and readable text (`>=16px`).
4. Keep a clear “Back” action.
5. Keep one main action for demo start (`Run Visual Demo`).

## 5) Wording Rules

Use:
1. “Proof Slip” (with receipt ID visible)
2. “Saved on this phone” / “Saved safely”
3. “Not sealed yet” / “Sealed and verifiable”

Avoid:
1. wallet/connector prompts in farmer flow
2. financing language or promises
3. implying this simulation is real hardware telemetry

## 6) Acceptance Criteria

1. Farmer can watch all 6 demo steps in sequence on low-end Android.
2. Farmer can see simulated moisture and temperature values.
3. Farmer can see local model and global model version updates.
4. Farmer can see before/after inference comparison.
5. Farmer sees a generated proof slip ID at the end.
6. Farmer can copy proof slip ID.
7. Demo works offline for visualization (no server dependency required for running the animation).

## 7) Integrity Notes

1. Demo mode is explanatory, not an audited proof of FL correctness.
2. Operational trust artifacts (proof slips + anchoring) remain in the real record flow.
3. Reviewer-facing evidence should clearly label simulated outputs as simulated.
