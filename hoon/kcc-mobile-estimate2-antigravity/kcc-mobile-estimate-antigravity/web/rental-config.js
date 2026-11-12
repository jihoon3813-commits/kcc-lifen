/* 교체 지점: 실제 서비스는 인증된 견적 API의 값을 사용합니다. */
window.RentalConfig = {
  mode: 'demo', // live 전환은 승인 약관 + 서버 구현 후에만 가능합니다.
  endpoint: '',
  csrfToken: '',
  approvedTerms: false,
  quote: {id:'0870', version:'demo-2026-07-08', customerName:'주원', phone:'010-****-8355', location:'용인시 수지구 · 51평', product:'KCC 홈씨씨 창호 교체'},
  plans: {
    lowupfront:{title:'초기 부담을 줄이는 렌탈', upfront:500000, monthly:222000, months:60},
    lowmonthly:{title:'월 부담을 줄이는 렌탈', upfront:5500000, monthly:111000, months:60}
  },
  termsVersion:'draft-2026-11-11',
  terms:[
    {id:'collection',title:'개인(신용)정보 수집·이용 동의서',body:'[문구 확정 전 · 화면 구성 예시]\n렌탈 신청 처리 및 계약 심사를 위해 필요한 개인(신용)정보 수집·이용 내용을 안내하는 영역입니다.\n\n수집·이용 주체, 목적, 항목, 보유·이용 기간, 동의 거부 권리 및 거부에 따른 영향을 확정된 약관으로 교체해주세요.'},
    {id:'inquiry',title:'개인(신용)정보 조회 동의서',body:'[문구 확정 전 · 화면 구성 예시]\n렌탈 신청에 필요한 개인(신용)정보 조회 내용을 안내하는 영역입니다.\n\n조회 주체, 조회 기관, 목적, 항목, 조회 동의의 유효 기간 및 관련 안내를 확정된 약관으로 교체해주세요.'},
    {id:'provision',title:'개인(신용)정보 제공 동의서',body:'[문구 확정 전 · 화면 구성 예시]\n렌탈 신청 처리와 관련한 개인(신용)정보 제공 내용을 안내하는 영역입니다.\n\n제공받는 자, 목적, 항목, 보유·이용 기간, 동의 거부 권리 및 영향을 확정된 약관으로 교체해주세요.'}
  ]
};
