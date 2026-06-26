import assert from 'assert';
import { authRepository } from './auth/authRepository';
import { authService } from './auth/authService';
import { initializeDatabase, getDatabase } from './database';
import { aiFarmManagerRepository } from './ai-farm-manager/repository';

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the AI Farm Manager foundation test');
  }

  await initializeDatabase();
  const db = getDatabase();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  let farmerId: string | undefined;
  let farmId: string | undefined;

  try {
    const farmer = await authService.enroll({
      pilotCode: `AIFM-${suffix}`,
      displayName: 'AI Farm Manager Test Farmer',
      preferredLanguage: 'sn-en',
      pin: '2468',
      siteId: `site-${suffix.slice(-3).padStart(3, '0')}`,
      farmDisplayName: 'AI Farm Manager Test Farm',
    });
    farmerId = farmer.farmer_id;
    const farms = await authRepository.listFarms(farmer.farmer_id);
    farmId = farms[0].farm_id;

    const profile = await aiFarmManagerRepository.createProfile({
      farmerId: farmer.farmer_id,
      farmId,
      preferredLanguage: 'sn-en',
      primaryGoal: 'improve yield',
      primaryPainPoint: 'water timing',
      secondaryPainPoints: ['pest identification'],
      waterAccess: 'limited borehole',
      mainCrops: ['tomato', 'maize'],
      currentCrop: 'tomato',
      currentCropStage: 'flowering',
      farmStorySummary: 'Farmer reports dry soil and past aphid pressure.',
      aiManagerBrief: 'Focus on moisture consistency and pest scouting.',
      status: 'active',
    });
    assert.equal(profile.farmer_id, farmer.farmer_id);
    assert.equal(profile.secondary_pain_points[0], 'pest identification');
    assert.equal(profile.main_crops[0], 'tomato');

    const updated = await aiFarmManagerRepository.updateProfile({
      profileId: profile.profile_id,
      aiManagerBrief: 'Updated focus on water timing during flowering.',
    });
    assert.equal(updated?.brief_version, 2);

    const memory = await aiFarmManagerRepository.addMemory({
      farmerId: farmer.farmer_id,
      farmId,
      memoryType: 'constraint',
      memoryKey: 'water_access',
      memoryValue: 'Farmer has limited borehole irrigation.',
      importance: 5,
      source: 'onboarding',
    });
    assert.equal(memory.importance, 5);
    const memories = await aiFarmManagerRepository.listContextMemories({
      farmerId: farmer.farmer_id,
      farmId,
    });
    assert.ok(memories.some((candidate) => candidate.memory_id === memory.memory_id));

    const weekStart = Math.floor(Date.now() / 1000);
    const checkin = await aiFarmManagerRepository.createCheckin({
      farmerId: farmer.farmer_id,
      farmId,
      weekStart,
      crop: 'tomato',
      cropStage: 'flowering',
      soilCondition: 'dry',
      plantCondition: 'fair',
      pestDiseaseSigns: 'none',
      rainCondition: 'no_recent_rain',
      irrigationDone: 'yes',
      farmerBiggestWorry: 'plants may dry before next watering',
      followedPreviousAdvice: true,
      observedChange: 'plants looked better after watering',
      riskLevel: 'medium',
      createdBy: 'coordinator',
    });
    assert.equal(checkin.risk_level, 'medium');

    const plan = await aiFarmManagerRepository.createPlan({
      farmerId: farmer.farmer_id,
      farmId,
      checkinId: checkin.checkin_id,
      promptFamily: 'farm_manager_weekly_plan',
      promptVersion: '1.0.0',
      modelProvider: 'gemini',
      modelName: 'gemini-cost-effective',
      riskLevel: 'medium',
      confidence: 'medium',
      summary: 'Tomatoes are flowering while soil is dry.',
      mainIssue: 'water stress',
      recommendedActions: [
        {
          priority: 1,
          title: 'Water early morning',
          action: 'Water the tomato crop early morning if water is available.',
          reason: 'Flowering tomatoes are sensitive to dry soil.',
          timeframe: 'within 24 hours',
          cost_level: 'low',
          difficulty: 'easy',
          shona_phrase: 'Diridza mangwanani',
        },
      ],
      simpleExplanation: 'Keep moisture steady during flowering.',
      shonaSummary: 'Ivhu raoma; diridzai mangwanani kana mvura iripo.',
      followUpQuestion: 'Did the plants improve after watering?',
      missingInformation: ['soil type'],
      evidenceUsed: [
        {
          type: 'checkin',
          id: checkin.checkin_id,
          summary: 'soil condition dry',
        },
      ],
      safetyFlags: [],
      validationStatus: 'valid',
    });
    assert.equal(plan.recommended_actions[0].title, 'Water early morning');
    assert.equal(plan.evidence_used[0].type, 'checkin');

    const outcome = await aiFarmManagerRepository.recordOutcome({
      planId: plan.plan_id,
      farmerId: farmer.farmer_id,
      actionIndex: 0,
      farmerFollowed: true,
      outcomeObserved: 'plants looked better',
    });
    assert.equal(outcome.farmer_followed, true);

    const invocation = await aiFarmManagerRepository.recordPromptInvocation({
      farmerId: farmer.farmer_id,
      farmId,
      promptFamily: 'farm_manager_weekly_plan',
      promptVersion: '1.0.0',
      modelProvider: 'gemini',
      modelName: 'gemini-cost-effective',
      inputTokenCount: 900,
      outputTokenCount: 300,
      estimatedCostUsd: 0.001,
      latencyMs: 1200,
      status: 'success',
      contextSourceCounts: { memories: 1, checkins: 1 },
    });
    assert.equal(invocation.context_source_counts.memories, 1);

    console.log('AI Farm Manager foundation integration test passed');
  } finally {
    if (farmerId) await db.query('DELETE FROM farmers WHERE farmer_id = $1', [farmerId]);
    if (farmId) await db.query('DELETE FROM farms WHERE farm_id = $1', [farmId]);
    await db.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
