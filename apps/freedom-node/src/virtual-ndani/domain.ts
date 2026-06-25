export const VIRTUAL_NDANI_DEVICE_STATES = [
  'provisioned',
  'ready',
  'reading_due',
  'collecting_manual',
  'collecting_physical',
  'validating',
  'needs_clarification',
  'needs_coordinator_review',
  'reading_accepted',
  'batch_preparing',
  'batch_ready',
  'contribution_recorded',
  'offline',
  'suspended',
] as const;

export type VirtualNdaniDeviceState = typeof VIRTUAL_NDANI_DEVICE_STATES[number];

export const VIRTUAL_NDANI_CYCLE_STATES = [
  'scheduled',
  'started',
  'capturing',
  'awaiting_confirmation',
  'validated',
  'flagged',
  'accepted',
  'batched',
  'cancelled',
  'missed',
] as const;

export type VirtualNdaniCycleState = typeof VIRTUAL_NDANI_CYCLE_STATES[number];

export const COLLECTION_MODES = [
  'manual_guided',
  'manual_agent',
  'coordinator_assisted',
  'external_context',
  'physical_auto',
  'synthetic_demo',
] as const;

export type CollectionMode = typeof COLLECTION_MODES[number];

export const SOURCE_CLASSES = [
  'physical_sensor',
  'manual_proxy',
  'external_context',
  'derived',
  'synthetic_demo',
] as const;

export const MEASUREMENT_KINDS = [
  'measured',
  'observed',
  'derived',
  'unavailable',
] as const;

const DEVICE_TRANSITIONS: Record<VirtualNdaniDeviceState, readonly VirtualNdaniDeviceState[]> = {
  provisioned: ['ready', 'suspended'],
  ready: ['reading_due', 'offline', 'suspended'],
  reading_due: ['collecting_manual', 'collecting_physical', 'offline', 'suspended'],
  collecting_manual: ['validating', 'needs_clarification', 'reading_due', 'suspended'],
  collecting_physical: ['validating', 'offline', 'suspended'],
  validating: ['needs_clarification', 'needs_coordinator_review', 'reading_accepted', 'suspended'],
  needs_clarification: ['collecting_manual', 'needs_coordinator_review', 'suspended'],
  needs_coordinator_review: ['reading_accepted', 'reading_due', 'suspended'],
  reading_accepted: ['batch_preparing', 'reading_due', 'suspended'],
  batch_preparing: ['batch_ready', 'needs_coordinator_review', 'suspended'],
  batch_ready: ['contribution_recorded', 'reading_due', 'suspended'],
  contribution_recorded: ['reading_due', 'offline', 'suspended'],
  offline: ['ready', 'reading_due', 'suspended'],
  suspended: ['ready'],
};

const CYCLE_TRANSITIONS: Record<VirtualNdaniCycleState, readonly VirtualNdaniCycleState[]> = {
  scheduled: ['started', 'cancelled', 'missed'],
  started: ['capturing', 'cancelled'],
  capturing: ['awaiting_confirmation', 'flagged', 'cancelled'],
  awaiting_confirmation: ['validated', 'capturing', 'cancelled'],
  validated: ['accepted', 'flagged'],
  flagged: ['accepted', 'cancelled'],
  accepted: ['batched'],
  batched: [],
  cancelled: [],
  missed: [],
};

export function canTransitionDevice(
  from: VirtualNdaniDeviceState,
  to: VirtualNdaniDeviceState
): boolean {
  return DEVICE_TRANSITIONS[from].includes(to);
}

export function canTransitionCycle(
  from: VirtualNdaniCycleState,
  to: VirtualNdaniCycleState
): boolean {
  return CYCLE_TRANSITIONS[from].includes(to);
}

export function isCollectionMode(value: string): value is CollectionMode {
  return (COLLECTION_MODES as readonly string[]).includes(value);
}
