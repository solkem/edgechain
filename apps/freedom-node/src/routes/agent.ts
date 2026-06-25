import { Router } from 'express';
import { FarmerRequest, requireFarmerSession } from '../auth/authMiddleware';
import { AgentRequestError, agentService } from '../agent/application/agentService';

const router = Router();
router.use(requireFarmerSession);

router.get('/conversations/latest', async (req: FarmerRequest, res) => {
  try {
    const result = await agentService.getLatestWebConversation({
      farmerId: req.farmer!.farmer_id,
      farmId: String(req.query.farm_id ?? ''),
    });
    if (!result) {
      return res.status(404).json({ error: 'conversation_not_found' });
    }
    return res.json({
      success: true,
      conversation: {
        conversation_id: result.conversation.conversation_id,
        farm_id: result.conversation.farm_id,
        state: result.conversation.state,
        status: result.conversation.status,
        version: result.conversation.version,
      },
      messages: result.messages,
    });
  } catch (error) {
    if (error instanceof AgentRequestError) {
      return res.status(error.status).json({ error: error.code });
    }
    return res.status(500).json({ error: 'conversation_load_failed' });
  }
});

router.post('/messages', async (req: FarmerRequest, res) => {
  try {
    const result = await agentService.receiveWebMessage({
      farmerId: req.farmer!.farmer_id,
      farmId: String(req.body.farm_id ?? ''),
      text: String(req.body.text ?? ''),
      externalMessageId: req.body.external_message_id
        ? String(req.body.external_message_id)
        : undefined,
      preferredLanguage: req.farmer!.preferred_language,
    });
    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate,
      conversation: {
        conversation_id: result.conversation.conversation_id,
        farm_id: result.conversation.farm_id,
        state: result.conversation.state,
        status: result.conversation.status,
        version: result.conversation.version,
      },
      decision: {
        event: result.transition.event,
        previous_state: result.transition.previousState,
        next_state: result.transition.nextState,
        rule_version: result.transition.ruleVersion,
        reason: result.transition.reason,
      },
      reply: result.reply,
      virtual_ndani: result.virtualNdani
        ? {
            virtual_device_id: result.virtualNdani.virtual_device_id,
            device_code: result.virtualNdani.device_code,
            reading_id: result.virtualNdani.reading_id,
            quality_status: result.virtualNdani.quality_status,
            coordinator_review_required:
              result.virtualNdani.coordinator_review_required,
            model_ready: result.virtualNdani.model_ready,
            eligible_feature_count:
              result.virtualNdani.eligible_feature_count,
          }
        : undefined,
    });
  } catch (error) {
    if (error instanceof AgentRequestError) {
      return res.status(error.status).json({ error: error.code });
    }
    return res.status(500).json({ error: 'agent_message_failed' });
  }
});

export { router as agentRouter };
