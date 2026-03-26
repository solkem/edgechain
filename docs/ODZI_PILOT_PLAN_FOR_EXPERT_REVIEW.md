# EdgeChain x Odzi Pilot Plan (For Expert Review)

**Version:** 1.1  
**Prepared for critique date:** March 22, 2026  
**Planned pilot start:** TBD (set with cooperative operations calendar)  
**Location:** Odzi, Zimbabwe  
**Program type:** Lean Startup, field-first validation of a **Minimum Midnight App** use case

---

## 1) Executive Summary

This plan validates a practical, non-speculative Midnight use case with real farmers before requesting ecosystem expansion funding.

This pilot is explicitly a **Minimum Midnight App (MMA)** rollout, with phased delivery:
- Phase A: off-chain receipt-generating field recording tool + initial custodial desktop anchoring lane.
- Phase B: on-chain Midnight anchoring and privacy hardening.

The pilot is intentionally not a DeFi lending rollout.  
The pilot is intentionally not an IoT hardware rollout at per-farmer scale.

The pilot tests one core proposition:

> Farmers will use and trust a **Minimum Midnight App** that records real harvest-to-auction events, generates deterministic receipts, and uses a controlled custodial desktop anchor lane in Phase A, then progressively adopts stronger participant-assisted on-chain proof flows in Phase B.

If trust and behavior are proven, the project moves to a funded expansion phase with Midnight.

Working definition in this plan:
- **Minimum Midnight App** = the smallest farmer-usable workflow that starts with off-chain deterministic receipts and an initial custodial anchor lane, while preserving trustless verification outputs and evolving to deeper Midnight integration without changing farmer job flow.

---

## 1.1 Artifact Boundary (Critical)

This program has three separate artifacts that should not be conflated:

1. **Field recording tool** (pilot-critical)
- What farmers use during pilot sessions.
- Must work at kickoff.

2. **Learning Explorer**
- Educational/reviewer artifact.
- Built or finalized after pilot with real data.

3. **Midnight integration layer**
- Contract/proof/selective-disclosure layer.
- Introduced in phased rollout after field signal is validated.

---

## 2) Core Rationale (Why This Plan Is Sequenced This Way)

## 2.1 Evidence before fundraising
- Rationale: Ecosystem funders respond better to user evidence than concept-only decks.
- What this enables: A stronger, metrics-backed ask to Midnight.

## 2.2 Harvest-season workflow first
- Rationale: Farmers are already harvesting and preparing for auction floors.
- What this enables: Zero artificial behavior change; the app records work they are already doing.

## 2.3 Value-first, wallet-staged approach
- Rationale: Mandatory wallet onboarding for all users on day one increases drop-off risk.
- What this enables: Broad participation first, advanced Web3 interaction in a champion subgroup.

## 2.3b Mobile-constrained trust lane
- Rationale: cheap Android phones dominate field access, while connector-first wallet flows are desktop-oriented.
- What this enables: practical farmer usage plus verifiable daily on-chain anchoring via an initial custodial operator lane with explicit controls.

## 2.4 Receipt as first trust artifact
- Rationale: A verifiable receipt is concrete and easy to explain.
- What this enables: Farmers can understand proof value before deeper cryptographic concepts.

## 2.5 No finance promises in phase 1
- Rationale: Avoid mis-selling risk and expectation mismatch.
- What this enables: Clean consent, ethical field practice, and clearer pilot validity.

## 2.6 Lean instrumentation from day one
- Rationale: Without structured measurement, pilot outcomes are anecdotal.
- What this enables: Go/iterate/no-go decisions based on defined thresholds.

## 2.7 Low-end Android first
- Rationale: Dominant access device in this community is likely low-cost Android.
- What this enables: Real adoption signal instead of lab-only usability.

---

## 3) Pilot Objective, Scope, and Non-Goals

## 3.1 Objective
Validate trust, behavior, and operational feasibility of a minimum Midnight-context app in one Odzi farming cooperative.
Validate that the Phase A field tool works reliably on low-cost Android phones under unstable connectivity.

## 3.2 In-scope
- Real event recording: `HARVEST`, `BALE_PREP`, `DISPATCH`
- Deterministic off-chain receipt generation per event (Phase A)
- Farmer history view
- Weekly trust and behavior measurement
- Daily Merkle root anchoring with tx log publication (starts in Week 2, custodial desktop lane)
- Inclusion proof checks for sampled receipts
- Receipt reproducibility checks for sampled receipts
- Optional champion wallet tests on extension-capable devices only

## 3.3 Out-of-scope
- Lending products
- Credit scoring and underwriting
- Tokenized finance rollout
- Per-farmer IoT hardware deployment

## 3.4 What makes this a Midnight app (not a generic pilot app)
- Receipt outputs are designed as Midnight-compatible artifacts.
- In Phase A they are off-chain deterministic receipts, not on-chain proofs yet.
- In Phase A, roots are anchored through a custodial desktop lane and receipts map to inclusion proofs.
- In Phase B, control shifts toward stronger participant-assisted trust patterns where practical.
- Verification logic is structured for privacy-preserving trust flows, not only CRUD record storage.

## 3.5 Claim boundary for Phase A trust model
- We do **not** claim per-farmer wallet-native trustless execution on low-end Android in Phase A.
- We **do** claim trust-minimized verification outputs: deterministic receipts, inclusion proofs, and checkable Midnight tx references.

---

## 4) Hypotheses and Success Criteria

## 4.1 H1: Trust
Farmers perceive digital receipts as credible proof of activity.

**Pass thresholds (baseline-calibrated)**
- Average trust score lift `>= +0.7` from baseline by week 6
- At least `60%` of participants rate trust as `4 or 5` (recalibrate after week-0 baseline)

## 4.2 H2: Behavior
Farmers repeatedly use the workflow with declining support dependency.

**Pass thresholds (baseline-calibrated)**
- Activation (week 1) `>= 75%`
- Retention (week 4) `>= 40%` (recalibrate after baseline)
- Retention (week 6) `>= 35%` (recalibrate after baseline)

## 4.3 H3: Data discipline
Recorded events are complete and valid enough for future scaling.

**Pass thresholds**
- Completeness `>= 90%`
- Invalid rate `<= 5%`

## 4.4 H4: Anchoring integrity
Pilot data is anchored and verifiable under the mobile-constrained trust model.

**Pass thresholds**
- Anchoring coverage `>= 90%` of active pilot days
- Anchoring timeliness `>= 80%` within 24h
- Inclusion proof verification success `>= 99%` on sampled checks
- Receipt reproducibility `>= 99%` on sampled checks

## 4.5 H5: Optional wallet readiness (non-blocking lane)
Champion users on extension-capable devices can complete minimum connector actions.

**Monitoring thresholds (non-blocking in this phase)**
- Wallet setup success target `>= 80%`
- Sign without help target `>= 70%`

---

## 5) Minimum Midnight App Specification (v0)

## 5.1 Product principle
Use the minimum flow needed to capture real events and return an understandable proof artifact while preserving Midnight-aligned trust semantics.

## 5.2 Screen flow
1. `Start Session`
- Farmer ID / Coop ID
- Consent checkbox

2. `Record Event`
- Event type: `HARVEST`, `BALE_PREP`, `DISPATCH`
- Required fields: crop lot ID, date/time, short note
- Conditional fields for `BALE_PREP`: bale tag, estimated weight, estimated grade
- Conditional fields for `DISPATCH`: destination floor, transporter, departure time

3. `Receipt`
- Record ID
- Timestamp
- Proof string (Midnight-compatible deterministic artifact)
- Helper text: "Use this receipt to verify this record later."

4. `History`
- Last 10 records
- Receipt IDs and status

5. `Anchor Status`
- Daily anchor status for receipt day (`Unanchored`, `Anchored`)
- Reference fields: root hash and anchor tx hash when available

6. `Optional Champion Mode`
- Wallet connector trials on extension-capable devices only

## 5.3 Definition of “receipt” in this pilot
A receipt is a proof slip for one recorded event:
- unique record reference
- event timestamp
- proof artifact string

Purpose:
- confirm submission occurred
- support future verification
- reduce dispute ambiguity

## 5.4 Explicit Midnight markers in v0
- `Anchoring path`: daily Merkle roots anchored on Midnight via controlled custodial desktop operator lane.
- `Proof receipts`: deterministic artifact for each event.
- `Trust model`: emphasis on verifiability and privacy-preserving auditability.
- `Scale path`: v0 artifacts are structured to evolve into deeper Midnight integration.

---

## 6) Field Execution Plan

## 6.1 Team roles (minimum)
- Field Lead
- Product Operator
- Enumerator
- Community Liaison

## 6.2 Day 1 runbook (Kickoff Day)
`08:00-09:00`
- Device setup, power checks, network fallback, printed backups.

`09:00-10:00`
- Group briefing.
- Explain objective and non-financial scope.
- Explain that this is a simple form of a Midnight app (minimum version).
- Explain receipt with one practical example.

`10:00-12:00`
- Cohort A (10 to 12 farmers) runs one event each.
- Capture completion times and confusion points.

`12:00-13:00`
- Midday fix cycle.
- Patch top UX wording issues.

`13:00-15:00`
- Cohort B (10 to 12 farmers) runs improved flow.

`15:00-16:00`
- 5-question baseline digital-trust mini survey.
- Same-day receipt comprehension check.
- Log top confusion points for week-1 UX fixes.

`16:00-17:30`
- Consolidate data and update KPI tracker.
- Set next-day decision: GO, ITERATE, HOLD.

## 6.3 Day 1 success targets
- At least `20` farmers submit one valid event.
- At least `50%` can explain receipt meaning in their own words.
- At least `60%` express intent to use again this week.

---

## 7) Six-Week Plan (relative to kickoff date)

## Week 0 (Kickoff Week): Workflow fit
- Goal: prove first-use comprehension and operational feasibility.
- Output: baseline + first trust/behavior signals + top 5 blockers.

## Week 1: Activation reliability
- Goal: increase valid event submissions, reduce support burden.
- Output: improved form labels and clearer error handling.

## Week 2: Trust reinforcement
- Goal: reinforce receipt credibility.
- Output: receipt lookup demo and verification exercises.
- Start daily root anchoring and publish anchor logs.
- Activate two-person custodial sign-off for daily anchor operations.

## Week 3: Behavior stability
- Goal: sustain weekly usage with less facilitator intervention.
- Output: segmented drop-off analysis and targeted fixes.

## Week 4: Anchoring integrity + optional wallet lane
- Goal: validate anchor reliability and optional connector lane where feasible.
- Output: anchor timeliness report, inclusion proof checks, reproducibility checks, optional wallet blocker map.

## Week 5: Evidence packaging
- Goal: produce readiness dossier for Midnight discussion.
- Output: KPI trends, user evidence, technical memo, next-phase ask.

---

## 8) Metrics, Instrumentation, and Data Collection

## 8.1 Data instruments in repository
- Baseline form: `docs/baseline-form-template.csv`
- Baseline mini survey (5 questions): `docs/baseline-trust-mini-survey-5q.csv`
- Weekly trust survey: `docs/trust-survey-template.csv`
- KPI tracker: `docs/kpi-tracker-template.csv`
- Daily anchor log: `docs/daily-anchor-log-template.csv`
- Weekly operations checklist: `docs/weekly-field-checklist.txt`
- Field recording build spec: `docs/FIELD_RECORDING_TOOL_BUILD_SPEC_v1.md`
- Mobile-constrained trust model: `docs/MOBILE_CONSTRAINED_TRUST_MODEL.md`

## 8.2 KPI calculations
- Activation rate = farmers with >=1 valid submission in week 1 / total cohort
- Weekly retention = active farmers in week / total cohort
- Invalid rate = invalid records / total records
- Trust 4 or 5 = participants scoring trust >=4 / total respondents
- Trust lift = current trust average - baseline trust average
- Anchoring coverage = anchored days / active pilot days
- Anchoring timeliness = days anchored within 24h / active pilot days
- Inclusion proof success = successful proof checks / attempted proof checks
- Receipt reproducibility = reproducibility checks passed / reproducibility checks attempted
- Anchor sign-off compliance = signed anchor days / anchored days

## 8.3 Daily operations rhythm
1. Morning standup: focus metric and session objective.
2. During fieldwork: log support requests and friction points.
3. End of day: update KPI sheet and select one product fix.
4. End of day anchor routine: build root, anchor, and log tx hash.
5. Publish daily summary:
- "today we learned..."
- "tomorrow we change..."

---

## 9) Decision Framework

## 9.1 GO
Trust, behavior, and data quality meet thresholds with no critical incidents.

## 9.2 ITERATE
One major threshold is missed; no critical incident.

## 9.3 NO-GO
Trust fails materially, safety issue occurs, or unresolved critical compliance issue appears.

---

## 10) Risk Register and Mitigation

## 10.1 Anchor lane trust gap
- Mitigation: daily anchor log, tx hash publication, inclusion proof sampling, reproducibility checks, and mandatory two-person anchor sign-off.

## 10.2 Misinterpretation as financial offering
- Mitigation: explicit script and consent language: no financing promises in this phase.

## 10.3 Data quality errors
- Mitigation: mandatory fields, immediate same-day wording fixes, weekly quality audits.

## 10.4 Operational outages
- Mitigation: backup paper forms, offline capture fallback, end-of-day reconciliation.

## 10.5 Trust incidents
- Mitigation: immediate incident logging, owner assignment, transparent follow-up.

## 10.6 Optional wallet lane friction
- Mitigation: keep wallet tests non-blocking, run only on compatible devices.

---

## 11) Ethics and Participant Protection

- Obtain explicit consent before onboarding.
- Minimize personally identifiable data collection.
- Avoid coercive participation dynamics.
- Provide clear explanation of pilot purpose and limits.
- Do not imply guaranteed financing outcomes.

---

## 12) Required Resources for Pilot Start

## 12.1 People
- 4 core roles (Field Lead, Operator, Enumerator, Liaison)

## 12.2 Equipment
- 2 Android phones
- 1 fallback laptop
- Power banks and charging setup
- Printed backup forms
- At least 2 low-end Android devices for compatibility testing

## 12.3 Software/data
- Field recording tool v0 (Phase A)
- CSV templates loaded
- Daily KPI review routine
- Field recording build spec loaded
- Low-end Android smoke-test checklist completed before sessions

---

## 13) Immediate Action Checklist (Night Before Start)

1. Freeze v0 event fields for `HARVEST`, `BALE_PREP`, `DISPATCH`.
2. Assign named owners to all field roles.
3. Pre-fill tracker metadata for kickoff week.
4. Print consent, baseline form, and 5-question baseline mini survey.
5. Rehearse 10-minute facilitator script.
6. Confirm incident escalation contact and response process.
7. Prepare anchor-operator desktop and initialize daily anchor log.

---

## 14) Deliverables by End of Week 1

- Baseline dataset for active participants
- Day-by-day adoption and trust metrics
- Prioritized UX blocker list
- Updated workflow based on observed friction
- First anchor logs with root hashes and tx references
- Custodial anchor control checklist and sign-off records
- Decision on whether to expand optional wallet tests in Week 2

---

## 15) Deliverables by End of Week 6 (Readiness Dossier)

- KPI trend report vs pass/fail gates
- Anonymized farmer evidence summary
- Product change log and rationale
- Technical integration summary for Midnight context
- Recommendation memo: scale, iterate, or stop

---

## 16) Reviewer Questions (For External Expert Critique)

1. Are the hypotheses and thresholds realistic for this context?
2. Is the minimum app too narrow or too broad for six weeks?
3. Are trust metrics sufficiently robust and culturally valid?
4. Is the mobile-constrained trust model (farmer mobile + desktop anchoring) robust enough for this phase?
5. Is the custodial-control package strong enough to make Phase A trust claims defensible?
6. Are there missing operational, ethical, or compliance controls?
7. Is the evidence package strong enough to support a post-pilot funding request?

---

## 17) One-Line Positioning

EdgeChain Odzi Pilot is a field-first Midnight validation program: capture real harvest-to-auction events on cheap Android phones, anchor daily roots through a controlled custodial desktop lane, verify receipt inclusion independently, and scale only what works.
