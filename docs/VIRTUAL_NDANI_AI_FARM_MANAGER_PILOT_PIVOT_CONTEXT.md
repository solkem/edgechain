# Virtual Ndani Kit + AI Farm Manager Pilot Pivot Context

Date: 2026-07-09
Source reviewed: `origin/codex/enable-ndani-kit-pilot`
Current checkout note: this pivot is not present in the current working tree; it exists in the local remote Git ref above.

This document captures the pilot pivot from the earlier Odzi receipt/anchoring plan into the Virtual Ndani Kit + AI Farm Manager pilot architecture. It is a handoff document for understanding why the pivot exists, what the pilot now tests, what code exists on the branch, and what still remains intentionally future-facing.

## Executive Summary

The Virtual Ndani pilot is the next sequencing step after the earlier hardware-first and receipt-first plans.

The project moved from:

- **7-farmer hardware pilot:** physical sensor nodes, Freedom Node, LoRa, ATECC608B, and Midnight proofs first.
- **30-farmer receipt pilot:** Android-first field activity receipts, deterministic fingerprints, daily Midnight anchoring, and inclusion proofs.
- **Virtual Ndani + AI Farm Manager pilot:** farmer number + PIN access, one Virtual Ndani Kit per farm, manual observations clearly labeled as manual, AI Farm Manager memory/check-ins/plans, coordinator review, and physical hardware introduced later.

The current Virtual Ndani branch frames the immediate pilot as a **20-farmer Odzi cohort**. This differs from the `docs/odzi-pilot` 30-farmer receipt plan in the current checkout. The best interpretation is not contradiction but evolution: the 30-farmer receipt plan was the field-recording/Midnight anchoring concept, while the Virtual Ndani branch narrows the next build around a 20-farmer AI + manual-observation cohort that demonstrates farmer value before hardware deployment.

The core pilot principle is:

> Farmers should receive immediate practical value without wallet friction, while EdgeChain preserves a clear path to physical Ndani Kit hardware, farmer-controlled data, AI memory, federated learning, privacy-preserving proofs, and reward eligibility.

## Core Pivot

### Old emphasis

The earlier EdgeChain/Msingi pilot emphasis was:

- prove the privacy-preserving IoT architecture;
- deploy physical sensor nodes;
- run farmer-owned Freedom Nodes;
- generate ZK proofs;
- anchor or submit claims to Midnight;
- eventually reward anonymous device contributions.

That path remains the long-term architecture, but it asks the field pilot to absorb too many hard dependencies at once.

### New emphasis

The Virtual Ndani pilot puts farmer value first:

- farmers log in using a farmer number and PIN;
- no wallet literacy is required on day one;
- each farm receives a Virtual Ndani Kit before physical hardware arrives;
- farmers or coordinators record structured observations;
- EdgeChain labels those observations honestly as manual or human-assisted;
- AI Farm Manager uses farm memory, check-ins, readings, and playbooks to produce practical advice;
- coordinators review risky readings or advice;
- evidence reports show funders whether the farmer-value loop works;
- physical Ndani Kit and Midnight proof/reward flows are introduced when they become structurally necessary.

## What “Virtual Ndani Kit” Means

Virtual Ndani Kit is a software bridge for the future physical Ndani Kit.

It is not fake sensor data.

It is:

- one virtual device per farmer/farm;
- a guided manual observation workflow;
- a visible farmer-facing object that says what the future kit will automate;
- an evidence pipeline that distinguishes observed, measured, derived, unavailable, and synthetic demo data;
- a way to collect pilot signals before every farmer has hardware.

The farmer-facing promise is:

```text
Today:
Farmers enter observations manually. EdgeChain remembers, organizes, advises, and follows up.

Next:
Ndani Kit hardware automates more readings.

Future:
Farmers build private, farmer-controlled intelligence records. In production, EdgeChain lets farmers control access to data, Ndani Kit hardware identity, AI memory, and participation in federated learning or research.
```

## Non-Negotiable Provenance Rule

The most important rule in this pivot is:

> Observation is not measurement.

The branch repeats this in UI, prompts, validation, and README language.

Examples:

- Valid: “The latest manual Ndani Kit reading recorded dry soil.”
- Invalid: “The sensor measured dry soil.”

Manual observations must never be described as physical sensor measurements.

This is both an ethics rule and an evidence-quality rule. It protects the credibility of the pilot and prevents funders, farmers, or future model consumers from confusing human-entered observations with hardware-backed readings.

## Pilot Size and Audience

The branch README frames the immediate pilot target as:

- `20` pilot farmers in Odzi;
- farmer PIN access;
- AI Farm Manager onboarding;
- Virtual Ndani Kit observations;
- coordinator review.

The current checkout’s `docs/odzi-pilot` material frames a `30` farmer receipt pilot. Treat these as two nearby but distinct pilot designs:

- **30-farmer receipt pilot:** prove record/receipt trust and Midnight anchoring.
- **20-farmer Virtual Ndani pilot:** prove farmer-specific AI value and manual-observation-to-hardware transition.

If the project needs one canonical number, that has to be decided explicitly. The Virtual Ndani branch itself uses 20 farmers as the implementation target.

## Product Experiences

The branch supports two experiences from one codebase.

| Experience | Entry point | Purpose |
| --- | --- | --- |
| Real / technical EdgeChain | `/` on real domains | Wallet-first Midnight, privacy, FL, proofs, and reward-eligibility story. |
| Farmer pilot | `/pilot-login` or `/` on farmer domains | Farmer number + PIN access to AI Farm Manager, Virtual Ndani Kit, manual readings, and coordinator support. |

The site mode system redirects `/` to `/pilot-login` on farmer-oriented hostnames configured with `VITE_FARMER_SITE_HOSTS`.

## Farmer Flow

### Login

Farmers use:

- pilot/farmer code, for example `ODZI-001`;
- personal PIN;
- no wallet requirement.

The login screen says:

- “Meet your farm’s Virtual Ndani Kit.”
- farmers do not need a wallet;
- Farm Assistant supports Shona or English;
- wallet learning remains optional.

### Virtual Ndani home

The farmer sees:

- assigned Virtual Ndani Kit code;
- farm name and site;
- human-assisted or physical-bound state;
- due check status;
- completed/missed checks;
- current channels;
- device timeline;
- contribution pipeline status;
- explanation of what hardware will later automate.

### Reading flow

Farmers can:

- record today’s guided reading;
- continue active readings;
- use Farm Assistant;
- complete weekly farm check-in.

### Weekly farm check-in

Inputs include:

- crop;
- crop stage;
- soil condition;
- plant condition;
- pest/disease signs;
- rain condition;
- irrigation done;
- biggest worry;
- labour/input constraint;
- whether previous advice was followed;
- observed change;
- manual notes.

The check-in is converted into an AI Farm Manager plan.

### Farm Assistant chat

The assistant answers using:

- active farm profile;
- latest check-ins;
- important memories;
- previous plans;
- farmer question.

It has deterministic fallback behavior if the LLM is unavailable or validation fails.

## Coordinator Flow

Coordinator routes are enabled by `VIRTUAL_NDANI_COORDINATOR_ENABLED`.

Coordinator capabilities include:

- list farmers;
- enroll farmer;
- edit farmer profile/status;
- reset PIN;
- delete farmer;
- create or update AI Farm Manager profile;
- view Virtual Ndani fleet;
- review flagged readings;
- run operations scheduler;
- view metrics;
- export evidence reports as JSON or CSV;
- issue and verify future physical binding challenges when enabled;
- mark missed cycles.

The coordinator role is stored through `farmers.system_role`, with valid values:

- `farmer`
- `coordinator`

## Authentication and Access Model

The branch introduces pilot auth under `/api/v1/auth`.

Key details:

- farmer/coordinator credentials use pilot code + PIN;
- PINs are hashed;
- sessions use server-generated tokens hashed in the database;
- failed login attempts lock the account after five failures;
- default session lifetime is controlled by `FARMER_SESSION_SECONDS`;
- coordinator-only routes require `requireCoordinator`;
- farmer routes require `requireFarmerSession`;
- pilot API routes are protected by trusted-origin middleware under `/api/v1`.

This is designed for a low-friction farmer pilot, not wallet-native authentication.

## Data Model Overview

The Virtual Ndani branch moves from SQLite-style local demo storage to PostgreSQL-backed pilot data under `apps/freedom-node`.

### Virtual devices

Table: `virtual_ndani_devices`

Purpose:

- one virtual device per farm;
- device code like `NDANI-ODZI-...`;
- mode is either `human_assisted_pilot` or `physical_bound`;
- status tracks lifecycle;
- stores future firmware profile and physical device pubkey when bound;
- tracks pilot interval and future physical interval.

Important defaults:

- `expected_interval_minutes = 1440` for one meaningful pilot check per day;
- `future_physical_interval_minutes = 30`, showing that future hardware could collect 48 readings/day.

### Channels

Table: `virtual_ndani_channels`

Default channels:

- temperature;
- humidity;
- atmospheric pressure;
- soil moisture;
- rain condition;
- plant condition;
- pest or disease signs;
- irrigation.

Each channel has:

- pilot source policy;
- future sensor type;
- future unit;
- display order.

Key distinction:

- temperature/humidity/pressure are hardware-or-approved-external only and show “awaiting hardware” in the human-assisted pilot.
- plant condition and pest/disease signs remain human observations even after hardware arrives.

### Cycles

Table: `virtual_ndani_cycles`

Cycle states:

- scheduled;
- started;
- capturing;
- awaiting confirmation;
- validated;
- flagged;
- accepted;
- batched;
- cancelled;
- missed.

Collection modes:

- `manual_guided`;
- `manual_agent`;
- `coordinator_assisted`;
- `external_context`;
- `physical_auto`;
- `synthetic_demo`.

Farmer-accessible service methods reject `synthetic_demo` and `physical_auto` for manual pilot cycles.

### Readings

Tables:

- `virtual_ndani_readings`
- `virtual_ndani_reading_fields`

Reading records include:

- virtual device;
- cycle;
- farmer;
- farm;
- optional agent conversation;
- collection mode;
- observed time;
- recorded time;
- confirmation time;
- quality status;
- risk flags;
- notes;
- schema and policy version.

Field records include:

- channel key;
- value JSON;
- unit;
- measurement kind;
- source class;
- source reference;
- confidence;
- evidence;
- review status.

Measurement kinds:

- `measured`
- `observed`
- `derived`
- `unavailable`

Source classes:

- `physical_sensor`
- `manual_proxy`
- `external_context`
- `derived`
- `synthetic_demo` in domain definitions.

Database checks prevent “unavailable” fields from carrying values and require non-unavailable fields to include both value and source class.

### Contributions and batches

Tables:

- `virtual_ndani_batches`
- `virtual_ndani_batch_readings`
- `virtual_ndani_feature_decisions`

Purpose:

- group accepted readings;
- determine which fields are eligible as research/model features;
- exclude unavailable or inappropriate fields;
- track whether a batch is model-ready, proof-pending, proof-verified, etc.

The UI makes this conservative:

- reading recorded;
- quality accepted;
- research dataset eligibility;
- physical-device proof not applicable for manual reading;
- model training pending;
- federated aggregation pending;
- contribution score/reward pending.

The system explicitly says no proof, model update, aggregation, score, payment, or blockchain transaction is being claimed when those have not occurred.

### Coordinator reviews

Table: `virtual_ndani_reading_reviews`

Purpose:

- coordinator approves or excludes flagged readings;
- stores previous and resulting quality status;
- records reason and coordinator ID.

### AI Farm Manager data

Tables:

- `farmer_ai_profiles`
- `farmer_ai_memories`
- `weekly_farm_checkins`
- `ai_farm_plans`
- `ai_recommendation_outcomes`
- `ai_prompt_invocations`

Purpose:

- store long-lived farmer/farm profiles;
- store durable memories;
- store weekly observations;
- store AI-generated plans;
- track whether recommendations were followed;
- log prompt telemetry, cost, validation status, and safety flags.

## Virtual Ndani State Machine

Device states:

- provisioned;
- ready;
- reading_due;
- collecting_manual;
- collecting_physical;
- validating;
- needs_clarification;
- needs_coordinator_review;
- reading_accepted;
- batch_preparing;
- batch_ready;
- contribution_recorded;
- offline;
- suspended.

Cycle states:

- scheduled;
- started;
- capturing;
- awaiting_confirmation;
- validated;
- flagged;
- accepted;
- batched;
- cancelled;
- missed.

The branch defines legal transitions in `apps/freedom-node/src/virtual-ndani/domain.ts`.

## AI Farm Manager

The AI Farm Manager pivot is not just a chatbot. The architecture is:

```text
Structured Farm Memory
        +
Weekly Observations / Virtual Ndani Kit Data
        +
Curated Agronomy Playbooks
        +
LLM Reasoning
        +
Deterministic Guardrails
        +
Coordinator Review
        =
Personal AI Farm Manager
```

Core principle:

> EdgeChain remembers. The LLM reasons.

Gemini is not the system of record. EdgeChain stores facts, profiles, check-ins, readings, plans, outcomes, evidence, prompt versions, and invocation metadata.

### Farmer promise

Each farmer should feel:

> “A farm manager who knows my farm, knows what happened last week, understands my main challenge, explains simply, and gives me practical next steps.”

The AI must not present itself as:

> “A magic prediction engine that knows things we did not measure.”

### AI Farm Manager profile

Coordinator onboarding captures:

- preferred language;
- literacy level;
- technology comfort;
- primary goal;
- primary pain point;
- secondary pain points;
- water access;
- irrigation method;
- budget constraint;
- labour constraint;
- main crops;
- current crop;
- crop stage;
- soil type;
- farm story summary;
- AI manager brief;
- status.

Valid profile statuses:

- draft;
- active;
- needs_update;
- archived.

### Context packs

Weekly plan context includes:

- active AI profile;
- current check-in;
- recent check-ins;
- important memories;
- recent plans;
- playbook snippets.

Chat context includes:

- active profile;
- recent check-ins;
- important memories;
- recent plans;
- farmer question.

Retrieval is deliberately scoped so another farmer’s data is not included.

### Weekly plan generation

The system tries:

1. Build context pack.
2. Call `weeklyPlanGateway`.
3. Validate output schema.
4. Record prompt invocation.
5. Persist plan.

If model output fails or Gemini is unavailable:

- record invocation failure/fallback;
- create a deterministic pilot-safe plan.

The deterministic plan is not a dead end. It creates practical advice based on soil condition, plant condition, pests, constraints, and known profile fields.

### Farm Assistant chat

Chat follows the same safety pattern:

1. Build scoped chat context.
2. Call `chatGateway`.
3. Validate JSON output.
4. Record prompt invocation.
5. Return validated reply.
6. Fall back to deterministic response if needed.

### Safety flags

Safety logic flags:

- chemical, pesticide, herbicide, fungicide, spray, dose, or dosage questions;
- expensive input or purchase questions;
- severe pest/disease signs;
- poor plant condition;
- waterlogging risk;
- low confidence or missing critical information.

Coordinator review is required for risky situations.

### Language

Supported language values include:

- `en`
- `sn`
- `sn-en`

The system uses simple English and Shona support where appropriate. The spec includes a phrase bank for common pilot terms.

## Physical Ndani Kit Later

Physical hardware remains central, but it is Phase B.

The branch contains:

- `firmware/esp32-ndani/`
- physical binding migrations and services;
- physical reading ingestion feature flags;
- physical/manual comparison UI;
- future firmware profile `esp32-ndani-v1`;
- proof-server parser comments for ESP32 Ndani packets.

Physical binding is guarded by:

- `VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED`
- coordinator challenge and verify endpoints.

Physical ingestion is guarded by:

- `VIRTUAL_NDANI_PHYSICAL_INGESTION_ENABLED`

The UI says physical hardware will automate temperature, humidity, pressure, and soil moisture. Human knowledge about plants, pests, and farm actions remains valuable.

## Midnight and Privacy Positioning

Phase A does not require a Midnight transaction from pilot farmers.

Midnight becomes structurally necessary in Phase B when EdgeChain needs to simultaneously:

- verify data quality;
- prevent double-claiming;
- support private reward eligibility;
- avoid revealing device-to-farmer linkage.

The branch README states this is the strongest “why Midnight” moment. The pilot uses day-one value to earn farmer trust first, then introduces Midnight when its privacy guarantees are actually load-bearing.

## MARS, FL, and Research Link

The branch adds or references:

- `packages/fl/` for production FL aggregation/model update types;
- `packages/mars/` for production contribution scoring and reward allocation primitives;
- `research/python-lab/` for synthetic Odzi data, FL experiments, MARS scoring, attacks, and oversight evaluation.

Virtual Ndani readings can become research/model features only after quality and source decisions. Unavailable hardware measurements are excluded.

This is the bridge from pilot observations to future federated model participation.

## Routes and Feature Flags

### Backend routes

Core pilot routes:

- `/api/v1/auth`
- `/api/v1/farms`
- `/api/v1/agent`
- `/api/v1/ai-farm-manager`
- `/api/v1/virtual-ndani`
- `/api/v1/coordinator`
- `/api/v1/physical-ndani`

They are enabled under `AGENT_ENABLED=true`.

Virtual Ndani routes are enabled unless `VIRTUAL_NDANI_ENABLED=false`.

Coordinator routes are enabled unless `VIRTUAL_NDANI_COORDINATOR_ENABLED=false`.

### Frontend routes

Pilot routes:

- `/pilot-login`
- `/virtual-ndani`
- `/virtual-ndani/reading`
- `/virtual-ndani/demo`
- `/farm-check-in`
- `/farm-assistant`
- `/coordinator`

Wallet-first routes remain:

- `/`
- `/register`
- `/selection`
- `/sensor-node`
- `/train`
- `/train-privacy`
- `/aggregation`
- `/predictions`

### Key feature flags

Backend:

- `AGENT_ENABLED`
- `VIRTUAL_NDANI_ENABLED`
- `VIRTUAL_NDANI_COORDINATOR_ENABLED`
- `VIRTUAL_NDANI_SCHEDULING_ENABLED`
- `VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED`
- `VIRTUAL_NDANI_PHYSICAL_INGESTION_ENABLED`
- `VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED`
- `PILOT_ADMIN_ENROLLMENT_KEY`
- `FARMER_SESSION_SECONDS`
- `GEMINI_API_KEY`
- `GEMINI_TEXT_MODEL`
- `AI_FARM_MANAGER_LLM_ENABLED`

Frontend:

- `VITE_AGENT_ENABLED`
- `VITE_VIRTUAL_NDANI_ENABLED`
- `VITE_VIRTUAL_NDANI_COORDINATOR_ENABLED`
- `VITE_VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED`
- `VITE_VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED`
- `VITE_FARMER_SITE_HOSTS`
- `VITE_WALLET_SITE_HOSTS`

## Deployment Context

The branch README says live services exist on Fly:

- unified app/backend: `edgechain-midnight.fly.dev`;
- IPFS service: `edgechain-ipfs.fly.dev`.

The unified backend serves both React frontend and API. Production frontend API mode is same-origin so the same Fly app can support custom farmer and real/technical domains.

Backend persistence uses PostgreSQL through `DATABASE_URL`. Fly settings attach Postgres and set backend feature flags.

## Current Implementation Footprint on the Branch

Demonstrable in the branch:

- React pilot login and Virtual Ndani UI;
- farmer/coordinator PIN auth;
- PostgreSQL-backed pilot schema;
- virtual device provisioning per farm;
- guided reading schema and save/confirm flow;
- manual provenance controls;
- coordinator fleet/admin/review/evidence routes;
- AI Farm Manager profile foundation;
- weekly check-ins;
- weekly plan generation with deterministic fallback;
- memory-based Farm Assistant chat;
- prompt invocation telemetry;
- physical binding scaffolding;
- physical/manual comparison UI;
- MARS/FL packages and Python research lab;
- ESP32 Ndani firmware path;
- site-mode support for wallet-first vs farmer-first domains.

## In Progress or Not Yet Production

The branch still treats these as incomplete or future work:

- full AI Farm Manager check-ins and generated plans were described as in progress in the README, though later commits add foundation and deterministic behavior;
- real LLM-backed advice depends on `GEMINI_API_KEY` and feature flags;
- physical hardware deployment is future phase;
- physical binding and ingestion are behind flags;
- full end-to-end ZK proof generation and submission across live flows;
- anonymous device registration and reward eligibility;
- simulated contract paths reduction;
- production observability, queueing, and failure handling;
- farmer reports and funder roll-up reports;
- prompt regression testing in CI;
- real model training/aggregation from pilot data.

## Relationship to Earlier Pilot Documents

### Relationship to 7-farmer hardware plan

The 7-farmer plan remains useful for physical deployment architecture and hardware logistics. Virtual Ndani delays that work in the farmer pilot sequence.

### Relationship to 30-farmer receipt plan

The 30-farmer plan is still useful for:

- consent discipline;
- field instrumentation;
- trust metrics;
- daily cadence;
- go/iterate/no-go thinking;
- avoiding finance promises;
- Android-first constraints.

But the Virtual Ndani branch changes the immediate product surface from “receipt activity log” to “AI Farm Manager + Virtual Ndani Kit.”

### Relationship to long-term EdgeChain

Virtual Ndani is not a detour from EdgeChain. It is a staged adoption path:

1. farmers get useful AI/farm memory now;
2. structured farm data accumulates with provenance;
3. physical Ndani Kit automates more observations later;
4. Midnight verifies contributions and prevents double claims when rewards become real;
5. federated learning and MARS scoring can use eligible features without raw data extraction.

## Recommended Canonical Framing

Use this:

> EdgeChain’s pilot has pivoted from hardware-first proof infrastructure to a farmer-first Virtual Ndani Kit and AI Farm Manager pilot. Farmers log in with a number and PIN, record manual observations that are explicitly labeled as manual, receive practical farm-manager support, and build a private farm intelligence record. Physical Ndani Kit hardware and Midnight proof/reward flows remain Phase B, introduced when the workflow has proven farmer value and when privacy guarantees become structurally necessary.

Avoid this:

> Virtual Ndani is simulated sensor data.

Better:

> Virtual Ndani is a manual-observation bridge to future hardware. It never pretends manual observations are sensor measurements.

Avoid this:

> The pilot is no longer about Midnight.

Better:

> Phase A does not force Midnight transactions on farmers. Midnight remains essential for Phase B reward eligibility, nullifier-based replay resistance, and private device-to-farmer unlinkability.

## Open Decisions

These should be resolved before external messaging or field launch:

- Is the canonical cohort size now 20 or 30?
- Does the receipt/anchoring plan remain part of the Virtual Ndani Phase A, or is it deferred?
- What is the exact farmer-facing script for explaining Virtual Ndani?
- Who is the named coordinator/admin?
- What data will be exported in the evidence CSV?
- What evidence package will be shown to Midnight/funders?
- Which channels are collected manually on day one?
- Which channels must remain unavailable until hardware?
- When does a reading require coordinator review?
- What is the field schedule for weekly check-ins?
- Is Gemini enabled during the first field run, or will deterministic fallback be used?
- What consent text covers AI memory and manual observations?
- What deletion/export rights will farmers have during the pilot?

## Immediate Next Steps

Recommended next implementation/documentation steps:

1. Decide whether this supersedes or complements the 30-farmer receipt plan.
2. Create a canonical pilot brief with one cohort number.
3. Bring the Virtual Ndani branch into the active working branch or document why it remains separate.
4. Write the farmer-facing explanation of “Virtual Ndani Kit” in simple English and Shona support language.
5. Lock the manual channel policy for day one.
6. Define the coordinator review thresholds.
7. Decide LLM mode for the field pilot: deterministic only, Gemini enabled, or hybrid.
8. Add a consent addendum for AI Farm Manager memory.
9. Produce the evidence report template for funders.
10. Run local pilot tests with feature flags enabled.

## Useful Branch Files

Key branch files reviewed:

- `README.md`
- `ARCHITECTURE.md`
- `docs/ai-farm-manager-personalization-spec.md`
- `.env.example`
- `apps/freedom-node/src/index.ts`
- `apps/freedom-node/src/routes/virtualNdani.ts`
- `apps/freedom-node/src/routes/coordinator.ts`
- `apps/freedom-node/src/routes/aiFarmManager.ts`
- `apps/freedom-node/src/auth/authService.ts`
- `apps/freedom-node/src/virtual-ndani/domain.ts`
- `apps/freedom-node/src/virtual-ndani/service.ts`
- `apps/freedom-node/src/ai-farm-manager/contextPackService.ts`
- `apps/freedom-node/src/ai-farm-manager/weeklyPlanService.ts`
- `apps/freedom-node/src/ai-farm-manager/chatService.ts`
- `apps/freedom-node/src/database/migrations/005_virtual_ndani_foundation.sql`
- `apps/freedom-node/src/database/migrations/006_virtual_ndani_readings.sql`
- `apps/freedom-node/src/database/migrations/008_virtual_ndani_contributions.sql`
- `apps/freedom-node/src/database/migrations/009_coordinator_reviews.sql`
- `apps/freedom-node/src/database/migrations/014_ai_farm_manager_foundation.sql`
- `apps/web/src/App.tsx`
- `apps/web/src/screens/PilotLogin.tsx`
- `apps/web/src/screens/VirtualNdani.tsx`
- `apps/web/src/agent/api.ts`

