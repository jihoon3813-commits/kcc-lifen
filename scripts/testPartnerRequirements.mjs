async function runTest() {
  const host = 'http://127.0.0.1:5173';

  // 1. Switch to admin
  const adminRes = await fetch(host + '/api/auth/switch-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin' })
  });
  const adminData = await adminRes.json();
  const token = adminData.token;

  console.log('[Test 1] 필수값 누락 검증 (아이디, 비번, 연락처)');
  // 1-a. 아이디 누락
  const errRes1 = await fetch(host + '/api/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name: '테스트파트너1', person: '홍길동', phone: '010-1111-2222' })
  });
  console.log(' - 아이디 누락 결과 status:', errRes1.status, (await errRes1.json()).error);

  // 1-b. 비밀번호 누락
  const errRes2 = await fetch(host + '/api/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name: '테스트파트너2', person: '홍길동', phone: '010-1111-2222', username: 'partner_test2' })
  });
  console.log(' - 비밀번호 누락 결과 status:', errRes2.status, (await errRes2.json()).error);

  // 1-c. 연락처 누락
  const errRes3 = await fetch(host + '/api/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name: '테스트파트너3', person: '홍길동', username: 'partner_test3', password: 'test1234!' })
  });
  console.log(' - 연락처 누락 결과 status:', errRes3.status, (await errRes3.json()).error);

  // 1-d. 정상 등록 (아이디, 비번, 연락처 포함)
  const regRes = await fetch(host + '/api/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      name: '예다음인테리어',
      person: '강예다',
      phone: '010-7777-8888',
      email: 'yedaum@example.com',
      username: 'partner_yedaum',
      password: 'password777!',
      parentId: 2
    })
  });
  const regData = await regRes.json();
  console.log(' - 파트너 정상 등록 결과:', regData.message);

  console.log('\n[Test 2] 파트너 전용 서브도메인 아이디 매핑 확인');
  const landRes = await fetch(host + '/api/landing/info?partner=partner_yedaum');
  const landData = await landRes.json();
  console.log(' - 서브도메인(partner_yedaum) 랜딩 정보 매핑:', landData.partner?.name, landData.partner?.phone);

  console.log('\n[Test 3] 파트너 본인 정보 수정 (PATCH /api/auth/profile)');
  // 3-a. 로그인 as partner_yedaum
  const loginRes = await fetch(host + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'partner_yedaum', password: 'password777!' })
  });
  const partnerUser = await loginRes.json();
  console.log(' - 로그인 성공:', partnerUser.user?.name, partnerUser.user?.phone);

  // 3-b. 본인 정보 및 비밀번호 수정
  const updateRes = await fetch(host + '/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + partnerUser.token
    },
    body: JSON.stringify({
      name: '강예다(대표)',
      phone: '010-7777-9999',
      email: 'ceo@yedaum.com',
      orgName: '(주)예다음디자인',
      password: 'newpassword888!'
    })
  });
  const updateData = await updateRes.json();
  console.log(' - 프로필 수정 완료:', updateData.message, updateData.user.name, updateData.user.phone, updateData.user.org_name);

  // 3-c. 변경된 새 비밀번호로 로그인 검증
  const reLoginRes = await fetch(host + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'partner_yedaum', password: 'newpassword888!' })
  });
  console.log(' - 새 비밀번호 로그인 성공 여부 (status):', reLoginRes.status);
}

runTest().catch(console.error);
