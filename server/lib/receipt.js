import { sha256Hex } from './crypto.js';

export function fingerprintInput(record) {
  return [
    record.farmer_id,
    record.event_type,
    record.crop_lot_id,
    record.event_time_iso,
    record.event_id,
  ].join('|');
}

export function buildDeterministicReceipt(record) {
  const input = fingerprintInput(record);
  const fingerprint = sha256Hex(input);
  const receipt_id = `ODZI-${fingerprint.slice(0, 12).toUpperCase()}`;
  return { input, fingerprint, receipt_id };
}
