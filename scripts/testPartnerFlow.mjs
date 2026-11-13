async function test() {
  const host = 'http://127.0.0.1:5173';
  
  // 1. Switch to admin
  const adminRes = await fetch(host + '/api/auth/switch-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin' })
  });
  const adminData = await adminRes.json();
  const token = adminData.token;
  console.log('Admin login success. Allowed menus:', adminData.user.allowed_menus);

  // 2. Fetch partners as admin
  const pRes = await fetch(host + '/api/partners', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const pData = await pRes.json();
  console.log('Partners list (count):', pData.partners.length);
  pData.partners.forEach(p => {
    console.log(' - [' + p.levelLabel + '] ' + p.name + ' (상위: ' + p.parentName + ', 하위수: ' + p.subPartnerCount + ')');
  });

  // 3. Register a new sub-partner under 한빛인테리어 (id: 2)
  const regRes = await fetch(host + '/api/partners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      name: '다온인테리어',
      person: '최다온',
      phone: '010-9999-8888',
      email: 'daon@example.com',
      type: '인테리어',
      parentId: 2,
      username: 'partner_daon',
      password: 'password123!'
    })
  });
  const regData = await regRes.json();
  console.log('New partner registered:', regData);

  // 4. Switch to partner_daon (newly created partner)
  const daonRes = await fetch(host + '/api/auth/switch-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'partner_daon' })
  });
  const daonUser = await daonRes.json();
  console.log('Daon user login:', daonUser.user.name, 'Role:', daonUser.user.role, 'Allowed menus:', daonUser.user.allowed_menus);

  // 5. Switch to partner_hanbit (parent of daon & rium)
  const hanbitRes = await fetch(host + '/api/auth/switch-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'partner_hanbit' })
  });
  const hanbitUser = await hanbitRes.json();
  console.log('Hanbit user login:', hanbitUser.user.name, 'Allowed menus (has sub partners):', hanbitUser.user.allowed_menus);

  // 6. As hanbit, check partners API
  const hanbitPartnersRes = await fetch(host + '/api/partners', {
    headers: { 'Authorization': 'Bearer ' + hanbitUser.token }
  });
  const hanbitPData = await hanbitPartnersRes.json();
  console.log('Hanbit subPartners count:', hanbitPData.subPartners.length);
  hanbitPData.subPartners.forEach(sp => {
    console.log('   * 하위 파트너: [' + sp.levelLabel + '] ' + sp.name + ' (' + sp.person + ')');
  });
}
test().catch(console.error);
