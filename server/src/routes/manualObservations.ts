import { Router } from 'express';
import { manualObservationWorkflow } from '../services/manualObservationWorkflow';
import { ManualObservationChannel } from '../types/manualObservation';

const router = Router();

router.get('/schema', (_req, res) => {
  res.json({
    success: true,
    schema: manualObservationWorkflow.schema(),
  });
});

router.post('/sessions', (req, res) => {
  try {
    const channel = (req.body.channel || 'api') as ManualObservationChannel;
    if (!['whatsapp', 'coordinator', 'api'].includes(channel)) {
      return res.status(400).json({ error: 'channel must be whatsapp, coordinator, or api' });
    }

    const reply = manualObservationWorkflow.startSession({
      channel,
      participant_phone: req.body.participant_phone,
    });

    res.json({ success: true, ...reply });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:sessionId/respond', (req, res) => {
  try {
    if (!req.body.input) {
      return res.status(400).json({ error: 'input required' });
    }

    const reply = manualObservationWorkflow.continueSession(req.params.sessionId, String(req.body.input));
    res.json({ success: true, ...reply });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/observations', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json({
    success: true,
    observations: manualObservationWorkflow.listObservations(limit),
  });
});

router.get('/observations.csv', (_req, res) => {
  const rows = manualObservationWorkflow.listObservations(10000);
  const header = [
    'observation_id',
    'site_id',
    'channel',
    'observation_date',
    'validation_status',
    'review_status',
    'crop_type',
    'crop_stage',
    'rain_level',
    'soil_condition',
    'plant_condition',
    'pest_or_disease_signs',
    'irrigated_today',
    'photo_status',
    'notes',
  ];
  const csv = [
    header.join(','),
    ...rows.map(row => header.map(column => csvValue(valueForColumn(row, column))).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="manual_observations.csv"');
  res.send(csv);
});

function valueForColumn(row: any, column: string): unknown {
  if (column in row) {
    return row[column];
  }
  return row.payload?.[column];
}

function csvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export { router as manualObservationsRouter };
