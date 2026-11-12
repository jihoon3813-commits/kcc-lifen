import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:5173';

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
  const adminToken = adminData.token;
  console.log('✓ Admin auth passed, user:', adminData.user.name, adminData.user.role);

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
    assert.strictEqual(c.partner, '한빛인테리어', 'Partner can only see their own customers!');
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
  assert.strictEqual(parseData.data.sale_price, 10000000, 'Sale price with 20% margin should be 10,000,000');
  assert.strictEqual(parseData.data.vat, 1000000, 'VAT should be 1,000,000');
  assert.strictEqual(parseData.data.total_price, 11000000, 'Total should be 11,000,000');
  console.log('✓ KCC estimate file parse & calculation verified: Cost 8M -> Total 11M (VAT incl.)');

  // 5. Quote Publishing & Immutable Versioning
  const pubQuoteRes = await fetch(`${BASE_URL}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      projectId: 3102,
      items: parseData.data.items,
      marginRate: 20.0,
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

  console.log('\n========================================');
  console.log(' ALL ACCEPTANCE TESTS PASSED 100%! ');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
