import { isCollectionMode } from './domain';
import {
  GUIDED_READING_OPTIONS,
  GuidedReadingValidationError,
  validateGuidedReading,
} from './guidedReading';
import { virtualNdaniRepository } from './repository';
import { operationsService } from './operationsService';
import { physicalReadingService } from './physicalReadingService';
import { demoService } from './demoService';

export class VirtualNdaniError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const virtualNdaniService = {
  async list(farmerId: string) {
    await virtualNdaniRepository.ensureForFarmer(farmerId);
    if (schedulingEnabled()) await operationsService.run();
    const devices = await virtualNdaniRepository.listForFarmer(farmerId);
    return Promise.all(devices.map((device) => enrichDevice(device)));
  },

  async get(farmerId: string, deviceId: string) {
    await virtualNdaniRepository.ensureForFarmer(farmerId);
    if (schedulingEnabled()) await operationsService.run();
    const device = await virtualNdaniRepository.findForFarmer(farmerId, deviceId);
    if (!device) throw new VirtualNdaniError('virtual_ndani_not_found', 404);
    return enrichDevice(device);
  },

  async timeline(farmerId: string, deviceId: string, requestedLimit: unknown) {
    await this.get(farmerId, deviceId);
    const limit = Math.min(Math.max(Number(requestedLimit) || 20, 1), 100);
    return virtualNdaniRepository.timeline(deviceId, limit);
  },

  async startCycle(
    farmerId: string,
    deviceId: string,
    requestedMode: unknown
  ) {
    await this.get(farmerId, deviceId);
    const mode = String(requestedMode || 'manual_guided');
    if (!isCollectionMode(mode) || mode === 'synthetic_demo' || mode === 'physical_auto') {
      throw new VirtualNdaniError('invalid_pilot_collection_mode', 400);
    }
    try {
      return await virtualNdaniRepository.startCycle(deviceId, farmerId, mode);
    } catch (error) {
      if ((error as Error).message === 'cycle_collection_mode_conflict') {
        throw new VirtualNdaniError('cycle_collection_mode_conflict', 409);
      }
      throw error;
    }
  },

  async currentCycle(farmerId: string, deviceId: string) {
    await this.get(farmerId, deviceId);
    return virtualNdaniRepository.currentCycle(deviceId);
  },

  guidedReadingSchema() {
    return {
      schema_version: 'virtual-ndani-guided-reading-v1',
      required_fields: Object.keys(GUIDED_READING_OPTIONS),
      optional_fields: ['notes'],
      options: GUIDED_READING_OPTIONS,
      provenance: {
        measurement_kind: 'observed',
        source_class: 'manual_proxy',
      },
      hardware_only_channels: ['temperature', 'humidity', 'pressure'],
    };
  },

  async saveGuidedReading(
    farmerId: string,
    deviceId: string,
    cycleId: string,
    input: any
  ) {
    const device = await this.get(farmerId, deviceId);
    const cycle = await virtualNdaniRepository.findCycle(deviceId, cycleId);
    if (!cycle) throw new VirtualNdaniError('reading_cycle_not_found', 404);
    if (cycle.collection_mode && cycle.collection_mode !== 'manual_guided') {
      throw new VirtualNdaniError('cycle_not_guided_collection', 409);
    }
    try {
      const reading = validateGuidedReading(input);
      return await virtualNdaniRepository.saveGuidedReading({
        deviceId,
        cycleId,
        farmerId,
        farmId: device.farm_id,
        reading,
      });
    } catch (error) {
      if (error instanceof GuidedReadingValidationError) {
        throw new VirtualNdaniError(error.code, 400);
      }
      if ((error as Error).message === 'reading_cycle_not_open') {
        throw new VirtualNdaniError('reading_cycle_not_open', 409);
      }
      throw error;
    }
  },

  async getCycleReading(farmerId: string, deviceId: string, cycleId: string) {
    await this.get(farmerId, deviceId);
    const reading = await virtualNdaniRepository.getReadingForCycle(deviceId, cycleId);
    if (!reading) throw new VirtualNdaniError('reading_not_found', 404);
    return reading;
  },

  async confirmReading(farmerId: string, deviceId: string, cycleId: string) {
    await this.get(farmerId, deviceId);
    try {
      return await virtualNdaniRepository.confirmReading(deviceId, cycleId);
    } catch (error) {
      if ((error as Error).message === 'reading_not_awaiting_confirmation') {
        throw new VirtualNdaniError('reading_not_awaiting_confirmation', 409);
      }
      throw error;
    }
  },

  async contributions(
    farmerId: string,
    deviceId: string,
    requestedLimit: unknown
  ) {
    await this.get(farmerId, deviceId);
    const limit = Math.min(Math.max(Number(requestedLimit) || 10, 1), 50);
    return virtualNdaniRepository.listContributions(deviceId, limit);
  },

  async physicalComparison(
    farmerId: string,
    deviceId: string
  ) {
    await this.get(farmerId, deviceId);
    return physicalReadingService.comparison(deviceId);
  },

  async createDemoSession(farmerId: string, deviceId: string) {
    await this.get(farmerId, deviceId);
    return demoService.create({ farmerId, deviceId });
  },

  async getDemoSession(
    farmerId: string,
    deviceId: string,
    sessionId: string
  ) {
    await this.get(farmerId, deviceId);
    return demoService.get({ farmerId, deviceId, sessionId });
  },

  async deleteDemoSession(
    farmerId: string,
    deviceId: string,
    sessionId: string
  ) {
    await this.get(farmerId, deviceId);
    return demoService.delete({ farmerId, deviceId, sessionId });
  },
};

async function enrichDevice(device: any) {
  const channels = await virtualNdaniRepository.listChannels(device.virtual_device_id);
  const latestReading = await virtualNdaniRepository.latestConfirmedReading(
    device.virtual_device_id
  );
  const latestFields = await virtualNdaniRepository.latestAvailableFields(
    device.virtual_device_id
  );
  const contributions = await virtualNdaniRepository.listContributions(
    device.virtual_device_id,
    1
  );
  const operations = await operationsService.deviceStatus(device.virtual_device_id);
  const latestByChannel = new Map(
    latestFields.map((field: any) => [field.channel_key, field])
  );
  return {
    ...device,
    human_assisted: device.mode === 'human_assisted_pilot',
    channels: channels.map((channel) => ({
      ...channel,
      current: channelState(channel.channel_key, latestByChannel.get(channel.channel_key)),
    })),
    latest_reading: latestReading || null,
    latest_contribution: contributions[0] || null,
    operations,
    automation: {
      pilot_interval_minutes: device.expected_interval_minutes,
      future_physical_interval_minutes: device.future_physical_interval_minutes,
      future_readings_per_day: Math.floor(
        (24 * 60) / device.future_physical_interval_minutes
      ),
    },
  };
}

function channelState(channelKey: string, field?: any) {
  if (field && field.measurement_kind !== 'unavailable') {
    return {
      value: field.value,
      measurement_kind: field.measurement_kind,
      source_class: field.source_class,
      label: humanizeValue(field.value),
      observed_at: undefined,
    };
  }
  if (['temperature', 'humidity', 'pressure'].includes(channelKey)) {
    return {
      value: null,
      measurement_kind: 'unavailable',
      source_class: null,
      label: 'Awaiting hardware',
    };
  }
  return {
    value: null,
    measurement_kind: 'unavailable',
    source_class: null,
    label: 'Ready for farmer observation',
  };
}

function humanizeValue(value: unknown): string {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function schedulingEnabled(): boolean {
  return process.env.VIRTUAL_NDANI_SCHEDULING_ENABLED !== 'false';
}
