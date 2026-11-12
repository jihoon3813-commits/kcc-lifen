import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import {
  ensurePrivateVaultDir,
  APPROVED_RENTAL_TERMS_DEFAULTS,
  normalizeStatusCode,
  encryptText,
  maskBirthDate,
  saveEncryptedObject,
  sha256Hex,
  createSamplePngBuffer
} from '../utils/rentalSecurity.js';
import { maskPhone, buildRentalPlans } from '../utils/mobileQuoteFormatter.js';
import { getDefaultMenusForRole, parseAllowedMenus } from '../utils/menuPermissions.js';

// Ensure data, uploads, and private vault directories exist
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.mkdirSync(path.join(config.uploadsDir, 'quotes'), { recursive: true });
  fs.mkdirSync(path.join(config.uploadsDir, 'drawings'), { recursive: true });
  fs.mkdirSync(path.join(config.uploadsDir, 'forms'), { recursive: true });
} else if (!fs.existsSync(path.join(config.uploadsDir, 'forms'))) {
  fs.mkdirSync(path.join(config.uploadsDir, 'forms'), { recursive: true });
}
ensurePrivateVaultDir();

export const db = new Database(config.dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export const DEFAULT_RENTAL_FIELDS_CONFIG = {
  date: {
    key: 'date',
    label: '날짜',
    x: 58.0,
    y: 78.5,
    w: 32.0,
    h: 3.6,
    fontSize: 14,
    color: '#1a202c',
    align: 'center',
    format: 'YYYY년 MM월 DD일',
    enabled: true
  },
  name: {
    key: 'name',
    label: '성명',
    x: 62.0,
    y: 83.2,
    w: 16.0,
    h: 3.6,
    fontSize: 15,
    color: '#1a202c',
    align: 'center',
    fontWeight: 'bold',
    enabled: true
  },
  signature: {
    key: 'signature',
    label: '서명',
    x: 78.5,
    y: 81.2,
    w: 16.0,
    h: 6.8,
    color: '#1a202c',
    enabled: true
  },
  birthDate: {
    key: 'birthDate',
    label: '생년월일',
    x: 18.0,
    y: 83.2,
    w: 28.0,
    h: 3.6,
    fontSize: 14,
    color: '#1a202c',
    align: 'center',
    format: 'YYYY-MM-DD',
    enabled: true
  },
  phone: {
    key: 'phone',
    label: '연락처',
    x: 18.0,
    y: 87.5,
    w: 28.0,
    h: 3.6,
    fontSize: 14,
    color: '#1a202c',
    align: 'center',
    enabled: true
  }
};

export const DEFAULT_RENTAL_PRIVACY_CONTENT = `[필수] 렌탈 개인정보 수집·이용 및 제공 동의서 (KCC홈씨씨)

1. 수집 및 이용 목적
- KCC 홈씨씨 창호·인테리어 렌탈 서비스 신청 접수, 적격 확인, 본인 확인
- 렌탈 계약 체결 및 유지 관리, 월 렌탈료 정산 및 청구
- 시공 현장 실측, 일정 조율 및 사후 품질보증(A/S) 제공

2. 수집하는 개인정보 항목
- 기본 식별정보: 고객 성명, 연락처(휴대전화번호), 생년월일, 시공 주소
- 계약 및 서명정보: 모바일 전자서명 이미지, 신청일자, 선택 렌탈 조건

3. 보유 및 이용 기간
- 렌탈 계약 성립 시: 상법 및 전자상거래법 등 관계 법령에 따른 5년간 보존 후 파기
- 미체결 또는 취소 시: 처리 완료일로부터 즉시 안전하게 영구 파기

4. 동의 거부 권리 및 불이익
- 귀하는 상기 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 필수 정보 수집에 동의하지 않으실 경우 렌탈 신청 및 계약 체결이 불가능합니다.`;

export const DEFAULT_CONTRACT_STATUSES = [
  { name: '계약체결', color: 'blue', sort_order: 1 },
  { name: '미수납', color: 'red', sort_order: 2 },
  { name: '약정대기', color: 'orange', sort_order: 3 },
  { name: '선금완료', color: 'blue', sort_order: 4 },
  { name: '잔금대기', color: 'orange', sort_order: 5 },
  { name: '수납완료', color: 'green', sort_order: 6 },
  { name: '정산완료', color: 'green', sort_order: 7 },
  { name: '계약보류', color: 'gray', sort_order: 8 },
  { name: '계약취소', color: 'red', sort_order: 9 }
];

export function ensureDefaultContractStatuses() {
  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM system_contract_statuses').get()?.cnt || 0;
  if (cnt > 0) return;
  const insertStatus = db.prepare(`
    INSERT OR IGNORE INTO system_contract_statuses (name, color, sort_order, is_active)
    VALUES (?, ?, ?, 1)
  `);
  for (const st of DEFAULT_CONTRACT_STATUSES) {
    insertStatus.run(st.name, st.color, st.sort_order);
  }
}

export function ensureApprovedRentalTerms() {
  // 사용자 요청: '(렌탈) 개인정보 동의서'만 유지하고 나머지 양식은 삭제
  // 1. 기존 비-렌탈 불필요 양식 정리
  try {
    db.prepare("DELETE FROM consent_forms WHERE id NOT IN ('rental_privacy', 'rental_collection')").run();
  } catch {}

  // 2. 단일 핵심 양식: (렌탈) 개인정보 동의서 보장
  const mainForm = db.prepare("SELECT * FROM consent_forms WHERE id = 'rental_privacy'").get();
  if (!mainForm) {
    const upsertMain = db.prepare(`
      INSERT INTO consent_forms (id, title, version, content, fields_config)
      VALUES (?, ?, 1, ?, ?)
    `);
    upsertMain.run(
      'rental_privacy',
      '(렌탈) 개인정보 동의서',
      DEFAULT_RENTAL_PRIVACY_CONTENT,
      JSON.stringify(DEFAULT_RENTAL_FIELDS_CONFIG)
    );
  }

  // 모바일 신청서 스냅샷에서 호환성을 위해 필요한 rental_collection이 없으면 등록
  const collForm = db.prepare("SELECT id FROM consent_forms WHERE id = 'rental_collection'").get();
  if (!collForm) {
    const term = APPROVED_RENTAL_TERMS_DEFAULTS.find(t => t.id === 'rental_collection');
    if (term) {
      db.prepare("INSERT INTO consent_forms (id, title, version, content) VALUES (?, ?, ?, ?)").run(
        term.id, term.title, term.version, term.content
      );
    }
  }
}

export function hydrateLegacyRentalApplication(appRow) {
  if (!appRow) return;
  const hasPrivate = db
    .prepare('SELECT application_id FROM rental_applicant_private WHERE application_id = ?')
    .get(appRow.id);
  if (hasPrivate) return;

  const quote = appRow.quote_id
    ? db.prepare('SELECT * FROM quotes WHERE id = ?').get(appRow.quote_id)
    : db.prepare("SELECT * FROM quotes WHERE project_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1").get(appRow.project_id);

  const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(appRow.project_id);
  const cashPrice = quote ? Number(quote.total_price) : 13200000;
  const plans = buildRentalPlans(cashPrice, quote?.discount_amount || 0);
  const planKey = appRow.plan_key || 'lowupfront';
  const selectedPlan = plans[planKey] || plans.lowupfront;
  const statusCode = normalizeStatusCode(appRow.status_code || appRow.status);
  const sampleBirth = '1985-03-15';
  const createdAt = appRow.created_at || new Date().toISOString();

  const snapshot = {
    quoteId: quote?.id || null,
    projectId: appRow.project_id,
    quoteNo: String(appRow.project_id).padStart(4, '0'),
    version: quote?.version || 1,
    quoteType: quote?.quote_type || '최종견적',
    cashPrice,
    planKey,
    planTitle: selectedPlan.name,
    upfront: selectedPlan.upfront,
    monthly: selectedPlan.mainAmount,
    months: selectedPlan.months,
    total: selectedPlan.total
  };

  db.prepare(`
    UPDATE rental_applications
    SET quote_version = ?,
        quote_snapshot_json = ?,
        plan_key = ?,
        plan_title = ?,
        upfront_fee = ?,
        monthly_fee = ?,
        total_fee = ?,
        status_code = ?,
        assigned_to = CASE WHEN assigned_to IS NULL OR assigned_to = '미배정' THEN ? ELSE assigned_to END
    WHERE id = ?
  `).run(
    snapshot.version,
    JSON.stringify(snapshot),
    planKey,
    selectedPlan.name,
    selectedPlan.upfront,
    selectedPlan.mainAmount,
    selectedPlan.total,
    statusCode,
    proj?.owner_name || '김정연',
    appRow.id
  );

  db.prepare(`
    INSERT OR IGNORE INTO rental_applicant_private (
      application_id, masked_phone, masked_birth_date, encrypted_phone, encrypted_birth_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    appRow.id,
    maskPhone(appRow.customer_phone),
    maskBirthDate(sampleBirth),
    encryptText(appRow.customer_phone),
    encryptText(sampleBirth),
    createdAt
  );

  ensureApprovedRentalTerms();
  const forms = db
    .prepare("SELECT * FROM consent_forms WHERE id IN ('rental_collection', 'rental_inquiry', 'rental_provision') ORDER BY id ASC")
    .all();

  const insertConsent = db.prepare(`
    INSERT INTO rental_consent_snapshots (
      application_id, item_id, title, approved_version, text_hash, immutable_text, agreed, server_received_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const consentHashes = [];
  for (const f of forms) {
    const itemKey = f.id.replace('rental_', '');
    const verStr = `v2026.11.${f.version}`;
    const tHash = sha256Hex(f.content);
    consentHashes.push(`${itemKey}:${verStr}:${tHash}`);
    insertConsent.run(appRow.id, itemKey, f.title, verStr, tHash, f.content, createdAt);
  }

  // Create non-PII sample test vault objects for seeded application
  const idBuf = createSamplePngBuffer({ width: 320, height: 180, kind: 'id_card' });
  const sigBuf = createSamplePngBuffer({ width: 320, height: 160, kind: 'signature' });
  const idKey = saveEncryptedObject(idBuf);
  const sigKey = saveEncryptedObject(sigBuf);
  const retentionUntil = new Date(Date.now() + config.rentalRetentionDays * 86400000).toISOString();

  const insertDoc = db.prepare(`
    INSERT INTO rental_document_versions (
      application_id, kind, version_no, private_object_key, mime_type, byte_size, width, height, sha256_digest, scan_status, is_active, retention_until, created_at
    ) VALUES (?, ?, 1, ?, 'image/png', ?, ?, ?, ?, 'verified', 1, ?, ?)
  `);
  insertDoc.run(appRow.id, 'id_card', idKey, idBuf.length, 320, 180, sha256Hex(idBuf), retentionUntil, createdAt);
  const sigDocRes = insertDoc.run(appRow.id, 'signature', sigKey, sigBuf.length, 320, 160, sha256Hex(sigBuf), retentionUntil, createdAt);

  db.prepare(`
    INSERT INTO rental_signature_evidence (
      application_id, document_id, application_snapshot_hash, consent_snapshot_hash, signature_digest, ip_masked, user_agent, server_received_at
    ) VALUES (?, ?, ?, ?, ?, '127.0.0.***', 'Seeded/Test-Agent', ?)
  `).run(
    appRow.id,
    sigDocRes.lastInsertRowid,
    sha256Hex(JSON.stringify(snapshot)),
    sha256Hex(consentHashes.join('|')),
    sha256Hex(sigBuf),
    createdAt
  );

  db.prepare(`
    INSERT INTO rental_audit_events (
      application_id, actor_name, actor_role, action, reason, previous_state, new_state, ip_masked, event_time
    ) VALUES (?, ?, 'customer', '렌탈 신청 접수', '모바일 견적서 본인확인 후 신청서·동의·서명 제출', NULL, 'received', '127.0.0.***', ?)
  `).run(appRow.id, `${appRow.customer_name}(고객)`, createdAt);

  if (statusCode !== 'received') {
    db.prepare(`
      INSERT INTO rental_audit_events (
        application_id, actor_name, actor_role, action, reason, previous_state, new_state, ip_masked, event_time
      ) VALUES (?, ?, 'estimator', '서류 검토 시작', ?, 'received', ?, '127.0.0.***', ?)
    `).run(appRow.id, proj?.owner_name || '김정연', appRow.review_note || '담당자 배정 및 서류 검토 진행', statusCode, createdAt);
  }
}

export function initDatabase() {
  // First migrate columns on rental_applications BEFORE running schemaSql indexes that reference status_code!
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  if (tables.includes('rental_applications')) {
    const rCols = db.prepare("PRAGMA table_info(rental_applications)").all().map(c => c.name);
    const addCol = (col, def) => {
      if (!rCols.includes(col)) db.exec(`ALTER TABLE rental_applications ADD COLUMN ${col} ${def}`);
    };
    addCol('quote_version', 'INTEGER DEFAULT 1');
    addCol('quote_snapshot_json', 'TEXT');
    addCol('plan_key', "TEXT NOT NULL DEFAULT 'lowupfront'");
    addCol('plan_title', "TEXT NOT NULL DEFAULT '초기 부담을 줄이는 렌탈'");
    addCol('upfront_fee', 'INTEGER NOT NULL DEFAULT 0');
    addCol('status_code', "TEXT NOT NULL DEFAULT 'received'");
    addCol('revision', 'INTEGER NOT NULL DEFAULT 1');
    addCol('assigned_to', "TEXT NOT NULL DEFAULT '미배정'");
    addCol('check_id', 'INTEGER NOT NULL DEFAULT 0');
    addCol('check_signature', 'INTEGER NOT NULL DEFAULT 0');
    addCol('check_consent', 'INTEGER NOT NULL DEFAULT 0');
    addCol('confirmed_at', 'DATETIME');
    addCol('contract_reference', 'TEXT');
    addCol('cancelled_at', 'DATETIME');
    addCol('cancel_actor', 'TEXT');
    addCol('cancel_reason', 'TEXT');
    addCol('reject_reason', 'TEXT');
  }

  const schemaSql = fs.readFileSync(config.schemaPath, 'utf8');
  db.exec(schemaSql);

  const cols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
  if (!cols.includes('rough_quote_url')) {
    db.exec("ALTER TABLE projects ADD COLUMN rough_quote_url TEXT");
  }
  if (!cols.includes('final_quote_url')) {
    db.exec("ALTER TABLE projects ADD COLUMN final_quote_url TEXT");
  }

  const quoteCols = db.prepare("PRAGMA table_info(quotes)").all().map(c => c.name);
  if (!quoteCols.includes('quote_type')) {
    db.exec("ALTER TABLE quotes ADD COLUMN quote_type TEXT NOT NULL DEFAULT '가견적'");
  }
  if (!quoteCols.includes('supply_cost')) {
    db.exec("ALTER TABLE quotes ADD COLUMN supply_cost INTEGER NOT NULL DEFAULT 0");
  }
  if (!quoteCols.includes('material_subtotal')) {
    db.exec("ALTER TABLE quotes ADD COLUMN material_subtotal INTEGER NOT NULL DEFAULT 0");
  }
  if (!quoteCols.includes('extra_subtotal')) {
    db.exec("ALTER TABLE quotes ADD COLUMN extra_subtotal INTEGER NOT NULL DEFAULT 0");
  }
  if (!quoteCols.includes('original_price')) {
    db.exec("ALTER TABLE quotes ADD COLUMN original_price INTEGER NOT NULL DEFAULT 0");
  }
  if (!quoteCols.includes('discount_amount')) {
    db.exec("ALTER TABLE quotes ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0");
  }
  if (!quoteCols.includes('meta_json')) {
    db.exec("ALTER TABLE quotes ADD COLUMN meta_json TEXT");
  }

  const itemCols = db.prepare("PRAGMA table_info(quote_items)").all().map(c => c.name);
  if (!itemCols.includes('category')) {
    db.exec("ALTER TABLE quote_items ADD COLUMN category TEXT NOT NULL DEFAULT 'window'");
  }
  if (!itemCols.includes('detail_json')) {
    db.exec("ALTER TABLE quote_items ADD COLUMN detail_json TEXT");
  }

  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('allowed_menus')) {
    db.exec("ALTER TABLE users ADD COLUMN allowed_menus TEXT");
  }

  // Backfill allowed_menus for existing users that do not have explicit menu permissions yet
  const existingUsers = db.prepare('SELECT id, username, role, allowed_menus FROM users').all();
  const updateUserMenus = db.prepare('UPDATE users SET allowed_menus = ? WHERE id = ?');
  for (const u of existingUsers) {
    if (!u.allowed_menus) {
      const defaults = parseAllowedMenus(getDefaultMenusForRole(u.role), u.role, u.username);
      updateUserMenus.run(JSON.stringify(defaults), u.id);
    }
  }
  if (!itemCols.includes('margin_rate')) {
    db.exec("ALTER TABLE quote_items ADD COLUMN margin_rate REAL NOT NULL DEFAULT 100.0");
  }

  // Migrate consent_forms columns
  const formCols = db.prepare("PRAGMA table_info(consent_forms)").all().map(c => c.name);
  if (!formCols.includes('pdf_path')) {
    db.exec("ALTER TABLE consent_forms ADD COLUMN pdf_path TEXT");
  }
  if (!formCols.includes('file_name')) {
    db.exec("ALTER TABLE consent_forms ADD COLUMN file_name TEXT");
  }
  if (!formCols.includes('fields_config')) {
    db.exec("ALTER TABLE consent_forms ADD COLUMN fields_config TEXT");
  }

  // Ensure approved rental consent forms exist if consent_forms table has data
  ensureDefaultContractStatuses();
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (userCount > 0) {
    ensureApprovedRentalTerms();
    const existingApps = db.prepare('SELECT * FROM rental_applications').all();
    for (const appRow of existingApps) {
      hydrateLegacyRentalApplication(appRow);
    }
  }

  console.log('Database initialized successfully at:', config.dbPath);
}
