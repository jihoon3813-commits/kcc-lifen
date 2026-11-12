import { db } from '../server/db/index.js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

// 기본 대상: 운영 서버(savory-hedgehog-927) 또는 개발 서버(pleasant-grouse-295)
const targetUrl = process.env.CONVEX_URL || 'https://savory-hedgehog-927.convex.cloud';
const client = new ConvexHttpClient(targetUrl);

console.log(`====================================================`);
console.log(`[Convex Sync] Target Server: ${targetUrl}`);
console.log(`[Convex Sync] Syncing 100% operational data from local DB...`);
console.log(`====================================================`);

async function syncAll() {
  // 1. Projects & Customers 동기화
  const projectRows = db.prepare(`
    SELECT 
      p.id as projectId,
      c.name as customerName,
      c.phone as customerPhone,
      c.address as customerAddress,
      p.title,
      p.product,
      p.status,
      p.label,
      p.source,
      p.partner_name as partnerName,
      p.owner_name as ownerName,
      p.measure_date as measureDate,
      p.build_date as buildDate,
      p.description,
      p.note,
      p.created_at as createdAt,
      p.updated_at as updatedAt
    FROM projects p
    LEFT JOIN customers c ON p.customer_id = c.id
  `).all();

  const formattedProjects = projectRows.map(r => ({
    projectId: Number(r.projectId),
    customerName: r.customerName || '고객',
    customerPhone: r.customerPhone || '010-0000-0000',
    customerAddress: r.customerAddress || '주소 미입력',
    title: r.title || undefined,
    product: r.product || '창호',
    status: r.status || '신규접수',
    label: r.label || '일반',
    source: r.source || '직접등록',
    partnerName: r.partnerName || '직영',
    ownerName: r.ownerName || '미배정',
    measureDate: r.measureDate || undefined,
    buildDate: r.buildDate || undefined,
    description: r.description || undefined,
    note: r.note || undefined,
    createdAt: r.createdAt || undefined,
    updatedAt: r.updatedAt || undefined,
  }));

  const projResult = await client.mutation(api.sync.batchSyncProjects, { projects: formattedProjects });
  console.log(`✓ [Projects] Synced: Inserted=${projResult.inserted}, Updated=${projResult.updated} (Total ${formattedProjects.length})`);

  // 2. Rentals (홈씨씨 안심 렌탈 신청서) 동기화
  const rentalRows = db.prepare(`
    SELECT
      id,
      project_id as projectId,
      quote_id as quoteId,
      customer_name as customerName,
      customer_phone as customerPhone,
      product_name as productSummary,
      monthly_fee as monthlyFee,
      period_months as rentalPeriod,
      total_fee as totalRentalFee,
      status,
      review_note as underwritingMemo,
      created_at as createdAt,
      updated_at as updatedAt
    FROM rental_applications
  `).all();

  const formattedRentals = rentalRows.map(r => ({
    appNo: `RNT-${String(r.id).padStart(6, '0')}`,
    projectId: r.projectId ? Number(r.projectId) : undefined,
    quoteId: r.quoteId ? Number(r.quoteId) : undefined,
    customerName: r.customerName || '신청인',
    customerPhone: r.customerPhone || '010-0000-0000',
    installationAddress: '설치현장 주소',
    productSummary: r.productSummary || undefined,
    monthlyFee: Number(r.monthlyFee || 0),
    rentalPeriod: Number(r.rentalPeriod || 60),
    totalRentalFee: Number(r.totalRentalFee || 0),
    status: r.status || '접수대기',
    underwritingMemo: r.underwritingMemo || undefined,
    createdAt: r.createdAt || undefined,
    updatedAt: r.updatedAt || undefined,
  }));

  const rentalResult = await client.mutation(api.sync.batchSyncRentals, { rentals: formattedRentals });
  console.log(`✓ [Rentals] Synced: Inserted=${rentalResult.inserted}, Updated=${rentalResult.updated} (Total ${formattedRentals.length})`);

  // 3. Quotes (견적서) 동기화
  const quoteRows = db.prepare(`
    SELECT 
      project_id as projectId,
      version,
      title,
      quote_type as quoteType,
      status,
      total_cost as totalCost,
      supply_cost as supplyCost,
      margin_rate as marginRate,
      material_subtotal as materialSubtotal,
      extra_subtotal as extraSubtotal,
      sale_price as salePrice,
      vat,
      original_price as originalPrice,
      total_price as totalPrice,
      discount_amount as discountAmount,
      meta_json as metaJson,
      memo,
      access_token as accessToken,
      published_at as publishedAt,
      created_at as createdAt,
      updated_at as updatedAt
    FROM quotes
  `).all();

  const formattedQuotes = quoteRows.map(q => ({
    projectId: Number(q.projectId),
    version: Number(q.version || 1),
    title: q.title || '견적서',
    quoteType: q.quoteType || '가견적',
    status: q.status || 'draft',
    totalCost: Number(q.totalCost || 0),
    supplyCost: Number(q.supplyCost || 0),
    marginRate: Number(q.marginRate || 0),
    materialSubtotal: Number(q.materialSubtotal || 0),
    extraSubtotal: Number(q.extraSubtotal || 0),
    salePrice: Number(q.salePrice || 0),
    vat: Number(q.vat || 0),
    originalPrice: Number(q.originalPrice || 0),
    totalPrice: Number(q.totalPrice || 0),
    discountAmount: Number(q.discountAmount || 0),
    metaJson: q.metaJson || undefined,
    memo: q.memo || undefined,
    accessToken: q.accessToken || undefined,
    publishedAt: q.publishedAt || undefined,
    createdAt: q.createdAt || undefined,
    updatedAt: q.updatedAt || undefined,
  }));

  if (formattedQuotes.length > 0) {
    const quoteResult = await client.mutation(api.sync.batchSyncQuotes, { quotes: formattedQuotes });
    console.log(`✓ [Quotes] Synced: Inserted=${quoteResult.inserted}, Updated=${quoteResult.updated} (Total ${formattedQuotes.length})`);
  }

  // 4. Contracts (전자계약) 동기화
  const contractRows = db.prepare(`
    SELECT 
      c.id,
      c.project_id as projectId,
      p.customer_name as customerName,
      p.customer_phone as customerPhone,
      c.status,
      c.amount as totalAmount,
      c.deposit_amount as depositAmount,
      c.balance_amount as balanceAmount,
      c.signed_at as signedAt,
      c.created_at as createdAt,
      c.updated_at as updatedAt
    FROM contracts c
    LEFT JOIN (
      SELECT pr.id, cust.name as customer_name, cust.phone as customer_phone
      FROM projects pr
      LEFT JOIN customers cust ON pr.customer_id = cust.id
    ) p ON c.project_id = p.id
  `).all();

  const formattedContracts = contractRows.map(c => ({
    contractNo: `CTR-${String(c.id).padStart(6, '0')}`,
    projectId: Number(c.projectId),
    customerName: c.customerName || '고객',
    customerPhone: c.customerPhone || '010-0000-0000',
    status: c.status || 'pending',
    totalAmount: Number(c.totalAmount || 0),
    depositAmount: Number(c.depositAmount || 0),
    balanceAmount: Number(c.balanceAmount || 0),
    signedAt: c.signedAt || undefined,
    createdAt: c.createdAt || undefined,
    updatedAt: c.updatedAt || undefined,
  }));

  if (formattedContracts.length > 0) {
    const contractResult = await client.mutation(api.sync.batchSyncContracts, { contracts: formattedContracts });
    console.log(`✓ [Contracts] Synced: Inserted=${contractResult.inserted}, Updated=${contractResult.updated} (Total ${formattedContracts.length})`);
  }

  // 5. Consent Forms (양식 관리 & 다중 페이지 fieldsConfig 설정) 동기화
  const formRows = db.prepare(`
    SELECT 
      id as formId,
      title as name,
      version,
      pdf_path as pdfPath,
      file_name as fileName,
      fields_config as fieldsConfigJson,
      updated_at as updatedAt
    FROM consent_forms
  `).all();

  const formattedForms = formRows.map(f => ({
    formId: f.formId,
    name: f.name || '동의서 양식',
    type: 'rental_consent',
    pdfPath: f.pdfPath || undefined,
    fileName: f.fileName || undefined,
    fieldsConfigJson: typeof f.fieldsConfigJson === 'string' ? f.fieldsConfigJson : JSON.stringify(f.fieldsConfigJson || []),
    version: Number(f.version || 1),
    enabled: true,
    updatedAt: f.updatedAt || undefined,
  }));

  const formResult = await client.mutation(api.sync.batchSyncConsentForms, { forms: formattedForms });
  console.log(`✓ [Consent Forms] Synced: Inserted=${formResult.inserted}, Updated=${formResult.updated} (Total ${formattedForms.length})`);

  // 6. System Settings (라벨, 단계, 계약상태) 동기화
  const labelRows = db.prepare(`SELECT id, name, color FROM system_labels ORDER BY id`).all();
  const stageRows = db.prepare(`SELECT id, name, sort_order as sortOrder FROM system_stages ORDER BY sort_order`).all();
  const statusRows = db.prepare(`SELECT id, name, color, sort_order as sortOrder FROM system_contract_statuses ORDER BY sort_order`).all();

  await client.mutation(api.sync.batchSyncSystemSettings, {
    labels: labelRows.map((l, idx) => ({ name: l.name, color: l.color || '#3b82f6', sortOrder: idx + 1 })),
    stages: stageRows.map((s, idx) => ({ name: s.name, sortOrder: Number(s.sortOrder || idx + 1) })),
    statuses: statusRows.map((st, idx) => ({ name: st.name, color: st.color || '#64748b', sortOrder: Number(st.sortOrder || idx + 1) })),
  });
  console.log(`✓ [System Settings] Synced: Labels(${labelRows.length}), Stages(${stageRows.length}), ContractStatuses(${statusRows.length})`);

  // 7. Users (관리자 및 담당자 계정) 동기화
  const userRows = db.prepare(`
    SELECT username, password_hash as passwordHash, name, phone, email, role, allowed_menus as allowedMenus, active, created_at as createdAt
    FROM users
  `).all();

  const formattedUsers = userRows.map(u => ({
    username: u.username,
    passwordHash: u.passwordHash,
    name: u.name,
    phone: u.phone || undefined,
    email: u.email || undefined,
    role: u.role || 'staff',
    allowedMenus: u.allowedMenus || undefined,
    active: Boolean(u.active),
    createdAt: u.createdAt || undefined,
  }));

  const userResult = await client.mutation(api.sync.batchSyncUsers, { users: formattedUsers });
  console.log(`✓ [Users] Synced: Total ${userResult.count} accounts`);

  console.log(`====================================================`);
  console.log(`[Convex Sync] 100% OPERATIONAL DATA SYNC COMPLETE!`);
  console.log(`====================================================`);
}

syncAll().catch(err => {
  console.error('[Convex Sync] Error during sync:', err);
  process.exit(1);
});
