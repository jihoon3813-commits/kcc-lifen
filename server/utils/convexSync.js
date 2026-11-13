import { db } from '../db/index.js';
import { convexClient, api } from '../convex.js';

let lastSyncAt = 0;
let inFlightSync = null;
const SYNC_COOLDOWN_MS = 5000;

/**
 * Pulls newly submitted projects/customers from Convex (e.g. Vercel landing page)
 * into local SQLite so the Admin CRM displays them immediately.
 * Existing SQLite projects are never overwritten.
 */
export async function syncProjectsFromConvex({ force = false, timeoutMs = 3000 } = {}) {
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_COOLDOWN_MS) {
    return { skipped: true };
  }
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    try {
      const remoteProjects = await Promise.race([
        convexClient.query(api.projects.list, {}),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Convex sync timeout')), timeoutMs)
        ),
      ]);

      if (!Array.isArray(remoteProjects) || remoteProjects.length === 0) {
        lastSyncAt = Date.now();
        return { inserted: 0 };
      }

      const hqOrg = db.prepare("SELECT id FROM organizations WHERE type = 'hq' ORDER BY id ASC LIMIT 1").get();
      const defaultOrgId = hqOrg ? hqOrg.id : 1;

      const findProject = db.prepare('SELECT id FROM projects WHERE id = ?');
      const findCustomerByPhone = db.prepare('SELECT id, address FROM customers WHERE phone = ? ORDER BY id ASC LIMIT 1');
      const insertCustomer = db.prepare(`
        INSERT INTO customers (org_id, name, phone, address, marketing_agreed, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `);
      const updateCustomerAddress = db.prepare('UPDATE customers SET address = ?, updated_at = ? WHERE id = ?');
      const findOrgByName = db.prepare('SELECT id FROM organizations WHERE name = ? LIMIT 1');
      const findLandingLinkByCode = db.prepare('SELECT id, channel, name FROM landing_links WHERE code = ? LIMIT 1');
      const insertProject = db.prepare(`
        INSERT OR IGNORE INTO projects (
          id, customer_id, org_id, title, product, status, label, source,
          partner_name, landing_link_id, ad_channel, ad_campaign,
          owner_name, measure_date, build_date, rough_quote_url, final_quote_url, drawing_url,
          description, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const findConsultation = db.prepare('SELECT id FROM consultations WHERE project_id = ? LIMIT 1');
      const insertConsultation = db.prepare(`
        INSERT INTO consultations (project_id, author_name, type, content, is_important, created_at)
        VALUES (?, '랜딩시스템', 'notes', ?, 1, ?)
      `);

      let inserted = 0;

      const runTx = db.transaction((projects) => {
        for (const p of projects) {
          const projectId = Number(p.projectId);
          if (!projectId || findProject.get(projectId)) continue;

          const partnerName = p.partnerName || '직영';
          let orgId = defaultOrgId;
          if (partnerName && partnerName !== '직영') {
            const partnerOrg = findOrgByName.get(partnerName);
            if (partnerOrg) orgId = partnerOrg.id;
          }

          const phone = String(p.customerPhone || '').trim();
          const name = String(p.customerName || '고객').trim();
          const address = String(p.customerAddress || '주소 미입력').trim();
          const createdAt = p.createdAt || new Date().toISOString();
          const updatedAt = p.updatedAt || createdAt;

          let customer = phone ? findCustomerByPhone.get(phone) : null;
          let customerId;
          if (customer) {
            customerId = customer.id;
            if (address && address.length > (customer.address || '').length) {
              updateCustomerAddress.run(address, updatedAt, customerId);
            }
          } else {
            const cRes = insertCustomer.run(orgId, name, phone, address, createdAt, updatedAt);
            customerId = Number(cRes.lastInsertRowid);
          }

          const source = p.source || '랜딩페이지';
          const linkMatch = findLandingLinkByCode.get(source);

          const res = insertProject.run(
            projectId,
            customerId,
            orgId,
            p.title || `${name} 고객 ${p.product || '창호'} 상담`,
            p.product || '창호',
            p.status || '신규접수',
            p.label || '상담요청',
            source,
            partnerName,
            linkMatch ? linkMatch.id : null,
            linkMatch ? linkMatch.channel : source,
            linkMatch ? linkMatch.name : '',
            p.ownerName || '미배정',
            p.measureDate || null,
            p.buildDate || null,
            p.roughQuoteUrl || null,
            p.finalQuoteUrl || null,
            p.drawingUrl || null,
            p.description || null,
            p.note || null,
            createdAt,
            updatedAt
          );

          if (res.changes > 0) {
            inserted += 1;
            if (p.note && !findConsultation.get(projectId)) {
              insertConsultation.run(projectId, p.note, createdAt);
            }
          }
        }
      });

      runTx(remoteProjects);
      lastSyncAt = Date.now();
      if (inserted > 0) {
        console.log(`[Convex Sync] Pulled ${inserted} new project(s) from Convex into SQLite.`);
      }
      return { inserted };
    } catch (err) {
      console.error('[Convex Sync] Failed to pull from Convex:', err.message);
      return { inserted: 0, error: err.message };
    } finally {
      inFlightSync = null;
    }
  })();

  return inFlightSync;
}
