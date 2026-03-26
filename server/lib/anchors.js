import { buildMerkleTree } from './merkle.js';
import { toEventDay } from './validation.js';
import { withHexPrefix } from './crypto.js';

function sortForAnchoring(events) {
  return events
    .slice()
    .sort((a, b) => {
      if (a.fingerprint === b.fingerprint) {
        return a.event_id.localeCompare(b.event_id);
      }
      return a.fingerprint.localeCompare(b.fingerprint);
    });
}

function computeAnchoringSla(eventDay, anchoredAtIso) {
  const dayCloseMs = new Date(`${eventDay}T23:59:59.999Z`).getTime();
  const anchoredMs = new Date(anchoredAtIso).getTime();
  return anchoredMs <= dayCloseMs + 24 * 60 * 60 * 1000;
}

export function buildAnchorRecordForDay(events, payload) {
  const event_day = payload.event_day;
  const anchored_at_iso = payload.anchored_at_iso || new Date().toISOString();

  const dayEvents = sortForAnchoring(
    events.filter((event) => toEventDay(event.event_time_iso) === event_day),
  );

  const fingerprints = dayEvents.map((event) => event.fingerprint);
  const tree = buildMerkleTree(fingerprints);
  const merkle_root_hash = withHexPrefix(tree.root);

  const proof_map = {};
  dayEvents.forEach((event, index) => {
    const proof = tree.getProof(index).map((step) => ({
      position: step.position,
      hash: withHexPrefix(step.hash),
    }));

    proof_map[event.receipt_id] = {
      receipt_id: event.receipt_id,
      fingerprint: event.fingerprint,
      event_day,
      anchored_root_hash: merkle_root_hash,
      merkle_proof: proof,
      anchor_tx_hash: payload.anchor_tx_hash,
      anchored_at_iso,
      anchored_by: payload.anchored_by,
      reviewer_signoff_by: payload.reviewer_signoff_by || null,
    };
  });

  return {
    event_day,
    records_count: dayEvents.length,
    merkle_root_hash,
    anchor_tx_hash: payload.anchor_tx_hash,
    anchored_at_iso,
    anchored_by: payload.anchored_by,
    reviewer_signoff_by: payload.reviewer_signoff_by || null,
    anchoring_within_24h_yes_no: computeAnchoringSla(event_day, anchored_at_iso) ? 'yes' : 'no',
    inclusion_proofs_generated_count: dayEvents.length,
    reproducibility_checks_passed: payload.reproducibility_checks_passed ?? 0,
    reproducibility_checks_attempted: payload.reproducibility_checks_attempted ?? 0,
    status: 'ANCHORED',
    notes: payload.notes || '',
    proof_map,
  };
}
