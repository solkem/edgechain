import crypto from 'crypto';
import { db } from '../database';
import {
  AiFarmPlan,
  AiPromptInvocation,
  AiRecommendationOutcome,
  FarmerAiMemory,
  FarmerAiProfile,
  FarmManagerConfidence,
  FarmManagerEvidenceUsed,
  FarmManagerLanguage,
  FarmManagerMemorySource,
  FarmManagerMemoryType,
  FarmManagerPromptStatus,
  FarmManagerRecommendedAction,
  FarmManagerRiskLevel,
  FarmManagerValidationStatus,
  WeeklyCheckinCreatedBy,
  WeeklyFarmCheckin,
} from './domain';

export const aiFarmManagerRepository = {
  async createProfile(input: {
    farmerId: string;
    farmId?: string | null;
    preferredLanguage: FarmManagerLanguage;
    literacyLevel?: string | null;
    technologyComfort?: string | null;
    primaryGoal?: string | null;
    primaryPainPoint?: string | null;
    secondaryPainPoints?: string[];
    waterAccess?: string | null;
    irrigationMethod?: string | null;
    budgetConstraint?: string | null;
    labourConstraint?: string | null;
    mainCrops?: string[];
    currentCrop?: string | null;
    currentCropStage?: string | null;
    soilType?: string | null;
    farmStorySummary?: string | null;
    aiManagerBrief?: string | null;
    status?: FarmerAiProfile['status'];
  }): Promise<FarmerAiProfile> {
    const result = await db.query(
      `
        INSERT INTO farmer_ai_profiles (
          profile_id, farmer_id, farm_id, preferred_language,
          literacy_level, technology_comfort, primary_goal, primary_pain_point,
          secondary_pain_points_json, water_access, irrigation_method,
          budget_constraint, labour_constraint, main_crops_json, current_crop,
          current_crop_stage, soil_type, farm_story_summary, ai_manager_brief,
          status
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        input.farmerId,
        input.farmId ?? null,
        input.preferredLanguage,
        input.literacyLevel ?? null,
        input.technologyComfort ?? null,
        input.primaryGoal ?? null,
        input.primaryPainPoint ?? null,
        json(input.secondaryPainPoints ?? []),
        input.waterAccess ?? null,
        input.irrigationMethod ?? null,
        input.budgetConstraint ?? null,
        input.labourConstraint ?? null,
        json(input.mainCrops ?? []),
        input.currentCrop ?? null,
        input.currentCropStage ?? null,
        input.soilType ?? null,
        input.farmStorySummary ?? null,
        input.aiManagerBrief ?? null,
        input.status ?? 'draft',
      ]
    );
    return normalizeProfile(result.rows[0]);
  },

  async updateProfile(input: {
    profileId: string;
    preferredLanguage?: FarmManagerLanguage;
    literacyLevel?: string | null;
    technologyComfort?: string | null;
    primaryGoal?: string | null;
    primaryPainPoint?: string | null;
    secondaryPainPoints?: string[];
    waterAccess?: string | null;
    irrigationMethod?: string | null;
    budgetConstraint?: string | null;
    labourConstraint?: string | null;
    mainCrops?: string[];
    currentCrop?: string | null;
    currentCropStage?: string | null;
    soilType?: string | null;
    farmStorySummary?: string | null;
    aiManagerBrief?: string | null;
    status?: FarmerAiProfile['status'];
  }): Promise<FarmerAiProfile | undefined> {
    const current = await this.findProfile(input.profileId);
    if (!current) return undefined;
    const result = await db.query(
      `
        UPDATE farmer_ai_profiles
        SET preferred_language = $1,
            literacy_level = $2,
            technology_comfort = $3,
            primary_goal = $4,
            primary_pain_point = $5,
            secondary_pain_points_json = $6,
            water_access = $7,
            irrigation_method = $8,
            budget_constraint = $9,
            labour_constraint = $10,
            main_crops_json = $11,
            current_crop = $12,
            current_crop_stage = $13,
            soil_type = $14,
            farm_story_summary = $15,
            ai_manager_brief = $16,
            brief_version = CASE WHEN $16 IS DISTINCT FROM ai_manager_brief THEN brief_version + 1 ELSE brief_version END,
            status = $17,
            updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE profile_id = $18
        RETURNING *
      `,
      [
        input.preferredLanguage ?? current.preferred_language,
        valueOrCurrent(input.literacyLevel, current.literacy_level),
        valueOrCurrent(input.technologyComfort, current.technology_comfort),
        valueOrCurrent(input.primaryGoal, current.primary_goal),
        valueOrCurrent(input.primaryPainPoint, current.primary_pain_point),
        json(input.secondaryPainPoints ?? current.secondary_pain_points),
        valueOrCurrent(input.waterAccess, current.water_access),
        valueOrCurrent(input.irrigationMethod, current.irrigation_method),
        valueOrCurrent(input.budgetConstraint, current.budget_constraint),
        valueOrCurrent(input.labourConstraint, current.labour_constraint),
        json(input.mainCrops ?? current.main_crops),
        valueOrCurrent(input.currentCrop, current.current_crop),
        valueOrCurrent(input.currentCropStage, current.current_crop_stage),
        valueOrCurrent(input.soilType, current.soil_type),
        valueOrCurrent(input.farmStorySummary, current.farm_story_summary),
        valueOrCurrent(input.aiManagerBrief, current.ai_manager_brief),
        input.status ?? current.status,
        input.profileId,
      ]
    );
    return result.rows[0] ? normalizeProfile(result.rows[0]) : undefined;
  },

  async findProfile(profileId: string): Promise<FarmerAiProfile | undefined> {
    const result = await db.query(
      'SELECT * FROM farmer_ai_profiles WHERE profile_id = $1 LIMIT 1',
      [profileId]
    );
    return result.rows[0] ? normalizeProfile(result.rows[0]) : undefined;
  },

  async getActiveProfile(params: {
    farmerId: string;
    farmId?: string;
  }): Promise<FarmerAiProfile | undefined> {
    const result = await db.query(
      `
        SELECT *
        FROM farmer_ai_profiles
        WHERE farmer_id = $1
          AND status IN ('active', 'needs_update', 'draft')
          AND ($2::uuid IS NULL OR farm_id = $2)
        ORDER BY
          CASE status WHEN 'active' THEN 0 WHEN 'needs_update' THEN 1 ELSE 2 END,
          updated_at DESC
        LIMIT 1
      `,
      [params.farmerId, params.farmId ?? null]
    );
    return result.rows[0] ? normalizeProfile(result.rows[0]) : undefined;
  },

  async addMemory(input: {
    farmerId: string;
    farmId?: string | null;
    memoryType: FarmManagerMemoryType;
    memoryKey: string;
    memoryValue: string;
    importance?: number;
    source: FarmManagerMemorySource;
    sourceId?: string | null;
    validFrom?: number;
    validTo?: number | null;
  }): Promise<FarmerAiMemory> {
    const result = await db.query(
      `
        INSERT INTO farmer_ai_memories (
          memory_id, farmer_id, farm_id, memory_type, memory_key,
          memory_value, importance, source, source_id, valid_from, valid_to
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, EXTRACT(EPOCH FROM NOW())::BIGINT), $11)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        input.farmerId,
        input.farmId ?? null,
        input.memoryType,
        input.memoryKey,
        input.memoryValue,
        input.importance ?? 3,
        input.source,
        input.sourceId ?? null,
        input.validFrom ?? null,
        input.validTo ?? null,
      ]
    );
    return normalizeMemory(result.rows[0]);
  },

  async listContextMemories(params: {
    farmerId: string;
    farmId?: string;
    limit?: number;
  }): Promise<FarmerAiMemory[]> {
    const result = await db.query(
      `
        SELECT *
        FROM farmer_ai_memories
        WHERE farmer_id = $1
          AND ($2::uuid IS NULL OR farm_id = $2 OR farm_id IS NULL)
          AND (valid_to IS NULL OR valid_to > EXTRACT(EPOCH FROM NOW())::BIGINT)
        ORDER BY importance DESC, updated_at DESC
        LIMIT $3
      `,
      [params.farmerId, params.farmId ?? null, params.limit ?? 5]
    );
    return result.rows.map(normalizeMemory);
  },

  async expireMemory(memoryId: string): Promise<void> {
    await db.query(
      `
        UPDATE farmer_ai_memories
        SET valid_to = EXTRACT(EPOCH FROM NOW())::BIGINT,
            updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE memory_id = $1
      `,
      [memoryId]
    );
  },

  async createCheckin(input: {
    farmerId: string;
    farmId?: string | null;
    virtualDeviceId?: string | null;
    weekStart: number;
    crop?: string | null;
    cropStage?: string | null;
    soilCondition?: string | null;
    plantCondition?: string | null;
    pestDiseaseSigns?: string | null;
    rainCondition?: string | null;
    irrigationDone?: string | null;
    farmerBiggestWorry?: string | null;
    labourOrInputConstraint?: string | null;
    followedPreviousAdvice?: boolean | null;
    observedChange?: string | null;
    manualNotes?: string | null;
    riskLevel?: FarmManagerRiskLevel | null;
    createdBy: WeeklyCheckinCreatedBy;
  }): Promise<WeeklyFarmCheckin> {
    const result = await db.query(
      `
        INSERT INTO weekly_farm_checkins (
          checkin_id, farmer_id, farm_id, virtual_device_id, week_start,
          crop, crop_stage, soil_condition, plant_condition,
          pest_disease_signs, rain_condition, irrigation_done,
          farmer_biggest_worry, labour_or_input_constraint,
          followed_previous_advice, observed_change, manual_notes,
          risk_level, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14,
          $15, $16, $17,
          $18, $19
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        input.farmerId,
        input.farmId ?? null,
        input.virtualDeviceId ?? null,
        input.weekStart,
        input.crop ?? null,
        input.cropStage ?? null,
        input.soilCondition ?? null,
        input.plantCondition ?? null,
        input.pestDiseaseSigns ?? null,
        input.rainCondition ?? null,
        input.irrigationDone ?? null,
        input.farmerBiggestWorry ?? null,
        input.labourOrInputConstraint ?? null,
        input.followedPreviousAdvice ?? null,
        input.observedChange ?? null,
        input.manualNotes ?? null,
        input.riskLevel ?? null,
        input.createdBy,
      ]
    );
    return normalizeCheckin(result.rows[0]);
  },

  async listCheckins(params: {
    farmerId: string;
    farmId?: string;
    limit?: number;
  }): Promise<WeeklyFarmCheckin[]> {
    const result = await db.query(
      `
        SELECT *
        FROM weekly_farm_checkins
        WHERE farmer_id = $1
          AND ($2::uuid IS NULL OR farm_id = $2)
        ORDER BY week_start DESC, created_at DESC
        LIMIT $3
      `,
      [params.farmerId, params.farmId ?? null, params.limit ?? 3]
    );
    return result.rows.map(normalizeCheckin);
  },

  async createPlan(input: {
    farmerId: string;
    farmId?: string | null;
    checkinId?: string | null;
    conversationId?: string | null;
    promptFamily: string;
    promptVersion: string;
    modelProvider: string;
    modelName: string;
    riskLevel: FarmManagerRiskLevel;
    confidence: FarmManagerConfidence;
    summary: string;
    mainIssue?: string | null;
    recommendedActions: FarmManagerRecommendedAction[];
    simpleExplanation?: string | null;
    shonaSummary?: string | null;
    followUpQuestion?: string | null;
    missingInformation?: string[];
    evidenceUsed?: FarmManagerEvidenceUsed[];
    safetyFlags?: string[];
    coordinatorReviewRequired?: boolean;
    rawModelOutput?: Record<string, unknown> | null;
    validationStatus: FarmManagerValidationStatus;
  }): Promise<AiFarmPlan> {
    const result = await db.query(
      `
        INSERT INTO ai_farm_plans (
          plan_id, farmer_id, farm_id, checkin_id, conversation_id,
          prompt_family, prompt_version, model_provider, model_name,
          risk_level, confidence, summary, main_issue,
          recommended_actions_json, simple_explanation, shona_summary,
          follow_up_question, missing_information_json, evidence_used_json,
          safety_flags_json, coordinator_review_required, raw_model_output_json,
          validation_status
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22,
          $23
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        input.farmerId,
        input.farmId ?? null,
        input.checkinId ?? null,
        input.conversationId ?? null,
        input.promptFamily,
        input.promptVersion,
        input.modelProvider,
        input.modelName,
        input.riskLevel,
        input.confidence,
        input.summary,
        input.mainIssue ?? null,
        json(input.recommendedActions),
        input.simpleExplanation ?? null,
        input.shonaSummary ?? null,
        input.followUpQuestion ?? null,
        json(input.missingInformation ?? []),
        json(input.evidenceUsed ?? []),
        json(input.safetyFlags ?? []),
        input.coordinatorReviewRequired ?? false,
        input.rawModelOutput ? json(input.rawModelOutput) : null,
        input.validationStatus,
      ]
    );
    return normalizePlan(result.rows[0]);
  },

  async listPlans(params: {
    farmerId: string;
    farmId?: string;
    limit?: number;
  }): Promise<AiFarmPlan[]> {
    const result = await db.query(
      `
        SELECT *
        FROM ai_farm_plans
        WHERE farmer_id = $1
          AND ($2::uuid IS NULL OR farm_id = $2)
        ORDER BY created_at DESC
        LIMIT $3
      `,
      [params.farmerId, params.farmId ?? null, params.limit ?? 2]
    );
    return result.rows.map(normalizePlan);
  },

  async recordOutcome(input: {
    planId: string;
    farmerId: string;
    actionIndex: number;
    farmerFollowed?: boolean | null;
    outcomeObserved?: string | null;
    farmerFeedback?: string | null;
    coordinatorNotes?: string | null;
  }): Promise<AiRecommendationOutcome> {
    const result = await db.query(
      `
        INSERT INTO ai_recommendation_outcomes (
          outcome_id, plan_id, farmer_id, action_index, farmer_followed,
          outcome_observed, farmer_feedback, coordinator_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (plan_id, action_index)
        DO UPDATE SET farmer_followed = EXCLUDED.farmer_followed,
                      outcome_observed = EXCLUDED.outcome_observed,
                      farmer_feedback = EXCLUDED.farmer_feedback,
                      coordinator_notes = EXCLUDED.coordinator_notes,
                      updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        input.planId,
        input.farmerId,
        input.actionIndex,
        input.farmerFollowed ?? null,
        input.outcomeObserved ?? null,
        input.farmerFeedback ?? null,
        input.coordinatorNotes ?? null,
      ]
    );
    return normalizeOutcome(result.rows[0]);
  },

  async listOutcomesForFarmer(params: {
    farmerId: string;
    limit?: number;
  }): Promise<AiRecommendationOutcome[]> {
    const result = await db.query(
      `
        SELECT *
        FROM ai_recommendation_outcomes
        WHERE farmer_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [params.farmerId, params.limit ?? 10]
    );
    return result.rows.map(normalizeOutcome);
  },

  async recordPromptInvocation(input: {
    farmerId?: string | null;
    farmId?: string | null;
    promptFamily: string;
    promptVersion: string;
    modelProvider: string;
    modelName: string;
    inputTokenCount?: number | null;
    outputTokenCount?: number | null;
    estimatedCostUsd?: number | null;
    latencyMs?: number | null;
    status: FarmManagerPromptStatus;
    errorCode?: string | null;
    contextSourceCounts?: Record<string, number>;
    safetyFlags?: string[];
  }): Promise<AiPromptInvocation> {
    const result = await db.query(
      `
        INSERT INTO ai_prompt_invocations (
          invocation_id, farmer_id, farm_id, prompt_family, prompt_version,
          model_provider, model_name, input_token_count, output_token_count,
          estimated_cost_usd, latency_ms, status, error_code,
          context_source_counts_json, safety_flags_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        input.farmerId ?? null,
        input.farmId ?? null,
        input.promptFamily,
        input.promptVersion,
        input.modelProvider,
        input.modelName,
        input.inputTokenCount ?? null,
        input.outputTokenCount ?? null,
        input.estimatedCostUsd ?? null,
        input.latencyMs ?? null,
        input.status,
        input.errorCode ?? null,
        json(input.contextSourceCounts ?? {}),
        json(input.safetyFlags ?? []),
      ]
    );
    return normalizeInvocation(result.rows[0]);
  },
};

function normalizeProfile(row: any): FarmerAiProfile {
  return {
    ...row,
    secondary_pain_points: parseJson<string[]>(row.secondary_pain_points_json, []),
    main_crops: parseJson<string[]>(row.main_crops_json, []),
    brief_version: Number(row.brief_version),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function normalizeMemory(row: any): FarmerAiMemory {
  return {
    ...row,
    importance: Number(row.importance),
    valid_from: Number(row.valid_from),
    valid_to: row.valid_to === null ? null : Number(row.valid_to),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function normalizeCheckin(row: any): WeeklyFarmCheckin {
  return {
    ...row,
    week_start: Number(row.week_start),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function normalizePlan(row: any): AiFarmPlan {
  return {
    ...row,
    recommended_actions: parseJson<FarmManagerRecommendedAction[]>(
      row.recommended_actions_json,
      []
    ),
    missing_information: parseJson<string[]>(row.missing_information_json, []),
    evidence_used: parseJson<FarmManagerEvidenceUsed[]>(row.evidence_used_json, []),
    safety_flags: parseJson<string[]>(row.safety_flags_json, []),
    raw_model_output: row.raw_model_output_json
      ? parseJson<Record<string, unknown>>(row.raw_model_output_json, {})
      : null,
    coordinator_review_required: Boolean(row.coordinator_review_required),
    created_at: Number(row.created_at),
  };
}

function normalizeOutcome(row: any): AiRecommendationOutcome {
  return {
    ...row,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function normalizeInvocation(row: any): AiPromptInvocation {
  return {
    ...row,
    input_token_count: row.input_token_count === null ? null : Number(row.input_token_count),
    output_token_count: row.output_token_count === null ? null : Number(row.output_token_count),
    estimated_cost_usd: row.estimated_cost_usd === null ? null : Number(row.estimated_cost_usd),
    latency_ms: row.latency_ms === null ? null : Number(row.latency_ms),
    context_source_counts: parseJson<Record<string, number>>(
      row.context_source_counts_json,
      {}
    ),
    safety_flags: parseJson<string[]>(row.safety_flags_json, []),
    created_at: Number(row.created_at),
  };
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function valueOrCurrent<T>(value: T | undefined, current: T): T {
  return value === undefined ? current : value;
}
