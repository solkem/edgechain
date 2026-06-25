import { Router } from 'express';
import { FarmerRequest, requireFarmerSession } from '../auth/authMiddleware';
import {
  VirtualNdaniError,
  virtualNdaniService,
} from '../virtual-ndani/service';
import { DemoSessionError } from '../virtual-ndani/demoService';

const router = Router();
router.use(requireFarmerSession);

router.get('/', async (req: FarmerRequest, res) => {
  try {
    const devices = await virtualNdaniService.list(req.farmer!.farmer_id);
    return res.json({ success: true, devices });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/guided-reading/schema', (_req: FarmerRequest, res) => {
  return res.json({
    success: true,
    schema: virtualNdaniService.guidedReadingSchema(),
  });
});

router.get('/:deviceId', async (req: FarmerRequest, res) => {
  try {
    const device = await virtualNdaniService.get(
      req.farmer!.farmer_id,
      req.params.deviceId
    );
    return res.json({ success: true, device });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/:deviceId/channels', async (req: FarmerRequest, res) => {
  try {
    const device = await virtualNdaniService.get(
      req.farmer!.farmer_id,
      req.params.deviceId
    );
    return res.json({ success: true, channels: device.channels });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/:deviceId/timeline', async (req: FarmerRequest, res) => {
  try {
    const events = await virtualNdaniService.timeline(
      req.farmer!.farmer_id,
      req.params.deviceId,
      req.query.limit
    );
    return res.json({ success: true, events });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/:deviceId/contributions', async (req: FarmerRequest, res) => {
  try {
    const contributions = await virtualNdaniService.contributions(
      req.farmer!.farmer_id,
      req.params.deviceId,
      req.query.limit
    );
    return res.json({ success: true, contributions });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/:deviceId/physical-comparison', async (req: FarmerRequest, res) => {
  try {
    const comparison = await virtualNdaniService.physicalComparison(
      req.farmer!.farmer_id,
      req.params.deviceId
    );
    return res.json({ success: true, comparison });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/:deviceId/demo-sessions', async (req: FarmerRequest, res) => {
  if (process.env.VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED !== 'true') {
    return res.status(404).json({ error: 'physical_ndani_demo_disabled' });
  }
  try {
    const session = await virtualNdaniService.createDemoSession(
      req.farmer!.farmer_id,
      req.params.deviceId
    );
    return res.status(201).json({ success: true, session });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get(
  '/:deviceId/demo-sessions/:sessionId',
  async (req: FarmerRequest, res) => {
    if (process.env.VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED !== 'true') {
      return res.status(404).json({ error: 'physical_ndani_demo_disabled' });
    }
    try {
      const session = await virtualNdaniService.getDemoSession(
        req.farmer!.farmer_id,
        req.params.deviceId,
        req.params.sessionId
      );
      return res.json({ success: true, session });
    } catch (error) {
      return handleError(error, res);
    }
  }
);

router.delete(
  '/:deviceId/demo-sessions/:sessionId',
  async (req: FarmerRequest, res) => {
    if (process.env.VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED !== 'true') {
      return res.status(404).json({ error: 'physical_ndani_demo_disabled' });
    }
    try {
      const result = await virtualNdaniService.deleteDemoSession(
        req.farmer!.farmer_id,
        req.params.deviceId,
        req.params.sessionId
      );
      return res.json({ success: true, result });
    } catch (error) {
      return handleError(error, res);
    }
  }
);

router.get('/:deviceId/cycles/current', async (req: FarmerRequest, res) => {
  try {
    const cycle = await virtualNdaniService.currentCycle(
      req.farmer!.farmer_id,
      req.params.deviceId
    );
    if (!cycle) return res.status(404).json({ error: 'current_cycle_not_found' });
    return res.json({ success: true, cycle });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/:deviceId/cycles', async (req: FarmerRequest, res) => {
  try {
    const cycle = await virtualNdaniService.startCycle(
      req.farmer!.farmer_id,
      req.params.deviceId,
      req.body.collection_mode
    );
    return res.status(201).json({ success: true, cycle });
  } catch (error) {
    return handleError(error, res);
  }
});

router.get('/:deviceId/cycles/:cycleId/reading', async (req: FarmerRequest, res) => {
  try {
    const reading = await virtualNdaniService.getCycleReading(
      req.farmer!.farmer_id,
      req.params.deviceId,
      req.params.cycleId
    );
    return res.json({ success: true, reading });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/:deviceId/cycles/:cycleId/readings', async (req: FarmerRequest, res) => {
  try {
    const reading = await virtualNdaniService.saveGuidedReading(
      req.farmer!.farmer_id,
      req.params.deviceId,
      req.params.cycleId,
      req.body
    );
    return res.status(201).json({ success: true, reading });
  } catch (error) {
    return handleError(error, res);
  }
});

router.post('/:deviceId/cycles/:cycleId/confirm', async (req: FarmerRequest, res) => {
  try {
    const reading = await virtualNdaniService.confirmReading(
      req.farmer!.farmer_id,
      req.params.deviceId,
      req.params.cycleId
    );
    return res.json({ success: true, reading });
  } catch (error) {
    return handleError(error, res);
  }
});

function handleError(error: unknown, res: any) {
  if (error instanceof VirtualNdaniError) {
    return res.status(error.status).json({ error: error.code });
  }
  if (error instanceof DemoSessionError) {
    return res.status(error.status).json({ error: error.code });
  }
  console.error('Virtual Ndani Kit request failed:', error);
  return res.status(500).json({ error: 'virtual_ndani_request_failed' });
}

export { router as virtualNdaniRouter };
