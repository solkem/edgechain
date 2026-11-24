import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { FarmerRequest } from '../auth/authMiddleware';
import { authRepository } from '../auth/authRepository';
import { db } from '../database';
import { loadFarmForecast, parseForecastLocation } from '../ai-farm-manager/farmForecast';

const router = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.use('/:farmId', async (req: FarmerRequest, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (!uuid.test(req.params.farmId)
      || !await authRepository.farmerCanAccessFarm(req.farmer!.farmer_id, req.params.farmId)) {
      return res.status(404).json({ error: 'farm_not_found' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

router.get('/:farmId', async (req: FarmerRequest, res, next) => {
  const farmerId = req.farmer!.farmer_id;
  const farmId = req.params.farmId;
  try {
    const briefing = await loadFarmForecast(farmerId, farmId);
    if (!briefing) return res.status(503).json({ error: 'forecast_unavailable' });

    const briefingId = randomUUID();
    await db.query(
      'INSERT INTO farm_forecast_briefings (briefing_id, farmer_id, farm_id, briefing) VALUES ($1, $2, $3, $4)',
      [briefingId, farmerId, farmId, briefing]
    );
    return res.json({
      briefing_id: briefingId,
      location: briefing.location,
      timezone: briefing.timezone,
      checked_at: briefing.checked_at,
      peak_time: briefing.peak_time,
      probability: briefing.probability,
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:farmId/location', async (req: FarmerRequest, res, next) => {
  const location = parseForecastLocation(req.body ?? {});
  if (!location) return res.status(400).json({ error: 'invalid_forecast_location' });

  try {
    await db.query(
      `INSERT INTO farm_forecast_locations (farmer_id, farm_id, latitude, longitude)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (farmer_id, farm_id) DO UPDATE
       SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`,
      [req.farmer!.farmer_id, req.params.farmId, location.latitude, location.longitude]
    );
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:farmId/location', async (req: FarmerRequest, res, next) => {
  try {
    await db.query(
      'DELETE FROM farm_forecast_locations WHERE farmer_id = $1 AND farm_id = $2',
      [req.farmer!.farmer_id, req.params.farmId]
    );
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

router.put('/:farmId/rain', async (req: FarmerRequest, res, next) => {
  const { briefing_id, rain_observed } = req.body ?? {};
  if (typeof briefing_id !== 'string' || !uuid.test(briefing_id) || typeof rain_observed !== 'boolean') {
    return res.status(400).json({ error: 'invalid_rain_observation' });
  }

  try {
    const result = await db.query(
      `UPDATE farm_forecast_briefings
       SET rain_observed = $1, observed_at = NOW()
       WHERE briefing_id = $2 AND farmer_id = $3 AND farm_id = $4
         AND briefing->>'location' = 'farm'
         AND ((briefing->>'checked_at')::timestamptz AT TIME ZONE
              COALESCE(briefing->>'timezone', 'Africa/Harare'))::date =
             (NOW() AT TIME ZONE COALESCE(briefing->>'timezone', 'Africa/Harare'))::date`,
      [rain_observed, briefing_id, req.farmer!.farmer_id, req.params.farmId]
    );
    return result.rowCount ? res.sendStatus(204) : res.status(404).json({ error: 'briefing_not_found' });
  } catch (error) {
    return next(error);
  }
});

export { router as farmForecastRouter };
