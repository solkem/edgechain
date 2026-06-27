import { Router } from 'express';
import { FarmerRequest, requireFarmerSession } from '../auth/authMiddleware';
import {
  AiFarmManagerCheckinError,
  aiFarmManagerCheckinService,
} from '../ai-farm-manager/checkinService';

const router = Router();
router.use(requireFarmerSession);

router.get('/checkins', async (req: FarmerRequest, res) => {
  try {
    const checkins = await aiFarmManagerCheckinService.listForFarmer(
      req.farmer!.farmer_id
    );
    return res.json({ success: true, checkins });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/checkins', async (req: FarmerRequest, res) => {
  try {
    const checkin = await aiFarmManagerCheckinService.createForFarmer({
      farmerId: req.farmer!.farmer_id,
      farmId: req.body.farm_id,
      crop: req.body.crop,
      cropStage: req.body.crop_stage,
      soilCondition: req.body.soil_condition,
      plantCondition: req.body.plant_condition,
      pestDiseaseSigns: req.body.pest_disease_signs,
      rainCondition: req.body.rain_condition,
      irrigationDone: req.body.irrigation_done,
      farmerBiggestWorry: req.body.farmer_biggest_worry,
      labourOrInputConstraint: req.body.labour_or_input_constraint,
      followedPreviousAdvice: req.body.followed_previous_advice,
      observedChange: req.body.observed_change,
      manualNotes: req.body.manual_notes,
    });
    return res.status(201).json({ success: true, checkin });
  } catch (error) {
    return handleError(error, res);
  }
});

function handleError(error: unknown, res: any) {
  if (error instanceof AiFarmManagerCheckinError) {
    return res.status(error.status).json({ error: error.code });
  }
  return res.status(500).json({ error: 'ai_farm_manager_request_failed' });
}

export { router as aiFarmManagerRouter };
