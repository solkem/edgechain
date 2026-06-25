import { authRepository } from '../../auth/authRepository';
import { agentRepository } from '../infrastructure/agentRepository';
import { modelGateway } from '../infrastructure/geminiProvider';
import { ModelGateway } from '../infrastructure/modelGateway';
import { AgentState } from '../domain/stateMachine';

export class AgentService {
  constructor(private readonly gateway: ModelGateway = modelGateway) {}

  async getLatestWebConversation(input: {
    farmerId: string;
    farmId: string;
  }) {
    await this.assertFarmAccess(input.farmerId, input.farmId);
    return agentRepository.getLatestWebConversation(input);
  }

  async receiveWebMessage(input: {
    farmerId: string;
    farmId: string;
    text: string;
    externalMessageId?: string;
    preferredLanguage?: string;
  }) {
    const text = String(input.text ?? '').trim();
    if (!text || text.length > 2_000) {
      throw new AgentRequestError('message_must_contain_1_to_2000_characters', 400);
    }
    await this.assertFarmAccess(input.farmerId, input.farmId);
    const context = await agentRepository.getProcessingContext(input);
    const controlEvent = controlEventFor(text, context.state);
    if (controlEvent) {
      try {
        return await agentRepository.processWebMessage({ ...input, text, controlEvent });
      } catch (error) {
        if ((error as Error).message === 'virtual_ndani_cycle_mode_conflict') {
          throw new AgentRequestError('finish_guided_reading_first', 409);
        }
        throw error;
      }
    }
    const extractionResult = await this.gateway.extractObservation({
      farmerMessage: text,
      currentDraft: context.draft,
      pendingField: context.pendingField,
      pendingValue: context.pendingValue,
      preferredLanguage: input.preferredLanguage,
    });
    try {
      return await agentRepository.processWebMessage({
        ...input,
        text,
        extractionResult,
      });
    } catch (error) {
      if ((error as Error).message === 'virtual_ndani_cycle_mode_conflict') {
        throw new AgentRequestError('finish_guided_reading_first', 409);
      }
      throw error;
    }
  }

  private async assertFarmAccess(farmerId: string, farmId: string): Promise<void> {
    if (!isUuid(farmId)) {
      throw new AgentRequestError('farm_not_found', 404);
    }
    const allowed = await authRepository.farmerCanAccessFarm(farmerId, farmId);
    if (!allowed) {
      throw new AgentRequestError('farm_not_found', 404);
    }
  }
}

export class AgentRequestError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export const agentService = new AgentService();

function controlEventFor(
  text: string,
  state: AgentState
): 'CONFIRM_SUBMIT' | 'EDIT' | 'CANCEL' | undefined {
  const normalized = text.trim().toUpperCase();
  if (normalized === 'CANCEL') return 'CANCEL';
  if (normalized === 'EDIT') return 'EDIT';
  if (
    ['YES', 'Y', 'SUBMIT'].includes(normalized) &&
    state === 'awaiting_submission_confirmation'
  ) {
    return 'CONFIRM_SUBMIT';
  }
  return undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}
