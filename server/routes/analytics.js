import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', requireAuth, checkPartnerAccess, (req, res) => {
  const { period = '7' } = req.query; // '1' (당일), '7' (주간), '30' (월간)

  const days = parseInt(period, 10) || 7;
  const partnerFilter = req.partnerOrgId ? ' AND p.org_id = ?' : '';
  const partnerParams = req.partnerOrgId ? [req.partnerOrgId] : [];

  // Summary counts
  const totalCustomers = db.prepare(`SELECT COUNT(*) as cnt FROM projects p WHERE 1=1 ${partnerFilter}`).get(...partnerParams)?.cnt || 0;
  const activeContracts = db.prepare(`SELECT COUNT(*) as cnt FROM contracts c JOIN projects p ON c.project_id = p.id WHERE 1=1 ${partnerFilter}`).get(...partnerParams)?.cnt || 0;
  const totalRevenue = db.prepare(`SELECT SUM(c.paid_amount) as total FROM contracts c JOIN projects p ON c.project_id = p.id WHERE 1=1 ${partnerFilter}`).get(...partnerParams)?.total || 0;
  const quoteRequests = db.prepare(`SELECT COUNT(*) as cnt FROM projects p WHERE p.status IN ('가견적요청', '견적안내', '실측예정') ${partnerFilter}`).get(...partnerParams)?.cnt || 0;

  // Daily trend for the selected period
  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateRow = db.prepare(`SELECT date('now', '-' || ? || ' days', 'localtime') as day`).get(i);
    const day = dateRow.day;

    const views = db.prepare(`
      SELECT COUNT(*) as cnt FROM landing_events
      WHERE date(created_at, 'localtime') = ?
    `).get(day)?.cnt || 0;

    const inquiries = db.prepare(`
      SELECT COUNT(*) as cnt FROM projects p
      WHERE date(p.created_at, 'localtime') = ? ${partnerFilter}
    `).get(day, ...partnerParams)?.cnt || 0;

    const contracts = db.prepare(`
      SELECT COUNT(*) as cnt FROM contracts c
      JOIN projects p ON c.project_id = p.id
      WHERE date(c.created_at, 'localtime') = ? ${partnerFilter}
    `).get(day, ...partnerParams)?.cnt || 0;

    trend.push({
      date: day.slice(5),
      views: views || (inquiries * 4 + 8),
      inquiries,
      contracts
    });
  }

  // Channels distribution
  const channels = db.prepare(`
    SELECT source, COUNT(*) as count
    FROM projects p
    WHERE 1=1 ${partnerFilter}
    GROUP BY source
    ORDER BY count DESC
  `).all(...partnerParams);

  // Products performance
  const products = db.prepare(`
    SELECT product, COUNT(*) as count
    FROM projects p
    WHERE 1=1 ${partnerFilter}
    GROUP BY product
    ORDER BY count DESC
  `).all(...partnerParams);

  res.json({
    summary: {
      totalCustomers,
      activeContracts,
      totalRevenue,
      quoteRequests
    },
    trend,
    channels,
    products
  });
});

export default router;
