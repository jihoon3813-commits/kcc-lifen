import { db } from '../db/index.js';

export function recordAuditLog({ projectId = null, userId = null, userName = '시스템', action, detail, req = null }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') : '';
    const uId = userId || (req?.user?.id ?? null);
    const uName = userName !== '시스템' ? userName : (req?.user?.name ?? '시스템');

    db.prepare(`
      INSERT INTO audit_logs (project_id, user_id, user_name, action, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, uId, uName, action, detail, ip);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
