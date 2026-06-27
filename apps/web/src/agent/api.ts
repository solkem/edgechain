import type {
  AgentMessageResponse,
  AgentConversationResponse,
  FarmManagerChatResponse,
  PilotSession,
  VirtualNdaniDevice,
  VirtualNdaniEvent,
  VirtualNdaniCycle,
  VirtualNdaniReading,
  GuidedReadingDraft,
  VirtualNdaniContribution,
  CoordinatorFleetDevice,
  CoordinatorFarmer,
  CoordinatorReadingReview,
  FarmerAiProfile,
  AiFarmPlan,
  FarmerAiReport,
  FarmerTimelineEvent,
  WeeklyFarmCheckin,
  WeeklyFarmCheckinDraft,
  PilotOperationsMetrics,
  PilotEvidenceReport,
  PhysicalBindingChallenge,
  PhysicalBindingResult,
  PhysicalManualComparison,
  PhysicalNdaniDemoSession,
} from './types';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const PILOT_AGENT_ENABLED = import.meta.env.VITE_AGENT_ENABLED === 'true';
export const VIRTUAL_NDANI_ENABLED =
  PILOT_AGENT_ENABLED && import.meta.env.VITE_VIRTUAL_NDANI_ENABLED !== 'false';
export const VIRTUAL_NDANI_COORDINATOR_ENABLED =
  VIRTUAL_NDANI_ENABLED
  && import.meta.env.VITE_VIRTUAL_NDANI_COORDINATOR_ENABLED !== 'false';
export const VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED =
  VIRTUAL_NDANI_COORDINATOR_ENABLED
  && import.meta.env.VITE_VIRTUAL_NDANI_PHYSICAL_BINDING_ENABLED === 'true';
export const VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED =
  VIRTUAL_NDANI_ENABLED
  && import.meta.env.VITE_VIRTUAL_NDANI_PIPELINE_DEMO_ENABLED === 'true';

export class AgentApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export async function loadPilotSession(): Promise<PilotSession | null> {
  const response = await request('/api/v1/auth/session', { method: 'GET' });
  if (response.status === 401) return null;
  if (!response.ok) throw await toApiError(response);
  return response.json() as Promise<PilotSession>;
}

export async function loginPilotFarmer(
  pilotCode: string,
  pin: string
): Promise<void> {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      pilot_code: pilotCode.trim(),
      pin,
    }),
  });
  if (!response.ok) throw await toApiError(response);
}

export async function logoutPilotFarmer(): Promise<void> {
  const response = await request('/api/v1/auth/logout', { method: 'POST' });
  if (!response.ok && response.status !== 401) {
    throw await toApiError(response);
  }
}

export async function sendAgentMessage(input: {
  farmId: string;
  text: string;
  externalMessageId: string;
}): Promise<AgentMessageResponse> {
  const response = await request('/api/v1/agent/messages', {
    method: 'POST',
    body: JSON.stringify({
      farm_id: input.farmId,
      text: input.text,
      external_message_id: input.externalMessageId,
    }),
  });
  if (!response.ok) throw await toApiError(response);
  return response.json() as Promise<AgentMessageResponse>;
}

export async function sendFarmManagerChatMessage(input: {
  farmId: string;
  text: string;
}): Promise<FarmManagerChatResponse> {
  const response = await request('/api/v1/ai-farm-manager/chat', {
    method: 'POST',
    body: JSON.stringify({
      farm_id: input.farmId,
      text: input.text,
    }),
  });
  if (!response.ok) throw await toApiError(response);
  return response.json() as Promise<FarmManagerChatResponse>;
}

export async function loadLatestAgentConversation(
  farmId: string
): Promise<AgentConversationResponse | null> {
  const response = await request(
    `/api/v1/agent/conversations/latest?farm_id=${encodeURIComponent(farmId)}`,
    { method: 'GET' }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await toApiError(response);
  return response.json() as Promise<AgentConversationResponse>;
}

export async function loadVirtualNdaniDevices(): Promise<VirtualNdaniDevice[]> {
  const response = await request('/api/v1/virtual-ndani', { method: 'GET' });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    devices: VirtualNdaniDevice[];
  };
  return body.devices;
}

export async function loadVirtualNdaniTimeline(
  deviceId: string
): Promise<VirtualNdaniEvent[]> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/timeline?limit=12`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    events: VirtualNdaniEvent[];
  };
  return body.events;
}

export async function loadVirtualNdaniContributions(
  deviceId: string
): Promise<VirtualNdaniContribution[]> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/contributions?limit=10`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    contributions: VirtualNdaniContribution[];
  };
  return body.contributions;
}

export async function loadPhysicalManualComparison(
  deviceId: string
): Promise<PhysicalManualComparison> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/physical-comparison`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    comparison: PhysicalManualComparison;
  };
  return body.comparison;
}

export async function createPhysicalNdaniDemo(
  deviceId: string
): Promise<PhysicalNdaniDemoSession> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/demo-sessions`,
    { method: 'POST', body: '{}' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    session: PhysicalNdaniDemoSession;
  };
  return body.session;
}

export async function loadPhysicalNdaniDemo(
  deviceId: string,
  sessionId: string
): Promise<PhysicalNdaniDemoSession> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/demo-sessions/${encodeURIComponent(sessionId)}`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    session: PhysicalNdaniDemoSession;
  };
  return body.session;
}

export async function deletePhysicalNdaniDemo(
  deviceId: string,
  sessionId: string
): Promise<void> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/demo-sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw await toApiError(response);
}

export async function loadCoordinatorFleet(): Promise<CoordinatorFleetDevice[]> {
  const response = await request('/api/v1/coordinator/virtual-ndani', {
    method: 'GET',
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    devices: CoordinatorFleetDevice[];
  };
  return body.devices;
}

export async function loadCoordinatorFarmers(): Promise<CoordinatorFarmer[]> {
  const response = await request('/api/v1/coordinator/farmers', { method: 'GET' });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    farmers: CoordinatorFarmer[];
  };
  return body.farmers;
}

export async function enrollCoordinatorFarmer(input: {
  pilotCode: string;
  displayName: string;
  preferredLanguage: 'en' | 'sn' | 'sn-en';
  pin: string;
  siteId: string;
  farmDisplayName: string;
}): Promise<CoordinatorFarmer> {
  const response = await request('/api/v1/coordinator/farmers', {
    method: 'POST',
    body: JSON.stringify({
      pilot_code: input.pilotCode,
      display_name: input.displayName,
      preferred_language: input.preferredLanguage,
      pin: input.pin,
      site_id: input.siteId,
      farm_display_name: input.farmDisplayName,
    }),
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    farmer: CoordinatorFarmer;
  };
  return body.farmer;
}

export async function updateCoordinatorFarmer(input: {
  farmerId: string;
  displayName: string;
  preferredLanguage: 'en' | 'sn' | 'sn-en';
  status: 'active' | 'suspended' | 'withdrawn';
  farmDisplayName: string;
}): Promise<CoordinatorFarmer> {
  const response = await request(
    `/api/v1/coordinator/farmers/${encodeURIComponent(input.farmerId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: input.displayName,
        preferred_language: input.preferredLanguage,
        status: input.status,
        farm_display_name: input.farmDisplayName,
      }),
    }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    farmer: CoordinatorFarmer;
  };
  return body.farmer;
}

export async function resetCoordinatorFarmerPin(
  farmerId: string,
  pin: string
): Promise<void> {
  const response = await request(
    `/api/v1/coordinator/farmers/${encodeURIComponent(farmerId)}/reset-pin`,
    { method: 'POST', body: JSON.stringify({ pin }) }
  );
  if (!response.ok) throw await toApiError(response);
}

export async function deleteCoordinatorFarmer(farmerId: string): Promise<void> {
  const response = await request(
    `/api/v1/coordinator/farmers/${encodeURIComponent(farmerId)}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw await toApiError(response);
}

export async function loadCoordinatorFarmerAiProfile(
  farmerId: string
): Promise<FarmerAiProfile | null> {
  const response = await request(
    `/api/v1/coordinator/farmers/${encodeURIComponent(farmerId)}/ai-profile`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    profile: FarmerAiProfile | null;
  };
  return body.profile;
}

export async function saveCoordinatorFarmerAiProfile(input: {
  farmerId: string;
  preferredLanguage: 'en' | 'sn' | 'sn-en';
  literacyLevel: string;
  technologyComfort: string;
  primaryGoal: string;
  primaryPainPoint: string;
  secondaryPainPoints: string[];
  waterAccess: string;
  irrigationMethod: string;
  budgetConstraint: string;
  labourConstraint: string;
  mainCrops: string[];
  currentCrop: string;
  currentCropStage: string;
  soilType: string;
  farmStorySummary: string;
  aiManagerBrief: string;
  status: 'draft' | 'active' | 'needs_update' | 'archived';
}): Promise<FarmerAiProfile> {
  const response = await request(
    `/api/v1/coordinator/farmers/${encodeURIComponent(input.farmerId)}/ai-profile`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        preferred_language: input.preferredLanguage,
        literacy_level: input.literacyLevel,
        technology_comfort: input.technologyComfort,
        primary_goal: input.primaryGoal,
        primary_pain_point: input.primaryPainPoint,
        secondary_pain_points: input.secondaryPainPoints,
        water_access: input.waterAccess,
        irrigation_method: input.irrigationMethod,
        budget_constraint: input.budgetConstraint,
        labour_constraint: input.labourConstraint,
        main_crops: input.mainCrops,
        current_crop: input.currentCrop,
        current_crop_stage: input.currentCropStage,
        soil_type: input.soilType,
        farm_story_summary: input.farmStorySummary,
        ai_manager_brief: input.aiManagerBrief,
        status: input.status,
      }),
    }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    profile: FarmerAiProfile;
  };
  return body.profile;
}

export async function loadWeeklyFarmCheckins(): Promise<WeeklyFarmCheckin[]> {
  const response = await request('/api/v1/ai-farm-manager/checkins', {
    method: 'GET',
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    checkins: WeeklyFarmCheckin[];
  };
  return body.checkins;
}

export async function loadAiFarmPlans(): Promise<AiFarmPlan[]> {
  const response = await request('/api/v1/ai-farm-manager/plans', {
    method: 'GET',
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    plans: AiFarmPlan[];
  };
  return body.plans;
}

export async function loadFarmerTimeline(
  farmId: string
): Promise<FarmerTimelineEvent[]> {
  const response = await request(
    `/api/v1/ai-farm-manager/timeline?farm_id=${encodeURIComponent(farmId)}`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    events: FarmerTimelineEvent[];
  };
  return body.events;
}

export async function loadFarmerAiReport(
  farmId: string
): Promise<FarmerAiReport> {
  const response = await request(
    `/api/v1/ai-farm-manager/report?farm_id=${encodeURIComponent(farmId)}`,
    { method: 'GET' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    report: FarmerAiReport;
  };
  return body.report;
}

export async function saveWeeklyFarmCheckin(
  draft: WeeklyFarmCheckinDraft
): Promise<{ checkin: WeeklyFarmCheckin; plan: AiFarmPlan }> {
  const response = await request('/api/v1/ai-farm-manager/checkins', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    checkin: WeeklyFarmCheckin;
    plan: AiFarmPlan;
  };
  return { checkin: body.checkin, plan: body.plan };
}

export async function loadCoordinatorReviews(): Promise<CoordinatorReadingReview[]> {
  const response = await request('/api/v1/coordinator/reading-reviews', {
    method: 'GET',
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    reviews: CoordinatorReadingReview[];
  };
  return body.reviews;
}

export async function submitCoordinatorReview(input: {
  readingId: string;
  decision: 'approved' | 'excluded';
  reason: string;
  coordinatorDurationSeconds?: number;
}): Promise<void> {
  const response = await request(
    `/api/v1/coordinator/reading-reviews/${encodeURIComponent(input.readingId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        decision: input.decision,
        reason: input.reason,
        coordinator_duration_seconds: input.coordinatorDurationSeconds,
      }),
    }
  );
  if (!response.ok) throw await toApiError(response);
}

export async function runCoordinatorOperations(): Promise<void> {
  const response = await request('/api/v1/coordinator/operations/run', {
    method: 'POST',
    body: '{}',
  });
  if (!response.ok) throw await toApiError(response);
}

export async function loadCoordinatorMetrics(): Promise<PilotOperationsMetrics> {
  const response = await request('/api/v1/coordinator/metrics', {
    method: 'GET',
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    metrics: PilotOperationsMetrics;
  };
  return body.metrics;
}

export async function loadCoordinatorEvidenceReport(): Promise<PilotEvidenceReport> {
  const response = await request('/api/v1/coordinator/evidence-report', {
    method: 'GET',
  });
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    report: PilotEvidenceReport;
  };
  return body.report;
}

export async function downloadCoordinatorEvidenceCsv(): Promise<void> {
  const response = await request('/api/v1/coordinator/evidence-report.csv', {
    method: 'GET',
    headers: { Accept: 'text/csv' },
  });
  if (!response.ok) throw await toApiError(response);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1]
    || 'edgechain-virtual-ndani-evidence.csv';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function issuePhysicalBindingChallenge(input: {
  deviceId: string;
  devicePubkey: string;
}): Promise<PhysicalBindingChallenge> {
  const response = await request(
    `/api/v1/coordinator/virtual-ndani/${encodeURIComponent(input.deviceId)}/physical-binding/challenge`,
    {
      method: 'POST',
      body: JSON.stringify({ device_pubkey: input.devicePubkey }),
    }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    challenge: PhysicalBindingChallenge;
  };
  return body.challenge;
}

export async function verifyPhysicalBinding(input: {
  deviceId: string;
  challengeId: string;
  signature: string;
}): Promise<PhysicalBindingResult> {
  const response = await request(
    `/api/v1/coordinator/virtual-ndani/${encodeURIComponent(input.deviceId)}/physical-binding/verify`,
    {
      method: 'POST',
      body: JSON.stringify({
        challenge_id: input.challengeId,
        signature: input.signature,
      }),
    }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    binding: PhysicalBindingResult;
  };
  return body.binding;
}

export async function markCoordinatorCycleMissed(input: {
  deviceId: string;
  cycleId: string;
  reason: string;
}): Promise<void> {
  const response = await request(
    `/api/v1/coordinator/virtual-ndani/${encodeURIComponent(input.deviceId)}/cycles/${encodeURIComponent(input.cycleId)}/missed`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: input.reason }),
    }
  );
  if (!response.ok) throw await toApiError(response);
}

export async function startVirtualNdaniCycle(
  deviceId: string,
  collectionMode: 'manual_guided' | 'manual_agent'
): Promise<VirtualNdaniCycle> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/cycles`,
    {
      method: 'POST',
      body: JSON.stringify({ collection_mode: collectionMode }),
    }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    cycle: VirtualNdaniCycle;
  };
  return body.cycle;
}

export async function loadVirtualNdaniCycleReading(
  deviceId: string,
  cycleId: string
): Promise<VirtualNdaniReading | null> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/cycles/${encodeURIComponent(cycleId)}/reading`,
    { method: 'GET' }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    reading: VirtualNdaniReading;
  };
  return body.reading;
}

export async function saveVirtualNdaniGuidedReading(
  deviceId: string,
  cycleId: string,
  draft: GuidedReadingDraft
): Promise<VirtualNdaniReading> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/cycles/${encodeURIComponent(cycleId)}/readings`,
    {
      method: 'POST',
      body: JSON.stringify(draft),
    }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    reading: VirtualNdaniReading;
  };
  return body.reading;
}

export async function confirmVirtualNdaniReading(
  deviceId: string,
  cycleId: string
): Promise<VirtualNdaniReading> {
  const response = await request(
    `/api/v1/virtual-ndani/${encodeURIComponent(deviceId)}/cycles/${encodeURIComponent(cycleId)}/confirm`,
    { method: 'POST', body: '{}' }
  );
  if (!response.ok) throw await toApiError(response);
  const body = await response.json() as {
    success: true;
    reading: VirtualNdaniReading;
  };
  return body.reading;
}

async function request(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${configuredApiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

async function toApiError(response: Response): Promise<AgentApiError> {
  let code = `request_failed_${response.status}`;
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') code = body.error;
  } catch {
    // Retain the status-based fallback.
  }
  return new AgentApiError(code, response.status);
}
