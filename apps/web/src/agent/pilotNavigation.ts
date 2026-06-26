import {
  VIRTUAL_NDANI_COORDINATOR_ENABLED,
  VIRTUAL_NDANI_ENABLED,
} from './api';
import type { PilotSession } from './types';

const FARMER_RETURN_PATHS = new Set([
  '/virtual-ndani',
  '/virtual-ndani/reading',
  '/virtual-ndani/demo',
  '/farm-assistant',
]);

export function pilotDestination(
  session: PilotSession,
  requestedPath?: unknown
): string {
  if (session.farmer.system_role === 'coordinator') {
    return VIRTUAL_NDANI_COORDINATOR_ENABLED ? '/coordinator' : '/';
  }
  if (
    typeof requestedPath === 'string'
    && FARMER_RETURN_PATHS.has(requestedPath)
  ) {
    return requestedPath;
  }
  return VIRTUAL_NDANI_ENABLED ? '/virtual-ndani' : '/farm-assistant';
}
