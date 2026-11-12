import express from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, ensureApprovedRentalTerms } from '../db/index.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { maskPhone, buildRentalPlans } from '../utils/mobileQuoteFormatter.js';
import {
  encryptText,
  saveEncryptedObject,
  readEncryptedObject,
  deleteEncryptedObject,
  sha256Hex,
  deriveCsrfToken,
  verifyCsrfToken,
  resolveCustomerViewer,
  verifySameOrigin,
  maskBirthDate,
  maskIp,
  validateBirthDate,
  inspectAndSanitizeIdDocument,
  inspectAndValidateSignaturePng,
  STATUS_LABELS,
  STATUS_CODE_TO_KR,
  ALLOWED_TRANSITIONS,
  normalizeStatusCode
} from '../utils/rentalSecurity.js';

export const customerRentalRouter = express.Router();
export const adminRentalRouter = express.Router();

// Multer memory upload with strict limits (never writes temporary files to public/uploads)
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MiB max
    files: 2,
    fields: 12,
    fieldSize: 64 * 1024
  }
}).fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);

function runMultipartUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, err => {
      if (!err) return resolve();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const e = new Error('첨부 파일 크기는 10MB 이하여야 합니다.');
          e.status = 413;
          return reject(e);
        }
        const e = new Error('첨부 파일 요청 형식이 올바르지 않습니다.');
        e.status = 400;
        return reject(e);
      }
      reject(err);
    });
  });
}

// Simple in-memory sliding-window rate limiter per IP + principal
const rateBuckets = new Map();
function checkRateLimit(key, maxRequests = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) || []).filter(ts => now - ts < windowMs);
  if (bucket.length >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - bucket[0])) / 1000));
    return { allowed: false, retryAfterSec };
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

function getApprovedTermsFromDb() {
  ensureApprovedRentalTerms();
  const rows = db
    .prepare("SELECT * FROM consent_forms WHERE id IN ('rental_collection', 'rental_inquiry', 'rental_provision')")
    .all();
  const order = ['rental_collection', 'rental_inquiry', 'rental_provision'];
  const sorted = order.map(id => rows.find(r => r.id === id)).filter(Boolean);
  const termsVersion = 'approved-2026.11-' + sorted.map(r => `${r.id.replace('rental_', '')}:v${r.version}`).join(',');
  const terms = sorted.map(r => ({
    id: r.id.replace('rental_', ''),
    formId: r.id,
    version: `v2026.11.${r.version}`,
    title: r.title,
    body: r.content,
    textHash: sha256Hex(r.content)
  }));
  return { termsVersion, terms };
}

function loadPublishedQuoteById(quoteId) {
  return db.prepare(`
    SELECT q.id, q.project_id, q.version, q.title, q.quote_type, q.status,
           q.sale_price, q.vat, q.total_price, q.discount_amount, q.access_token, q.published_at,
           c.id as customer_id, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           p.org_id, p.product, p.owner_name, p.partner_name
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    WHERE q.id = ? AND q.status = 'published'
  `).get(quoteId);
}

function makeQuoteVersionTag(q) {
  return `q${q.id}-v${q.version}`;
}

function generateReceiptId() {
  // Use Asia/Seoul date YYYYMMDD
  const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `R-${kst}-`;
  const latest = db
    .prepare("SELECT id FROM rental_applications WHERE id LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`${prefix}%`);
  let nextSeq = 1;
  if (latest?.id) {
    const tail = Number(latest.id.slice(prefix.length));
    if (Number.isFinite(tail) && tail >= 1) nextSeq = tail + 1;
  }
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
}

function getActiveApplicationForProject(projectId) {
  const row = db.prepare(`
    SELECT *
    FROM rental_applications
    WHERE project_id = ? AND status_code IN ('received', 'review', 'needs_info', 'screening', 'confirmed')
    ORDER BY created_at DESC LIMIT 1
  `).get(projectId);
  if (!row) return null;

  let supplement = null;
  if (row.status_code === 'needs_info') {
    const sup = db.prepare(`
      SELECT id, supplement_type, customer_message, expires_at, created_at
      FROM rental_supplement_requests
      WHERE application_id = ? AND resolved_at IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(row.id);
    if (sup) {
      supplement = {
        supplementType: sup.supplement_type,
        customerMessage: sup.customer_message,
        expiresAt: sup.expires_at,
        requestedAt: sup.created_at
      };
    }
  }

  return {
    receiptId: row.id,
    status: row.status_code,
    statusLabel: STATUS_LABELS[row.status_code] || row.status,
    planKey: row.plan_key,
    planTitle: row.plan_title,
    upfront: row.upfront_fee,
    monthly: row.monthly_fee,
    months: row.period_months,
    total: row.total_fee,
    receivedAt: row.created_at,
    supplement
  };
}

// ============================================================================
// CUSTOMER RENTAL API (/api/rental/*)
// ============================================================================

// 1. GET /api/rental/context
customerRentalRouter.get('/context', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ error: '본인확인 세션이 없거나 만료되었습니다. 다시 로그인해 주세요.' });
  }

  const quote = loadPublishedQuoteById(viewer.decoded.quoteId);
  if (!quote) {
    return res.status(404).json({ error: '유효한 발행 견적서를 찾을 수 없습니다.' });
  }

  // Check if a newer quote version of the same quote_type was published
  const latestSameType = db.prepare(`
    SELECT id, version FROM quotes
    WHERE project_id = ? AND status = 'published' AND quote_type = ?
    ORDER BY version DESC, id DESC LIMIT 1
  `).get(quote.project_id, quote.quote_type || '가견적');

  const allPlans = buildRentalPlans(quote.total_price, quote.discount_amount);
  const { termsVersion, terms } = getApprovedTermsFromDb();
  const activeApplication = getActiveApplicationForProject(quote.project_id);

  res.json({
    mode: 'live',
    endpoint: '/api/rental/applications',
    csrfToken: deriveCsrfToken(viewer.token),
    approvedTerms: true,
    isLatestVersion: !latestSameType || latestSameType.id === quote.id,
    quote: {
      id: String(quote.id),
      projectId: quote.project_id,
      quoteNo: String(quote.project_id).padStart(4, '0'),
      version: makeQuoteVersionTag(quote),
      quoteType: quote.quote_type || '가견적',
      customerName: quote.customer_name,
      phone: maskPhone(quote.customer_phone),
      location: quote.customer_address || '',
      product: `KCC 홈씨씨 ${quote.product || '창호'} 교체`,
      cashPrice: quote.total_price,
      publishedAt: quote.published_at
    },
    plans: {
      plan111: {
        title: allPlans.plan111.name,
        upfront: allPlans.plan111.upfront,
        monthly: allPlans.plan111.mainAmount,
        months: allPlans.plan111.months,
        total: allPlans.plan111.total
      },
      plan222: {
        title: allPlans.plan222.name,
        upfront: allPlans.plan222.upfront,
        monthly: allPlans.plan222.mainAmount,
        months: allPlans.plan222.months,
        total: allPlans.plan222.total
      },
      plan333: {
        title: allPlans.plan333.name,
        upfront: allPlans.plan333.upfront,
        monthly: allPlans.plan333.mainAmount,
        months: allPlans.plan333.months,
        total: allPlans.plan333.total
      },
      lowupfront: {
        title: allPlans.lowupfront.name,
        upfront: allPlans.lowupfront.upfront,
        monthly: allPlans.lowupfront.mainAmount,
        months: allPlans.lowupfront.months,
        total: allPlans.lowupfront.total
      },
      lowmonthly: {
        title: allPlans.lowmonthly.name,
        upfront: allPlans.lowmonthly.upfront,
        monthly: allPlans.lowmonthly.mainAmount,
        months: allPlans.lowmonthly.months,
        total: allPlans.lowmonthly.total
      }
    },
    termsVersion,
    terms: terms.map(t => ({
      id: t.id,
      version: t.version,
      title: t.title,
      body: t.body
    })),
    activeApplication
  });
});

// 2. POST /api/rental/applications
customerRentalRouter.post('/applications', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  // 1) Session, Same-Origin, CSRF & Rate-Limit Checks
  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ error: '로그인 세션이 만료되었습니다. 본인확인을 다시 진행해 주세요.' });
  }
  if (!verifySameOrigin(req)) {
    return res.status(403).json({ error: '동일 출처(Same-Origin) 요청만 허용됩니다.' });
  }
  const csrfHeader = req.headers['x-csrf-token'];
  if (!verifyCsrfToken(viewer.token, csrfHeader)) {
    return res.status(403).json({ error: '보안 토큰(CSRF) 검증에 실패했습니다. 화면을 새로고침해 주세요.' });
  }

  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
  const rl = checkRateLimit(`apply:${viewer.decoded.projectId}:${clientIp}`, 15, 60_000);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({
      error: `요청이 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도해 주세요.`,
      retryAfter: rl.retryAfterSec
    });
  }

  const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return res.status(400).json({ error: '유효한 Idempotency-Key 헤더가 필요합니다.' });
  }

  // Parse multipart/form-data safely in memory
  try {
    await runMultipartUpload(req, res);
  } catch (uploadErr) {
    return res.status(uploadErr.status || 400).json({ error: uploadErr.message });
  }

  let applicantInput, quoteInput, consentsInput;
  try {
    applicantInput = JSON.parse(String(req.body?.applicant || '{}'));
    quoteInput = JSON.parse(String(req.body?.quote || '{}'));
    consentsInput = JSON.parse(String(req.body?.consents || '[]'));
  } catch {
    return res.status(400).json({ error: '신청 데이터(JSON) 형식이 올바르지 않습니다.' });
  }

  const idDocFile = req.files?.idDocument?.[0];
  const sigFile = req.files?.signature?.[0];
  if (!idDocFile || !sigFile) {
    return res.status(422).json({ error: '계약자 신분증 사진과 전자 서명 이미지가 모두 필요합니다.' });
  }

  const idRawDigest = sha256Hex(idDocFile.buffer);
  const sigRawDigest = sha256Hex(sigFile.buffer);
  const principalScope = `cust_proj_${viewer.decoded.projectId}_quote_${viewer.decoded.quoteId}`;
  const payloadHash = sha256Hex(
    JSON.stringify({
      birthDate: String(applicantInput.birthDate || '').trim(),
      quoteId: String(quoteInput.id || ''),
      quoteVersion: String(quoteInput.version || ''),
      plan: String(quoteInput.plan || ''),
      consents: Array.isArray(consentsInput)
        ? consentsInput.map(c => ({ id: c.id, version: c.version, agreed: Boolean(c.agreed) }))
        : [],
      idRawDigest,
      sigRawDigest
    })
  );

  // 2) Idempotency Lookup (Scoped to Authenticated Customer/Quote)
  const existingIdem = db.prepare(`
    SELECT * FROM rental_idempotency_keys
    WHERE principal_scope = ? AND idempotency_key = ?
  `).get(principalScope, idempotencyKey);

  if (existingIdem) {
    if (existingIdem.payload_hash !== payloadHash) {
      return res.status(409).json({
        error: '동일 요청 키로 변경된 신청 데이터를 전송할 수 없습니다. 다시 시도해 주세요.',
        code: 'IDEMPOTENCY_PAYLOAD_MISMATCH'
      });
    }
    if (existingIdem.processing_state === 'completed' && existingIdem.response_json) {
      return res.status(200).json(JSON.parse(existingIdem.response_json));
    }
    if (existingIdem.processing_state === 'processing') {
      return res.status(409).json({
        error: '동일 신청이 현재 서버에서 처리 중입니다. 잠시 후 다시 확인해 주세요.',
        code: 'IDEMPOTENCY_IN_PROGRESS'
      });
    }
  }

  // 3) Quote Ownership, Validity & Version Verification
  const dbQuote = loadPublishedQuoteById(viewer.decoded.quoteId);
  if (!dbQuote) {
    return res.status(409).json({ error: '유효한 발행 견적서를 찾을 수 없습니다. 담당자에게 문의해 주세요.' });
  }

  const expectedVersionTag = makeQuoteVersionTag(dbQuote);
  if (
    String(quoteInput.id) !== String(dbQuote.id) ||
    String(quoteInput.version) !== expectedVersionTag
  ) {
    return res.status(409).json({
      error: '견적 내용이 변경되었습니다. 최신 견적서를 새로 열고 다시 신청해 주세요.',
      code: 'QUOTE_VERSION_MISMATCH'
    });
  }

  const newerSameType = db.prepare(`
    SELECT id FROM quotes
    WHERE project_id = ? AND status = 'published' AND quote_type = ? AND version > ?
    LIMIT 1
  `).get(dbQuote.project_id, dbQuote.quote_type || '가견적', dbQuote.version);
  if (newerSameType) {
    return res.status(409).json({
      error: '새로운 버전의 견적서가 발행되었습니다. 최신 견적을 확인한 후 신청해 주세요.',
      code: 'NEWER_QUOTE_PUBLISHED'
    });
  }

  // Active Application Duplicate Guard (even across new tabs / new idempotency keys)
  const existingActive = getActiveApplicationForProject(dbQuote.project_id);
  if (existingActive) {
    return res.status(409).json({
      error: `이미 접수되어 진행 중인 렌탈 신청(${existingActive.receiptId})이 있습니다.`,
      code: 'ACTIVE_APPLICATION_EXISTS',
      receiptId: existingActive.receiptId,
      status: existingActive.status
    });
  }

  // Applicant identity & birth date validation
  const cleanSubmittedName = String(applicantInput.name || '').trim().replace(/\s+/g, '');
  const cleanActualName = String(dbQuote.customer_name || '').trim().replace(/\s+/g, '');
  if (cleanSubmittedName && cleanSubmittedName !== cleanActualName) {
    return res.status(403).json({ error: '견적서의 계약자 성함과 일치하지 않습니다.' });
  }

  const birthCheck = validateBirthDate(applicantInput.birthDate);
  if (!birthCheck.valid) {
    return res.status(422).json({ error: birthCheck.error, field: 'birthDate' });
  }

  // Plan validation & server-authoritative price calculation
  const planKey = String(quoteInput.plan || '').trim();
  const serverPlans = buildRentalPlans(dbQuote.total_price, dbQuote.discount_amount);
  if (!['lowupfront', 'lowmonthly', 'plan111', 'plan222', 'plan333'].includes(planKey) || !serverPlans[planKey]) {
    return res.status(422).json({ error: '유효한 렌탈 플랜을 선택해 주세요.', field: 'plan' });
  }
  const chosenPlan = serverPlans[planKey];

  // Mandatory Consents & Approved Terms Version Verification
  const { termsVersion, terms } = getApprovedTermsFromDb();
  if (!Array.isArray(consentsInput) || consentsInput.length < terms.length) {
    return res.status(422).json({ error: '필수 동의 항목을 모두 체크해 주세요.', field: 'consents' });
  }
  for (const reqTerm of terms) {
    const found = consentsInput.find(c => c && c.id === reqTerm.id);
    if (!found || found.agreed !== true) {
      return res.status(422).json({ error: `필수 약관(${reqTerm.title})에 동의해 주세요.`, field: 'consents' });
    }
    // Accept either per-item version (v2026.11.1) or bundle termsVersion
    if (found.version !== reqTerm.version && found.version !== termsVersion) {
      return res.status(409).json({
        error: '동의서 약관 버전이 업데이트되었습니다. 최신 약관을 확인한 뒤 다시 서명해 주세요.',
        code: 'TERMS_VERSION_MISMATCH'
      });
    }
  }

  // 4) Binary Signature & Image Sanitization (Magic Bytes + EXIF Strip + Blank Signature Check)
  let sanitizedIdDoc, sanitizedSig;
  try {
    sanitizedIdDoc = inspectAndSanitizeIdDocument(idDocFile.buffer);
    sanitizedSig = inspectAndValidateSignaturePng(sigFile.buffer);
  } catch (imgErr) {
    return res.status(imgErr.status || 422).json({ error: imgErr.message });
  }

  // Reserve idempotency slot as 'processing'
  if (existingIdem) {
    db.prepare(`
      UPDATE rental_idempotency_keys SET processing_state = 'processing' WHERE id = ?
    `).run(existingIdem.id);
  } else {
    db.prepare(`
      INSERT INTO rental_idempotency_keys (principal_scope, idempotency_key, payload_hash, processing_state)
      VALUES (?, ?, ?, 'processing')
    `).run(principalScope, idempotencyKey, payloadHash);
  }

  // 5) Write Encrypted Objects to Private Vault & Commit Atomic DB Transaction
  const createdVaultKeys = [];
  try {
    const idObjKey = saveEncryptedObject(sanitizedIdDoc.sanitizedBuffer);
    createdVaultKeys.push(idObjKey);
    const sigObjKey = saveEncryptedObject(sanitizedSig.sanitizedBuffer);
    createdVaultKeys.push(sigObjKey);

    const idCleanDigest = sha256Hex(sanitizedIdDoc.sanitizedBuffer);
    const sigCleanDigest = sha256Hex(sanitizedSig.sanitizedBuffer);
    const receivedAt = new Date().toISOString();
    const retentionUntil = new Date(Date.now() + config.rentalRetentionDays * 86400000).toISOString();
    const maskedIpAddr = maskIp(clientIp);
    const ua = String(req.headers['user-agent'] || '').slice(0, 300);

    const quoteSnapshot = {
      quoteId: dbQuote.id,
      projectId: dbQuote.project_id,
      quoteNo: String(dbQuote.project_id).padStart(4, '0'),
      version: dbQuote.version,
      versionTag: expectedVersionTag,
      quoteType: dbQuote.quote_type || '가견적',
      product: dbQuote.product || '창호',
      cashPrice: dbQuote.total_price,
      discountAmount: dbQuote.discount_amount || 0,
      planKey,
      planTitle: chosenPlan.name,
      upfront: chosenPlan.upfront,
      monthly: chosenPlan.mainAmount,
      months: chosenPlan.months,
      total: chosenPlan.total,
      publishedAt: dbQuote.published_at
    };

    const applicationSnapshotHash = sha256Hex(
      JSON.stringify({
        customerName: dbQuote.customer_name,
        customerPhoneHash: sha256Hex(dbQuote.customer_phone),
        birthDateHash: sha256Hex(birthCheck.normalized),
        quoteSnapshot,
        idCleanDigest
      })
    );
    const consentSnapshotHash = sha256Hex(
      terms.map(t => `${t.id}:${t.version}:${t.textHash}:1`).join('|')
    );

    const commitApplication = db.transaction(() => {
      // Double-check active uniqueness inside transaction
      const doubleCheck = getActiveApplicationForProject(dbQuote.project_id);
      if (doubleCheck) {
        const conflictErr = new Error(`이미 접수된 렌탈 신청(${doubleCheck.receiptId})이 있습니다.`);
        conflictErr.status = 409;
        throw conflictErr;
      }

      const receiptId = generateReceiptId();
      const assignedTo = dbQuote.owner_name && dbQuote.owner_name !== '미배정' ? dbQuote.owner_name : '미배정';

      db.prepare(`
        INSERT INTO rental_applications (
          id, project_id, quote_id, quote_version, quote_snapshot_json,
          customer_name, customer_phone, product_name,
          plan_key, plan_title, upfront_fee, period_months, monthly_fee, total_fee,
          status, status_code, revision, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '접수완료', 'received', 1, ?, ?, ?)
      `).run(
        receiptId,
        dbQuote.project_id,
        dbQuote.id,
        dbQuote.version,
        JSON.stringify(quoteSnapshot),
        dbQuote.customer_name,
        maskPhone(dbQuote.customer_phone),
        dbQuote.product || '창호',
        planKey,
        chosenPlan.name,
        chosenPlan.upfront,
        chosenPlan.months,
        chosenPlan.mainAmount,
        chosenPlan.total,
        assignedTo,
        receivedAt,
        receivedAt
      );

      db.prepare(`
        INSERT INTO rental_applicant_private (
          application_id, masked_phone, masked_birth_date, encrypted_phone, encrypted_birth_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiptId,
        maskPhone(dbQuote.customer_phone),
        maskBirthDate(birthCheck.normalized),
        encryptText(dbQuote.customer_phone),
        encryptText(birthCheck.normalized),
        receivedAt,
        receivedAt
      );

      const insertDoc = db.prepare(`
        INSERT INTO rental_document_versions (
          application_id, kind, version_no, private_object_key, mime_type, byte_size,
          width, height, sha256_digest, scan_status, is_active, retention_until, created_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 'verified', 1, ?, ?)
      `);

      insertDoc.run(
        receiptId,
        'id_card',
        idObjKey,
        sanitizedIdDoc.mimeType,
        sanitizedIdDoc.sanitizedBuffer.length,
        sanitizedIdDoc.width,
        sanitizedIdDoc.height,
        idCleanDigest,
        retentionUntil,
        receivedAt
      );

      const sigDocRes = insertDoc.run(
        receiptId,
        'signature',
        sigObjKey,
        sanitizedSig.mimeType,
        sanitizedSig.sanitizedBuffer.length,
        sanitizedSig.width,
        sanitizedSig.height,
        sigCleanDigest,
        retentionUntil,
        receivedAt
      );

      const insertConsent = db.prepare(`
        INSERT INTO rental_consent_snapshots (
          application_id, item_id, title, approved_version, text_hash, immutable_text, agreed, server_received_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `);
      for (const t of terms) {
        insertConsent.run(receiptId, t.id, t.title, t.version, t.textHash, t.body, receivedAt);
      }

      db.prepare(`
        INSERT INTO rental_signature_evidence (
          application_id, document_id, application_snapshot_hash, consent_snapshot_hash,
          signature_digest, ip_masked, user_agent, server_received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiptId,
        sigDocRes.lastInsertRowid,
        applicationSnapshotHash,
        consentSnapshotHash,
        sigCleanDigest,
        maskedIpAddr,
        ua,
        receivedAt
      );

      db.prepare(`
        INSERT INTO rental_audit_events (
          application_id, actor_name, actor_role, action, reason, previous_state, new_state, metadata_json, ip_masked, event_time
        ) VALUES (?, ?, 'customer', '렌탈 신청 접수', ?, NULL, 'received', ?, ?, ?)
      `).run(
        receiptId,
        `${dbQuote.customer_name}(고객)`,
        `${chosenPlan.name} (초기 ${chosenPlan.upfront.toLocaleString()}원 / 월 ${chosenPlan.mainAmount.toLocaleString()}원 × ${chosenPlan.months}개월)`,
        JSON.stringify({ quoteId: dbQuote.id, quoteVersion: dbQuote.version, termsVersion }),
        maskedIpAddr,
        receivedAt
      );

      // Sync masked notification into CRM consultations & audit_logs (NEVER include birthDate, raw phone, or file keys!)
      db.prepare(`
        INSERT INTO consultations (project_id, author_name, type, content, is_important)
        VALUES (?, ?, 'notes', ?, 1)
      `).run(
        dbQuote.project_id,
        `${dbQuote.customer_name}(고객)`,
        `[모바일 렌탈 신청 접수] 접수번호 ${receiptId} · ${chosenPlan.name} (초기 ${chosenPlan.upfront.toLocaleString()}원 / 월 ${chosenPlan.mainAmount.toLocaleString()}원 × ${chosenPlan.months}개월)`
      );

      db.prepare(`
        INSERT INTO audit_logs (project_id, user_name, action, detail, ip_address)
        VALUES (?, ?, '모바일 렌탈 접수', ?, ?)
      `).run(
        dbQuote.project_id,
        `${dbQuote.customer_name}(고객)`,
        `접수번호 ${receiptId} · 견적 v${dbQuote.version} · ${chosenPlan.name}`,
        maskedIpAddr
      );

      const responsePayload = {
        receiptId,
        status: 'received',
        receivedAt
      };

      db.prepare(`
        UPDATE rental_idempotency_keys
        SET processing_state = 'completed', receipt_id = ?, http_status = 201, response_json = ?
        WHERE principal_scope = ? AND idempotency_key = ?
      `).run(receiptId, JSON.stringify(responsePayload), principalScope, idempotencyKey);

      return responsePayload;
    });

    const responsePayload = commitApplication();
    return res.status(201).json(responsePayload);
  } catch (err) {
    // Cleanup orphan encrypted vault objects if DB commit did not complete!
    for (const key of createdVaultKeys) {
      try {
        deleteEncryptedObject(key);
      } catch {}
    }
    db.prepare(`
      UPDATE rental_idempotency_keys
      SET processing_state = 'failed'
      WHERE principal_scope = ? AND idempotency_key = ? AND processing_state = 'processing'
    `).run(principalScope, idempotencyKey);

    const status = err.status || 500;
    return res.status(status).json({
      error: status === 500 ? '렌탈 신청 저장 중 오류가 발생했습니다. 입력 내용은 유지되니 잠시 후 다시 시도해 주세요.' : err.message
    });
  }
});

// 3. GET /api/rental/supplement/:supplementToken (Expiring One-Time Supplement Link Info)
customerRentalRouter.get('/supplement/:supplementToken', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const rawToken = String(req.params.supplementToken || '').trim();
  if (!rawToken) return res.status(400).json({ error: '유효하지 않은 보완 링크입니다.' });

  const tokenHash = sha256Hex(rawToken);
  const sup = db.prepare(`
    SELECT s.*, r.customer_name, r.customer_phone, r.plan_title, r.upfront_fee, r.monthly_fee, r.period_months, r.total_fee, r.status_code, r.project_id
    FROM rental_supplement_requests s
    JOIN rental_applications r ON s.application_id = r.id
    WHERE s.access_token_hash = ?
  `).get(tokenHash);

  if (!sup) {
    return res.status(404).json({ error: '유효하지 않거나 만료된 서류 보완 링크입니다.' });
  }
  if (sup.resolved_at) {
    return res.status(410).json({ error: '이미 서류 재제출이 완료된 링크입니다.' });
  }
  if (new Date(sup.expires_at) < new Date()) {
    return res.status(410).json({ error: '유효기간이 만료된 보완 링크입니다. 담당자에게 재발송을 요청해 주세요.' });
  }

  res.json({
    receiptId: sup.application_id,
    maskedName: sup.customer_name.slice(0, 1) + '*' + sup.customer_name.slice(-1),
    maskedPhone: sup.customer_phone,
    supplementType: sup.supplement_type,
    customerMessage: sup.customer_message,
    expiresAt: sup.expires_at,
    plan: {
      title: sup.plan_title,
      upfront: sup.upfront_fee,
      monthly: sup.monthly_fee,
      months: sup.period_months,
      total: sup.total_fee
    }
  });
});

// 4. POST /api/rental/supplement/:supplementToken (Customer Resubmits Supplement Document)
customerRentalRouter.post('/supplement/:supplementToken', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!verifySameOrigin(req)) {
    return res.status(403).json({ error: '동일 출처 요청만 허용됩니다.' });
  }

  const rawToken = String(req.params.supplementToken || '').trim();
  const tokenHash = sha256Hex(rawToken);
  const sup = db.prepare(`
    SELECT s.*, r.id as app_id, r.project_id, r.status_code, c.name as real_name, c.phone as real_phone
    FROM rental_supplement_requests s
    JOIN rental_applications r ON s.application_id = r.id
    JOIN projects p ON r.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    WHERE s.access_token_hash = ?
  `).get(tokenHash);

  if (!sup || sup.resolved_at || new Date(sup.expires_at) < new Date()) {
    return res.status(410).json({ error: '유효하지 않거나 만료된 보완 요청 링크입니다.' });
  }

  try {
    await runMultipartUpload(req, res);
  } catch (uploadErr) {
    return res.status(uploadErr.status || 400).json({ error: uploadErr.message });
  }

  // Verify identity via either active customer session cookie OR submitted name + phone!
  const viewer = resolveCustomerViewer(req);
  let verifiedOwner = viewer && viewer.decoded.projectId === sup.project_id;
  if (!verifiedOwner) {
    const inputName = String(req.body?.name || '').trim().replace(/\s+/g, '');
    const inputPhone = String(req.body?.phone || '').replace(/\D/g, '');
    const realName = String(sup.real_name || '').trim().replace(/\s+/g, '');
    const realPhone = String(sup.real_phone || '').replace(/\D/g, '');
    if (inputName === realName && inputPhone === realPhone) {
      verifiedOwner = true;
    }
  }
  if (!verifiedOwner) {
    return res.status(401).json({ error: '계약자 성함과 휴대폰 번호가 일치하지 않습니다.' });
  }

  const idDocFile = req.files?.idDocument?.[0];
  const sigFile = req.files?.signature?.[0];
  if (!idDocFile && !sigFile) {
    return res.status(422).json({ error: '보완 제출할 신분증 사진 또는 서명을 등록해 주세요.' });
  }

  let sanitizedIdDoc = null;
  let sanitizedSig = null;
  try {
    if (idDocFile) sanitizedIdDoc = inspectAndSanitizeIdDocument(idDocFile.buffer);
    if (sigFile) sanitizedSig = inspectAndValidateSignaturePng(sigFile.buffer);
  } catch (imgErr) {
    return res.status(imgErr.status || 422).json({ error: imgErr.message });
  }

  const createdKeys = [];
  try {
    const nowIso = new Date().toISOString();
    const retentionUntil = new Date(Date.now() + config.rentalRetentionDays * 86400000).toISOString();
    const maskedIpAddr = maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');

    let newIdKey = null;
    let newSigKey = null;
    if (sanitizedIdDoc) {
      newIdKey = saveEncryptedObject(sanitizedIdDoc.sanitizedBuffer);
      createdKeys.push(newIdKey);
    }
    if (sanitizedSig) {
      newSigKey = saveEncryptedObject(sanitizedSig.sanitizedBuffer);
      createdKeys.push(newSigKey);
    }

    const tx = db.transaction(() => {
      const updatedKinds = [];
      if (sanitizedIdDoc && newIdKey) {
        const maxVer = db.prepare("SELECT COALESCE(MAX(version_no), 0) as v FROM rental_document_versions WHERE application_id = ? AND kind = 'id_card'").get(sup.app_id).v;
        db.prepare("UPDATE rental_document_versions SET is_active = 0 WHERE application_id = ? AND kind = 'id_card'").run(sup.app_id);
        db.prepare(`
          INSERT INTO rental_document_versions (
            application_id, kind, version_no, private_object_key, mime_type, byte_size, width, height, sha256_digest, scan_status, is_active, retention_until, created_at
          ) VALUES (?, 'id_card', ?, ?, ?, ?, ?, ?, ?, 'verified', 1, ?, ?)
        `).run(
          sup.app_id,
          maxVer + 1,
          newIdKey,
          sanitizedIdDoc.mimeType,
          sanitizedIdDoc.sanitizedBuffer.length,
          sanitizedIdDoc.width,
          sanitizedIdDoc.height,
          sha256Hex(sanitizedIdDoc.sanitizedBuffer),
          retentionUntil,
          nowIso
        );
        updatedKinds.push(`신분증 v${maxVer + 1}`);
      }

      if (sanitizedSig && newSigKey) {
        const maxVer = db.prepare("SELECT COALESCE(MAX(version_no), 0) as v FROM rental_document_versions WHERE application_id = ? AND kind = 'signature'").get(sup.app_id).v;
        db.prepare("UPDATE rental_document_versions SET is_active = 0 WHERE application_id = ? AND kind = 'signature'").run(sup.app_id);
        db.prepare(`
          INSERT INTO rental_document_versions (
            application_id, kind, version_no, private_object_key, mime_type, byte_size, width, height, sha256_digest, scan_status, is_active, retention_until, created_at
          ) VALUES (?, 'signature', ?, ?, ?, ?, ?, ?, ?, 'verified', 1, ?, ?)
        `).run(
          sup.app_id,
          maxVer + 1,
          newSigKey,
          sanitizedSig.mimeType,
          sanitizedSig.sanitizedBuffer.length,
          sanitizedSig.width,
          sanitizedSig.height,
          sha256Hex(sanitizedSig.sanitizedBuffer),
          retentionUntil,
          nowIso
        );
        updatedKinds.push(`전자서명 v${maxVer + 1}`);
      }

      db.prepare('UPDATE rental_supplement_requests SET resolved_at = ? WHERE id = ?').run(nowIso, sup.id);
      db.prepare(`
        UPDATE rental_applications
        SET status = '서류검토', status_code = 'review', check_id = 0, check_signature = 0, revision = revision + 1, updated_at = ?
        WHERE id = ?
      `).run(nowIso, sup.app_id);

      db.prepare(`
        INSERT INTO rental_audit_events (
          application_id, actor_name, actor_role, action, reason, previous_state, new_state, ip_masked, event_time
        ) VALUES (?, ?, 'customer', '보완 서류 재제출', ?, 'needs_info', 'review', ?, ?)
      `).run(sup.app_id, `${sup.real_name}(고객)`, `재제출 항목: ${updatedKinds.join(', ')}`, maskedIpAddr, nowIso);

      db.prepare(`
        INSERT INTO audit_logs (project_id, user_name, action, detail, ip_address)
        VALUES (?, ?, '렌탈 보완서류 재제출', ?, ?)
      `).run(sup.project_id, `${sup.real_name}(고객)`, `${sup.app_id} · ${updatedKinds.join(', ')}`, maskedIpAddr);
    });

    tx();
    res.json({ receiptId: sup.app_id, status: 'review', resubmittedAt: nowIso });
  } catch (err) {
    for (const k of createdKeys) {
      try { deleteEncryptedObject(k); } catch {}
    }
    res.status(500).json({ error: '보완 서류 저장 중 오류가 발생했습니다.' });
  }
});

// ============================================================================
// ADMIN RENTAL OPERATIONS API (/api/admin/rental-applications/*)
// ============================================================================

function getAdminScopedApplication(appId, user) {
  const app = db.prepare(`
    SELECT r.*,
           p.org_id, p.partner_name, p.owner_name as project_owner, p.product as project_product,
           c.address as customer_address,
           q.total_price as current_quote_price, q.version as current_quote_version, q.quote_type as current_quote_type,
           priv.masked_phone, priv.masked_birth_date
    FROM rental_applications r
    JOIN projects p ON r.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN quotes q ON r.quote_id = q.id
    LEFT JOIN rental_applicant_private priv ON r.id = priv.application_id
    WHERE r.id = ?
  `).get(appId);

  if (!app) return { errorStatus: 404, error: '렌탈 신청 내역을 찾을 수 없습니다.' };

  // Strict organization & role scope check
  if (user.role === 'partner' && app.org_id !== user.org_id) {
    return { errorStatus: 403, error: '타 파트너사 소속의 렌탈 신청에는 접근할 수 없습니다.' };
  }
  return { app };
}

function canViewOriginalDocuments(user) {
  // Only authorized HQ roles (hq_admin, accountant) may access raw ID/signature
  if (!user) return false;
  return ['hq_admin', 'accountant'].includes(user.role);
}

function canConfirmContract(user) {
  return ['hq_admin', 'accountant'].includes(user.role);
}

// 1. GET /api/admin/rental-applications (Scoped List + KPI Stats + Search + Filter + Cursor)
adminRentalRouter.get('/', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { status = 'all', q = '', assignee = '', cursor = '', limit = '50' } = req.query;

  let scopeWhere = '1=1';
  const scopeParams = [];
  if (req.user.role === 'partner') {
    scopeWhere += ' AND p.org_id = ?';
    scopeParams.push(req.user.org_id);
  }

  // Scoped KPI stats
  const allScoped = db.prepare(`
    SELECT r.status_code, r.status
    FROM rental_applications r
    JOIN projects p ON r.project_id = p.id
    WHERE ${scopeWhere}
  `).all(...scopeParams);

  const stats = {
    total: allScoped.length,
    received: allScoped.filter(x => normalizeStatusCode(x.status_code || x.status) === 'received').length,
    review: allScoped.filter(x => normalizeStatusCode(x.status_code || x.status) === 'review').length,
    needs_info: allScoped.filter(x => normalizeStatusCode(x.status_code || x.status) === 'needs_info').length,
    screening: allScoped.filter(x => normalizeStatusCode(x.status_code || x.status) === 'screening').length,
    confirmed: allScoped.filter(x => normalizeStatusCode(x.status_code || x.status) === 'confirmed').length
  };

  let listSql = `
    SELECT r.id, r.project_id, r.quote_id, r.quote_version, r.customer_name,
           r.product_name, r.plan_key, r.plan_title, r.upfront_fee, r.period_months,
           r.monthly_fee, r.total_fee, r.status, r.status_code, r.revision,
           r.assigned_to, r.contract_reference, r.created_at, r.updated_at,
           p.partner_name, p.owner_name,
           priv.masked_phone
    FROM rental_applications r
    JOIN projects p ON r.project_id = p.id
    LEFT JOIN rental_applicant_private priv ON r.id = priv.application_id
    WHERE ${scopeWhere}
  `;
  const listParams = [...scopeParams];

  if (status && status !== 'all') {
    const norm = normalizeStatusCode(status);
    listSql += ' AND r.status_code = ?';
    listParams.push(norm);
  }

  if (assignee && assignee !== 'all') {
    listSql += ' AND r.assigned_to = ?';
    listParams.push(String(assignee).trim());
  }

  const search = String(q || '').trim();
  if (search) {
    // Search strictly on non-sensitive fields (receiptId, customerName, quote/project no, assignee) — NEVER birthDate!
    listSql += ' AND (r.id LIKE ? OR r.customer_name LIKE ? OR CAST(r.project_id AS TEXT) LIKE ? OR r.assigned_to LIKE ?)';
    const like = `%${search}%`;
    listParams.push(like, like, like, like);
  }

  if (cursor) {
    listSql += ' AND r.created_at < ?';
    listParams.push(String(cursor));
  }

  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  listSql += ' ORDER BY r.created_at DESC, r.id DESC LIMIT ?';
  listParams.push(safeLimit + 1);

  const rows = db.prepare(listSql).all(...listParams);
  const hasMore = rows.length > safeLimit;
  const sliced = hasMore ? rows.slice(0, safeLimit) : rows;

  const docCountStmt = db.prepare(`
    SELECT kind, COUNT(*) as cnt
    FROM rental_document_versions
    WHERE application_id = ? AND is_active = 1 AND deleted_at IS NULL
    GROUP BY kind
  `);

  const items = sliced.map(r => {
    const code = normalizeStatusCode(r.status_code || r.status);
    const docs = docCountStmt.all(r.id);
    return {
      id: r.id,
      projectId: r.project_id,
      quoteNo: String(r.project_id).padStart(4, '0'),
      quoteVersion: r.quote_version || 1,
      customerName: r.customer_name,
      maskedPhone: r.masked_phone || maskPhone(r.customer_phone || ''),
      productName: r.product_name || '창호',
      planKey: r.plan_key,
      planTitle: r.plan_title,
      upfront: r.upfront_fee || 0,
      monthly: r.monthly_fee || 0,
      months: r.period_months || 60,
      total: r.total_fee || 0,
      status: code,
      statusLabel: STATUS_LABELS[code] || r.status,
      revision: r.revision || 1,
      assignedTo: r.assigned_to || r.owner_name || '미배정',
      partnerName: r.partner_name || '직영',
      hasIdCard: docs.some(d => d.kind === 'id_card' && d.cnt > 0),
      hasSignature: docs.some(d => d.kind === 'signature' && d.cnt > 0),
      contractReference: r.contract_reference || null,
      receivedAt: r.created_at,
      updatedAt: r.updated_at
    };
  });

  res.json({
    stats,
    scope: {
      role: req.user.role,
      orgName: req.user.org_name,
      canViewSensitiveDocs: canViewOriginalDocuments(req.user),
      canConfirmContract: canConfirmContract(req.user)
    },
    applications: items,
    nextCursor: hasMore ? sliced[sliced.length - 1].created_at : null
  });
});

// 2. GET /api/admin/rental-applications/:id (Masked Detail + Snapshot + Consents + Document Metadata)
adminRentalRouter.get('/:id', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, req.user);
  if (error) return res.status(errorStatus).json({ error });

  const statusCode = normalizeStatusCode(app.status_code || app.status);
  let snapshot = null;
  if (app.quote_snapshot_json) {
    try { snapshot = JSON.parse(app.quote_snapshot_json); } catch {}
  }

  const canView = canViewOriginalDocuments(req.user);

  // Document metadata + direct dataUrl for authorized users
  const documents = db.prepare(`
    SELECT id, kind, version_no, mime_type, byte_size, width, height, sha256_digest,
           scan_status, is_active, retention_until, deleted_at, created_at, private_object_key
    FROM rental_document_versions
    WHERE application_id = ?
    ORDER BY kind ASC, version_no DESC
  `).all(app.id);

  const consents = db.prepare(`
    SELECT id, item_id, title, approved_version, text_hash, immutable_text, agreed, server_received_at
    FROM rental_consent_snapshots
    WHERE application_id = ?
    ORDER BY id ASC
  `).all(app.id);

  const evidence = db.prepare(`
    SELECT application_snapshot_hash, consent_snapshot_hash, signature_digest, ip_masked, server_received_at
    FROM rental_signature_evidence
    WHERE application_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(app.id);

  const supplements = db.prepare(`
    SELECT id, supplement_type, basis_note, customer_message, expires_at, resolved_at, requested_by, channel, created_at
    FROM rental_supplement_requests
    WHERE application_id = ?
    ORDER BY id DESC
  `).all(app.id);

  const hqStaff = db.prepare(`
    SELECT name, role FROM users WHERE org_id = 1 AND active = 1 ORDER BY id ASC
  `).all();

  res.json({
    application: {
      id: app.id,
      projectId: app.project_id,
      quoteId: app.quote_id,
      quoteNo: String(app.project_id).padStart(4, '0'),
      quoteVersion: app.quote_version || 1,
      customerName: app.customer_name,
      maskedPhone: app.masked_phone || maskPhone(app.customer_phone || ''),
      maskedBirthDate: app.masked_birth_date || '****-**-**',
      address: app.customer_address || '',
      partnerName: app.partner_name || '직영',
      assignedTo: app.assigned_to || app.project_owner || '미배정',
      status: statusCode,
      statusLabel: STATUS_LABELS[statusCode] || app.status,
      allowedNextStatuses: ALLOWED_TRANSITIONS[statusCode] || [statusCode],
      revision: app.revision || 1,
      checks: {
        id: Boolean(app.check_id),
        signature: Boolean(app.check_signature),
        consent: Boolean(app.check_consent)
      },
      snapshotPricing: {
        planKey: app.plan_key,
        planTitle: app.plan_title,
        upfront: app.upfront_fee || 0,
        monthly: app.monthly_fee || 0,
        months: app.period_months || 60,
        total: app.total_fee || 0,
        cashPriceAtSubmission: snapshot?.cashPrice ?? app.current_quote_price ?? 0,
        quoteTypeAtSubmission: snapshot?.quoteType || app.current_quote_type || '가견적'
      },
      currentQuote: {
        quoteId: app.quote_id,
        version: app.current_quote_version || app.quote_version || 1,
        quoteType: app.current_quote_type || '가견적',
        totalPrice: app.current_quote_price || 0
      },
      confirmedAt: app.confirmed_at || null,
      contractReference: app.contract_reference || null,
      cancelledAt: app.cancelled_at || null,
      cancelActor: app.cancel_actor || null,
      cancelReason: app.cancel_reason || null,
      rejectReason: app.reject_reason || null,
      reviewNote: app.review_note || '',
      receivedAt: app.created_at,
      updatedAt: app.updated_at
    },
    documents: documents.map(d => {
      let dataUrl = null;
      if (canView && !d.deleted_at && d.private_object_key) {
        try {
          const plainBuffer = readEncryptedObject(d.private_object_key);
          if (plainBuffer && plainBuffer.length > 0) {
            dataUrl = `data:${d.mime_type || 'image/png'};base64,${plainBuffer.toString('base64')}`;
          }
        } catch (e) {
          console.error('Failed to decrypt document object:', d.id, e.message);
        }
      }
      return {
        id: d.id,
        kind: d.kind,
        versionNo: d.version_no,
        mimeType: d.mime_type,
        byteSize: d.byte_size,
        width: d.width,
        height: d.height,
        digestPrefix: d.sha256_digest ? d.sha256_digest.slice(0, 16) : '',
        scanStatus: d.scan_status,
        isActive: Boolean(d.is_active),
        retentionUntil: d.retention_until,
        deletedAt: d.deleted_at,
        createdAt: d.created_at,
        dataUrl,
        viewUrl: `/api/admin/rental-applications/${encodeURIComponent(app.id)}/documents/${d.id}/view`
      };
    }),
    consents: consents.map(c => ({
      itemId: c.item_id,
      title: c.title,
      version: c.approved_version,
      textHash: c.text_hash,
      body: c.immutable_text,
      agreed: Boolean(c.agreed),
      receivedAt: c.server_received_at
    })),
    signatureEvidence: evidence || null,
    supplementRequests: supplements,
    assignableStaff: hqStaff.map(s => s.name),
    permissions: {
      canViewSensitiveDocs: canViewOriginalDocuments(req.user),
      canConfirmContract: canConfirmContract(req.user),
      canPurgeDocs: req.user.role === 'hq_admin'
    }
  });
});

// 2-1. GET /api/admin/rental-applications/:id/documents/:docId/view (Direct Verified Document View)
adminRentalRouter.get('/:id/documents/:docId/view', (req, res) => {
  let user = null;
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (token) {
    try {
      user = jwt.verify(token, config.jwtSecret);
    } catch {}
  }
  if (!user && req.user) user = req.user;
  if (!user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, user);
  if (error) return res.status(errorStatus).json({ error });

  if (!canViewOriginalDocuments(user)) {
    return res.status(403).json({ error: '서류 열람 권한이 없습니다.' });
  }

  const doc = db.prepare(`
    SELECT * FROM rental_document_versions
    WHERE id = ? AND application_id = ? AND deleted_at IS NULL
  `).get(Number(req.params.docId), app.id);

  if (!doc) {
    return res.status(404).json({ error: '요청한 서류를 찾을 수 없거나 파기되었습니다.' });
  }

  try {
    const plainBuffer = readEncryptedObject(doc.private_object_key);
    res.setHeader('Content-Type', doc.mime_type || 'image/png');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(plainBuffer);
  } catch (err) {
    return res.status(500).json({ error: '서류 복호화에 실패했습니다.' });
  }
});

// 3. POST /api/admin/rental-applications/:id/document-access (Re-Auth + Reason + Audit -> Short-Lived Stream URL)
adminRentalRouter.post('/:id/document-access', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, req.user);
  if (error) return res.status(errorStatus).json({ error });

  const { kind = 'id_card', docId = null, password = '', reason = '' } = req.body || {};
  const maskedIpAddr = maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');

  if (!canViewOriginalDocuments(req.user)) {
    db.prepare(`
      INSERT INTO rental_audit_events (
        application_id, actor_id, actor_name, actor_role, action, reason, ip_masked
      ) VALUES (?, ?, ?, ?, '원본 열람 권한 거부', ?, ?)
    `).run(app.id, req.user.id, req.user.name, req.user.role, `권한 부족(${req.user.role}) · 요청 종류: ${kind}`, maskedIpAddr);

    return res.status(403).json({
      error: '신분증·서명 원본 열람 권한이 없습니다. 심사·계약 담당자 또는 본사 관리자 권한이 필요합니다.'
    });
  }

  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 4) {
    return res.status(422).json({ error: '민감정보 원본 열람 사유를 4자 이상 구체적으로 입력해 주세요.' });
  }

  const userAuthRow = db.prepare('SELECT password_hash FROM users WHERE id = ? AND active = 1').get(req.user.id);
  if (!userAuthRow || !password || !bcrypt.compareSync(String(password), userAuthRow.password_hash)) {
    db.prepare(`
      INSERT INTO rental_audit_events (
        application_id, actor_id, actor_name, actor_role, action, reason, ip_masked
      ) VALUES (?, ?, ?, ?, '원본 열람 재인증 실패', ?, ?)
    `).run(app.id, req.user.id, req.user.name, req.user.role, `비밀번호 불일치 · 요청 종류: ${kind}`, maskedIpAddr);

    return res.status(403).json({ error: '관리자 비밀번호 재인증에 실패했습니다.' });
  }

  const doc = docId
    ? db.prepare('SELECT * FROM rental_document_versions WHERE id = ? AND application_id = ?').get(Number(docId), app.id)
    : db.prepare('SELECT * FROM rental_document_versions WHERE application_id = ? AND kind = ? AND is_active = 1 ORDER BY version_no DESC LIMIT 1').get(app.id, kind);

  if (!doc) {
    return res.status(404).json({ error: '요청한 제출 서류가 존재하지 않습니다.' });
  }
  if (doc.deleted_at) {
    return res.status(410).json({ error: '보존 정책에 따라 파기 완료된 서류입니다.' });
  }

  const expiresInSec = 180; // 3 minutes strict expiry
  const viewedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  const streamToken = jwt.sign(
    {
      scope: 'rental_doc_stream',
      applicationId: app.id,
      docId: doc.id,
      kind: doc.kind,
      viewerId: req.user.id,
      viewerName: req.user.name,
      jti: crypto.randomUUID()
    },
    config.jwtSecret,
    { expiresIn: `${expiresInSec}s` }
  );

  const docLabel = doc.kind === 'id_card' ? '신분증 원본' : '전자 서명 원본';
  db.prepare(`
    INSERT INTO rental_audit_events (
      application_id, actor_id, actor_name, actor_role, action, reason, metadata_json, ip_masked, event_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    app.id,
    req.user.id,
    req.user.name,
    req.user.role,
    `${docLabel} 열람 승인`,
    cleanReason,
    JSON.stringify({ docId: doc.id, kind: doc.kind, versionNo: doc.version_no, expiresAt }),
    maskedIpAddr,
    viewedAt
  );

  db.prepare(`
    INSERT INTO audit_logs (project_id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, '민감서류 열람 재인증', ?, ?)
  `).run(
    app.project_id,
    req.user.id,
    req.user.name,
    `${app.id} · ${docLabel}(v${doc.version_no}) · 사유: ${cleanReason}`,
    maskedIpAddr
  );

  res.json({
    docId: doc.id,
    kind: doc.kind,
    versionNo: doc.version_no,
    mimeType: doc.mime_type,
    streamUrl: `/api/admin/rental-applications/${encodeURIComponent(app.id)}/documents/${doc.id}/stream?accessToken=${encodeURIComponent(streamToken)}`,
    expiresAt,
    expiresInSeconds: expiresInSec,
    watermark: {
      receiptId: app.id,
      viewerName: req.user.name,
      viewerRole: req.user.role,
      viewedAt
    }
  });
});

// 4. GET /api/admin/rental-applications/:id/documents/:docId/stream (Short-Lived Private Decrypt Stream)
adminRentalRouter.get('/:id/documents/:docId/stream', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const rawAccessToken = String(req.query.accessToken || '').trim();
  const maskedIpAddr = maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');

  if (!rawAccessToken) {
    return res.status(401).json({ error: '만료되었거나 유효하지 않은 문서 접근 경로입니다.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(rawAccessToken, config.jwtSecret);
  } catch {
    db.prepare(`
      INSERT INTO rental_audit_events (application_id, actor_name, actor_role, action, reason, ip_masked)
      VALUES (?, '알수없음', 'unknown', '만료/위조 문서 URL 접근 차단', '만료되었거나 서명이 유효하지 않은 스트림 토큰', ?)
    `).run(req.params.id, maskedIpAddr);
    return res.status(403).json({ error: '문서 열람 유효시간(3분)이 만료되었습니다. 다시 재인증 후 열람해 주세요.' });
  }

  if (
    decoded.scope !== 'rental_doc_stream' ||
    decoded.applicationId !== req.params.id ||
    Number(decoded.docId) !== Number(req.params.docId)
  ) {
    return res.status(403).json({ error: '허용된 문서 범위와 일치하지 않습니다.' });
  }

  // Verify the viewer user is still active and still holds sensitive document permission!
  const viewerUser = db.prepare('SELECT id, org_id, name, role, active FROM users WHERE id = ? AND active = 1').get(decoded.viewerId);
  if (!viewerUser || !canViewOriginalDocuments(viewerUser)) {
    return res.status(403).json({ error: '열람 권한이 회수되었거나 비활성화된 계정입니다.' });
  }
  if (req.user && req.user.id !== viewerUser.id) {
    return res.status(403).json({ error: '발급된 열람자 본인의 세션에서만 조회할 수 있습니다.' });
  }

  const doc = db.prepare(`
    SELECT * FROM rental_document_versions
    WHERE id = ? AND application_id = ? AND deleted_at IS NULL
  `).get(Number(req.params.docId), req.params.id);

  if (!doc) {
    return res.status(404).json({ error: '서류 원본을 찾을 수 없거나 파기되었습니다.' });
  }

  try {
    const plainBuffer = readEncryptedObject(doc.private_object_key);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', String(plainBuffer.length));
    return res.send(plainBuffer);
  } catch {
    return res.status(404).json({ error: '비공개 저장소에서 서류 원본을 복호화할 수 없습니다.' });
  }
});

// 5. PATCH /api/admin/rental-applications/:id/review (Optimistic Lock + State Machine + Contract Proof)
adminRentalRouter.patch('/:id/review', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, req.user);
  if (error) return res.status(errorStatus).json({ error });

  // Estimator or Partner cannot mutate review status directly (Partner is read-only on rental screening)
  if (req.user.role === 'partner') {
    return res.status(403).json({ error: '파트너 계정은 렌탈 심사 상태를 변경할 수 없습니다.' });
  }

  const {
    expectedVersion,
    status: requestedStatus,
    checks = null,
    assignedTo = undefined,
    contractReference = undefined,
    memo = '',
    forceCorrection = false
  } = req.body || {};

  if (expectedVersion !== undefined && Number(expectedVersion) !== Number(app.revision || 1)) {
    return res.status(409).json({
      error: '다른 담당자가 먼저 신청 상태를 변경했습니다. 최신 상태를 불러온 뒤 다시 반영해 주세요.',
      code: 'REVISION_CONFLICT',
      currentRevision: app.revision
    });
  }

  const prevStatus = normalizeStatusCode(app.status_code || app.status);
  const nextStatus = requestedStatus ? normalizeStatusCode(requestedStatus) : prevStatus;
  const cleanMemo = String(memo || '').trim().slice(0, 1000);
  const cleanContractRef = contractReference !== undefined ? String(contractReference || '').trim().slice(0, 100) : (app.contract_reference || '');

  const checkId = checks?.id !== undefined ? Boolean(checks.id) : Boolean(app.check_id);
  const checkSignature = checks?.signature !== undefined ? Boolean(checks.signature) : Boolean(app.check_signature);
  const checkConsent = checks?.consent !== undefined ? Boolean(checks.consent) : Boolean(app.check_consent);

  // State transition enforcement
  const allowedNext = ALLOWED_TRANSITIONS[prevStatus] || [prevStatus];
  if (!allowedNext.includes(nextStatus)) {
    const canAdminOverride = req.user.role === 'hq_admin' && forceCorrection === true && cleanMemo.length >= 4;
    if (!canAdminOverride) {
      return res.status(422).json({
        error: `[${STATUS_LABELS[prevStatus]}] 상태에서 [${STATUS_LABELS[nextStatus]}] 상태로 직접 이동할 수 없습니다.`,
        allowedNextStatuses: allowedNext
      });
    }
  }

  // Verification checks mandatory before screening or confirmed
  if (['screening', 'confirmed'].includes(nextStatus) && !(checkId && checkSignature && checkConsent)) {
    return res.status(422).json({
      error: '심사 중 또는 계약 확정 단계로 이동하려면 신분증·서명·필수 동의 확인 체크를 모두 완료해야 합니다.'
    });
  }

  // Contract confirmation strict proof requirement (ANTIGRAVITY_PROMPT.md & ADMIN_PLAN.md)
  if (nextStatus === 'confirmed' && prevStatus !== 'confirmed') {
    if (!canConfirmContract(req.user)) {
      return res.status(403).json({ error: '계약 확정은 심사·계약 담당자 또는 본사 관리자만 처리할 수 있습니다.' });
    }
    if (!cleanContractRef || cleanContractRef.length < 4) {
      return res.status(422).json({
        error: '체크박스 확인만으로 계약을 확정할 수 없습니다. 렌탈사 승인번호 또는 계약번호(근거)를 입력해 주세요.',
        field: 'contractReference'
      });
    }
    if (!cleanMemo) {
      return res.status(422).json({
        error: '계약 확정 승인 근거 및 안내 사항을 처리 메모에 기록해 주세요.',
        field: 'memo'
      });
    }
  }

  // Reason mandatory for needs_info, rejected, cancelled
  if (nextStatus !== prevStatus && ['needs_info', 'rejected', 'cancelled'].includes(nextStatus) && !cleanMemo) {
    return res.status(422).json({
      error: `${STATUS_LABELS[nextStatus]} 처리 사유를 입력해 주세요.`,
      field: 'memo'
    });
  }

  const nextAssignee = assignedTo !== undefined && String(assignedTo).trim()
    ? String(assignedTo).trim()
    : (app.assigned_to || '미배정');

  const nowIso = new Date().toISOString();
  const krStatus = STATUS_CODE_TO_KR[nextStatus] || '접수완료';
  const newRevision = (Number(app.revision) || 1) + 1;
  const maskedIpAddr = maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');

  let retentionDays = null;
  if (['cancelled', 'rejected'].includes(nextStatus) && nextStatus !== prevStatus) {
    retentionDays = config.cancelledRetentionDays;
  } else if (nextStatus === 'confirmed' && nextStatus !== prevStatus) {
    retentionDays = 365 * 5; // 5 years commercial contract evidence retention
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE rental_applications
      SET status = ?,
          status_code = ?,
          revision = ?,
          assigned_to = ?,
          check_id = ?,
          check_signature = ?,
          check_consent = ?,
          confirmed_at = CASE WHEN ? = 'confirmed' AND confirmed_at IS NULL THEN ? ELSE confirmed_at END,
          contract_reference = CASE WHEN ? != '' THEN ? ELSE contract_reference END,
          cancelled_at = CASE WHEN ? = 'cancelled' AND cancelled_at IS NULL THEN ? ELSE cancelled_at END,
          cancel_actor = CASE WHEN ? = 'cancelled' THEN ? ELSE cancel_actor END,
          cancel_reason = CASE WHEN ? = 'cancelled' THEN ? ELSE cancel_reason END,
          reject_reason = CASE WHEN ? = 'rejected' THEN ? ELSE reject_reason END,
          review_note = CASE WHEN ? != '' THEN ? ELSE review_note END,
          updated_at = ?
      WHERE id = ?
    `).run(
      krStatus,
      nextStatus,
      newRevision,
      nextAssignee,
      checkId ? 1 : 0,
      checkSignature ? 1 : 0,
      checkConsent ? 1 : 0,
      nextStatus, nowIso,
      cleanContractRef, cleanContractRef,
      nextStatus, nowIso,
      nextStatus, req.user.name,
      nextStatus, cleanMemo,
      nextStatus, cleanMemo,
      cleanMemo, cleanMemo,
      nowIso,
      app.id
    );

    if (retentionDays !== null) {
      const newRetUntil = new Date(Date.now() + retentionDays * 86400000).toISOString();
      db.prepare('UPDATE rental_document_versions SET retention_until = ? WHERE application_id = ? AND deleted_at IS NULL')
        .run(newRetUntil, app.id);
    }

    // If confirmed, also update or create the linked CRM contract!
    if (nextStatus === 'confirmed' && prevStatus !== 'confirmed') {
      const existingContract = db.prepare("SELECT id FROM contracts WHERE project_id = ? AND type = '렌탈' LIMIT 1").get(app.project_id);
      if (existingContract) {
        db.prepare("UPDATE contracts SET status = '약정완료', note = ?, signed_at = ?, updated_at = ? WHERE id = ?")
          .run(`렌탈 약정 확정 (${cleanContractRef})`, nowIso.slice(0, 10), nowIso, existingContract.id);
      } else {
        const cId = `C-${app.id.replace(/^R-/, '')}`;
        db.prepare(`
          INSERT OR IGNORE INTO contracts (id, project_id, quote_id, quote_version, title, type, amount, deposit_amount, balance_amount, paid_amount, status, note, signed_at, created_at)
          VALUES (?, ?, ?, ?, ?, '렌탈', ?, ?, ?, 0, '약정완료', ?, ?, ?)
        `).run(
          cId,
          app.project_id,
          app.quote_id,
          app.quote_version || 1,
          `${app.customer_name} 고객 렌탈 시공 계약`,
          app.total_fee,
          app.upfront_fee || 0,
          Math.max(0, app.total_fee - (app.upfront_fee || 0)),
          `렌탈 승인·계약번호: ${cleanContractRef}`,
          nowIso.slice(0, 10),
          nowIso
        );
      }
      db.prepare("UPDATE projects SET status = '계약완료', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(app.project_id);
    }

    const actionParts = [];
    if (nextStatus !== prevStatus) {
      actionParts.push(`상태 변경 (${STATUS_LABELS[prevStatus]} → ${STATUS_LABELS[nextStatus]})`);
    }
    if (nextAssignee !== (app.assigned_to || '미배정')) {
      actionParts.push(`담당자 변경 (${app.assigned_to || '미배정'} → ${nextAssignee})`);
    }
    if (actionParts.length === 0) {
      actionParts.push('검토 항목 및 처리 메모 기록');
    }

    db.prepare(`
      INSERT INTO rental_audit_events (
        application_id, actor_id, actor_name, actor_role, action, reason, previous_state, new_state, metadata_json, ip_masked, event_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.id,
      req.user.id,
      req.user.name,
      req.user.role,
      actionParts.join(' · '),
      cleanMemo || (cleanContractRef ? `계약번호: ${cleanContractRef}` : '검토 항목 업데이트'),
      prevStatus,
      nextStatus,
      JSON.stringify({
        checks: { id: checkId, signature: checkSignature, consent: checkConsent },
        assignedTo: nextAssignee,
        contractReference: cleanContractRef || undefined,
        revision: newRevision
      }),
      maskedIpAddr,
      nowIso
    );

    db.prepare(`
      INSERT INTO audit_logs (project_id, user_id, user_name, action, detail, ip_address)
      VALUES (?, ?, ?, '렌탈 심사/상태 변경', ?, ?)
    `).run(
      app.project_id,
      req.user.id,
      req.user.name,
      `${app.id} · ${STATUS_LABELS[nextStatus]}${cleanContractRef ? ' (' + cleanContractRef + ')' : ''}${cleanMemo ? ' · ' + cleanMemo : ''}`,
      maskedIpAddr
    );
  });

  tx();

  res.json({
    success: true,
    id: app.id,
    status: nextStatus,
    statusLabel: STATUS_LABELS[nextStatus],
    revision: newRevision,
    assignedTo: nextAssignee,
    contractReference: cleanContractRef || null
  });
});

// 6. POST /api/admin/rental-applications/:id/supplement-requests (Separated Internal Basis vs Customer Message + One-Time Link)
adminRentalRouter.post('/:id/supplement-requests', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, req.user);
  if (error) return res.status(errorStatus).json({ error });

  if (req.user.role === 'partner') {
    return res.status(403).json({ error: '파트너 계정은 보완 요청을 발송할 수 없습니다.' });
  }

  const {
    supplementType = 'blurry_id',
    basisNote = '',
    customerMessage = '',
    channel = 'kakao'
  } = req.body || {};

  const allowedTypes = {
    blurry_id: '흐린 신분증',
    cropped_id: '신분증 일부 잘림',
    info_mismatch: '계약자 정보 불일치',
    signature_redo: '서명 확인 필요',
    other: '기타 서류 보완'
  };
  if (!allowedTypes[supplementType]) {
    return res.status(422).json({ error: '올바른 보완 유형을 선택해 주세요.' });
  }

  const cleanBasis = String(basisNote || '').trim().slice(0, 500);
  const cleanCustomerMsg = String(customerMessage || '').trim().slice(0, 500);
  if (cleanBasis.length < 4) {
    return res.status(422).json({ error: '내부 검토 근거(담당자 확인 사유)를 4자 이상 입력해 주세요.' });
  }
  if (cleanCustomerMsg.length < 6) {
    return res.status(422).json({ error: '고객에게 안내할 보완 요청 문구를 입력해 주세요.' });
  }

  const prevStatus = normalizeStatusCode(app.status_code || app.status);
  if (['confirmed', 'cancelled', 'rejected'].includes(prevStatus)) {
    return res.status(422).json({ error: `[${STATUS_LABELS[prevStatus]}] 상태인 신청 건에는 보완 요청을 보낼 수 없습니다.` });
  }

  const rawToken = `sup_${crypto.randomBytes(24).toString('hex')}`;
  const tokenHash = sha256Hex(rawToken);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString(); // 72 hours expiry
  const origin = `${req.protocol}://${req.get('host')}`;
  const supplementUrl = `${origin}/quote.html?supplement=${encodeURIComponent(rawToken)}`;
  const safeChannel = channel === 'sms' ? 'sms' : 'kakao';
  const maskedIpAddr = maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
  const newRevision = (Number(app.revision) || 1) + 1;

  // Fetch real customer phone ONLY on server for dispatch logging (never return unmasked phone in response!)
  const realCustomer = db.prepare(`
    SELECT c.name, c.phone FROM projects p JOIN customers c ON p.customer_id = c.id WHERE p.id = ?
  `).get(app.project_id);

  const outboundText = `[KCC홈씨씨 렌탈 서류 보완 안내]\n${app.customer_name} 고객님, 신청하신 렌탈(접수번호 ${app.id})과 관련하여 서류 확인이 필요합니다.\n\n▶ 안내사항: ${cleanCustomerMsg}\n▶ 전용 보완 등록 링크(72시간 유효): ${supplementUrl}`;

  const tx = db.transaction(() => {
    // Expire any previous unresolved supplement tokens for this application
    db.prepare(`
      UPDATE rental_supplement_requests
      SET expires_at = ?
      WHERE application_id = ? AND resolved_at IS NULL
    `).run(nowIso, app.id);

    db.prepare(`
      INSERT INTO rental_supplement_requests (
        application_id, supplement_type, basis_note, customer_message, access_token_hash, expires_at, requested_by, channel, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.id,
      supplementType,
      cleanBasis,
      cleanCustomerMsg,
      tokenHash,
      expiresAt,
      req.user.name,
      safeChannel,
      nowIso
    );

    db.prepare(`
      UPDATE rental_applications
      SET status = '서류보완', status_code = 'needs_info', revision = ?, review_note = ?, updated_at = ?
      WHERE id = ?
    `).run(newRevision, `[보완요청:${allowedTypes[supplementType]}] ${cleanBasis}`, nowIso, app.id);

    if (app.quote_id && realCustomer) {
      db.prepare(`
        INSERT INTO quote_dispatches (
          quote_id, project_id, channel, recipient_name, recipient_phone, message, quote_url, provider, status, sent_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'simulation', 'sent', ?)
      `).run(
        app.quote_id,
        app.project_id,
        safeChannel,
        realCustomer.name,
        realCustomer.phone,
        outboundText,
        supplementUrl,
        req.user.name
      );
    }

    db.prepare(`
      INSERT INTO rental_audit_events (
        application_id, actor_id, actor_name, actor_role, action, reason, previous_state, new_state, metadata_json, ip_masked, event_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'needs_info', ?, ?, ?)
    `).run(
      app.id,
      req.user.id,
      req.user.name,
      req.user.role,
      `보완 요청 발송 (${allowedTypes[supplementType]})`,
      `내부근거: ${cleanBasis} / 고객안내: ${cleanCustomerMsg}`,
      prevStatus,
      JSON.stringify({ supplementType, channel: safeChannel, expiresAt }),
      maskedIpAddr,
      nowIso
    );
  });

  tx();

  res.status(201).json({
    success: true,
    status: 'needs_info',
    statusLabel: STATUS_LABELS.needs_info,
    revision: newRevision,
    recipient: {
      name: app.customer_name,
      maskedPhone: app.masked_phone || maskPhone(realCustomer?.phone || '')
    },
    channel: safeChannel,
    expiresAt,
    supplementUrl,
    dispatchedMessagePreview: outboundText
  });
});

// 7. GET /api/admin/rental-applications/:id/audit (Immutable Audit History)
adminRentalRouter.get('/:id/audit', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, req.user);
  if (error) return res.status(errorStatus).json({ error });

  const events = db.prepare(`
    SELECT id, actor_name, actor_role, action, reason, previous_state, new_state, metadata_json, ip_masked, event_time
    FROM rental_audit_events
    WHERE application_id = ?
    ORDER BY id DESC
  `).all(app.id);

  res.json({
    applicationId: app.id,
    events: events.map(e => ({
      id: e.id,
      actorName: e.actor_name,
      actorRole: e.actor_role,
      action: e.action,
      reason: e.reason || '',
      previousState: e.previous_state ? (STATUS_LABELS[e.previous_state] || e.previous_state) : null,
      newState: e.new_state ? (STATUS_LABELS[e.new_state] || e.new_state) : null,
      ipMasked: e.ip_masked,
      eventTime: e.event_time
    }))
  });
});

// 8. POST /api/admin/rental-applications/:id/purge-documents (Retention / Destruction Policy Enforcement)
adminRentalRouter.post('/:id/purge-documents', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.user.role !== 'hq_admin') {
    return res.status(403).json({ error: '민감 서류 즉시 파기는 본사 보안/운영 관리자만 수행할 수 있습니다.' });
  }
  const { app, errorStatus, error } = getAdminScopedApplication(req.params.id, req.user);
  if (error) return res.status(errorStatus).json({ error });

  const { password = '', reason = '' } = req.body || {};
  if (String(reason).trim().length < 4) {
    return res.status(422).json({ error: '파기 사유를 4자 이상 입력해 주세요.' });
  }
  const userAuthRow = db.prepare('SELECT password_hash FROM users WHERE id = ? AND active = 1').get(req.user.id);
  if (!userAuthRow || !bcrypt.compareSync(String(password), userAuthRow.password_hash)) {
    return res.status(403).json({ error: '관리자 비밀번호 확인에 실패했습니다.' });
  }

  const statusCode = normalizeStatusCode(app.status_code || app.status);
  if (!['cancelled', 'rejected'].includes(statusCode)) {
    return res.status(422).json({ error: '진행 중이거나 계약 확정 보존기간 내의 서류는 임의 파기할 수 없습니다. (취소·진행불가 건만 즉시 파기 가능)' });
  }

  const activeDocs = db.prepare('SELECT * FROM rental_document_versions WHERE application_id = ? AND deleted_at IS NULL').all(app.id);
  const nowIso = new Date().toISOString();
  let purgedCount = 0;

  for (const d of activeDocs) {
    deleteEncryptedObject(d.private_object_key);
    db.prepare('UPDATE rental_document_versions SET is_active = 0, deleted_at = ? WHERE id = ?').run(nowIso, d.id);
    purgedCount++;
  }

  db.prepare(`
    INSERT INTO rental_audit_events (
      application_id, actor_id, actor_name, actor_role, action, reason, ip_masked, event_time
    ) VALUES (?, ?, ?, ?, '민감 서류 비공개 원본 영구 파기', ?, ?, ?)
  `).run(
    app.id,
    req.user.id,
    req.user.name,
    req.user.role,
    `${String(reason).trim()} (파기 파일 ${purgedCount}건)`,
    maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
    nowIso
  );

  res.json({ success: true, purgedCount, purgedAt: nowIso });
});
