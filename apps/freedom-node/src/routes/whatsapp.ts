import { Router } from 'express';
import { manualObservationWorkflow } from '../services/manualObservationWorkflow';

const router = Router();

/**
 * Meta webhook verification endpoint.
 * Configure WHATSAPP_VERIFY_TOKEN in production before exposing this route.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * Pilot webhook adapter.
 * This currently extracts simple inbound text and advances the manual
 * observation workflow. Sending replies through Meta is intentionally left as
 * an adapter boundary; local tests return the reply in the HTTP response.
 */
router.post('/webhook', (req, res) => {
  try {
    const inbound = extractInboundText(req.body);
    if (!inbound) {
      return res.json({ success: true, ignored: true });
    }

    const reply = manualObservationWorkflow.continueOrStartWhatsAppSession(
      inbound.from,
      inbound.text
    );

    res.json({
      success: true,
      reply_text: reply.prompt,
      session: reply.session,
      observation: reply.observation,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Local pilot simulator endpoint. Use this before wiring Meta Cloud API:
 * POST /api/whatsapp/simulate { "from": "+263...", "text": "site-004" }
 */
router.post('/simulate', (req, res) => {
  try {
    const { from, text } = req.body;
    if (!from || !text) {
      return res.status(400).json({ error: 'from and text required' });
    }

    const reply = manualObservationWorkflow.continueOrStartWhatsAppSession(String(from), String(text));
    res.json({
      success: true,
      reply_text: reply.prompt,
      session: reply.session,
      observation: reply.observation,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function extractInboundText(payload: any): { from: string; text: string } | undefined {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const from = message?.from;
  const text = message?.text?.body;

  if (!from || !text) {
    return undefined;
  }

  return { from, text };
}

export { router as whatsappRouter };
