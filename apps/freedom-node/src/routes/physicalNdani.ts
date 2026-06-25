import { Router } from 'express';
import {
  PhysicalReadingError,
  physicalReadingService,
} from '../virtual-ndani/physicalReadingService';

const router = Router();

router.post('/readings', async (req, res) => {
  if (process.env.VIRTUAL_NDANI_PHYSICAL_INGESTION_ENABLED !== 'true') {
    return res.status(404).json({ error: 'physical_ingestion_disabled' });
  }
  try {
    const result = await physicalReadingService.ingest({
      devicePubkey: req.body.device_pubkey,
      packetHex: req.body.packet_hex,
      transport: req.body.transport,
    });
    return res.status(result.duplicate ? 200 : 201).json({ success: true, result });
  } catch (error) {
    if (error instanceof PhysicalReadingError) {
      return res.status(error.status).json({ error: error.code });
    }
    console.error('Physical Ndani Kit ingestion failed:', error);
    return res.status(500).json({ error: 'physical_ndani_ingestion_failed' });
  }
});

export { router as physicalNdaniRouter };
