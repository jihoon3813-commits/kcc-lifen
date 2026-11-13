async function test() {
  const host = 'http://127.0.0.1:5173';

  // 1. Admin login
  const admRes = await fetch(host + '/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: 'admin', password: 'admin123!' })
  });
  const admData = await admRes.json();
  console.log('1. Admin login token obtained:', Boolean(admData.token));

  // Admin roster check
  const admRosterRes = await fetch(host + '/api/auth/roster', {
    headers: { 'Authorization': 'Bearer ' + admData.token }
  });
  const admRoster = await admRosterRes.json();
  console.log('2. Admin sees total users:', admRoster.users.length);

  // 2. Partner login
  const pRes = await fetch(host + '/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: 'partner_hanbit', password: 'partner123!' })
  });
  const pData = await pRes.json();
  console.log('3. Partner login token obtained:', Boolean(pData.token));

  // Partner roster check (should only see self)
  const pRosterRes = await fetch(host + '/api/auth/roster', {
    headers: { 'Authorization': 'Bearer ' + pData.token }
  });
  const pRoster = await pRosterRes.json();
  console.log('4. Partner sees users count (should be 1):', pRoster.users.length, 'Username:', pRoster.users[0]?.username);

  // 3. Partner tries switching to admin (should fail 403)
  const switchRes = await fetch(host + '/api/auth/switch-role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + pData.token
    },
    body: JSON.stringify({ username: 'admin' })
  });
  console.log('5. Partner unauthorized switch status (should be 403):', switchRes.status);
  const switchErr = await switchRes.json();
  console.log('   Error message:', switchErr.error);

  // 4. Check partners hierarchy API
  const partRes = await fetch(host + '/api/partners', {
    headers: { 'Authorization': 'Bearer ' + admData.token }
  });
  const partData = await partRes.json();
  console.log('6. Total partners count:', partData.partners.length);
  partData.partners.forEach(p => {
    console.log(`   - ${p.name} (${p.level}차 파트너) | 상위: ${p.parentName} | 하위: ${p.subPartnerCount}개사`);
  });
}
test().catch(console.error);
