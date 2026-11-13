import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// 1. Get Customers / Projects List
router.get('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { q, stage, product, partner, period, sort } = req.query;

  let sql = `
    SELECT
      p.id, p.title, p.product, p.status, p.label, p.source,
      p.landing_link_id, p.ad_channel, p.ad_campaign,
      p.partner_name, p.owner_name, p.measure_date, p.build_date, p.rough_quote_url, p.final_quote_url, p.drawing_url, p.note,
      p.created_at, p.updated_at,
      c.id as customer_id, c.name, c.phone, c.address, c.marketing_agreed,
      ll.code as ll_code, ll.name as ll_name, ll.channel as ll_channel,
      (SELECT total_price FROM quotes WHERE project_id = p.id AND status = 'published' ORDER BY version DESC, id DESC LIMIT 1) as quote_amount,
      (SELECT access_token FROM quotes WHERE project_id = p.id AND status = 'published' ORDER BY version DESC, id DESC LIMIT 1) as quote_token,
      (SELECT quote_type FROM quotes WHERE project_id = p.id AND status = 'published' ORDER BY version DESC, id DESC LIMIT 1) as quote_type,
      (SELECT COUNT(*) FROM quote_views qv JOIN quotes q ON qv.quote_id = q.id WHERE q.project_id = p.id) as view_count,
      (SELECT COUNT(*) FROM quote_dispatches qd WHERE qd.project_id = p.id AND qd.status = 'sent') as dispatch_count
    FROM projects p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN landing_links ll ON ll.id = p.landing_link_id
    WHERE 1=1
  `;
  const params = [];

  // Partner Isolation (Server-enforced! Supports Sub-Partners)
  if (req.partnerOrgId) {
    const childOrgs = db.prepare('SELECT id, name FROM organizations WHERE parent_id = ?').all(req.partnerOrgId);
    if (childOrgs.length > 0) {
      const allowedOrgIds = [req.partnerOrgId, ...childOrgs.map(c => c.id)];
      const idPlaceholders = allowedOrgIds.map(() => '?').join(',');
      sql += ` AND (p.org_id IN (${idPlaceholders}) OR p.partner_name IN (SELECT name FROM organizations WHERE id IN (${idPlaceholders})))`;
      params.push(...allowedOrgIds, ...allowedOrgIds);
    } else {
      sql += ' AND (p.org_id = ? OR p.partner_name = (SELECT name FROM organizations WHERE id = ?))';
      params.push(req.partnerOrgId, req.partnerOrgId);
    }
    if (partner && partner !== 'all') {
      sql += ' AND p.partner_name = ?';
      params.push(partner);
    }
  } else if (partner && partner !== 'all') {
    sql += ' AND p.partner_name = ?';
    params.push(partner);
  }

  // Search filter (name, phone, address, note, id)
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR p.note LIKE ? OR CAST(p.id AS TEXT) LIKE ?)`;
    params.push(term, term, term, term, term);
  }

  // Stage filter
  if (stage && stage !== 'all') {
    sql += ' AND p.status = ?';
    params.push(stage);
  }

  // Product filter
  if (product && product !== 'all') {
    sql += ' AND p.product = ?';
    params.push(product);
  }

  // Period filter (today, 7days, 30days)
  if (period === 'today') {
    sql += ` AND date(p.created_at, 'localtime') = date('now', 'localtime')`;
  } else if (period === '7') {
    sql += ` AND date(p.created_at, 'localtime') >= date('now', '-7 days', 'localtime')`;
  } else if (period === '30') {
    sql += ` AND date(p.created_at, 'localtime') >= date('now', '-30 days', 'localtime')`;
  }

  // Sorting
  if (sort === 'old') {
    sql += ' ORDER BY p.created_at ASC';
  } else if (sort === 'quote') {
    sql += ' ORDER BY quote_amount DESC NULLS LAST';
  } else {
    sql += ' ORDER BY p.id DESC';
  }

  const rows = db.prepare(sql).all(...params);

  // Batch fetch all published quotes for returned projects so rough/final quote info is always available
  const quotesByProj = new Map();
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const qRows = db.prepare(`
      SELECT id, project_id, version, title, quote_type, total_price, discount_amount, access_token,
             strftime('%Y-%m-%d', COALESCE(published_at, created_at)) as published_date,
             (SELECT COUNT(*) FROM quote_views qv WHERE qv.quote_id = quotes.id) as view_count
      FROM quotes
      WHERE project_id IN (${placeholders}) AND status = 'published'
      ORDER BY version DESC, id DESC
    `).all(...ids);

    for (const q of qRows) {
      if (!quotesByProj.has(q.project_id)) quotesByProj.set(q.project_id, []);
      quotesByProj.get(q.project_id).push({
        id: q.id,
        version: q.version,
        title: q.title,
        quoteType: q.quote_type || '가견적',
        totalPrice: q.total_price,
        discountAmount: q.discount_amount || 0,
        token: q.access_token,
        url: `/quote.html?token=${q.access_token}`,
        date: q.published_date,
        viewed: (q.view_count || 0) > 0
      });
    }
  }

  // Map into CRM client expected format
  const customers = rows.map(r => {
    const pQuotes = quotesByProj.get(r.id) || [];
    const roughQ = pQuotes.find(q => q.quoteType === '가견적') || null;
    const finalQ = pQuotes.find(q => q.quoteType === '최종견적') || null;
    const resolvedChannel = r.ad_channel || r.ll_channel || (r.source === '랜딩페이지' ? '기본 랜딩(미분류)' : r.source);
    return {
      id: r.id,
      customerId: r.customer_id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      product: r.product,
      status: r.status,
      label: r.label,
      source: r.source,
      adChannel: resolvedChannel,
      adCampaign: r.ad_campaign || r.ll_name || '',
      landingLinkId: r.landing_link_id || null,
      landingLinkCode: r.ll_code || '',
      partner: r.partner_name,
      owner: r.owner_name,
      date: r.created_at.slice(0, 10),
      note: r.note || '',
      measure: r.measure_date || '',
      build: r.build_date || '',
      roughQuoteUrl: r.rough_quote_url || (roughQ ? roughQ.url : ''),
      finalQuoteUrl: r.final_quote_url || (finalQ ? finalQ.url : ''),
      roughQuote: roughQ,
      finalQuote: finalQ,
      publishedQuotes: pQuotes,
      drawing: r.drawing_url || '',
      quote: r.quote_amount || 0,
      token: r.quote_token || '',
      quoteType: r.quote_type || '가견적',
      dispatchCount: r.dispatch_count || 0,
      viewed: (r.view_count || 0) > 0
    };
  });

  res.json({ customers });
});

// 2. Get Single Customer & Project Detail
router.get('/:id', requireAuth, checkPartnerAccess, (req, res) => {
  const projectId = parseInt(req.params.id, 10);

  const project = db.prepare(`
    SELECT p.*, c.name, c.phone, c.email, c.address, c.marketing_agreed,
           o.name as org_name,
           ll.code as ll_code, ll.name as ll_name, ll.channel as ll_channel
    FROM projects p
    JOIN customers c ON p.customer_id = c.id
    JOIN organizations o ON p.org_id = o.id
    LEFT JOIN landing_links ll ON ll.id = p.landing_link_id
    WHERE p.id = ?
  `).get(projectId);

  if (!project) {
    return res.status(404).json({ error: '고객 공사건을 찾을 수 없습니다.' });
  }

  // Partner Isolation Check
  if (req.partnerOrgId && project.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '해당 고객 정보에 접근 권한이 없습니다.' });
  }

  // Consultations & Feedback
  const notes = db.prepare(`
    SELECT id, author_name as by, type, content as text, is_important as important,
           strftime('%m.%d %H:%M', created_at, 'localtime') as date
    FROM consultations
    WHERE project_id = ?
    ORDER BY id DESC
  `).all(projectId);

  // Quotes
  const quotes = db.prepare(`
    SELECT q.*,
           (SELECT COUNT(*) FROM quote_views WHERE quote_id = q.id) as view_count
    FROM quotes q
    WHERE q.project_id = ?
    ORDER BY q.version DESC
  `).all(projectId);

  for (const q of quotes) {
    q.items = db.prepare(`
      SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order ASC
    `).all(q.id);
  }

  // Contracts
  const contracts = db.prepare(`
    SELECT * FROM contracts WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId);

  // Audit History
  const history = db.prepare(`
    SELECT id, user_name as by, action, detail as text,
           strftime('%m.%d %H:%M', created_at, 'localtime') as date
    FROM audit_logs
    WHERE project_id = ?
    ORDER BY id DESC
  `).all(projectId);

  // Estimate Sources (uploaded KCC files)
  const sources = db.prepare(`
    SELECT id, filename, original_name, file_url, parsed_cost, created_at
    FROM estimate_sources
    WHERE project_id = ?
    ORDER BY id DESC
  `).all(projectId);

  // SMS / Kakao Dispatches
  const dispatches = db.prepare(`
    SELECT id, channel, recipient_name, recipient_phone, message, quote_url, provider, status, sent_by,
           strftime('%m.%d %H:%M', created_at, 'localtime') as date
    FROM quote_dispatches
    WHERE project_id = ?
    ORDER BY id DESC
  `).all(projectId);

  res.json({
    customer: {
      id: project.id,
      customerId: project.customer_id,
      name: project.name,
      phone: project.phone,
      email: project.email,
      address: project.address,
      product: project.product,
      status: project.status,
      label: project.label,
      source: project.source,
      adChannel: project.ad_channel || project.ll_channel || (project.source === '랜딩페이지' ? '기본 랜딩(미분류)' : project.source),
      adCampaign: project.ad_campaign || project.ll_name || '',
      landingLinkId: project.landing_link_id || null,
      landingLinkCode: project.ll_code || '',
      partner: project.partner_name,
      owner: project.owner_name,
      date: project.created_at.slice(0, 10),
      note: project.note || '',
      description: project.description || '',
      measure: project.measure_date || '',
      build: project.build_date || '',
      roughQuoteUrl: project.rough_quote_url || '',
      finalQuoteUrl: project.final_quote_url || '',
      drawing: project.drawing_url || '',
      quote: quotes[0]?.total_price || 0,
      token: quotes[0]?.access_token || '',
      quoteType: quotes[0]?.quote_type || '가견적',
      viewed: (quotes[0]?.view_count || 0) > 0
    },
    notes: notes.filter(n => n.type === 'notes'),
    feedback: notes.filter(n => n.type === 'feedback'),
    quotes,
    contracts,
    history,
    sources,
    dispatches
  });
});

// 3. Create Customer & First Project
router.post('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { name, phone, address, product, owner, partner, source, adCampaign, landingLinkId, note } = req.body;

  if (!name || !phone || !address) {
    return res.status(400).json({ error: '고객명, 연락처, 공사 주소는 필수입니다.' });
  }

  // Determine Organization
  let targetOrgId = 1;
  let partnerName = partner || '직영';

  if (req.partnerOrgId) {
    targetOrgId = req.partnerOrgId;
    partnerName = req.user.org_name;
  } else if (partner && partner !== '직영') {
    const org = db.prepare('SELECT id, name FROM organizations WHERE name = ?').get(partner);
    if (org) {
      targetOrgId = org.id;
      partnerName = org.name;
    }
  }

  // Check if Customer already exists by phone
  let customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  if (!customer) {
    const custResult = db.prepare(`
      INSERT INTO customers (org_id, name, phone, address, marketing_agreed)
      VALUES (?, ?, ?, ?, 1)
    `).run(targetOrgId, name, phone, address);
    customer = { id: custResult.lastInsertRowid };
  }

  // Generate Project ID (e.g. max(id) + 1 or 3101)
  const maxProject = db.prepare('SELECT MAX(id) as max_id FROM projects').get();
  const nextProjectId = Math.max(3101, (maxProject?.max_id || 3100) + 1);

  const resolvedSource = String(source || '직접등록').trim() || '직접등록';
  db.prepare(`
    INSERT INTO projects (
      id, customer_id, org_id, title, product, status, label, source,
      landing_link_id, ad_channel, ad_campaign,
      partner_name, owner_name, note
    ) VALUES (?, ?, ?, ?, ?, '신규접수', '일반', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nextProjectId, customer.id, targetOrgId, `${name} 고객 ${product || '창호'} 공사`,
    product || '창호', resolvedSource,
    landingLinkId ? Number(landingLinkId) : null, resolvedSource, String(adCampaign || '').trim() || null,
    partnerName, owner || '미배정', note || ''
  );

  if (note) {
    db.prepare(`
      INSERT INTO consultations (project_id, user_id, author_name, type, content, is_important)
      VALUES (?, ?, ?, 'notes', ?, 0)
    `).run(nextProjectId, req.user.id, req.user.name, note);
  }

  recordAuditLog({
    projectId: nextProjectId,
    action: '고객 접수',
    detail: `새 고객 등록 · ${name} (${phone}) · ${product || '창호'}`,
    req
  });

  res.status(201).json({ id: nextProjectId, message: '고객이 성공적으로 등록되었습니다.' });
});

// 4. Update Customer / Project Status, Label, Owner, Schedule, Drawing
router.patch('/:id', requireAuth, checkPartnerAccess, (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

  if (!project) {
    return res.status(404).json({ error: '고객 공사건을 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && project.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '해당 고객 정보에 접근 권한이 없습니다.' });
  }

  const { status, label, owner, source, adCampaign, measure, build, roughQuoteUrl, finalQuoteUrl, drawing, description } = req.body;
  const updates = [];
  const params = [];
  const logDetails = [];

  if (status !== undefined && status !== project.status) {
    updates.push('status = ?');
    params.push(status);
    logDetails.push(`진행구분 변경: ${project.status} → ${status}`);
  }
  if (label !== undefined && label !== project.label) {
    updates.push('label = ?');
    params.push(label);
    logDetails.push(`라벨 변경: ${project.label} → ${label}`);
  }
  if (owner !== undefined && owner !== project.owner_name) {
    updates.push('owner_name = ?');
    params.push(owner);
    logDetails.push(`담당자 변경: ${project.owner_name} → ${owner}`);
  }
  if (source !== undefined) {
    const nextSource = String(source || '').trim() || project.source;
    if (nextSource !== project.source || nextSource !== project.ad_channel) {
      updates.push('source = ?');
      params.push(nextSource);
      updates.push('ad_channel = ?');
      params.push(nextSource);
      logDetails.push(`유입채널 변경: ${project.ad_channel || project.source || '미정'} → ${nextSource}`);
    }
  }
  if (adCampaign !== undefined) {
    const nextCamp = String(adCampaign || '').trim();
    if (nextCamp !== (project.ad_campaign || '')) {
      updates.push('ad_campaign = ?');
      params.push(nextCamp || null);
      logDetails.push(`광고캠페인 변경: ${project.ad_campaign || '없음'} → ${nextCamp || '없음'}`);
    }
  }
  if (measure !== undefined) {
    updates.push('measure_date = ?');
    params.push(measure || null);
    logDetails.push(`실측 예정일 변경: ${measure || '미정'}`);
  }
  if (build !== undefined) {
    updates.push('build_date = ?');
    params.push(build || null);
    logDetails.push(`시공 예정일 변경: ${build || '미정'}`);
  }
  if (roughQuoteUrl !== undefined) {
    updates.push('rough_quote_url = ?');
    params.push(roughQuoteUrl || null);
    logDetails.push(roughQuoteUrl ? `가견적 링크 등록·수정` : `가견적 링크 제거`);
  }
  if (finalQuoteUrl !== undefined) {
    updates.push('final_quote_url = ?');
    params.push(finalQuoteUrl || null);
    logDetails.push(finalQuoteUrl ? `최종견적 링크 등록·수정` : `최종견적 링크 제거`);
  }
  if (drawing !== undefined) {
    updates.push('drawing_url = ?');
    params.push(drawing || null);
    logDetails.push(drawing ? `내관도 링크 등록·수정` : `내관도 링크 제거`);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
    logDetails.push(`공사 상세정보 변경`);
  }

  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(projectId);
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (logDetails.length > 0) {
      recordAuditLog({
        projectId,
        action: '정보 변경',
        detail: logDetails.join(' · '),
        req
      });
    }
  }

  res.json({ message: '성공적으로 저장되었습니다.' });
});

// 5. Add Consultation Note or Feedback
router.post('/:id/notes', requireAuth, checkPartnerAccess, (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  const { type, note, important } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: '내용을 입력해 주세요.' });
  }

  const project = db.prepare('SELECT id, org_id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    return res.status(404).json({ error: '고객 공사건을 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && project.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '해당 고객 정보에 접근 권한이 없습니다.' });
  }

  const noteType = type === 'feedback' ? 'feedback' : 'notes';
  db.prepare(`
    INSERT INTO consultations (project_id, user_id, author_name, type, content, is_important)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projectId, req.user.id, req.user.name, noteType, note.trim(), important ? 1 : 0);

  recordAuditLog({
    projectId,
    action: noteType === 'feedback' ? '피드백 등록' : '상담 이력 등록',
    detail: note.trim().slice(0, 50),
    req
  });

  res.status(201).json({ message: '기록이 등록되었습니다.' });
});

export default router;
