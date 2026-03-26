import { createHash } from 'node:crypto';

export function sha256Hex(input) {
  return createHash('sha256').update(String(input), 'utf8').digest('hex');
}

export function withHexPrefix(value) {
  const normalized = String(value || '').toLowerCase().replace(/^0x/, '');
  return `0x${normalized}`;
}
