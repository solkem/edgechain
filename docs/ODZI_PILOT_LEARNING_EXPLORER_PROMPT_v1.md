# EdgeChain Odzi Pilot Learning Explorer Prompt (Complete v1)

Use this prompt to generate a standalone educational explorer for the **EdgeChain Odzi Pilot**.

---

## 1) Mission

Build a single-file `HTML/CSS/JS` interactive learning app that explains, in plain language, how the **Minimum Midnight App** works for real farmers in **Odzi, Zimbabwe**.

Delivery timing rule:
- This explorer is a **post-pilot evidence artifact**.
- Build/update it after field data is collected so examples, metrics, and quotes are real.

The app must teach the paradox clearly:

1. We must prove real farmer participation.
2. We must not expose farmer identity on-chain.

The app must show how Midnight enables this through selective privacy, proof artifacts, and controlled disclosure.

---

## 2) Fixed Context (Do Not Change)

1. Farmer persona: **Anesu**
2. Location: **Odzi, Zimbabwe**
3. Pilot stage: **pre-funding field validation**
4. Scope: `HARVEST`, `BALE_PREP`, `DISPATCH` + receipts + daily initial custodial desktop anchor lane + optional champion wallet flow
5. Not in scope: lending, DeFi rollout, token speculation, credit underwriting

Do not mention:

1. Amara
2. Lusaka
3. "Old app", "previous app", "before/after cleanup", "legacy app version"

Treat this as first-principles documentation.

---

## 3) Target Audience

1. Technical reviewers (Midnight ecosystem, engineers, product experts)
2. Field operators (pilot team)
3. Non-expert stakeholders (co-op leaders, advisors)

The tone must remain clear and practical. Avoid hype and avoid abstract jargon without examples.

---

## 4) Learning Outcomes

By the end of the explorer, a learner should understand:

1. Why this is a **Minimum Midnight App**, not a generic data form.
2. How event receipts work as proof artifacts.
3. How membership proof + nullifier prevent abuse without exposing identity.
4. How selective disclosure supports compliance and audits.
5. How day-one field execution and weekly metrics are measured.
6. Why the pilot uses a mobile-constrained trust model (farmer mobile capture + desktop anchoring).
7. Why Phase A can be custodial at submission while still producing trust-minimized verification outputs.

---

## 5) Technical Constraints

1. Single-file HTML output only (`index.html` style artifact).
2. No bundler, no npm, no external JS frameworks.
3. Google Fonts only:
   - `IBM Plex Mono` (code)
   - `Fraunces` (display)
   - `DM Sans` (body)
4. Vanilla JS only.
5. Use `addEventListener` only (never inline `onclick`).
6. CSS in `<style>` inside `<head>`.
7. App content must be driven by `const SECS = [...]`.
8. Each step object must include:
   - `lang`
   - `visual`
   - `code`
   - `caption`
   - optional `hook`
   - optional `certainty` (`Exact`, `Adapted`, `Conceptual`)
9. Every code line must be wrapped:
   - `<span class="line">...</span>`
10. Escape nested template literals correctly:
    - Use `` \` `` and `\${` inside JS template literals.

---

## 6) Visual Direction

Theme: dark, editorial, intentional, practical.

Use this palette:

1. `--bg: #0F0E0C`
2. `--bg2: #1A1815`
3. `--bg3: #252220`
4. `--border: #2E2B27`
5. `--text: #E8E2D9`
6. `--text2: #A09890`
7. `--text3: #6B6460`
8. `--amber: #E8A733`
9. `--green: #4AAF7E`
10. `--purple: #8B80F8`
11. `--red: #E07070`
12. `--blue: #5B9FE8`
13. `--teal: #5DCFB8`

Color semantics:

1. Amber = farmer/device/private inputs
2. Purple = Midnight/Compact/privacy proofs
3. Teal = app/backend orchestration
4. Green = valid/pass/success
5. Red = invalid/replay/reject
6. Blue = receipts/value/audit artifacts

---

## 7) Navigation and UX Requirements

Required controls:

1. Sticky section tabs
2. Step dots
3. Back/Next buttons
4. Restart section button
5. Step counter
6. Keyboard navigation:
   - `ArrowRight` next
   - `ArrowLeft` back
   - number keys for section jumps

Responsive requirements:

1. At widths `< 720px`, collapse multi-column grids to one column.
2. Section tab row must remain usable with horizontal scrolling.
3. Font sizes and spacing must remain readable on mobile.

---

## 8) Content Rules

1. Use realistic sample values and keep them internally consistent across steps.
2. Keep language plain and explain technical terms on first use.
3. Mark code examples as:
   - `Exact` if directly grounded in actual code paths.
   - `Adapted` if simplified but faithful.
   - `Conceptual` if teaching abstraction.
4. Never claim financing outcomes in this app.
5. Do not imply farmers are anonymous to everyone; explain that disclosure is controlled and role-based.
6. Do not imply per-farmer native trustless mobile wallet flow if architecture does not support it yet.

---

## 9) Mandatory Sections and Steps

The explorer must have the following sections in this order.

## Section 1: Why This Pilot Exists

### Step 1.1 - The paradox
- Visual: split card showing "prove real farmers" vs "protect identity"
- Code: conceptual statements of both requirements
- Caption: explain rational privacy framing in plain language

### Step 1.2 - Minimum Midnight App definition
- Visual: one card with strict v0 scope
- Code: bullet-like pseudo config for v0 scope and non-goals
- Caption: explain why this is intentionally narrow

### Step 1.3 - Harvest-season fit
- Visual: workflow cards for real operations already happening (`HARVEST`, `BALE_PREP`, `DISPATCH`)
- Code: event enum shape
- Caption: explain zero artificial behavior change principle

## Section 2: Minimum Midnight App Flow

### Step 2.1 - Start session
- Visual: consent + farmer ID screen
- Code: request payload shape for session start
- Caption: explain minimal data collection

### Step 2.2 - Record event
- Visual: form structure with conditional fields by event type
- Code: TypeScript interface for event payload
- Caption: explain required vs conditional data

### Step 2.3 - Receipt generation
- Visual: receipt card with record ID, timestamp, proof string
- Code: pseudo function that derives deterministic receipt ID
- Caption: explain what receipt proves and what it does not prove

### Step 2.4 - History view
- Visual: list of last records and statuses
- Code: array model and render logic shape
- Caption: explain continuity and dispute reduction

## Section 3: Midnight Privacy Building Blocks

### Step 3.1 - Witness vs ledger vs disclose
- Visual: three cards (private witness, public ledger, explicit disclose boundary)
- Code: Compact-style snippet showing witness + ledger + disclose points
- Caption: explain disclosure-by-exception model

### Step 3.2 - Membership proof with Merkle
- Visual: authorized member set -> Merkle root -> proof path
- Code: conceptual verify function
- Caption: explain "authorized without identifying who"

### Step 3.3 - Nullifier anti-replay
- Visual: first submit accepted, second duplicate rejected
- Code: nullifier lookup + insert pattern
- Caption: explain one-time action guarantee

### Step 3.4 - Interactive nullifier lab (required hook)
- Visual: input for alias + epoch slider + output hash
- Code: teaching pseudo-hash logic
- Caption: explain why epoch rotation matters

## Section 4: Proving Real Humans Without Doxxing

### Step 4.1 - In-person attestation flow
- Visual: cooperative registrar attests participant, app issues commitment
- Code: attestation record shape (off-chain)
- Caption: explain bootstrap trust model

### Step 4.2 - Desktop anchoring trust lane
- Visual: mobile events -> daily Merkle root -> custodial desktop anchor tx
- Code: pseudocode for day root anchoring + tx log
- Caption: explain why this is used under mobile constraints and how controls reduce custodial risk

### Step 4.3 - Session liveness challenge
- Visual: daily challenge phrase + signed payload
- Code: payload schema including challenge code
- Caption: explain practical anti-automation layer

### Step 4.4 - Interactive anti-bot score (required hook)
- Visual: toggles for checks passed; confidence meter updates
- Code: simple weighted score logic
- Caption: explain layered assurance and limits

## Section 5: Selective Disclosure and Compliance

### Step 5.1 - Disclosure matrix
- Visual: table (Public / Private / Selectively Disclosable)
- Code: policy object shape
- Caption: explain role-based data access

### Step 5.2 - Reveal package flow
- Visual: reviewer requests minimal fields, app produces reveal proof package
- Code: reveal request/response schema
- Caption: explain minimum necessary disclosure principle

### Step 5.3 - Interactive disclosure slider (required hook)
- Visual: slider from "minimal" to "expanded", cards update what fields are revealed
- Code: field-set mapping logic
- Caption: explain privacy/compliance tradeoff

## Section 6: Day-1 Execution in Odzi

### Step 6.1 - Tomorrow schedule
- Visual: timeline for kickoff-day sessions
- Code: structured timeline data
- Caption: explain why short learning loops matter

### Step 6.2 - Roles and field operations
- Visual: Field Lead, Operator, Enumerator, Liaison cards
- Code: role assignment object
- Caption: explain accountability

### Step 6.3 - Metrics and gates
- Visual: KPI cards (activation, retention, trust, invalid rate, anchoring coverage)
- Code: formula pseudocode
- Caption: explain GO / ITERATE / NO-GO logic

### Step 6.4 - Interactive KPI simulator (required hook)
- Visual: sliders for activation/trust/invalid rate; decision state updates live
- Code: gate decision function
- Caption: explain threshold-driven decisions

## Section 7: Build Map and Next Steps

### Step 7.1 - Code map
- Visual: app/frontend/backend/contract map for new pilot repo
- Code: directory tree
- Caption: explain where each responsibility lives

### Step 7.2 - 10-day implementation sequence
- Visual: phased cards (MVP, hardening, field reliability)
- Code: task list with milestones
- Caption: explain speed vs safety balance

### Step 7.3 - Evidence pack for Midnight
- Visual: checklist of artifacts to present post-pilot
- Code: dossier schema object
- Caption: explain why evidence quality determines funding quality

---

## 10) Required Interactive Hooks

Implement these hook IDs in `SECS` steps:

1. `nullifierLab`
2. `antiBotLab`
3. `disclosureLab`
4. `kpiLab`

Each hook must initialize after render and remain stable across section navigation.

---

## 11) Code Panel Rules

1. Keep snippets short and legible.
2. Use syntax classes:
   - `.ck` keywords
   - `.cs` types/strings
   - `.cf` functions
   - `.cv` variables
   - `.cn` computed names
   - `.cc` comments
3. Do not pretend conceptual snippets are production-complete.
4. Include one-line certainty marker in each step caption:
   - `Certainty: Exact`
   - `Certainty: Adapted`
   - `Certainty: Conceptual`

---

## 12) Source-of-Truth Inputs for Content

When writing content, align with these local docs:

1. `docs/ODZI_PILOT_PLAN_FOR_EXPERT_REVIEW.md`
2. `docs/odzi-midnight-execution-plan-v1.txt`
3. `docs/MINIMUM_MIDNIGHT_PRIVACY_BLUEPRINT.md`

Use these official references for conceptual correctness:

1. https://docs.midnight.network/
2. https://docs.midnight.network/compact/reference/explicit-disclosure
3. https://docs.midnight.network/concepts/how-midnight-works/keeping-data-private
4. https://docs.midnight.network/api-reference/dapp-connector
5. `docs/MOBILE_CONSTRAINED_TRUST_MODEL.md`

---

## 13) Output Format

Generate one complete HTML file only.

It must include:

1. `<head>` with fonts + styles
2. App shell + nav + panels
3. Full `SECS` array with all required sections/steps
4. Render engine + navigation handlers
5. All interactive hook implementations
6. Keyboard navigation
7. Mobile responsive styles

When used post-pilot:
8. Replace placeholder metrics with real pilot values.
9. Replace hypothetical examples with anonymized real session evidence.

---

## 14) Final Acceptance Checklist

Do not finalize unless all checks pass:

1. Uses **Anesu** and **Odzi, Zimbabwe** only.
2. Explicitly labels app as **Minimum Midnight App**.
3. No references to older/previous versions.
4. Includes all required sections and step topics.
5. Includes all required interactive hooks.
6. Explains selective disclosure clearly.
7. Explains anti-bot/human assurance clearly and honestly.
8. Maintains non-financial scope messaging.
9. No JS syntax errors.
10. Works on desktop and mobile.
11. Uses vanilla JS and no forbidden dependencies.
12. Includes certainty markers in captions.

---

## 15) One-Line Positioning to Preserve

EdgeChain Odzi Pilot Learning Explorer teaches how a **Minimum Midnight App** can prove real farmer participation with selective privacy, without exposing farmer identities.
