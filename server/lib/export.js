const EXPORT_HEADERS = [
  'event_id',
  'receipt_id',
  'event_type',
  'event_time_iso',
  'farmer_id',
  'crop_lot_id',
  'notes_short',
  'bale_tag',
  'est_weight_kg',
  'est_grade',
  'destination_floor',
  'transporter_name',
  'departure_time_iso',
  'fingerprint',
  'created_at_iso',
  'sync_state',
];

function toCsvCell(value) {
  if (value == null) {
    return '';
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function eventsToCsv(events) {
  const lines = [EXPORT_HEADERS.join(',')];

  for (const event of events) {
    const line = EXPORT_HEADERS.map((header) => toCsvCell(event[header])).join(',');
    lines.push(line);
  }

  return `${lines.join('\n')}\n`;
}
