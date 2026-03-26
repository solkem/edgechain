# Odzi Pilot Field Template Pack

This folder contains practical templates to run a 6-week Lean Startup pilot with a smallholder farming cooperative in Odzi, Zimbabwe.

## Files

- `baseline-form-template.csv`
- `baseline-trust-mini-survey-5q.csv`
- `trust-survey-template.csv`
- `kpi-tracker-template.csv`
- `daily-anchor-log-template.csv`
- `weekly-field-checklist.txt`
- `FIELD_RECORDING_TOOL_BUILD_SPEC_v1.md`
- `ODZI_PILOT_PLAN_FOR_EXPERT_REVIEW.md`
- `odzi-midnight-execution-plan-v1.txt`
- `MINIMUM_MIDNIGHT_PRIVACY_BLUEPRINT.md`
- `MOBILE_CONSTRAINED_TRUST_MODEL.md`
- `ODZI_PILOT_LEARNING_EXPLORER_PROMPT_v1.md`
- `PHASE_A_CUSTODIAL_MIDNIGHT_IMPLEMENTATION_ROADMAP.md`
- `ONE_PAGE_FIELD_GLOSSARY.md`
- `VISUAL_FARMER_SIMULATION_MODE_SPEC_v1.md`

## Intended Pilot Shape

- Cohort size: `30` farmers
- Duration: `6 weeks`
- Phase 1 objective: prove trust + behavior on record/receipt workflows
- Wallet objective: optional in general cohort, measured in champion subgroup
- Device constraint: optimize for low-cost Android phones first
- Trust model: farmer mobile capture + initial custodial desktop anchoring + trustless verification artifacts

## Strategic Update (March 2026)

Cardano/Midnight wallet connector support is not practical on the low-end Android phones used by the target farmer cohort.

Phase A strategy is therefore:
1. keep farmer flow wallet-free on Android
2. run anchoring through a controlled desktop custodial lane
3. preserve trustless verification outputs (deterministic receipts + inclusion proofs + Midnight tx references)

## Delivery Sequence (Important)

1. Build and run the field recording tool first (`FIELD_RECORDING_TOOL_BUILD_SPEC_v1.md`).
2. Run the 6-week pilot and collect real data.
3. Update/build the Learning Explorer with actual pilot evidence.

## Weekly Cadence

1. Week 0
   - Collect baseline using `baseline-form-template.csv`
   - Run 5-question mini baseline survey using `baseline-trust-mini-survey-5q.csv`
2. Weeks 1-6
   - Run weekly trust survey with `trust-survey-template.csv`
   - Update outcomes in `kpi-tracker-template.csv`
   - Maintain anchor evidence in `daily-anchor-log-template.csv`
3. Weekly review
   - Use go/iterate/no-go status in tracker

## Metric Definitions

- Activation rate `%`
  - `farmers with >=1 valid submission in week 1 / total cohort * 100`
- Week retention `%`
  - `farmers active this week / total cohort * 100`
- Invalid rate `%`
  - `records_invalid_total / records_submitted_total * 100`
- Avg trust score
  - average of trust items in weekly survey
- Trust 4 or 5 `%`
  - `% of farmers scoring trust >=4`
- Anchoring coverage `%`
  - `anchored_days / active_pilot_days * 100`
- Inclusion proof success `%`
  - `proof_checks_passed / proof_checks_attempted * 100`

## Suggested Pass Thresholds

- Activation: `>= 75%`
- Week 4 retention: `>= 40%` (recalibrate after baseline)
- Week 6 retention: `>= 35%` (recalibrate after baseline)
- Completeness: `>= 90%`
- Invalid rate: `<= 5%`
- Avg trust score: `baseline + >= 0.7 lift by week 6`
- Trust 4 or 5: `>= 60%` (recalibrate after baseline)
- Anchoring coverage: `>= 90%`
- Anchoring timeliness: `>= 80% within 24h`
- Inclusion proof success: `>= 99%` on sampled checks
- Wallet lane metrics are optional in this phase

## Decision Rule

- `GO`: trust + behavior + data discipline + anchoring integrity pass
- `ITERATE`: one major threshold missed, no critical incident
- `NO-GO`: trust failure, safety incident, or unresolved critical compliance issue

## Notes

- Keep consent explicit for every participant.
- Minimize personally identifiable data to what is operationally necessary.
- Do not promise financing outcomes before experiment evidence exists.
