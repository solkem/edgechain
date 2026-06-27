import { Router } from 'express';
import {
  FarmerRequest,
  requireCoordinator,
} from '../auth/authMiddleware';
import {
  CoordinatorError,
  coordinatorService,
} from '../virtual-ndani/coordinatorService';
import { PhysicalBindingError } from '../virtual-ndani/physicalBindingService';
import {
  CoordinatorAdministrationError,
  coordinatorAdministrationService,
} from '../virtual-ndani/coordinatorAdministrationService';
import {
  AiFarmManagerProfileError,
  coordinatorAiProfileService,
} from '../ai-farm-manager/coordinatorProfileService';

const router = Router();
router.use(requireCoordinator);

router.get('/farmers', async (_req: FarmerRequest, res) => {
  try {
    return res.json({
      success: true,
      farmers: await coordinatorAdministrationService.listFarmers(),
    });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/farmers', async (req: FarmerRequest, res) => {
  try {
    const farmer = await coordinatorAdministrationService.enrollFarmer({
      pilotCode: req.body.pilot_code,
      displayName: req.body.display_name,
      preferredLanguage: req.body.preferred_language,
      pin: req.body.pin,
      siteId: req.body.site_id,
      farmDisplayName: req.body.farm_display_name,
      coordinatorId: req.farmer!.farmer_id,
    });
    return res.status(201).json({ success: true, farmer });
  } catch (error) {
    return handleError(error, res);
  }
});

router.patch('/farmers/:farmerId', async (req: FarmerRequest, res) => {
  try {
    const farmer = await coordinatorAdministrationService.updateFarmer({
      farmerId: req.params.farmerId,
      displayName: req.body.display_name,
      preferredLanguage: req.body.preferred_language,
      status: req.body.status,
      farmDisplayName: req.body.farm_display_name,
      coordinatorId: req.farmer!.farmer_id,
    });
    return res.json({ success: true, farmer });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/farmers/:farmerId/ai-profile', async (req: FarmerRequest, res) => {
  try {
    return res.json({
      success: true,
      profile: await coordinatorAiProfileService.getProfile(req.params.farmerId),
    });
  } catch (error) {
    return handleError(error, res);
  }
});

router.patch('/farmers/:farmerId/ai-profile', async (req: FarmerRequest, res) => {
  try {
    const profile = await coordinatorAiProfileService.saveProfile({
      farmerId: req.params.farmerId,
      preferredLanguage: req.body.preferred_language,
      literacyLevel: req.body.literacy_level,
      technologyComfort: req.body.technology_comfort,
      primaryGoal: req.body.primary_goal,
      primaryPainPoint: req.body.primary_pain_point,
      secondaryPainPoints: req.body.secondary_pain_points,
      waterAccess: req.body.water_access,
      irrigationMethod: req.body.irrigation_method,
      budgetConstraint: req.body.budget_constraint,
      labourConstraint: req.body.labour_constraint,
      mainCrops: req.body.main_crops,
      currentCrop: req.body.current_crop,
      currentCropStage: req.body.current_crop_stage,
      soilType: req.body.soil_type,
      farmStorySummary: req.body.farm_story_summary,
      aiManagerBrief: req.body.ai_manager_brief,
      status: req.body.status,
    });
    return res.json({ success: true, profile });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/farmers/:farmerId/reset-pin', async (req: FarmerRequest, res) => {
  try {
    const result = await coordinatorAdministrationService.resetPin({
      farmerId: req.params.farmerId,
      pin: req.body.pin,
      coordinatorId: req.farmer!.farmer_id,
    });
    return res.json({ success: true, result });
  } catch (error) {
    return handleError(error, res);
  }
});

router.delete('/farmers/:farmerId', async (req: FarmerRequest, res) => {
  try {
    const result = await coordinatorAdministrationService.deleteFarmer({
      farmerId: req.params.farmerId,
      coordinatorId: req.farmer!.farmer_id,
    });
    return res.json({ success: true, result });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/virtual-ndani', async (_req: FarmerRequest, res) => {
  try {
    return res.json({ success: true, devices: await coordinatorService.fleet() });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/reading-reviews', async (_req: FarmerRequest, res) => {
  try {
    return res.json({
      success: true,
      reviews: await coordinatorService.pendingReviews(),
    });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/reading-reviews/:readingId', async (req: FarmerRequest, res) => {
  try {
    const review = await coordinatorService.review({
      readingId: req.params.readingId,
      coordinatorId: req.farmer!.farmer_id,
      decision: req.body.decision,
      reason: req.body.reason,
      coordinatorDurationSeconds: req.body.coordinator_duration_seconds,
    });
    return res.json({ success: true, review });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/operations/run', async (_req: FarmerRequest, res) => {
  try {
    return res.json({
      success: true,
      result: await coordinatorService.operationsRun(),
    });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/metrics', async (_req: FarmerRequest, res) => {
  try {
    return res.json({
      success: true,
      metrics: await coordinatorService.metrics(),
    });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/evidence-report', async (_req: FarmerRequest, res) => {
  try {
    return res.json({
      success: true,
      report: await coordinatorService.evidenceReport(),
    });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/evidence-report.csv', async (_req: FarmerRequest, res) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="edgechain-virtual-ndani-evidence-${date}.csv"`
    );
    return res.send(await coordinatorService.evidenceCsv());
  } catch (error) {
    return handleError(error, res);
  }
});

router.post(
  '/virtual-ndani/:deviceId/physical-binding/challenge',
  async (req: FarmerRequest, res) => {
    try {
      if (process.env.VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED !== 'true') {
        return res.status(404).json({ error: 'physical_binding_disabled' });
      }
      const challenge = await coordinatorService.issuePhysicalBindingChallenge({
        deviceId: req.params.deviceId,
        devicePubkey: req.body.device_pubkey,
        coordinatorId: req.farmer!.farmer_id,
      });
      return res.status(201).json({ success: true, challenge });
    } catch (error) {
      return handleError(error, res);
    }
  }
);

router.post(
  '/virtual-ndani/:deviceId/physical-binding/verify',
  async (req: FarmerRequest, res) => {
    try {
      if (process.env.VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED !== 'true') {
        return res.status(404).json({ error: 'physical_binding_disabled' });
      }
      const binding = await coordinatorService.verifyPhysicalBinding({
        deviceId: req.params.deviceId,
        challengeId: req.body.challenge_id,
        signature: req.body.signature,
        coordinatorId: req.farmer!.farmer_id,
      });
      return res.json({ success: true, binding });
    } catch (error) {
      return handleError(error, res);
    }
  }
);

router.post(
  '/virtual-ndani/:deviceId/cycles/:cycleId/missed',
  async (req: FarmerRequest, res) => {
    try {
      const cycle = await coordinatorService.markMissed({
        deviceId: req.params.deviceId,
        cycleId: req.params.cycleId,
        reason: req.body.reason,
        coordinatorId: req.farmer!.farmer_id,
      });
      return res.json({ success: true, cycle });
    } catch (error) {
      return handleError(error, res);
    }
  }
);

function handleError(error: unknown, res: any) {
  if (error instanceof CoordinatorError) {
    return res.status(error.status).json({ error: error.code });
  }
  if (error instanceof PhysicalBindingError) {
    return res.status(error.status).json({ error: error.code });
  }
  if (error instanceof CoordinatorAdministrationError) {
    return res.status(error.status).json({ error: error.code });
  }
  if (error instanceof AiFarmManagerProfileError) {
    return res.status(error.status).json({ error: error.code });
  }
  console.error('Coordinator request failed:', error);
  return res.status(500).json({ error: 'coordinator_request_failed' });
}

export { router as coordinatorRouter };
