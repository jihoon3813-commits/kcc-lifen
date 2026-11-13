import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createSamplePngBuffer } from '../server/utils/rentalSecurity.js';

const BASE_URL = 'http://127.0.0.1:5173';

// Build a minimal valid 2x2 JPEG buffer with an injected APP1 (EXIF) metadata segment to test EXIF stripping
function createJpegWithExif() {
  const soi = Buffer.from([0xff, 0xd8]);
  const exifPayload = Buffer.from('Exif\x00\x00SECRET_GPS_TAG_12345', 'ascii');
  const app1Len = Buffer.alloc(2);
  app1Len.writeUInt16BE(exifPayload.length + 2, 0);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), app1Len, exifPayload]);
  // Minimal SOF0 (width=200, height=120) + SOS + EOI
  const sof0 = Buffer.from([
    0xff, 0xc0, 0x00, 0x11, 0x08,
    0x00, 0x78, // height = 120
    0x00, 0xc8, // width = 200
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01
  ]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0xaa, 0x55]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app1, sof0, sos, eoi]);
}

async function runTests() {
  console.log('--- Starting CRM 3.0 Backend & System Tests ---');

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check should be 200');
  const health = await healthRes.json();
  console.log('✓ Health check passed:', health.company, health.system);

  // 2. Authentication & Role Switch
  const adminRes = await fetch(`${BASE_URL}/api/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleName: '본사 관리자' })
  });
  assert.strictEqual(adminRes.status, 200);
  const adminData = await adminRes.json();
  let adminToken = adminData.token;
  console.log('✓ Admin auth passed, user:', adminData.user.name, adminData.user.role);

  // Ensure deterministic clean seed state before running end-to-end suite
  const initResetRes = await fetch(`${BASE_URL}/api/settings/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ confirm: '초기화' })
  });
  assert.strictEqual(initResetRes.status, 200, 'Initial DB reset should succeed');
  const reAdminRes = await fetch(`${BASE_URL}/api/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleName: '본사 관리자' })
  });
  adminToken = (await reAdminRes.json()).token;

  // Partner Auth
  const partnerRes = await fetch(`${BASE_URL}/api/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleName: '한빛인테리어' })
  });
  assert.strictEqual(partnerRes.status, 200);
  const partnerData = await partnerRes.json();
  const partnerToken = partnerData.token;
  console.log('✓ Partner auth passed, user:', partnerData.user.name, partnerData.user.role);

  // 3. Partner Data Isolation Verification
  const partnerCustRes = await fetch(`${BASE_URL}/api/customers`, {
    headers: { 'Authorization': `Bearer ${partnerToken}` }
  });
  const partnerCust = await partnerCustRes.json();
  assert(partnerCust.customers.length > 0, 'Partner should have customers');
  partnerCust.customers.forEach(c => {
    assert(['한빛인테리어', '리움디자인'].includes(c.partner), 'Partner can only see their own or sub-partner customers!');
  });
  console.log(`✓ Partner isolation verified on list: Partner sees only ${partnerCust.customers.length} Hanbit customers`);

  // Partner attempting to access HQ/Direct project (3101) directly -> should be 403!
  const directCustRes = await fetch(`${BASE_URL}/api/customers/3101`, {
    headers: { 'Authorization': `Bearer ${partnerToken}` }
  });
  assert.strictEqual(directCustRes.status, 403, 'Partner accessing other org customer MUST return 403 Forbidden!');
  console.log('✓ Partner security isolation verified on detail: Direct customer access forbidden (403)!');

  // 4. Excel & CSV Parse Engine Test
  const sampleCsvPath = path.resolve('hoon/kcc-homecc-crm-v3-antigravity/samples/estimate-items.csv');
  const csvBuffer = fs.readFileSync(sampleCsvPath);
  const formData = new FormData();
  formData.append('file', new Blob([csvBuffer], { type: 'text/csv' }), 'estimate-items.csv');
  formData.append('projectId', '3102');

  const parseRes = await fetch(`${BASE_URL}/api/quotes/parse-file`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: formData
  });
  assert.strictEqual(parseRes.status, 200, 'Parse should succeed');
  const parseData = await parseRes.json();
  assert.strictEqual(parseData.data.item_count, 3, 'Items count should be 3');
  assert.strictEqual(parseData.data.total_cost, 8000000, 'Cost should be 8,000,000');
  assert.strictEqual(parseData.data.sale_price, 8000000, 'Default 100% baseline sale price should be 8,000,000');
  assert.strictEqual(parseData.data.vat, 800000, 'Default 100% baseline VAT should be 800,000');
  assert.strictEqual(parseData.data.total_price, 8800000, 'Default 100% baseline total should be 8,800,000');
  console.log('✓ KCC estimate file parse verified: Cost 8M -> Baseline 8.8M (VAT incl.)');

  // 4b. Official KCC Excel Template (견적서_20261112120048.xlsx) Parse, Subtotals, Truncation & Discount Test
  {
    const kccXlsxTestPath = path.resolve('hoon/견적서_20261112120048.xlsx');
    const xlsxBuffer = fs.readFileSync(kccXlsxTestPath);
    const xlsxForm = new FormData();
    xlsxForm.append('file', new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), '견적서_20261112120048.xlsx');
    xlsxForm.append('projectId', '3101');

    const xlsxParseRes = await fetch(`${BASE_URL}/api/quotes/parse-file`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: xlsxForm
    });
    assert.strictEqual(xlsxParseRes.status, 200, 'Official KCC XLSX parse should succeed');
    const xlsxData = (await xlsxParseRes.json()).data;
    assert.strictEqual(xlsxData.item_count, 16, 'Official KCC XLSX should extract all 16 items');
    assert.strictEqual(xlsxData.total_cost, 10439400, 'Excel VAT-excluded subtotal (T62) should be 10,439,400');
    assert.strictEqual(xlsxData.supply_cost, 11483340, 'Supply cost (D9 grand total VAT-incl.) should be 11,483,340');
    assert.strictEqual(xlsxData.material_subtotal, 9638700, 'Material subtotal (Col D != 기타견적, 10원 절삭) should be 9,638,700');
    assert.strictEqual(xlsxData.extra_subtotal, 800000, 'Extra subtotal (Col D == 기타견적, 10원 절삭) should be 800,000');
    assert.strictEqual(xlsxData.sale_price, 10438700, 'Truncated VAT-excluded sum should be 10,438,700');
    assert.strictEqual(xlsxData.original_price, 11482570, 'Truncated VAT-included total should be 11,482,570');
    assert(xlsxData.meta && xlsxData.meta.kcc_quote_no, 'Excel basic info metadata (kcc_quote_no) should be extracted');

    // Publish KCC Excel quote on project 3101 with 115% margin on materials, 100% on extras, and 300,000 KRW lump-sum discount
    const xlsxItemsWithMargin = xlsxData.items.map(it => ({
      ...it,
      margin_rate: it.category === 'extra' ? 100 : 115
    }));
    const xlsxPubRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        projectId: 3101,
        items: xlsxItemsWithMargin,
        marginRate: 115,
        discountAmount: 300000,
        supplyCost: xlsxData.supply_cost,
        excelSubtotal: xlsxData.total_cost,
        meta: xlsxData.meta,
        quoteType: '가견적',
        title: '김서연 고객 27평 창호 가견적서',
        isPublish: true
      })
    });
    assert.strictEqual(xlsxPubRes.status, 201, 'KCC Excel quote publish should succeed');
    const xlsxPub = await xlsxPubRes.json();
    assert.strictEqual(xlsxPub.summary.supply_cost, 11483340, 'Preserved supply_cost must remain 11,483,340');
    assert.strictEqual(xlsxPub.summary.discount_amount, 300000, 'Discount amount must be 300,000');
    assert.strictEqual(xlsxPub.summary.margin_amount, xlsxPub.summary.total_price - 11483340, 'Margin amount = total_price - supply_cost');

    // Verify customer mobile quote exposes subtotals, discount, meta, and NEVER exposes supply_cost or margin
    const otp3101 = await (await fetch(`${BASE_URL}/api/public/quotes/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: xlsxPub.access_token, name: '김서연', phone: '010-0000-1001' })
    })).json();
    const ver3101 = await (await fetch(`${BASE_URL}/api/public/quotes/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: xlsxPub.access_token, name: '김서연', phone: '010-0000-1001', code: otp3101.debug_code || '123456' })
    })).json();
    assert.strictEqual(ver3101.verified, true);
    assert.strictEqual(ver3101.quote.discount_amount, 300000);
    assert.strictEqual(ver3101.quote.original_price, xlsxPub.summary.original_price);
    assert.strictEqual(ver3101.quote.material_subtotal, xlsxPub.summary.material_subtotal);
    assert.strictEqual(ver3101.quote.extra_subtotal, 800000);
    assert.strictEqual(ver3101.quote.supply_cost, undefined, 'Customer mobile quote MUST NOT expose supply_cost!');
    assert.strictEqual(ver3101.quote.margin_amount, undefined, 'Customer mobile quote MUST NOT expose margin_amount!');
    assert.strictEqual(ver3101.quote.items[0].margin_rate, undefined, 'Item margin_rate MUST NOT be exposed!');
    assert.strictEqual(ver3101.quote.items[0].cost_total, undefined, 'Item cost_total MUST NOT be exposed!');
    console.log(`✓ Official KCC XLSX E2E verified: SupplyCost ${xlsxPub.summary.supply_cost.toLocaleString()}원, Final ${xlsxPub.summary.total_price.toLocaleString()}원, Margin ${xlsxPub.summary.margin_amount.toLocaleString()}원`);
  }

  // 5. Quote Publishing & Immutable Versioning
  const pubQuoteRes = await fetch(`${BASE_URL}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      projectId: 3102,
      items: parseData.data.items.map(it => ({ ...it, margin_rate: 125 })),
      marginRate: 125.0,
      title: '이준호 고객 창호 정식 견적서',
      isPublish: true
    })
  });
  assert.strictEqual(pubQuoteRes.status, 201, 'Quote publish should succeed');
  const quoteData = await pubQuoteRes.json();
  const token = quoteData.access_token;
  assert(token, 'Access token must be generated');
  console.log(`✓ Quote published: v${quoteData.version}, Token: ${token}, Total: ${quoteData.summary.total_price.toLocaleString()}원`);

  // 6. Customer Mobile Quote & OTP Verification Test
  const pubInfoRes = await fetch(`${BASE_URL}/api/public/quotes/${token}`);
  assert.strictEqual(pubInfoRes.status, 200);
  const pubInfo = await pubInfoRes.json();
  assert.strictEqual(pubInfo.requires_verification, true);

  // Send OTP
  const otpRes = await fetch(`${BASE_URL}/api/public/quotes/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      name: '이준호',
      phone: '010-0000-1002'
    })
  });
  assert.strictEqual(otpRes.status, 200);
  const otpData = await otpRes.json();
  const code = otpData.debug_code || '123456';

  // Verify OTP
  const verifyRes = await fetch(`${BASE_URL}/api/public/quotes/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      name: '이준호',
      phone: '010-0000-1002',
      code
    })
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.verified, true);
  assert.strictEqual(verifyData.quote.total_price, 11000000);
  // CRITICAL SECURITY CHECK: Ensure cost and margin are NEVER exposed to the customer
  assert.strictEqual(verifyData.quote.cost, undefined, 'Customer response MUST NOT expose cost!');
  assert.strictEqual(verifyData.quote.margin, undefined, 'Customer response MUST NOT expose margin!');
  assert.strictEqual(verifyData.quote.items[0].cost_unit_price, undefined, 'Item cost MUST NOT be exposed!');
  console.log('✓ Customer OTP verification & Confidentiality verified (Zero cost/margin leakage)');

  // 7. Contract & Cash / Card Payments
  const contractRes = await fetch(`${BASE_URL}/api/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      projectId: 3102,
      quoteId: quoteData.quote_id,
      type: '일시불(현금)',
      amount: 11000000
    })
  });
  assert.strictEqual(contractRes.status, 201);
  const contractData = await contractRes.json();
  const contractId = contractData.id;
  console.log(`✓ Contract registered: ${contractId} for 11,000,000 KRW`);

  // Cash receipt: Deposit (3,300,000 KRW)
  const depositRes = await fetch(`${BASE_URL}/api/contracts/${contractId}/cash-receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      receiptType: 'deposit',
      amount: 3300000,
      note: '선금 30% 수납'
    })
  });
  assert.strictEqual(depositRes.status, 200);
  const depositData = await depositRes.json();
  assert.strictEqual(depositData.status, '선금완료');
  assert.strictEqual(depositData.paid_amount, 3300000);
  console.log('✓ Deposit receipt recorded: status is now [선금완료]');

  // Cash receipt: Balance (7,700,000 KRW)
  const balanceRes = await fetch(`${BASE_URL}/api/contracts/${contractId}/cash-receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      receiptType: 'balance',
      amount: 7700000,
      note: '잔금 완납'
    })
  });
  assert.strictEqual(balanceRes.status, 200);
  const balanceData = await balanceRes.json();
  assert.strictEqual(balanceData.status, '수납완료');
  assert.strictEqual(balanceData.paid_amount, 11000000);
  console.log('✓ Balance receipt recorded: status is now [수납완료]');

  // 8. Rental Lifecycle Test
  const rentalRes = await fetch(`${BASE_URL}/api/rentals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      projectId: 3102,
      quoteId: quoteData.quote_id,
      name: '이준호',
      phone: '010-0000-1002',
      plan: '60개월'
    })
  });
  assert.strictEqual(rentalRes.status, 201);
  const rentalData = await rentalRes.json();
  console.log(`✓ Rental application registered: ${rentalData.id}, Monthly: ${rentalData.monthly.toLocaleString()}원`);

  // Update Rental Status
  const rentStatRes = await fetch(`${BASE_URL}/api/rentals/${rentalData.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: '심사중',
      review: '본사 심사 서류 확인 완료'
    })
  });
  assert.strictEqual(rentStatRes.status, 200);
  console.log('✓ Rental status update verified: [심사중]');

  // 9. Analytics & Audit Logs
  const analyticsRes = await fetch(`${BASE_URL}/api/analytics/overview?period=7`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(analyticsRes.status, 200);
  const analytics = await analyticsRes.json();
  assert(analytics.summary.totalCustomers > 0);
  console.log('✓ Analytics verified: Total customers:', analytics.summary.totalCustomers, 'Trend items:', analytics.trend.length);

  const logsRes = await fetch(`${BASE_URL}/api/settings/audit-logs`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(logsRes.status, 200);
  const logs = await logsRes.json();
  assert(logs.logs.length > 0);
  console.log(`✓ Audit logs verified: ${logs.logs.length} audit entries captured`);

  // 10. Official KCC Excel Parser Test (hoon/견적서_20261112120048.xlsx)
  const kccXlsxPath = path.resolve('hoon/견적서_20261112120048.xlsx');
  if (fs.existsSync(kccXlsxPath)) {
    const xlsxBuf = fs.readFileSync(kccXlsxPath);
    const kccForm = new FormData();
    kccForm.append('file', new Blob([xlsxBuf]), '견적서_20261112120048.xlsx');
    const kccParseRes = await fetch(`${BASE_URL}/api/quotes/parse-file`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: kccForm
    });
    assert.strictEqual(kccParseRes.status, 200, 'Official KCC XLSX parse should return 200');
    const kccParsed = await kccParseRes.json();
    assert.strictEqual(kccParsed.data.item_count, 16, 'Official KCC XLSX should extract 16 items');
    assert.strictEqual(kccParsed.data.total_cost, 10439400, 'Official KCC XLSX cost sum should match 10,439,400');
    console.log(`✓ Official KCC Excel parsed: ${kccParsed.data.item_count} items (windows + extras), cost ${kccParsed.data.total_cost.toLocaleString()}원`);
  }

  // 11. Customer Login (Name + Mobile Phone) & Mobile Estimate Consultation Test
  const badLoginRes = await fetch(`${BASE_URL}/api/public/quotes/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name: '홍길동', phone: '010-9999-9999' })
  });
  assert.strictEqual(badLoginRes.status, 401, 'Wrong customer name/phone must be rejected with 401');

  const goodLoginRes = await fetch(`${BASE_URL}/api/public/quotes/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name: '이준호', phone: '010-0000-1002' })
  });
  assert.strictEqual(goodLoginRes.status, 200, 'Valid customer name/phone login should succeed');
  const loginData = await goodLoginRes.json();
  assert.strictEqual(loginData.verified, true);
  assert(loginData.viewer_token, 'Viewer token should be issued');
  assert(loginData.quote.plans && loginData.quote.plans.lowupfront, 'Rental comparison plans must be included');
  assert.strictEqual(loginData.quote.cost, undefined, 'Zero cost leakage on customer login');
  assert.strictEqual(loginData.quote.margin_rate, undefined, 'Zero margin leakage on customer login');
  console.log('✓ Customer Name + Phone login verified (with strict confidentiality)');

  // Submit Consultation from Mobile Estimate
  const consultRes = await fetch(`${BASE_URL}/api/public/quotes/consult`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      viewerToken: loginData.viewer_token,
      paymentMethod: 'lowupfront',
      planSummary: '초기 부담을 줄이는 렌탈 · 60개월',
      topics: ['결제 방식 비교', '시공 일정과 소요 시간'],
      preferredTime: '오후',
      memo: '12월 입주 전 시공 가능 여부 문의드립니다.'
    })
  });
  assert.strictEqual(consultRes.status, 201, 'Mobile consultation submission should return 201');
  console.log('✓ Mobile estimate consultation submission & CRM sync verified');

  // 12. Admin Preview & SMS / KakaoTalk Dispatch Test
  const prevRes = await fetch(`${BASE_URL}/api/quotes/by-project/3102/preview`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(prevRes.status, 200, 'Admin mobile quote preview should return 200');

  const kakaoSendRes = await fetch(`${BASE_URL}/api/quotes/by-project/3102/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      channel: 'kakao',
      recipientName: '이준호',
      recipientPhone: '010-0000-1002'
    })
  });
  assert.strictEqual(kakaoSendRes.status, 201, 'KakaoTalk dispatch should succeed');

  const smsSendRes = await fetch(`${BASE_URL}/api/quotes/by-project/3102/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      channel: 'sms',
      recipientName: '이준호',
      recipientPhone: '010-0000-1002'
    })
  });
  assert.strictEqual(smsSendRes.status, 201, 'SMS dispatch should succeed');
  console.log('✓ KakaoTalk & SMS dispatch endpoints + dispatch history verified');

  // 13. Mobile Estimate Static Assets Check
  for (const assetPath of ['/quote.html', '/quote.css', '/quote.js', '/mobile.html', '/assets/logo.png', '/assets/window.webp', '/assets/kitchen.webp']) {
    const aRes = await fetch(`${BASE_URL}${assetPath}`);
    assert.strictEqual(aRes.status, 200, `Asset ${assetPath} must return 200`);
  }
  console.log('✓ Mobile estimate HTML/CSS/JS & WebP/PNG assets verified');

  // 14. Rough (가견적) vs Final (최종견적) Modal Preview & Selective Dispatch Test
  const prevRough3107 = await fetch(`${BASE_URL}/api/quotes/by-project/3107/preview?type=${encodeURIComponent('가견적')}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(prevRough3107.status, 200);
  const roughData3107 = await prevRough3107.json();
  assert.strictEqual(roughData3107.quote.quote_type, '가견적');
  assert.strictEqual(roughData3107.quote.total_price, 11440000);
  assert.strictEqual(roughData3107.is_simulated_type, false);

  const prevFinal3107 = await fetch(`${BASE_URL}/api/quotes/by-project/3107/preview?type=${encodeURIComponent('최종견적')}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(prevFinal3107.status, 200);
  const finalData3107 = await prevFinal3107.json();
  assert.strictEqual(finalData3107.quote.quote_type, '최종견적');
  assert.strictEqual(finalData3107.quote.total_price, 11000000);
  assert.strictEqual(finalData3107.is_simulated_type, false);

  const simFinal3104 = await fetch(`${BASE_URL}/api/quotes/by-project/3104/preview?type=${encodeURIComponent('최종견적')}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(simFinal3104.status, 200);
  const simData3104 = await simFinal3104.json();
  assert.strictEqual(simData3104.quote.quote_type, '최종견적');
  assert.strictEqual(simData3104.is_simulated_type, true);
  console.log('✓ Rough (가견적) vs Final (최종견적) published & simulated modal previews verified');

  // =========================================================================
  // 15. Rental Application & Admin Console Assets + Unauthenticated Guard
  // =========================================================================
  for (const assetPath of ['/rental.css', '/rental.js', '/admin.html', '/admin.css', '/admin.js']) {
    const res = await fetch(`${BASE_URL}${assetPath}`);
    assert.strictEqual(res.status, 200, `Asset ${assetPath} must return 200`);
  }
  const unauthAdminRes = await fetch(`${BASE_URL}/api/admin/rental-applications`);
  assert.strictEqual(unauthAdminRes.status, 401, 'Unauthenticated admin rental list MUST return 401');
  console.log('✓ Rental frontend/admin assets & unauthenticated 401 guard verified');

  // =========================================================================
  // 16. Customer Rental Context, HttpOnly Cookie, CSRF & Input/Binary Guards
  // =========================================================================
  const cust3104Login = await fetch(`${BASE_URL}/api/public/quotes/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'tok_3104_demo', name: '최유진', phone: '010-0000-1004' })
  });
  assert.strictEqual(cust3104Login.status, 200);
  const setCookieHeader = cust3104Login.headers.get('set-cookie') || '';
  assert(setCookieHeader.includes('kcc_viewer_session='), 'Login must issue kcc_viewer_session cookie');
  assert(setCookieHeader.includes('HttpOnly'), 'Session cookie MUST be HttpOnly');
  const cookiePair = setCookieHeader.split(';')[0];

  const ctxRes = await fetch(`${BASE_URL}/api/rental/context`, {
    headers: { Cookie: cookiePair }
  });
  assert.strictEqual(ctxRes.status, 200, 'Authenticated customer rental context must succeed');
  const ctxData = await ctxRes.json();
  assert.strictEqual(ctxData.mode, 'live');
  assert.strictEqual(ctxData.approvedTerms, true);
  assert(ctxData.terms.length >= 1, 'Must serve approved mandatory consent items');
  assert(ctxData.plans.lowupfront.monthly > 0 && ctxData.plans.lowmonthly.monthly > 0, 'Server plans must be populated');

  const validSignatureBuf = createSamplePngBuffer('signature');
  const blankSignatureBuf = createSamplePngBuffer('blank');
  const exifJpegBuf = createJpegWithExif();
  assert(exifJpegBuf.includes(Buffer.from('SECRET_GPS_TAG_12345')), 'Pre-check: synthetic JPEG has EXIF GPS tag');

  function makeRentalForm({ birthDate = '1988-07-19', plan = 'lowupfront', idBuf = exifJpegBuf, idName = 'id.jpg', sigBuf = validSignatureBuf } = {}) {
    const fd = new FormData();
    fd.append('applicant', JSON.stringify({ name: ctxData.quote.customerName, phone: ctxData.quote.phone, birthDate }));
    fd.append('quote', JSON.stringify({ id: ctxData.quote.id, version: ctxData.quote.version, plan }));
    fd.append('consents', JSON.stringify(ctxData.terms.map(t => ({ id: t.id, version: t.version, agreed: true }))));
    fd.append('idDocument', new Blob([idBuf], { type: 'image/jpeg' }), idName);
    fd.append('signature', new Blob([sigBuf], { type: 'image/png' }), 'signature.png');
    return fd;
  }

  // 16a. Missing CSRF -> 403
  const noCsrfRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: { Cookie: cookiePair, Origin: BASE_URL, 'Idempotency-Key': 'idem_nocsrf_12345' },
    body: makeRentalForm()
  });
  assert.strictEqual(noCsrfRes.status, 403, 'Missing CSRF token must be rejected with 403');

  // 16b. Impossible calendar date -> 422
  const badDateRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': 'idem_baddate_12345'
    },
    body: makeRentalForm({ birthDate: '1990-02-30' })
  });
  assert.strictEqual(badDateRes.status, 422, 'Non-existent calendar date 1990-02-30 must return 422');

  // 16c. Underage applicant -> 422
  const minorRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': 'idem_minor_12345'
    },
    body: makeRentalForm({ birthDate: '2014-05-01' })
  });
  assert.strictEqual(minorRes.status, 422, 'Minor birthDate must return 422');

  // 16d. Disguised text file (.txt renamed to .jpg) -> 415
  const fakeImgRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': 'idem_fakeimg_12345'
    },
    body: makeRentalForm({ idBuf: Buffer.from('not-an-image-text-payload'), idName: 'disguised.jpg' })
  });
  assert.strictEqual(fakeImgRes.status, 415, 'Disguised non-image upload must be rejected by magic bytes with 415');

  // 16e. Blank canvas PNG signature -> 422
  const blankSigRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': 'idem_blanksig_12345'
    },
    body: makeRentalForm({ sigBuf: blankSignatureBuf })
  });
  assert.strictEqual(blankSigRes.status, 422, 'Blank signature PNG must be rejected with 422');
  console.log('✓ HttpOnly cookie, CSRF, birthDate(real/adult), magic-byte image & blank-signature validations verified');

  // =========================================================================
  // 17. Live Rental Submission, Private Encrypted Vault & Idempotency
  // =========================================================================
  const idemKey = 'idem_live_3104_submit_001';
  const submitRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': idemKey
    },
    body: makeRentalForm()
  });
  assert.strictEqual(submitRes.status, 201, 'Valid rental application must return 201');
  const submitData = await submitRes.json();
  assert.strictEqual(submitData.status, 'received');
  assert(/^R-\d{8}-\d{6}$/.test(submitData.receiptId), `Receipt ID format mismatch: ${submitData.receiptId}`);
  const receiptId = submitData.receiptId;

  // Verify encrypted private vault storage & zero files in public/uploads
  const vaultDir = path.resolve('data/private_vault');
  const vaultFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.enc'));
  assert(vaultFiles.length >= 4, 'Encrypted .enc files must exist in data/private_vault');
  const sampleVaultRaw = fs.readFileSync(path.join(vaultDir, vaultFiles[0]));
  assert.notStrictEqual(sampleVaultRaw[0], 0xff, 'Vault file must be AES-GCM ciphertext, not raw JPEG');
  assert.notStrictEqual(sampleVaultRaw[0], 0x89, 'Vault file must be AES-GCM ciphertext, not raw PNG');

  // 18a. Exact retry with same Idempotency-Key -> 200 with identical receiptId
  const retrySameRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': idemKey
    },
    body: makeRentalForm()
  });
  assert.strictEqual(retrySameRes.status, 200, 'Idempotent retry must return 200');
  const retrySameData = await retrySameRes.json();
  assert.strictEqual(retrySameData.receiptId, receiptId, 'Idempotent retry must return identical receiptId');

  // 18b. Altered payload with same Idempotency-Key -> 409
  const retryMismatchRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': idemKey
    },
    body: makeRentalForm({ plan: 'lowmonthly' })
  });
  assert.strictEqual(retryMismatchRes.status, 409, 'Altered payload with same Idempotency-Key must return 409');

  // 18c. New Idempotency-Key while active application exists -> 409
  const dupActiveRes = await fetch(`${BASE_URL}/api/rental/applications`, {
    method: 'POST',
    headers: {
      Cookie: cookiePair,
      Origin: BASE_URL,
      'X-CSRF-Token': ctxData.csrfToken,
      'Idempotency-Key': 'idem_live_3104_submit_002'
    },
    body: makeRentalForm()
  });
  assert.strictEqual(dupActiveRes.status, 409, 'Second active application on same project must return 409');
  console.log(`✓ Live rental submission (${receiptId}), AES-256-GCM vault & idempotency/duplicate guards verified`);

  // =========================================================================
  // 19. Admin RBAC, Masking, Re-Authentication & EXIF-Stripped Document Stream
  // =========================================================================
  // Partner accessing HQ rental -> 403
  const partnerRentalRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}`, {
    headers: { 'Authorization': `Bearer ${partnerToken}` }
  });
  assert.strictEqual(partnerRentalRes.status, 403, 'Partner must get 403 on HQ rental application');

  // Consultant auth -> can view masked detail, CANNOT access raw sensitive documents
  const consultSwitch = await fetch(`${BASE_URL}/api/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleName: '상담사' })
  });
  const consultantToken = (await consultSwitch.json()).token;

  const maskedDetailRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}`, {
    headers: { 'Authorization': `Bearer ${consultantToken}` }
  });
  assert.strictEqual(maskedDetailRes.status, 200);
  const maskedDetail = await maskedDetailRes.json();
  assert.strictEqual(maskedDetail.application.maskedPhone, '010-****-1004');
  assert.strictEqual(maskedDetail.application.maskedBirthDate, '1988-**-**');
  assert(!JSON.stringify(maskedDetail).includes('private_object_key'), 'Detail response MUST NOT leak private_object_key');

  const consultantDocDenied = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/document-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${consultantToken}` },
    body: JSON.stringify({ kind: 'id_card', password: 'user123!', reason: '상담사 열람 시도 테스트' })
  });
  assert.strictEqual(consultantDocDenied.status, 403, 'Consultant role must be denied raw ID document access (403)');

  // HQ Admin wrong password -> 403 + failed audit log
  const wrongPwDocRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/document-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ kind: 'id_card', password: 'wrong-password!', reason: '비밀번호 오입력 감사 테스트' })
  });
  assert.strictEqual(wrongPwDocRes.status, 403, 'Wrong admin password on document re-auth must return 403');

  // HQ Admin valid password + reason -> 200 stream URL + EXIF stripped verification
  const okDocAccessRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/document-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ kind: 'id_card', password: 'admin123!', reason: '신분증 진위 및 계약자 성함 대조' })
  });
  assert.strictEqual(okDocAccessRes.status, 200, 'Authorized re-auth document access must succeed');
  const docAccessData = await okDocAccessRes.json();
  assert(docAccessData.streamUrl && docAccessData.watermark.receiptId === receiptId);

  const streamRes = await fetch(`${BASE_URL}${docAccessData.streamUrl}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(streamRes.status, 200, 'Document stream URL must return 200');
  assert((streamRes.headers.get('cache-control') || '').includes('no-store'), 'Stream MUST set Cache-Control: no-store');
  const streamedBytes = Buffer.from(await streamRes.arrayBuffer());
  assert.strictEqual(streamedBytes[0], 0xff);
  assert.strictEqual(streamedBytes[1], 0xd8);
  assert(!streamedBytes.includes(Buffer.from('SECRET_GPS_TAG_12345')), 'EXIF GPS metadata MUST be stripped from stored/streamed JPEG!');
  console.log('✓ Admin RBAC, masking, password re-authentication, no-store stream & EXIF stripping verified');

  // =========================================================================
  // 20. Supplement Request One-Time Link & Customer Resubmission Flow
  // =========================================================================
  // Move received -> review first
  const toReviewRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ expectedVersion: 1, status: 'review', memo: '초기 서류 검토 착수' })
  });
  assert.strictEqual(toReviewRes.status, 200);

  const supCreateRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/supplement-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      supplementType: 'blurry_id',
      basisNote: '내부검토전용근거-고객비노출확인용999',
      customerMessage: '신분증 빛 반사로 글자 확인이 어려워 정면 재촬영 부탁드립니다.',
      channel: 'kakao'
    })
  });
  assert.strictEqual(supCreateRes.status, 201, 'Supplement request creation must return 201');
  const supCreateData = await supCreateRes.json();
  assert.strictEqual(supCreateData.status, 'needs_info');
  const supUrlObj = new URL(supCreateData.supplementUrl);
  const supToken = supUrlObj.searchParams.get('supplement');
  assert(supToken && supToken.startsWith('sup_'), 'One-time supplement token must be generated');

  // Customer fetches supplement info -> internal basisNote MUST NOT be exposed!
  const supInfoRes = await fetch(`${BASE_URL}/api/rental/supplement/${encodeURIComponent(supToken)}`);
  assert.strictEqual(supInfoRes.status, 200);
  const supInfoText = await supInfoRes.text();
  assert(!supInfoText.includes('내부검토전용근거-고객비노출확인용999'), 'Internal basisNote MUST NEVER leak to customer!');

  // Customer resubmits new ID document via one-time link
  const supForm = new FormData();
  supForm.append('name', '최유진');
  supForm.append('phone', '010-0000-1004');
  supForm.append('idDocument', new Blob([createSamplePngBuffer('id_card')], { type: 'image/png' }), 'id_reupload.png');
  const supPostRes = await fetch(`${BASE_URL}/api/rental/supplement/${encodeURIComponent(supToken)}`, {
    method: 'POST',
    headers: { Origin: BASE_URL },
    body: supForm
  });
  assert.strictEqual(supPostRes.status, 200, 'Customer supplement resubmission must succeed');
  const supPostData = await supPostRes.json();
  assert.strictEqual(supPostData.status, 'review', 'Resubmission must transition status back to review');

  // Re-using consumed supplement token -> 410 Gone
  const supReuseRes = await fetch(`${BASE_URL}/api/rental/supplement/${encodeURIComponent(supToken)}`);
  assert.strictEqual(supReuseRes.status, 410, 'Consumed one-time supplement link MUST return 410 Gone');
  console.log('✓ Separated supplement basis/message, 1-time resubmission (v2) & 410 replay block verified');

  // =========================================================================
  // 21. Optimistic Lock, 3-Check Gate & Contract Confirmation Proof
  // =========================================================================
  const afterSupDetail = await (await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  })).json();
  const curRev = afterSupDetail.application.revision;
  const activeIdV2 = afterSupDetail.documents.find(d => d.kind === 'id_card' && d.isActive);
  assert.strictEqual(activeIdV2.versionNo, 2, 'Active ID document must now be v2');

  // 21a. Screening without 3 checks -> 422
  const noChecksScreen = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      expectedVersion: curRev,
      status: 'screening',
      checks: { id: true, signature: false, consent: true },
      memo: '서명 미체크 시도'
    })
  });
  assert.strictEqual(noChecksScreen.status, 422, 'Screening without all 3 checks must fail with 422');

  // 21b. Move review -> screening with all 3 checks -> 200
  const okScreenRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      expectedVersion: curRev,
      status: 'screening',
      checks: { id: true, signature: true, consent: true },
      memo: '보완 신분증 v2 및 자필서명·동의 3종 이상 없음, 렌탈사 심사 접수'
    })
  });
  assert.strictEqual(okScreenRes.status, 200);
  const screenData = await okScreenRes.json();

  // 21c. Stale expectedVersion -> 409
  const staleRevRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      expectedVersion: curRev, // stale!
      status: 'screening',
      memo: '구버전 충돌 테스트'
    })
  });
  assert.strictEqual(staleRevRes.status, 409, 'Stale expectedVersion must return 409 Conflict');

  // 21d. Confirmed with checkboxes ONLY (missing contractReference) -> 422
  const confirmNoRefRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      expectedVersion: screenData.revision,
      status: 'confirmed',
      checks: { id: true, signature: true, consent: true },
      memo: '승인번호 누락 확정 시도'
    })
  });
  assert.strictEqual(confirmNoRefRes.status, 422, 'Confirming contract without contractReference MUST fail with 422');

  // 21e. Confirmed WITH contractReference + memo -> 200
  const confirmOkRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      expectedVersion: screenData.revision,
      status: 'confirmed',
      contractReference: 'KCC-RNT-20261112-8801',
      checks: { id: true, signature: true, consent: true },
      memo: '렌탈사 해피콜 및 최종 약정 체결 승인 확인 완료'
    })
  });
  assert.strictEqual(confirmOkRes.status, 200, 'Contract confirmation with valid contractReference + memo must succeed');
  const confirmOkData = await confirmOkRes.json();
  assert.strictEqual(confirmOkData.status, 'confirmed');
  assert.strictEqual(confirmOkData.contractReference, 'KCC-RNT-20261112-8801');

  // Verify immutable audit log captured full trail (submission, denied/failed access, approved access, supplement, resubmission, confirm)
  const finalAuditRes = await fetch(`${BASE_URL}/api/admin/rental-applications/${receiptId}/audit`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const finalAudit = await finalAuditRes.json();
  assert(finalAudit.events.length >= 7, `Expected >= 7 audit events, got ${finalAudit.events.length}`);
  console.log(`✓ State machine, optimistic lock(409), contract proof(KCC-RNT-20261112-8801) & ${finalAudit.events.length} audit events verified`);

  // =========================================================================
  // 22. Forms & Consents Management (Create, Patch, Delete & Minimum Guard)
  // =========================================================================
  const getFormsRes = await fetch(`${BASE_URL}/api/settings/forms`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(getFormsRes.status, 200);
  const initialFormsData = await getFormsRes.json();
  const initialFormCount = initialFormsData.forms.length;
  assert(initialFormCount >= 1, 'Initial forms count must be >= 1');

  // Create new form
  const createFormRes = await fetch(`${BASE_URL}/api/settings/forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ name: '신규 전자동의서 테스트', text: '동의서 테스트 조항 본문입니다.' })
  });
  assert.strictEqual(createFormRes.status, 200);
  const createFormData = await createFormRes.json();
  const createdForm = createFormData.forms.find(f => f.name === '신규 전자동의서 테스트');
  assert(createdForm && createdForm.id, 'New form must be added and returned');

  // Patch form
  const patchFormRes = await fetch(`${BASE_URL}/api/settings/forms/${createdForm.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ text: '수정된 2차 개정 동의서 본문' })
  });
  assert.strictEqual(patchFormRes.status, 200);
  const patchFormData = await patchFormRes.json();
  assert.strictEqual(patchFormData.version, 2, 'Patched form must increment version to 2');

  // Delete form
  const deleteFormRes = await fetch(`${BASE_URL}/api/settings/forms/${createdForm.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(deleteFormRes.status, 200);
  const deleteFormData = await deleteFormRes.json();
  assert.strictEqual(deleteFormData.success, true);
  assert(!deleteFormData.forms.some(f => f.id === createdForm.id), 'Deleted form must no longer exist in forms list');
  console.log('✓ Forms & Consents management (Create, Version Patch, Delete) verified');

  // =========================================================================
  // 23. Restore Clean Seeded Workspace State
  // =========================================================================
  const finalResetRes = await fetch(`${BASE_URL}/api/settings/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ confirm: '초기화' })
  });
  assert.strictEqual(finalResetRes.status, 200);
  console.log('✓ Workspace DB & private vault restored to clean operational seed state');

  console.log('\n========================================');
  console.log(' ALL 23 ACCEPTANCE SUITES PASSED 100%! ');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
