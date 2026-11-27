import express from 'express';
import { convexClient, api } from '../convex.js';
import { requireAuth, requireMenu } from '../middleware/auth.js';

const router = express.Router();

function extractSecret(req) {
  return String(req.headers['x-bridge-secret'] || req.body?.secret || '').trim();
}

router.post('/poll', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await convexClient.mutation(api.smsBridge.pollOutbox, {
      secret: extractSecret(req),
      deviceName: typeof body.deviceName === 'string' ? body.deviceName.trim() : undefined,
      appVersion: typeof body.appVersion === 'string' ? body.appVersion.trim() : undefined,
    });
    return res.status(result.ok ? 200 : 401).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Poll failed', jobs: [] });
  }
});

router.post('/ack', async (req, res) => {
  try {
    const body = req.body || {};
    const outboxId = String(body.outboxId || '').trim();
    if (!outboxId) {
      return res.status(400).json({ ok: false, error: 'outboxId is required' });
    }
    const result = await convexClient.mutation(api.smsBridge.ackOutbox, {
      secret: extractSecret(req),
      outboxId,
      success: Boolean(body.success),
      errorMessage: typeof body.errorMessage === 'string' ? body.errorMessage : undefined,
    });
    return res.status(result.ok ? 200 : 401).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Ack failed' });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.messages)
        ? body.messages
        : [];
    const result = await convexClient.mutation(api.smsBridge.syncMessages, {
      secret: extractSecret(req),
      deviceName: typeof body.deviceName === 'string' ? body.deviceName.trim() : undefined,
      count: items.length,
    });
    return res.status(result.ok ? 200 : 401).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, synced: 0, error: err?.message || 'Sync failed' });
  }
});

router.get('/status', requireAuth, requireMenu('settings'), async (req, res) => {
  try {
    const status = await convexClient.query(api.smsBridge.getBridgeStatus, {});
    return res.json({ ok: true, ...status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Status fetch failed' });
  }
});

export default router;
