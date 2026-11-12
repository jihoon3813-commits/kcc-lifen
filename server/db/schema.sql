-- KCC HomeCC CRM 3.0 Database Schema (SQLite)
-- Operator: (주)라이프앤조이

PRAGMA foreign_keys = ON;

-- 1. Organizations (본사 및 파트너사)
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('hq', 'partner')),
  code TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Roles (본사 관리자, 상담사, 견적 담당자, 파트너 관리자, 회계)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK(role IN ('hq_admin', 'consultant', 'estimator', 'partner', 'accountant')),
  allowed_menus TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers (고객 기본정보)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  marketing_agreed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Projects (고객별 공사건 - 고객 1명이 여러 공사건 가능)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY, -- ex: 3101, 3102...
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  title TEXT,
  product TEXT NOT NULL DEFAULT '창호', -- 창호, 주방, 욕실
  status TEXT NOT NULL DEFAULT '신규접수',
  label TEXT NOT NULL DEFAULT '일반',
  source TEXT NOT NULL DEFAULT '직접등록',
  partner_name TEXT NOT NULL DEFAULT '직영',
  owner_id INTEGER REFERENCES users(id),
  owner_name TEXT NOT NULL DEFAULT '미배정',
  measure_date TEXT,
  build_date TEXT,
  rough_quote_url TEXT,
  final_quote_url TEXT,
  drawing_url TEXT,
  description TEXT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Consultations & Feedback (상담 및 피드백)
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  author_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('notes', 'feedback')),
  content TEXT NOT NULL,
  is_important INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Estimate Sources (KCC 원본 엑셀/링크 파일)
CREATE TABLE IF NOT EXISTS estimate_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT,
  original_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  parsed_cost INTEGER DEFAULT 0,
  items_json TEXT, -- JSON array of parsed items
  status TEXT DEFAULT 'parsed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Quotes (견적서 헤더 및 버전 관리)
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  quote_type TEXT NOT NULL DEFAULT '가견적',
  status TEXT NOT NULL CHECK(status IN ('draft', 'published')),
  total_cost INTEGER NOT NULL DEFAULT 0,
  supply_cost INTEGER NOT NULL DEFAULT 0,
  margin_rate REAL NOT NULL DEFAULT 100.0,
  material_subtotal INTEGER NOT NULL DEFAULT 0,
  extra_subtotal INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER NOT NULL DEFAULT 0,
  vat INTEGER NOT NULL DEFAULT 0,
  original_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  meta_json TEXT,
  memo TEXT,
  access_token TEXT UNIQUE,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Quote Items (견적 품목 불변 스냅샷)
CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  spec TEXT,
  category TEXT NOT NULL DEFAULT 'window',
  detail_json TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  margin_rate REAL NOT NULL DEFAULT 100.0,
  cost_unit_price INTEGER NOT NULL DEFAULT 0,
  cost_total INTEGER NOT NULL DEFAULT 0,
  sale_unit_price INTEGER NOT NULL DEFAULT 0,
  sale_total INTEGER NOT NULL DEFAULT 0
);

-- 9. Quote Views (고객 열람 이력)
CREATE TABLE IF NOT EXISTS quote_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  verified_name TEXT NOT NULL,
  verified_phone TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. OTP Verifications (고객 본인확인용 OTP)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  quote_id INTEGER REFERENCES quotes(id),
  attempts INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Contracts (계약 관리 - 특정 견적 버전 고정 바인딩)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY, -- ex: 'C-3106'
  project_id INTEGER NOT NULL REFERENCES projects(id),
  quote_id INTEGER REFERENCES quotes(id),
  quote_version INTEGER,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '일시불(현금)', -- 일시불(현금), 카드할부, 렌탈
  amount INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  balance_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '계약완료',
  note TEXT,
  signed_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Cash Receipts (현금 수납 원장)
CREATE TABLE IF NOT EXISTS cash_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  receipt_type TEXT NOT NULL CHECK(receipt_type IN ('deposit', 'balance', 'full')),
  amount INTEGER NOT NULL,
  receipt_no TEXT,
  paid_date TEXT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Payment Orders & PG Transactions (카드 PG 결제 주문 및 승인/취소)
CREATE TABLE IF NOT EXISTS payment_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  order_no TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'failed')),
  pg_provider TEXT DEFAULT 'mock_pg',
  pg_tid TEXT,
  card_name TEXT,
  card_quota INTEGER DEFAULT 0,
  approved_at DATETIME,
  cancelled_at DATETIME,
  cancel_reason TEXT,
  raw_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Rental Applications (렌탈 신청 및 심사/약정/정산)
CREATE TABLE IF NOT EXISTS rental_applications (
  id TEXT PRIMARY KEY, -- ex: 'R-20261112-000001'
  project_id INTEGER NOT NULL REFERENCES projects(id),
  quote_id INTEGER REFERENCES quotes(id),
  quote_version INTEGER DEFAULT 1,
  quote_snapshot_json TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '창호',
  plan_key TEXT NOT NULL DEFAULT 'lowupfront',
  plan_title TEXT NOT NULL DEFAULT '초기 부담을 줄이는 렌탈',
  upfront_fee INTEGER NOT NULL DEFAULT 0,
  period_months INTEGER NOT NULL DEFAULT 60,
  monthly_fee INTEGER NOT NULL DEFAULT 0,
  total_fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '접수완료' CHECK(status IN ('접수완료', '서류검토', '서류보완', '심사중', '약정대기', '약정완료', '정산완료', '반려', '부결')),
  status_code TEXT NOT NULL DEFAULT 'received',
  revision INTEGER NOT NULL DEFAULT 1,
  assigned_to TEXT NOT NULL DEFAULT '미배정',
  check_id INTEGER NOT NULL DEFAULT 0,
  check_signature INTEGER NOT NULL DEFAULT 0,
  check_consent INTEGER NOT NULL DEFAULT 0,
  confirmed_at DATETIME,
  contract_reference TEXT,
  cancelled_at DATETIME,
  cancel_actor TEXT,
  cancel_reason TEXT,
  reject_reason TEXT,
  review_note TEXT,
  doc_id_card TEXT,
  doc_signature TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14b. Rental Applicant Private Data (암호화된 생년월일/연락처 분리 보관)
CREATE TABLE IF NOT EXISTS rental_applicant_private (
  application_id TEXT PRIMARY KEY REFERENCES rental_applications(id) ON DELETE CASCADE,
  masked_phone TEXT NOT NULL,
  masked_birth_date TEXT NOT NULL,
  encrypted_phone TEXT NOT NULL,
  encrypted_birth_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14c. Rental Document Versions (비공개 암호화 파일 객체 및 버전/파기 관리)
CREATE TABLE IF NOT EXISTS rental_document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('id_card', 'signature')),
  version_no INTEGER NOT NULL DEFAULT 1,
  private_object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  sha256_digest TEXT NOT NULL,
  scan_status TEXT NOT NULL DEFAULT 'verified',
  is_active INTEGER NOT NULL DEFAULT 1,
  retention_until DATETIME,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14d. Rental Consent Snapshots (신청 시점 약관 원문 불변 스냅샷)
CREATE TABLE IF NOT EXISTS rental_consent_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  approved_version TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  immutable_text TEXT NOT NULL,
  agreed INTEGER NOT NULL CHECK(agreed IN (0, 1)),
  server_received_at DATETIME NOT NULL
);

-- 14e. Rental Signature Evidence (신청 데이터 + 동의서 + 서명 해시 결합 증빙)
CREATE TABLE IF NOT EXISTS rental_signature_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES rental_document_versions(id) ON DELETE CASCADE,
  application_snapshot_hash TEXT NOT NULL,
  consent_snapshot_hash TEXT NOT NULL,
  signature_digest TEXT NOT NULL,
  ip_masked TEXT,
  user_agent TEXT,
  server_received_at DATETIME NOT NULL
);

-- 14f. Rental Supplement Requests (보완 요청 및 만료형 일회성 링크)
CREATE TABLE IF NOT EXISTS rental_supplement_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  supplement_type TEXT NOT NULL,
  basis_note TEXT NOT NULL,
  customer_message TEXT NOT NULL,
  access_token_hash TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  resolved_at DATETIME,
  requested_by TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'link',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14g. Rental Audit Events (원본 열람·실패·상태 전이·담당자 변경 불변 이력)
CREATE TABLE IF NOT EXISTS rental_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  actor_id INTEGER,
  actor_name TEXT NOT NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  previous_state TEXT,
  new_state TEXT,
  metadata_json TEXT,
  ip_masked TEXT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14h. Rental Idempotency Keys (중복 접수 방지 및 동일 응답 보장)
CREATE TABLE IF NOT EXISTS rental_idempotency_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  principal_scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processing_state TEXT NOT NULL CHECK(processing_state IN ('processing', 'completed', 'failed')),
  receipt_id TEXT,
  http_status INTEGER DEFAULT 201,
  response_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(principal_scope, idempotency_key)
);

-- 15. Products (상품 관리)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  price_text TEXT,
  category TEXT NOT NULL DEFAULT '창호',
  url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. Landing Events & Analytics (유입 및 전환 이벤트 로그)
CREATE TABLE IF NOT EXISTS landing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- page_view, consultation_request, quote_request, contract
  product_name TEXT,
  partner_name TEXT DEFAULT '직영',
  channel TEXT DEFAULT '직접',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. System Settings: Labels, Stages, Forms
CREATE TABLE IF NOT EXISTS system_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS system_contract_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'blue',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS consent_forms (
  id TEXT PRIMARY KEY, -- 'rental_privacy'
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  pdf_path TEXT,
  file_name TEXT,
  fields_config TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consent_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL REFERENCES consent_forms(id),
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. Audit Logs (시스템 변경 감사 기록)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  user_id INTEGER,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. Quote Dispatches (문자 SMS / 카카오 알림톡 발송 내역)
CREATE TABLE IF NOT EXISTS quote_dispatches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('sms', 'kakao')),
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  quote_url TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'simulation',
  status TEXT NOT NULL DEFAULT 'sent',
  provider_message_id TEXT,
  error_message TEXT,
  sent_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. Customer Consult Requests (모바일 견적서 고객 상담 접수)
CREATE TABLE IF NOT EXISTS customer_consult_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  payment_method TEXT,
  plan_summary TEXT,
  deposit_amount INTEGER,
  topics_json TEXT,
  preferred_time TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 21. Integration Configs (문자/알림톡 등 외부 발송 연동 설정)
CREATE TABLE IF NOT EXISTS integration_configs (
  key TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_token ON quotes(access_token);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_landing_events_date ON landing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_dispatches_project ON quote_dispatches(project_id);
CREATE INDEX IF NOT EXISTS idx_consult_requests_project ON customer_consult_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_rental_apps_project ON rental_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_rental_apps_status ON rental_applications(status_code);
CREATE INDEX IF NOT EXISTS idx_rental_docs_app ON rental_document_versions(application_id);
CREATE INDEX IF NOT EXISTS idx_rental_audit_app ON rental_audit_events(application_id);
