# EdgeChain Pilot App Scaffold (Phase A)

This repo now includes a working scaffold for the **Odzi field recording tool** specified in `docs/FIELD_RECORDING_TOOL_BUILD_SPEC_v1.md`.

## What is implemented

- Vanilla JS + HTML + CSS field app optimized for low-end Android constraints
- Consent-gated session start
- Event recording for `HARVEST`, `BALE_PREP`, `DISPATCH`
- Deterministic fingerprint + receipt generation
- Local history and copy-ready receipt IDs
- Offline queue + sync indicator (`Offline`, `Queued`, `Synced`) + manual retry
- Required minimum API contract endpoints:
  - `POST /events`
  - `GET /receipts/:receipt_id`
  - `GET /receipts/:receipt_id/proof`
  - `GET /anchors/:event_day`
- CSV export endpoints by day and by farmer
- Optional operator anchor endpoint (`POST /anchors`) for local testing

## Project layout

- `app/` frontend field tool (no framework)
- `server/` API and receipt/anchor logic
- `data/` local JSON storage (git-ignored except `.gitkeep`)
- `docs/` pilot and specification documents

## Run locally

1. Install deps:
   ```bash
   npm install
   ```
2. Start server:
   ```bash
   npm run dev
   ```
3. Open:
   - [http://localhost:8080](http://localhost:8080)

## Notes

- This is a **Phase A scaffold**. It is intentionally off-chain and designed to preserve compatibility for Phase B Midnight anchoring hardening.
- Data is stored in local JSON files under `data/` for pilot simulation and developer testing.
