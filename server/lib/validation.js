const VALID_EVENT_TYPES = new Set(['HARVEST', 'BALE_PREP', 'DISPATCH']);

function requiredString(value, fieldName, errors, maxLength = 120) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${fieldName} is required.`);
    return '';
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    errors.push(`${fieldName} must be <= ${maxLength} characters.`);
  }

  return normalized;
}

function optionalString(value, maxLength = 120) {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function parseIsoDate(value, fieldName, errors) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldName} must be a valid ISO date.`);
    return null;
  }
  return parsed.toISOString();
}

export function validateSessionPayload(payload) {
  const errors = [];

  const farmer_id = requiredString(payload?.farmer_id, 'farmer_id', errors, 64);
  const consent_yes_no = payload?.consent_yes_no === true;

  if (!consent_yes_no) {
    errors.push('consent_yes_no must be true before starting a session.');
  }

  const started_at_iso = payload?.started_at_iso
    ? parseIsoDate(payload.started_at_iso, 'started_at_iso', errors)
    : new Date().toISOString();

  return {
    errors,
    normalized: {
      farmer_id,
      consent_yes_no,
      started_at_iso,
    },
  };
}

export function validateEventPayload(payload) {
  const errors = [];

  const event_type = requiredString(payload?.event_type, 'event_type', errors, 32);
  if (event_type && !VALID_EVENT_TYPES.has(event_type)) {
    errors.push('event_type must be HARVEST, BALE_PREP, or DISPATCH.');
  }

  const farmer_id = requiredString(payload?.farmer_id, 'farmer_id', errors, 64);
  const crop_lot_id = requiredString(payload?.crop_lot_id, 'crop_lot_id', errors, 64);

  const event_time_iso = parseIsoDate(payload?.event_time_iso, 'event_time_iso', errors);

  const notesRaw = typeof payload?.notes_short === 'string' ? payload.notes_short.trim() : '';
  if (!notesRaw) {
    errors.push('notes_short is required.');
  }
  if (notesRaw.length > 280) {
    errors.push('notes_short must be <= 280 characters.');
  }

  const normalized = {
    session_id: payload?.session_id ? String(payload.session_id) : null,
    consent_yes_no: payload?.consent_yes_no === true,
    event_id: payload?.event_id ? String(payload.event_id) : null,
    farmer_id,
    event_type,
    crop_lot_id,
    event_time_iso,
    notes_short: notesRaw,
    bale_tag: optionalString(payload?.bale_tag, 64),
    est_weight_kg: payload?.est_weight_kg == null || payload?.est_weight_kg === ''
      ? null
      : Number(payload.est_weight_kg),
    est_grade: optionalString(payload?.est_grade, 32),
    destination_floor: optionalString(payload?.destination_floor, 64),
    transporter_name: optionalString(payload?.transporter_name, 64),
    departure_time_iso: payload?.departure_time_iso
      ? parseIsoDate(payload?.departure_time_iso, 'departure_time_iso', errors)
      : null,
  };

  if (normalized.event_type === 'BALE_PREP') {
    if (!normalized.bale_tag) {
      errors.push('bale_tag is required for BALE_PREP.');
    }
    if (normalized.est_weight_kg == null || Number.isNaN(normalized.est_weight_kg)) {
      errors.push('est_weight_kg is required for BALE_PREP and must be numeric.');
    } else if (normalized.est_weight_kg <= 0) {
      errors.push('est_weight_kg must be greater than 0.');
    }
    if (!normalized.est_grade) {
      errors.push('est_grade is required for BALE_PREP.');
    }
  }

  if (normalized.event_type === 'DISPATCH') {
    if (!normalized.destination_floor) {
      errors.push('destination_floor is required for DISPATCH.');
    }
    if (!normalized.transporter_name) {
      errors.push('transporter_name is required for DISPATCH.');
    }
    if (!normalized.departure_time_iso) {
      errors.push('departure_time_iso is required for DISPATCH.');
    }
  }

  return { errors, normalized };
}

export function toEventDay(isoString) {
  if (!isoString || typeof isoString !== 'string') {
    return null;
  }
  return isoString.slice(0, 10);
}
