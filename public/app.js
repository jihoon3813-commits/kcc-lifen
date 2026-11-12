const $=(s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={users:'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',contract:'M9 3H5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 2h6v4H9zM8 12l2 2 5-5M8 18h8',box:'M12 3 3 8l9 5 9-5-9-5zM3 8v10l9 5 9-5V8M12 13v10M7 5.8l9 5',building:'M3 21h18M5 21V3h14v18M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3',chart:'M3 3v18h18M7 14v3M12 9v8M17 5v12',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 2-2 1-2-1-2 4 2 2v2l-2 2 2 4 2-1 2 1 1 2h5l1-2 2-1 2 1 2-4-2-2v-2l2-2-2-4-2 1-2-1-1-2z',search:'m21 21-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',calendar:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',filter:'M4 5h16M7 12h10M10 19h4',refresh:'M20 7V3l-3 3a8 8 0 1 0 3 10M20 3h-5',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',link:'m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',external:'M15 3h6v6M10 14 21 3M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',check:'m5 12 4 4L19 6',close:'M6 6l12 12M18 6 6 18',send:'m22 2-7 20-4-9-9-4 20-7zM22 2 11 13',history:'M3 11a9 9 0 1 1 2.6 6.4M3 4v7h7M12 7v5l3 2',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',phone:'M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2',copy:'M8 8h12v13H8zM16 8V3H3v13h5',shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4zM8 12l3 3 5-6',credit:'M3 5h18v14H3zM3 9h18M7 15h3',home:'m3 10 9-8 9 8M5 8v13h14V8M10 21v-7h4v7',window:'M3 3h18v18H3zM12 3v18M3 12h18M9 9v6M15 9v6',kitchen:'M2 11h20v10H2zM10 11v10M2 15h8M14 15h4M4 3v8M4 3h5v4M13 4h7v4h-7z',bath:'M3 12h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-4zM5 12V5a3 3 0 0 1 6 0M5 20v2M19 20v2M9 5h4',arrow:'M4 12h16m-6-6 6 6-6 6',more:'M5 12h.01M12 12h.01M19 12h.01',info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',edit:'m16 3 5 5-12 12-6 1 1-6L16 3zM13 6l5 5',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',menu:'M4 6h16M4 12h16M4 18h16',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'};
const icon=(name,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;
const parseNum=v=>Number(String(v??'').replace(/[^\d.-]/g,''))||0;
const num=n=>parseNum(n).toLocaleString('ko-KR'), won=n=>num(n)+'원';
function formatMoneyInput(el){const sel=el.selectionStart??el.value.length,digitsAfter=el.value.slice(sel).replace(/\D/g,'').length,raw=el.value.replace(/\D/g,''),formatted=raw?Number(raw).toLocaleString('ko-KR'):'';el.value=formatted;if(document.activeElement===el){let pos=formatted.length,rem=digitsAfter;while(pos>0&&rem>0){pos--;if(/\d/.test(formatted[pos]))rem--}if(pos>0&&formatted[pos-1]===',')pos--;try{el.setSelectionRange(pos,pos)}catch{}}}
const now=()=>new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'});
const initial=()=>({customers:[
{id:3101,name:'김서연',phone:'010-0000-1001',address:'경기 하남시 미사강변 · 34평',product:'창호',status:'신규접수',label:'일반',source:'네이버 검색광고',partner:'직영',owner:'미배정',date:'2026-11-12',note:'거실과 안방 창호 교체 상담을 신청했습니다.',feedback:'상담 후 공사 범위를 확인해 주세요.',measure:'',build:'',quote:0,viewed:false},
{id:3102,name:'이준호',phone:'010-0000-1002',address:'경기 파주시 운정신도시 · 32평',product:'창호',status:'가견적요청',label:'긴급',source:'네이버 검색광고',partner:'직영',owner:'오영진',date:'2026-11-12',note:'전체 창호 교체 희망. 12월 초 입주 전 공사 요청.',feedback:'평면도 수령 완료, 영업지원팀 견적 산출 중입니다.',measure:'',build:'2026-12-03',quote:0,viewed:false},
{id:3103,name:'박지민',phone:'010-0000-1003',address:'서울 송파구 문정동 · 28평',product:'주방',status:'견적안내',label:'일반',source:'파트너 전용링크',partner:'한빛인테리어',owner:'김정연',date:'2026-11-11',note:'ㄷ자 주방, 상판 및 수납장 교체 견적 안내했습니다.',feedback:'가견적 2안 비교 후 상담 예정입니다.',measure:'',build:'',quote:6600000,viewed:false},
{id:3104,name:'최유진',phone:'010-0000-1004',address:'경기 성남시 분당구 · 38평',product:'창호',status:'실측예정',label:'체크',source:'인스타그램',partner:'직영',owner:'오영진',date:'2026-11-11',note:'11/12 오후 2시 방문 실측 확정. 경비실 호출 필요.',feedback:'실측팀 배정 완료 · 이현우 기사',measure:'2026-11-12',build:'2026-12-01',quote:12650000,viewed:true},
{id:3105,name:'정민수',phone:'010-0000-1005',address:'서울 강동구 고덕동 · 24평',product:'욕실',status:'상담중',label:'일반',source:'직접등록',partner:'리움디자인',owner:'마지희',date:'2026-11-11',note:'욕실 2개 전체 리모델링. 주말에 현장 사진 전달 예정.',feedback:'도기 및 수전 브랜드 확인이 필요합니다.',measure:'',build:'',quote:0,viewed:false},
{id:3106,name:'한지우',phone:'010-0000-1006',address:'경기 고양시 일산동구 · 33평',product:'창호',status:'계약진행',label:'일반',source:'카카오 광고',partner:'직영',owner:'김정연',date:'2026-11-10',note:'최종견적 확인 완료. 렌탈 60개월로 신청 접수.',feedback:'렌탈 서류 확인 후 심사 요청 예정입니다.',measure:'2026-11-09',build:'2026-11-25',quote:13200000,viewed:true},
{id:3107,name:'윤도현',phone:'010-0000-1007',address:'서울 마포구 상암동 · 30평',product:'창호',status:'계약진행',label:'체크',source:'파트너 전용링크',partner:'한빛인테리어',owner:'오영진',date:'2026-11-10',note:'선금 30% 입금 확인. 잔금은 시공 완료 후 수납.',feedback:'11/20 시공 일정 확정되었습니다.',measure:'2026-11-08',build:'2026-11-20',quote:11000000,viewed:true},
{id:3108,name:'김하린',phone:'010-0000-1008',address:'경기 남양주시 다산동 · 25평',product:'주방',status:'가견적요청',label:'일반',source:'네이버 블로그',partner:'리움디자인',owner:'마지희',date:'2026-11-10',note:'아일랜드 확장과 수납장 교체 2가지 안으로 요청.',feedback:'고객 전달 규격 확인 완료.',measure:'',build:'',quote:0,viewed:false},
{id:3109,name:'이수아',phone:'010-0000-1009',address:'경기 수원시 영통구 · 36평',product:'창호',status:'견적안내',label:'일반',source:'네이버 검색광고',partner:'직영',owner:'김정연',date:'2026-11-09',note:'전체 교체 견적 전달. 가족과 상의 후 실측 신청 예정.',feedback:'내관도와 제품 사양을 함께 안내했습니다.',measure:'',build:'',quote:14850000,viewed:true},
{id:3110,name:'서민재',phone:'010-0000-1010',address:'서울 노원구 중계동 · 27평',product:'욕실',status:'시공완료',label:'완료',source:'직접등록',partner:'직영',owner:'마지희',date:'2026-11-06',note:'시공 완료 및 고객 검수 확인. 잔금 수납 완료.',feedback:'공사 완료 사진 4장이 등록되었습니다.',measure:'2026-11-02',build:'2026-11-10',quote:5500000,viewed:true}
],partners:[{id:'P001',name:'한빛인테리어',person:'이현우',email:'hanbit@example.com',type:'인테리어',active:true},{id:'P002',name:'리움디자인',person:'박수진',email:'rium@example.com',type:'영업대행',active:true},{id:'P003',name:'온유하우스',person:'정지훈',email:'onyou@example.com',type:'인테리어',active:false}],users:[{name:'김지훈',role:'최고관리자',org:'라이프앤조이',email:'admin@example.com',active:true},{name:'오영진',role:'상담사',org:'라이프앤조이',email:'youngjin@example.com',active:true},{name:'김정연',role:'상담사',org:'라이프앤조이',email:'jeongyeon@example.com',active:true},{name:'마지희',role:'상담사',org:'라이프앤조이',email:'jihee@example.com',active:true}],labels:[{name:'일반',color:'#7194dd'},{name:'긴급',color:'#e88485'},{name:'체크',color:'#c39b56'},{name:'완료',color:'#74b6a1'}],notes:{3102:[{date:'11.12 11:10',by:'오영진',text:'전체 창호 교체 희망. 12월 초 입주 전 공사 요청. 가족과 상의 후 실측 일정을 잡기로 했습니다.',type:'notes',important:true},{date:'11.12 10:35',by:'오영진',text:'32평 아파트 전체 창호와 거실 발코니 확장부 확인. 단열 성능과 외부 소음 차단을 우선으로 안내했습니다.',type:'notes'},{date:'11.12 10:05',by:'오영진',text:'평면도 수령 완료. 거실과 침실별 규격을 정리하여 가견적 산출을 요청했습니다.',type:'notes'},{date:'11.12 09:45',by:'오영진',text:'첫 상담 완료. 통화 가능 시간은 오후 1시 이후이며, 견적서는 모바일로 확인하기를 희망합니다.',type:'notes'}],3104:[{date:'11.11 16:40',by:'오영진',text:'11/12 오후 2시 방문 실측 확정. 경비실 호출 필요. 고객에게 방문 담당자와 연락 방법을 안내했습니다.',type:'notes',important:true},{date:'11.11 14:20',by:'오영진',text:'고객이 가견적서를 확인했습니다. 실측 후 공사 범위와 최종 금액을 확정하기로 했습니다.',type:'notes'},{date:'11.11 10:10',by:'오영진',text:'전체 창호 교체 상담. 공사 일정은 12월 1일을 희망하며 거주 중 시공이 가능한지 문의했습니다.',type:'notes'}]},history:{3102:[{date:'11.12 10:35',by:'오영진',text:'공사 희망사항 추가 · 단열 및 방음 우선'},{date:'11.12 10:10',by:'오영진',text:'진행구분 변경 · 상담중 → 가견적요청'},{date:'11.12 10:05',by:'오영진',text:'평면도 수령 및 영업지원팀 전달'},{date:'11.12 09:45',by:'오영진',text:'진행라벨 변경 · 일반 → 긴급'}]},quotes:[],applications:[{id:'R-261112-001',cid:3106,plan:'60개월',monthly:264000,status:'서류검토',date:'2026-11-12'}],contracts:[{id:'C-261112-001',cid:3106,type:'렌탈',amount:13200000,paid:0,status:'약정대기'},{id:'C-261110-002',cid:3107,type:'일시불',amount:11000000,paid:3300000,status:'선금완료'},{id:'C-261106-003',cid:3110,type:'일시불',amount:5500000,paid:5500000,status:'수납완료'}],products:[{name:'KCC 홈씨씨 창호',category:'창호',desc:'우리 집에 맞는 창호 교체, 상담부터 시공까지.',url:'https://kcchomecc-partner.com/products/rental',icon:'window',color:'#edf3f9',views:1248,active:true},{name:'KCC 홈씨씨 키친',category:'주방',desc:'생활의 중심이 되는 주방, 맞춤 리모델링 상담.',url:'',icon:'kitchen',color:'#f4f1ec',views:682,active:true},{name:'KCC 홈씨씨 욕실',category:'욕실',desc:'매일의 편안함을 만드는 욕실 리모델링.',url:'',icon:'bath',color:'#edf4f1',views:391,active:false}],forms:[{name:'렌탈 개인정보 수집·이용 동의서',version:1,text:'[검토용 예시 양식]\n목적: 렌탈 신청 접수 및 상담\n수집 항목: 이름, 연락처, 신청 정보\n보유기간: 실제 운영 정책 확정 후 기재\n제공받는 자와 처리위탁 등은 렌탈사별 계약에 따라 확정합니다.\n본 양식은 실제 고객 접수용으로 사용할 수 없습니다.'},{name:'상담 신청 개인정보 동의서',version:1,text:'[검토용 예시 양식]\n상품 상담을 위한 이름과 연락처 수집·이용 동의입니다.\n실제 운영 전 수집 목적, 항목, 보유기간, 동의 거부 권리를 확정합니다.'},{name:'시공 계약서',version:1,text:'[검토용 예시 양식]\n계약 당사자, 공사 범위, 총 금액, 시공 일정, 대금 지급 일정과 변경·해지 조건을 기재합니다.'}]});
let db;try{db=JSON.parse(localStorage.getItem('homecc_crm_v3_demo'))||initial()}catch{db=initial()}

let authToken = localStorage.getItem('kcc_auth_token') || '';
let previewViewMode = 'quote';
let previewDeviceWidth = 'mobile';
let previewQuoteType = '가견적';
let previewQuoteId = null;
let activeDraftPreview = null;
let sendState = null;
let mobileNavOpen = false;

function setMobileNav(open) {
  mobileNavOpen = Boolean(open);
  document.body.classList.toggle('nav-open', mobileNavOpen);
  const sb = $('.sidebar');
  const bd = $('.sidebar-backdrop');
  if (sb) sb.classList.toggle('open', mobileNavOpen);
  if (bd) bd.classList.toggle('open', mobileNavOpen);
  $$('[data-action="toggle-nav"]').forEach(b => {
    b.classList.toggle('active-open', mobileNavOpen);
    b.setAttribute('aria-expanded', String(mobileNavOpen));
  });
  if (!$('.overlay')) {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
  }
}

async function apiFetch(url, options = {}) {
  const { _retried, ...fetchOpts } = options;
  const headers = { ...fetchOpts.headers };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  let body = fetchOpts.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(url, { ...fetchOpts, headers, body });
  if (res.status === 401 && !_retried) {
    await apiSwitchRole(typeof role !== 'undefined' ? role : '본사 관리자');
    return apiFetch(url, { ...options, _retried: true });
  }
  return res;
}

async function apiSwitchRole(roleName) {
  try {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleName })
    });
    if (res.ok) {
      const data = await res.json();
      authToken = data.token;
      localStorage.setItem('kcc_auth_token', authToken);
    }
  } catch (err) {
    console.error('Role switch failed:', err);
  }
}

async function syncFromServer() {
  try {
    if (!authToken) {
      await apiSwitchRole(role);
    }
    const [cRes, pRes, kRes, aRes, prRes, lRes, uRes, fRes] = await Promise.all([
      apiFetch('/api/customers'),
      apiFetch('/api/partners'),
      apiFetch('/api/contracts'),
      apiFetch('/api/rentals'),
      apiFetch('/api/products'),
      apiFetch('/api/settings/labels'),
      apiFetch('/api/auth/users'),
      apiFetch('/api/settings/forms')
    ]);

    if (cRes.ok) {
      const data = await cRes.json();
      db.customers = data.customers;
    }
    if (pRes.ok) {
      const data = await pRes.json();
      db.partners = data.partners;
    }
    if (kRes.ok) {
      const data = await kRes.json();
      db.contracts = data.contracts;
    }
    if (aRes.ok) {
      const data = await aRes.json();
      db.applications = data.applications;
    }
    if (prRes.ok) {
      const data = await prRes.json();
      db.products = data.products;
    }
    if (lRes.ok) {
      const data = await lRes.json();
      db.labels = data.labels;
    }
    if (uRes.ok) {
      const data = await uRes.json();
      db.users = data.users;
    }
    if (fRes.ok) {
      const data = await fRes.json();
      db.forms = data.forms;
    }
    render();
  } catch (err) {
    console.warn('API sync warning:', err);
  }
}

function buildDraftMobileQuote(c, ed, totals) {
  const cashPrice = Number(totals.total) || 0;
  const discountAmount = Math.max(0, parseNum(ed.discount || 0));
  const originalPrice = cashPrice + discountAmount;
  const splitDeposit = Math.round(cashPrice / 2);
  const splitBalance = cashPrice - splitDeposit;

  const upfrontA = cashPrice >= 1500000 ? 500000 : Math.floor((cashPrice * 0.1) / 100000) * 100000;
  const monthlyA = Math.max(1000, Math.round(((cashPrice - upfrontA) * 0.0222) / 1000) * 1000);
  let upfrontB = Math.round((cashPrice * 0.52381) / 500000) * 500000;
  if (upfrontB <= upfrontA || upfrontB >= cashPrice) upfrontB = Math.round((cashPrice * 0.5) / 100000) * 100000;
  const monthlyB = Math.max(1000, Math.round(((cashPrice - upfrontB) * 0.0222) / 1000) * 1000);

  const marginRatio = (Number(ed.margin) || 0) / 100;
  const items = (ed.items || []).map((it, idx) => {
    const qty = parseNum(it.qty) || 1;
    const costUnit = parseNum(it.price) || 0;
    const saleUnit = marginRatio < 1 ? Math.round(costUnit / (1 - marginRatio)) : costUnit;
    const saleTotal = saleUnit * qty;
    const baseSale = Number(totals.sale) || 1;
    const amountVatInc = Math.round((saleTotal / baseSale) * originalPrice);
    const isExtra = it.category === 'extra' || (/(철거|사다리|양중|보양|몰딩|마감|기타견적)/.test(it.name || '') && !/(창호|이중창|발코니|분합)/.test(it.name || ''));
    return {
      sort_order: idx + 1,
      name: it.name || '품목',
      spec: it.spec || '맞춤 규격',
      category: isExtra ? 'extra' : 'window',
      detail: it.detail || {
        type: isExtra ? '부대 작업' : (c.product + ' 맞춤 사양'),
        size: it.spec || '현장 실측 규격',
        shape: qty + '식',
        model: 'KCC HOMECC 정품',
        glass: '로이 복층유리',
        handle: '표준 핸들',
        mesh: '현장 기준',
        panes: 2,
        upgrade: false
      },
      quantity: qty,
      sale_unit_price: saleUnit,
      sale_total: saleTotal,
      amount_vat_inc: amountVatInc
    };
  });

  const maskedPhone = String(c.phone || '').replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');

  return {
    id: 0,
    project_id: c.id,
    quote_no: String(c.id).padStart(4, '0'),
    version: 1,
    title: ed.title || (c.product + ' 교체 제안'),
    quote_type: ed.type || '가견적',
    customer_name: c.name,
    customer_phone: maskedPhone,
    customer_address: c.address,
    product: c.product || '창호',
    sale_price: totals.sale,
    vat: totals.vat,
    total_price: cashPrice,
    discount_amount: discountAmount,
    original_price: originalPrice,
    split_deposit: splitDeposit,
    split_balance: splitBalance,
    plans: {
      cash: {
        key: 'cash',
        mainLabel: discountAmount > 0 ? '할인 적용 금액' : '일시불 예상 금액',
        mainAmount: cashPrice,
        deposit: splitDeposit,
        balance: splitBalance,
        total: cashPrice,
        name: discountAmount > 0 ? '일시불 할인 결제' : '일시불 결제',
        detail: '총 ' + num(cashPrice) + '원 · 선금 50% / 잔금 50%',
        button: '일시불 결제 상담하기'
      },
      lowupfront: {
        key: 'lowupfront',
        mainLabel: '월 납부금액',
        mainAmount: monthlyA,
        upfront: upfrontA,
        months: 60,
        total: upfrontA + monthlyA * 60,
        name: '초기 부담을 줄이는 렌탈',
        detail: '초기 ' + num(upfrontA) + '원 + 월 ' + num(monthlyA) + '원 × 60개월',
        button: '초기 부담 완화 조건 상담하기'
      },
      lowmonthly: {
        key: 'lowmonthly',
        mainLabel: '월 납부금액',
        mainAmount: monthlyB,
        upfront: upfrontB,
        months: 60,
        total: upfrontB + monthlyB * 60,
        name: '월 부담을 줄이는 렌탈',
        detail: '초기 ' + num(upfrontB) + '원 + 월 ' + num(monthlyB) + '원 × 60개월',
        button: '월 부담 완화 조건 상담하기'
      }
    },
    manager_name: c.owner && c.owner !== '미배정' ? c.owner : '전담 상담사',
    manager_phone: '1588-0000',
    partner_name: c.partner === '직영' ? '(주)라이프앤조이' : c.partner,
    published_at: new Date().toISOString().slice(0, 10),
    items
  };
}

function makeSendTemplate(tplKey, cName, product, quoteType, totalPrice, quoteUrl) {
  const priceStr = num(totalPrice) + '원';
  if (tplKey === 'measure') {
    return '[KCC홈씨씨] ' + cName + ' 고객님, 요청하신 ' + product + ' 가견적서와 방문실측 안내드립니다.\n\n' +
      '■ 견적 구분: ' + quoteType + '\n' +
      '■ 예상 견적가: ' + priceStr + ' (부가세 포함)\n\n' +
      '▼ 모바일 견적서 및 결제조건 확인하기\n' + quoteUrl + '\n\n' +
      '※ 본인 확인을 위해 성함(' + cName + ')과 휴대폰 번호로 로그인해 주세요.\n' +
      '견적서 내 [상담 요청하기]로 희망 실측 일정을 남겨주시면 빠르게 안내드리겠습니다.';
  }
  if (tplKey === 'final') {
    return '[KCC홈씨씨] ' + cName + ' 고객님, 현장 실측이 반영된 최종 모바일 견적서가 발행되었습니다.\n\n' +
      '■ 견적 구분: 최종견적\n' +
      '■ 확정 견적가: ' + priceStr + ' (일시불·구독·60개월 렌탈 비교 가능)\n\n' +
      '▼ 내 모바일 견적서 확인하기\n' + quoteUrl + '\n\n' +
      '※ 고객님 성함(' + cName + ')과 휴대폰 번호 입력 후 상세 창호 사양을 확인하실 수 있습니다.';
  }
  return '[KCC홈씨씨] ' + cName + ' 고객님, 우리 집 맞춤 ' + product + ' 모바일 견적서가 도착했습니다.\n\n' +
    '■ 견적 구분: ' + quoteType + '\n' +
    '■ 예상 금액: ' + priceStr + ' (부가세 포함)\n' +
    '■ 결제 비교: 일시불 · 스마트 구독 · 60개월 렌탈\n\n' +
    '▼ 나의 모바일 견적서 바로가기\n' + quoteUrl + '\n\n' +
    '※ 열람 시 고객님 본인 성함(' + cName + ')과 휴대폰 번호로 로그인해 주세요.';
}

function quoteSideRow(label, qType, qMeta, url, editAction, id, hasAnyQuote) {
  if (qMeta || hasAnyQuote) {
    return '<div style="display:flex;gap:5px">' +
      '<button class="btn soft sm" type="button" data-action="preview" data-id="' + id + '" data-type="' + qType + '" style="flex:1">' +
        icon('eye') + label + ' 미리보기' + (qMeta ? '' : ' (예시)') +
      '</button>' +
      (url ? '<a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" title="' + label + ' 새창 열기" style="padding:6px 8px">' + icon('external') + '</a>' : '') +
      '<button class="btn sm" type="button" data-action="' + editAction + '" data-id="' + id + '" title="' + label + ' 링크 관리" style="padding:6px 8px">' + icon('edit') + '</button>' +
    '</div>';
  }
  return url
    ? '<div style="display:flex;gap:6px"><a class="btn soft sm" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" style="flex:1">' + icon('external') + label + ' 바로가기</a><button class="btn sm" type="button" data-action="' + editAction + '" data-id="' + id + '" style="padding:6px 9px">' + icon('edit') + '</button></div>'
    : btn(label + ' 링크 등록', editAction, 'link', 'sm block', 'data-id="' + id + '"');
}

function buildPreviewBannerHtml(c, qDraft, selectedType) {
  if (qDraft) {
    return '<div id="preview-type-banner" class="preview-type-banner">' +
      '<span><b>● [' + esc(selectedType) + ' · 작성 초안 미리보기]</b> 현재 입력된 금액(' + won(qDraft.total || 0) + ')으로 렌더링된 화면입니다.</span>' +
      badge('발행 전 초안', 'orange') +
    '</div>';
  }
  const targetMeta = selectedType === '최종견적' ? c.finalQuote : c.roughQuote;
  if (targetMeta) {
    return '<div id="preview-type-banner" class="preview-type-banner">' +
      '<span><b>● [' + esc(selectedType) + ' v' + targetMeta.version + ' · 정식 발행본]</b> 총 <b>' + won(targetMeta.totalPrice) + '</b> · 발행일 ' + esc(targetMeta.date || '-') + (targetMeta.viewed ? ' · 고객 열람완료' : ' · 고객 미열람') + '</span>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        badge('정식 발행본', selectedType === '최종견적' ? 'green' : '') +
      '</div>' +
    '</div>';
  }
  return '<div id="preview-type-banner" class="preview-type-banner is-sim">' +
    '<span><b>○ [' + esc(selectedType) + ' · 화면 예시 미리보기]</b> 아직 정식 ' + esc(selectedType) + '이 발행되지 않아 기존 견적 데이터를 기준으로 ' + esc(selectedType) + ' 화면 구성을 미리 보여드립니다.</span>' +
    (role === '본사 관리자' ? '<button type="button" class="btn sm primary" data-action="new-quote" data-id="' + c.id + '" data-type="' + esc(selectedType) + '">' + icon('plus') + esc(selectedType) + ' 바로 작성</button>' : '') +
  '</div>';
}

function renderSendRightPreview() {
  const box = $('#send-right-stage');
  if (!box || !sendState) return;

  if (sendState.previewTab === 'rough' || sendState.previewTab === 'final' || sendState.previewTab === 'quote' || sendState.previewTab === 'login') {
    const viewParam = sendState.previewTab === 'login' ? 'login' : 'quote';
    const typeParam = sendState.previewTab === 'final' ? '최종견적' : (sendState.previewTab === 'rough' ? '가견적' : (sendState.quoteType || '가견적'));
    const targetMeta = typeParam === '최종견적' ? sendState.finalQuote : sendState.roughQuote;
    const subNote = viewParam === 'login'
      ? '고객 본인 이름 + 휴대폰 번호 입력 화면'
      : (targetMeta ? (typeParam + ' 정식 발행본 (v' + targetMeta.version + ' · ' + won(targetMeta.totalPrice) + ')') : (typeParam + ' 화면 예시 미리보기 (미발행)'));
    box.innerHTML = '<div style="text-align:center;font-size:11px;color:#52637a;margin-bottom:6px;font-weight:600">' + esc(subNote) + '</div>' +
      '<div style="display:flex;justify-content:center"><div class="mobile-iframe-frame" style="width:100%;max-width:368px;height:min(600px,66dvh);min-height:430px;border-width:5px"><iframe title="고객 모바일 견적서 미리보기" src="/quote.html?preview=1&embed=1&projectId=' + sendState.cid + '&type=' + encodeURIComponent(typeParam) + '&view=' + viewParam + '"></iframe></div></div>';
    return;
  }

  const msgText = esc(sendState.message || '');
  const quoteLink = esc(sendState.quoteUrl || '');
  if (sendState.channel === 'kakao') {
    box.innerHTML = '<div class="kakao-room">' +
      '<div class="kakao-date-chip"><span>카카오 알림톡 발송 화면 미리보기 · ' + esc(sendState.quoteType) + '</span></div>' +
      '<div class="kakao-msg-row">' +
        '<div class="kakao-avatar">KCC</div>' +
        '<div class="kakao-bubble-col">' +
          '<div class="kakao-sender">KCC홈씨씨 파트너 · 라이프앤조이</div>' +
          '<div class="kakao-card">' +
            '<div class="kakao-card-top"><b>알림톡 도착 (' + esc(sendState.quoteType) + ')</b><span>kakao</span></div>' +
            '<div class="kakao-card-body"><pre id="live-msg-preview">' + msgText + '</pre></div>' +
            '<a class="kakao-card-btn" href="' + quoteLink + '" target="_blank" rel="noopener noreferrer">나의 모바일 ' + esc(sendState.quoteType) + ' 확인하기 ↗</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  } else {
    box.innerHTML = '<div class="sms-room">' +
      '<div class="sms-room-head"><b>문자 메시지 (LMS) 미리보기 · ' + esc(sendState.quoteType) + '</b><small>수신: ' + esc(sendState.recipientName) + ' (' + esc(sendState.recipientPhone) + ')</small></div>' +
      '<div class="sms-room-body">' +
        '<div class="sms-bubble"><pre id="live-msg-preview">[Web발신]\n' + msgText + '</pre></div>' +
        '<div style="margin-top:12px;text-align:right"><a class="btn sm soft" href="' + quoteLink + '" target="_blank" rel="noopener noreferrer">' + icon('external') + '고객 로그인 화면 직접 열어보기</a></div>' +
      '</div>' +
    '</div>';
  }
}

async function openSendQuote(id, preferredType = '') {
  const c = accessibleC(id);
  if (!c) return;
  if (!c.quote) {
    toast('발행된 견적이 없습니다. 먼저 견적서를 작성·발행해 주세요.');
    return;
  }

  let previewData = null;
  try {
    const qs = preferredType ? ('?type=' + encodeURIComponent(preferredType)) : '';
    const res = await apiFetch('/api/quotes/by-project/' + c.id + '/preview' + qs);
    if (res.ok) previewData = await res.json();
  } catch {}

  const roughQuote = previewData?.rough_quote || (c.roughQuote ? { id: c.roughQuote.id, version: c.roughQuote.version, quote_type: '가견적', total_price: c.roughQuote.totalPrice, access_token: c.roughQuote.token } : null);
  const finalQuote = previewData?.final_quote || (c.finalQuote ? { id: c.finalQuote.id, version: c.finalQuote.version, quote_type: '최종견적', total_price: c.finalQuote.totalPrice, access_token: c.finalQuote.token } : null);

  let chosenMeta = null;
  if (preferredType === '최종견적' && finalQuote) chosenMeta = finalQuote;
  else if (preferredType === '가견적' && roughQuote) chosenMeta = roughQuote;
  else chosenMeta = finalQuote || roughQuote;

  const qType = chosenMeta?.quote_type || previewData?.quote?.quote_type || c.quoteType || '가견적';
  const token = chosenMeta?.access_token || previewData?.access_token || c.token || ('tok_' + c.id + '_demo');
  const quoteUrl = location.origin + '/quote.html?token=' + encodeURIComponent(token);
  const totalPrice = chosenMeta?.total_price || previewData?.quote?.total_price || c.quote;
  const rawPhone = previewData?.customer_phone_raw || c.phone || '';
  const dispatches = previewData?.dispatches || [];
  const isLiveApi = Boolean(previewData?.messaging_live);
  const defaultTpl = qType === '최종견적' ? 'final' : 'basic';

  sendState = {
    cid: c.id,
    channel: 'kakao',
    tpl: defaultTpl,
    previewTab: 'message',
    recipientName: c.name,
    recipientPhone: rawPhone,
    quoteId: chosenMeta?.id || null,
    quoteType: qType,
    totalPrice,
    product: c.product || '창호',
    quoteUrl,
    roughQuote,
    finalQuote,
    dispatches,
    isLiveApi,
    message: makeSendTemplate(defaultTpl, c.name, c.product || '창호', qType, totalPrice, quoteUrl)
  };

  renderSendDialog();
}

function renderSendDialog() {
  if (!sendState) return;
  const s = sendState;
  const smsHref = 'sms:' + encodeURIComponent(s.recipientPhone.replace(/[^\d+]/g, '')) + '?body=' + encodeURIComponent(s.message);

  const logsHtml = s.dispatches.length
    ? s.dispatches.slice(0, 5).map(d =>
        '<div class="dispatch-log-item">' +
          badge(d.channel === 'kakao' ? '알림톡' : '문자', d.channel === 'kakao' ? 'orange' : '') +
          '<div class="grow"><b>' + esc(d.recipient_name) + ' (' + esc(d.recipient_phone) + ')</b><small style="display:block;color:#8a97ab">' + esc(d.sent_at) + ' · 발송자 ' + esc(d.sent_by) + '</small></div>' +
          badge(d.provider === 'simulation' ? '발송기록됨' : '전송완료', 'green') +
        '</div>'
      ).join('')
    : '<div class="notice-text">아직 발송한 내역이 없습니다. 위에서 채널을 선택해 첫 견적 안내를 발송해보세요.</div>';

  const roughCardHtml = '<button type="button" class="quote-type-card rough ' + (s.quoteType === '가견적' ? 'active' : '') + '" data-action="switch-send-quote-type" data-value="가견적">' +
    '<div class="qt-top"><b>가견적 (실측 전)</b>' + (s.roughQuote ? badge('v' + s.roughQuote.version + ' 발행됨', 'orange') : badge('미발행', 'gray')) + '</div>' +
    '<strong>' + (s.roughQuote ? won(s.roughQuote.total_price) : '발행 전 · 예시 미리보기') + '</strong>' +
    '<small>' + (s.roughQuote ? '클릭 시 가견적 링크·문구로 전환' : '클릭 시 우측에 가견적 예시 화면 표시') + '</small>' +
  '</button>';

  const finalCardHtml = '<button type="button" class="quote-type-card final ' + (s.quoteType === '최종견적' ? 'active' : '') + '" data-action="switch-send-quote-type" data-value="최종견적">' +
    '<div class="qt-top"><b>최종견적 (실측 확정)</b>' + (s.finalQuote ? badge('v' + s.finalQuote.version + ' 발행됨', 'green') : badge('미발행', 'gray')) + '</div>' +
    '<strong>' + (s.finalQuote ? won(s.finalQuote.total_price) : '발행 전 · 예시 미리보기') + '</strong>' +
    '<small>' + (s.finalQuote ? '클릭 시 최종견적 링크·문구로 전환' : '클릭 시 우측에 최종견적 예시 화면 표시') + '</small>' +
  '</button>';

  const body = '<div class="dialog-body"><div class="send-layout">' +
    '<section>' +
      '<div class="field"><label>1. 발송할 견적 구분 선택 (가견적 / 최종견적)</label>' +
        '<div class="quote-type-cards">' + roughCardHtml + finalCardHtml + '</div>' +
      '</div>' +
      '<div class="field"><label>2. 발송 수단 선택</label>' +
        '<div class="channel-cards">' +
          '<button type="button" class="channel-card kakao ' + (s.channel === 'kakao' ? 'active' : '') + '" data-action="switch-send-ch" data-value="kakao">' +
            '<span class="ch-badge kakao">TALK</span><div><b>카카오 알림톡 · 카톡</b><small>버튼형 모바일 견적 링크 발송</small></div>' +
          '</button>' +
          '<button type="button" class="channel-card sms ' + (s.channel === 'sms' ? 'active' : '') + '" data-action="switch-send-ch" data-value="sms">' +
            '<span class="ch-badge sms">LMS</span><div><b>문자 메시지 (LMS)</b><small>장문 안내 문자 및 전용 링크 발송</small></div>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="field-grid">' +
        '<div class="field"><label>고객 성함 (로그인 본인확인 기준)</label><input class="input" id="send-name" value="' + esc(s.recipientName) + '" readonly style="background:#f6f8fb"></div>' +
        '<div class="field"><label>수신 휴대폰 번호 <span>*</span></label><input class="input" id="send-phone" type="tel" value="' + esc(s.recipientPhone) + '" placeholder="010-0000-0000"></div>' +
      '</div>' +
      '<div class="field"><label>3. 안내 문구 템플릿 및 내용 편집</label>' +
        '<div class="tpl-chips">' +
          [['basic', '기본 견적 안내'], ['measure', '가견적 · 방문실측 안내'], ['final', '최종견적 확정 안내']].map(([k, l]) =>
            '<button type="button" class="tpl-chip ' + (s.tpl === k ? 'active' : '') + '" data-action="apply-send-tpl" data-value="' + k + '">' + l + '</button>'
          ).join('') +
        '</div>' +
        '<textarea class="input" id="send-message" style="min-height:165px;line-height:1.65;font-size:12px">' + esc(s.message) + '</textarea>' +
        '<p class="field-hint">고객은 링크 접속 후 <b>본인 이름(' + esc(s.recipientName) + ') + 휴대폰 번호</b>로 로그인해야 견적서를 볼 수 있습니다.</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">' +
        '<button type="button" class="btn ' + (s.channel === 'kakao' ? 'kakao-btn' : 'primary') + '" style="flex:1;min-height:42px" data-action="submit-send-quote">' +
          icon('send') + '[' + esc(s.quoteType) + '] ' + (s.channel === 'kakao' ? '카카오 알림톡 발송' : '문자 메시지 발송') +
        '</button>' +
        '<button type="button" class="btn soft" data-action="copy-send-msg">' + icon('copy') + '문구+링크 복사</button>' +
        '<a class="btn" href="' + smsHref + '">' + icon('phone') + '기기 문자앱</a>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<h4 style="margin:0 0 10px;font-size:12px">최근 발송 이력 (' + s.dispatches.length + '건)</h4>' +
      logsHtml +
    '</section>' +
    '<aside class="send-preview-panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
        '<b style="font-size:12px">실시간 미리보기</b>' +
        '<div class="seg-group">' +
          '<button type="button" class="seg-btn ' + (s.previewTab === 'message' ? 'active' : '') + '" data-action="send-preview-tab" data-value="message">' + (s.channel === 'kakao' ? '카톡 말풍선' : '문자 화면') + '</button>' +
          '<button type="button" class="seg-btn ' + (s.previewTab === 'rough' ? 'rough-active active' : '') + '" data-action="send-preview-tab" data-value="rough">가견적</button>' +
          '<button type="button" class="seg-btn ' + (s.previewTab === 'final' ? 'final-active active' : '') + '" data-action="send-preview-tab" data-value="final">최종견적</button>' +
          '<button type="button" class="seg-btn ' + (s.previewTab === 'login' ? 'active' : '') + '" data-action="send-preview-tab" data-value="login">로그인창</button>' +
        '</div>' +
      '</div>' +
      '<div id="send-right-stage"></div>' +
    '</aside>' +
  '</div></div>';

  const footer = '<small>' + (s.isLiveApi ? '● 실시간 외부 발송 API 연결됨' : '● 연동 대기(발송이력 기록 및 문구복사·미리보기 지원 · 설정>외부연동에서 실발송 API 연결 가능)') + '</small>' +
    btn('가견적 크게 보기', 'preview', 'eye', 'soft', 'data-id="' + s.cid + '" data-type="가견적"') +
    btn('최종견적 크게 보기', 'preview', 'eye', 'soft', 'data-id="' + s.cid + '" data-type="최종견적"') +
    btn('닫기', 'close');

  openDialog('고객 모바일 견적서 발송 (문자 · 카카오톡)', body, footer, 'send-drawer', esc(s.recipientName) + ' 고객 · ' + esc(s.product) + ' [' + esc(s.quoteType) + ' ' + won(s.totalPrice) + ']', true);
  renderSendRightPreview();
}

async function openMessagingIntegrationDialog() {
  let cfg = { enabled: false, provider: 'webhook', senderPhone: '1588-0000', smsWebhookUrl: '', kakaoWebhookUrl: '', kakaoPfId: '', apiKey: '' };
  try {
    const res = await apiFetch('/api/settings/integrations');
    if (res.ok) {
      const data = await res.json();
      if (data.configs?.messaging) cfg = { ...cfg, ...data.configs.messaging };
    }
  } catch {}

  openDialog(
    '문자(SMS/LMS) · 카카오 알림톡 연동 설정',
    '<form id="edit-form" data-submit="messaging-config"><div class="dialog-body">' +
      '<div class="notice-text" style="margin-bottom:16px">솔라피(Solapi), 알리고(Aligo), 사내 메시징 게이트웨이 등의 발송 웹훅/API 주소를 등록하면 발송 시 실제 문자와 카카오 알림톡이 즉시 전송됩니다. 미등록 상태에서는 CRM 발송 이력 기록 및 원클릭 카톡/문자 복사 모드로 동작합니다.</div>' +
      '<label class="checkline" style="margin-bottom:16px"><input type="checkbox" name="enabled" ' + (cfg.enabled ? 'checked' : '') + '> <b>실시간 외부 API 발송 활성화</b></label>' +
      '<div class="field-grid">' +
        field('발신 대표번호', 'senderPhone', cfg.senderPhone || '1588-0000', 'tel') +
        field('카카오 비즈니스 채널 ID (PFID)', 'kakaoPfId', cfg.kakaoPfId || '') +
      '</div>' +
      field('카카오 알림톡 발송 API / Webhook URL', 'kakaoWebhookUrl', cfg.kakaoWebhookUrl || '', 'url') +
      field('문자(LMS/SMS) 발송 API / Webhook URL', 'smsWebhookUrl', cfg.smsWebhookUrl || '', 'url') +
      field('인증 API Key / Bearer Token (선택)', 'apiKey', cfg.apiKey || '', 'password') +
    '</div><div class="dialog-footer">' + btn('취소', 'close') + '<button type="submit" class="btn primary">연동 설정 저장</button></div></form>',
    '', '', '고객 모바일 견적서 발송 채널 관리'
  );
}

let page='customers', customerTab='all', contractTab='all', settingsTab='labels', role='본사 관리자', query='', stageFilter='', productFilter='', partnerFilter='', periodFilter='all', sortOrder='new', selected=new Set(), detailId=null, detailTab='notes', editor=null, statsPeriod='7', restoreFocus=null, quotePreviewId=null;
const menus=[['customers','고객관리','users'],['quotes','견적관리','file'],['contracts','계약관리','contract'],['products','상품관리','box'],['partners','파트너관리','building'],['stats','통계관리','chart'],['settings','설정','settings']];
const stages=['신규접수','상담중','가견적요청','견적안내','실측예정','최종견적','계약진행','시공완료','보류'];
const stageColor=s=>({'신규접수':'','상담중':'purple','가견적요청':'orange','견적안내':'','실측예정':'green','최종견적':'purple','계약진행':'green','시공완료':'gray','보류':'gray','서류검토':'orange','보완요청':'red','심사중':'purple','승인':'green','반려':'red','약정대기':'orange','선금완료':'','수납완료':'green'}[s]||'');
const badge=(text,color=stageColor(text))=>`<span class="badge ${color}">${esc(text)}</span>`;
const btn=(label,action,ic='',kind='',data='')=>`<button class="btn ${kind}" data-action="${action}" ${data}>${ic?icon(ic):''}${label}</button>`;
const save=()=>localStorage.setItem('homecc_crm_v3_demo',JSON.stringify(db));
const visibleCustomers=()=>db.customers.filter(c=>role==='본사 관리자'||c.partner==='한빛인테리어');
const findC=id=>db.customers.find(c=>c.id===Number(id));
const accessibleC=id=>visibleCustomers().find(c=>c.id===Number(id));
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function audit(id,text){(db.history[id]??=[]).unshift({date:now(),text,by:role==='본사 관리자'?'김지훈':'파트너 관리자'});save()}
function options(arr,value,placeholder=''){return (placeholder?`<option value="">${placeholder}</option>`:'')+arr.map(s=>`<option value="${esc(s)}" ${s===value?'selected':''}>${esc(s)}</option>`).join('')}
function field(label,name,value='',type='text',required=false){const isMoney=type==='money';return `<div class="field"><label for="${name}">${label}${required?' <span>*</span>':''}</label><input class="input${isMoney?' money':''}" id="${name}" name="${name}" type="${isMoney?'text':type}" ${isMoney?'inputmode="numeric" data-money="1"':''} value="${esc(isMoney?num(value):value)}" ${required?'required':''}></div>`}
function selectField(label,name,arr,value=''){return `<div class="field"><label for="${name}">${label}</label><select class="input" id="${name}" name="${name}">${options(arr,value)}</select></div>`}
const symbol=()=>'<span class="brand-symbol"><i></i><i></i><i></i><i></i></span>';
function render(){
    if(role!=='본사 관리자'&&!['customers','contracts','products'].includes(page))page='customers';
    const current=menus.find(m=>m[0]===page);
    const allowedMenus=menus.filter(m=>role==='본사 관리자'||['customers','contracts','products'].includes(m[0]));
    const quickTabs=role==='본사 관리자'
      ?[['customers','고객관리','users'],['quotes','견적관리','file'],['contracts','계약관리','contract']]
      :[['customers','고객관리','users'],['contracts','계약관리','contract'],['products','상품관리','box']];
    const isSecondaryPage=!quickTabs.some(t=>t[0]===page);
    $('#app').innerHTML=`<div class="app"><div class="sidebar-backdrop ${mobileNavOpen?'open':''}" data-action="close-nav" aria-hidden="true"></div><aside class="sidebar ${mobileNavOpen?'open':''}" id="app-sidebar" aria-label="전체 좌측 메뉴"><div class="brand"><div class="brand-top">${symbol()}<strong>KCC 홈씨씨</strong><button type="button" class="sidebar-close-btn" data-action="close-nav" aria-label="메뉴 닫기">${icon('close')}</button></div><small>CRM WORKSPACE</small></div><div class="workspace"><span>운영 파트너</span><strong>${role==='본사 관리자'?'(주)라이프앤조이':'한빛인테리어'}</strong></div><div class="nav-label">WORKSPACE</div><nav>${allowedMenus.map(m=>`<button class="nav-btn ${page===m[0]?'active':''}" data-action="nav" data-page="${m[0]}" title="${m[1]}" aria-label="${m[1]}" ${page===m[0]?'aria-current="page"':''}>${icon(m[2])}<span>${m[1]}</span>${m[0]==='customers'?`<em>${visibleCustomers().length}</em>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-mobile-user"><div class="avatar">${role==='본사 관리자'?'지훈':'한빛'}</div><div><strong>${role==='본사 관리자'?'김지훈':'한빛인테리어'}</strong><small>${role==='본사 관리자'?'최고관리자 · 본사':'영업파트너'}</small></div></div><div class="sidebar-note"><b><span class="dot"></span>운영 시스템</b>실시간 DB 및 권한 연동 중</div><div class="version"><span>KCC HOMECC</span><span>Ver. 3.0</span></div></div></aside><div class="shell"><header class="topbar"><div class="topbar-left"><button type="button" class="mobile-more-btn ${mobileNavOpen?'active-open':''}" data-action="toggle-nav" aria-controls="app-sidebar" aria-expanded="${mobileNavOpen}" aria-label="좌측 메뉴 더보기">${icon('menu')}<span>더보기</span></button><div class="breadcrumb"><span>라이프앤조이</span>${icon('chevron')}<b>${current[1]}</b></div></div><div class="top-actions"><select class="role-select" id="role-switch" aria-label="관리자 화면 전환"><option ${role==='본사 관리자'?'selected':''}>본사 관리자</option><option ${role==='파트너 관리자'?'selected':''}>파트너 관리자</option></select><button class="bell" data-action="notifications" aria-label="업무 알림">${icon('bell')}</button><div class="user"><div class="avatar">${role==='본사 관리자'?'지훈':'한빛'}</div><div><strong>${role==='본사 관리자'?'김지훈':'한빛인테리어'}</strong><small>${role==='본사 관리자'?'최고관리자':'영업파트너'}</small></div></div></div></header><main id="main">${({customers:customersPage,quotes:quotesPage,contracts:contractsPage,products:productsPage,partners:partnersPage,stats:statsPage,settings:settingsPage}[page])()}<div class="page-footer"><span>© LIFE & JOY · KCC HOMECC CRM 3.0</span><span>실운영 데이터 연동 시스템</span></div></main><nav class="mobile-bottom-nav" aria-label="모바일 빠른 메뉴">${quickTabs.map(t=>`<button type="button" class="m-tab ${!mobileNavOpen&&page===t[0]?'active':''}" data-action="nav" data-page="${t[0]}" ${page===t[0]?'aria-current="page"':''}>${icon(t[2])}<span>${t[1]}</span></button>`).join('')}<button type="button" class="m-tab more-trigger ${mobileNavOpen||isSecondaryPage?'active':''} ${mobileNavOpen?'active-open':''}" data-action="toggle-nav" aria-controls="app-sidebar" aria-expanded="${mobileNavOpen}">${icon('grid')}<span>더보기</span></button></nav></div></div>`}
function pageHead(title,sub,actions='',eyebrow='WORKSPACE'){return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions"><span class="date-label">2026. 11. 12. 목요일</span>${actions}</div></div>`}
function metric(label,value,unit,foot,ic,color='',action='',data=''){return `<${action?'button':'div'} class="metric ${color}" ${action?`data-action="${action}" ${data}`:''}><span class="metric-label">${label}</span><span class="metric-icon">${icon(ic)}</span><strong>${value}<small>${unit}</small></strong><span class="metric-foot">${foot}</span></${action?'button':'div'}>`}
function filteredCustomers(){return visibleCustomers().filter(c=>(!query||[c.name,c.phone,c.address,c.id].join(' ').includes(query))&&(!stageFilter||c.status===stageFilter)&&(!productFilter||c.product===productFilter)&&(!partnerFilter||c.partner===partnerFilter)&&(periodFilter==='all'||(periodFilter==='today'?c.date==='2026-11-12':c.date>='2026-11-06'))&&(customerTab==='all'||customerTab==='mine'&&c.owner==='오영진'||customerTab==='unassigned'&&c.owner==='미배정'||customerTab==='unread'&&c.quote>0&&!c.viewed)).sort((a,b)=>sortOrder==='old'?a.id-b.id:b.date.localeCompare(a.date)||a.id-b.id)}
function customerRows(){const list=filteredCustomers();return list.length?list.map(c=>`<article class="customer-row" data-action="customer" data-id="${c.id}" tabindex="0" aria-label="${esc(c.name)} 고객 상세"><input type="checkbox" data-select="${c.id}" ${selected.has(c.id)?'checked':''} aria-label="${c.name} 선택"><div><div class="row-top">${badge(c.status)}${c.label!=='일반'?badge(c.label,c.label==='긴급'?'red':c.label==='완료'?'green':'orange'):''}<span class="row-code">No. ${c.id}</span><span class="row-code">${c.date.slice(5).replace('-','.')}</span></div><div class="name-line">${badge(c.product,c.product==='주방'?'purple':c.product==='욕실'?'green':'')}<b>${esc(c.name)}</b><span>${esc(c.phone)}</span></div><div class="row-address">${icon('pin')}${esc(c.address)}</div><div class="row-meta"><span>${esc(c.source)}</span><span>· ${esc(c.partner)}</span>${c.measure?`<span>실측 ${c.measure.slice(5)}</span>`:''}</div></div><div class="row-activity"><div class="line"><span class="tag">상담</span><div><p>${esc(c.note)}</p><small>${c.date.slice(5)} 09:30 · ${esc(c.owner)}</small></div></div><div class="line feedback"><span class="tag feedback">피드백</span><p>${esc(c.feedback)}</p></div></div><div class="row-end"><div class="row-owner"><span class="mini-avatar">${c.owner==='미배정'?'–':esc(c.owner.slice(-2))}</span>${esc(c.owner)}</div><div class="row-links">${c.quote?(c.roughQuote&&c.finalQuote?`<button class="link-chip" data-action="preview" data-id="${c.id}" data-type="가견적">가견적 ↗</button><button class="link-chip" style="background:#eef8f4;border-color:#a8dac6;color:#1f6853" data-action="preview" data-id="${c.id}" data-type="최종견적">최종견적 ↗</button>`:`<button class="link-chip" data-action="preview" data-id="${c.id}" data-type="${esc(c.quoteType||'가견적')}">${esc(c.quoteType||'가견적')} ↗</button>`):`<button class="link-chip muted" data-action="new-quote" data-id="${c.id}">견적 작성</button>`}${c.quote?`<button class="link-chip" style="background:#fffbeb;border-color:#f2d675;color:#855a00" data-action="send-quote" data-id="${c.id}">문자·카톡</button>`:''}<button class="link-chip" data-action="customer" data-id="${c.id}">상세보기</button></div><div class="row-bottom">${c.quote?(c.viewed?'● 고객 열람 완료':'○ 아직 열람하지 않음')+(c.dispatchCount?` · 발송 ${c.dispatchCount}회`:''):'견적 발행 전'}</div></div></article>`).join(''):`<div class="empty">${icon('search')}<strong>조건에 맞는 고객이 없습니다.</strong>검색어나 필터를 변경해 주세요.</div>`}
function customersPage(){const c=visibleCustomers();return pageHead('고객관리','고객의 첫 문의부터 계약까지, 한눈에 관리하세요.',btn('일정 보기','calendar','calendar','secondary')+btn('고객 등록','new-customer','plus','primary'),'CUSTOMER MANAGEMENT')+`<div class="metrics">${metric('전체 고객',c.length,'건','현재 등록된 전체 공사건','users','','filter-all')}${metric('견적 요청 대기',c.filter(x=>x.status==='가견적요청').length,'건','<span class="accent">원본 견적 수령</span>이 필요해요','file','orange','filter-stage','data-value="가견적요청"')}${metric('실측 예정',c.filter(x=>x.status==='실측예정').length,'건','담당팀과 방문 일정을 확인하세요','calendar','purple','filter-stage','data-value="실측예정"')}${metric('계약 진행',c.filter(x=>x.status==='계약진행').length,'건','서류 검토와 수납 상태 확인','contract','green','filter-stage','data-value="계약진행"')}</div><section class="panel"><div class="tabs">${[['all','전체 고객'],['mine','내 담당 고객'],['unassigned','미배정'],['unread','견적 미열람']].map(([v,l])=>`<button class="tab ${customerTab===v?'active':''}" data-action="customer-tab" data-value="${v}">${l}${v==='all'?`<span class="count">${c.length}</span>`:''}</button>`).join('')}</div><div class="filters"><div class="search-field">${icon('search')}<input class="input" id="customer-search" value="${esc(query)}" placeholder="고객명, 연락처, 주소 검색" aria-label="고객 검색"></div><select class="select" id="filter-period" aria-label="등록 기간"><option value="all" ${periodFilter==='all'?'selected':''}>등록 기간 전체</option><option value="today" ${periodFilter==='today'?'selected':''}>오늘</option><option value="7" ${periodFilter==='7'?'selected':''}>최근 7일</option></select><select class="select" id="filter-product" aria-label="상품군">${options(['창호','주방','욕실'],productFilter,'상품군 전체')}</select><select class="select" id="filter-stage" aria-label="진행구분">${options(stages,stageFilter,'진행구분 전체')}</select>${role==='본사 관리자'?`<select class="select" id="filter-partner" aria-label="소속 파트너">${options(['직영',...db.partners.map(p=>p.name)],partnerFilter,'파트너 전체')}</select>`:''}<button class="icon-btn" data-action="reset-filters" title="필터 초기화" aria-label="필터 초기화">${icon('refresh')}</button></div><div class="toolbar"><span id="list-count">검색 결과 <strong>${filteredCustomers().length}</strong>건 ${selected.size?`· <button data-action="assign" style="color:var(--blue)">${selected.size}명 담당자 배정</button>`:''}</span><div class="actions">${btn('엑셀용 CSV','export','download','sm')}<select class="sort" id="sort-order" aria-label="정렬 순서"><option value="new" ${sortOrder==='new'?'selected':''}>최근 등록순</option><option value="old" ${sortOrder==='old'?'selected':''}>고객번호 낮은순</option></select></div></div><div class="customers" id="customer-rows">${customerRows()}</div><div class="pagination"><span>전체 결과를 한 페이지에 표시합니다.</span><div class="pages"><button class="active" aria-label="현재 1페이지">1</button></div></div></section>`}
function quotesPage(){const cs=visibleCustomers(), ready=cs.filter(c=>c.status==='가견적요청'), published=cs.filter(c=>c.quote>0);return pageHead('견적관리','원본 견적을 고객에게 전달할 최적의 제안으로 완성하세요.',btn('견적 만들기','new-quote','plus','primary'),'ESTIMATE WORKSPACE')+`<div class="metrics">${metric('원본 수령 대기',ready.length,'건','KCC 영업지원팀 요청 건','clock','orange')}${metric('발행된 견적',published.length,'건','고객별 최신 견적 기준','file')}${metric('고객 열람',published.filter(c=>c.viewed).length,'건','발행 이후 열람한 고객','eye','green')}${metric('견적 미열람',published.filter(c=>!c.viewed).length,'건','안내 링크를 확인해 주세요','send','purple')}</div><div class="banner">${icon('info')}<div><b>원본 엑셀 → 판매가 설정 → 고객견적 발행</b><br>공급원가와 내부 마진은 고객용 견적서에 표시되지 않습니다.</div></div><section class="panel"><div class="panel-head"><div><h3>견적 요청 및 발행 현황</h3><p>고객·공사건에 연결된 견적을 관리합니다.</p></div>${badge('예시 데이터','gray')}</div><div class="table-wrap"><table class="mobile-card-table"><thead><tr><th>고객 / 견적번호</th><th>상품</th><th>진행 상태</th><th>고객 견적금액</th><th>고객 열람</th><th>담당자</th><th>관리</th></tr></thead><tbody>${[...ready,...published].map(c=>`<tr><td class="card-primary"><b class="quote-customer-name">${esc(c.name)}</b><small>${c.quote?'Q':'REQ'}-${c.id} · ${esc(c.address)}</small></td><td data-label="상품">${badge(c.product,'gray')}</td><td data-label="진행 상태">${badge(c.quote?'발행완료':'원본대기',c.quote?'green':'orange')}</td><td data-label="고객 견적금액" class="money"><b>${c.quote?won(c.quote):'—'}</b></td><td data-label="고객 열람">${c.quote?badge(c.viewed?'열람완료':'미열람',c.viewed?'green':'gray'):'—'}</td><td data-label="담당자">${esc(c.owner)}</td><td class="card-actions"><div class="actions">${btn(c.quote?'수정본 작성':'엑셀 등록','new-quote',c.quote?'edit':'upload','sm',`data-id="${c.id}"`)}${c.quote?btn('가견적 보기','preview','eye','sm soft',`data-id="${c.id}" data-type="가견적"`)+btn('최종견적 보기','preview','eye','sm soft',`data-id="${c.id}" data-type="최종견적"`)+btn('문자·카톡 발송','send-quote','send','sm primary',`data-id="${c.id}"`):''}</div></td></tr>`).join('')}</tbody></table></div></section>`}
function contractsPage(){const cs=visibleCustomers();const items=db.contracts.filter(k=>cs.some(c=>c.id===k.cid)), apps=db.applications.filter(k=>cs.some(c=>c.id===k.cid));return pageHead('계약관리','공사계약, 렌탈 접수, 수납 현황을 함께 확인하세요.',btn('계약 등록','new-contract','plus','primary'),'CONTRACT & PAYMENT')+`<div class="metrics">${metric('전체 계약',items.length,'건','공사건별 계약 현황','contract')}${metric('렌탈 신청',apps.length,'건','신청 접수와 약정은 별도 단계','file','purple')}${metric('실제 수납액',num(items.reduce((s,k)=>s+k.paid,0)/10000),'만원','예시 현금·카드 수납 합계','credit','green')}${metric('일시불 미수금',num(items.filter(k=>k.type==='일시불').reduce((s,k)=>s+k.amount-k.paid,0)/10000),'만원','렌탈사 정산 예정액 제외','clock','orange')}</div><section class="panel"><div class="tabs">${[['all','전체 계약'],['cash','일시불·수납'],['rental','렌탈 신청']].map(([v,l])=>`<button class="tab ${contractTab===v?'active':''}" data-action="contract-tab" data-value="${v}">${l}</button>`).join('')}</div><div class="table-wrap"><table class="mobile-card-table"><thead><tr>${contractTab==='rental'?'<th>고객 / 신청번호</th><th>렌탈 조건</th><th>월 납부금</th><th>상태</th><th>접수일</th><th>관리</th>':'<th>고객 / 계약번호</th><th>결제방식</th><th>계약금액</th><th>수납액</th><th>계약·수납 상태</th><th>관리</th>'}</tr></thead><tbody>${contractTab==='rental'?apps.map(a=>{const c=findC(a.cid);return `<tr><td class="card-primary"><b class="quote-customer-name">${esc(c.name)}</b><small>${a.id} · ${c.product}</small></td><td data-label="렌탈 조건">${a.plan}</td><td data-label="월 납부금" class="money"><b>${won(a.monthly)}</b></td><td data-label="상태">${badge(a.status)}</td><td data-label="접수일">${a.date}</td><td class="card-actions">${btn('신청서 확인','application','file','sm soft',`data-id="${a.id}"`)}</td></tr>`}).join(''):items.filter(k=>contractTab==='all'||k.type==='일시불').map(k=>{const c=findC(k.cid);return `<tr><td class="card-primary"><b class="quote-customer-name">${esc(c.name)}</b><small>${k.id} · ${c.product}</small></td><td data-label="결제방식">${badge(k.type,k.type==='렌탈'?'purple':'')}</td><td data-label="계약금액" class="money"><b>${won(k.amount)}</b></td><td data-label="수납액" class="money">${won(k.paid)}</td><td data-label="계약·수납 상태">${badge(k.status)}</td><td class="card-actions">${btn('계약 상세','contract','contract','sm soft',`data-id="${k.id}"`)}</td></tr>`}).join('')}</tbody></table></div>${!(contractTab==='rental'?apps.length:items.length)?'<div class="empty">등록된 계약이 없습니다.</div>':''}</section><div class="panel-caption">렌탈 신청 접수, 심사 승인, 약정 완료, 정산 완료를 각각 관리합니다. 표시 금액은 예시입니다.</div>`}
function productsPage(){return pageHead('상품관리','상품별 랜딩페이지와 전용 상담 링크를 관리하세요.',role==='본사 관리자'?btn('상품페이지 등록','new-product','plus','primary'):'','PRODUCT & LANDING')+`<div class="banner">${icon('link')}<div><b>${role==='본사 관리자'?'상품별 상담 유입을 고객관리로 연결합니다.':'한빛인테리어 전용 링크로 접수된 고객을 확인하세요.'}</b><br>방문·신청 통계 수집에는 랜딩페이지 연동이 필요합니다. 아래 수치는 예시입니다.</div></div><div class="three-col">${db.products.map((p,i)=>`<article class="product-card"><div class="product-visual" style="background:${p.color}"><span class="visual-label">HOMECC ${['WINDOW','KITCHEN','BATHROOM'][i%3]}</span>${icon(p.icon,'large-icon')}</div><div class="product-info">${badge(p.active?'운영중':'준비중',p.active?'green':'gray')}<h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="product-url"><span>${p.url?esc(p.url.replace('https://','')):'랜딩 URL 등록 대기'}</span><button data-action="copy-product" data-id="${i}" aria-label="${esc(p.name)} 링크 복사">${icon('copy')}</button></div><div class="product-stats"><div><small>방문 수 · 예시</small><b>${num(p.views)}</b></div><div><small>접수 고객</small><b>${visibleCustomers().filter(c=>c.product===p.category).length}</b></div><div><small>계약</small><b>${db.contracts.filter(k=>visibleCustomers().some(c=>c.id===k.cid&&c.product===p.category)).length}</b></div></div><div class="actions">${btn('전용 링크','product-link','link','soft',`data-id="${i}"`)}${role==='본사 관리자'?btn('수정','edit-product','edit','',`data-id="${i}"`):''}${p.url?`<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.name)} 랜딩 보기">${icon('external')}</a>`:''}</div></div></article>`).join('')}</div>`}
function partnersPage(){return pageHead('파트너관리','함께 성장하는 영업파트너와 고객 성과를 관리하세요.',btn('파트너 등록','new-partner','plus','primary'),'PARTNER NETWORK')+`<div class="three-col">${db.partners.map(p=>{const cs=db.customers.filter(c=>c.partner===p.name);return `<section class="panel partner-card"><div class="partner-top"><div class="avatar">${esc(p.name.slice(0,2))}</div><div><h3>${esc(p.name)}</h3><p>${p.id} · ${esc(p.type)}</p></div>${badge(p.active?'정상':'대기',p.active?'green':'orange')}</div><div class="info-grid"><div><label>대표 담당자</label><b>${esc(p.person)}</b></div><div><label>운영 권한</label><b>파트너 관리자</b></div></div><div class="divider"></div><div class="mini-stat"><span>등록 고객</span><b>${cs.length}건</b></div><div class="mini-stat"><span>계약 현황</span><b>${db.contracts.filter(k=>cs.some(c=>c.id===k.cid)).length}건</b></div><div class="mini-stat"><span>허용 메뉴</span><b>고객 · 계약 · 상품</b></div><div class="actions" style="margin-top:20px">${btn('파트너 정보','partner-detail','building','sm',`data-id="${p.id}"`)}${p.name==='한빛인테리어'?btn('전용 화면 체험','partner-mode','external','sm soft'):''}</div></section>`}).join('')}</div><div class="banner" style="margin-top:22px">${icon('shield')}<div><b>소속 파트너의 고객과 계약만 관리합니다.</b><br>원가·본사 마진·다른 파트너 정보는 기본 공개 대상에서 제외합니다. 화면 전환은 권한 구성을 보여주는 체험 기능입니다.</div></div>`}
function chartSVG(){const values=statsPeriod==='1'?[12,18,15,33,41,35,55,49,64,43,68,76]:statsPeriod==='30'?[35,58,45,77,70,98,63,104,120,95,138,149]:[42,60,49,84,76,104,123];const max=Math.max(...values)*1.2,dx=540/(values.length-1), points=values.map((v,i)=>[45+i*dx,190-v/max*165]);const path=points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');return `<svg class="chart" viewBox="0 0 620 230" role="img" aria-label="기간별 방문 추이 예시"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5484ec" stop-opacity=".18"/><stop offset="1" stop-color="#5484ec" stop-opacity="0"/></linearGradient></defs>${[30,70,110,150,190].map((y,i)=>`<line x1="45" x2="585" y1="${y}" y2="${y}" stroke="#edf1f7"/><text x="8" y="${y+4}">${Math.round(max*(4-i)/4)}</text>`).join('')}<path d="${path}L585 190L45 190Z" fill="url(#fade)"/><path d="${path}" fill="none" stroke="#5484ec" stroke-width="2.5" stroke-linejoin="round"/>${points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="white" stroke="#5484ec" stroke-width="2"/><text x="${p[0]}" y="215" text-anchor="middle">${statsPeriod==='1'?`${i+9}시`:statsPeriod==='30'?`${i*2+1}일`:`11.${i+6}`}</text>`).join('')}</svg>`}
function statsPage(){return pageHead('통계관리','유입부터 계약까지, 마케팅과 영업의 흐름을 확인하세요.',`<select class="select" id="stats-period" aria-label="통계 기간"><option value="1" ${statsPeriod==='1'?'selected':''}>오늘</option><option value="7" ${statsPeriod==='7'?'selected':''}>최근 7일</option><option value="30" ${statsPeriod==='30'?'selected':''}>이번 달</option></select>`,'ANALYTICS & INSIGHTS')+`<div class="metrics">${metric('랜딩 방문 · 예시',statsPeriod==='1'?'609':statsPeriod==='30'?'8,742':'2,321','회','내부·봇 방문 제외 기준','chart')}${metric('등록 고객',db.customers.length,'건','체험 데이터 전체 누적','users','purple')}${metric('견적 발행 고객',db.customers.filter(c=>c.quote>0).length,'명','최신 견적 보유 고객','file','orange')}${metric('계약 고객',db.contracts.length,'명','체험 데이터 전체 누적','contract','green')}</div><div class="two-col"><section class="panel"><div class="panel-head"><div><h3>랜딩페이지 방문 추이</h3><p>선택 기간의 예시 시계열</p></div><div class="legend"><span><i></i>방문 수</span></div></div><div class="panel-pad">${chartSVG()}</div></section><section class="panel"><div class="panel-head"><h3>유입 채널 구성</h3>${badge('예시','gray')}</div><div class="panel-pad">${[['네이버',54],['인스타그램',21],['파트너 링크',15],['기타·직접',10]].map(([s,n])=>`<div class="bar-row"><span>${s}</span><div class="bar-track"><div class="bar-fill" style="width:${n}%;background:${n===54?'#5e86ea':n===21?'#92acec':n===15?'#b3c5ed':'#d1dcee'}"></div></div><b>${n}%</b></div>`).join('')}<div class="panel-caption">알 수 없는 유입은 직접·확인불가로 분류합니다.</div></div></section></div><section class="panel" style="margin-top:20px"><div class="panel-head"><h3>고객 전환 흐름</h3><span class="pill-note">전체 체험 데이터 · 공사건 기준</span></div><div class="panel-pad"><div class="progress-list">${[['고객 등록',db.customers.length],['견적 발행',db.customers.filter(c=>c.quote>0).length],['견적 열람',db.customers.filter(c=>c.viewed).length],['계약 등록',db.contracts.length],['수납 완료',db.contracts.filter(c=>c.paid>=c.amount).length]].map(([t,n])=>`<div><span>${t}</span><b>${n}건</b><i class="on" style="opacity:${.3+n/15}"></i></div>`).join('')}</div><div class="notice-text">방문 추이는 화면 확인용 예시입니다. 실제 통계는 랜딩 추적과 서버 이벤트 연결 후 수집됩니다. IP는 기본 마스킹하며, 계약·결제 이벤트는 처리 완료를 기준으로 집계합니다.</div></div></section><section class="panel" style="margin-top:20px"><div class="panel-head"><div><h3>상품페이지별 성과</h3><p>페이지·유입채널별 전환 분석 · 예시</p></div></div><div class="table-wrap"><table><thead><tr><th>상품페이지</th><th>방문 수</th><th>상담 신청</th><th>견적 발행</th><th>계약</th><th>상담 전환율</th></tr></thead><tbody>${[['창호',1248,36,21,8],['주방',682,18,10,3],['욕실',391,9,5,2]].map(([n,v,l,q,c])=>`<tr><td><b>KCC 홈씨씨 ${n}</b></td><td>${num(v)}</td><td>${l}건</td><td>${q}건</td><td>${c}건</td><td>${(l/v*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div></section><section class="panel" style="margin-top:20px"><div class="panel-head"><div><h3>접속 및 이벤트 기록</h3><p>표시용 예시 로그 · 실제 방문 데이터와 연결되지 않았습니다.</p></div>${badge('IP 마스킹','gray')}</div><div class="table-wrap"><table><thead><tr><th>발생 시각</th><th>상품페이지</th><th>유입 경로</th><th>접속 IP</th><th>기기</th><th>이벤트</th></tr></thead><tbody>${[['11.12 10:42:15','창호','네이버 / 검색광고','192.0.2.***','모바일','상담 신청'],['11.12 10:40:08','주방','파트너 / 한빛인테리어','198.51.100.***','모바일','견적 열람'],['11.12 10:38:52','창호','인스타그램 / 캠페인','203.0.113.***','모바일','페이지 방문'],['11.12 10:31:20','욕실','직접 / 확인불가','192.0.2.***','PC','계약 등록']].map(r=>`<tr>${r.map((t,i)=>`<td>${i===5?badge(t):t}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`}
function settingsPage(){const tabs=[['labels','진행라벨','box'],['stages','진행구분','filter'],['forms','양식관리','file'],['users','사용자관리','users'],['integrations','외부 연동','link'],['reset','초기화 설정','refresh']];let content='';if(settingsTab==='labels')content=`<div class="panel-head"><div><h3>진행라벨 관리</h3><p>고객의 특성을 표시하는 라벨입니다. 업무 단계와 별도로 관리합니다.</p></div>${btn('라벨 추가','new-label','plus','sm primary')}</div><div class="panel-pad">${db.labels.map(l=>`<div class="settings-row"><span class="color-dot" style="background:${l.color}"></span><div class="grow"><b>${esc(l.name)}</b><small>고객 목록과 상세 화면에 표시</small></div>${badge(l.name,'gray')}</div>`).join('')}</div>`;if(settingsTab==='stages')content=`<div class="panel-head"><div><h3>진행구분</h3><p>상담·견적·실측·계약의 업무 흐름을 표시합니다.</p></div></div><div class="panel-pad">${stages.map((s,i)=>`<div class="settings-row"><div class="avatar" style="width:28px;height:28px">${String(i+1).padStart(2,'0')}</div><div class="grow"><b>${s}</b><small>${i<5?'상담·견적 담당':'계약·운영 담당'} · 과거 이력 보존</small></div>${badge(s)}</div>`).join('')}</div>`;if(settingsTab==='forms')content=`<div class="panel-head"><div><h3>양식 및 동의서</h3><p>고객 동의 시점의 양식 버전을 보관합니다.</p></div>${badge('검토용 양식','orange')}</div><div class="panel-pad">${db.forms.map((f,i)=>`<div class="settings-row">${icon('file')}<div class="grow"><b>${esc(f.name)}</b><small>버전 ${f.version}.0 · 실제 접수 전 내용 확정 필요</small></div>${btn('편집','edit-form','edit','sm',`data-id="${i}"`)}</div>`).join('')}</div>`;if(settingsTab==='users')content=`<div class="panel-head"><div><h3>사용자 관리</h3><p>소속과 업무 역할에 맞게 권한을 부여합니다.</p></div>${btn('사용자 추가','new-user','plus','sm primary')}</div><div class="table-wrap"><table class="mobile-card-table"><thead><tr><th>사용자</th><th>소속</th><th>권한</th><th>상태</th></tr></thead><tbody>${db.users.map(u=>`<tr><td class="card-primary"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></td><td data-label="소속">${esc(u.org)}</td><td data-label="권한">${esc(u.role)}</td><td data-label="상태">${badge('정상','green')}</td></tr>`).join('')}</tbody></table></div>`;if(settingsTab==='integrations')content=`<div class="panel-head"><div><h3>외부 서비스 연동</h3><p>실제 서비스 개통 상태와 운영 연결을 관리합니다.</p></div></div><div class="panel-pad">${[['카드결제 PG','신규 결제 요청·승인·취소·정산','credit'],['문자·알림톡','견적 안내·본인 인증·업무 알림','send'],['렌탈사 접수','심사·약정·정산 결과 연결','file'],['랜딩페이지 수집','상담 신청·유입 이벤트 연결','link']].map(([n,t,i])=>`<div class="settings-row">${icon(i)}<div class="grow"><b>${n}</b><small>${t}</small></div>${badge('미연결','gray')}${btn('연결 안내','integration','info','sm',`data-name="${n}"`)}</div>`).join('')}</div>`;if(settingsTab==='reset')content=`<div class="panel-head"><h3>체험 데이터 초기화</h3></div><div class="panel-pad"><div class="notice-text">현재 브라우저에 저장된 체험 데이터만 초기 상태로 되돌립니다. 기존 운영 CRM과 연결되어 있지 않습니다.</div><div style="margin-top:20px">${btn('체험 데이터 초기화','reset-data','refresh','danger')}</div></div>`;return pageHead('설정','운영 기준과 사용자 권한을 관리하세요.','','SYSTEM SETTINGS')+`<div class="settings-layout"><nav class="settings-nav">${tabs.map(([v,t,i])=>`<button class="${settingsTab===v?'active':''}" data-action="settings-tab" data-value="${v}">${icon(i)}${t}</button>`).join('')}</nav><section class="panel">${content}</section></div>`}
let dialogStack = [];

function openDialog(title, body, footer = '', cls = '', subtitle = '', dark = false, dialogKey = null) {
  if (mobileNavOpen) setMobileNav(false);
  const currentFocus = document.activeElement;
  const overlayRoot = $('#overlay');
  if (!overlayRoot) return null;

  // 동일한 다이얼로그 키가 이미 스택에 열려 있는 경우 내용만 갱신 (탭 전환, 재렌더링 등)
  if (dialogKey) {
    const existingIndex = dialogStack.findIndex(d => d.key === dialogKey);
    if (existingIndex !== -1) {
      const entry = dialogStack[existingIndex];
      entry.title = title;
      entry.body = body;
      entry.footer = footer;
      entry.cls = cls;
      entry.subtitle = subtitle;
      entry.dark = dark;
      if (dialogKey === 'customer-detail') {
        entry.detailId = detailId;
        entry.detailTab = detailTab;
      }
      entry.el.innerHTML = `<section class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]*>/g, ''))}"><header class="dialog-head ${dark ? 'dark' : ''}"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="close" data-action="close" data-dialog-id="${entry.id}" aria-label="닫기">${icon('close')}</button></header>${body}${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}</section>`;
      document.body.style.overflow = 'hidden';
      return entry.id;
    }
  }

  // 새로운 모달을 스택에 추가
  const dlgId = 'dlg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const overlayEl = document.createElement('div');
  overlayEl.className = 'overlay';
  overlayEl.dataset.dialogId = dlgId;
  if (dialogKey) overlayEl.dataset.dialogKey = dialogKey;

  const zIdx = 80 + dialogStack.length * 10;
  overlayEl.style.zIndex = zIdx;

  overlayEl.innerHTML = `<section class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]*>/g, ''))}"><header class="dialog-head ${dark ? 'dark' : ''}"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="close" data-action="close" data-dialog-id="${dlgId}" aria-label="닫기">${icon('close')}</button></header>${body}${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}</section>`;

  overlayRoot.appendChild(overlayEl);

  const entry = {
    id: dlgId,
    key: dialogKey,
    title,
    body,
    footer,
    cls,
    subtitle,
    dark,
    restoreFocus: currentFocus,
    detailId: detailId,
    detailTab: detailTab,
    el: overlayEl
  };
  dialogStack.push(entry);

  document.body.style.overflow = 'hidden';
  setTimeout(() => overlayEl.querySelector('.dialog .close')?.focus(), 20);
  return dlgId;
}

function closeDialog(targetId = null) {
  if (!dialogStack.length) {
    const overlayRoot = $('#overlay');
    if (overlayRoot) overlayRoot.innerHTML = '';
    document.body.style.overflow = '';
    detailId = null;
    return;
  }

  let entry = null;
  if (targetId) {
    const idx = dialogStack.findIndex(d => d.id === targetId || d.key === targetId);
    if (idx !== -1) {
      entry = dialogStack.splice(idx, 1)[0];
    }
  }

  if (!entry) {
    entry = dialogStack.pop();
  }

  if (entry?.el && entry.el.parentNode) {
    entry.el.remove();
  }

  if (dialogStack.length > 0) {
    const topEntry = dialogStack[dialogStack.length - 1];
    if (topEntry.key === 'customer-detail' || topEntry.detailId) {
      detailId = topEntry.detailId;
      detailTab = topEntry.detailTab || 'notes';
    }
    document.body.style.overflow = 'hidden';
    if (entry?.restoreFocus && entry.restoreFocus.isConnected) {
      entry.restoreFocus.focus();
    } else {
      topEntry.el?.querySelector('.dialog .close')?.focus();
    }
  } else {
    const overlayRoot = $('#overlay');
    if (overlayRoot) overlayRoot.innerHTML = '';
    document.body.style.overflow = '';
    detailId = null;
    if (entry?.restoreFocus && entry.restoreFocus.isConnected) {
      entry.restoreFocus.focus();
    } else if (restoreFocus && restoreFocus.isConnected) {
      restoreFocus.focus();
    }
  }
}

function closeAllDialogs() {
  dialogStack.forEach(d => {
    if (d.el && d.el.parentNode) d.el.remove();
  });
  dialogStack = [];
  const overlayRoot = $('#overlay');
  if (overlayRoot) overlayRoot.innerHTML = '';
  document.body.style.overflow = '';
  detailId = null;
  if (restoreFocus && restoreFocus.isConnected) {
    restoreFocus.focus();
  }
}

function formDialog(title, fields, submit, subtitle = '', extra = '') {
  openDialog(title, `<form id="edit-form" data-submit="${submit}" ${extra}><div class="dialog-body">${fields}</div><div class="dialog-footer">${btn('취소', 'close')}<button type="submit" class="btn primary">저장하기</button></div></form>`, '', '', subtitle, false, 'form-' + submit);
}

function linkRow(label, url, action, id, emptyLabel = label + ' 등록') {
  return url ? `<div style="display:flex;gap:6px"><a class="btn soft sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="flex:1">${icon('external')}${label} 바로가기</a><button class="btn sm" type="button" data-action="${action}" data-id="${id}" title="${label} 링크 수정" aria-label="${label} 링크 수정" style="padding:6px 9px">${icon('edit')}</button></div>` : btn(emptyLabel, action, 'link', 'sm block', `data-id="${id}"`);
}

function linkDialog(title, label, url, submit, id, customerName) {
  const cObj = accessibleC(id);
  const isQuoteLink = (label === '가견적' || label === '최종견적');
  openDialog(title, `<form id="edit-form" data-submit="${submit}" data-id="${id}"><div class="dialog-body">${field(label + ' URL', 'url', url || '', 'text')}<p class="field-hint">이동할 ${label} 페이지 주소(URL)를 입력해 주세요. CRM에서 ${label}을 발행하면 전용 모바일 링크가 자동 연결됩니다.</p><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">${isQuoteLink && cObj?.quote ? `<button type="button" class="btn soft sm" data-action="preview" data-id="${id}" data-type="${label}">${icon('eye')}${label} 모바일 화면 미리보기</button>` : ''}${url ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('external')}새 탭에서 열기</a>` : ''}</div></div><div class="dialog-footer"><button type="button" class="btn" data-action="close">취소</button><button type="submit" class="btn primary">저장하기</button></div></form>`, '', '', `${esc(customerName)} · ${label}`, false, 'link-' + submit);
}
function openCustomer(id,tab='notes'){const c=accessibleC(id);if(!c)return;detailId=c.id;detailTab=tab;const logs=db.notes[id]||[{date:'11.12 09:30',by:c.owner==='미배정'?'시스템':c.owner,text:c.note,type:'notes'}];const shown=tab==='feedback'?(logs.filter(n=>n.type==='feedback').length?logs.filter(n=>n.type==='feedback'):[{date:'11.11 16:20',by:'영업지원팀',text:c.feedback}]):logs.filter(n=>n.type!=='feedback');let content='';
if(['notes','feedback'].includes(tab))content=shown.map(n=>`<div class="note"><div class="avatar">${esc(n.by.slice(-2))}</div><div class="note-body"><div class="note-meta"><b>${esc(n.by)}</b><span>${esc(n.date)}</span>${n.important?badge('중요','orange'):''}</div><p>${esc(n.text)}</p></div></div>`).join('')||'<div class="empty">등록된 기록이 없습니다.</div>';
if(tab==='quotes')content=`
    <div class="quote-stage-grid">
      <div class="quote-stage-card is-rough">
        <div class="qs-head"><b>가견적 (실측 전 예상안)</b>${c.roughQuote?badge('v'+c.roughQuote.version+' 발행완료','orange'):badge('미발행','gray')}</div>
        <div class="qs-price ${c.roughQuote?'':'empty-price'}">${c.roughQuote?won(c.roughQuote.totalPrice):'아직 발행된 가견적이 없습니다'}</div>
        <div class="qs-meta">${c.roughQuote?('발행일 '+esc(c.roughQuote.date)+' · '+(c.roughQuote.viewed?'고객 열람완료':'미열람')):(c.quote?'현재 견적 기준 가견적 화면 예시 미리보기 가능':'원본 엑셀을 등록해 가견적을 발행하세요')}</div>
        <div class="qs-actions">
          ${c.quote?btn(c.roughQuote?'가견적 미리보기':'가견적 예시보기','preview','eye','sm soft',`data-id="${id}" data-type="가견적"`):''}
          ${c.roughQuote?btn('가견적 발송','send-quote','send','sm primary',`data-id="${id}" data-type="가견적"`):''}
          ${role==='본사 관리자'?btn(c.roughQuote?'가견적 재작성':'가견적 작성','new-quote','plus','sm',`data-id="${id}" data-type="가견적"`):''}
          ${btn('링크','rough-quote-link','link','sm',`data-id="${id}"`)}
        </div>
      </div>
      <div class="quote-stage-card is-final">
        <div class="qs-head"><b>최종견적 (실측 확정안)</b>${c.finalQuote?badge('v'+c.finalQuote.version+' 발행완료','green'):badge('실측 후 확정 대기','gray')}</div>
        <div class="qs-price ${c.finalQuote?'':'empty-price'}">${c.finalQuote?won(c.finalQuote.totalPrice):'아직 발행된 최종견적이 없습니다'}</div>
        <div class="qs-meta">${c.finalQuote?('발행일 '+esc(c.finalQuote.date)+' · '+(c.finalQuote.viewed?'고객 열람완료':'미열람')):(c.quote?'발행 전 최종견적 모바일 화면 예시 미리보기 가능':'방문 실측 후 최종견적을 확정 발행하세요')}</div>
        <div class="qs-actions">
          ${c.quote?btn(c.finalQuote?'최종견적 미리보기':'최종견적 예시보기','preview','eye','sm soft',`data-id="${id}" data-type="최종견적"`):''}
          ${c.finalQuote?btn('최종견적 발송','send-quote','send','sm primary',`data-id="${id}" data-type="최종견적"`):''}
          ${role==='본사 관리자'?btn(c.finalQuote?'최종견적 수정':'최종견적 작성','new-quote','plus','sm',`data-id="${id}" data-type="최종견적"`):''}
          ${btn('링크','final-quote-link','link','sm',`data-id="${id}"`)}
        </div>
      </div>
    </div>
    <div class="actions" style="margin-bottom:14px">
      ${role==='본사 관리자'?btn('새 견적서 작성','new-quote','plus','primary sm',`data-id="${id}"`):btn('본사 견적 요청','request-quote','plus','primary sm',`data-id="${id}"`)}
      ${c.quote?btn('문자·카톡 발송창 열기','send-quote','send','sm soft',`data-id="${id}"`)+btn('대표 링크 복사','copy-quote','copy','sm',`data-id="${id}"`):''}
    </div>
    ${(c.publishedQuotes&&c.publishedQuotes.length)?`<h4 style="margin:8px 0 10px;font-size:12px">발행 견적 버전 히스토리 (${c.publishedQuotes.length}건)</h4>`+c.publishedQuotes.map(pq=>`<div class="file-card" style="flex-wrap:wrap">${icon('file')}<div style="flex:1;min-width:160px"><b>[v${pq.version} · ${esc(pq.quoteType)}] ${esc(pq.title)}</b><small>${won(pq.totalPrice)} · 발행일 ${esc(pq.date)} · ${pq.viewed?'고객 열람완료':'미열람'}</small></div><div class="actions">${btn('미리보기','preview','eye','sm soft',`data-id="${id}" data-type="${esc(pq.quoteType)}" data-quote-id="${pq.id}"`)}${btn('발송','send-quote','send','sm',`data-id="${id}" data-type="${esc(pq.quoteType)}"`)}</div></div>`).join(''):(c.quote?'':'<div class="notice-text">아직 발행된 견적이 없습니다. 원본 엑셀을 등록해 가견적 또는 최종견적을 작성하세요.</div>')}
  `;
if(tab==='contract')content=`${db.contracts.filter(k=>k.cid===c.id).map(k=>`<div class="file-card">${icon('contract')}<div><b>${k.id}</b><small>${k.type} · ${won(k.amount)}</small></div>${btn('보기','contract','','sm soft',`data-id="${k.id}"`)}</div>`).join('')||'<div class="empty">등록된 계약이 없습니다.</div>'}${btn('계약 등록','new-contract','plus','primary sm',`data-id="${id}"`)}`;
if(tab==='files')content=`<div class="notice-text">공사 현장 사진·도면·내관도 링크를 한곳에서 관리합니다.</div><div class="file-card" style="margin-top:15px">${icon('link')}<div style="flex:1"><b>내관도 링크</b><small>${c.drawing?esc(c.drawing):'등록된 내관도 링크가 없습니다.'}</small></div><div class="actions">${c.drawing?`<a class="btn sm soft" href="${esc(c.drawing)}" target="_blank" rel="noopener noreferrer">${icon('external')}바로가기</a>`:''}${btn('관리','drawing','edit','sm',`data-id="${id}"`)}</div></div><div class="field"><label>공사 희망사항</label><textarea id="case-description">${esc(c.description||c.note)}</textarea></div>${btn('공사정보 저장','save-description','check','sm soft',`data-id="${id}"`)}`;
const body=`<div class="customer-detail" data-detail-tab="${tab}"><div class="mobile-cust-strip">${badge(c.status)}${c.label!=='일반'?badge(c.label,c.label==='긴급'?'red':c.label==='완료'?'green':'orange'):''}<span>담당 ${esc(c.owner)}</span>${c.measure?`<span>· 실측 ${esc(c.measure.slice(5))}</span>`:''}<button type="button" class="link-chip" style="margin-left:auto" data-action="detail-tab" data-value="${tab==='manage'?'notes':'manage'}" data-id="${id}">${tab==='manage'?'상담이력 보기':'상태·링크 변경'}</button></div><div class="tabs mobile-detail-tabs">${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료'],['manage','상태·링크'],['history','히스토리']].map(([v,l])=>`<button class="tab ${tab===v?'active':''}" data-action="detail-tab" data-value="${v}" data-id="${id}">${l}</button>`).join('')}</div><aside class="detail-side"><div class="detail-box"><h4>${icon('settings')}상태 및 담당자</h4>${selectField('진행구분','detail-status',stages,c.status)}${selectField('진행라벨','detail-label',db.labels.map(l=>l.name),c.label)}${selectField('담당 상담사','detail-owner',['미배정','오영진','김정연','마지희'],c.owner)}${field('유입채널','detail-source',c.source)}</div><div class="detail-box"><h4>${icon('calendar')}일정 관리</h4>${field('실측 예정일','detail-measure',c.measure,'date')}${field('시공 예정일','detail-build',c.build,'date')}</div><div class="detail-box links"><h4>${icon('link')}견적 · 내관도</h4><div style="display:flex;flex-direction:column;gap:8px">${quoteSideRow('가견적','가견적',c.roughQuote,c.roughQuoteUrl,'rough-quote-link',id,Boolean(c.quote))}${quoteSideRow('최종견적','최종견적',c.finalQuote,c.finalQuoteUrl,'final-quote-link',id,Boolean(c.quote))}${linkRow('내관도',c.drawing,'drawing',id,'내관도 관리')}</div></div>${btn('변경사항 저장','save-customer','check','primary block',`data-id="${id}"`)}</aside><section class="detail-center"><div class="tabs desktop-detail-tabs">${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료']].map(([v,l])=>`<button class="tab ${tab===v?'active':''}" data-action="detail-tab" data-value="${v}" data-id="${id}">${l}</button>`).join('')}</div><div class="detail-content">${content}</div>${['notes','feedback'].includes(tab)?`<form class="note-compose" data-submit="note" data-id="${id}" data-type="${tab}"><div class="compose-top"><span>작성자 ${role==='본사 관리자'?'김지훈':'파트너 관리자'}</span><label><input type="checkbox" name="important"> 중요</label></div><div class="compose-box"><textarea name="note" placeholder="${tab==='notes'?'상담 내용과 다음 진행사항을 기록하세요.':'영업지원팀 피드백을 기록하세요.'}" aria-label="상담 내용" required></textarea><button type="submit" class="btn primary" aria-label="기록 등록">${icon('send')}</button></div></form>`:''}</section><aside class="detail-history"><h4>${icon('history')}변경 히스토리</h4>${[...(db.history[id]||[]),{date:c.date.slice(5)+' 09:30',text:'고객 접수 · '+c.source,by:'시스템'},{date:c.date.slice(5)+' 09:30',text:'담당자 '+c.owner,by:'운영관리자'}].map(h=>`<div class="history-item"><time>${esc(h.date)}</time><p>${esc(h.text)}</p><small>${esc(h.by)}</small></div>`).join('')}</aside></div>`;
openDialog(`${esc(c.name)} <span style="font-size:11px;font-weight:400;color:#91a6c9;margin-left:8px">No. ${c.id}</span>`,body,'','wide',`${esc(c.phone)}　｜　${esc(c.address)}`,true,'customer-detail');detailId=c.id;detailTab=tab;
}
function openNewCustomer(){formDialog('새 고객 등록',`<div class="notice-text" style="margin-bottom:20px">체험용 고객을 등록합니다. 실제 개인정보 대신 예시 정보를 입력해 주세요.</div><div class="field-grid">${field('고객명','name','','text',true)}${field('연락처','phone','010-0000-','tel',true)}${selectField('상품군','product',['창호','주방','욕실'],'창호')}${selectField('담당 상담사','owner',['미배정','오영진','김정연','마지희'],'미배정')}${selectField('소속 파트너','partner',role==='본사 관리자'?['직영',...db.partners.map(p=>p.name)]:['한빛인테리어'],role==='본사 관리자'?'직영':'한빛인테리어')}${field('유입채널','source','직접등록')}</div>${field('공사 주소','address','','text',true)}<div class="field"><label>공사 희망사항</label><textarea name="note" placeholder="공사 범위와 희망 일정을 입력하세요."></textarea></div>`,'customer','고객과 공사건이 함께 생성됩니다.')}
function openEditor(id,presetType=''){if(role!=='본사 관리자'){if(id){audit(id,'파트너 견적 요청');toast('본사 견적 요청이 기록되었습니다.')}return}const cs=visibleCustomers();if(!cs.length)return;const c=accessibleC(id)||cs.find(x=>x.status==='가견적요청')||cs[0];const initType=presetType||(c.roughQuote&&!c.finalQuote?'최종견적':'가견적');editor={cid:c.id,margin:20,discount:0,type:initType,source:'',title:initType==='최종견적'?`${c.product} 방문실측 확정 견적서`:`${c.product} 교체 제안`,items:[{name:c.product==='창호'?'거실 발코니 이중창':c.product==='주방'?'주방 상·하부장':'욕실 기본 시공',spec:'맞춤 규격',qty:1,price:3200000},{name:c.product==='창호'?'안방·침실 창호':'부자재 및 마감',spec:'현장 규격 확인',qty:2,price:1800000},{name:'철거 · 설치 및 마감',spec:'기본 시공',qty:1,price:1200000}]};renderEditor()}
function editorTotal(){const cost=editor.items.reduce((s,i)=>s+parseNum(i.qty)*parseNum(i.price),0);const sale=Math.round(cost/(1-editor.margin/100));const vat=Math.round(sale*.1);return {cost,sale,vat,total:sale+vat,profit:sale-cost}}
function editorSummary(){const t=editorTotal();return `<div class="summary-line"><span>공급원가 합계</span><b>${won(t.cost)}</b></div><div class="summary-line"><span>판매 공급가액</span><b>${won(t.sale)}</b></div><div class="summary-line"><span>부가세 10%</span><b>${won(t.vat)}</b></div><div class="summary-total"><span style="font-size:11px;color:#8498b6">고객 최종 견적금액</span><b>${won(t.total)}</b></div><div class="divider"></div><div class="summary-line"><span>매출총이익 · VAT 제외</span><b style="color:var(--green)">${won(t.profit)}</b></div><p class="field-hint">PG·영업 수수료 등 기타 비용 차감 전입니다.</p>`}
function renderEditor(){const c=findC(editor.cid);openDialog('고객 견적서 만들기',`<div class="steps"><span>${'<i>1</i>'}원본 등록</span><span class="active"><i>2</i>판매가 설정</span><span><i>3</i>견적 발행</span></div><div class="dialog-body"><div class="editor-layout"><section><div class="field-grid"><div class="field"><label>고객 · 공사건</label><select class="input" id="quote-customer">${visibleCustomers().map(x=>`<option value="${x.id}" ${editor.cid===x.id?'selected':''}>${esc(x.name)} · ${x.product} / No.${x.id}</option>`).join('')}</select></div>${selectField('견적 구분','quote-type',['가견적','최종견적','비교안'],editor.type)}</div><div class="field"><label>견적 제목</label><input class="input" id="quote-title" value="${esc(editor.title)}"></div><div class="dropzone">${icon('upload')}<div><b id="upload-name">${editor.source?esc(editor.source):'원본 견적 파일 등록'}</b><small>CSV 품목 가져오기 · XLSX 파일 선택 확인</small></div><label class="btn sm" for="quote-file" style="cursor:pointer">파일 선택</label><input type="file" id="quote-file" accept=".csv,.xlsx,.xls" hidden></div><div class="panel-caption" style="margin:-6px 0 14px">KCC 글라스 공식 창호 견적서(XLSX) 및 표준 CSV 파일 자동 분석이 지원됩니다.</div><div class="actions" style="justify-content:space-between;margin-bottom:10px"><b style="font-size:12px">견적 품목</b>${btn('CSV 샘플','sample-csv','download','sm')}</div><div class="table-wrap"><table class="quote-table"><thead><tr><th>품목</th><th>수량</th><th>원가 단가</th><th>합계</th></tr></thead><tbody>${editor.items.map((item,i)=>`<tr><td class="qt-item-cell"><input class="item-name" aria-label="품목 ${i+1} 이름" data-item="${i}" data-key="name" value="${esc(item.name)}"><small>${esc(item.spec)}</small></td><td class="qt-qty-cell" data-label="수량"><input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 ${i+1} 수량" data-item="${i}" data-key="qty" value="${num(item.qty)}"></td><td class="qt-price-cell" data-label="원가 단가"><input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 ${i+1} 단가" data-item="${i}" data-key="price" value="${num(item.price)}"></td><td class="money qt-total-cell" data-label="합계" id="item-total-${i}">${won(item.qty*item.price)}</td></tr>`).join('')}</tbody></table></div><div class="actions" style="margin-top:15px">${btn('품목 추가','add-item','plus','sm')}</div><div class="notice-text" style="margin-top:17px">원본 금액과 품목을 확인한 뒤 발행하세요. 발행본은 고객·공사건에 연결되며 기존 발행 기록은 보관됩니다.</div></section><aside class="summary-box"><h3>판매가 설정</h3><label class="field-hint" for="margin-input">매출 기준 마진율</label><div class="margin-control"><input class="input" type="number" id="margin-input" min="0" max="60" step=".5" value="${editor.margin}"><span>%</span></div><input id="margin-range" type="range" min="0" max="60" step=".5" value="${editor.margin}" aria-label="마진율 슬라이더"><div class="field" style="margin:8px 0 14px"><label for="discount-input">일시불 할인 표시액 (선택)</label><input class="input money" type="text" id="discount-input" inputmode="numeric" data-money="1" value="${num(editor.discount||0)}" placeholder="0"></div><div id="quote-summary">${editorSummary()}</div></aside></div></div>`,`${btn('취소','close')}${btn('가견적 미리보기','editor-preview','eye','soft','data-type="가견적"')}${btn('최종견적 미리보기','editor-preview','eye','soft','data-type="최종견적"')}${btn('견적 발행하기','publish-quote','send','primary')}`,'quote-dialog',`${esc(c.name)} 고객의 공사 견적을 작성합니다.`,false,'quote-editor')}
function quoteMarkup(c,q=null){const total=q?.total||c.quote,items=q?.items||[{name:c.product+' 맞춤 시공',qty:1},{name:'철거 · 설치 및 마감',qty:1}];return `<div class="phone-preview"><div class="phone-top"><div class="phone-brand">${symbol()} KCC 홈씨씨 · 나의 공사 견적</div><h2>${esc(c.name)}님을 위한<br>더 편안한 우리 집.</h2><p>${esc(c.address)}<br>${esc(q?.title||c.product+' 교체 견적')} · ${q?.type||'가견적'}</p></div><div class="phone-body"><div class="phone-price">고객 견적금액<strong>${won(total)}</strong><small>부가세 포함 · 현장 실측 및 공사 조건에 따라 변경 가능</small></div><section class="phone-block"><h4>공사 내용</h4>${items.map(i=>`<div class="summary-line"><span>${esc(i.name)}</span><b>${i.qty}식</b></div>`).join('')}</section><section class="phone-block"><h4>원하시는 방법으로 진행하세요.</h4><div class="phone-actions">${btn('상담 요청','mobile-consult','phone','',`data-id="${c.id}"`)}${btn('실측 신청','schedule','calendar','soft',`data-id="${c.id}"`)}</div><div class="divider" style="margin:15px 0"></div><div class="summary-line"><span>렌탈 신청</span><b>조건 확인 후 상담</b></div><p class="field-hint">월 납부금과 기간은 렌탈사 최종 조건에 따라 확정됩니다.</p>${btn('렌탈 신청 체험','rental-start','arrow','primary block',`data-id="${c.id}"`)}</section><p style="text-align:center;font-size:9px;color:#a8b3c3">(주)라이프앤조이 · KCC홈씨씨 파트너<br>고객 화면 미리보기 · 실제 신청 및 결제 미연결</p></div></div>`}
function openPreview(id, q = null, viewMode = 'quote', preferredType = '', quoteId = null) {
  const c = accessibleC(id);
  if (!c) return;
  if (!q && !c.quote) {
    toast('발행된 견적이 없습니다.');
    return;
  }
  quotePreviewId = c.id;
  previewViewMode = viewMode;
  activeDraftPreview = q || null;
  previewQuoteId = quoteId || null;
  previewQuoteType = preferredType || (q ? (q.type || '가견적') : (c.quoteType || (c.finalQuote ? '최종견적' : '가견적')));

  let iframeSrc = '';
  if (q) {
    const draftClone = { ...q, type: previewQuoteType };
    const draftPayload = buildDraftMobileQuote(c, draftClone, draftClone);
    sessionStorage.setItem('kcc_draft_quote_preview', JSON.stringify(draftPayload));
    iframeSrc = '/quote.html?preview=1&embed=1&draft=1&type=' + encodeURIComponent(previewQuoteType) + '&view=' + encodeURIComponent(previewViewMode) + '&device=' + encodeURIComponent(previewDeviceWidth);
  } else {
    const fallbackTotal = Number((previewQuoteType === '최종견적' ? c.finalQuote?.totalPrice : c.roughQuote?.totalPrice) || c.quote) || 0;
    const fallbackSale = Math.round(fallbackTotal / 1.1);
    const fallbackPayload = buildDraftMobileQuote(
      c,
      {
        margin: 20,
        discount: 0,
        type: previewQuoteType,
        title: (c.product || '창호') + ' ' + previewQuoteType,
        items: [
          { name: (c.product || '창호') + ' 맞춤 시공 패키지', spec: '현장 맞춤 규격', qty: 1, price: Math.round(fallbackSale * 0.8) }
        ]
      },
      { total: fallbackTotal, sale: fallbackSale, vat: fallbackTotal - fallbackSale }
    );
    sessionStorage.setItem('kcc_fallback_quote_preview', JSON.stringify(fallbackPayload));
    const qIdParam = previewQuoteId ? ('&quoteId=' + encodeURIComponent(previewQuoteId)) : '';
    iframeSrc = '/quote.html?preview=1&embed=1&projectId=' + encodeURIComponent(c.id) + '&type=' + encodeURIComponent(previewQuoteType) + qIdParam + '&view=' + encodeURIComponent(previewViewMode) + '&device=' + encodeURIComponent(previewDeviceWidth);
  }

  const activeMeta = previewQuoteType === '최종견적' ? c.finalQuote : c.roughQuote;
  const activeTok = activeMeta?.token || c.token || ('tok_' + c.id + '_demo');
  const publicLink = '/quote.html?token=' + encodeURIComponent(activeTok);

  const roughLabel = q
    ? '가견적 초안'
    : ('가견적' + (c.roughQuote ? '<em>' + won(c.roughQuote.totalPrice) + '</em>' : '<em>예시</em>'));
  const finalLabel = q
    ? '최종견적 초안'
    : ('최종견적' + (c.finalQuote ? '<em>' + won(c.finalQuote.totalPrice) + '</em>' : '<em>예시</em>'));

  const toolbar = '<div class="preview-toolbar">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<span style="font-size:11px;font-weight:700;color:#41536d">견적 구분</span>' +
      '<div class="seg-group">' +
        '<button type="button" class="seg-btn ' + (previewQuoteType === '가견적' ? 'rough-active active' : '') + '" data-action="prev-quote-type" data-value="가견적">' + roughLabel + '</button>' +
        '<button type="button" class="seg-btn ' + (previewQuoteType === '최종견적' ? 'final-active active' : '') + '" data-action="prev-quote-type" data-value="최종견적">' + finalLabel + '</button>' +
      '</div>' +
      '<span style="font-size:11px;font-weight:700;color:#41536d;margin-left:4px">화면</span>' +
      '<div class="seg-group">' +
        '<button type="button" class="seg-btn ' + (previewViewMode === 'quote' ? 'active' : '') + '" data-action="prev-view" data-value="quote">견적서 본문</button>' +
        '<button type="button" class="seg-btn ' + (previewViewMode === 'login' ? 'active' : '') + '" data-action="prev-view" data-value="login">고객 로그인창</button>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<div class="seg-group hide-on-mobile">' +
        '<button type="button" class="seg-btn ' + (previewDeviceWidth === 'mobile' ? 'active' : '') + '" data-action="prev-width" data-value="mobile">모바일 (390px)</button>' +
        '<button type="button" class="seg-btn ' + (previewDeviceWidth === 'wide' ? 'active' : '') + '" data-action="prev-width" data-value="wide">PC 와이드</button>' +
      '</div>' +
      (!q ? '<a class="btn sm" id="preview-open-ext" href="' + publicLink + '" target="_blank" rel="noopener noreferrer">' + icon('external') + '고객창 열기</a>' : '') +
    '</div>' +
  '</div>' + buildPreviewBannerHtml(c, q, previewQuoteType);

  const body = toolbar + '<div class="dialog-body preview-stage">' +
    '<div id="crm-preview-frame" class="mobile-iframe-frame ' + (previewDeviceWidth === 'wide' ? 'wide-mode' : '') + '">' +
      '<iframe id="crm-quote-iframe" title="모바일 견적서 미리보기" src="' + iframeSrc + '"></iframe>' +
    '</div>' +
  '</div>';

  const footer = q
    ? '<small>작성 중인 [' + esc(previewQuoteType) + '] 미리보기입니다. 상단에서 가견적/최종견적 표기를 전환해 확인할 수 있습니다.</small>' +
      btn('견적 편집으로', 'back-editor', 'edit') +
      btn('이 내용으로 발행하기', 'publish-quote', 'send', 'primary') +
      btn('닫기', 'close')
    : '<small>고객에게는 공급원가와 내부 마진이 절대 노출되지 않습니다.</small>' +
      '<button class="btn" id="preview-copy-btn" data-action="copy-quote" data-id="' + c.id + '" data-type="' + esc(previewQuoteType) + '">' + icon('link') + esc(previewQuoteType) + ' 링크 복사</button>' +
      '<button class="btn primary" id="preview-send-btn" data-action="send-quote" data-id="' + c.id + '" data-type="' + esc(previewQuoteType) + '">' + icon('send') + esc(previewQuoteType) + ' 문자·카톡 발송</button>' +
      btn('닫기', 'close');

  openDialog(
    '고객용 모바일 견적서 미리보기 (가견적 · 최종견적)',
    body,
    footer,
    'preview-drawer' + (previewDeviceWidth === 'wide' ? ' wide-drawer' : ''),
    esc(c.name) + ' 고객 · 본인 이름/휴대폰 로그인 보호 적용',
    true,
    'quote-preview'
  );

  const ifr = $('#crm-quote-iframe');
  if (ifr) {
    ifr.addEventListener('load', () => {
      ifr.contentWindow?.postMessage({ type: 'SET_PREVIEW_DEVICE', device: previewDeviceWidth }, '*');
      ifr.contentWindow?.postMessage({ type: 'SET_PREVIEW_VIEW', view: previewViewMode }, '*');
    });
  }
}
function openContract(id){const k=db.contracts.find(k=>k.id===id);if(!k||!accessibleC(k.cid))return;const c=findC(k.cid);openDialog('계약 상세',`<div class="dialog-body"><div class="info-grid"><div><label>고객</label><b>${esc(c.name)} · ${esc(c.product)}</b></div><div><label>계약번호</label><b>${k.id}</b></div><div><label>결제방식</label>${badge(k.type,k.type==='렌탈'?'purple':'')}</div><div><label>계약·수납 상태</label>${badge(k.status)}</div></div><div class="divider"></div><div class="mini-stat"><span>계약금액</span><b>${won(k.amount)}</b></div><div class="mini-stat"><span>수납액</span><b style="color:var(--green)">${won(k.paid)}</b></div><div class="mini-stat"><span>${k.type==='렌탈'?'렌탈사 정산 전':'남은 수납액'}</span><b style="color:var(--blue)">${won(k.amount-k.paid)}</b></div><div class="divider"></div><div class="info-grid"><div><label>실측일</label><b>${c.measure||'미정'}</b></div><div><label>시공 예정일</label><b>${c.build||'미정'}</b></div></div><div class="notice-text" style="margin-top:20px">체험용 계약 정보입니다. 실제 계약서 서명, 카드 승인 및 렌탈 약정은 연결되어 있지 않습니다.</div></div>`,`${btn('고객 보기','customer','users','',`data-id="${c.id}"`)}${c.quote?btn('가견적 보기','preview','eye','soft',`data-id="${c.id}" data-type="가견적"`)+btn('최종견적 보기','preview','eye','soft',`data-id="${c.id}" data-type="최종견적"`):''}${k.type==='일시불'?btn('수납 등록','receipt','credit','primary',`data-id="${k.id}"`):btn('렌탈 신청 확인','find-application','file','primary',`data-id="${c.id}"`)}`,'',`${esc(c.name)} 고객의 계약·결제 현황`,false,'contract-detail')}
function openApplication(id){const a=db.applications.find(x=>x.id===id);if(!a||!accessibleC(a.cid))return;const c=findC(a.cid);openDialog('렌탈 신청 상세',`<div class="dialog-body"><div class="timeline-strip">${['신청접수','서류검토','심사','약정'].map((s,i)=>`<span class="${i<2?'done':''}">${s}</span>`).join('')}</div><div class="info-grid"><div><label>고객명</label><b>${esc(c.name)}</b></div><div><label>신청번호</label><b>${a.id}</b></div><div><label>희망 기간</label><b>${a.plan}</b></div><div><label>월 납부금 · 예시</label><b>${won(a.monthly)}</b></div></div><div class="divider"></div><div class="file-card">${icon('shield')}<div><b>신분확인 서류</b><small>화면 설계용 영역 · 실제 신분증 미보관</small></div>${badge('확인 대상','orange')}</div><div class="file-card">${icon('edit')}<div><b>개인정보 동의 · 서명</b><small>양식 버전 및 제출 시각 관리 영역</small></div>${badge(a.consent?'체험 동의':'예시','gray')}</div><form data-submit="application" data-id="${a.id}">${selectField('처리 상태','app-status',['서류검토','보완요청','심사중','승인','반려','약정완료'],a.status)}<div class="field"><label>검토 내용 / 보완 요청 사유</label><textarea name="review" placeholder="확인한 내용과 보완할 항목을 기록하세요.">${esc(a.review||'')}</textarea></div><button class="btn primary block" type="submit">검토 결과 저장</button></form><p class="field-hint">상태 변경은 체험 데이터에만 반영됩니다. 실제 심사 결과를 대신하지 않습니다.</p></div>`,'','','신청서·제출서류·처리 이력을 한곳에서 확인합니다.',false,'application-detail')}
let rentalDraft=null;
function rentalStep(step){const c=accessibleC(rentalDraft.cid);if(!c)return;let body='';if(step===1)body=`<div class="notice-text" style="margin-bottom:17px">렌탈 신청 화면 체험입니다. 실제 접수되지 않으며 예시 정보만 입력해 주세요.</div><div class="field-grid">${field('신청자명','r-name',rentalDraft.name,'text',true)}${field('휴대폰','r-phone',rentalDraft.phone,'tel',true)}</div>${field('설치 주소','r-address',rentalDraft.address,'text',true)}${selectField('희망 기간','r-plan',['36개월','48개월','60개월'],rentalDraft.plan)}<button class="btn primary block" type="submit">다음 · 제출서류 확인 ${icon('arrow')}</button>`;if(step===2)body=`<div class="file-card">${icon('shield')}<div><b>신분증 제출 영역</b><small>실제 운영 시 본인확인 서류를 안전하게 제출합니다.</small></div></div><div class="notice-text">이 체험 화면에서는 실제 신분증을 받지 않습니다. ‘예시 서류 확인’으로 다음 단계를 확인할 수 있습니다.</div><label class="checkline"><input type="checkbox" name="sample" required>예시 서류 제출 화면을 확인했습니다.</label><button class="btn primary block" type="submit">다음 · 동의 및 신청 확인 ${icon('arrow')}</button>`;if(step===3)body=`<div class="info-grid"><div><label>신청자</label><b>${esc(rentalDraft.name)}</b></div><div><label>희망 기간</label><b>${rentalDraft.plan}</b></div></div><div class="divider"></div><div class="notice-text">신청 접수 후 담당자가 조건 및 서류를 확인하는 흐름입니다. 신청 접수만으로 렌탈 계약이 체결되지는 않습니다.</div><label class="checkline"><input type="checkbox" name="consent" required>체험용 개인정보 동의 화면을 확인했습니다.</label><div class="field"><label>신청 확인 · 이름 입력</label><input class="input" name="signature" required placeholder="${esc(rentalDraft.name)}"></div><button class="btn primary block" type="submit">체험 신청 완료</button>`;openDialog('렌탈 신청',`<div class="steps">${['신청정보','제출서류','동의·확인'].map((s,i)=>`<span class="${i+1===step?'active':''}"><i>${i+1}</i>${s}</span>`).join('')}</div><form data-submit="rental" data-step="${step}"><div class="dialog-body">${body}</div></form>`,'','','고객 견적서에서 바로 이어지는 신청 흐름',false,'rental-step')}
function showSchedule(id){const c=accessibleC(id)||visibleCustomers()[0];formDialog('실측 일정 등록',`<div class="field"><label>고객·공사건</label><select name="cid" class="input">${visibleCustomers().map(x=>`<option value="${x.id}" ${x.id===c?.id?'selected':''}>${esc(x.name)} · ${esc(x.address)}</option>`).join('')}</select></div><div class="field-grid">${field('희망일','date',c?.measure||'2026-11-13','date',true)}${selectField('희망 시간대','time',['오전 10:00','오후 14:00','오후 16:00'],'오후 14:00')}</div><div class="notice-text">체험 데이터에 실측 예정 일정을 등록합니다. 실제 방문 일정은 담당팀 배정 후 확정합니다.</div>`,'schedule','방문 일정과 현장 정보를 함께 관리합니다.')}
function download(name,content,mime='text/csv;charset=utf-8'){const blob=new Blob(['\ufeff',content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvCell(v){let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('링크를 복사했습니다.')}catch{openDialog('링크 복사',`<div class="dialog-body"><input class="input" value="${esc(text)}" readonly style="width:100%"><p class="field-hint">링크를 선택해 복사해 주세요.</p></div>`, '', '', '', false, 'copy-link')}}
function productURL(i){const p=db.products[i];if(!p.url)return '';try{const u=new URL(p.url);u.searchParams.set('partner',role==='본사 관리자'?'lifeandjoy':'hanbit');u.searchParams.set('utm_source',role==='본사 관리자'?'crm':'partner');u.searchParams.set('utm_medium','referral');return u.href}catch{return ''}}
function normalizeURL(url){const s=String(url??'').trim();if(!s)return '';return /^https?:\/\//i.test(s)?s:'https://'+s}
function validateURL(url){if(!url)return true;try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)&&Boolean(u.hostname)}catch{return false}}
document.addEventListener('click',async e=>{if(e.target.matches('.overlay')){e.preventDefault();e.stopPropagation();return}if(e.target.matches('input[type=checkbox]'))return;const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,id=el.dataset.id,v=el.dataset.value;
switch(a){case'toggle-nav':setMobileNav(!mobileNavOpen);break;case'close-nav':setMobileNav(false);break;case'nav':setMobileNav(false);page=el.dataset.page;selected.clear();render();window.scrollTo(0,0);break;case'close':{const dlgId=el.dataset.dialogId||el.closest('.overlay')?.dataset?.dialogId;closeDialog(dlgId||null);break;}case'customer':openCustomer(id);break;case'new-customer':openNewCustomer();break;case'customer-tab':customerTab=v;render();break;case'filter-all':stageFilter='';customerTab='all';render();break;case'filter-stage':stageFilter=v;customerTab='all';render();break;case'reset-filters':query='';stageFilter='';productFilter='';partnerFilter='';periodFilter='all';customerTab='all';render();break;case'detail-tab':openCustomer(id,v);break;case'contract-tab':contractTab=v;render();break;case'settings-tab':settingsTab=v;render();break;case'new-quote':openEditor(id, el.dataset.type || '');break;
  case'preview':openPreview(id, null, 'quote', el.dataset.type || '', el.dataset.quoteId || null);break;
  case'editor-preview':openPreview(editor.cid, { ...editor, ...editorTotal() }, 'quote', el.dataset.type || editor.type || '가견적');break;
  case'send-quote':openSendQuote(id, el.dataset.type || '');break;
  case'prev-quote-type':{
    previewQuoteType = v === '최종견적' ? '최종견적' : '가견적';
    previewQuoteId = null;
    $$('[data-action="prev-quote-type"]').forEach(b => {
      const isMatch = b.dataset.value === previewQuoteType;
      b.classList.toggle('active', isMatch);
      b.classList.toggle('rough-active', isMatch && previewQuoteType === '가견적');
      b.classList.toggle('final-active', isMatch && previewQuoteType === '최종견적');
    });
    const cCur = accessibleC(quotePreviewId);
    if (cCur) {
      const bannerEl = $('#preview-type-banner');
      if (bannerEl) bannerEl.outerHTML = buildPreviewBannerHtml(cCur, activeDraftPreview, previewQuoteType);
      if (!activeDraftPreview) {
        const meta = previewQuoteType === '최종견적' ? cCur.finalQuote : cCur.roughQuote;
        const tok = meta?.token || cCur.token || ('tok_' + cCur.id + '_demo');
        const extLink = $('#preview-open-ext');
        if (extLink) extLink.href = '/quote.html?token=' + encodeURIComponent(tok);
        const copyBtn = $('#preview-copy-btn');
        if (copyBtn) {
          copyBtn.dataset.type = previewQuoteType;
          copyBtn.innerHTML = icon('link') + esc(previewQuoteType) + ' 링크 복사';
        }
        const sendBtn = $('#preview-send-btn');
        if (sendBtn) {
          sendBtn.dataset.type = previewQuoteType;
          sendBtn.innerHTML = icon('send') + esc(previewQuoteType) + ' 문자·카톡 발송';
        }
      }
    }
    const ifr = $('#crm-quote-iframe');
    if (ifr?.contentWindow) {
      ifr.contentWindow.postMessage({ type: 'SET_PREVIEW_QUOTE_TYPE', quoteType: previewQuoteType }, '*');
    }
    break;
  }
  case'switch-send-quote-type':{
    if (!sendState) break;
    const nextType = v === '최종견적' ? '최종견적' : '가견적';
    const targetMeta = nextType === '최종견적' ? sendState.finalQuote : sendState.roughQuote;
    if (!targetMeta) {
      sendState.previewTab = nextType === '최종견적' ? 'final' : 'rough';
      renderSendDialog();
      toast('아직 정식 [' + nextType + ']이 발행 전입니다. 우측에서 ' + nextType + ' 화면 예시를 미리 확인하세요.');
      break;
    }
    sendState.quoteType = nextType;
    sendState.quoteId = targetMeta.id;
    sendState.totalPrice = targetMeta.total_price;
    sendState.quoteUrl = location.origin + '/quote.html?token=' + encodeURIComponent(targetMeta.access_token);
    sendState.tpl = nextType === '최종견적' ? 'final' : 'basic';
    sendState.message = makeSendTemplate(sendState.tpl, sendState.recipientName, sendState.product, sendState.quoteType, sendState.totalPrice, sendState.quoteUrl);
    renderSendDialog();
    toast('[' + nextType + ' · ' + won(sendState.totalPrice) + '] 발송 문구와 링크로 전환되었습니다.');
    break;
  }
  case'prev-view':{
    previewViewMode = v === 'login' ? 'login' : 'quote';
    $$('[data-action="prev-view"]').forEach(b => b.classList.toggle('active', b.dataset.value === previewViewMode));
    const ifr = $('#crm-quote-iframe');
    if (ifr?.contentWindow) ifr.contentWindow.postMessage({ type: 'SET_PREVIEW_VIEW', view: previewViewMode }, '*');
    break;
  }
  case'prev-width':{
    previewDeviceWidth = v === 'wide' ? 'wide' : 'mobile';
    $$('[data-action="prev-width"]').forEach(b => b.classList.toggle('active', b.dataset.value === previewDeviceWidth));
    $('#crm-preview-frame')?.classList.toggle('wide-mode', previewDeviceWidth === 'wide');
    $('.dialog.preview-drawer')?.classList.toggle('wide-drawer', previewDeviceWidth === 'wide');
    const ifr = $('#crm-quote-iframe');
    if (ifr?.contentWindow) ifr.contentWindow.postMessage({ type: 'SET_PREVIEW_DEVICE', device: previewDeviceWidth }, '*');
    break;
  }
  case'switch-send-ch':{
    if (sendState) {
      sendState.channel = v === 'sms' ? 'sms' : 'kakao';
      renderSendDialog();
    }
    break;
  }
  case'apply-send-tpl':{
    if (sendState) {
      sendState.tpl = v;
      sendState.message = makeSendTemplate(v, sendState.recipientName, sendState.product, sendState.quoteType, sendState.totalPrice, sendState.quoteUrl);
      sendState.previewTab = 'message';
      renderSendDialog();
    }
    break;
  }
  case'send-preview-tab':{
    if (sendState) {
      sendState.previewTab = v;
      renderSendDialog();
    }
    break;
  }
  case'copy-send-msg':{
    if (sendState) {
      copy(sendState.message);
      toast('안내 문구와 전용 견적서 링크를 클립보드에 복사했습니다.');
    }
    break;
  }
  case'submit-send-quote':{
    if (!sendState) break;
    const phoneVal = ($('#send-phone')?.value || sendState.recipientPhone || '').trim();
    const msgVal = ($('#send-message')?.value || sendState.message || '').trim();
    if (phoneVal.replace(/\D/g, '').length < 10) {
      toast('수신 휴대폰 번호 10~11자리를 확인해 주세요.');
      $('#send-phone')?.focus();
      break;
    }
    el.disabled = true;
    try {
      const res = await apiFetch('/api/quotes/by-project/' + sendState.cid + '/send', {
        method: 'POST',
        body: {
          channel: sendState.channel,
          quoteType: sendState.quoteType,
          quoteId: sendState.quoteId,
          recipientName: sendState.recipientName,
          recipientPhone: phoneVal,
          message: msgVal,
          origin: location.origin
        }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '발송 처리에 실패했습니다.');
      await syncFromServer();
      toast('[' + sendState.quoteType + '] ' + (sendState.channel === 'kakao' ? '카카오 알림톡' : '문자(LMS)') + ' 발송이 완료되었습니다!');
      await openSendQuote(sendState.cid, sendState.quoteType);
    } catch (err) {
      toast('발송 오류: ' + err.message);
      el.disabled = false;
    }
    break;
  }case'back-editor':renderEditor();break;case'add-item':editor.items.push({name:'추가 공사',spec:'직접 입력',qty:1,price:0});renderEditor();break;
case'save-customer':{
    const c=accessibleC(id);
    if(!c)break;
    const changes=[];
    for(const [key,sel,label] of [['status','detail-status','진행구분'],['label','detail-label','라벨'],['owner','detail-owner','담당자'],['source','detail-source','유입채널'],['measure','detail-measure','실측일'],['build','detail-build','시공일']]){
      const val=$('#'+sel).value;
      if(c[key]!==val){changes.push(label+': '+(c[key]||'미정')+' → '+(val||'미정'));c[key]=val}
    }
    try {
      const res = await apiFetch('/api/customers/' + id, {
        method: 'PATCH',
        body: { status: c.status, label: c.label, owner: c.owner, measure: c.measure, build: c.build }
      });
      if (res.ok) await syncFromServer();
    } catch (err) {}
    if(changes.length){
      audit(id,changes.join(' / '));
      render();
      openCustomer(id,detailTab);
      toast('고객 정보와 변경 이력을 저장했습니다.');
    } else {
      toast('변경된 내용이 없습니다.');
    }
    break;
  }
case'save-description':{const c=accessibleC(id);c.description=$('#case-description').value;audit(id,'공사 희망사항 수정');toast('공사 정보를 저장했습니다.');break}
case'publish-quote':{
    const c=accessibleC(editor.cid),t=editorTotal();
    if(!c||!t.cost||editor.items.some(i=>!i.name||!Number.isFinite(i.qty)||i.qty<=0||i.price<0)){toast('품목과 수량·금액을 확인해 주세요.');break}
    try {
      const res = await apiFetch('/api/quotes', {
        method: 'POST',
        body: {
          projectId: editor.cid,
          items: editor.items,
          marginRate: editor.margin,
          discountAmount: editor.discount || 0,
          quoteType: editor.type || '가견적',
          title: editor.title,
          memo: editor.memo,
          isPublish: true
        }
      });
      const qData = await res.json();
      if (res.ok) {
        c.quote = t.total;
        c.token = qData.access_token;
        c.quoteType = qData.quote_type || editor.type;
        c.status = editor.type === '최종견적' ? '최종견적' : '견적안내';
        audit(c.id, '견적서 v' + qData.version + ' 발행 · ' + won(t.total) + ' (원가 ' + won(t.cost) + ', 마진 ' + editor.margin + '%)');
        save();
        await syncFromServer();
        closeDialog('quote-editor');
        openPreview(c.id, null, 'quote', qData.quote_type || editor.type);
        toast('모바일 [' + (qData.quote_type || editor.type) + ']이 발행되었습니다. (v' + qData.version + ') 문자·카톡으로 바로 발송해보세요.');
        break;
      }
    } catch (err) {}
    const q={...JSON.parse(JSON.stringify(editor)),...t,date:now(),id:'Q-'+Date.now()};
    db.quotes.push(q);c.quote=t.total;c.viewed=false;c.status=editor.type==='최종견적'?'최종견적':'견적안내';c.note=editor.type+' 발행 · '+won(t.total);
    audit(c.id,editor.type+' 발행 '+won(t.total)+' · 마진 '+editor.margin+'%');
    render();
    closeDialog('quote-editor');
    openPreview(c.id,q);toast('고객 견적을 발행했습니다.');
    break;
  }
case'sample-csv':download('homecc-estimate-sample.csv','품목,규격,수량,원가단가\n거실 발코니 이중창,맞춤규격,1,3200000\n안방 침실 창호,맞춤규격,2,1800000\n철거 및 설치,기본시공,1,1200000');break;
case'export':{const cs=filteredCustomers();download('homecc-customers.csv',[['고객번호','고객명','연락처','공사주소','상품군','진행구분','담당자','파트너'],...cs.map(c=>[c.id,c.name,c.phone,c.address,c.product,c.status,c.owner,c.partner])].map(r=>r.map(csvCell).join(',')).join('\r\n'));toast('현재 검색 결과를 CSV로 내려받았습니다.');break}
case'calendar':{const cs=visibleCustomers().filter(c=>c.measure||c.build);openDialog('실측·시공 일정',`<div class="dialog-body">${cs.map(c=>`<div class="notification" data-action="customer" data-id="${c.id}">${icon('calendar')}<div><b>${esc(c.name)} · ${c.product}</b><small>실측 ${c.measure||'미정'}　/　시공 ${c.build||'미정'}</small></div></div>`).join('')||'<div class="empty">등록된 일정이 없습니다.</div>'}</div>`,btn('일정 등록','schedule','plus','primary'),'','공사건별 예정 일정');break}case'schedule':showSchedule(id);break;
case'notifications':{const cs=visibleCustomers().filter(c=>c.owner==='미배정'||c.status==='가견적요청'||c.status==='실측예정');openDialog('오늘 확인할 업무',`<div class="dialog-body">${cs.map(c=>`<div class="notification" data-action="customer" data-id="${c.id}">${icon(c.status==='실측예정'?'calendar':'clock')}<div><b>${esc(c.name)} · ${c.status}</b><small>${esc(c.owner==='미배정'?'담당 상담사를 배정해 주세요.':c.note)}</small></div>${icon('chevron')}</div>`).join('')||'<div class="empty">현재 대기 업무가 없습니다.</div>'}</div>`,'','','고객별 다음 업무를 바로 확인하세요.');break}
case'assign':if(!selected.size){toast('고객을 먼저 선택하세요.');break}formDialog('담당자 일괄 배정',selectField('담당 상담사','owner',['오영진','김정연','마지희','미배정'],'오영진'),'assign',`${selected.size}명의 선택 고객에 적용`);break;
case'rough-quote-link':{const c=accessibleC(id);if(c)linkDialog('가견적 링크 관리','가견적',c.roughQuoteUrl,'rough-quote-link',id,c.name);break}
case'final-quote-link':{const c=accessibleC(id);if(c)linkDialog('최종견적 링크 관리','최종견적',c.finalQuoteUrl,'final-quote-link',id,c.name);break}
case'drawing':{const c=accessibleC(id);if(c)linkDialog('내관도 링크 관리','내관도',c.drawing,'drawing',id,c.name);break}
case'contract':openContract(id);break;case'application':openApplication(id);break;case'find-application':{const app=db.applications.find(x=>x.cid===Number(id));if(app)openApplication(app.id);else toast('아직 접수된 렌탈 신청이 없습니다.');break}
case'new-contract':{const cs=visibleCustomers().filter(c=>c.quote>0&&!db.contracts.some(k=>k.cid===c.id));if(!cs.length){toast('계약할 수 있는 미계약 견적이 없습니다. 먼저 견적을 발행해 주세요.');break}formDialog('계약 등록',`<div class="field"><label>확정 견적 선택</label><select class="input" name="cid">${cs.map(c=>`<option value="${c.id}" ${c.id===Number(id)?'selected':''}>${esc(c.name)} · ${won(c.quote)}</option>`).join('')}</select></div>${selectField('구매방식','type',['일시불','렌탈'],'일시불')}<div class="notice-text">계약 등록 시 현재 견적금액을 고정합니다. 이 화면은 체험용 계약대장으로 실제 계약서 서명을 대체하지 않습니다.</div>`,'contract');break}
case'receipt':{const k=db.contracts.find(k=>k.id===id);const remain=k.amount-k.paid;if(remain<=0){toast('이미 전액 수납된 계약입니다.');break}formDialog('수납 등록',`${selectField('수납 구분','phase',['선금','잔금','전액'],'잔금')}${selectField('결제수단','method',['계좌이체·현금 확인','카드 결제 요청'],'계좌이체·현금 확인')}${field('수납금액','amount',remain,'money',true)}<div class="notice-text">현금 수납은 체험 데이터에 기록됩니다. 카드결제는 PG 연결 후 이용할 수 있습니다.</div>`,'receipt',`남은 금액 ${won(remain)}`,`data-id="${id}"`);break}
case'copy-quote':{
    const c=accessibleC(id);
    if(c){
      const reqType = el.dataset.type || '';
      const meta = reqType === '최종견적' ? c.finalQuote : (reqType === '가견적' ? c.roughQuote : null);
      const tok = meta?.token || c.token || ('tok_'+c.id+'_demo');
      const link = location.origin + '/quote.html?token=' + encodeURIComponent(tok);
      copy(link);
      toast('고객 본인확인 로그인 전용 [' + (meta?.quoteType || reqType || c.quoteType || '모바일') + '] 견적서 링크를 복사했습니다.');
    }
    break;
  }
case'mobile-consult':audit(id,'모바일 견적 화면에서 상담 요청 · 체험');toast('상담 요청을 기록했습니다. 실제 문자·전화는 발송되지 않습니다.');break;
case'rental-start':{const c=accessibleC(id);rentalDraft={cid:c.id,name:c.name,phone:c.phone,address:c.address,plan:'60개월'};rentalStep(1);break}
case'partner-mode':setMobileNav(false);role='파트너 관리자';selected.clear();page='customers';customerTab='all';partnerFilter='';stageFilter='';query='';closeAllDialogs();(async()=>{await apiSwitchRole(role);await syncFromServer();render();})();toast('한빛인테리어 전용 화면으로 전환했습니다.');break;
case'partner-detail':{const p=db.partners.find(x=>x.id===id);formDialog('파트너 정보',`${field('파트너명','name',p.name,'text',true)}${field('담당자','person',p.person,'text',true)}${field('이메일','email',p.email,'email',true)}${selectField('업종','type',['인테리어','영업대행','기타'],p.type)}<div class="notice-text">고객관리·계약관리·상품관리 메뉴를 제공합니다. 원가와 본사 마진은 비공개입니다.</div>`,'partner','',`data-id="${id}"`);break}
case'new-partner':formDialog('영업파트너 등록',`${field('파트너명','name','','text',true)}${field('대표 담당자','person','','text',true)}${field('이메일','email','','email',true)}${selectField('업종','type',['인테리어','영업대행','기타'],'인테리어')}<div class="notice-text">체험용 파트너 등록입니다. 실제 계정 발급이나 초대 메일은 발송하지 않습니다.</div>`,'partner');break;
case'copy-product':{const u=productURL(id);if(u)copy(u);else toast('랜딩 URL을 먼저 등록해 주세요.');break}
case'product-link':{const p=db.products[id],u=productURL(id);openDialog('상품 전용 상담 링크',`<div class="dialog-body"><div class="info-grid"><div><label>상품</label><b>${esc(p.name)}</b></div><div><label>소속</label><b>${role==='본사 관리자'?'라이프앤조이':'한빛인테리어'}</b></div></div><div class="divider"></div><div class="field"><label>파트너·유입경로가 포함된 링크</label><textarea readonly>${esc(u||'랜딩 URL 등록 대기')}</textarea></div><div class="notice-text">이 링크에는 파트너 식별값이 포함됩니다. 실제 고객 귀속과 유입 집계에는 랜딩페이지 연동이 필요합니다.</div></div>`,u?btn('링크 복사','copy-product','copy','primary',`data-id="${id}"`):btn('닫기','close'));break}
case'new-product':case'edit-product':{const p=a==='edit-product'?db.products[id]:null;formDialog('상품페이지 '+(p?'수정':'등록'),`${field('상품명','name',p?.name||'','text',true)}${selectField('상품군','category',['창호','주방','욕실'],p?.category||'창호')}${field('랜딩페이지 URL','url',p?.url||'','url')}${field('간단 소개','desc',p?.desc||'')}`,'product','상품 판매 페이지의 링크를 관리합니다.',p?`data-id="${id}"`:'');break}
case'new-label':formDialog('진행라벨 추가',field('라벨명','name','','text',true)+field('색상','color','#7396dd','color'),'label');break;
case'new-user':formDialog('사용자 등록',`<div class="field-grid">${field('이름','name','','text',true)}${field('연락처','phone','','tel',true)}${field('이메일','email','','email',true)}${field('로그인 아이디','username','','text',true)}${selectField('소속','org',['라이프앤조이',...db.partners.map(p=>p.name)],'라이프앤조이')}${selectField('권한','role',['상담사','견적 담당자','운영관리자','파트너 관리자','회계·정산'],'상담사')}</div><div class="notice-text">체험용 사용자 목록에 추가됩니다. 실제 로그인 계정 및 비밀번호 발급은 인증 연결 후 제공됩니다.</div>`,'user');break;
case'edit-form':{const f=db.forms[id];formDialog('양식 편집',`<div class="field"><label>${esc(f.name)} · 현재 v${f.version}.0</label><textarea name="text" style="min-height:230px" required>${esc(f.text)}</textarea></div><div class="notice-text">저장 시 새 버전으로 생성합니다. 본문은 검토용 예시이며 실제 접수 전 확정이 필요합니다.</div>`,'consent','',`data-id="${id}"`);break}
case'integration':{
    if (el.dataset.name === '문자·알림톡') {
      openMessagingIntegrationDialog();
    } else {
      openDialog(esc(el.dataset.name)+' 연결 안내', '<div class="dialog-body"><div class="notice-text">운영 계약 및 API 인증키 등록 후 실시간 연동됩니다.</div><div class="mini-stat"><span>운영 준비</span><b>사업자·계약 조건 확정</b></div><div class="mini-stat"><span>개발 준비</span><b>API·서버 인증 연결</b></div><div class="mini-stat"><span>오픈 검증</span><b>테스트 및 처리 결과 대조</b></div></div>');
    }
    break;
  }
case'reset-data':formDialog('체험 데이터 초기화',`<div class="notice-text" style="margin-bottom:20px">현재 브라우저에서 추가한 고객·견적·계약·설정이 초기 예시로 되돌아갑니다.</div>${field('확인 문구 · 초기화','confirm','','text',true)}`,'reset');break;
case'request-quote':{const c=accessibleC(id);c.status='가견적요청';audit(id,'파트너 가견적 요청');render();openCustomer(id,'quotes');toast('견적 요청을 등록했습니다.');break}
}});
document.addEventListener('input',e=>{if(e.target.dataset.money)formatMoneyInput(e.target);if(e.target.id==='customer-search'){query=e.target.value;$('#customer-rows').innerHTML=customerRows();$('#list-count').innerHTML=`검색 결과 <strong>${filteredCustomers().length}</strong>건`}
if(['margin-input','margin-range'].includes(e.target.id)){editor.margin=Math.max(0,Math.min(60,Number(e.target.value)||0));if(e.target.id==='margin-range')$('#margin-input').value=editor.margin;else $('#margin-range').value=editor.margin;$('#quote-summary').innerHTML=editorSummary()}
if(e.target.dataset.item!==undefined){const i=Number(e.target.dataset.item),k=e.target.dataset.key;editor.items[i][k]=k==='name'?e.target.value:Math.max(0,parseNum(e.target.value));$('#item-total-'+i).textContent=won(editor.items[i].qty*editor.items[i].price);$('#quote-summary').innerHTML=editorSummary()}
if(e.target.id==='quote-title')editor.title=e.target.value;
  if(e.target.id==='discount-input'&&editor){editor.discount=Math.max(0,parseNum(e.target.value));}
  if(e.target.id==='send-message'&&sendState){sendState.message=e.target.value;if(sendState.previewTab==='message')renderSendRightPreview();}
  if(e.target.id==='send-phone'&&sendState){sendState.recipientPhone=e.target.value;if(sendState.previewTab==='message'&&sendState.channel==='sms')renderSendRightPreview();}
});
document.addEventListener('focusout',e=>{if(e.target.dataset?.money&&!e.target.value.trim())e.target.value='0'});
function parseCSV(text){const rows=[];let row=[],cell='',inside=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(inside&&text[i+1]==='"'){cell+='"';i++}else inside=!inside}else if(c===','&&!inside){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!inside){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows}
document.addEventListener('change',async e=>{const el=e.target,id=el.id;if(el.dataset.select){const n=Number(el.dataset.select);el.checked?selected.add(n):selected.delete(n);const keepY=window.scrollY;render();window.scrollTo(0,keepY);return}if(id==='role-switch'){role=el.value;query='';stageFilter='';partnerFilter='';selected.clear();customerTab='all';(async()=>{await apiSwitchRole(role);await syncFromServer();render();toast('역할이 ['+role+'](으)로 전환되었습니다. 서버 권한이 적용됩니다.');})();}if(id==='filter-product'){productFilter=el.value;render()}if(id==='filter-stage'){stageFilter=el.value;render()}if(id==='filter-partner'){partnerFilter=el.value;render()}if(id==='filter-period'){periodFilter=el.value;render()}if(id==='sort-order'){sortOrder=el.value;render()}if(id==='stats-period'){statsPeriod=el.value;render()}if(id==='quote-customer'){editor.cid=Number(el.value)}if(id==='quote-type')editor.type=el.value;if(id==='quote-file'){const file=el.files[0];if(!file)return;editor.source=file.name;{
    $('#upload-name').textContent = file.name;
    const formData = new FormData();
    formData.append('file', file);
    if (editor.cid) formData.append('projectId', editor.cid);
    toast('KCC 원본 견적 파일 분석 중...');
    try {
      const res = await apiFetch('/api/quotes/parse-file', { method: 'POST', body: formData });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '분석 실패');
      editor.items = resData.data.items.map(it => ({
        name: it.name,
        spec: it.spec,
        category: it.category || 'window',
        detail: it.detail_json ? (typeof it.detail_json === 'string' ? JSON.parse(it.detail_json) : it.detail_json) : undefined,
        qty: it.quantity,
        price: it.cost_unit_price
      }));
      renderEditor();
      toast('KCC 견적 파일 분석 완료: ' + resData.data.item_count + '개 품목, 공급원가 ' + won(resData.data.total_cost));
    } catch (err) {
      toast('파일 분석 오류: ' + err.message);
    }
  }}});
document.addEventListener('submit',async e=>{const f=e.target;if(!f.dataset.submit)return;e.preventDefault();const d=Object.fromEntries(new FormData(f));const id=f.dataset.id;switch(f.dataset.submit){case'customer':{
    const phone=d.phone.replace(/\D/g,'');
    if(phone.length<10||phone.length>11){toast('연락처를 확인해 주세요.');return}
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        body: {
          name: d.name.trim(),
          phone: d.phone.trim(),
          address: d.address.trim(),
          product: d.product,
          partner: d.partner,
          owner: d.owner,
          source: d.source || '직접등록',
          note: d.note || ''
        }
      });
      const cData = await res.json();
      if (res.ok) {
        await syncFromServer();
        closeDialog();
        query='';customerTab='all';stageFilter='';productFilter='';partnerFilter='';periodFilter='all';
        render();
        toast('새 고객과 공사건이 서버 DB에 등록되었습니다. (No. ' + cData.id + ')');
        break;
      }
    } catch (err) {}
    const cid=Math.max(...db.customers.map(c=>c.id),3100)+1;
    db.customers.unshift({id:cid,name:d.name.trim(),phone:d.phone,address:d.address,product:d.product,status:'신규접수',label:'일반',source:d.source||'직접등록',partner:d.partner,owner:d.owner,date:'2026-11-12',note:d.note||'신규 고객이 등록되었습니다.',feedback:'등록된 피드백이 없습니다.',measure:'',build:'',quote:0,viewed:false});
    audit(cid,'관리자 직접 등록');closeDialog();query='';customerTab='all';stageFilter='';productFilter='';partnerFilter='';periodFilter='all';render();toast('새 고객과 공사건을 등록했습니다.');break;
  }
case'note':{
    const c=accessibleC(id);
    const text=d.note.trim();
    if(!text)return;
    const type=f.dataset.type;
    try {
      const res = await apiFetch('/api/customers/' + id + '/notes', {
        method: 'POST',
        body: { type, note: text, important: !!d.important }
      });
      if (res.ok) {
        await syncFromServer();
        openCustomer(id, type);
        toast((type==='feedback'?'피드백':'상담 기록') + '이 서버에 저장되었습니다.');
        break;
      }
    } catch (err) {}
    (db.notes[id]??=[{date:c.date,by:c.owner,text:c.note,type:'notes'}]).unshift({date:now(),by:role==='본사 관리자'?'김지훈':'파트너 관리자',text,important:!!d.important,type});
    if(type==='feedback')c.feedback=text;else c.note=text;
    audit(id,(type==='feedback'?'피드백':'상담이력')+' 등록');render();openCustomer(id,type);toast('기록을 저장했습니다.');break;
  }
case'schedule':{const c=accessibleC(d.cid);if(!c)break;c.measure=d.date;c.status='실측예정';audit(c.id,`실측 예정 ${d.date} ${d.time}`);closeDialog();if(detailId===c.id){openCustomer(c.id,detailTab||'notes');}else{render();}toast('실측 일정을 체험 데이터에 등록했습니다.');break}
case'assign':for(const cid of selected){const c=accessibleC(cid);if(c){const prev=c.owner;c.owner=d.owner;audit(cid,`담당자 ${prev} → ${d.owner}`)}}selected.clear();closeDialog();render();toast('담당자를 배정했습니다.');break;
case'rough-quote-link':{
    const c=accessibleC(id);
    const url=normalizeURL(d.url);
    if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}
    try { const res = await apiFetch('/api/customers/' + id, { method: 'PATCH', body: { roughQuoteUrl: url } }); if (res.ok) await syncFromServer(); } catch {}
    c.roughQuoteUrl=url;audit(id,url?'가견적 링크 등록·수정':'가견적 링크 제거');closeDialog();openCustomer(id,detailTab||'notes');toast(url?'가견적 링크를 저장했습니다.':'가견적 링크를 제거했습니다.');break;
  }
  case'final-quote-link':{
    const c=accessibleC(id);
    const url=normalizeURL(d.url);
    if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}
    try { const res = await apiFetch('/api/customers/' + id, { method: 'PATCH', body: { finalQuoteUrl: url } }); if (res.ok) await syncFromServer(); } catch {}
    c.finalQuoteUrl=url;audit(id,url?'최종견적 링크 등록·수정':'최종견적 링크 제거');closeDialog();openCustomer(id,detailTab||'notes');toast(url?'최종견적 링크를 저장했습니다.':'최종견적 링크를 제거했습니다.');break;
  }
  case'drawing':{
    const c=accessibleC(id);
    const url=normalizeURL(d.url);
    if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}
    try { const res = await apiFetch('/api/customers/' + id, { method: 'PATCH', body: { drawing: url } }); if (res.ok) await syncFromServer(); } catch {}
    c.drawing=url;audit(id,url?'내관도 링크 등록·수정':'내관도 링크 제거');closeDialog();openCustomer(id,detailTab||'files');toast(url?'내관도 링크를 저장했습니다.':'내관도 링크를 제거했습니다.');break;
  }
case'contract':{
    const c=accessibleC(d.cid);
    if(!c||db.contracts.some(k=>k.cid===c.id)){toast('이미 계약이 등록된 공사건입니다.');return}
    try {
      const res = await apiFetch('/api/contracts', {
        method: 'POST',
        body: { projectId: c.id, type: d.type, amount: c.quote, depositAmount: Math.round(c.quote * 0.3), balanceAmount: c.quote - Math.round(c.quote * 0.3) }
      });
      if (res.ok) {
        await syncFromServer();
        closeDialog();
        page='contracts';contractTab='all';render();
        toast('계약이 서버 원장에 등록되었습니다.');
        break;
      }
    } catch {}
    db.contracts.unshift({id:'C-'+Date.now().toString().slice(-8),cid:c.id,type:d.type,amount:c.quote,paid:0,status:d.type==='렌탈'?'약정대기':'미수납'});
    c.status='계약진행';audit(c.id,d.type+' 계약 등록 · '+won(c.quote));closeDialog();page='contracts';contractTab='all';render();toast('계약대장에 등록했습니다.');break;
  }
case'receipt':{
    const k=db.contracts.find(x=>x.id===id),amt=parseNum(d.amount);
    if(!(amt>0)||amt>k.amount-k.paid){toast('남은 수납액 범위 안에서 금액을 입력해 주세요.');return}
    if(d.method==='카드 결제 요청'){
      try {
        const ordRes = await apiFetch('/api/contracts/' + id + '/pg-order', { method: 'POST', body: { amount: amt } });
        const ordData = await ordRes.json();
        if (ordRes.ok) {
          const appRes = await apiFetch('/api/contracts/' + id + '/pg-approve', { method: 'POST', body: { orderNo: ordData.order_no, cardName: '현대카드', cardQuota: 0 } });
          if (appRes.ok) { await syncFromServer(); openContract(id); toast('PG 카드 결제 승인 완료! (' + won(amt) + ')'); break; }
        }
      } catch {}
      openDialog('카드 결제 요청', '<div class="dialog-body"><div class="summary-total"><span>결제 요청금액</span><b>'+won(amt)+'</b></div><div class="notice-text" style="margin-top:20px">PG가 연결되지 않아 실제 결제 요청을 만들지 않았습니다.</div></div>');
      return;
    }
    try {
      const res = await apiFetch('/api/contracts/' + id + '/cash-receipts', {
        method: 'POST',
        body: { receiptType: d.phase === '선금' ? 'deposit' : 'balance', amount: amt, note: d.note || '' }
      });
      if (res.ok) { await syncFromServer(); openContract(id); toast('현금 수납이 서버 원장에 저장되었습니다.'); break; }
    } catch {}
    k.paid+=amt;k.status=k.paid>=k.amount?'수납완료':'선금완료';audit(k.cid,'체험 '+d.phase+' 수납 등록 '+won(amt));render();openContract(id);toast('체험 수납 기록을 저장했습니다.');break;
  }
case'application':{const a=db.applications.find(x=>x.id===id);a.status=d['app-status'];a.review=d.review;audit(a.cid,`렌탈 신청 검토: ${a.status} · ${d.review||''}`);render();openApplication(id);toast('검토 결과를 저장했습니다.');break}
case'rental':{const step=Number(f.dataset.step);if(step===1){rentalDraft={...rentalDraft,name:d['r-name'],phone:d['r-phone'],address:d['r-address'],plan:d['r-plan']};rentalStep(2)}else if(step===2)rentalStep(3);else{if(d.signature.trim()!==rentalDraft.name.trim()){toast('신청자 이름과 동일하게 입력해 주세요.');return}const c=accessibleC(rentalDraft.cid);if(db.applications.some(a=>a.cid===c.id&&!['반려'].includes(a.status))){toast('해당 고객의 진행 중인 렌탈 신청이 이미 있습니다.');return}db.applications.unshift({id:'R-'+Date.now().toString().slice(-8),cid:c.id,plan:rentalDraft.plan,monthly:Math.round(c.quote*1.2/parseInt(rentalDraft.plan)/1000)*1000,status:'서류검토',date:'2026-11-12',consent:true});audit(c.id,'체험 렌탈 신청 접수');closeDialog();page='contracts';contractTab='rental';render();toast('체험 신청이 렌탈 신청 목록에 등록되었습니다.');}break}
case'partner':{if(db.partners.some(p=>p.name===d.name&&p.id!==id)){toast('같은 이름의 파트너가 있습니다.');return}if(id){const p=db.partners.find(x=>x.id===id),prev=p.name;Object.assign(p,d);db.customers.forEach(c=>{if(c.partner===prev)c.partner=p.name})}else db.partners.push({...d,id:'P'+String(db.partners.length+1).padStart(3,'0'),active:true});save();closeDialog();render();toast('파트너 정보를 저장했습니다.');break}
case'product':{if(!validateURL(d.url)){toast('올바른 URL을 입력해 주세요.');return}if(id!==undefined)Object.assign(db.products[Number(id)],d);else db.products.push({...d,icon:d.category==='창호'?'window':d.category==='주방'?'kitchen':'bath',color:'#edf3f9',views:0,active:!!d.url});save();closeDialog();render();toast('상품페이지를 저장했습니다.');break}
case'label':if(db.labels.some(l=>l.name===d.name.trim())){toast('이미 등록된 라벨입니다.');return}db.labels.push({name:d.name.trim(),color:d.color});save();closeDialog();render();toast('라벨을 추가했습니다.');break;
case'user':db.users.push({...d,active:true});save();closeDialog();render();toast('체험 사용자 목록에 추가했습니다.');break;
case'consent':{const form=db.forms[id];form.previous??=[];form.previous.push({version:form.version,text:form.text});form.text=d.text;form.version++;save();closeDialog();render();toast('새 양식 버전을 저장했습니다.');break}
case'messaging-config':{
    try {
      const res = await apiFetch('/api/settings/integrations/messaging', {
        method: 'PUT',
        body: {
          enabled: !!d.enabled,
          provider: 'webhook',
          senderPhone: (d.senderPhone || '').trim(),
          kakaoPfId: (d.kakaoPfId || '').trim(),
          kakaoWebhookUrl: (d.kakaoWebhookUrl || '').trim(),
          smsWebhookUrl: (d.smsWebhookUrl || '').trim(),
          apiKey: (d.apiKey || '').trim()
        }
      });
      if (res.ok) {
        closeDialog();
        toast('문자·알림톡 발송 연동 설정이 저장되었습니다.');
        break;
      }
    } catch {}
    toast('설정 저장에 실패했습니다.');
    break;
  }
  case'reset':{
    if(d.confirm!=='초기화'){toast('확인 문구에 초기화를 입력해 주세요.');return}
    try {
      const res = await apiFetch('/api/settings/reset', { method: 'POST', body: { confirm: '초기화' } });
      if (res.ok) {
        await apiSwitchRole(role);
        await syncFromServer();
        selected.clear();
        closeAllDialogs();
        render();
        toast('서버 데이터베이스 및 체험 데이터를 초기화했습니다.');
        break;
      }
    } catch {}
    db=initial();save();selected.clear();closeAllDialogs();render();toast('체험 데이터를 초기화했습니다.');break;
  }
}});
window.addEventListener('resize',()=>{if(window.innerWidth>900&&mobileNavOpen)setMobileNav(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.overlay')){closeDialog();return}if(e.key==='Escape'&&mobileNavOpen){setMobileNav(false);return}if(e.key==='Enter'&&e.target.matches('.customer-row'))e.target.click();if(e.key==='Tab'&&$('.dialog')){const els=$$('button:not(:disabled),a[href],input:not([type=hidden]),select,textarea,[tabindex="0"]',$('.dialog')).filter(el=>el.offsetParent!==null);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
const params=new URLSearchParams(location.search);if(params.has('demo_quote')){const c=findC(Number(params.get('demo_quote')));if(c?.quote){const q=db.quotes.filter(x=>x.cid===c.id).at(-1);$('#app').innerHTML=`<main style="padding:25px 10px;max-width:490px;margin:auto"><div class="notice-text" style="margin-bottom:15px;text-align:center">체험용 견적 화면 · 같은 브라우저의 예시 데이터를 조회합니다.<br>실제 고객 본인 인증과 공유 기능은 운영 연결 후 제공됩니다.</div>${quoteMarkup(c,q)}</main>`;$$('[data-action]').forEach(b=>{b.removeAttribute('data-action');b.disabled=true});}else{$('#app').innerHTML='<main><h2>체험용 견적이 없습니다.</h2><p>견적을 발행한 브라우저에서 링크를 확인해 주세요.</p><a href="./">관리자 화면으로</a></main>'}}else { render(); syncFromServer(); }
