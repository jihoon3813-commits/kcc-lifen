import bcrypt from 'bcryptjs';
import { db, initDatabase, ensureApprovedRentalTerms, ensureDefaultContractStatuses, ensureDefaultLandingLinks, hydrateLegacyRentalApplication } from './index.js';
import { getDefaultMenusForRole } from '../utils/menuPermissions.js';

export function seedDatabase() {
  initDatabase();

  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (custCount > 0) {
    console.log('Database already has customer/quote data. Skipping seed.');
    return;
  }

  console.log('Seeding initial database data...');

  const insertOrg = db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, type, code, phone, address, parent_id, level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrg.run(1, '라이프앤조이', 'hq', 'HQ001', '1588-0000', '서울 강남구 역삼동', null, 0);
  insertOrg.run(2, '한빛인테리어', 'partner', 'P001', '02-1234-5678', '서울 송파구 문정동', null, 1);
  insertOrg.run(3, '리움디자인', 'partner', 'P002', '031-987-6543', '경기 성남시 분당구', 2, 2);
  insertOrg.run(4, '온유하우스', 'partner', 'P003', '031-111-2222', '경기 일산서구', null, 1);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, org_id, username, password_hash, name, phone, email, role, allowed_menus, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const saltRounds = 10;
  const adminHash = bcrypt.hashSync('admin123!', saltRounds);
  const userHash = bcrypt.hashSync('user123!', saltRounds);
  const partnerHash = bcrypt.hashSync('partner123!', saltRounds);

  insertUser.run(1, 1, 'admin', adminHash, '김지훈', '010-1111-2222', 'admin@example.com', 'hq_admin', JSON.stringify(getDefaultMenusForRole('hq_admin')));
  insertUser.run(2, 1, 'youngjin', userHash, '오영진', '010-2222-3333', 'youngjin@example.com', 'consultant', JSON.stringify(getDefaultMenusForRole('consultant')));
  insertUser.run(3, 1, 'jeongyeon', userHash, '김정연', '010-3333-4444', 'jeongyeon@example.com', 'estimator', JSON.stringify(getDefaultMenusForRole('estimator')));
  insertUser.run(4, 1, 'jihee', userHash, '마지희', '010-4444-5555', 'jihee@example.com', 'accountant', JSON.stringify(getDefaultMenusForRole('accountant')));
  // 한빛인테리어: 하위 파트너(리움디자인 등)가 있으므로 파트너관리('partners') 포함
  insertUser.run(5, 2, 'partner_hanbit', partnerHash, '이현우', '010-5555-6666', 'hanbit@example.com', 'partner', JSON.stringify(['customers', 'products', 'stats', 'partners']));
  // 리움디자인: 하위 파트너가 없으므로 고객관리, 상품관리, 통계관리만
  insertUser.run(6, 3, 'partner_rium', partnerHash, '박수진', '010-6666-7777', 'rium@example.com', 'partner', JSON.stringify(['customers', 'products', 'stats']));
  // 온유하우스: 단독 1차 파트너
  insertUser.run(7, 4, 'partner_onyou', partnerHash, '정온유', '010-7777-8888', 'onyou@example.com', 'partner', JSON.stringify(['customers', 'products', 'stats']));

  // Labels
  const insertLabel = db.prepare('INSERT OR IGNORE INTO system_labels (name, color) VALUES (?, ?)');
  insertLabel.run('일반', '#7194dd');
  insertLabel.run('긴급', '#e88485');
  insertLabel.run('체크', '#c39b56');
  insertLabel.run('완료', '#74b6a1');

  // Stages
  const stages = ['신규접수', '상담중', '가견적요청', '견적안내', '실측예정', '실측완료', '계약진행', '계약완료', '시공예정', '시공완료', '보류'];
  const insertStage = db.prepare('INSERT OR IGNORE INTO system_stages (name, sort_order, is_active) VALUES (?, ?, 1)');
  stages.forEach((st, idx) => insertStage.run(st, idx + 1));

  // Contract & Payment Statuses
  ensureDefaultContractStatuses();

  // Products
  const insertProduct = db.prepare('INSERT OR IGNORE INTO products (name, code, price_text, category, url) VALUES (?, ?, ?, ?, ?)');
  insertProduct.run('KCC 홈씨씨 창호', 'PROD_WINDOW', '맞춤견적', '창호', '/landing/');
  insertProduct.run('KCC 홈씨씨 키친', 'PROD_KITCHEN', '맞춤견적', '주방', 'https://kcchomecc-partner.com/products/kitchen');
  insertProduct.run('KCC 홈씨씨 욕실', 'PROD_BATH', '맞춤견적', '욕실', 'https://kcchomecc-partner.com/products/bath');

  // Consent forms - 사용자 요청: '(렌탈) 개인정보 동의서'만 유지하고 나머지 양식 제거
  ensureApprovedRentalTerms();

  // Customers & Projects (3101 ~ 3110)
  const customersData = [
    { id: 3101, name: '김서연', phone: '010-0000-1001', address: '경기 하남시 미사강변 · 34평', product: '창호', status: '신규접수', label: '일반', source: '네이버 검색광고', partner: '직영', owner: '미배정', date: '2026-11-12', note: '거실과 안방 창호 교체 상담을 신청했습니다.', feedback: '상담 후 공사 범위를 확인해 주세요.', measure: '', build: '', quote: 0 },
    { id: 3102, name: '이준호', phone: '010-0000-1002', address: '경기 파주시 운정신도시 · 32평', product: '창호', status: '가견적요청', label: '긴급', source: '네이버 검색광고', partner: '직영', owner: '오영진', date: '2026-11-12', note: '전체 창호 교체 희망. 12월 초 입주 전 공사 요청.', feedback: '평면도 수령 완료, 영업지원팀 견적 산출 중입니다.', measure: '', build: '2026-12-03', quote: 0 },
    { id: 3103, name: '박지민', phone: '010-0000-1003', address: '서울 송파구 문정동 · 28평', product: '주방', status: '견적안내', label: '일반', source: '파트너 전용링크', partner: '한빛인테리어', owner: '김정연', date: '2026-11-11', note: 'ㄷ자 주방, 상판 및 수납장 교체 견적 안내했습니다.', feedback: '가견적 2안 비교 후 상담 예정입니다.', measure: '', build: '', quote: 6600000 },
    { id: 3104, name: '최유진', phone: '010-0000-1004', address: '경기 성남시 분당구 · 38평', product: '창호', status: '실측예정', label: '체크', source: '인스타그램', partner: '직영', owner: '오영진', date: '2026-11-11', note: '11/12 오후 2시 방문 실측 확정. 경비실 호출 필요.', feedback: '실측팀 배정 완료 · 이현우 기사', measure: '2026-11-12', build: '2026-12-01', quote: 12650000 },
    { id: 3105, name: '정민수', phone: '010-0000-1005', address: '서울 강동구 고덕동 · 24평', product: '욕실', status: '상담중', label: '일반', source: '직접등록', partner: '리움디자인', owner: '마지희', date: '2026-11-11', note: '욕실 2개 전체 리모델링. 주말에 현장 사진 전달 예정.', feedback: '도기 및 수전 브랜드 확인이 필요합니다.', measure: '', build: '', quote: 0 },
    { id: 3106, name: '한지우', phone: '010-0000-1006', address: '경기 고양시 일산동구 · 33평', product: '창호', status: '계약진행', label: '일반', source: '카카오 광고', partner: '직영', owner: '김정연', date: '2026-11-10', note: '최종견적 확인 완료. 렌탈 60개월로 신청 접수.', feedback: '렌탈 서류 확인 후 심사 요청 예정입니다.', measure: '2026-11-09', build: '2026-11-25', quote: 13200000 },
    { id: 3107, name: '윤도현', phone: '010-0000-1007', address: '서울 마포구 상암동 · 30평', product: '창호', status: '계약진행', label: '체크', source: '파트너 전용링크', partner: '한빛인테리어', owner: '오영진', date: '2026-11-10', note: '선금 30% 입금 확인. 잔금은 시공 완료 후 수납.', feedback: '11/20 시공 일정 확정되었습니다.', measure: '2026-11-08', build: '2026-11-20', quote: 11000000 },
    { id: 3108, name: '김하린', phone: '010-0000-1008', address: '경기 남양주시 다산동 · 25평', product: '주방', status: '가견적요청', label: '일반', source: '네이버 블로그', partner: '리움디자인', owner: '마지희', date: '2026-11-10', note: '아일랜드 확장과 수납장 교체 2가지 안으로 요청.', feedback: '고객 전달 규격 확인 완료.', measure: '', build: '', quote: 0 },
    { id: 3109, name: '이수아', phone: '010-0000-1009', address: '경기 수원시 영통구 · 36평', product: '창호', status: '견적안내', label: '일반', source: '네이버 검색광고', partner: '직영', owner: '김정연', date: '2026-11-09', note: '전체 교체 견적 전달. 가족과 상의 후 실측 신청 예정.', feedback: '내관도와 제품 사양을 함께 안내했습니다.', measure: '', build: '', quote: 14850000 },
    { id: 3110, name: '서민재', phone: '010-0000-1010', address: '서울 노원구 중계동 · 27평', product: '욕실', status: '시공완료', label: '완료', source: '직접등록', partner: '직영', owner: '마지희', date: '2026-11-06', note: '시공 완료 및 고객 검수 확인. 잔금 수납 완료.', feedback: '공사 완료 사진 4장이 등록되었습니다.', measure: '2026-11-02', build: '2026-11-10', quote: 5500000 }
  ];

  const insertCust = db.prepare(`
    INSERT OR IGNORE INTO customers (id, org_id, name, phone, address, marketing_agreed, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  const insertProj = db.prepare(`
    INSERT OR IGNORE INTO projects (id, customer_id, org_id, title, product, status, label, source, partner_name, owner_name, measure_date, build_date, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertConsult = db.prepare(`
    INSERT OR IGNORE INTO consultations (project_id, author_name, type, content, is_important, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const orgMap = { '직영': 1, '한빛인테리어': 2, '리움디자인': 3, '온유하우스': 4 };

  for (const c of customersData) {
    const orgId = orgMap[c.partner] || 1;
    const createdAt = `${c.date} 09:30:00`;
    insertCust.run(c.id, orgId, c.name, c.phone, c.address, createdAt);
    insertProj.run(
      c.id, c.id, orgId, `${c.name} 고객 ${c.product} 공사`, c.product, c.status, c.label,
      c.source, c.partner, c.owner, c.measure || null, c.build || null, c.note, createdAt
    );

    if (c.note) {
      insertConsult.run(c.id, c.owner === '미배정' ? '시스템' : c.owner, 'notes', c.note, 0, createdAt);
    }
    if (c.feedback) {
      insertConsult.run(c.id, '영업지원팀', 'feedback', c.feedback, 0, createdAt);
    }
  }

  // Quotes for 3103, 3104, 3106, 3107, 3109, 3110
  const insertQuote = db.prepare(`
    INSERT OR IGNORE INTO quotes (id, project_id, version, title, quote_type, status, total_cost, margin_rate, sale_price, vat, total_price, discount_amount, access_token, published_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'published', ?, 20.0, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuoteItem = db.prepare(`
    INSERT OR IGNORE INTO quote_items (quote_id, sort_order, name, spec, category, detail_json, quantity, cost_unit_price, cost_total, sale_unit_price, sale_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Quote 6 (Project 3107 - 윤도현 v1 가견적): 실측 전 예상안 total 11,440,000
  insertQuote.run(6, 3107, 1, '윤도현 고객 창호 가견적서 (실측 전)', '가견적', 8320000, 10400000, 1040000, 11440000, 0, 'tok_3107_rough', '2026-11-07 11:00:00', '2026-11-07 11:00:00');
  insertQuoteItem.run(6, 1, '거실 발코니 이중창 (평면도 기준)', '4,250 × 2,300 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '4,250 × 2,300 mm (도면 예상)', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF141S',
    glass: '24T 투명 + 로이(V)', handle: '표준 자동 핸들', mesh: '일반 방충망', panes: 3, upgrade: false
  }), 1, 2320000, 2320000, 2900000, 2900000);
  insertQuoteItem.run(6, 2, '거실 분합창 (평면도 기준)', '3,600 × 2,300 mm', 'window', JSON.stringify({
    type: '공틀창225', size: '3,600 × 2,300 mm (도면 예상)', shape: '3W (1:2:1)', model: 'HW ONE(V)_BF225TM',
    glass: '24T 투명 + 로이(V)', handle: '표준 반자동 핸들', mesh: '미포함', panes: 3, upgrade: false
  }), 1, 1600000, 1600000, 2000000, 2000000);
  insertQuoteItem.run(6, 3, '안방 · 침실 창호 세트', '3,200 × 1,800 mm 외', 'window', JSON.stringify({
    type: '일반이중창230', size: '3,200 × 1,800 mm 외', shape: '3W / 2W', model: 'HW ONE(V)_BF230R',
    glass: '24T 투명 + 로이(V)', handle: '표준 핸들', mesh: '일반 방충망', panes: 3, upgrade: false
  }), 1, 3200000, 3200000, 4000000, 4000000);
  insertQuoteItem.run(6, 4, '기본 철거 · 사다리차 · 마감 예상', '실측 전 기본 산출', 'extra', JSON.stringify({ sub: '실측 후 확정' }), 1, 1200000, 1200000, 1500000, 1500000);

  // Quote 1 (Project 3107 - 윤도현 v2 최종견적): cost 8,000,000, sale 10,000,000, vat 1,000,000, total 11,000,000, discount 500,000
  insertQuote.run(1, 3107, 2, '윤도현 고객 창호 최종견적서 (실측 확정)', '최종견적', 8000000, 10000000, 1000000, 11000000, 500000, 'tok_3107_demo', '2026-11-10 14:00:00', '2026-11-10 14:00:00');
  insertQuoteItem.run(1, 1, '거실 발코니 이중창', '4,200 × 2,300 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '4,200 × 2,300 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF141S',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 2200000, 2200000, 2750000, 2750000);
  insertQuoteItem.run(1, 2, '거실 분합창', '3,600 × 2,300 mm', 'window', JSON.stringify({
    type: '공틀창225', size: '3,600 × 2,300 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_BF225TM',
    glass: '내부 24T 투명 + 로이(V)', handle: 'L-PLUS_N 반자동 HANDLE (대)', mesh: '미포함', panes: 3, upgrade: false
  }), 1, 1500000, 1500000, 1875000, 1875000);
  insertQuoteItem.run(1, 3, '안방 이중창', '3,200 × 1,800 mm', 'window', JSON.stringify({
    type: '일반이중창230', size: '3,200 × 1,800 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_BF230R',
    glass: '내부 24T 미스트 + 로이(V) / 외부 24T 투명 + 로이(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 1700000, 1700000, 2125000, 2125000);
  insertQuoteItem.run(1, 4, '침실 · 주방 발코니창', '2,600 × 2,200 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '2,600 × 2,200 mm', shape: '2W (1:2)', model: 'HW ONE(V)_HBF141S',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 2, upgrade: true
  }), 1, 1400000, 1400000, 1750000, 1750000);
  insertQuoteItem.run(1, 5, '기존 창호 철거', '전체 철거 및 폐기물 처리', 'extra', JSON.stringify({ sub: '' }), 1, 400000, 400000, 500000, 500000);
  insertQuoteItem.run(1, 6, '사다리차', '15층 이하', 'extra', JSON.stringify({ sub: '15층 이하' }), 1, 320000, 320000, 400000, 400000);
  insertQuoteItem.run(1, 7, '부분 보양 및 몰딩 마감', '기본 시공', 'extra', JSON.stringify({ sub: '' }), 1, 480000, 480000, 600000, 600000);

  // Quote 7 (Project 3106 - 한지우 v1 가견적): 실측 전 예상안 total 13,750,000
  insertQuote.run(7, 3106, 1, '한지우 고객 창호 가견적서 (실측 전)', '가견적', 10000000, 12500000, 1250000, 13750000, 0, 'tok_3106_rough', '2026-11-08 11:00:00', '2026-11-08 11:00:00');
  insertQuoteItem.run(7, 1, '거실 확장 발코니창 (도면 기준)', '4,850 × 2,300 mm', 'window', JSON.stringify({
    type: '발코니이중창251', size: '4,850 × 2,300 mm (도면 예상)', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF251D',
    glass: '24T 투명 + 로이(V)', handle: '표준 핸들', mesh: '일반 방충망', panes: 3, upgrade: false
  }), 1, 3360000, 3360000, 4200000, 4200000);
  insertQuoteItem.run(7, 2, '안방 · 입구방 · 후면방 이중창 세트', '3,500 × 2,200 mm 외', 'window', JSON.stringify({
    type: '발코니창141 / 일반이중창230', size: '3,500 × 2,200 mm 외', shape: '3W / 2W', model: 'HW ONE(V)_HBF141S',
    glass: '24T 투명 + 로이(V)', handle: '표준 핸들', mesh: '일반 방충망', panes: 3, upgrade: false
  }), 1, 5040000, 5040000, 6300000, 6300000);
  insertQuoteItem.run(7, 3, '기존 창호 철거 및 고층 사다리차 예상', '고층 기준', 'extra', JSON.stringify({ sub: '실측 후 확정' }), 1, 1600000, 1600000, 2000000, 2000000);

  // Quote 2 (Project 3106 - 한지우 v2 최종견적): total 13,200,000 (cost 9,600,000, sale 12,000,000, vat 1,200,000)
  insertQuote.run(2, 3106, 2, '한지우 고객 창호 최종견적서 (실측 확정)', '최종견적', 9600000, 12000000, 1200000, 13200000, 700000, 'tok_3106_demo', '2026-11-10 15:00:00', '2026-11-10 15:00:00');
  insertQuoteItem.run(2, 1, '거실 확장 발코니창', '4,800 × 2,300 mm', 'window', JSON.stringify({
    type: '발코니이중창251', size: '4,800 × 2,300 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF251D',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 3200000, 3200000, 4000000, 4000000);
  insertQuoteItem.run(2, 2, '안방 발코니 이중창', '3,500 × 2,200 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '3,500 × 2,200 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF141S',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 2400000, 2400000, 3000000, 3000000);
  insertQuoteItem.run(2, 3, '입구방 · 후면방 이중창', '2,800 × 1,800 mm', 'window', JSON.stringify({
    type: '일반이중창230', size: '2,800 × 1,800 mm', shape: '2W (1:1)', model: 'HW ONE(V)_BF230R',
    glass: '24T 투명 + 로이(V)', handle: 'L-PLUS_N HANDLE (중)', mesh: '블랙 STS 방충망', panes: 2, upgrade: true
  }), 1, 2400000, 2400000, 3000000, 3000000);
  insertQuoteItem.run(2, 4, '기존 창호 철거 및 사다리차', '고층 양중 포함', 'extra', JSON.stringify({ sub: '고층 기준' }), 1, 1600000, 1600000, 2000000, 2000000);

  // Quote 3 (Project 3104 - 최유진): total 12,650,000 (cost 9,200,000, sale 11,500,000, vat 1,150,000), discount 1,150,000
  insertQuote.run(3, 3104, 1, '최유진 고객 창호 가견적서', '가견적', 9200000, 11500000, 1150000, 12650000, 1150000, 'tok_3104_demo', '2026-11-11 11:00:00', '2026-11-11 11:00:00');
  insertQuoteItem.run(3, 1, '입구 좌 분합창', '2,800 × 2,400 mm', 'window', JSON.stringify({
    type: '공틀창225', size: '2,800 × 2,400 mm', shape: '2W (1:2)', model: 'HW ONE(V)_BF225TM',
    glass: '내부 24T 투명 + 로이(V)', handle: 'L-PLUS_N 반자동 HANDLE (대)', mesh: '미포함', panes: 2, upgrade: false
  }), 1, 1200000, 1200000, 1500000, 1500000);
  insertQuoteItem.run(3, 2, '입구 우 분합창', '2,550 × 2,400 mm', 'window', JSON.stringify({
    type: '공틀창225', size: '2,550 × 2,400 mm', shape: '2W', model: 'HW ONE(V)_BF225TM',
    glass: '내부 24T 투명 + 로이(V)', handle: 'L-PLUS_N 반자동 HANDLE (대)', mesh: '미포함', panes: 2, upgrade: false
  }), 1, 1120000, 1120000, 1400000, 1400000);
  insertQuoteItem.run(3, 3, '안방 이중창', '3,400 × 1,800 mm', 'window', JSON.stringify({
    type: '일반이중창230', size: '3,400 × 1,800 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_BF230R',
    glass: '내부 24T 미스트 + 로이(V) / 외부 24T 투명 + 로이(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '미포함', panes: 3, upgrade: false
  }), 1, 1920000, 1920000, 2400000, 2400000);
  insertQuoteItem.run(3, 4, '주방 발코니 1', '4,200 × 2,300 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '4,200 × 2,300 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF141S',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 1920000, 1920000, 2400000, 2400000);
  insertQuoteItem.run(3, 5, '주방 발코니 2', '4,850 × 2,300 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '4,850 × 2,300 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF141S',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 2000000, 2000000, 2500000, 2500000);
  insertQuoteItem.run(3, 6, '기존 창호 철거', '전체 철거', 'extra', JSON.stringify({ sub: '' }), 1, 320000, 320000, 400000, 400000);
  insertQuoteItem.run(3, 7, '사다리차', '15층 이하', 'extra', JSON.stringify({ sub: '15층 이하' }), 1, 280000, 280000, 350000, 350000);
  insertQuoteItem.run(3, 8, '부분 보양비', '실내 보양', 'extra', JSON.stringify({ sub: '' }), 1, 280000, 280000, 350000, 350000);
  insertQuoteItem.run(3, 9, '몰딩 마감', '실리콘·몰딩 마감', 'extra', JSON.stringify({ sub: '' }), 1, 160000, 160000, 200000, 200000);

  // Quote 4 (Project 3109 - 이수아): total 14,850,000 (cost 10,800,000, sale 13,500,000, vat 1,350,000), discount 1,350,000
  insertQuote.run(4, 3109, 1, '이수아 고객 창호 전체교체 가견적서', '가견적', 10800000, 13500000, 1350000, 14850000, 1350000, 'tok_3109_demo', '2026-11-09 16:00:00', '2026-11-09 16:00:00');
  insertQuoteItem.run(4, 1, '거실 발코니창', '4,780 × 2,230 mm', 'window', JSON.stringify({
    type: '발코니창141', size: '4,780 × 2,230 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_HBF141S',
    glass: '28T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 3600000, 3600000, 4500000, 4500000);
  insertQuoteItem.run(4, 2, '안방 · 침실 이중창 세트', '3,460 × 2,220 mm 외', 'window', JSON.stringify({
    type: '일반이중창230', size: '3,460 × 2,220 mm', shape: '3W (1:2:1)', model: 'HW ONE(V)_BF230R',
    glass: '24T 더블로이 + 투명(V)', handle: 'L-PLUS_N HANDLE (대)', mesh: '블랙 STS 방충망', panes: 3, upgrade: true
  }), 1, 5600000, 5600000, 7000000, 7000000);
  insertQuoteItem.run(4, 3, '기존 창호 철거 및 사다리차 · 마감', '15층 이하 기준', 'extra', JSON.stringify({ sub: '15층 이하' }), 1, 1600000, 1600000, 2000000, 2000000);

  // Quote 5 (Project 3103 - 박지민): total 6,600,000
  insertQuote.run(5, 3103, 1, '박지민 고객 맞춤 주방 가견적서', '가견적', 4800000, 6000000, 600000, 6600000, 300000, 'tok_3103_demo', '2026-11-11 13:00:00', '2026-11-11 13:00:00');
  insertQuoteItem.run(5, 1, 'ㄷ자 맞춤 상·하부장', '28평형 맞춤 설계', 'window', JSON.stringify({
    type: 'KCC 홈씨씨 키친', size: '맞춤 규격', shape: 'ㄷ자 아일랜드형', model: 'HOMECC PRESTIGE KITCHEN',
    glass: '친환경 E0 등급 도어', handle: '히든 목찬넬', mesh: '엔지니어드 스톤 상판', panes: 2, upgrade: true
  }), 1, 4000000, 4000000, 5000000, 5000000);
  insertQuoteItem.run(5, 2, '기존 싱크 철거 및 설비 마감', '기본 시공', 'extra', JSON.stringify({ sub: '' }), 1, 800000, 800000, 1000000, 1000000);

  // Quote 8 & 9 (Project 3110 - 서민재 욕실 v1 가견적 & v2 최종견적)
  insertQuote.run(8, 3110, 1, '서민재 고객 욕실 가견적서 (실측 전)', '가견적', 4240000, 5300000, 530000, 5830000, 0, 'tok_3110_rough', '2026-11-01 11:00:00', '2026-11-01 11:00:00');
  insertQuoteItem.run(8, 1, '욕실 도기 · 수전 · 타일 기본 패키지', '27평형 공용욕실 예상', 'window', JSON.stringify({
    type: 'KCC 홈씨씨 바스', size: '표준 욕실 규격', shape: '기본형', model: 'HOMECC BATH STANDARD',
    glass: '강화유리 파티션', handle: '무광 니켈 수전', mesh: '미끄럼방지 포세린 타일', panes: 2, upgrade: false
  }), 1, 3440000, 3440000, 4300000, 4300000);
  insertQuoteItem.run(8, 2, '철거 · 방수 · 기본 시공 예상', '실측 전 기본 산출', 'extra', JSON.stringify({ sub: '실측 후 확정' }), 1, 800000, 800000, 1000000, 1000000);

  insertQuote.run(9, 3110, 2, '서민재 고객 욕실 최종견적서 (실측 확정)', '최종견적', 4000000, 5000000, 500000, 5500000, 330000, 'tok_3110_demo', '2026-11-03 15:00:00', '2026-11-03 15:00:00');
  insertQuoteItem.run(9, 1, 'KCC 홈씨씨 프리미엄 바스 패키지', '2,150 × 1,650 mm 실측 확정', 'window', JSON.stringify({
    type: 'KCC 홈씨씨 바스', size: '2,150 × 1,650 mm', shape: '파티션형', model: 'HOMECC BATH PRESTIGE',
    glass: '투명 강화유리 파티션', handle: 'KCC 정품 수전 세트', mesh: '600각 포세린 타일 업그레이드', panes: 2, upgrade: true
  }), 1, 3200000, 3200000, 4000000, 4000000);
  insertQuoteItem.run(9, 2, '기존 욕실 철거 · 방수 · 폐기물 마감', '기본 시공 포함', 'extra', JSON.stringify({ sub: '' }), 1, 800000, 800000, 1000000, 1000000);

  // Sync rough_quote_url & final_quote_url on seeded projects
  const setProjLinks = db.prepare('UPDATE projects SET rough_quote_url = ?, final_quote_url = ? WHERE id = ?');
  setProjLinks.run('/quote.html?token=tok_3103_demo', null, 3103);
  setProjLinks.run('/quote.html?token=tok_3104_demo', null, 3104);
  setProjLinks.run('/quote.html?token=tok_3106_rough', '/quote.html?token=tok_3106_demo', 3106);
  setProjLinks.run('/quote.html?token=tok_3107_rough', '/quote.html?token=tok_3107_demo', 3107);
  setProjLinks.run('/quote.html?token=tok_3109_demo', null, 3109);
  setProjLinks.run('/quote.html?token=tok_3110_rough', '/quote.html?token=tok_3110_demo', 3110);

  // Contracts
  const insertContract = db.prepare(`
    INSERT INTO contracts (id, project_id, quote_id, quote_version, title, type, amount, deposit_amount, balance_amount, paid_amount, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertContract.run('C-261112-001', 3106, 2, 2, '한지우 고객 렌탈 시공 계약', '렌탈', 13200000, 0, 13200000, 0, '약정대기', '2026-11-12 10:00:00');
  insertContract.run('C-261110-002', 3107, 1, 2, '윤도현 고객 창호 시공 계약', '일시불(현금)', 11000000, 3300000, 7700000, 3300000, '선금완료', '2026-11-10 16:00:00');
  insertContract.run('C-261106-003', 3110, 9, 2, '서민재 고객 욕실 시공 계약', '일시불(현금)', 5500000, 1650000, 3850000, 5500000, '수납완료', '2026-11-06 14:00:00');

  // Cash receipt for 3107
  const insertReceipt = db.prepare(`
    INSERT INTO cash_receipts (contract_id, receipt_type, amount, receipt_no, paid_date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertReceipt.run('C-261110-002', 'deposit', 3300000, 'RCP-261110-01', '2026-11-10', '선금 30% 수납');
  insertReceipt.run('C-261106-003', 'deposit', 1650000, 'RCP-261106-01', '2026-11-06', '선금 30% 수납');
  insertReceipt.run('C-261106-003', 'balance', 3850000, 'RCP-261109-02', '2026-11-09', '잔금 70% 완납');

  // Rental applications
  const insertRental = db.prepare(`
    INSERT INTO rental_applications (id, project_id, quote_id, customer_name, customer_phone, product_name, period_months, monthly_fee, total_fee, status, status_code, review_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRental.run('R-261112-001', 3106, 2, '한지우', '010-0000-1006', '창호', 60, 282000, 17420000, '서류검토', 'review', '렌탈 서류 접수 완료, 담당자 서류 확인 진행 중', '2026-11-12 11:00:00');
  const seededApp = db.prepare('SELECT * FROM rental_applications WHERE id = ?').get('R-261112-001');
  hydrateLegacyRentalApplication(seededApp);

  // Landing events for analytics
  const insertEvent = db.prepare(`
    INSERT INTO landing_events (event_type, product_name, partner_name, channel, utm_source, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const d = new Date(now.getTime() - daysAgo * 86400000);
    const dateStr = d.toISOString().replace('T', ' ').slice(0, 19);
    insertEvent.run('page_view', 'KCC 홈씨씨 창호', '직영', '네이버 검색광고', 'naver', '121.134.12.3', dateStr);
  }
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const d = new Date(now.getTime() - daysAgo * 86400000);
    const dateStr = d.toISOString().replace('T', ' ').slice(0, 19);
    insertEvent.run('inquiry', 'KCC 홈씨씨 창호', '직영', '네이버 검색광고', 'naver', '121.134.12.3', dateStr);
  }

  ensureDefaultLandingLinks();
  console.log('Database seeded successfully!');
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
