import { Router } from 'express';
import { authRepository } from '../auth/authRepository';
import { FarmerRequest, requireFarmerSession } from '../auth/authMiddleware';

const router = Router();

router.use(requireFarmerSession);

router.get('/', async (req: FarmerRequest, res) => {
  const farms = await authRepository.listFarms(req.farmer!.farmer_id);
  res.json({ success: true, farms });
});

router.get('/:farmId', async (req: FarmerRequest, res) => {
  const farms = await authRepository.listFarms(req.farmer!.farmer_id);
  const farm = farms.find((candidate) => candidate.farm_id === req.params.farmId);
  if (!farm) {
    return res.status(404).json({ error: 'farm_not_found' });
  }
  return res.json({ success: true, farm });
});

export { router as farmsRouter };
