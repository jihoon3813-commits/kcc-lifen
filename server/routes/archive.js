import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { convexClient, api } from '../convex.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  if (req.user?.role === 'partner') {
    return res.status(403).json({ error: '본사 관리자만 복구 보관함에 접근할 수 있습니다.' });
  }
  try {
    const archiveType = String(req.query.type || 'all');
    const includeRestored = req.query.includeRestored === '1';
    const items = await convexClient.query(api.archive.listDeletedArchives, {
      archiveType,
      includeRestored,
      limit: 120,
    });
    res.json({ items });
  } catch (err) {
    console.error('[Convex] GET /api/archive error:', err);
    res.status(500).json({ error: '복구 보관함 목록을 불러오지 못했습니다.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  if (req.user?.role === 'partner') {
    return res.status(403).json({ error: '본사 관리자만 복구 보관함에 접근할 수 있습니다.' });
  }
  try {
    const archiveId = String(req.body?.archiveId || '').trim();
    if (!archiveId) {
      return res.status(400).json({ error: '복원할 보관함 ID가 필요합니다.' });
    }
    const result = await convexClient.mutation(api.archive.restoreDeletedArchive, {
      archiveId,
      userName: req.user?.name || '관리자',
    });
    if (!result?.ok) {
      return res.status(400).json({ error: result?.error || '복원에 실패했습니다.' });
    }
    res.json(result);
  } catch (err) {
    console.error('[Convex] POST /api/archive error:', err);
    res.status(500).json({ error: '데이터 복원 중 오류가 발생했습니다.' });
  }
});

export default router;
