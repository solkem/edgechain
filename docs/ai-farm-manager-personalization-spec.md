# EdgeChain AI Farm Manager Personalization Specification

## 1. Executive summary

The EdgeChain Odzi pilot has two goals:

1. Convince potential funders that EdgeChain can turn farmer-specific field evidence into scalable AI-assisted agricultural intelligence.
2. Convince pilot farmers that the AI agent is not a generic chatbot, but a practical farm manager that knows their farm, remembers their constraints, follows up on prior advice, and helps them make better decisions.

This feature does not try to build a full predictive agronomy engine during the first pilot. Instead, it builds an auditable, structured, personalized AI Farm Manager experience using:

- farmer and farm profiles,
- structured farm memory,
- weekly check-ins,
- Virtual Ndani Kit readings,
- curated agronomy playbooks,
- Gemini/LLM reasoning,
- deterministic safety guardrails,
- coordinator review,
- farmer/coordinator feedback loops.

The core principle is:

> EdgeChain remembers. The LLM reasons.

Gemini must not be treated as the system of record. EdgeChain stores the farmer’s facts, history, plans, outcomes, evidence, and prompt versions. Gemini receives controlled context and produces validated, structured farm-manager outputs.

## 2. Product promise

Each farmer should experience the AI as:

> “A farm manager who knows my farm, knows what happened last week, understands my main challenge, explains simply, and gives me practical next steps.”

The system should avoid presenting the AI as:

> “A magic prediction engine that knows things we did not measure.”

The farmer-facing promise is:

```text
Today:
You enter observations manually. EdgeChain remembers, organizes, advises, and follows up.

Next:
Ndani Kit hardware automates more readings.

Future:
Your farm builds a private, farmer-controlled intelligence record. In production EdgeChain, the farmer should control their data, Ndani Kit hardware identity, AI agent memory, and participation in federated learning or research. Privacy-preserving and decentralized infrastructure should allow the farmer to benefit from better decisions, funding, insurance, markets, and research without surrendering ownership of their farm intelligence.
```

The long-term production vision is not only “better AI advice.” It is farmer-owned agricultural intelligence:

- the farmer controls access to their farm data,
- the farmer controls which AI agents and services can use their data,
- the farmer controls their Ndani Kit and farm identity,
- model learning can happen in a federated way without exposing raw farm records,
- funders, insurers, buyers, and researchers can receive proofs, aggregates, or consented reports rather than unrestricted farmer data,
- EdgeChain becomes a privacy-preserving coordination layer between farmers, hardware, AI agents, and agricultural markets.

## 3. User personas

### 3.1 Pilot farmer

Needs:

- simple language,
- practical advice,
- low-cost options,
- reminders and follow-up,
- trust that the AI knows their farm,
- Shona + English support where useful,
- no complex wallet/account friction during the pilot.

### 3.2 Pilot coordinator / administrator

Needs:

- create and administer farmer profiles,
- capture onboarding/farm-story data,
- review risky AI advice,
- track engagement,
- generate farmer reports,
- produce funder evidence.

### 3.3 Potential funder

Needs evidence that:

- each farmer receives individualized AI support,
- the pilot produces structured agricultural intelligence,
- manual data collection can transition to physical Ndani Kit automation,
- farmer engagement and outcomes are measurable,
- safety, privacy, and governance are credible.

## 4. Core experience

### 4.1 AI Farm Manager onboarding

When a farmer is created, or when a coordinator starts the AI Farm Manager setup, EdgeChain should capture a short “farm story.”

Required onboarding domains:

- farmer identity,
- preferred language,
- literacy/technology comfort,
- farm name and location/site,
- farm size if known,
- water source,
- irrigation access,
- soil type if known,
- main crops,
- current crop,
- current crop stage,
- farmer goals,
- farmer constraints,
- remembered historical problems,
- primary pain point,
- secondary pain points.

This onboarding must produce an AI Farm Manager Brief.

### 4.2 AI Farm Manager Brief

Each farmer should have a visible brief.

Example:

```text
Solomon’s AI Farm Manager Brief

Farm: Kembo Farm
Current crop: Tomato
Crop stage: Flowering
Main challenge: Water timing
Water access: Limited borehole irrigation
AI focus this week: Moisture consistency, pest scouting, and simple record keeping
Language: Shona + English
```

The brief should be stored, versioned, and regenerated when major profile fields change.

### 4.3 Weekly check-in

Every farmer should have a weekly check-in flow.

Inputs:

- current crop,
- crop stage,
- soil condition,
- plant condition,
- pest/disease signs,
- rain condition,
- irrigation done,
- biggest worry this week,
- labour/input constraint this week,
- whether last advice was followed,
- what changed after last advice,
- optional free-text notes.

The weekly check-in should combine with the latest Virtual Ndani Kit reading.

Output:

- farm status summary,
- risk level,
- main issue,
- recommended actions,
- simple explanation,
- Shona summary if appropriate,
- follow-up question,
- coordinator review flag if needed.

### 4.4 Memory-based chat

When a farmer chats with the assistant, the response should reflect farmer-specific memory.

Examples:

```text
Because your tomatoes are flowering and last week your soil was dry...
```

```text
Since your water access is limited on Kembo Farm...
```

```text
You told me aphids affected your tomatoes before, so this week check under the leaves.
```

Every response should try to use at least three relevant personalization layers when available:

1. farm identity,
2. current crop/stage,
3. latest observation/Ndani Kit reading,
4. farmer constraint,
5. long-term memory,
6. last recommendation/outcome.

### 4.5 Timeline

Each farmer should have a simple timeline:

```text
Week 1
- Soil: Dry
- Plant condition: Fair
- Main concern: Water stress
- AI advice: Water early morning and mulch if possible

Week 2
- Soil: Moist
- Plant condition: Improved
- Farmer action: Irrigated twice
- AI follow-up: Continue moisture monitoring
```

The timeline supports farmer trust and funder evidence.

### 4.6 Farmer-specific report

At the end of the pilot, each farmer should receive an AI Farm Manager Report.

Sections:

1. Farmer and farm profile
2. Main challenge
3. Current crop journey
4. Weekly observation summary
5. Ndani Kit reading summary
6. Advice generated
7. Farmer actions recorded
8. Changes observed
9. Lessons learned
10. Next-season recommendations
11. Why this farm should receive a physical Ndani Kit

## 5. System architecture

Use this architecture:

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

The LLM must not directly decide what farmer history exists. It receives a controlled Farm Manager Context Pack built from EdgeChain data.

## 6. Data model

### 6.1 `farmer_ai_profiles`

Stores the long-lived personalization profile.

Fields:

```text
profile_id UUID PRIMARY KEY
farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE
farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE
preferred_language TEXT NOT NULL
literacy_level TEXT
technology_comfort TEXT
primary_goal TEXT
primary_pain_point TEXT
secondary_pain_points_json TEXT NOT NULL DEFAULT '[]'
water_access TEXT
irrigation_method TEXT
budget_constraint TEXT
labour_constraint TEXT
main_crops_json TEXT NOT NULL DEFAULT '[]'
current_crop TEXT
current_crop_stage TEXT
soil_type TEXT
farm_story_summary TEXT
ai_manager_brief TEXT
brief_version INTEGER NOT NULL DEFAULT 1
status TEXT NOT NULL DEFAULT 'draft'
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL
```

Valid `status` values:

```text
draft
active
needs_update
archived
```

### 6.2 `farmer_ai_memories`

Stores durable memories available for retrieval.

Fields:

```text
memory_id UUID PRIMARY KEY
farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE
farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE
memory_type TEXT NOT NULL
memory_key TEXT NOT NULL
memory_value TEXT NOT NULL
importance INTEGER NOT NULL DEFAULT 3
source TEXT NOT NULL
source_id UUID
valid_from BIGINT NOT NULL
valid_to BIGINT
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL
```

Memory types:

```text
constraint
goal
crop_history
pest_history
water_pattern
soil_pattern
farmer_preference
recommendation_outcome
coordinator_note
```

Sources:

```text
onboarding
weekly_checkin
virtual_ndani_reading
ai_plan
coordinator
farmer_chat
```

### 6.3 `weekly_farm_checkins`

Stores structured weekly farmer check-ins.

Fields:

```text
checkin_id UUID PRIMARY KEY
farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE
farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE
virtual_device_id UUID REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE SET NULL
week_start BIGINT NOT NULL
crop TEXT
crop_stage TEXT
soil_condition TEXT
plant_condition TEXT
pest_disease_signs TEXT
rain_condition TEXT
irrigation_done TEXT
farmer_biggest_worry TEXT
labour_or_input_constraint TEXT
followed_previous_advice BOOLEAN
observed_change TEXT
manual_notes TEXT
risk_level TEXT
created_by TEXT NOT NULL
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL
```

### 6.4 `ai_farm_plans`

Stores LLM-generated weekly plans.

Fields:

```text
plan_id UUID PRIMARY KEY
farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE
farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE
checkin_id UUID REFERENCES weekly_farm_checkins(checkin_id) ON DELETE SET NULL
conversation_id UUID REFERENCES agent_conversations(conversation_id) ON DELETE SET NULL
prompt_family TEXT NOT NULL
prompt_version TEXT NOT NULL
model_provider TEXT NOT NULL
model_name TEXT NOT NULL
risk_level TEXT NOT NULL
confidence TEXT NOT NULL
summary TEXT NOT NULL
main_issue TEXT
recommended_actions_json TEXT NOT NULL
simple_explanation TEXT
shona_summary TEXT
follow_up_question TEXT
missing_information_json TEXT NOT NULL DEFAULT '[]'
evidence_used_json TEXT NOT NULL DEFAULT '[]'
safety_flags_json TEXT NOT NULL DEFAULT '[]'
coordinator_review_required BOOLEAN NOT NULL DEFAULT FALSE
raw_model_output_json TEXT
validation_status TEXT NOT NULL
created_at BIGINT NOT NULL
```

Valid `validation_status` values:

```text
valid
repaired
fallback
rejected
```

### 6.5 `ai_recommendation_outcomes`

Tracks whether advice was followed and what happened.

Fields:

```text
outcome_id UUID PRIMARY KEY
plan_id UUID NOT NULL REFERENCES ai_farm_plans(plan_id) ON DELETE CASCADE
farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE
action_index INTEGER NOT NULL
farmer_followed BOOLEAN
outcome_observed TEXT
farmer_feedback TEXT
coordinator_notes TEXT
created_at BIGINT NOT NULL
updated_at BIGINT NOT NULL
```

### 6.6 `ai_prompt_invocations`

Stores AI observability metadata.

Fields:

```text
invocation_id UUID PRIMARY KEY
farmer_id UUID REFERENCES farmers(farmer_id) ON DELETE SET NULL
farm_id UUID REFERENCES farms(farm_id) ON DELETE SET NULL
prompt_family TEXT NOT NULL
prompt_version TEXT NOT NULL
model_provider TEXT NOT NULL
model_name TEXT NOT NULL
input_token_count INTEGER
output_token_count INTEGER
estimated_cost_usd NUMERIC
latency_ms INTEGER
status TEXT NOT NULL
error_code TEXT
context_source_counts_json TEXT NOT NULL DEFAULT '{}'
safety_flags_json TEXT NOT NULL DEFAULT '[]'
created_at BIGINT NOT NULL
```

Do not store raw prompts by default unless explicitly enabled for secure debugging. Prefer storing context source IDs and derived metadata.

## 7. Backend services

### 7.1 `FarmManagerProfileService`

Responsibilities:

- create profile during onboarding,
- update profile,
- generate AI Manager Brief,
- retrieve active profile.

Methods:

```text
createProfile(input)
updateProfile(profileId, input)
getProfileForFarmer(farmerId)
generateBrief(farmerId)
activateProfile(profileId)
```

### 7.2 `FarmMemoryService`

Responsibilities:

- create structured memories,
- retrieve context memories,
- expire stale memories,
- promote repeated observations into durable memories.

Methods:

```text
addMemory(input)
listMemories(farmerId)
getContextMemories(farmerId, query, limit)
expireMemory(memoryId)
promoteObservationToMemory(checkinId)
```

### 7.3 `WeeklyCheckinService`

Responsibilities:

- create check-ins,
- attach latest Virtual Ndani Kit context,
- generate farm plan,
- store check-in history.

Methods:

```text
createCheckin(input)
getCurrentWeekCheckin(farmerId)
listCheckins(farmerId, limit)
generateFarmPlan(checkinId)
```

### 7.4 `FarmManagerContextService`

Builds the controlled context pack for Gemini.

Method:

```text
buildContextPack(input: {
  farmerId: string;
  farmId?: string;
  task: 'weekly_plan' | 'chat' | 'brief' | 'report';
  userQuestion?: string;
}): FarmManagerContextPack
```

### 7.5 `AgronomyPlaybookService`

Provides curated agronomy snippets.

Methods:

```text
findRelevantSnippets(input)
listPlaybooks()
getSnippet(key)
```

Playbook keys should be deterministic:

```text
tomato.flowering.water_stress
tomato.pest.aphids
maize.vegetative.nitrogen
general.irrigation.low_water
general.soil_moisture.dry
general.record_keeping.weekly_observation
```

### 7.6 `FarmManagerAiService`

Orchestrates LLM calls.

Responsibilities:

- assemble prompt,
- call Gemini,
- validate output,
- repair once if needed,
- apply deterministic safety guardrails,
- persist invocation metadata,
- store final plan/output.

Methods:

```text
generateWeeklyPlan(checkinId)
answerFarmManagerChat(input)
generateFarmerReport(farmerId)
repairInvalidJson(input)
```

## 8. Context retrieval and prompt budgeting

### 8.1 Retrieval rules

Do not send all farmer history. Retrieve the smallest useful context.

For weekly plans:

```text
1 active farmer_ai_profile
latest Virtual Ndani Kit reading
current weekly check-in
last 3 weekly check-ins
last 2 AI farm plans
last 2 recommendation outcomes
top 5 active farmer memories
top 3 agronomy playbook snippets
```

For chat:

```text
1 active farmer_ai_profile
latest Virtual Ndani Kit reading
last 2 weekly check-ins
last 1 AI farm plan
top 5 memories relevant to user question
top 2 agronomy playbook snippets relevant to user question
```

For reports:

```text
active farmer_ai_profile
all weekly check-ins in report period
all AI plans in report period
all recommendation outcomes in report period
Ndani Kit reading summary aggregates
top 10 durable memories
```

### 8.2 Memory ranking

Rank memories by:

```text
score =
  importance_weight
  + recency_weight
  + crop_match_weight
  + pain_point_match_weight
  + user_question_similarity_weight
  + active_status_weight
```

Initial implementation can use deterministic scoring with keyword matching. Future implementation can add embeddings.

### 8.3 Context budget

Initial budget:

```text
Maximum context pack: 6,000 tokens
Maximum output: 1,200 tokens for weekly plan
Maximum memories: 5
Maximum recent check-ins: 3
Maximum recent plans: 2
Maximum playbook snippets: 3
```

If context exceeds budget:

1. keep profile,
2. keep latest check-in,
3. keep latest Ndani Kit reading,
4. keep highest-priority memories,
5. summarize older items,
6. drop low-importance memories.

## 9. Standard prompt architecture

Use four layers:

```text
System Prompt
  = stable behavior, safety, role, boundaries

Farm Manager Context Pack
  = farmer-specific truth from EdgeChain DB

Task Prompt
  = specific operation being requested

Required Output Schema
  = strict JSON structure to validate and render
```

### 9.1 Prompt versioning

Every prompt must be versioned.

Example:

```text
prompt_family: farm_manager_weekly_plan
prompt_version: 1.0.0
```

Store prompt family/version with every AI output.

### 9.2 Standard system prompt

```text
You are EdgeChain AI Farm Manager, an agricultural assistant for the Odzi farmer pilot.

You act like a practical farm manager with strong agronomy knowledge and field experience. Your job is to help this specific farmer make better weekly farming decisions using their farm profile, constraints, observations, Virtual Ndani Kit readings, past recommendations, and curated agronomy guidance.

You must:
- Give practical, low-cost, locally realistic advice.
- Personalize advice using the provided farmer and farm context.
- Clearly distinguish manual or human observations from physical sensor readings.
- Never claim the Virtual Ndani Kit physically measured something if the reading source is manual, guided, agent-assisted, or coordinator-entered.
- Use simple language suitable for rural farmers.
- Use Shona phrases when the farmer prefers Shona or Shona + English.
- Explain why each recommendation matters.
- Prefer safe, low-risk actions before expensive or chemical actions.
- Ask one useful follow-up question.
- Flag cases needing coordinator review.
- State when important information is missing.

You must not:
- Invent farm facts not provided in the context.
- Invent weather, soil, disease, pest, price, or sensor data.
- Recommend dangerous chemical usage without coordinator review.
- Present uncertain diagnosis as certain.
- Give expensive recommendations without considering farmer constraints.
- Ignore previous observations, pain points, or recommendation outcomes.
- Say a manual observation was measured by hardware.

If data is missing, say what is missing and give the safest practical next step.
```

### 9.3 Farm Manager Context Pack

Example:

```json
{
  "farmer": {
    "farmer_id": "uuid",
    "name": "Solomon",
    "preferred_language": "sn-en",
    "literacy_level": "low",
    "technology_comfort": "low"
  },
  "farm": {
    "farm_id": "uuid",
    "name": "Kembo Farm",
    "site_id": "site-003",
    "location_description": "Odzi pilot area",
    "farm_size": "unknown",
    "water_source": "borehole",
    "irrigation_access": "limited",
    "soil_type": "unknown"
  },
  "ai_profile": {
    "primary_goal": "improve yield",
    "primary_pain_point": "water timing",
    "secondary_pain_points": ["pest identification", "record keeping"],
    "current_crop": "tomato",
    "current_crop_stage": "flowering",
    "main_crops": ["tomato", "maize"],
    "farm_story_summary": "Farmer reports recurring difficulty knowing when to water and past aphid pressure on tomatoes."
  },
  "recent_ndani_kit_readings": [
    {
      "source": "manual_guided",
      "soil_condition": "dry",
      "plant_condition": "fair",
      "pest_disease_signs": "none",
      "rain_condition": "no_recent_rain",
      "created_at": 1782484905
    }
  ],
  "recent_checkins": [
    {
      "week_start": 1782432000,
      "biggest_worry": "plants may dry before next watering",
      "irrigation_done": "yes",
      "observed_change": "plants looked better after watering"
    }
  ],
  "important_memories": [
    {
      "memory_id": "uuid",
      "type": "constraint",
      "summary": "Farmer has limited water access."
    },
    {
      "memory_id": "uuid",
      "type": "farmer_preference",
      "summary": "Farmer prefers simple Shona + English explanations."
    }
  ],
  "last_recommendation": {
    "plan_id": "uuid",
    "summary": "Water early morning and check under tomato leaves for aphids.",
    "followed": true,
    "outcome_observed": "plants looked better after watering"
  },
  "agronomy_playbook_snippets": [
    {
      "key": "tomato.flowering.water_stress",
      "guidance": "Tomato flowering stage is sensitive to water stress. Irregular watering can reduce fruit set."
    },
    {
      "key": "general.irrigation.low_water",
      "guidance": "When water is limited, irrigate early morning or late afternoon and prioritize crops at flowering or fruiting stage."
    }
  ]
}
```

### 9.4 Weekly plan task prompt

```text
Using the Farm Manager Context Pack, create this farmer’s weekly farm manager plan.

The plan must:
1. Mention the farmer’s farm or crop.
2. Use at least three relevant personalization facts from the context if available.
3. Explain the main risk this week.
4. Recommend 1 to 3 practical actions.
5. Keep recommendations low-cost where possible.
6. Include a simple Shona + English explanation if preferred_language is "sn-en".
7. Ask one follow-up question for next week.
8. Set coordinator_review_required to true if the situation is risky, uncertain, chemical-related, expensive, severe, or dependent on missing critical information.
9. Include evidence_used entries that reference the provided context. Do not invent evidence IDs.

Return valid JSON only.
```

### 9.5 Required weekly plan output schema

```json
{
  "risk_level": "low | medium | high",
  "confidence": "low | medium | high",
  "confidence_reason": "string",
  "farm_status_summary": "string",
  "personalization_used": ["string"],
  "main_issue": "string",
  "recommended_actions": [
    {
      "priority": 1,
      "title": "string",
      "action": "string",
      "reason": "string",
      "timeframe": "string",
      "cost_level": "none | low | medium | high",
      "difficulty": "easy | moderate | difficult",
      "shona_phrase": "string"
    }
  ],
  "simple_explanation": "string",
  "shona_summary": "string",
  "follow_up_question": "string",
  "missing_information": ["string"],
  "evidence_used": [
    {
      "type": "profile | memory | checkin | ndani_reading | previous_plan | playbook",
      "id": "string",
      "summary": "string"
    }
  ],
  "coordinator_review_required": false,
  "safety_flags": ["string"]
}
```

### 9.6 Chat task prompt

```text
Answer the farmer’s question as their EdgeChain AI Farm Manager.

Use the Farm Manager Context Pack. Personalize the answer using the farmer’s farm, crop, constraints, recent observations, and important memories where relevant.

If the question asks for a risky, chemical, expensive, or uncertain recommendation, give only safe general guidance and set coordinator_review_required to true.

Do not invent facts. If key information is missing, ask for it.

Return valid JSON only.
```

### 9.7 Chat output schema

```json
{
  "answer": "string",
  "shona_summary": "string",
  "personalization_used": ["string"],
  "recommended_next_step": "string",
  "missing_information": ["string"],
  "evidence_used": [
    {
      "type": "profile | memory | checkin | ndani_reading | previous_plan | playbook",
      "id": "string",
      "summary": "string"
    }
  ],
  "confidence": "low | medium | high",
  "coordinator_review_required": false,
  "safety_flags": ["string"]
}
```

## 10. Model configuration

Initial Gemini configuration:

```text
temperature: 0.2 to 0.4
top_p: 0.8
max_output_tokens: 1200 for weekly plans
max_output_tokens: 800 for chat answers
response_mime_type: application/json
```

Use low temperature because farm advice should be reliable and consistent, not creatively variable.

## 11. Output validation pipeline

Every LLM output must pass through this pipeline:

```text
LLM response
→ JSON parse
→ schema validation
→ source-claim validation
→ safety validation
→ coordinator-review rule enforcement
→ persistence
→ UI rendering
```

### 11.1 JSON validation

If JSON parsing fails:

1. run one repair prompt using the original output,
2. validate repaired output,
3. if still invalid, create deterministic fallback output and flag coordinator review.

### 11.2 Source-claim validation

Reject or rewrite claims that say hardware measured something when the source is manual.

Invalid:

```text
The sensor measured dry soil.
```

Valid:

```text
The latest manual Ndani Kit reading recorded dry soil.
```

### 11.3 Safety validation

Deterministic code should flag:

- pesticide,
- herbicide,
- fungicide,
- chemical dosage,
- fertilizer dosage,
- severe disease diagnosis,
- expensive input purchase,
- high crop-loss risk,
- weather claims without weather source,
- sensor claims without physical sensor source,
- low model confidence.

### 11.4 Coordinator review enforcement

Set `coordinator_review_required = true` if:

- risk level is high,
- confidence is low,
- safety flags are non-empty,
- chemical/pesticide advice is present,
- expensive input advice is present,
- diagnosis is uncertain and severe,
- missing information is critical,
- repeated deterioration is detected.

The LLM can request coordinator review, but code must also enforce it.

## 12. Fallback behavior

If Gemini is unavailable or validation fails:

1. save the check-in,
2. show latest farm status,
3. show safe generic playbook advice,
4. ask one simple follow-up question,
5. flag coordinator review,
6. record the AI invocation failure.

Fallback example:

```text
I saved this week’s farm check-in. I could not generate a full AI plan right now.

Safe next step: If soil is dry, check again early morning and water young or flowering crops first if water is available.

A coordinator should review this check-in.
```

## 13. Human-in-the-loop policy

Coordinator review is required for:

- chemical recommendations,
- severe pest/disease reports,
- high-risk crop loss,
- uncertain diagnosis,
- expensive input recommendations,
- repeated crop deterioration,
- farmer asks for dosage,
- AI confidence is low,
- the model says critical information is missing.

Coordinator review should show:

- farmer profile,
- current check-in,
- latest Ndani Kit reading,
- AI recommendation,
- safety flags,
- evidence used,
- approve/edit/reject decision.

## 14. Multilingual and Shona support

### 14.1 Language policy

For `preferred_language = sn-en`, responses should use simple English with Shona terms in parentheses.

Example:

```text
The soil is dry (Ivhu raoma). Water early in the morning if water is available.
```

For `preferred_language = sn`, use Shona where reliable, but keep agronomy-critical terms simple and avoid uncertain translation.

### 14.2 Phrase bank

Maintain a curated phrase bank for common pilot terms.

Examples:

```text
Very dry: Kuoma zvakanyanya
Dry: Kuoma
Moist: Kunyorova
Wet: Kunyanyisa kunyorova
Good plant condition: Zvirimwa zvakamira zvakanaka
Poor plant condition: Zvirimwa hazvina kumira zvakanaka
Check under leaves: Tarisa pasi pemashizha
Water early morning: Diridza mangwanani
Pests: Tupukanana tunokuvadza zvirimwa
Disease signs: Zviratidzo zvechirwere
```

The phrase bank should be editable as pilot coordinators improve local phrasing.

## 15. Privacy and isolation

Rules:

- Farmers can only access their own AI profile, memories, check-ins, plans, outcomes, and reports.
- Coordinators can access all pilot farmers.
- Context packs must be scoped by authenticated farmer or coordinator action.
- No context pack may include another farmer’s data.
- Prompt invocation metadata should avoid storing raw sensitive content by default.
- Funder reports should aggregate and anonymize unless explicit farmer consent is captured.

## 16. Cost controls

Because one Gemini account may serve 20 farmers, implement:

- per-farmer token tracking,
- per-farmer estimated cost tracking,
- daily/monthly total usage metrics,
- short-context mode for simple chat,
- long-context mode for weekly plans/reports,
- cached AI Manager Brief,
- cached playbook snippets,
- coordinator dashboard cost visibility.

Initial usage modes:

```text
chat_light: latest profile + latest reading + top 2 memories
weekly_plan: full context pack
report: summarized period context
```

## 17. Observability

Log for each AI invocation:

- farmer ID,
- farm ID,
- prompt family,
- prompt version,
- model provider,
- model name,
- latency,
- token counts,
- estimated cost,
- validation status,
- safety flags,
- coordinator review flag,
- context source counts,
- error code if failed.

Dashboard metrics:

- AI profiles completed,
- weekly check-ins completed,
- AI plans generated,
- coordinator reviews required,
- recommendations followed,
- common pain points,
- total Gemini cost,
- average cost per farmer,
- fallback rate,
- validation failure rate.

## 18. Evaluation strategy

### 18.1 Test dataset

Create a fixed evaluation set before field use.

Required cases:

1. Tomato flowering + dry soil + limited water
2. Maize vegetative + yellow leaves + unknown fertilizer history
3. Leafy vegetables + severe pest signs
4. Farmer asks for pesticide dosage
5. No crop stage provided
6. Manual reading must not be described as sensor reading
7. Farmer has low budget but model suggests expensive input
8. Farmer prefers Shona + English
9. Repeated crop deterioration over three check-ins
10. Gemini returns malformed JSON

### 18.2 Automated eval assertions

Each eval should check:

- valid JSON,
- schema compliance,
- at least three personalization facts when available,
- no unsupported sensor claims,
- low-cost action included when constraints require it,
- chemical advice triggers coordinator review,
- missing data is acknowledged,
- Shona summary exists when required,
- evidence_used references provided context only,
- no cross-farmer data appears.

### 18.3 Prompt regression testing

Run evals when:

- prompt version changes,
- model changes,
- retrieval rules change,
- playbook content changes,
- safety rules change.

Track:

- personalization quality,
- hallucination rate,
- safety flag correctness,
- coordinator review correctness,
- JSON validity,
- language quality,
- average token cost.

## 19. Acceptance criteria

### 19.1 Farmer acceptance

A farmer should be able to say:

```text
The AI knows my farm.
The AI remembers what I said before.
The AI gives advice for my crop.
The AI follows up on last week’s issue.
The AI explains in simple language.
```

### 19.2 Engineering acceptance

- Each farmer has an isolated AI profile.
- Weekly check-ins are stored.
- AI plans are stored and auditable.
- Context packs are built from database records, not arbitrary chat memory.
- Prompt family/version is stored with every AI output.
- JSON output is schema validated.
- Safety guardrails run outside the prompt.
- Coordinator review is enforced by code.
- Manual readings are never represented as hardware sensor readings.
- Evaluation cases exist and run in CI or documented test flow.

### 19.3 Funder acceptance

The system can show:

- 20 individualized AI Farm Manager profiles,
- 20 AI Manager Briefs,
- weekly engagement,
- recurring pain points,
- advice generated,
- advice followed,
- coordinator reviews,
- common risks,
- hardware automation upgrade story,
- per-farmer and aggregate evidence reports.

## 20. Implementation phases

### Phase 1: Data foundation

Build migrations, repositories, and types for:

- `farmer_ai_profiles`,
- `farmer_ai_memories`,
- `weekly_farm_checkins`,
- `ai_farm_plans`,
- `ai_recommendation_outcomes`,
- `ai_prompt_invocations`.

### Phase 2: Coordinator onboarding

Build coordinator UI/API for:

- creating/editing AI Farm Manager profile,
- capturing farm story,
- setting pain points and constraints,
- generating AI Manager Brief.

### Phase 3: Weekly check-in

Build farmer/coordinator check-in flow:

- simple large-button UI,
- Shona + English labels,
- attach latest Virtual Ndani Kit context,
- store structured check-ins.

### Phase 4: AI plan generation

Build:

- Farm Manager Context Pack,
- prompt templates,
- Gemini call,
- output validation,
- safety guardrails,
- plan persistence,
- coordinator review flagging.

### Phase 5: Memory-based chat

Enhance existing Farm Assistant:

- include Farm Manager Context Pack,
- retrieve relevant memories,
- validate chat outputs,
- store useful outcomes as memory.

### Phase 6: Timeline and reports

Build:

- farmer timeline,
- farmer AI Farm Manager Report,
- funder roll-up report.

### Phase 7: Evals and monitoring

Build:

- fixed eval dataset,
- automated assertions,
- prompt regression tests,
- observability dashboard,
- cost dashboard.

## 21. Non-goals for first pilot

Do not claim:

- autonomous disease diagnosis,
- yield prediction accuracy,
- weather forecasting without weather data,
- physical sensor measurement where readings are manual,
- fully automated agronomy decisions,
- replacement of coordinator/local expert review.

The first pilot should prove:

- personalization,
- memory,
- practical weekly advice,
- farmer engagement,
- evidence collection,
- clear pathway to physical Ndani Kit automation.
