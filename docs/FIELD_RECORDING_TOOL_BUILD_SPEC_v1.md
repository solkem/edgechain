# Field Recording Tool Build Spec (Phase A)

**Purpose:** define the kickoff-critical farmer tool that must run reliably in pilot sessions.

## 1) Scope

This spec is for **Phase A only**:
- off-chain event recording
- deterministic receipt generation
- local history and export
- initial custodial desktop anchoring lane with trustless verification artifacts

## 1.1 Device and network assumptions (must optimize for this)

Primary field environment:
- low-cost Android phones
- low RAM and limited storage
- unstable/slow mobile data
- occasional full offline usage

Practical target profile:
- Android 8+ devices commonly available in market
- 2G/3G quality data conditions
- shared devices in some cooperative sessions

Not in this phase:
- on-chain proof settlement
- mandatory wallet onboarding
- mandatory wallet/connector dependency on farmer phones
- mandatory farmer-side transaction signing
- advanced cryptographic workflows

## 1.2 Non-negotiable Android optimization rules

1. No heavy frontend framework in Phase A.
2. No large images or video in core flow.
3. Use system fonts only for field tool (no remote web fonts).
4. Keep first-load payload small and cacheable.
5. App must remain usable with intermittent network.
6. Every critical action must have clear success/error feedback.

## 1.3 Custodial anchoring strategy (Phase A)

1. Farmer devices never hold anchoring keys.
2. Desktop operator lane performs end-of-day root submission to Midnight.
3. Farmer-facing app still exposes verifiable anchor evidence:
- `merkle_root_hash`
- `anchor_tx_hash`
- inclusion proof package reference
4. Custodial operations must use:
- daily anchoring SLA (`<= 24h`)
- two-person sign-off where practical
- anchor operation logging

## 2) User Flow

1. Start Session
- fields: `farmer_id`, `consent_yes_no`

2. Create Event
- `event_type` enum: `HARVEST`, `BALE_PREP`, `DISPATCH`
- required common fields:
  - `event_id` (UUID)
  - `farmer_id`
  - `crop_lot_id`
  - `event_time_iso`
  - `notes_short`
- conditional fields:
  - `BALE_PREP`: `bale_tag`, `est_weight_kg`, `est_grade`
  - `DISPATCH`: `destination_floor`, `transporter_name`, `departure_time_iso`

3. Show Receipt
- `receipt_id`
- `event_id`
- `event_time_iso`
- `fingerprint`
- one-line text: "Use this receipt to verify this record."

4. History
- last 10 records by farmer
- ability to copy receipt ID

5. Anchor status view
- show receipt day anchor status:
  - `Unanchored`
  - `Anchored`
- when anchored, show:
  - `merkle_root_hash`
  - `anchor_tx_hash`
  - `anchored_at_iso`
  - link/copy for proof package reference

## 3) Deterministic Receipt Generation

Receipt fingerprint input string:

`farmer_id|event_type|crop_lot_id|event_time_iso|event_id`

Fingerprint algorithm:
- SHA-256 of input string
- render as hex

Display format:
- `receipt_id = ODZI-` + first 12 chars of fingerprint uppercase
- full fingerprint available in details view

## 4) Data Model

## 4.1 Event record

```json
{
  "event_id": "uuid",
  "farmer_id": "string",
  "event_type": "HARVEST|BALE_PREP|DISPATCH",
  "crop_lot_id": "string",
  "event_time_iso": "ISO-8601",
  "notes_short": "string",
  "bale_tag": "string|null",
  "est_weight_kg": "number|null",
  "est_grade": "string|null",
  "destination_floor": "string|null",
  "transporter_name": "string|null",
  "departure_time_iso": "ISO-8601|null",
  "fingerprint": "hex",
  "receipt_id": "string",
  "created_at_iso": "ISO-8601"
}
```

## 4.2 Session record

```json
{
  "session_id": "uuid",
  "farmer_id": "string",
  "consent_yes_no": true,
  "started_at_iso": "ISO-8601"
}
```

## 5) Validation Rules

1. `consent_yes_no` must be true before event form opens.
2. `event_type` required.
3. `crop_lot_id` required.
4. `event_time_iso` required and must parse.
5. `notes_short` max 280 chars.
6. Conditional fields required when their event type is selected.

## 6) Offline and Reliability Requirements

1. Must work when network is unavailable.
2. Persist locally (browser storage or local DB).
3. Queue unsynced records for later export/sync.
4. No data loss on page refresh.
5. Include a visible sync state indicator:
- `Offline`
- `Queued`
- `Synced`
6. Allow manual retry sync from history screen.

## 6.2 API contract shape (minimum)

Required backend endpoints:
1. `POST /events`
- create event and return receipt payload
2. `GET /receipts/:receipt_id`
- fetch receipt details and status
3. `GET /receipts/:receipt_id/proof`
- fetch inclusion proof package when anchored
4. `GET /anchors/:event_day`
- fetch day anchor metadata
5. `POST /anchors` (operator lane)
- records custodial anchor submission metadata for day root

## 6.1 Performance and data budgets (low-end Android)

1. Time-to-interactive target: <= 5s on slow 3G conditions after first load.
2. Core interaction latency target: <= 300ms for form step transitions.
3. Initial app payload target (HTML + CSS + JS): <= 250KB compressed.
4. Per-event sync payload target: <= 3KB JSON before transport overhead.
5. Battery-sensitive behavior:
- no polling loops faster than 30s
- no animation-heavy rendering in core form flow

## 7) Export Requirements

1. CSV export by day and by farmer.
2. Include:
- `event_id`
- `receipt_id`
- `event_type`
- `event_time_iso`
- `farmer_id`
- conditional fields

## 8) UX Requirements

1. Form completion target: <= 90 seconds for common event.
2. Error messages in plain language.
3. Receipt page must include:
- clear success confirmation
- easy copy action for `receipt_id`
4. Large tap targets for low-end Android screens.
5. Minimum text size:
- body text >= 16px
- primary actions >= 16px
6. Avoid deep navigation:
- max 1 primary action per screen
- max 2 taps to return to home
7. Use numeric keyboard where relevant:
- weights, IDs where numeric entry is expected
8. No wallet prompts in core farmer flow.
9. Anchor status must be visible but simple ("Anchored/Unanchored" badge).

## 8.1 Visual farmer simulation mode (required add-on)

Because the pilot flow can be too abstract when shown only as forms + proof slips, include a visual simulation mode for field sessions.

Simulation step sequence:
1. simulated field data (`moisture`, `temperature`, trend)
2. local model update (device lane)
3. global model aggregation (co-op lane)
4. newer global model download
5. inference from newer model (before/after comparison)
6. proof slip generation for simulation run

Rules:
1. Clearly label this as simulation (no live sensor hardware required in Phase A).
2. Keep this mode simple and visual for rural farmer comprehension.
3. Keep proof slip concept present, but avoid heavy technical jargon in farmer view.
4. Keep compatibility with low-end Android constraints.

## 9) Day-1 Acceptance Tests

1. Record `HARVEST` event end-to-end and produce receipt.
2. Record `BALE_PREP` event with conditional fields and produce receipt.
3. Record `DISPATCH` event with conditional fields and produce receipt.
4. Refresh app and confirm history persists.
5. Export records and confirm required columns.
6. Airplane-mode test: create 3 records offline and verify queue state.
7. Reconnect test: sync queued records and verify status changes to `Synced`.
8. Device test on at least 2 low-end Android phones before field session.
9. Anchor status test: one sample receipt shows `Unanchored` before anchoring.
10. Anchor status test: after anchor log update, sample receipt shows `Anchored` and tx hash.
11. Visual simulation test: farmer can see all simulation steps from data to model update to inference and proof slip.

## 10) Logging and Audit

Store local operational logs:
- validation errors by field
- submission completion time
- unsynced queue count
- anchor submission attempts and outcomes (`event_day`, `anchored_by`, `tx_hash`, timestamp)

Do not log:
- secrets
- private wallet materials

## 11) Naming Guidance (Field vs Funder)

Field-facing label:
- "Receipt Activity Log"

Funder-facing label:
- "Phase A of Minimum Midnight App (off-chain deterministic receipts)"
- "Mobile-Constrained Trust Model: farmer mobile capture + initial custodial desktop anchoring + trustless verification artifacts"

## 12) Phase B Hand-off Contract

When moving to Phase B:
1. Preserve `event_id` and `fingerprint` compatibility.
2. Anchor fingerprint/commitment mapping on-chain.
3. Add wallet/sign flow for champion subgroup where device support is practical.
4. Add selective-disclosure endpoints for reviewers.
5. Progress from operator-centric custody to participant-assisted trust controls.
