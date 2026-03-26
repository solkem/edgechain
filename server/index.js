import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  appendOperation,
  ensureDataStore,
  readAnchors,
  readEvents,
  readSessions,
  writeAnchors,
  writeEvents,
  writeSessions,
} from './lib/storage.js';
import { validateEventPayload, validateSessionPayload, toEventDay } from './lib/validation.js';
import { buildDeterministicReceipt } from './lib/receipt.js';
import { buildAnchorRecordForDay } from './lib/anchors.js';
import { eventsToCsv } from './lib/export.js';

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';
const APP_DIR = path.resolve(process.cwd(), 'app');

app.use(express.json({ limit: '128kb' }));
app.use(express.static(APP_DIR, { extensions: ['html'] }));

function isValidEventDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function eventSortDesc(a, b) {
  return new Date(b.event_time_iso).getTime() - new Date(a.event_time_iso).getTime();
}

function sendValidationFailure(res, errors) {
  return res.status(400).json({
    ok: false,
    errors,
  });
}

app.get('/health', async (_req, res) => {
  res.json({ ok: true, service: 'edgechain-pilot', time_iso: new Date().toISOString() });
});

app.post('/sessions', async (req, res) => {
  const { errors, normalized } = validateSessionPayload(req.body);

  if (errors.length > 0) {
    await appendOperation({
      type: 'validation_error',
      target: 'session',
      errors,
      payload: req.body,
    });
    return sendValidationFailure(res, errors);
  }

  const sessions = await readSessions();
  const candidateId = req.body?.session_id ? String(req.body.session_id) : randomUUID();
  const existing = sessions.find((session) => session.session_id === candidateId);

  if (existing) {
    return res.status(200).json({ ok: true, session: existing, deduplicated: true });
  }

  const session = {
    session_id: candidateId,
    farmer_id: normalized.farmer_id,
    consent_yes_no: true,
    started_at_iso: normalized.started_at_iso,
  };

  sessions.push(session);
  await writeSessions(sessions);

  return res.status(201).json({ ok: true, session });
});

app.get('/events', async (req, res) => {
  const events = await readEvents();
  const limit = Number(req.query.limit || 10);

  let filtered = events;
  if (typeof req.query.farmer_id === 'string' && req.query.farmer_id.trim()) {
    filtered = filtered.filter((event) => event.farmer_id === req.query.farmer_id.trim());
  }

  if (typeof req.query.event_day === 'string' && req.query.event_day.trim()) {
    const day = req.query.event_day.trim();
    filtered = filtered.filter((event) => toEventDay(event.event_time_iso) === day);
  }

  filtered = filtered.sort(eventSortDesc);

  res.json({
    ok: true,
    count: filtered.length,
    events: filtered.slice(0, Number.isFinite(limit) ? limit : 10),
  });
});

app.post('/events', async (req, res) => {
  const { errors, normalized } = validateEventPayload(req.body);

  if (errors.length > 0) {
    await appendOperation({
      type: 'validation_error',
      target: 'event',
      errors,
      payload: req.body,
    });
    return sendValidationFailure(res, errors);
  }

  const sessions = await readSessions();

  if (normalized.session_id) {
    const matchingSession = sessions.find((session) => session.session_id === normalized.session_id);
    if (!matchingSession) {
      return sendValidationFailure(res, ['session_id is invalid or unknown.']);
    }
    if (!matchingSession.consent_yes_no) {
      return sendValidationFailure(res, ['consent_yes_no must be true in session before event submission.']);
    }
    if (matchingSession.farmer_id !== normalized.farmer_id) {
      return sendValidationFailure(res, ['session farmer_id does not match event farmer_id.']);
    }
  } else if (normalized.consent_yes_no !== true) {
    return sendValidationFailure(res, ['consent_yes_no must be true when session_id is missing.']);
  }

  const eventId = normalized.event_id || randomUUID();
  const createdAt = new Date().toISOString();

  const canonicalEventInput = {
    ...normalized,
    event_id: eventId,
  };

  const receipt = buildDeterministicReceipt(canonicalEventInput);

  const eventRecord = {
    event_id: eventId,
    session_id: normalized.session_id,
    farmer_id: normalized.farmer_id,
    event_type: normalized.event_type,
    crop_lot_id: normalized.crop_lot_id,
    event_time_iso: normalized.event_time_iso,
    notes_short: normalized.notes_short,
    bale_tag: normalized.bale_tag,
    est_weight_kg: normalized.est_weight_kg,
    est_grade: normalized.est_grade,
    destination_floor: normalized.destination_floor,
    transporter_name: normalized.transporter_name,
    departure_time_iso: normalized.departure_time_iso,
    fingerprint: receipt.fingerprint,
    receipt_id: receipt.receipt_id,
    created_at_iso: createdAt,
    sync_state: 'Synced',
  };

  const events = await readEvents();
  const existingByEventId = events.find((item) => item.event_id === eventRecord.event_id);
  if (existingByEventId) {
    return res.status(200).json({ ok: true, event: existingByEventId, deduplicated: true });
  }

  const existingByReceipt = events.find((item) => item.receipt_id === eventRecord.receipt_id);
  if (existingByReceipt) {
    return res.status(200).json({ ok: true, event: existingByReceipt, deduplicated: true });
  }

  events.push(eventRecord);
  await writeEvents(events);

  await appendOperation({
    type: 'submission_complete',
    target: 'event',
    event_id: eventRecord.event_id,
    receipt_id: eventRecord.receipt_id,
  });

  return res.status(201).json({
    ok: true,
    event: eventRecord,
    receipt: {
      receipt_id: eventRecord.receipt_id,
      event_id: eventRecord.event_id,
      event_time_iso: eventRecord.event_time_iso,
      fingerprint: eventRecord.fingerprint,
      helper_text: 'Use this receipt to verify this record.',
    },
  });
});

app.get('/receipts/:receipt_id', async (req, res) => {
  const { receipt_id } = req.params;
  const events = await readEvents();
  const anchors = await readAnchors();

  const event = events.find((item) => item.receipt_id === receipt_id);
  if (!event) {
    return res.status(404).json({ ok: false, error: 'Receipt not found.' });
  }

  const event_day = toEventDay(event.event_time_iso);
  const anchor = anchors.find((item) => item.event_day === event_day);
  const anchored = Boolean(anchor && anchor.status === 'ANCHORED');

  const response = {
    ok: true,
    receipt_id: event.receipt_id,
    event_id: event.event_id,
    event_time_iso: event.event_time_iso,
    event_day,
    fingerprint: event.fingerprint,
    farmer_id: event.farmer_id,
    event_type: event.event_type,
    anchor_status: anchored ? 'Anchored' : 'Unanchored',
    merkle_root_hash: anchored ? anchor.merkle_root_hash : null,
    anchor_tx_hash: anchored ? anchor.anchor_tx_hash : null,
    anchored_at_iso: anchored ? anchor.anchored_at_iso : null,
    proof_url: anchored ? `/receipts/${event.receipt_id}/proof` : null,
  };

  return res.json(response);
});

app.get('/receipts/:receipt_id/proof', async (req, res) => {
  const { receipt_id } = req.params;
  const events = await readEvents();
  const anchors = await readAnchors();

  const event = events.find((item) => item.receipt_id === receipt_id);
  if (!event) {
    return res.status(404).json({ ok: false, error: 'Receipt not found.' });
  }

  const event_day = toEventDay(event.event_time_iso);
  const anchor = anchors.find((item) => item.event_day === event_day);
  if (!anchor || anchor.status !== 'ANCHORED') {
    return res.status(404).json({
      ok: false,
      error: 'Receipt is not anchored yet.',
      anchor_status: 'Unanchored',
    });
  }

  const proof = anchor.proof_map?.[receipt_id];
  if (!proof) {
    return res.status(404).json({ ok: false, error: 'Proof package not available for receipt.' });
  }

  return res.json({ ok: true, proof });
});

app.get('/anchors/:event_day', async (req, res) => {
  const event_day = req.params.event_day;

  if (!isValidEventDay(event_day)) {
    return sendValidationFailure(res, ['event_day must be in YYYY-MM-DD format.']);
  }

  const anchors = await readAnchors();
  const anchor = anchors.find((item) => item.event_day === event_day);

  if (!anchor) {
    return res.json({
      ok: true,
      event_day,
      status: 'UNANCHORED',
      message: 'No anchor submitted for this day yet.',
    });
  }

  return res.json({ ok: true, anchor });
});

app.post('/anchors', async (req, res) => {
  const event_day = String(req.body?.event_day || '');
  const anchor_tx_hash = String(req.body?.anchor_tx_hash || '').trim();
  const anchored_by = String(req.body?.anchored_by || '').trim();
  const reviewer_signoff_by = String(req.body?.reviewer_signoff_by || '').trim();

  const errors = [];
  if (!isValidEventDay(event_day)) {
    errors.push('event_day must be in YYYY-MM-DD format.');
  }
  if (!anchor_tx_hash) {
    errors.push('anchor_tx_hash is required.');
  }
  if (!anchored_by) {
    errors.push('anchored_by is required.');
  }

  if (errors.length > 0) {
    await appendOperation({
      type: 'validation_error',
      target: 'anchor',
      errors,
      payload: req.body,
    });
    return sendValidationFailure(res, errors);
  }

  const events = await readEvents();
  const dayEvents = events.filter((event) => toEventDay(event.event_time_iso) === event_day);

  if (dayEvents.length === 0) {
    return sendValidationFailure(res, ['No events found for event_day.']);
  }

  const anchors = await readAnchors();
  const anchorRecord = buildAnchorRecordForDay(events, {
    event_day,
    anchor_tx_hash,
    anchored_by,
    reviewer_signoff_by: reviewer_signoff_by || null,
    anchored_at_iso: req.body?.anchored_at_iso,
    reproducibility_checks_passed: Number(req.body?.reproducibility_checks_passed || 0),
    reproducibility_checks_attempted: Number(req.body?.reproducibility_checks_attempted || 0),
    notes: req.body?.notes,
  });

  const withoutCurrentDay = anchors.filter((anchor) => anchor.event_day !== event_day);
  withoutCurrentDay.push(anchorRecord);
  withoutCurrentDay.sort((a, b) => a.event_day.localeCompare(b.event_day));

  await writeAnchors(withoutCurrentDay);

  await appendOperation({
    type: 'anchor_submission',
    target: 'anchor',
    event_day,
    anchor_tx_hash,
    anchored_by,
    reviewer_signoff_by: reviewer_signoff_by || null,
    records_count: dayEvents.length,
  });

  return res.status(201).json({ ok: true, anchor: anchorRecord });
});

app.get('/export/events.csv', async (req, res) => {
  const events = await readEvents();

  let filtered = events;
  const eventDay = typeof req.query.event_day === 'string' ? req.query.event_day.trim() : '';
  const farmerId = typeof req.query.farmer_id === 'string' ? req.query.farmer_id.trim() : '';

  if (eventDay) {
    filtered = filtered.filter((event) => toEventDay(event.event_time_iso) === eventDay);
  }

  if (farmerId) {
    filtered = filtered.filter((event) => event.farmer_id === farmerId);
  }

  filtered = filtered.sort(eventSortDesc);

  const csv = eventsToCsv(filtered);
  const suffix = eventDay ? `day-${eventDay}` : farmerId ? `farmer-${farmerId}` : 'all';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="events-${suffix}.csv"`);
  return res.send(csv);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(APP_DIR, 'index.html'));
});

ensureDataStore()
  .then(() => {
    app.listen(PORT, HOST, () => {
      // eslint-disable-next-line no-console
      console.log(`EdgeChain pilot app running at http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize data store.', error);
    process.exitCode = 1;
  });
