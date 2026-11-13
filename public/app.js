const $=(s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={users:'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',contract:'M9 3H5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 2h6v4H9zM8 12l2 2 5-5M8 18h8',box:'M12 3 3 8l9 5 9-5-9-5zM3 8v10l9 5 9-5V8M12 13v10M7 5.8l9 5',building:'M3 21h18M5 21V3h14v18M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3',chart:'M3 3v18h18M7 14v3M12 9v8M17 5v12',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 2-2 1-2-1-2 4 2 2v2l-2 2 2 4 2-1 2 1 1 2h5l1-2 2-1 2 1 2-4-2-2v-2l2-2-2-4-2 1-2-1-1-2z',search:'m21 21-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',calendar:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',filter:'M4 5h16M7 12h10M10 19h4',refresh:'M20 7V3l-3 3a8 8 0 1 0 3 10M20 3h-5',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',link:'m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',external:'M15 3h6v6M10 14 21 3M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',check:'m5 12 4 4L19 6',close:'M6 6l12 12M18 6 6 18',send:'m22 2-7 20-4-9-9-4 20-7zM22 2 11 13',history:'M3 11a9 9 0 1 1 2.6 6.4M3 4v7h7M12 7v5l3 2',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',phone:'M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2',copy:'M8 8h12v13H8zM16 8V3H3v13h5',shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4zM8 12l3 3 5-6',credit:'M3 5h18v14H3zM3 9h18M7 15h3',home:'m3 10 9-8 9 8M5 8v13h14V8M10 21v-7h4v7',window:'M3 3h18v18H3zM12 3v18M3 12h18M9 9v6M15 9v6',kitchen:'M2 11h20v10H2zM10 11v10M2 15h8M14 15h4M4 3v8M4 3h5v4M13 4h7v4h-7z',bath:'M3 12h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-4zM5 12V5a3 3 0 0 1 6 0M5 20v2M19 20v2M9 5h4',arrow:'M4 12h16m-6-6 6 6-6 6',more:'M5 12h.01M12 12h.01M19 12h.01',info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',edit:'m16 3 5 5-12 12-6 1 1-6L16 3zM13 6l5 5',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',menu:'M4 6h16M4 12h16M4 18h16',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'};
const icon=(name,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;
const parseNum=v=>Number(String(v??'').replace(/[^\d.-]/g,''))||0;
const num=n=>parseNum(n).toLocaleString('ko-KR'), won=n=>num(n)+'원';
function formatMoneyInput(el){const sel=el.selectionStart??el.value.length,digitsAfter=el.value.slice(sel).replace(/\D/g,'').length,raw=el.value.replace(/\D/g,''),formatted=raw?Number(raw).toLocaleString('ko-KR'):'';el.value=formatted;if(document.activeElement===el){let pos=formatted.length,rem=digitsAfter;while(pos>0&&rem>0){pos--;if(/\d/.test(formatted[pos]))rem--}if(pos>0&&formatted[pos-1]===',')pos--;try{el.setSelectionRange(pos,pos)}catch{}}}
function formatShortKstClient(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${mi}`;
}
const now=()=>formatShortKstClient(new Date().toISOString());
const DEFAULT_CONTRACT_STATUSES = [
  { id: 1, name: '계약체결', color: 'blue', sort_order: 1 },
  { id: 2, name: '미수납', color: 'orange', sort_order: 2 },
  { id: 3, name: '약정대기', color: 'orange', sort_order: 3 },
  { id: 4, name: '선금완료', color: 'blue', sort_order: 4 },
  { id: 5, name: '잔금대기', color: 'orange', sort_order: 5 },
  { id: 6, name: '수납완료', color: 'green', sort_order: 6 },
  { id: 7, name: '정산완료', color: 'green', sort_order: 7 },
  { id: 8, name: '계약보류', color: 'gray', sort_order: 8 },
  { id: 9, name: '계약취소', color: 'red', sort_order: 9 }
];

const BADGE_COLOR_OPTIONS = [
  ['blue', '파랑', '#2e5fb8'],
  ['orange', '주황', '#b35c00'],
  ['green', '초록', '#1f6e58'],
  ['purple', '보라', '#6247aa'],
  ['red', '빨강', '#c92a2a'],
  ['gray', '회색', '#5c6b82'],
  ['dark', '진회색', '#1e293b']
];

const ALL_MENU_KEYS = ['customers', 'quotes', 'contracts', 'products', 'partners', 'stats', 'settings'];
const MENU_META = {
  customers: { label: '고객관리', icon: 'users', desc: '고객 상담·진행구분·일정 통합 관리' },
  quotes: { label: '견적관리', icon: 'file', desc: '원본 견적 분석 및 모바일 견적 발행' },
  contracts: { label: '계약관리', icon: 'contract', desc: '일시불·렌탈 계약 및 수납 상태 관리' },
  products: { label: '상품관리', icon: 'box', desc: '상품별 랜딩페이지 및 파트너 전용 링크' },
  partners: { label: '파트너관리', icon: 'building', desc: '영업파트너 조직 및 귀속 성과 관리' },
  stats: { label: '통계관리', icon: 'chart', desc: '유입·전환율 및 채널별 성과 분석' },
  settings: { label: '설정', icon: 'settings', desc: '라벨·계약상태·양식·사용자 권한 설정' }
};
const ROLE_CODE_LABELS = {
  hq_admin: '최고관리자',
  consultant: '상담사',
  estimator: '견적 담당자',
  accountant: '회계·정산',
  partner: '파트너 관리자'
};

function normalizeRoleCodeClient(roleInput) {
  const map = {
    hq_admin: 'hq_admin', '최고관리자': 'hq_admin', '운영관리자': 'hq_admin', '본사 관리자': 'hq_admin',
    consultant: 'consultant', '상담사': 'consultant',
    estimator: 'estimator', '견적 담당자': 'estimator',
    accountant: 'accountant', '회계·정산': 'accountant', '회계 담당자': 'accountant',
    partner: 'partner', '파트너 관리자': 'partner', '영업파트너': 'partner'
  };
  return map[String(roleInput || '').trim()] || 'consultant';
}

function getDefaultMenusByRole(roleInput) {
  const r = normalizeRoleCodeClient(roleInput);
  if (r === 'hq_admin') return [...ALL_MENU_KEYS];
  if (r === 'accountant') return ['customers', 'contracts', 'stats'];
  if (r === 'partner') return ['customers', 'products', 'stats'];
  return ['customers', 'quotes', 'contracts', 'products'];
}

function normalizeUserRecord(raw, idx = 0) {
  if (!raw) return { id: idx + 1, username: 'admin', name: '김지훈', role: 'hq_admin', role_label: '최고관리자', org: '라이프앤조이', allowed_menus: [...ALL_MENU_KEYS], active: true };
  const roleCode = normalizeRoleCodeClient(raw.role);
  const fallbackUsernames = ['admin', 'youngjin', 'jeongyeon', 'jihee', 'partner_hanbit', 'partner_rium'];
  const username = raw.username || fallbackUsernames[idx] || ('user' + (raw.id || idx + 1));
  let menusArr = raw.allowed_menus;
  if (typeof menusArr === 'string') {
    try { menusArr = JSON.parse(menusArr); } catch { menusArr = menusArr.split(',').map(s => s.trim()); }
  }
  let validMenus = Array.isArray(menusArr) ? menusArr.filter(k => ALL_MENU_KEYS.includes(k)) : [];
  if (!validMenus.length) {
    validMenus = getDefaultMenusByRole(roleCode);
  }

  const orgId = raw.org_id || raw.orgId;
  const hasSubPartners = Boolean(
    raw.has_sub_partners ||
    Number(raw.sub_partner_count || 0) > 0 ||
    (Array.isArray(window?.db?.partners) && window.db.partners.some(p => (p.parentId === orgId || p.parent_id === orgId) && p.orgId !== orgId))
  );

  // If role is partner: show partners menu only if they have sub-partners
  if (roleCode === 'partner') {
    if (hasSubPartners) {
      if (!validMenus.includes('partners')) validMenus.push('partners');
    } else {
      validMenus = validMenus.filter(k => k !== 'partners');
    }
  }

  const finalMenus = ALL_MENU_KEYS.filter(k => validMenus.includes(k) || (username === 'admin' && k === 'settings'));
  return {
    id: raw.id ?? (idx + 1),
    username,
    name: raw.name || username,
    phone: raw.phone || '',
    email: raw.email || '',
    org: raw.org || raw.org_name || '라이프앤조이',
    org_id: orgId || 1,
    org_type: raw.org_type || (roleCode === 'partner' ? 'partner' : 'hq'),
    parent_id: raw.parent_id || null,
    level: raw.level || 1,
    sub_partner_count: raw.sub_partner_count || 0,
    has_sub_partners: hasSubPartners,
    role: roleCode,
    role_label: raw.role_label || ROLE_CODE_LABELS[roleCode] || '상담사',
    allowed_menus: finalMenus,
    active: raw.active !== false && raw.active !== 0
  };
}

function getUserAllowedMenuKeys(u) {
  if (!u) return [...ALL_MENU_KEYS];
  const norm = normalizeUserRecord(u);
  return norm.allowed_menus;
}

// 전화번호 자동 하이픈 포맷팅 함수 (파트너 등록 및 전체 입력 폼 공용)
function formatPhoneNumber(val) {
  if (!val) return '';
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  // 서울(02) 지역번호
  if (num.startsWith('02')) {
    if (num.length <= 2) return num;
    if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
    if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
    return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
  }
  // 전국 대표번호 (1588, 1544, 1688 등 8자리)
  if (num.startsWith('15') || num.startsWith('16') || num.startsWith('18')) {
    if (num.length <= 4) return num;
    return `${num.slice(0, 4)}-${num.slice(4, 8)}`;
  }
  // 휴대폰(010, 011...) 및 일반 지역번호(031, 051...)
  if (num.length <= 3) return num;
  if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`;
  if (num.length <= 10) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
}

const STANDARD_FIELD_LABELS = {
  date: '날짜',
  name: '성명',
  signature: '서명',
  birthDate: '생년월일',
  phone: '연락처'
};

const DEFAULT_FIELD_TEMPLATES = {
  date: { key: 'date', label: '날짜', x: 58.0, y: 78.5, w: 32.0, h: 3.6, fontSize: 14, color: '#1a202c', align: 'center', format: 'YYYY년 MM월 DD일', enabled: true },
  name: { key: 'name', label: '성명', x: 62.0, y: 83.2, w: 16.0, h: 3.6, fontSize: 15, color: '#1a202c', align: 'center', fontWeight: 'bold', enabled: true },
  signature: { key: 'signature', label: '서명', x: 78.5, y: 81.2, w: 16.0, h: 6.8, color: '#1a202c', enabled: true },
  birthDate: { key: 'birthDate', label: '생년월일', x: 18.0, y: 83.2, w: 28.0, h: 3.6, fontSize: 14, color: '#1a202c', align: 'center', format: 'YYYY-MM-DD', enabled: true },
  phone: { key: 'phone', label: '연락처', x: 18.0, y: 87.5, w: 28.0, h: 3.6, fontSize: 14, color: '#1a202c', align: 'center', enabled: true }
};

function getSafeFieldLabel(key, f) {
  if (f && typeof f.label === 'string' && f.label.trim() && !f.label.includes('?')) {
    return f.label.trim();
  }
  return STANDARD_FIELD_LABELS[key] || key;
}

// 다중 페이지 필드 인스턴스 배열 정규화 함수
function normalizeFormFields(rawConfig) {
  if (Array.isArray(rawConfig)) {
    return rawConfig.map((it, idx) => {
      const key = ['date', 'name', 'signature', 'birthDate', 'phone'].includes(it.key) ? it.key : 'name';
      const label = STANDARD_FIELD_LABELS[key] || '성명';
      const page = Math.max(1, parseInt(it.page, 10) || 1);
      return {
        id: it.id || `f_${key}_p${page}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        key,
        label,
        page,
        x: typeof it.x === 'number' ? it.x : 50.0,
        y: typeof it.y === 'number' ? it.y : 80.0,
        w: typeof it.w === 'number' ? it.w : (key === 'signature' ? 16.0 : 20.0),
        h: typeof it.h === 'number' ? it.h : (key === 'signature' ? 6.8 : 3.6),
        fontSize: parseInt(it.fontSize, 10) || (key === 'name' ? 15 : 14),
        fontWeight: it.fontWeight || (key === 'name' ? 'bold' : 'normal'),
        color: it.color || '#1a202c',
        align: it.align || 'center',
        format: (key === 'date' && (!it.format || it.format.includes('?')))
          ? 'YYYY년 MM월 DD일'
          : (it.format || (key === 'birthDate' ? 'YYYY-MM-DD' : undefined)),
        enabled: it.enabled !== false
      };
    });
  }

  // 레거시 맵 객체 { date: {...}, name: {...}, ... } 지원
  const list = [];
  const cfg = (rawConfig && typeof rawConfig === 'object') ? rawConfig : DEFAULT_FIELD_TEMPLATES;
  for (const k of ['date', 'name', 'signature', 'birthDate', 'phone']) {
    const item = cfg[k] || DEFAULT_FIELD_TEMPLATES[k];
    const page = Math.max(1, parseInt(item.page, 10) || 1);
    list.push({
      id: `f_${k}_p${page}_${Math.random().toString(36).slice(2, 6)}`,
      key: k,
      label: STANDARD_FIELD_LABELS[k] || k,
      page,
      x: typeof item.x === 'number' ? item.x : DEFAULT_FIELD_TEMPLATES[k].x,
      y: typeof item.y === 'number' ? item.y : DEFAULT_FIELD_TEMPLATES[k].y,
      w: typeof item.w === 'number' ? item.w : DEFAULT_FIELD_TEMPLATES[k].w,
      h: typeof item.h === 'number' ? item.h : DEFAULT_FIELD_TEMPLATES[k].h,
      fontSize: parseInt(item.fontSize, 10) || DEFAULT_FIELD_TEMPLATES[k].fontSize,
      fontWeight: item.fontWeight || DEFAULT_FIELD_TEMPLATES[k].fontWeight || 'normal',
      color: item.color || '#1a202c',
      align: item.align || 'center',
      format: (k === 'date' && (!item.format || item.format.includes('?')))
        ? 'YYYY년 MM월 DD일'
        : (item.format || DEFAULT_FIELD_TEMPLATES[k].format),
      enabled: item.enabled !== false
    });
  }
  return list;
}

const DEFAULT_FORM_FIELDS = normalizeFormFields(DEFAULT_FIELD_TEMPLATES);

const DEFAULT_RENTAL_PRIVACY_CONTENT = `[필수] 렌탈 개인정보 수집·이용 및 제공 동의서 (KCC홈씨씨)

1. 수집 및 이용 목적
- KCC 홈씨씨 창호·인테리어 렌탈 서비스 신청 접수, 적격 확인, 본인 확인
- 렌탈 계약 체결 및 유지 관리, 월 렌탈료 정산 및 청구
- 시공 현장 실측, 일정 조율 및 사후 품질보증(A/S) 제공

2. 수집하는 개인정보 항목
- 기본 식별정보: 고객 성명, 연락처(휴대전화번호), 생년월일, 시공 주소
- 계약 및 서명정보: 모바일 전자서명 이미지, 신청일자, 선택 렌탈 조건

3. 보유 및 이용 기간
- 렌탈 계약 성립 시: 상법 및 전자상거래법 등 관계 법령에 따른 5년간 보존 후 파기
- 미체결 또는 취소 시: 처리 완료일로부터 즉시 안전하게 영구 파기

4. 동의 거부 권리 및 불이익
- 귀하는 상기 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 필수 정보 수집에 동의하지 않으실 경우 렌탈 신청 및 계약 체결이 불가능합니다.`;

const STORAGE_KEY = 'homecc_crm_v3_prod_v1';
const PRESERVED_RENTAL_FORM_FIELDS = [
  {"id":"f_date_p1_ie2q","key":"date","label":"날짜","page":1,"x":16.9,"y":90.1,"w":18.5,"h":2.3,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","format":"YYYY년 MM월 DD일","enabled":true},
  {"id":"f_name_p1_mxle","key":"name","label":"성명","page":1,"x":46.4,"y":90.3,"w":13.6,"h":1.7,"fontSize":15,"fontWeight":"bold","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_signature_p1_4ury","key":"signature","label":"서명","page":1,"x":56.6,"y":89.9,"w":14.5,"h":2.7,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_birthDate_p1_ax34","key":"birthDate","label":"생년월일","page":1,"x":75.1,"y":90,"w":16.4,"h":2.5,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","format":"YYYY-MM-DD","enabled":true},
  {"id":"f_phone_p1_kxkh","key":"phone","label":"연락처","page":1,"x":46.2,"y":92.3,"w":20.7,"h":2.1,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_name_p2_mwd9gsl8_m6d","key":"name","label":"성명","page":2,"x":62,"y":83.2,"w":16,"h":3.6,"fontSize":15,"fontWeight":"bold","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_signature_p2_mwd9gtkp_cd4","key":"signature","label":"서명","page":2,"x":78.5,"y":81.2,"w":16,"h":6.8,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_name_p3_mwd9h1yq_v6u","key":"name","label":"성명","page":3,"x":62,"y":83.2,"w":16,"h":3.6,"fontSize":15,"fontWeight":"bold","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_signature_p3_mwd9h2qx_bb8","key":"signature","label":"서명","page":3,"x":78.5,"y":81.2,"w":16,"h":6.8,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_date_p3_mwd9h3r9_z2i","key":"date","label":"날짜","page":3,"x":58,"y":78.5,"w":32,"h":3.6,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","format":"YYYY년 MM월 DD일","enabled":true}
];

const DEFAULT_LANDING_LINKS = [];

const initial=()=>({customers:[],partners:[],users:[{id:1,username:'admin',name:'김지훈',phone:'010-1111-2222',role:'hq_admin',org:'라이프앤조이',email:'admin@example.com',allowed_menus:[...ALL_MENU_KEYS],active:true}],labels:[{name:'일반',color:'#7194dd'},{name:'긴급',color:'#e88485'},{name:'체크',color:'#c39b56'},{name:'완료',color:'#74b6a1'}],contractStatuses:DEFAULT_CONTRACT_STATUSES.map(x=>({...x})),notes:{},history:{},quotes:[],applications:[],contracts:[],products:[{id:1,name:'KCC 홈씨씨 창호',category:'창호',desc:'우리 집에 맞는 창호 교체, 상담부터 시공까지.',url:'/landing/',icon:'window',color:'#edf3f9',views:0,active:true},{id:2,name:'KCC 홈씨씨 키친',category:'주방',desc:'생활의 중심이 되는 주방, 맞춤 리모델링 상담.',url:'',icon:'kitchen',color:'#f4f1ec',views:0,active:true},{id:3,name:'KCC 홈씨씨 욕실',category:'욕실',desc:'매일의 편안함을 만드는 욕실 리모델링.',url:'',icon:'bath',color:'#edf4f1',views:0,active:false}],
landingLinks:[],analytics:null,
forms:[{id:'rental_privacy',name:'(렌탈) 개인정보 동의서',version:7,pdfPath:'/uploads/forms/form_1794469868135_ctjfux.pdf',fileName:'BSON_제휴영업팀 신용정보동의서_에디터용.pdf',text:DEFAULT_RENTAL_PRIVACY_CONTENT,fieldsConfig:JSON.parse(JSON.stringify(PRESERVED_RENTAL_FORM_FIELDS))}]});
try{localStorage.removeItem('homecc_crm_v3_demo')}catch{}
let db;try{db=JSON.parse(localStorage.getItem(STORAGE_KEY))||initial()}catch{db=initial()}
if(Array.isArray(db.forms)){
  db.forms=db.forms.filter(f=>f.name.includes('렌탈')||f.id==='rental_privacy');
  if(!db.forms.length){
    db.forms=[{id:'rental_privacy',name:'(렌탈) 개인정보 동의서',version:7,pdfPath:'/uploads/forms/form_1794469868135_ctjfux.pdf',fileName:'BSON_제휴영업팀 신용정보동의서_에디터용.pdf',text:DEFAULT_RENTAL_PRIVACY_CONTENT,fieldsConfig:JSON.parse(JSON.stringify(PRESERVED_RENTAL_FORM_FIELDS))}];
  } else {
    // 저장된 양식의 fieldsConfig 정규화 (다중 페이지 지원)
    db.forms.forEach(f => {
      if (f.id === 'rental_privacy' && !f.pdfPath) {
        f.pdfPath = '/uploads/forms/form_1794469868135_ctjfux.pdf';
        f.fileName = f.fileName || 'BSON_제휴영업팀 신용정보동의서_에디터용.pdf';
      }
      f.fieldsConfig = normalizeFormFields(f.fieldsConfig);
    });
  }
}
if (!Array.isArray(db.contractStatuses) || !db.contractStatuses.length) {
  db.contractStatuses = DEFAULT_CONTRACT_STATUSES.map(x => ({ ...x }));
}
if (!Array.isArray(db.landingLinks)) {
  db.landingLinks = [];
}

const AD_CHANNEL_PRESETS = [
  '네이버 검색광고',
  '네이버 브랜드검색',
  '네이버 블로그·카페',
  '당근마켓',
  '인스타그램',
  '카카오 광고',
  '페이스북(메타)',
  '유튜브',
  '구글 검색/GDN',
  '현수막·전단 QR',
  '파트너 전용링크'
];
const AD_MEDIUM_OPTIONS = [
  '검색광고',
  '배너·피드',
  '릴스·숏폼',
  '지역타겟 광고',
  '콘텐츠·리뷰',
  '오프라인·QR',
  '파트너추천',
  '기타'
];
function channelTone(ch) {
  const s = String(ch || '').trim();
  if (!s) return 'ch-default';
  if (s.includes('네이버')) return 'ch-naver';
  if (s.includes('당근')) return 'ch-daangn';
  if (s.includes('카카오')) return 'ch-kakao';
  if (s.includes('인스타') || s.includes('페이스북') || s.includes('메타')) return 'ch-social';
  if (s.includes('유튜브') || s.includes('구글')) return 'ch-video';
  if (s.includes('파트너') || s.includes('소개')) return 'ch-partner';
  if (s.includes('현수막') || s.includes('전단') || s.includes('QR') || s.includes('오프라인')) return 'ch-qr';
  return 'ch-default';
}
function findCustomerLandingLink(c) {
  if (!c) return null;
  const links = Array.isArray(db.landingLinks) ? db.landingLinks : [];
  if (!links.length) return null;
  if (c.landingLinkId) {
    const byId = links.find(ll => Number(ll.id || ll.linkId) === Number(c.landingLinkId));
    if (byId) return byId;
  }
  const codeCandidates = [c.landingLinkCode, c.source, c.adChannel]
    .map(v => String(v || '').trim())
    .filter(Boolean);
  if (!codeCandidates.length) return null;
  return links.find(ll => ll.code && codeCandidates.includes(String(ll.code).trim())) || null;
}
function getCustomerChannel(c) {
  if (!c) return '직접등록';
  const ll = findCustomerLandingLink(c);
  const rawAd = String(c.adChannel || '').trim();
  if (
    ll &&
    ll.channel &&
    (!rawAd ||
      rawAd === ll.code ||
      rawAd === '랜딩페이지' ||
      rawAd === '기본 랜딩(직접유입)' ||
      rawAd === '기본 랜딩(미분류)')
  ) {
    return ll.channel;
  }
  const raw = String(c.adChannel || c.source || '직접등록').trim();
  if (raw === '랜딩페이지') return '기본 랜딩(미분류)';
  if (ll && ll.channel && raw === ll.code) return ll.channel;
  return raw;
}
function buildTrackingUrl(link, origin = window.location.origin) {
  if (!link) return '';
  const rawBase = String(link.targetUrl || '/').trim();
  const base = (!rawBase || rawBase === '/landing' || rawBase === '/landing/') ? '/' : rawBase;
  try {
    const u = new URL(base, origin);
    if (link.code) u.searchParams.set('ch', link.code);
    return u.href;
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return origin + (base.startsWith('/') ? base : '/' + base) + (link.code ? `${sep}ch=${encodeURIComponent(link.code)}` : '');
  }
}

const urlParams = new URLSearchParams(window.location.search);
const switchUserParam = urlParams.get('switch_user') || urlParams.get('as_user');
if (switchUserParam) {
  try {
    sessionStorage.setItem('kcc_isolated', '1');
    sessionStorage.setItem('kcc_active_username', switchUserParam);
    sessionStorage.removeItem('kcc_auth_token');
  } catch {}
}

const isSessionIsolated = (function() {
  try { return sessionStorage.getItem('kcc_isolated') === '1'; } catch { return false; }
})();

let authToken = (function() {
  try {
    return sessionStorage.getItem('kcc_auth_token') || (!isSessionIsolated ? localStorage.getItem('kcc_auth_token') : '') || '';
  } catch { return ''; }
})();

let activeUsername = (function() {
  try {
    return sessionStorage.getItem('kcc_active_username') || (!isSessionIsolated ? localStorage.getItem('kcc_active_username') : '') || 'admin';
  } catch { return 'admin'; }
})();

let userRoster = (db.users || []).map((u, i) => normalizeUserRecord(u, i));
if (!userRoster.some(u => u.username === activeUsername && u.active !== false)) {
  if (!isSessionIsolated) {
    activeUsername = userRoster[0]?.username || 'admin';
    authToken = '';
    try {
      localStorage.setItem('kcc_active_username', activeUsername);
      localStorage.removeItem('kcc_auth_token');
    } catch {}
  }
}
let previewViewMode = 'quote';
let previewDeviceWidth = 'mobile';
let previewQuoteType = '가견적';
let previewQuoteId = null;
let activeDraftPreview = null;
let sendState = null;
let mobileNavOpen = false;

function getRosterUsers() {
  const merged = new Map();
  for (const u of (userRoster || [])) {
    const norm = normalizeUserRecord(u);
    merged.set(norm.username, norm);
  }
  for (const u of (db.users || [])) {
    const norm = normalizeUserRecord(u);
    merged.set(norm.username, norm);
  }
  return [...merged.values()].filter(u => u.active);
}

function getActiveUser() {
  const roster = getRosterUsers();
  const found = roster.find(u => u.username === activeUsername);
  if (found) return found;
  if (typeof role !== 'undefined' && role === '파트너 관리자') {
    const pUser = roster.find(u => isPartnerUser(u));
    if (pUser) return pUser;
  }
  return roster[0] || normalizeUserRecord({ id: 1, username: 'admin', name: '김지훈', role: 'hq_admin', org: '라이프앤조이', org_type: 'hq' }, 0);
}

function getHqOwnerOptions(currentOwner = '') {
  const names = getRosterUsers().filter(u => !isPartnerUser(u)).map(u => u.name).filter(Boolean);
  const list = ['미배정', ...new Set(names.length ? names : ['김지훈'])];
  if (currentOwner && !list.includes(currentOwner)) list.push(currentOwner);
  return list;
}

function isPartnerUser(u = getActiveUser()) {
  return Boolean(u && (u.role === 'partner' || u.org_type === 'partner'));
}

function canManageQuotes(u = getActiveUser()) {
  if (isPartnerUser(u)) return false;
  return getUserAllowedMenuKeys(u).includes('quotes');
}

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

const ADMIN_LOGO_URL = 'https://res.cloudinary.com/lyjyvy54/image/upload/v1794544823/01_full_color_homecc_BI2_1_mmapgw.png';

function logoutSession(silent = false) {
  authToken = '';
  try {
    sessionStorage.removeItem('kcc_auth_token');
    sessionStorage.removeItem('kcc_active_username');
    sessionStorage.removeItem('kcc_isolated');
    if (!isSessionIsolated) {
      localStorage.removeItem('kcc_auth_token');
      localStorage.removeItem('kcc_active_username');
    }
  } catch {}
  if (typeof closeDialog === 'function') closeDialog();
  if (typeof render === 'function') render();
  if (!silent) toast('로그아웃되었습니다.');
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
    if (isSessionIsolated && switchUserParam) {
      await apiSwitchRole(switchUserParam, { isolated: true });
      return apiFetch(url, { ...options, _retried: true });
    }
    logoutSession(true);
    toast('로그인이 필요하거나 세션이 만료되었습니다.');
  }
  return res;
}

async function apiSwitchRole(target, options = {}) {
  const isIsolated = options.isolated || (function() {
    try { return sessionStorage.getItem('kcc_isolated') === '1'; } catch { return false; }
  })();
  const applyLocalSwitch = () => {
    const val = String(target || '').trim();
    const roster = getRosterUsers();
    const found = roster.find(u => u.username === val || u.role_label === val || u.name === val) || roster[0];
    if (found) {
      activeUsername = found.username;
      try { sessionStorage.setItem('kcc_active_username', activeUsername); } catch {}
      if (!isIsolated) {
        try { localStorage.setItem('kcc_active_username', activeUsername); } catch {}
      }
      if (typeof role !== 'undefined') {
        role = isPartnerUser(found) ? '파트너 관리자' : '본사 관리자';
      }
    }
  };
  try {
    const val = String(target || '').trim();
    const payload = ['본사 관리자', '파트너 관리자', '최고관리자', '상담사', '견적 담당자', '회계·정산'].includes(val)
      ? { roleName: val }
      : { username: val, roleName: val };
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      authToken = data.token;
      try { sessionStorage.setItem('kcc_auth_token', authToken); } catch {}
      if (!isIsolated) {
        try { localStorage.setItem('kcc_auth_token', authToken); } catch {}
      }
      if (data.user) {
        const norm = normalizeUserRecord(data.user);
        activeUsername = norm.username;
        try { sessionStorage.setItem('kcc_active_username', activeUsername); } catch {}
        if (!isIsolated) {
          try { localStorage.setItem('kcc_active_username', activeUsername); } catch {}
        }
        const rIdx = userRoster.findIndex(x => x.username === norm.username || Number(x.id) === Number(norm.id));
        if (rIdx !== -1) userRoster[rIdx] = norm;
        else userRoster.push(norm);
        if (typeof role !== 'undefined') {
          role = isPartnerUser(norm) ? '파트너 관리자' : '본사 관리자';
        }
      }
      return;
    }
    applyLocalSwitch();
  } catch (err) {
    applyLocalSwitch();
    console.error('Role switch failed:', err);
  }
}

function applyCustomersFromServer(list) {
  if (!Array.isArray(list)) return;
  db.customers = list.map(c => {
    if (Array.isArray(c.notes)) {
      db.notes[c.id] = c.notes;
      return c;
    }
    const existingNotes = Array.isArray(db.notes[c.id]) ? db.notes[c.id] : null;
    if (existingNotes && existingNotes.length) {
      const latestNote = existingNotes.find(n => n.type !== 'feedback' && String(n.text || '').trim());
      const latestFb = existingNotes.find(n => n.type === 'feedback' && String(n.text || '').trim());
      return {
        ...c,
        note: latestNote ? latestNote.text : (c.note || ''),
        noteMeta: latestNote ? { date: latestNote.date, by: latestNote.by } : c.noteMeta,
        feedback: latestFb ? latestFb.text : (c.feedback || ''),
        feedbackMeta: latestFb ? { date: latestFb.date, by: latestFb.by } : c.feedbackMeta
      };
    }
    return c;
  });
}

async function syncFromServer() {
  try {
    if (!authToken) {
      if (isSessionIsolated && switchUserParam) {
        await apiSwitchRole(switchUserParam, { isolated: true });
      } else {
        return;
      }
    }
    const [cRes, pRes, kRes, aRes, prRes, lRes, csRes, uRes, rRes, fRes, anRes, qpRes] = await Promise.all([
      apiFetch('/api/customers'),
      apiFetch('/api/partners'),
      apiFetch('/api/contracts'),
      apiFetch('/api/rentals'),
      apiFetch('/api/products'),
      apiFetch('/api/settings/labels'),
      apiFetch('/api/settings/contract-statuses'),
      apiFetch('/api/auth/users'),
      apiFetch('/api/auth/roster'),
      apiFetch('/api/settings/forms'),
      apiFetch('/api/analytics/overview?period=' + encodeURIComponent(typeof statsPeriod !== 'undefined' ? statsPeriod : '30')),
      apiFetch('/api/settings/quote-phone')
    ]);

    if (cRes.ok) {
      const data = await cRes.json();
      applyCustomersFromServer(data.customers);
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
      if (Array.isArray(data.landingLinks)) {
        db.landingLinks = data.landingLinks;
      }
    }
    if (lRes.ok) {
      const data = await lRes.json();
      db.labels = data.labels;
    }
    if (csRes.ok) {
      const data = await csRes.json();
      if (Array.isArray(data.contractStatuses) && data.contractStatuses.length) {
        db.contractStatuses = data.contractStatuses;
      }
    }
    if (rRes.ok) {
      const data = await rRes.json();
      if (Array.isArray(data.users) && data.users.length) {
        userRoster = data.users.map((u, i) => normalizeUserRecord(u, i));
      }
    }
    if (uRes.ok) {
      const data = await uRes.json();
      db.users = (data.users || []).map((u, i) => normalizeUserRecord(u, i));
      if (!rRes.ok) userRoster = [...db.users];
    }
    if (fRes.ok) {
      const data = await fRes.json();
      if (Array.isArray(data.forms) && data.forms.length > 0) {
        data.forms.forEach(f => {
          f.fieldsConfig = normalizeFormFields(f.fieldsConfig);
        });
        db.forms = data.forms;
      }
    }
    if (anRes && anRes.ok) {
      db.analytics = await anRes.json();
    }
    if (qpRes && qpRes.ok) {
      const qpData = await qpRes.json();
      quoteConsultPhone = String(qpData?.phone || '').trim();
      quoteConsultManagerName = String(qpData?.managerName || '').trim();
      try {
        localStorage.setItem('kcc_quote_consult_phone', quoteConsultPhone);
        localStorage.setItem('kcc_quote_consult_manager', quoteConsultManagerName);
      } catch {}
    }
    save();
    render();
  } catch (err) {
    console.warn('API sync warning:', err);
  }
}

async function refreshAnalytics(period = statsPeriod) {
  try {
    const res = await apiFetch('/api/analytics/overview?period=' + encodeURIComponent(period));
    if (res.ok) {
      db.analytics = await res.json();
      save();
      if (page === 'stats') render();
    }
  } catch {}
}

let realtimeSyncInFlight = false;
let realtimeTimerStarted = false;
let pendingRealtimeRender = false;

function isUserInteractingWithForm() {
  if ($('.overlay')) return true;
  const active = document.activeElement;
  return Boolean(active && active.matches && active.matches('input, textarea, select'));
}

async function syncCustomersRealtime() {
  if (!authToken || document.visibilityState !== 'visible' || realtimeSyncInFlight) return;
  realtimeSyncInFlight = true;
  try {
    const cRes = await apiFetch('/api/customers');
    if (cRes.ok) {
      const data = await cRes.json();
      if (Array.isArray(data.customers)) {
        const prevSnap = JSON.stringify(db.customers || []);
        const nextSnap = JSON.stringify(data.customers);
        if (prevSnap !== nextSnap) {
          applyCustomersFromServer(data.customers);
          save();
          if (isUserInteractingWithForm()) {
            pendingRealtimeRender = true;
          } else {
            pendingRealtimeRender = false;
            render();
          }
        }
      }
    }
    if (page === 'stats') {
      await refreshAnalytics(typeof statsPeriod !== 'undefined' ? statsPeriod : '30');
    }
  } catch {
    // ignore background polling errors
  } finally {
    realtimeSyncInFlight = false;
  }
}

function startRealtimeSync() {
  if (realtimeTimerStarted) return;
  realtimeTimerStarted = true;
  setInterval(() => {
    syncCustomersRealtime();
  }, 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncCustomersRealtime();
  });
  window.addEventListener('focus', () => {
    syncCustomersRealtime();
  });
  document.addEventListener('focusout', () => {
    if (pendingRealtimeRender && !isUserInteractingWithForm()) {
      pendingRealtimeRender = false;
      render();
    }
  });
}

function trunc10(val) {
  const n = Number(val) || 0;
  if (n <= 0) return 0;
  return Math.floor((n + 1e-6) / 100) * 100;
}

function isExtraQuoteItem(it) {
  if (it?.category === 'extra') return true;
  if (it?.category === 'window') return false;
  const prod = String(it?.detail?.excel_product || it?.detail?.product || '').replace(/\s+/g, '');
  if (prod === '기타견적' || prod === '기타') return true;
  if (prod) return false;
  return /(철거|사다리|양중|보양|몰딩|마감|기타견적|폐기물|실리콘|부자재)/.test(it?.name || '') &&
    !/(창호|이중창|단창|발코니|분합|거실|안방|침실|방\d|주방|터닝|픽스|프로젝트|루바|통바|공틀)/.test(it?.name || '');
}

function calcEditorItemRow(it, fallbackMargin = 100) {
  const qty = Math.max(1, parseNum(it.qty) || 1);
  const rawCostTotal = it.cost_total !== undefined && it.cost_total !== null
    ? Math.max(0, Number(it.cost_total) || 0)
    : Math.max(0, (Number(it.price) || 0) * qty);
  const mRate = (it.margin_rate !== undefined && it.margin_rate !== null && String(it.margin_rate) !== '')
    ? Math.max(0, Number(it.margin_rate))
    : Math.max(0, Number(fallbackMargin ?? 100));
  const rawMargined = rawCostTotal * (mRate / 100);
  const saleTotal = trunc10(rawMargined);
  const saleUnit = qty > 0 ? Math.round(saleTotal / qty) : saleTotal;
  const isExtra = isExtraQuoteItem(it);
  return { qty, rawCostTotal, mRate, saleTotal, saleUnit, isExtra };
}

function sanitizeDraftMeta(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const safe = {
    doc_title: meta.doc_title || '',
    kcc_quote_no: meta.kcc_quote_no || meta.quote_no || '',
    quote_date: meta.quote_date || '',
    valid_period: meta.valid_period || '',
    build_scheduled_date: meta.build_scheduled_date || '',
    recipient: meta.recipient || meta.customer_name || '',
    site_address: meta.site_address || '',
    construction_included: meta.construction_included || '',
    supplier_name: meta.supplier_name || meta.agency_name || '',
    supplier_biz_no: meta.supplier_biz_no || '',
    supplier_ceo: meta.supplier_ceo || meta.rep_name || '',
    supplier_address: meta.supplier_address || '',
    supplier_manager: meta.supplier_manager || meta.author_name || '',
    supplier_phone: meta.supplier_phone || meta.agency_tel || '',
    site_notes: meta.site_notes || ''
  };
  return Object.values(safe).some(v => String(v || '').trim() !== '') ? safe : null;
}

function buildDraftMobileQuote(c, ed, totals) {
  const cashPrice = Number(totals.total) || 0;
  const discountAmount = Math.max(0, parseNum(ed.discount || 0));
  const originalPrice = Number(totals.originalPrice) > 0 ? Number(totals.originalPrice) : (cashPrice + discountAmount);
  const splitDeposit = Math.round(cashPrice / 2);
  const splitBalance = cashPrice - splitDeposit;

  // -------------------------------------------------------------
  // [렌탈금액 산정기준] (할인된 일시불 금액 기준)
  // 1) 월 111,000원: 할인 일시불금액 - 5,000,000원 = 초회납입금
  // 2) 월 222,000원: 할인 일시불금액 - 10,000,000원 = 초회납입금
  // 3) 월 333,000원: 할인 일시불금액 - 15,000,000원 = 초회납입금
  // ※ 총액은 고객 부담 완화를 위해 모바일 견적서 렌탈금액표에 미표시
  // -------------------------------------------------------------
  const upfront111 = Math.max(0, cashPrice - 5000000);
  const monthly111 = 111000;
  const upfront222 = Math.max(0, cashPrice - 10000000);
  const monthly222 = 222000;
  const upfront333 = Math.max(0, cashPrice - 15000000);
  const monthly333 = 333000;

  const plan111Obj = {
    key: 'plan111',
    tag: '월 111,000원',
    heading: '월 부담을 최소화하고 싶다면',
    mainLabel: '월 렌탈료',
    mainAmount: monthly111,
    upfront: upfront111,
    months: 60,
    total: upfront111 + monthly111 * 60,
    name: '월 111,000원 렌탈 플랜',
    detail: '초회납입금 ' + num(upfront111) + '원 + 월 111,000원 (60개월)',
    button: '월 111,000원 조건 상담하기'
  };

  const plan222Obj = {
    key: 'plan222',
    tag: '월 222,000원',
    heading: '초기비용과 월납부의 균형을 원한다면',
    mainLabel: '월 렌탈료',
    mainAmount: monthly222,
    upfront: upfront222,
    months: 60,
    total: upfront222 + monthly222 * 60,
    name: '월 222,000원 렌탈 플랜',
    detail: '초회납입금 ' + num(upfront222) + '원 + 월 222,000원 (60개월)',
    button: '월 222,000원 조건 상담하기'
  };

  const plan333Obj = {
    key: 'plan333',
    tag: '월 333,000원',
    heading: '처음 내는 목돈을 최소화하고 싶다면',
    mainLabel: '월 렌탈료',
    mainAmount: monthly333,
    upfront: upfront333,
    months: 60,
    total: upfront333 + monthly333 * 60,
    name: '월 333,000원 렌탈 플랜',
    detail: '초회납입금 ' + num(upfront333) + '원 + 월 333,000원 (60개월)',
    button: '월 333,000원 조건 상담하기'
  };

  const items = (ed.items || []).map((it, idx) => {
    const r = calcEditorItemRow(it, ed.margin ?? 100);
    const amountVatInc = r.saleTotal + Math.round(r.saleTotal * 0.1);
    return {
      sort_order: idx + 1,
      name: it.name || '품목',
      spec: it.spec || '맞춤 규격',
      category: r.isExtra ? 'extra' : 'window',
      detail: it.detail || {
        type: r.isExtra ? '기타견적 · 부대공사' : ((c.product || '창호') + ' 맞춤 사양'),
        product: r.isExtra ? '기타견적' : (c.product || '창호'),
        size: it.spec || '현장 실측 규격',
        shape: r.qty + '식',
        model: r.isExtra ? '현장 시공 및 장비' : 'KCC HOMECC 정품',
        glass: r.isExtra ? '-' : '로이 복층유리',
        handle: r.isExtra ? '-' : '표준 핸들',
        mesh: r.isExtra ? '-' : '현장 기준',
        panes: 2,
        upgrade: false
      },
      quantity: r.qty,
      sale_unit_price: r.saleUnit,
      sale_total: r.saleTotal,
      amount_vat_inc: amountVatInc
    };
  });

  const rawPhone = String(c.phone || '').trim();
  const safeMeta = sanitizeDraftMeta(ed.meta);
  const excelQuoteNo = safeMeta?.kcc_quote_no || '900000-006428-017-001';
  const todayDateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '.');

  return {
    id: 0,
    project_id: c.id,
    kcc_quote_no: excelQuoteNo,
    quote_no: excelQuoteNo,
    published_at: todayDateStr,
    version: 1,
    title: ed.title || ((c.product || '창호') + ' 교체 견적서'),
    quote_type: ed.type || '가견적',
    customer_name: c.name || '고객',
    customer_phone: rawPhone,
    customer_address: c.address || '',
    product: c.product || '창호',
    material_subtotal: Number(totals.materialSubtotal) || 0,
    extra_subtotal: Number(totals.extraSubtotal) || 0,
    sale_price: Number(totals.sale) || 0,
    vat: Number(totals.vat) || 0,
    total_price: cashPrice,
    discount_amount: discountAmount,
    original_price: originalPrice,
    meta: safeMeta,
    split_deposit: splitDeposit,
    split_balance: splitBalance,
    plans: {
      cash: {
        key: 'cash',
        mainLabel: discountAmount > 0 ? '일시불 할인 적용 금액' : '일시불 예상 금액',
        mainAmount: cashPrice,
        deposit: splitDeposit,
        balance: splitBalance,
        total: cashPrice,
        name: discountAmount > 0 ? '일시불 특별 할인 결제' : '일시불 결제',
        detail: (discountAmount > 0 ? ('일시불 ' + num(discountAmount) + '원 할인 적용 · ') : '') + '총 ' + num(cashPrice) + '원 (선금 50% / 잔금 50%)',
        button: '일시불 결제 상담하기'
      },
      plan111: plan111Obj,
      plan222: plan222Obj,
      plan333: plan333Obj,
      lowmonthly: { ...plan111Obj, key: 'lowmonthly' },
      lowupfront: { ...plan222Obj, key: 'lowupfront' }
    },
    manager_name: quoteConsultManagerName || safeMeta?.supplier_manager || (c.owner && c.owner !== '미배정' ? c.owner : '전담 상담사'),
    manager_phone: quoteConsultPhone || safeMeta?.supplier_phone || '1588-0000',
    partner_name: safeMeta?.supplier_name || (c.partner === '직영' ? '(주)라이프앤조이' : c.partner),
    published_at: safeMeta?.quote_date || new Date().toISOString().slice(0, 10),
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

let page='customers', customerTab='all', quoteTab='all', contractTab='all', settingsTab='labels', role='본사 관리자', query='', stageFilter='', productFilter='', partnerFilter='', sourceFilter='', linkFilter='', periodFilter='all', sortOrder='new', productLinkCatFilter='all', productLinkQuery='', selected=new Set(), expandedQuoteInquiries=new Set(), detailId=null, detailTab='notes', editor=null, statsPeriod='30', restoreFocus=null, quotePreviewId=null;
let quoteConsultPhone = (()=>{try{return localStorage.getItem('kcc_quote_consult_phone')||'';}catch{return '';}})();
let quoteConsultManagerName = (()=>{try{return localStorage.getItem('kcc_quote_consult_manager')||'';}catch{return '';}})();
const menus=[['customers','고객관리','users'],['quotes','견적관리','file'],['contracts','계약관리','contract'],['products','상품관리','box'],['partners','파트너관리','building'],['stats','통계관리','chart'],['settings','설정','settings']];
const stages=['신규접수','상담중','가견적요청','견적안내','실측예정','최종견적','계약진행','시공완료','보류'];
function getContractStatuses() {
  if (Array.isArray(db.contractStatuses) && db.contractStatuses.length) {
    return [...db.contractStatuses].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));
  }
  return DEFAULT_CONTRACT_STATUSES.map(x => ({ ...x }));
}
function getContractStatusNames() {
  return getContractStatuses().map(s => s.name);
}
const stageColor = s => {
  const custom = getContractStatuses().find(st => st.name === s);
  if (custom) return custom.color === 'blue' ? '' : (custom.color || '');
  return ({'신규접수':'','상담중':'purple','가견적요청':'orange','견적안내':'','실측예정':'green','최종견적':'purple','계약진행':'green','계약완료':'green','시공완료':'gray','보류':'gray','접수완료':'','서류검토':'orange','서류보완':'red','보완요청':'red','심사중':'purple','승인':'green','약정완료':'green','반려':'gray','부결':'red','약정대기':'orange','선금완료':'','수납완료':'green'}[s]||'');
};
const badge=(text,color=stageColor(text))=>`<span class="badge ${color}">${esc(text)}</span>`;
const btn=(label,action,ic='',kind='',data='')=>`<button class="btn ${kind}" data-action="${action}" ${data}>${ic?icon(ic):''}${label}</button>`;
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
const isCashContract=k=>Boolean(k&&k.type!=='렌탈');
function parseItemTimeMs(item) {
  if (!item) return NaN;
  const raw = item.createdAt || item.created_at || '';
  if (raw) {
    const s = String(raw).trim();
    const iso = (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)))
      ? s
      : (/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T09:00:00+09:00` : `${s.replace(' ', 'T')}+09:00`);
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return ms;
  }
  if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(String(item.date).trim())) {
    const todayKst = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    if (String(item.date).trim() === todayKst) return Date.now() - 60 * 1000;
  }
  return NaN;
}
function isNewWithin24h(item) {
  const ms = parseItemTimeMs(item);
  if (Number.isNaN(ms)) return false;
  const diff = Date.now() - ms;
  return diff >= -300000 && diff <= 24 * 60 * 60 * 1000;
}
function newLabelHtml(item) {
  return isNewWithin24h(item) ? '<span class="new-label" title="최근 24시간 이내 신규 신청">NEW</span>' : '';
}
function getNewContractSummary() {
  const cs = visibleCustomers();
  const visIds = new Set(cs.map(c => c.id));
  const visContracts = (db.contracts || []).filter(k => visIds.has(k.cid));
  const visApps = (db.applications || []).filter(a => visIds.has(a.cid));

  const cashNew = visContracts.filter(k => isCashContract(k) && isNewWithin24h(k)).length;
  const rentalContractNew = visContracts.filter(k => k.type === '렌탈' && isNewWithin24h(k)).length;
  const rentalAppNew = visApps.filter(a => isNewWithin24h(a)).length;
  const allContractNew = cashNew + rentalContractNew;

  const rentalNewKeys = new Set();
  visContracts.filter(k => k.type === '렌탈' && isNewWithin24h(k)).forEach(k => rentalNewKeys.add('cid:' + k.cid));
  visApps.filter(a => isNewWithin24h(a)).forEach(a => rentalNewKeys.add(a.cid ? ('cid:' + a.cid) : ('app:' + a.id)));
  const rentalUniqueNew = rentalNewKeys.size;

  return {
    cashNew,
    rentalContractNew,
    rentalAppNew,
    rentalUniqueNew,
    allContractNew,
    totalNew: cashNew + rentalUniqueNew
  };
}
const visibleCustomers=()=>{const u=getActiveUser();return isPartnerUser(u)?db.customers.filter(c=>c.partner===(u.org||'')):db.customers};
const findC=id=>db.customers.find(c=>c.id===Number(id));
const accessibleC=id=>visibleCustomers().find(c=>c.id===Number(id));
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function audit(id,text){(db.history[id]??=[]).unshift({date:now(),text,by:getActiveUser().name});save()}
function options(arr,value,placeholder=''){return (placeholder?`<option value="">${placeholder}</option>`:'')+arr.map(s=>`<option value="${esc(s)}" ${s===value?'selected':''}>${esc(s)}</option>`).join('')}
function field(label,name,value='',type='text',required=false){const isMoney=type==='money';return `<div class="field"><label for="${name}">${label}${required?' <span>*</span>':''}</label><input class="input${isMoney?' money':''}" id="${name}" name="${name}" type="${isMoney?'text':type}" ${isMoney?'inputmode="numeric" data-money="1"':''} value="${esc(isMoney?num(value):value)}" ${required?'required':''}></div>`}
function selectField(label,name,arr,value=''){return `<div class="field"><label for="${name}">${label}</label><select class="input" id="${name}" name="${name}">${options(arr,value)}</select></div>`}
const symbol=()=>'<span class="brand-symbol"><i></i><i></i><i></i><i></i></span>';
function renderLoginScreen(){
    document.body.classList.add('login-view');
    $('#app').innerHTML=`<div class="crm-login-wrap">
      <div class="crm-login-bg" aria-hidden="true"></div>
      <section class="crm-login-card" aria-label="관리자 로그인">
        <div class="crm-login-head">
          <div class="crm-login-logo">
            <img src="${ADMIN_LOGO_URL}" alt="KCC 홈씨씨">
          </div>
          <span class="crm-login-badge">CRM WORKSPACE 3.0</span>
          <h1>어드민 접속 로그인</h1>
          <p>본사 관리자, 등록 사용자 및 파트너 계정으로 로그인하세요.</p>
        </div>
        <form id="crm-login-form" class="crm-login-form" autocomplete="on">
          <div class="field">
            <label for="login-username">아이디 <span>*</span></label>
            <input class="input" id="login-username" name="username" type="text" placeholder="아이디를 입력하세요" autocomplete="username" required autofocus>
          </div>
          <div class="field">
            <label for="login-password">비밀번호 <span>*</span></label>
            <input class="input" id="login-password" name="password" type="password" placeholder="비밀번호를 입력하세요" autocomplete="current-password" required>
          </div>
          <div id="crm-login-error" class="crm-login-error" role="alert" hidden></div>
          <button type="submit" class="btn primary block crm-login-submit" id="crm-login-submit">로그인</button>
        </form>
        <div class="crm-login-foot">
          <div class="crm-login-notice">
            ${icon('shield','sm')}
            <span>등록된 <strong>본사 사용자</strong> 또는 <strong>파트너 계정</strong>만 접속할 수 있습니다.</span>
          </div>
          <small>© LIFE &amp; JOY · KCC HOMECC CRM 3.0</small>
        </div>
      </section>
    </div>`;
    const form=$('#crm-login-form');
    if(form){
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameEl = $('#login-username');
        const passwordEl = $('#login-password');
        const errEl = $('#crm-login-error');
        const btnEl = $('#crm-login-submit');
        const username = (usernameEl?.value || '').trim();
        const password = (passwordEl?.value || '').trim();
        if (!username || !password) {
          if (errEl) { errEl.textContent = '아이디와 비밀번호를 모두 입력해 주세요.'; errEl.hidden = false; }
          return;
        }
        if (errEl) errEl.hidden = true;
        if (btnEl) { btnEl.disabled = true; btnEl.textContent = '로그인 중...'; }
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.token) {
            if (errEl) {
              errEl.textContent = data.error || '아이디 또는 비밀번호가 일치하지 않습니다.';
              errEl.hidden = false;
            }
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = '로그인'; }
            return;
          }
          authToken = data.token;
          try { sessionStorage.setItem('kcc_auth_token', authToken); } catch {}
          if (!isSessionIsolated) {
            try { localStorage.setItem('kcc_auth_token', authToken); } catch {}
          }
          if (data.user) {
            const norm = normalizeUserRecord(data.user);
            activeUsername = norm.username;
            try { sessionStorage.setItem('kcc_active_username', activeUsername); } catch {}
            if (!isSessionIsolated) {
              try { localStorage.setItem('kcc_active_username', activeUsername); } catch {}
            }
            const rIdx = userRoster.findIndex(x => x.username === norm.username || Number(x.id) === Number(norm.id));
            if (rIdx !== -1) userRoster[rIdx] = norm;
            else userRoster.push(norm);
            role = isPartnerUser(norm) ? '파트너 관리자' : '본사 관리자';
          }
          await syncFromServer();
          document.body.classList.remove('login-view');
          render();
          startRealtimeSync();
          const activeU = getActiveUser();
          toast(`${activeU.name} (${activeU.org})님으로 로그인되었습니다.`);
        } catch (err) {
          if (errEl) {
            errEl.textContent = '서버 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
            errEl.hidden = false;
          }
          if (btnEl) { btnEl.disabled = false; btnEl.textContent = '로그인'; }
        }
      });
    }
}
function render(){
    if(!authToken && !(isSessionIsolated && switchUserParam)){
      renderLoginScreen();
      return;
    }
    document.body.classList.remove('login-view');
    const activeU=getActiveUser();
    role=isPartnerUser(activeU)?'파트너 관리자':'본사 관리자';
    const allowedKeys=getUserAllowedMenuKeys(activeU);
    const allowedMenus=menus.filter(m=>allowedKeys.includes(m[0]));
    if(!allowedMenus.some(m=>m[0]===page))page=allowedMenus[0]?.[0]||'customers';
    const current=menus.find(m=>m[0]===page)||menus[0];
    const quickTabs=allowedMenus.slice(0,3);
    const isSecondaryPage=!quickTabs.some(t=>t[0]===page);
    const newSummary=getNewContractSummary();
    const isHqAdmin=activeU.role==='hq_admin';
    const rosterList=(userRoster.length?userRoster:(db.users||[]).map((u,i)=>normalizeUserRecord(u,i))).filter(u=>u.active!==false);
    $('#app').innerHTML=`<div class="app"><div class="sidebar-backdrop ${mobileNavOpen?'open':''}" data-action="close-nav" aria-hidden="true"></div><aside class="sidebar ${mobileNavOpen?'open':''}" id="app-sidebar" aria-label="전체 좌측 메뉴"><div class="brand"><div class="brand-top"><div class="brand-logo-card" style="background:#ffffff;padding:5px 9px;border-radius:6px;display:inline-flex;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.18)"><img src="${ADMIN_LOGO_URL}" alt="KCC 홈씨씨" style="height:22px;width:auto;display:block;object-fit:contain"></div><button type="button" class="sidebar-close-btn" data-action="close-nav" aria-label="메뉴 닫기">${icon('close')}</button></div><small style="margin-left:0;margin-top:7px;display:block">CRM WORKSPACE</small></div><div class="workspace"><span>운영 파트너</span><strong>${esc(activeU.org==='라이프앤조이'?'(주)라이프앤조이':activeU.org)}</strong></div><div class="nav-label">WORKSPACE</div><nav>${allowedMenus.map(m=>`<button class="nav-btn ${page===m[0]?'active':''}" data-action="nav" data-page="${m[0]}" title="${m[1]}" aria-label="${m[1]}" ${page===m[0]?'aria-current="page"':''}>${icon(m[2])}<span>${m[1]}</span>${m[0]==='customers'?`<em>${visibleCustomers().length}</em>`:''}${m[0]==='contracts'&&newSummary.totalNew>0?`<em class="nav-red-count" title="24시간 이내 일시불·렌탈 신규신청 ${newSummary.totalNew}건">${newSummary.totalNew}</em>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-mobile-user" data-action="my-profile" style="cursor:pointer" title="내 정보 / 비밀번호 수정"><div class="avatar">${esc((activeU.name||'관리').slice(-2))}</div><div><strong>${esc(activeU.name)}</strong><small>${esc(activeU.role_label)} · ${esc(activeU.org)}</small></div></div><div class="sidebar-note"><b><span class="dot"></span>운영 시스템</b>실시간 DB 및 권한 연동 중</div><div class="version"><span>KCC HOMECC</span><span>Ver. 3.0</span></div></div></aside><div class="shell"><header class="topbar"><div class="topbar-left"><button type="button" class="mobile-more-btn ${mobileNavOpen?'active-open':''}" data-action="toggle-nav" aria-controls="app-sidebar" aria-expanded="${mobileNavOpen}" aria-label="좌측 메뉴 더보기">${icon('menu')}<span>더보기</span></button><div class="breadcrumb"><span>${esc(activeU.org)}</span>${icon('chevron')}<b>${current[1]}</b></div></div><div class="top-actions">${isHqAdmin?`<select class="role-select" id="role-switch" aria-label="사용자 화면 전환">${rosterList.map(u=>`<option value="${esc(u.username)}" ${u.username===activeU.username?'selected':''}>${esc(u.name)} (${esc(u.role_label)})</option>`).join('')}</select>`:`<div class="header-partner-pill" title="현재 소속 파트너 계정">${icon('building','sm')}<strong>${esc(activeU.org)}</strong><small>(${esc(activeU.role_label)})</small></div>`}<button class="bell" data-action="notifications" aria-label="업무 알림">${icon('bell')}</button><button type="button" class="btn sm soft" data-action="refresh-data" title="최신 데이터 새로고침" style="padding:6px 10px;font-size:12px;gap:4px">${icon('refresh','sm')}<span>새로고침</span></button><button type="button" class="btn sm soft" data-action="my-profile" title="내 정보 / 비밀번호 수정" style="padding:6px 10px;font-size:12px;gap:4px">${icon('edit','sm')}<span>내 정보</span></button><div class="user" data-action="my-profile" style="cursor:pointer" title="클릭하여 내 정보/비밀번호 수정"><div class="avatar">${esc((activeU.name||'관리').slice(-2))}</div><div><strong>${esc(activeU.name)}</strong><small>${esc(activeU.role_label)}</small></div></div><button type="button" class="btn sm" data-action="logout" title="로그아웃" style="padding:6px 10px;font-size:12px">로그아웃</button></div></header><main id="main">${({customers:customersPage,quotes:quotesPage,contracts:contractsPage,products:productsPage,partners:partnersPage,stats:statsPage,settings:settingsPage}[page])()}<div class="page-footer"><span>© LIFE & JOY · KCC HOMECC CRM 3.0</span><span>실운영 데이터 연동 시스템</span></div></main><nav class="mobile-bottom-nav" aria-label="모바일 빠른 메뉴" style="grid-template-columns:repeat(${quickTabs.length+1},1fr)">${quickTabs.map(t=>`<button type="button" class="m-tab ${!mobileNavOpen&&page===t[0]?'active':''}" data-action="nav" data-page="${t[0]}" ${page===t[0]?'aria-current="page"':''}>${icon(t[2])}<span>${t[1]}</span>${t[0]==='contracts'&&newSummary.totalNew>0?`<span class="m-red-count">${newSummary.totalNew}</span>`:''}</button>`).join('')}<button type="button" class="m-tab more-trigger ${mobileNavOpen||isSecondaryPage?'active':''} ${mobileNavOpen?'active-open':''}" data-action="toggle-nav" aria-controls="app-sidebar" aria-expanded="${mobileNavOpen}">${icon('grid')}<span>더보기</span></button></nav></div></div>`}
function pageHead(title,sub,actions='',eyebrow='WORKSPACE'){const todayLabel=new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'long',timeZone:'Asia/Seoul'});return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions"><span class="date-label">${todayLabel}</span>${actions}</div></div>`}
function metric(label,value,unit,foot,ic,color='',action='',data=''){return `<${action?'button':'div'} class="metric ${color}" ${action?`data-action="${action}" ${data}`:''}><span class="metric-label">${label}</span><span class="metric-icon">${icon(ic)}</span><strong>${value}<small>${unit}</small></strong><span class="metric-foot">${foot}</span></${action?'button':'div'}>`}
function getChannelFilterOptions() {
  const set = new Set();
  visibleCustomers().forEach(c => {
    const ch = getCustomerChannel(c);
    if (ch) set.add(ch);
  });
  (db.landingLinks || []).forEach(ll => {
    if (ll.channel) set.add(ll.channel);
  });
  return [...set];
}
function getActivityState(item) {
  if (!item) return { kind: 'none', ts: 0 };
  const nowMs = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const rawC = item.createdAt || item.created_at || '';
  const rawU = item.updatedAt || item.updated_at || '';
  const cMs = rawC ? parseItemTimeMs({ createdAt: rawC }) : NaN;
  const uMs = rawU ? parseItemTimeMs({ createdAt: rawU }) : NaN;
  const maxTs = Math.max(Number.isNaN(cMs) ? 0 : cMs, Number.isNaN(uMs) ? 0 : uMs);
  const isUpdated24h = !Number.isNaN(uMs) && (nowMs - uMs >= -300000) && (nowMs - uMs <= DAY_MS) &&
    (Number.isNaN(cMs) || uMs - cMs > 2000);
  if (isUpdated24h) return { kind: 'updated', ts: uMs };
  const isNew24h = !Number.isNaN(cMs) && (nowMs - cMs >= -300000) && (nowMs - cMs <= DAY_MS);
  if (isNew24h) return { kind: 'new', ts: cMs };
  return { kind: 'none', ts: maxTs };
}
function getCustomerActivityState(c) {
  return getActivityState(c);
}
function getQuoteRowActivityState(c) {
  const latestQ = (c.publishedQuotes && c.publishedQuotes[0]) || c.finalQuote || c.roughQuote || null;
  const latestInq = Array.isArray(c.quoteInquiries) && c.quoteInquiries.length ? c.quoteInquiries[0] : null;
  const candidates = [getActivityState(c), getActivityState(latestQ), getActivityState(latestInq)];
  return candidates.reduce((best, cur) => {
    const bestActive = best.kind !== 'none';
    const curActive = cur.kind !== 'none';
    if (curActive !== bestActive) return curActive ? cur : best;
    return cur.ts > best.ts ? cur : best;
  }, { kind: 'none', ts: 0 });
}
function sortByActivityState(list, getStateFn, fallbackCmp) {
  return [...list].sort((a, b) => {
    const actA = getStateFn(a);
    const actB = getStateFn(b);
    const activeA = actA.kind !== 'none' ? 1 : 0;
    const activeB = actB.kind !== 'none' ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    if (actA.ts !== actB.ts) return actB.ts - actA.ts;
    return fallbackCmp ? fallbackCmp(a, b) : 0;
  });
}
function activityStripInfo(act, newTitle = '최근 24시간 이내 신규 등록') {
  if (!act || act.kind === 'none') return { cls: '', badge: '' };
  if (act.kind === 'updated') {
    return {
      cls: ' is-updated-24h',
      badge: '<span class="cust-strip-badge is-updated" title="최근 24시간 이내 수정">수정</span>'
    };
  }
  return {
    cls: ' is-new-24h',
    badge: `<span class="cust-strip-badge is-new" title="${esc(newTitle)}">신규</span>`
  };
}
function filteredCustomers() {
  const qLow = query.trim().toLowerCase();
  const todayKst = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const weekAgoMs = Date.now() - 6 * 86400000;
  const weekAgoKst = new Date(weekAgoMs).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  return visibleCustomers().filter(c => {
    const ch = getCustomerChannel(c);
    if (qLow) {
      const hay = [c.name, c.phone, c.address, c.id, ch, c.source, c.adCampaign, c.partner].join(' ').toLowerCase();
      if (!hay.includes(qLow)) return false;
    }
    if (stageFilter && c.status !== stageFilter) return false;
    if (productFilter && c.product !== productFilter) return false;
    if (partnerFilter && c.partner !== partnerFilter) return false;
    if (sourceFilter && ch !== sourceFilter) return false;
    if (linkFilter && Number(c.landingLinkId) !== Number(linkFilter)) return false;
    if (periodFilter === 'today' && c.date !== todayKst) return false;
    if (periodFilter === '7' && c.date < weekAgoKst) return false;
    if (customerTab === 'mine' && c.owner !== getActiveUser().name) return false;
    if (customerTab === 'unassigned' && c.owner !== '미배정') return false;
    if (customerTab === 'unread' && !(c.quote > 0 && !c.viewed)) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'old') return a.id - b.id;
    const actA = getCustomerActivityState(a);
    const actB = getCustomerActivityState(b);
    const activeA = actA.kind !== 'none' ? 1 : 0;
    const activeB = actB.kind !== 'none' ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    if (actA.ts !== actB.ts) return actB.ts - actA.ts;
    return b.date.localeCompare(a.date) || b.id - a.id;
  });
}
function customerRows(){const list=filteredCustomers();return list.length?list.map(c=>{const ll=findCustomerLandingLink(c);const ch=getCustomerChannel(c);const camp=c.adCampaign||ll?.name||'';const act=getCustomerActivityState(c);const stripCls=act.kind==='updated'?' is-updated-24h':(act.kind==='new'?' is-new-24h':'');const stripBadge=act.kind==='updated'?'<span class="cust-strip-badge is-updated" title="최근 24시간 이내 수정">수정</span>':(act.kind==='new'?'<span class="cust-strip-badge is-new" title="최근 24시간 이내 신규 등록">신규</span>':'');return `<article class="customer-row${stripCls}" data-action="customer" data-id="${c.id}" tabindex="0" aria-label="${esc(c.name)} 고객 상세"><input type="checkbox" data-select="${c.id}" ${selected.has(c.id)?'checked':''} aria-label="${c.name} 선택"><div><div class="row-top">${stripBadge}${badge(c.status)}${c.label!=='일반'?badge(c.label,c.label==='긴급'?'red':c.label==='완료'?'green':'orange'):''}<span class="row-code">No. ${c.id}</span><span class="row-code">${c.date.slice(5).replace('-','.')}</span></div><div class="name-line">${badge(c.product,c.product==='주방'?'purple':c.product==='욕실'?'green':'')}<b>${esc(c.name)}</b><span>${esc(c.phone)}</span></div><div class="row-address">${icon('pin')}${esc(c.address)}</div><div class="row-meta"><span class="ch-pill ${channelTone(ch)}">${esc(ch)}</span>${camp?`<span class="ch-campaign-label" title="유입 광고 캠페인/링크명">${esc(camp)}</span>`:''}<span>· ${esc(c.partner)}</span>${c.measure?`<span>· 실측 ${c.measure.slice(5)}</span>`:''}</div></div><div class="row-activity"><div class="line"><span class="tag">상담</span><div><p>${c.note?esc(c.note):'<span style="color:var(--muted)">등록된 상담 이력이 없습니다.</span>'}</p><small>${esc(c.noteMeta?.date||formatShortKstClient(c.createdAt)||(c.date?c.date.slice(5).replace('-','.'):''))} · ${esc(c.noteMeta?.by||c.owner)}</small></div></div><div class="line feedback"><span class="tag feedback">피드백</span><p>${c.feedback?esc(c.feedback):'<span style="color:var(--muted)">등록된 피드백이 없습니다.</span>'}</p></div></div><div class="row-end"><div class="row-owner"><span class="mini-avatar">${c.owner==='미배정'?'–':esc(c.owner.slice(-2))}</span>${esc(c.owner)}</div><div class="row-links">${c.quote?(c.roughQuote&&c.finalQuote?`<button class="link-chip" data-action="preview" data-id="${c.id}" data-type="가견적">가견적 ↗</button><button class="link-chip" style="background:#eef8f4;border-color:#a8dac6;color:#1f6853" data-action="preview" data-id="${c.id}" data-type="최종견적">최종견적 ↗</button>`:`<button class="link-chip" data-action="preview" data-id="${c.id}" data-type="${esc(c.quoteType||'가견적')}">${esc(c.quoteType||'가견적')} ↗</button>`):`<button class="link-chip muted" data-action="new-quote" data-id="${c.id}">견적 작성</button>`}${c.quote?`<button class="link-chip" style="background:#fffbeb;border-color:#f2d675;color:#855a00" data-action="send-quote" data-id="${c.id}">문자·카톡</button>`:''}<button class="link-chip" data-action="customer" data-id="${c.id}">상세보기</button></div><div class="row-bottom">${c.quote?(c.viewed?'● 고객 열람 완료':'○ 아직 열람하지 않음')+(c.dispatchCount?` · 발송 ${c.dispatchCount}회`:''):'견적 발행 전'}</div></div></article>`}).join(''):`<div class="empty">${icon('search')}<strong>조건에 맞는 고객이 없습니다.</strong>검색어나 필터를 변경해 주세요.</div>`}
function customersPage(){
  const c = visibleCustomers();
  const channelOptions = getChannelFilterOptions();
  const activeLinkObj = linkFilter ? (db.landingLinks || []).find(ll => Number(ll.id) === Number(linkFilter)) : null;
  const linkFilterBanner = linkFilter ? `<div class="active-link-filter-bar"><div>${icon('link')}<span>선택된 광고링크 유입 고객만 보는 중:</span> <span class="ch-pill ${channelTone(activeLinkObj?.channel || sourceFilter)}">${esc(activeLinkObj?.channel || sourceFilter || '광고링크')}</span> <b>${esc(activeLinkObj?.name || ('링크 #' + linkFilter))}</b></div><button type="button" class="btn sm" data-action="clear-link-filter">${icon('close')}필터 해제 (전체 보기)</button></div>` : '';
  const filteredList = filteredCustomers();
  const allCustSelected = filteredList.length > 0 && filteredList.every(x => selected.has(x.id));
  return pageHead('고객관리','고객의 첫 문의부터 계약까지, 한눈에 관리하세요.',btn('새로고침','refresh-data','refresh','secondary')+btn('일정 보기','calendar','calendar','secondary')+btn('고객 등록','new-customer','plus','primary'),'CUSTOMER MANAGEMENT')+`<div class="metrics">${metric('전체 고객',c.length,'건','현재 등록된 전체 공사건','users','','filter-all')}${metric('견적 요청 대기',c.filter(x=>x.status==='가견적요청').length,'건','<span class="accent">원본 견적 수령</span>이 필요해요','file','orange','filter-stage','data-value="가견적요청"')}${metric('실측 예정',c.filter(x=>x.status==='실측예정').length,'건','담당팀과 방문 일정을 확인하세요','calendar','purple','filter-stage','data-value="실측예정"')}${metric('계약 진행',c.filter(x=>x.status==='계약진행').length,'건','서류 검토와 수납 상태 확인','contract','green','filter-stage','data-value="계약진행"')}</div><section class="panel"><div class="tabs">${[['all','전체 고객'],['mine','내 담당 고객'],['unassigned','미배정'],['unread','견적 미열람']].map(([v,l])=>`<button class="tab ${customerTab===v?'active':''}" data-action="customer-tab" data-value="${v}">${l}${v==='all'?`<span class="count">${c.length}</span>`:''}</button>`).join('')}</div><div class="filters"><div class="search-field">${icon('search')}<input class="input" id="customer-search" value="${esc(query)}" placeholder="고객명, 연락처, 주소, 광고채널 검색" aria-label="고객 검색"></div><select class="select" id="filter-period" aria-label="등록 기간"><option value="all" ${periodFilter==='all'?'selected':''}>등록 기간 전체</option><option value="today" ${periodFilter==='today'?'selected':''}>오늘</option><option value="7" ${periodFilter==='7'?'selected':''}>최근 7일</option></select><select class="select" id="filter-product" aria-label="상품군">${options(['창호','주방','욕실'],productFilter,'상품군 전체')}</select><select class="select" id="filter-stage" aria-label="진행구분">${options(stages,stageFilter,'진행구분 전체')}</select><select class="select" id="filter-source" aria-label="유입채널">${options(channelOptions,sourceFilter,'유입채널 전체')}</select>${role==='본사 관리자'?`<select class="select" id="filter-partner" aria-label="소속 파트너">${options(['직영',...db.partners.map(p=>p.name)],partnerFilter,'파트너 전체')}</select>`:''}<button class="icon-btn" data-action="reset-filters" title="필터 초기화" aria-label="필터 초기화">${icon('refresh')}</button></div>${linkFilterBanner}<div class="toolbar"><span id="list-count" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" data-select-all="customers" ${allCustSelected?'checked':''}> 전체 선택</label><span>검색 결과 <strong>${filteredList.length}</strong>건</span>${selected.size?`· <button type="button" data-action="assign" style="color:var(--blue)">${selected.size}명 담당자 배정</button> · ${btn(`선택 삭제 (${selected.size})`,'delete-selected','trash','sm danger')}`:''}</span><div class="actions">${btn(selected.size?`선택 엑셀 (${selected.size})`:'엑셀용 CSV','export','download','sm')}<select class="sort" id="sort-order" aria-label="정렬 순서"><option value="new" ${sortOrder==='new'?'selected':''}>최근 등록순</option><option value="old" ${sortOrder==='old'?'selected':''}>고객번호 낮은순</option></select></div></div><div class="customers" id="customer-rows">${customerRows()}</div><div class="pagination"><span>전체 결과를 한 페이지에 표시합니다.</span><div class="pages"><button class="active" aria-label="현재 1페이지">1</button></div></div></section>`;
}
function renderQuotePreviewButtons(c, sizeCls = 'sm soft') {
  if (!c || !c.quote) return '';
  const hasRough = Boolean(c.roughQuote);
  const hasFinal = Boolean(c.finalQuote);
  if (hasRough || hasFinal) {
    return (hasRough ? btn('가견적 보기', 'preview', 'eye', sizeCls, `data-id="${c.id}" data-type="가견적"`) : '') +
           (hasFinal ? btn('최종견적 보기', 'preview', 'eye', sizeCls, `data-id="${c.id}" data-type="최종견적"`) : '');
  }
  const fallbackType = c.quoteType === '최종견적' ? '최종견적' : '가견적';
  return btn(`${fallbackType} 보기`, 'preview', 'eye', sizeCls, `data-id="${c.id}" data-type="${fallbackType}"`);
}

function getQuoteRows() {
  const cs = visibleCustomers();
  const ready = cs.filter(c => c.status === '가견적요청');
  const published = cs.filter(c => c.quote > 0);
  const withInquiries = cs.filter(c => Array.isArray(c.quoteInquiries) && c.quoteInquiries.length > 0);
  const allRows = sortByActivityState(
    [...new Map([...ready, ...published, ...withInquiries].map(c => [c.id, c])).values()],
    getQuoteRowActivityState,
    (a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id
  );
  const inquiryRows = allRows.filter(c => Array.isArray(c.quoteInquiries) && c.quoteInquiries.length > 0);
  return { cs, ready, published, allRows, inquiryRows };
}

function renderQuoteInquiryDetailRow(c) {
  const inquiries = Array.isArray(c.quoteInquiries) ? c.quoteInquiries : [];
  if (!inquiries.length) return '';
  return `<tr class="quote-inquiry-detail-row"><td colspan="8"><div class="quote-inquiry-box">
    <div class="quote-inquiry-box-head">
      <strong>${esc(c.name)} 고객 견적 문의 내역 (${inquiries.length}건)</strong>
      <button type="button" class="btn sm soft" data-action="customer" data-id="${c.id}">고객 상세·상담이력 보기</button>
    </div>
    <div class="quote-inquiry-list">
      ${inquiries.map(inq => {
        const topics = Array.isArray(inq.topics) && inq.topics.length ? inq.topics : ['견적 전반 상담'];
        return `<div class="quote-inquiry-item">
          <div class="quote-inquiry-item-top">
            <span class="quote-inquiry-time">${esc(inq.createdAtText || (inq.createdAt ? String(inq.createdAt).slice(5, 16).replace('T', ' ') : '-'))}</span>
            <span class="quote-inquiry-pref">희망 연락시간: <b>${esc(inq.preferredTime || '상관없음')}</b></span>
            ${inq.planSummary ? `<span class="quote-inquiry-plan">선택 조건: ${esc(inq.planSummary)}</span>` : ''}
          </div>
          <div class="quote-inquiry-topics">
            ${topics.map(t => `<span class="badge blue">${esc(t)}</span>`).join('')}
          </div>
          ${inq.memo ? `<div class="quote-inquiry-memo"><b>남기신 메모:</b> ${esc(inq.memo)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div></td></tr>`;
}

function quotesPage() {
  const { ready, published, allRows, inquiryRows } = getQuoteRows();
  const rows = quoteTab === 'inquiries' ? inquiryRows : allRows;
  const allQuotesSelected = rows.length > 0 && rows.every(c => selected.has(c.id));
  const tabMeta = [
    ['all', '전체 견적', allRows.length, false],
    ['inquiries', '고객 문의', inquiryRows.length, inquiryRows.length > 0]
  ];
  return pageHead('견적관리', '원본 견적을 고객에게 전달할 최적의 제안으로 완성하세요.', btn('견적 만들기', 'new-quote', 'plus', 'primary'), 'ESTIMATE WORKSPACE') +
    `<div class="metrics">${metric('원본 수령 대기', ready.length, '건', 'KCC 영업지원팀 요청 건', 'clock', 'orange')}${metric('발행된 견적', published.length, '건', '고객별 최신 견적 기준', 'file')}${metric('고객 열람', published.filter(c => c.viewed).length, '건', '발행 이후 열람한 고객', 'eye', 'green')}${metric('견적 문의', inquiryRows.length, '건', '모바일 견적서 고객 문의', 'bell', 'purple', 'quote-tab', 'data-value="inquiries"')}</div>` +
    `<div class="banner">${icon('info')}<div><b>원본 엑셀 → 판매가 설정 → 고객견적 발행</b><br>공급원가와 내부 마진은 고객용 견적서에 표시되지 않습니다. 고객이 견적서에서 문의를 남기면 고객명 옆 토글 및 [고객 문의] 탭에서 바로 확인할 수 있습니다.</div></div>` +
    `<section class="panel"><div class="tabs">${tabMeta.map(([v, l, cnt, isAlert]) => `<button class="tab ${quoteTab === v ? 'active' : ''}" data-action="quote-tab" data-value="${v}">${l}${cnt > 0 ? `<span class="count${isAlert ? ' count-red' : ''}">${cnt}</span>` : ''}</button>`).join('')}</div><div class="panel-head"><div><h3>${quoteTab === 'inquiries' ? '고객 견적 문의 내역' : '견적 요청 및 발행 현황'}</h3><p>${quoteTab === 'inquiries' ? '모바일 견적서에서 상담·문의를 요청한 고객 목록입니다.' : '고객·공사건에 연결된 견적을 관리합니다.'}</p></div>${badge('실운영 데이터', 'blue')}</div><div class="toolbar"><span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" data-select-all="quotes" ${allQuotesSelected ? 'checked' : ''}> 전체 선택</label><span>목록 <strong>${rows.length}</strong>건</span>${selected.size ? `· ${btn(`선택 삭제 (${selected.size})`, 'delete-selected', 'trash', 'sm danger')}` : ''}</span><div class="actions">${btn(selected.size ? `선택 엑셀 (${selected.size})` : '엑셀용 CSV', 'export', 'download', 'sm')}</div></div><div class="table-wrap"><table class="mobile-card-table"><thead><tr><th style="width:36px"><input type="checkbox" data-select-all="quotes" ${allQuotesSelected ? 'checked' : ''} aria-label="견적 고객 전체 선택"></th><th>고객 / 견적번호</th><th>상품</th><th>진행 상태</th><th>고객 견적금액</th><th>고객 열람</th><th>담당자</th><th>관리</th></tr></thead><tbody>${rows.length ? rows.map(c => {
      const quoteAct = getQuoteRowActivityState(c);
      const strip = activityStripInfo(quoteAct);
      const quoteStripBadge = quoteAct.kind === 'updated' ? '' : strip.badge;
      const inqList = Array.isArray(c.quoteInquiries) ? c.quoteInquiries : [];
      const isExpanded = expandedQuoteInquiries.has(c.id);
      const latestInq = inqList[0] || null;
      const inqToggleHtml = inqList.length
        ? `<button type="button" class="quote-inquiry-toggle${isExpanded ? ' open' : ''}" data-action="toggle-quote-inquiry" data-id="${c.id}" aria-expanded="${isExpanded}" title="고객 문의 내용 토글">문의 ${inqList.length}건 ${isExpanded ? '▲' : '▼'}</button>`
        : '';
      const inqPreviewHtml = (quoteTab === 'inquiries' && latestInq && !isExpanded)
        ? `<div class="quote-inquiry-inline-preview">${esc((latestInq.topics || []).join(', ') || '견적 상담')}${latestInq.memo ? ` · "${esc(latestInq.memo)}"` : ''}</div>`
        : '';
      return `<tr class="${strip.cls.trim()}"><td><input type="checkbox" data-select="${c.id}" ${selected.has(c.id) ? 'checked' : ''} aria-label="${esc(c.name)} 선택"></td><td class="card-primary"><div class="quote-cust-name-row">${quoteStripBadge}<button type="button" class="quote-customer-name" data-action="customer" data-id="${c.id}" title="고객 상세 보기" style="background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--navy);cursor:pointer;text-align:left">${esc(c.name)}</button>${inqToggleHtml}</div><small>${c.quote ? 'Q' : 'REQ'}-${c.id} · ${esc(c.address)}</small>${inqPreviewHtml}</td><td data-label="상품">${badge(c.product, 'gray')}</td><td data-label="진행 상태">${badge(c.quote ? '발행완료' : '원본대기', c.quote ? 'green' : 'orange')}</td><td data-label="고객 견적금액" class="money"><b>${c.quote ? won(c.quote) : '—'}</b></td><td data-label="고객 열람">${c.quote ? badge(c.viewed ? '열람완료' : '미열람', c.viewed ? 'green' : 'gray') : '—'}</td><td data-label="담당자">${esc(c.owner)}</td><td class="card-actions"><div class="actions">${btn(c.quote ? '수정본 작성' : '엑셀 등록', 'new-quote', c.quote ? 'edit' : 'upload', 'sm', `data-id="${c.id}"`)}${c.quote ? renderQuotePreviewButtons(c, 'sm soft') + btn('문자·카톡 발송', 'send-quote', 'send', 'sm primary', `data-id="${c.id}"`) : ''}</div></td></tr>` + (isExpanded ? renderQuoteInquiryDetailRow(c) : '');
    }).join('') : `<tr><td colspan="8"><div class="empty">${icon('file')}<strong>${quoteTab === 'inquiries' ? '접수된 견적 문의가 없습니다.' : '아직 견적 요청 또는 발행된 견적이 없습니다.'}</strong>${quoteTab === 'inquiries' ? '고객이 모바일 견적서에서 문의를 남기면 이곳에 표시됩니다.' : '고객을 등록한 뒤 원본 엑셀로 견적서를 발행해 보세요.'}</div></td></tr>`}</tbody></table></div></section>`;
}
function contractsPage(){
  const cs = visibleCustomers();
  const items = db.contracts.filter(k => cs.some(c => c.id === k.cid));
  const apps = sortByActivityState(
    db.applications.filter(k => cs.some(c => c.id === k.cid)),
    getActivityState,
    (a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''))
  );
  const ns = getNewContractSummary();
  const canEditSettings = getUserAllowedMenuKeys(getActiveUser()).includes('settings');
  const shownContracts = sortByActivityState(
    items.filter(k => contractTab === 'all' || isCashContract(k)),
    getActivityState,
    (a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''))
  );
  const rentalNewCount = Math.max(ns.rentalAppNew, ns.rentalUniqueNew);

  const headBtns = (canEditSettings ? btn('계약·수납상태 설정', 'go-contract-settings', 'settings', 'secondary') : '') +
    btn('계약 등록', 'new-contract', 'plus', 'primary');

  const newBanner = ns.totalNew > 0
    ? `<div class="new-24h-bar">
        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
          ${icon('bell')}
          <b>최근 24시간 이내 신규 접수 <span class="new-count-highlight">${ns.totalNew}건</span></b>
          <span class="new-bar-desc">신규 계약 및 렌탈 신청 건에 <span class="new-label" style="vertical-align:1px">NEW</span> 라벨이 자동 표시됩니다.</span>
        </div>
      </div>`
    : '';

  const tabMeta = [
    ['all', '전체 계약', ns.allContractNew],
    ['cash', '일시불·수납', ns.cashNew],
    ['rental', '렌탈 신청', ns.rentalAppNew]
  ];
  const contractRowCids = [...new Set((contractTab === 'rental' ? apps : shownContracts).map(x => Number(x.cid)).filter(Boolean))];
  const allContractsSelected = contractRowCids.length > 0 && contractRowCids.every(cid => selected.has(cid));

  return pageHead('계약관리', '공사계약, 모바일 렌탈 접수·심사, 수납 현황을 함께 확인하세요.', headBtns, 'CONTRACT & PAYMENT') +
    `<div class="metrics">
      ${metric('전체 계약', items.length, '건', ns.allContractNew > 0 ? `공사건별 계약 현황 <span class="metric-red-num">신규 <b>${ns.allContractNew}</b></span>` : '공사건별 계약 현황', 'contract', '', 'contract-tab', 'data-value="all"')}
      ${metric('렌탈 신청', apps.length, '건', ns.rentalAppNew > 0 ? `신청 접수와 약정 단계 <span class="metric-red-num">신규 <b>${ns.rentalAppNew}</b></span>` : '신청 접수와 약정은 별도 단계', 'file', 'purple', 'contract-tab', 'data-value="rental"')}
      ${metric('실제 수납액', num(Math.round(items.reduce((s, k) => s + k.paid, 0) / 10000)), '만원', '현금·카드 누적 수납 합계', 'credit', 'green')}
      ${metric('일시불 미수금', num(Math.round(items.filter(k => isCashContract(k)).reduce((s, k) => s + k.amount - k.paid, 0) / 10000)), '만원', ns.cashNew > 0 ? `렌탈 제외 <span class="metric-red-num">일시불 신규 <b>${ns.cashNew}</b></span>` : '렌탈사 정산 예정액 제외', 'clock', 'orange', 'contract-tab', 'data-value="cash"')}
    </div>` +
    newBanner +
    `<section class="panel">
      <div class="tabs">${tabMeta.map(([v, l, newCnt]) => `<button class="tab ${contractTab === v ? 'active' : ''}" data-action="contract-tab" data-value="${v}">${l}${newCnt > 0 ? `<span class="count count-red" title="최근 24시간 신규 ${newCnt}건">${newCnt}</span>` : ''}</button>`).join('')}</div>
      <div class="toolbar"><span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" data-select-all="contracts" ${allContractsSelected ? 'checked' : ''}> 전체 선택</label><span>목록 <strong>${contractRowCids.length}</strong>건</span>${selected.size ? `· ${btn(`선택 삭제 (${selected.size})`, 'delete-selected', 'trash', 'sm danger')}` : ''}</span><div class="actions">${btn(selected.size ? `선택 엑셀 (${selected.size})` : '엑셀용 CSV', 'export', 'download', 'sm')}</div></div>
      <div class="table-wrap">
        <table class="mobile-card-table contract-master-table">
          <thead><tr><th style="width:36px"><input type="checkbox" data-select-all="contracts" ${allContractsSelected ? 'checked' : ''} aria-label="계약 고객 전체 선택"></th>${contractTab === 'rental' 
            ? '<th style="width:26%">고객 / 신청번호</th><th style="width:18%">렌탈 조건</th><th style="width:20%">월 납부금</th><th style="width:14%">심사 상태</th><th style="width:10%">접수일시</th><th style="width:12%">관리</th>' 
            : '<th style="width:24%">고객 / 공사건</th><th style="width:12%">결제방식</th><th style="width:20%">계약금액 / 조건</th><th style="width:18%">수납 / 선납 현황</th><th style="width:13%">진행 상태</th><th style="width:13%">관리</th>'
          }</tr></thead>
          <tbody>${contractTab === 'rental'
            ? apps.map(a => {
                const c = findC(a.cid) || { id: a.cid, name: a.customerName || '고객', product: a.product || '창호' };
                const cid = Number(c.id || a.cid);
                const strip = activityStripInfo(getActivityState(a), '최근 24시간 이내 신규 신청');
                return `<tr class="${strip.cls.trim()}">
                  <td><input type="checkbox" data-select="${cid}" ${selected.has(cid) ? 'checked' : ''} aria-label="${esc(c.name)} 선택"></td>
                  <td class="card-primary">
                    <div class="contract-cust-cell">
                      <div class="contract-cust-top">
                        ${strip.badge}
                        <button type="button" class="quote-customer-name" data-action="customer" data-id="${cid}" title="고객 상세 보기" style="background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--navy);cursor:pointer;text-align:left">${esc(c.name)}</button>
                        <span class="contract-product-tag">${esc(c.product || '창호')}</span>
                      </div>
                      <div class="contract-cust-meta">
                        <span class="contract-id-code">${esc(a.id)}</span>
                        <span class="contract-date-text">접수 ${esc(a.createdAtText || a.date || '-')}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="렌탈 조건">
                    <div class="pay-type-cell">
                      <span class="badge purple">렌탈</span>
                      <small class="pay-type-sub">${esc(a.plan)}</small>
                    </div>
                  </td>
                  <td data-label="월 납부금" class="money">
                    <div class="contract-price-cell">
                      <div class="rental-price-main">
                        <span class="rental-tag">월 납부</span>
                        <b class="rental-price-val">${won(a.monthly)}</b>
                      </div>
                      ${a.upfront ? `<div class="contract-price-sub">초회납입 ${won(a.upfront)}</div>` : ''}
                    </div>
                  </td>
                  <td data-label="심사 상태">
                    <div class="contract-status-cell">
                      <div class="status-main-badge">${badge(a.status)}</div>
                      <small class="rental-carrier-note">라이프앤조이 제휴 렌탈사</small>
                    </div>
                  </td>
                  <td data-label="접수일시" style="font-size:11px;color:#64748b">${esc(a.createdAtText || a.date || '-')}</td>
                  <td class="card-actions"><div class="actions">${btn('신청서 검토', 'application', 'file', 'sm primary', `data-id="${a.id}"`)}</div></td>
                </tr>`;
              }).join('')
            : shownContracts.map(k => {
                const c = findC(k.cid) || { id: k.cid, name: k.customerName || '고객', product: k.product || '창호' };
                const cid = Number(c.id || k.cid);
                const isRental = k.type === '렌탈';
                const rApp = (k.rentalAppId ? db.applications.find(a => a.id === k.rentalAppId) : null) ||
                             db.applications.find(a => a.id === k.id || Number(a.cid) === Number(k.cid));
                const months = k.rentalPeriodMonths || rApp?.months || 60;
                const monthly = k.rentalMonthlyFee || rApp?.monthly || (k.amount ? Math.round((k.amount * 1.2) / months / 1000) * 1000 : 0);
                const total = k.rentalTotalFee || rApp?.total || (monthly * months) || k.amount;
                const upfront = k.rentalUpfrontFee || rApp?.upfront || 0;
                const rAppId = k.rentalAppId || rApp?.id || (isRental && String(k.id || '').startsWith('R-') ? k.id : null);

                const strip = activityStripInfo(getActivityState(k), '최근 24시간 이내 신규 계약');
                const custCellHtml = `
                  <div class="contract-cust-cell">
                    <div class="contract-cust-top">
                      ${strip.badge}
                      <button type="button" class="quote-customer-name" data-action="customer" data-id="${cid}" title="고객 상세 보기" style="background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--navy);cursor:pointer;text-align:left">${esc(c.name)}</button>
                      <span class="contract-product-tag">${esc(c.product || '창호')}</span>
                    </div>
                    <div class="contract-cust-meta">
                      <span class="contract-id-code">${esc(k.id)}</span>
                      <span class="contract-date-text">${k.createdAtText ? esc(k.createdAtText) : esc(k.date || '-')}</span>
                    </div>
                  </div>`;

                const payTypeHtml = isRental
                  ? `<div class="pay-type-cell">
                      <span class="badge purple">렌탈</span>
                      <small class="pay-type-sub">${months}개월 분납</small>
                    </div>`
                  : `<div class="pay-type-cell">
                      <span class="badge dark">일시불</span>
                      <small class="pay-type-sub">${esc(k.payMethod || '현금·계좌이체')}</small>
                    </div>`;

                const priceHtml = isRental
                  ? `<div class="contract-price-cell">
                      <div class="rental-price-main">
                        <span class="rental-tag">월 납부</span>
                        <b class="rental-price-val">${won(monthly)}</b>
                      </div>
                      <div class="contract-price-sub">총 분납 ${won(total)} (${months}개월)</div>
                    </div>`
                  : `<div class="contract-price-cell">
                      <b class="cash-price-val">${won(k.amount)}</b>
                      <div class="contract-price-sub">부가세(VAT) 포함</div>
                    </div>`;

                const paidHtml = isRental
                  ? `<div class="contract-paid-cell">
                      ${upfront > 0 
                        ? `<div class="upfront-highlight"><span class="upfront-dot"></span>선납 <b>${won(upfront)}</b> 수납</div>`
                        : `<div class="upfront-zero">선납금 없음</div>`
                      }
                      <div class="rental-billing-note">렌탈료 익월부터 청구</div>
                    </div>`
                  : `<div class="contract-paid-cell">
                      <div class="paid-amount-line">수납 <b>${won(k.paid)}</b></div>
                      <div class="paid-balance-line">
                        ${k.paid >= k.amount 
                          ? '<span class="status-done-text">전액 완납</span>' 
                          : `미수금 <span class="unpaid-val">${won(k.amount - k.paid)}</span>`
                        }
                      </div>
                    </div>`;

                const rawRentalSt = k.rentalStatus || rApp?.status || '접수완료';
                const rentalStText = RENTAL_STATUS_MAP[rawRentalSt] || rawRentalSt;
                const statusHtml = `<div class="contract-status-cell">
                  <div class="status-main-badge">${badge(k.status)}</div>
                  ${isRental ? `<div class="rental-review-pill" title="렌탈 심사 상태">심사 <b>${esc(rentalStText)}</b></div>` : ''}
                </div>`;

                const actionsHtml = `<div class="actions">
                  ${btn('계약 상세', 'contract', 'contract', 'sm soft', `data-id="${k.id}"`)}
                  ${(isRental && rAppId) ? btn('렌탈 심사', 'application', 'file', 'sm purple-btn', `data-id="${rAppId}"`) : ''}
                </div>`;

                return `<tr class="${strip.cls.trim()}">
                  <td><input type="checkbox" data-select="${cid}" ${selected.has(cid) ? 'checked' : ''} aria-label="${esc(c.name)} 선택"></td>
                  <td class="card-primary">${custCellHtml}</td>
                  <td data-label="결제방식">${payTypeHtml}</td>
                  <td data-label="계약금액 / 조건" class="money">${priceHtml}</td>
                  <td data-label="수납 / 선납 현황" class="money">${paidHtml}</td>
                  <td data-label="진행 상태">${statusHtml}</td>
                  <td class="card-actions">${actionsHtml}</td>
                </tr>`;
              }).join('')}</tbody>
        </table>
      </div>
      ${!(contractTab === 'rental' ? apps.length : shownContracts.length) ? '<div class="empty">조건에 해당하는 계약/신청 내역이 없습니다.</div>' : ''}
    </section>
    <div class="panel-caption">계약·수납 상태값은 [설정 &gt; 계약·수납상태]에서 추가·이름 변경·색상 수정·순서 조정할 수 있습니다.</div>`;
}
function renderLandingLinksRows(links) {
  if (!links.length) {
    return `<tr><td colspan="6"><div class="empty" style="padding:36px 16px">${icon('link')}<strong>조건에 맞는 복제 광고링크가 없습니다.</strong>상단 <b>[광고채널 링크 복제·생성]</b> 버튼을 눌러 네이버·당근마켓·인스타 등 광고 매체별 링크를 만들어 보세요.</div></td></tr>`;
  }
  return links.map(ll => {
    const fullUrl = buildTrackingUrl(ll);
    const shortUrl = fullUrl.replace(/^https?:\/\/[^/]+/, '');
    return `<tr>
      <td class="card-primary">
        <div class="link-channel-cell">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="ch-pill ${channelTone(ll.channel)}">${esc(ll.channel)}</span>
            ${ll.medium ? `<span class="row-code">${esc(ll.medium)}</span>` : ''}
            ${!ll.isActive ? badge('중지됨', 'gray') : ''}
          </div>
          <b class="link-campaign-title">${esc(ll.name)}</b>
          ${ll.memo ? `<small class="link-memo-text">${esc(ll.memo)}</small>` : ''}
        </div>
      </td>
      <td data-label="원본 상품 · 귀속">
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
          ${badge(ll.productCategory || '창호', ll.productCategory === '주방' ? 'purple' : ll.productCategory === '욕실' ? 'green' : '')}
          <small style="color:#64748b">${esc(ll.productName)}</small>
          <small style="color:#475569;font-weight:600">귀속: ${esc(ll.partnerName || '직영')}</small>
        </div>
      </td>
      <td data-label="배포 추적 링크">
        <div class="cloned-url-cell">
          <div class="cloned-url-inline" title="${esc(fullUrl)}"><code>${esc(shortUrl)}</code></div>
          <div class="cloned-url-btns">
            <button type="button" class="btn sm soft" data-action="copy-cloned-link" data-id="${ll.id}">${icon('copy')}복사</button>
            <button type="button" class="btn sm" data-action="preview-cloned-link" data-id="${ll.id}">${icon('eye')}미리보기</button>
            <a class="btn sm" href="${esc(fullUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(ll.name)} 새창 열기">${icon('external')}</a>
          </div>
        </div>
      </td>
      <td data-label="유입 · 전환 성과">
        <div class="link-perf-grid">
          <div><small>방문</small><b>${num(ll.views)}</b></div>
          <div><small>상담</small><button type="button" class="link-lead-jump" data-action="jump-link-customers" data-id="${ll.id}" title="이 광고링크로 유입된 고객 보기">${num(ll.leads)}건</button></div>
          <div><small>견적</small><b>${num(ll.quotes)}건</b></div>
          <div><small>계약</small><b>${num(ll.contracts)}건</b></div>
        </div>
      </td>
      <td data-label="전환율">
        <span class="badge ${ll.conversionRate > 0 ? 'green' : 'gray'}">${ll.conversionRate}%</span>
      </td>
      <td class="card-actions">
        <div class="actions">
          ${btn('수정', 'edit-cloned-link', 'edit', 'sm', `data-id="${ll.id}"`)}
          ${btn('삭제', 'delete-cloned-link', 'trash', 'sm', `data-id="${ll.id}"`)}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function getFilteredLandingLinks() {
  const all = db.landingLinks || [];
  const qLow = productLinkQuery.trim().toLowerCase();
  return all.filter(ll => {
    if (productLinkCatFilter !== 'all' && ll.productCategory !== productLinkCatFilter) return false;
    if (!qLow) return true;
    return [ll.name, ll.channel, ll.medium, ll.code, ll.partnerName, ll.productName, ll.memo]
      .some(v => String(v || '').toLowerCase().includes(qLow));
  });
}

function productsPage(){
  const activeU = getActiveUser();
  const isPartner = activeU.role === 'partner';
  const links = db.landingLinks || [];
  const filteredLinks = getFilteredLandingLinks();
  const totalLinkViews = links.reduce((s, x) => s + (Number(x.views) || 0), 0);
  const totalLinkLeads = links.reduce((s, x) => s + (Number(x.leads) || 0), 0);

  const headActions = (role === '본사 관리자' ? btn('상품페이지 등록', 'new-product', 'plus', 'secondary') : '') +
    btn('광고채널 링크 복제·생성', 'open-clone-link', 'link', 'primary');

  // 파트너 전용 랜딩 주소 및 고유 링크 패널
  const partnerUsername = activeU.username || 'partner';
  const prodSubdomain = `https://www.kcc-life.com/?partner=${encodeURIComponent(partnerUsername)}`;
  const partnerSubdomainUrl = `${window.location.origin}/?partner=${encodeURIComponent(partnerUsername)}`;
  const partnerQueryUrl = `${window.location.origin}/landing/?partner=${encodeURIComponent(partnerUsername)}`;

  const partnerLinkBanner = isPartner ? `
    <div class="panel partner-exclusive-panel" style="margin-bottom:24px;border:1px solid #bfdbfe;background:linear-gradient(135deg,#eff6ff 0%,#f8faff 100%);border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(30,58,138,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="badge blue" style="font-weight:700">🌐 파트너 전용 랜딩 주소</span>
            <span class="badge green">실시간 고객 100% 자동 귀속</span>
          </div>
          <h3 style="margin:4px 0 6px;font-size:18px;color:#1e3a8a;font-weight:700">${esc(activeU.org)} 전용 랜딩: <code style="background:#dbeafe;padding:2px 8px;border-radius:6px;font-size:15px;color:#1d4ed8">https://www.kcc-life.com/?partner=${esc(partnerUsername)}</code></h3>
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.5">
            파트너 아이디(<b>${esc(partnerUsername)}</b>)가 적용된 전용 랜딩 주소입니다. 고객이 해당 주소로 접속해 접수하면 <b>[${esc(activeU.org)}]</b>의 고객으로 즉시 연동됩니다.
          </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn primary sm" data-action="copy-text" data-text="${esc(prodSubdomain)}" title="전용 랜딩 주소 복사">
            ${icon('copy')}랜딩 주소 복사
          </button>
          <a href="${esc(partnerSubdomainUrl)}" target="_blank" rel="noopener noreferrer" class="btn sm soft">
            ${icon('external')}랜딩 바로가기
          </a>
        </div>
      </div>

      <!-- 대표 랜딩 주소 박스 -->
      <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;font-family:monospace;font-size:13px;color:#1e293b">
          <span style="font-weight:700;color:#2563eb">대표 랜딩 주소:</span>
          <span style="word-break:break-all">${esc(prodSubdomain)}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" class="btn sm" data-action="copy-text" data-text="${esc(partnerQueryUrl)}" title="파라미터형 공유링크 복사" style="font-size:11px;padding:3px 8px">
            ${icon('link')}일반 공유링크 복사
          </button>
        </div>
      </div>

      <!-- 상품별 서브도메인 링크 그리드 -->
      <div class="partner-links-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;margin-top:14px">
        ${db.products.map(p => {
          const pSubUrl = `http://${subdomainHost}/landing/?prod=${encodeURIComponent(p.category)}`;
          return `
            <div class="partner-link-card" style="background:#ffffff;border:1px solid #cbd5e1;border-radius:10px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="color:#0f172a;font-size:14px">${icon(p.category === '창호' ? 'window' : (p.category === '주방' ? 'kitchen' : 'bath'), 'sm')} ${esc(p.name)}</strong>
                <span class="badge ${p.category === '창호' ? 'blue' : (p.category === '주방' ? 'orange' : 'green')}">${esc(p.category)} 전용</span>
              </div>
              <div class="product-url" style="background:#f8fafc;border:1px solid #e2e8f0;padding:6px 10px;border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span style="font-size:12px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:monospace">${esc(pSubUrl)}</span>
                <button type="button" class="btn sm primary" data-action="copy-text" data-text="${esc(pSubUrl)}" title="상품별 서브도메인 링크 복사" style="padding:4px 8px;font-size:11px;white-space:nowrap">
                  ${icon('copy')}링크 복사
                </button>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                <small style="color:#64748b;font-size:11px">신청 즉시 고객관리 자동 귀속</small>
                <a href="${esc(pSubUrl)}" target="_blank" rel="noopener noreferrer" class="btn sm soft" style="font-size:11px;padding:3px 8px">
                  ${icon('external')}미리보기
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  return pageHead('상품관리', isPartner ? `${esc(activeU.org)} 전용 상품 링크를 확인하고 고객 유치에 활용하세요.` : '기본 랜딩페이지를 복제해 광고채널별 추적 링크를 만들고 유입 성과를 확인하세요.', headActions, 'PRODUCT & LANDING') +
    partnerLinkBanner +
    `<div class="banner">${icon('link')}<div><b>${role === '본사 관리자' ? '기본 랜딩페이지를 광고 매체별로 복제해 유입 채널을 정확히 구분합니다.' : (esc(activeU.org || '파트너') + ' 전용 광고 링크를 복제·생성해 고객 유입을 추적하세요.')}</b><br>복제된 링크로 고객이 방문·신청하면 <b>고객관리</b>와 <b>통계관리</b>에 네이버 검색광고, 당근마켓, 인스타그램 등 정확한 유입 채널과 캠페인명이 자동 기록됩니다.</div></div>` +
    `<div class="three-col">${db.products.map((p, i) => {
      const isLocalLanding = p.url && (p.url.startsWith('/') || p.url.includes('/landing'));
      const baseLanding = p.url ? (p.url.startsWith('/') ? window.location.origin + p.url : p.url) : (window.location.origin + '/landing/');
      const dedicatedPartnerUrl = isPartner ? (baseLanding + (baseLanding.includes('?') ? '&' : '?') + 'partner=' + encodeURIComponent(activeU.org) + '&prod=' + encodeURIComponent(p.category)) : '';
      const displayUrl = isPartner ? dedicatedPartnerUrl : (p.url ? (p.url.startsWith('/') ? window.location.origin + p.url : p.url.replace('https://', '')) : '랜딩 URL 등록 대기');
      const prodLinksCnt = links.filter(ll => Number(ll.productId) === Number(p.id) || ll.productCategory === p.category).length;
      return `<article class="product-card"><div class="product-visual" style="background:${p.color}"><span class="visual-label">HOMECC ${['WINDOW', 'KITCHEN', 'BATHROOM'][i % 3]}</span>${icon(p.icon, 'large-icon')}</div><div class="product-info"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${badge(p.active ? '운영중' : '준비중', p.active ? 'green' : 'gray')}${badge(isPartner ? '전용 링크 활성' : `복제 광고링크 ${prodLinksCnt}개`, isPartner ? 'blue' : (prodLinksCnt > 0 ? 'purple' : 'gray'))}</div><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="product-url"><span>${esc(displayUrl)}</span><button data-action="${isPartner ? 'copy-text' : 'copy-product'}" data-text="${esc(dedicatedPartnerUrl)}" data-id="${i}" aria-label="${esc(p.name)} 링크 복사" title="링크 복사">${icon('copy')}</button></div><div class="product-stats"><div><small>방문 수</small><b>${num(p.views)}</b></div><div><small>접수 고객</small><b>${visibleCustomers().filter(c => c.product === p.category).length}</b></div><div><small>계약</small><b>${db.contracts.filter(k => visibleCustomers().some(c => c.id === k.cid && c.product === p.category)).length}</b></div></div><div class="actions">${btn('광고링크 복제', 'open-clone-link', 'copy', 'primary sm', `data-id="${i}"`)}${isLocalLanding ? `<button type="button" class="btn sm soft" data-action="preview-landing" data-id="${i}" title="${esc(p.name)} 미리보기">${icon('eye')}미리보기</button>` : ''}${role === '본사 관리자' ? btn('수정', 'edit-product', 'edit', 'sm', `data-id="${i}"`) : ''}${p.url ? `<a class="btn sm" href="${esc(isPartner ? dedicatedPartnerUrl : p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.name)} 랜딩 새창 열기">${icon('external')}새창</a>` : ''}</div></div></article>`;
    }).join('')}</div>` +
    `<section class="panel" style="margin-top:24px">
      <div class="panel-head" style="flex-wrap:wrap;gap:12px">
        <div>
          <h3>${isPartner ? `${esc(activeU.org)} 귀속 광고채널 링크 성과` : '광고채널별 복제 랜딩링크 및 유입 성과'}</h3>
          <p>${isPartner ? `${esc(activeU.org)} 전용으로 발급된 채널별 추적 링크 현황입니다.` : '기본 랜딩을 복사해 네이버·당근마켓·인스타·카카오 등 광고 위치별로 발급한 전용 추적 링크입니다.'} (총 <b>${links.length}개</b> 링크 · 방문 <b>${num(totalLinkViews)}</b> · 상담접수 <b>${num(totalLinkLeads)}건</b>)</p>
        </div>
        ${btn('새 광고채널 링크 복제', 'open-clone-link', 'plus', 'primary sm')}
      </div>
      <div class="filters" style="border-bottom:1px solid var(--line)">
        <div class="search-field">${icon('search')}<input class="input" id="product-link-search" value="${esc(productLinkQuery)}" placeholder="광고채널, 캠페인명, 링크코드, 파트너 검색" aria-label="광고링크 검색"></div>
        <div class="cust-picker-chips" style="margin:0">
          ${[['all', '전체 상품'], ['창호', '창호'], ['주방', '주방'], ['욕실', '욕실']].map(([val, lbl]) =>
            `<button type="button" class="btn sm ${productLinkCatFilter === val ? 'primary' : ''}" data-action="product-link-cat" data-value="${val}">${lbl}</button>`
          ).join('')}
        </div>
      </div>
      <div class="table-wrap">
        <table class="mobile-card-table landing-links-table">
          <thead>
            <tr>
              <th style="width:24%">광고채널 · 캠페인명</th>
              <th style="width:14%">원본 상품 · 귀속</th>
              <th style="width:26%">복제된 광고 배포 링크</th>
              <th style="width:18%">방문 / 상담 / 견적 / 계약</th>
              <th style="width:7%">전환율</th>
              <th style="width:11%">관리</th>
            </tr>
          </thead>
          <tbody id="landing-links-tbody">${renderLandingLinksRows(filteredLinks)}</tbody>
        </table>
      </div>
    </section>`;
}

function partnersPage(){
  const activeU = getActiveUser();
  const isPartner = activeU.role === 'partner';
  const isHq = !isPartner && (activeU.role === 'hq_admin' || role === '본사 관리자');
  const myOrgId = activeU.org_id;

  // 전체 파트너 리스트 정규화
  const allPartners = (db.partners || []).map(p => ({
    ...p,
    level: Number(p.level || (p.parentId ? 2 : 1)),
    orgId: p.orgId || p.id
  }));

  // 파트너인 경우 자신의 직속 하위 파트너들만 필터링
  const displayPartners = isPartner
    ? allPartners.filter(p => (p.parentId === myOrgId || p.parent_id === myOrgId) && p.orgId !== myOrgId)
    : allPartners;

  // 네트워크 계층 통계 집계
  const topPartners = allPartners.filter(p => p.level === 1 || !p.parentId);
  const subPartners = allPartners.filter(p => p.level > 1 && p.parentId);
  const totalPartnerCustomers = allPartners.reduce((acc, p) => acc + db.customers.filter(c => c.partner === p.name).length, 0);
  const totalPartnerContracts = allPartners.reduce((acc, p) => {
    const cs = db.customers.filter(c => c.partner === p.name);
    return acc + db.contracts.filter(k => cs.some(c => c.id === k.cid)).length;
  }, 0);

  const pageTitle = isPartner ? '하위 파트너 관리' : '파트너관리';
  const pageSub = isPartner
    ? `${esc(activeU.org)} 산하 직속 영업파트너 조직과 고객 성과를 체계적으로 관리하세요.`
    : '함께 성장하는 영업파트너와 상위·하위 계통 네트워크를 한눈에 체계적으로 관리하세요.';
  const pageEyebrow = isPartner ? 'SUB-PARTNER NETWORK' : 'PARTNER NETWORK';
  const regBtnText = isPartner ? '하위 파트너 등록' : '파트너 등록';

  // 상단 파트너 네트워크 요약 대시보드
  const summaryDashboardHtml = !isPartner ? `
    <div class="partner-summary-grid">
      <div class="partner-summary-item">
        <div class="partner-summary-icon blue">${icon('building')}</div>
        <div class="partner-summary-text">
          <span>1차 본사 직속 파트너</span>
          <strong>${topPartners.length}<small>개사</small></strong>
        </div>
      </div>
      <div class="partner-summary-item">
        <div class="partner-summary-icon purple">${icon('users')}</div>
        <div class="partner-summary-text">
          <span>2차 직속 산하 파트너</span>
          <strong>${subPartners.length}<small>개사</small></strong>
        </div>
      </div>
      <div class="partner-summary-item">
        <div class="partner-summary-icon green">${icon('user')}</div>
        <div class="partner-summary-text">
          <span>파트너 총 관리 고객</span>
          <strong>${totalPartnerCustomers}<small>건</small></strong>
        </div>
      </div>
      <div class="partner-summary-item">
        <div class="partner-summary-icon orange">${icon('contract')}</div>
        <div class="partner-summary-text">
          <span>파트너 체결 계약</span>
          <strong>${totalPartnerContracts}<small>건</small></strong>
        </div>
      </div>
    </div>
  ` : '';

  let partnerContentHtml = '';

  if (isPartner) {
    // 1차 파트너가 본인 어드민에서 하위 파트너들을 볼 때 (다른 파트너 어드민으로 이동 불가, 정보 확인만 가능)
    if (displayPartners.length === 0) {
      partnerContentHtml = `<section class="panel"><div class="empty">${icon('building')}<strong>등록된 직속 하위 파트너가 없습니다.</strong>우측 상단 <b>[하위 파트너 등록]</b> 버튼으로 ${esc(activeU.org)} 산하 영업파트너를 추가하세요.</div></section>`;
    } else {
      partnerContentHtml = `
        <div class="partner-tree-group" style="border-top:4px solid #2563eb">
          <div class="partner-parent-card" style="background:#f8fafd">
            <div class="partner-top" style="margin-bottom:0">
              <div class="avatar">${esc(activeU.org.slice(0, 2))}</div>
              <div class="partner-title-wrap">
                <h3>${esc(activeU.org)} ${badge('소속 파트너 (1차)', 'blue')}</h3>
                <p>소속: 본사 직속 (1차 파트너) · 산하 직속 2차 파트너 <b>${displayPartners.length}개사</b></p>
              </div>
            </div>
          </div>
          <div class="partner-sub-container">
            <div class="partner-sub-header">
              <div class="partner-sub-header-title">
                <span style="color:#8b5cf6;font-size:16px;font-weight:900">└─</span>
                <span>[${esc(activeU.org)}] 직속 산하 2차 파트너 리스트</span>
                ${badge(`${displayPartners.length}개사`, 'purple')}
              </div>
              <button type="button" class="btn sm primary" data-action="new-partner" data-parent-id="${activeU.org_id}">
                ${icon('plus', 'sm')} 하위 파트너 등록
              </button>
            </div>
            <div class="sub-partners-grid">
              ${displayPartners.map(p => {
                const cs = db.customers.filter(c => c.partner === p.name);
                const ctCount = db.contracts.filter(k => cs.some(c => c.id === k.cid)).length;
                return `
                  <div class="sub-partner-card">
                    <div class="sub-partner-card-top">
                      <div>
                        <div class="sub-partner-card-title">
                          ${esc(p.name)}
                          ${badge('2차 파트너', 'purple')}
                        </div>
                        <p class="sub-partner-card-sub">${esc(p.id)} · ${esc(p.type || '인테리어')}</p>
                      </div>
                      ${badge(p.active !== false ? '정상 운영' : '대기', p.active !== false ? 'green' : 'orange')}
                    </div>
                    <div class="sub-partner-meta-grid">
                      <div>
                        <label>대표 담당자</label>
                        <b>${esc(p.person || '-')}</b>
                      </div>
                      <div>
                        <label>대표 연락처</label>
                        <b>${esc(p.phone || '-')}</b>
                      </div>
                    </div>
                    <div class="sub-partner-stat-row">
                      <span>등록 고객</span>
                      <b>${cs.length}건</b>
                    </div>
                    <div class="sub-partner-stat-row">
                      <span>계약 현황</span>
                      <b>${ctCount}건</b>
                    </div>
                    <div class="sub-partner-actions">
                      ${btn('파트너 정보', 'partner-detail', 'building', 'sm block', `data-id="${p.id}"`)}
                      <button type="button" class="btn sm danger block" data-action="delete-partner" data-id="${p.orgId || p.id}" data-name="${esc(p.name)}" title="[${esc(p.name)}] 파트너 삭제" style="margin-top:4px">${icon('trash', 'sm')} 삭제</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }
  } else {
    // 총괄관리자(본사)가 전체 상하위 계층 파트너를 볼 때
    if (allPartners.length === 0) {
      partnerContentHtml = `<section class="panel"><div class="empty">${icon('building')}<strong>등록된 영업파트너가 없습니다.</strong>우측 상단 <b>[파트너 등록]</b> 버튼으로 파트너 조직을 추가하세요.</div></section>`;
    } else {
      // 1차 파트너들 기준으로 그룹화
      const primaryPartners = allPartners.filter(p => !p.parentId || p.level === 1);
      // 혹시 1차 파트너 중 어디에도 속하지 않는 고아 2차 파트너가 있는지 체크
      const orphanSubPartners = allPartners.filter(p => p.level > 1 && !primaryPartners.some(tp => String(tp.orgId) === String(p.parentId) || tp.name === p.parentName));

      const groupsHtml = primaryPartners.map(p => {
        const cs = db.customers.filter(c => c.partner === p.name);
        const ctCount = db.contracts.filter(k => cs.some(c => c.id === k.cid)).length;
        const pUser = (db.users || []).map((u, idx) => normalizeUserRecord(u, idx)).find(u => u.org === p.name || u.org_id === p.orgId || (p.username && u.username === p.username));
        const pMenuLabels = pUser ? getUserAllowedMenuKeys(pUser).map(k => MENU_META[k]?.label || k).join(' · ') : '고객관리 · 상품관리 · 통계관리';

        // 직속 하위 2차 파트너들 검색
        const children = allPartners.filter(c => (String(c.parentId) === String(p.orgId) || String(c.parent_id) === String(p.orgId) || c.parentName === p.name) && String(c.orgId) !== String(p.orgId));
        
        // 산하 전체(자신 + 하위) 고객 및 계약 합산
        const allOrgNames = [p.name, ...children.map(c => c.name)];
        const totalSubCs = db.customers.filter(c => allOrgNames.includes(c.partner)).length;
        const totalSubCts = db.contracts.filter(k => db.customers.some(c => allOrgNames.includes(c.partner) && c.id === k.cid)).length;

        return `
          <div class="partner-tree-group">
            <!-- 1차 상위 파트너 정보 본체 -->
            <div class="partner-parent-card">
              <div class="partner-top">
                <div class="avatar">${esc(p.name.slice(0, 2))}</div>
                <div class="partner-title-wrap">
                  <h3>
                    <span>${esc(p.name)}</span>
                    ${badge('1차 파트너', 'blue')}
                    ${children.length > 0 ? badge(`직속 하위 ${children.length}개사`, 'green') : badge('하위 파트너 없음', 'gray')}
                  </h3>
                  <p>${esc(p.id)} · 업종: ${esc(p.type || '인테리어')} · 소속: 본사 직속 (1차 계통)</p>
                </div>
                ${badge(p.active !== false ? '정상 운영' : '대기', p.active !== false ? 'green' : 'orange')}
              </div>

              <div class="partner-info-bar">
                <div class="partner-info-bar-item">
                  <label>대표 담당자</label>
                  <b>${esc(p.person || '-')}</b>
                </div>
                <div class="partner-info-bar-item">
                  <label>대표 연락처</label>
                  <b>${esc(p.phone || '-')}</b>
                </div>
                <div class="partner-info-bar-item">
                  <label>직속 실적 (고객/계약)</label>
                  <b>고객 ${cs.length}건 · 계약 ${ctCount}건</b>
                </div>
                <div class="partner-info-bar-item">
                  <label>계통 전체 합산 (1·2차)</label>
                  <b style="color:#2563eb">고객 ${totalSubCs}건 · 계약 ${totalSubCts}건</b>
                </div>
              </div>

              <div class="partner-parent-footer">
                <div class="partner-parent-stats">
                  <span>허용 메뉴: <b style="color:#475569">${esc(pMenuLabels)}</b></span>
                </div>
                <div class="actions">
                  ${btn('파트너 정보', 'partner-detail', 'building', 'sm', `data-id="${p.id}"`)}
                  ${isHq ? (pUser ? btn('파트너 어드민 바로가기', 'partner-mode', 'external', 'sm soft', `data-username="${esc(pUser.username)}" data-org="${esc(p.name)}" title="새 창에서 [${esc(p.name)}] 파트너 어드민으로 접속합니다"`) : `<button type="button" class="btn sm danger" data-action="partner-detail" data-id="${p.id}" title="연결된 어드민 계정이 없습니다. 클릭하여 계정을 생성하세요." style="display:inline-flex;align-items:center;padding:5px 8px;font-size:11px;color:#c2410c;background:#fff7ed;border:1px solid #fdba74;border-radius:4px">⚠️ 계정 미등록 (등록)</button>`) : ''}
                  <button type="button" class="btn sm" data-action="new-partner" data-parent-id="${p.orgId}">
                    ${icon('plus', 'sm')} 하위(2차) 파트너 추가
                  </button>
                  ${isHq ? `<button type="button" class="btn sm danger" data-action="delete-partner" data-id="${p.orgId || p.id}" data-name="${esc(p.name)}" title="[${esc(p.name)}] 파트너 삭제">${icon('trash', 'sm')} 삭제</button>` : ''}
                </div>
              </div>
            </div>

            <!-- 산하 직속 2차 파트너 영역 (트리 브랜치 구조) -->
            <div class="partner-sub-container">
              <div class="partner-sub-header">
                <div class="partner-sub-header-title">
                  <span style="color:#8b5cf6;font-size:16px;font-weight:900">└─</span>
                  <span>[${esc(p.name)}] 산하 직속 2차 파트너</span>
                  ${badge(`${children.length}개사`, children.length > 0 ? 'purple' : 'gray')}
                </div>
                <small style="color:#64748b;font-size:11px">1차 파트너의 지휘 및 계약 성과가 상위로 집계되는 직속 산하 파트너 조직입니다.</small>
              </div>

              ${children.length > 0 ? `
                <div class="sub-partners-grid">
                  ${children.map(cp => {
                    const cCs = db.customers.filter(c => c.partner === cp.name);
                    const cCtCount = db.contracts.filter(k => cCs.some(c => c.id === k.cid)).length;
                    const cpUser = (db.users || []).map((u, idx) => normalizeUserRecord(u, idx)).find(u => u.org === cp.name || u.org_id === cp.orgId || (cp.username && u.username === cp.username));
                    return `
                      <div class="sub-partner-card">
                        <div class="sub-partner-card-top">
                          <div>
                            <div class="sub-partner-card-title">
                              <span>${esc(cp.name)}</span>
                              ${badge('2차 파트너', 'purple')}
                            </div>
                            <p class="sub-partner-card-sub">${esc(cp.id)} · ${esc(cp.type || '인테리어')}</p>
                          </div>
                          ${badge(cp.active !== false ? '정상 운영' : '대기', cp.active !== false ? 'green' : 'orange')}
                        </div>
                        <div class="sub-partner-meta-grid">
                          <div>
                            <label>상위 소속</label>
                            <b style="color:#2563eb">${esc(p.name)}</b>
                          </div>
                          <div>
                            <label>대표 담당자</label>
                            <b>${esc(cp.person || '-')}</b>
                          </div>
                          <div>
                            <label>대표 연락처</label>
                            <b>${esc(cp.phone || '-')}</b>
                          </div>
                          <div>
                            <label>등록 고객 / 계약</label>
                            <b>고객 ${cCs.length}건 · 계약 ${cCtCount}건</b>
                          </div>
                        </div>
                        <div class="sub-partner-actions">
                          ${btn('파트너 정보', 'partner-detail', 'building', 'sm block', `data-id="${cp.id}"`)}
                          ${isHq ? (cpUser ? btn('어드민 바로가기', 'partner-mode', 'external', 'sm soft', `data-username="${esc(cpUser.username)}" data-org="${esc(cp.name)}" title="새 창에서 [${esc(cp.name)}] 파트너 어드민으로 접속합니다"`) : `<button type="button" class="btn sm danger block" data-action="partner-detail" data-id="${cp.id}" title="연결된 어드민 계정이 없습니다. 클릭하여 계정을 생성하세요." style="display:inline-flex;align-items:center;justify-content:center;padding:5px 8px;font-size:11px;color:#c2410c;background:#fff7ed;border:1px solid #fdba74;border-radius:4px;margin-top:4px">⚠️ 계정 미등록 (등록)</button>`) : ''}
                          ${isHq ? `<button type="button" class="btn sm danger block" data-action="delete-partner" data-id="${cp.orgId || cp.id}" data-name="${esc(cp.name)}" title="[${esc(cp.name)}] 파트너 삭제" style="margin-top:4px">${icon('trash', 'sm')} 삭제</button>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="sub-partner-empty">
                  <span>${esc(p.name)} 산하에 등록된 직속 2차 파트너가 없습니다. (단독 1차 파트너 운영 중)</span>
                  <div style="margin-top:8px">
                    <button type="button" class="btn sm soft" data-action="new-partner" data-parent-id="${p.orgId}">
                      ${icon('plus', 'sm')} ${esc(p.name)} 산하에 2차 파트너 등록하기
                    </button>
                  </div>
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');

      let orphanHtml = '';
      if (orphanSubPartners.length > 0) {
        orphanHtml = `
          <div class="partner-tree-group" style="border-top:4px solid #f97316">
            <div class="partner-parent-card" style="background:#fffaf5">
              <div class="partner-top">
                <div class="partner-title-wrap">
                  <h3 style="color:#c2410c">⚠️ 상위 파트너 미지정 파트너 (${orphanSubPartners.length}개사)</h3>
                  <p>상위 파트너가 설정되지 않았거나 연결이 끊어진 파트너 목록입니다. [파트너 정보]에서 상위 파트너를 지정해 주세요.</p>
                </div>
              </div>
              <div class="sub-partners-grid" style="margin-top:14px">
                ${orphanSubPartners.map(cp => {
                  const cCs = db.customers.filter(c => c.partner === cp.name);
                  const cCtCount = db.contracts.filter(k => cCs.some(c => c.id === k.cid)).length;
                  const cpUser = (db.users || []).map((u, idx) => normalizeUserRecord(u, idx)).find(u => u.org === cp.name || u.org_id === cp.orgId || (cp.username && u.username === cp.username));
                  return `
                    <div class="sub-partner-card" style="border-left-color:#f97316">
                      <div class="sub-partner-card-top">
                        <div>
                          <div class="sub-partner-card-title">
                            <span>${esc(cp.name)}</span>
                            ${badge('2차 파트너', 'orange')}
                          </div>
                          <p class="sub-partner-card-sub">${esc(cp.id)} · ${esc(cp.type || '인테리어')}</p>
                        </div>
                        ${badge(cp.active !== false ? '정상 운영' : '대기', cp.active !== false ? 'green' : 'orange')}
                      </div>
                      <div class="sub-partner-meta-grid">
                        <div>
                          <label>대표 담당자</label>
                          <b>${esc(cp.person || '-')}</b>
                        </div>
                        <div>
                          <label>대표 연락처</label>
                          <b>${esc(cp.phone || '-')}</b>
                        </div>
                      </div>
                      <div class="sub-partner-stat-row">
                        <span>등록 고객 / 계약</span>
                        <b>고객 ${cCs.length}건 · 계약 ${cCtCount}건</b>
                      </div>
                      <div class="sub-partner-actions">
                        ${btn('파트너 정보 (상위지정)', 'partner-detail', 'building', 'sm block', `data-id="${cp.id}"`)}
                        ${isHq ? (cpUser ? btn('어드민 바로가기', 'partner-mode', 'external', 'sm soft', `data-username="${esc(cpUser.username)}" data-org="${esc(cp.name)}" title="새 창에서 [${esc(cp.name)}] 파트너 어드민으로 접속합니다"`) : `<button type="button" class="btn sm danger block" data-action="partner-detail" data-id="${cp.id}" title="연결된 어드민 계정이 없습니다. 클릭하여 계정을 생성하세요." style="display:inline-flex;align-items:center;justify-content:center;padding:5px 8px;font-size:11px;color:#c2410c;background:#fff7ed;border:1px solid #fdba74;border-radius:4px;margin-top:4px">⚠️ 계정 미등록 (등록)</button>`) : ''}
                        ${isHq ? `<button type="button" class="btn sm danger block" data-action="delete-partner" data-id="${cp.orgId || cp.id}" data-name="${esc(cp.name)}" title="[${esc(cp.name)}] 파트너 삭제" style="margin-top:4px">${icon('trash', 'sm')} 삭제</button>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }

      partnerContentHtml = groupsHtml + orphanHtml;
    }
  }

  const bannerText = isPartner
    ? `<div><b>${esc(activeU.org)}의 직속 2차 파트너만 관리합니다.</b><br>하위 파트너의 등록 고객 및 계약 성과는 ${esc(activeU.org)} 실적과 자동 연계되며, 파트너 어드민에는 <b>고객관리·상품관리·통계관리</b>가 기본 제공됩니다.</div>`
    : `<div><b>상하위 파트너 계통 네트워크 실시간 연동</b><br>파트너 등록 시 <b>상위 파트너</b>를 지정하면 1차(본사 직속)·2차(산하 직속) 파트너가 계층형 트리로 묶여 한눈에 관리되며, 하위 파트너가 있는 1차 파트너는 본인 어드민에 <b>[파트너관리]</b> 메뉴가 자동으로 활성화됩니다.</div>`;

  return pageHead(pageTitle, pageSub, btn(regBtnText, 'new-partner', 'plus', 'primary'), pageEyebrow) +
    summaryDashboardHtml +
    partnerContentHtml +
    `<div class="banner" style="margin-top:22px">${icon('shield')}${bannerText}</div>`;
}

function getLiveAnalyticsSnapshot() {
  if (db.analytics && db.analytics.summary) {
    return db.analytics;
  }
  const cs = visibleCustomers();
  const visIds = new Set(cs.map(c => c.id));
  const contracts = db.contracts.filter(k => visIds.has(k.cid));
  const chMap = new Map();
  cs.forEach(c => {
    const ch = getCustomerChannel(c);
    if (!chMap.has(ch)) chMap.set(ch, { channel: ch, views: 0, leads: 0, quotes: 0, contracts: 0 });
    const row = chMap.get(ch);
    row.leads += 1;
    if (c.quote > 0) row.quotes += 1;
    if (contracts.some(k => k.cid === c.id)) row.contracts += 1;
  });
  const channels = [...chMap.values()].map(ch => ({
    ...ch,
    conversionRate: 0,
    sharePct: cs.length ? Math.round((ch.leads / cs.length) * 100) : 0
  })).sort((a, b) => b.leads - a.leads);
  return {
    period: statsPeriod,
    summary: {
      totalViews: (db.landingLinks || []).reduce((s, x) => s + (x.views || 0), 0),
      totalCustomers: cs.length,
      quotedCustomers: cs.filter(c => c.quote > 0).length,
      viewedCustomers: cs.filter(c => c.viewed).length,
      totalContracts: contracts.length,
      paidContracts: contracts.filter(k => k.paid >= k.amount && k.amount > 0).length
    },
    trend: [],
    channels,
    landingLinks: db.landingLinks || [],
    products: db.products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      views: p.views || 0,
      leads: cs.filter(c => c.product === p.category).length,
      quotes: cs.filter(c => c.product === p.category && c.quote > 0).length,
      contracts: contracts.filter(k => cs.some(c => c.id === k.cid && c.product === p.category)).length,
      conversionRate: p.views > 0 ? Number(((cs.filter(c => c.product === p.category).length / p.views) * 100).toFixed(1)) : 0
    })),
    recentEvents: []
  };
}

function chartSVG(trend = []) {
  const rows = Array.isArray(trend) && trend.length
    ? trend
    : [{ label: '-', views: 0, leads: 0 }, { label: '-', views: 0, leads: 0 }];
  const values = rows.map(r => Number(r.views) || 0);
  const max = Math.max(...values, 4) * 1.2;
  const dx = rows.length > 1 ? 540 / (rows.length - 1) : 540;
  const points = rows.map((r, i) => [45 + i * dx, 190 - (Number(r.views) || 0) / max * 165]);
  const path = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const lastX = points[points.length - 1][0].toFixed(1);
  const labelStep = rows.length > 9 ? 2 : 1;
  return `<svg class="chart" viewBox="0 0 620 230" role="img" aria-label="기간별 랜딩페이지 방문 추이"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5484ec" stop-opacity=".18"/><stop offset="1" stop-color="#5484ec" stop-opacity="0"/></linearGradient></defs>${[30, 70, 110, 150, 190].map((y, i) => `<line x1="45" x2="585" y1="${y}" y2="${y}" stroke="#edf1f7"/><text x="8" y="${y + 4}">${Math.round(max * (4 - i) / 4)}</text>`).join('')}<path d="${path}L${lastX} 190L45 190Z" fill="url(#fade)"/><path d="${path}" fill="none" stroke="#5484ec" stroke-width="2.5" stroke-linejoin="round"/>${points.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="white" stroke="#5484ec" stroke-width="2"><title>${esc(rows[i].label)}: 방문 ${rows[i].views}회 / 접수 ${rows[i].leads}건</title></circle>${i % labelStep === 0 || i === rows.length - 1 ? `<text x="${p[0].toFixed(1)}" y="215" text-anchor="middle">${esc(rows[i].label)}</text>` : ''}`).join('')}</svg>`;
}

function statsPage(){
  const an = getLiveAnalyticsSnapshot();
  const sum = an.summary || {};
  const channels = an.channels || [];
  const links = an.landingLinks || [];
  const prodPerf = an.products || [];
  const events = an.recentEvents || [];
  const barColors = ['#4c7ce5', '#ff7a2f', '#7c5ce6', '#f2b705', '#159c72', '#64748b'];
  const convFlow = [
    ['고객 등록', sum.totalCustomers || 0],
    ['견적 발행', sum.quotedCustomers || 0],
    ['견적 열람', sum.viewedCustomers || 0],
    ['계약 등록', sum.totalContracts || 0],
    ['수납 완료', sum.paidContracts || 0]
  ];
  const flowBase = Math.max(1, sum.totalCustomers || 1);

  return pageHead('통계관리', '복제 랜딩링크와 광고채널별 유입부터 견적·계약 전환까지 실시간 데이터를 분석하세요.', `<select class="select" id="stats-period" aria-label="통계 기간"><option value="all" ${statsPeriod === 'all' ? 'selected' : ''}>전체 누적</option><option value="30" ${statsPeriod === '30' ? 'selected' : ''}>최근 30일</option><option value="7" ${statsPeriod === '7' ? 'selected' : ''}>최근 7일</option><option value="1" ${statsPeriod === '1' ? 'selected' : ''}>오늘</option></select>`, 'ANALYTICS & INSIGHTS') +
    `<div class="metrics">${metric('랜딩 방문 수', num(sum.totalViews || 0), '회', '실제 page_view 이벤트 기준', 'chart')}${metric('상담 접수 고객', num(sum.totalCustomers || 0), '건', '선택 기간 신규 유입 기준', 'users', 'purple')}${metric('견적 발행 고객', num(sum.quotedCustomers || 0), '명', '모바일 견적서 발행 기준', 'file', 'orange')}${metric('계약 체결', num(sum.totalContracts || 0), '건', '렌탈·일시불 계약 누적', 'contract', 'green')}</div>` +
    `<div class="two-col">
      <section class="panel"><div class="panel-head"><div><h3>랜딩페이지 방문 추이</h3><p>실제 접속 이벤트 기준 일별·시간별 추이</p></div><div class="legend"><span><i></i>방문 수</span></div></div><div class="panel-pad">${chartSVG(an.trend)}</div></section>
      <section class="panel"><div class="panel-head"><div><h3>광고채널별 고객 유입 비중</h3><p>방문·상담 접수 실시간 집계</p></div>${badge('실시간 집계', 'green')}</div><div class="panel-pad">${channels.length ? channels.map((ch, idx) => `<div class="bar-row"><span title="${esc(ch.channel)}">${esc(ch.channel)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, ch.sharePct)}%;background:${barColors[idx % barColors.length]}"></div></div><b>${ch.leads}건 (${ch.sharePct}%)</b></div>`).join('') : '<div class="empty">집계된 유입 채널 데이터가 없습니다.</div>'}<div class="panel-caption">상품관리에서 채널별 복제 링크를 만들어 배포하면 채널이 자동 구분됩니다.</div></div></section>
    </div>` +
    `<section class="panel" style="margin-top:20px">
      <div class="panel-head"><div><h3>복제 광고링크(캠페인)별 전환 성과</h3><p>어디에 넣은 광고 링크가 가장 많은 방문과 상담·계약으로 이어졌는지 비교하세요.</p></div>${btn('링크 관리로 이동', 'go-products-links', 'link', 'sm soft')}</div>
      <div class="table-wrap">
        <table class="mobile-card-table">
          <thead><tr><th>광고채널</th><th>캠페인 / 복제 링크명</th><th>상품 · 귀속</th><th>방문 수</th><th>상담 접수</th><th>견적 발행</th><th>계약 체결</th><th>상담 전환율</th><th>관리</th></tr></thead>
          <tbody>${links.length ? links.map(ll => `<tr>
            <td data-label="광고채널"><span class="ch-pill ${channelTone(ll.channel)}">${esc(ll.channel)}</span></td>
            <td class="card-primary"><b>${esc(ll.name)}</b><small style="color:#64748b">?ch=${esc(ll.code)}</small></td>
            <td data-label="상품 · 귀속">${esc(ll.productCategory)} · ${esc(ll.partnerName)}</td>
            <td data-label="방문 수">${num(ll.views)}회</td>
            <td data-label="상담 접수"><b>${num(ll.leads)}건</b></td>
            <td data-label="견적 발행">${num(ll.quotes)}건</td>
            <td data-label="계약 체결">${num(ll.contracts)}건</td>
            <td data-label="상담 전환율">${badge(ll.conversionRate + '%', ll.conversionRate > 0 ? 'green' : 'gray')}</td>
            <td class="card-actions"><div class="actions"><button type="button" class="btn sm soft" data-action="jump-link-customers" data-id="${ll.id}">${icon('users')}유입 고객</button></div></td>
          </tr>`).join('') : '<tr><td colspan="9"><div class="empty">등록된 복제 광고링크가 없습니다. [상품관리]에서 링크를 복제해 주세요.</div></td></tr>'}</tbody>
        </table>
      </div>
    </section>` +
    `<section class="panel" style="margin-top:20px"><div class="panel-head"><h3>고객 전환 흐름</h3><span class="pill-note">실운영 DB 기준 · 공사건 단위</span></div><div class="panel-pad"><div class="progress-list">${convFlow.map(([t, n]) => `<div><span>${t}</span><b>${n}건</b><i class="on" style="opacity:${Math.min(1, 0.25 + n / flowBase * 0.75).toFixed(2)}"></i></div>`).join('')}</div></div></section>` +
    `<section class="panel" style="margin-top:20px"><div class="panel-head"><div><h3>상품페이지별 성과</h3><p>상품군별 방문·상담·견적·계약 전환 분석</p></div></div><div class="table-wrap"><table><thead><tr><th>상품페이지</th><th>방문 수</th><th>상담 신청</th><th>견적 발행</th><th>계약</th><th>상담 전환율</th></tr></thead><tbody>${prodPerf.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${num(p.views)}</td><td>${num(p.leads)}건</td><td>${num(p.quotes)}건</td><td>${num(p.contracts)}건</td><td>${p.conversionRate}%</td></tr>`).join('')}</tbody></table></div></section>` +
    `<section class="panel" style="margin-top:20px"><div class="panel-head"><div><h3>최근 접속 및 유입 이벤트 기록</h3><p>실제 landing_events 테이블 최근 20건 기준</p></div>${badge('IP 마스킹', 'gray')}</div><div class="table-wrap"><table><thead><tr><th>발생 시각</th><th>상품페이지</th><th>유입 채널 · 캠페인</th><th>접속 IP</th><th>기기</th><th>이벤트</th></tr></thead><tbody>${events.length ? events.map(ev => `<tr><td>${esc(String(ev.createdAt || '').slice(5, 16).replace('T', ' '))}</td><td>${esc(ev.productName)}</td><td><span class="ch-pill ${channelTone(ev.channel)}">${esc(ev.channel)}</span>${ev.campaignName ? ` <small style="color:#64748b">${esc(ev.campaignName)}</small>` : ''}</td><td>${esc(ev.ipMasked)}</td><td>${esc(ev.device)}</td><td>${badge(ev.eventLabel, ev.eventType === 'consultation_request' ? 'green' : 'gray')}</td></tr>`).join('') : '<tr><td colspan="6"><div class="empty">아직 수집된 이벤트 로그가 없습니다.</div></td></tr>'}</tbody></table></div></section>`;
}
function renderUsersSettingsPanel() {
  const activeU = getActiveUser();
  const rowsHtml = (db.users || []).map((rawU, idx) => {
    const u = normalizeUserRecord(rawU, idx);
    const uMenus = getUserAllowedMenuKeys(u);
    const isCurrent = u.username === activeU.username;
    const isAdminLocked = u.username === 'admin';
    const roleColor = u.role === 'hq_admin' ? 'purple' : (u.role === 'partner' ? 'orange' : '');
    const chipsHtml = ALL_MENU_KEYS.map(mKey => {
      const on = uMenus.includes(mKey);
      const locked = isAdminLocked && mKey === 'settings';
      const meta = MENU_META[mKey];
      return `<button type="button" class="menu-perm-chip ${on ? 'on' : ''} ${locked ? 'locked' : ''}" data-action="toggle-user-menu" data-id="${u.id}" data-menu="${mKey}" aria-pressed="${on}" title="${locked ? '최고관리자 계정의 설정 메뉴는 잠금 보호됩니다' : (meta.label + ' 메뉴 ' + (on ? '숨기기' : '표시 허용'))}">${icon(on ? 'check' : meta.icon)}${esc(meta.label)}</button>`;
    }).join('');

    return `<tr>
      <td class="card-primary">
        <div class="user-ident">
          <div class="avatar">${esc((u.name || '관리').slice(-2))}</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <b>${esc(u.name)}</b>
              <span class="row-code">@${esc(u.username)}</span>
              ${isCurrent ? badge('현재 화면', 'green') : ''}
            </div>
            <small>${esc(u.email || u.phone || '연락처 미등록')}</small>
          </div>
        </div>
      </td>
      <td data-label="소속 · 역할">
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
          <b>${esc(u.org)}</b>
          ${badge(u.role_label, roleColor)}
        </div>
      </td>
      <td data-label="볼 수 있는 메뉴">
        <div class="menu-perm-wrap">
          <div class="menu-perm-chips">${chipsHtml}</div>
          <div class="menu-perm-meta">
            <span>표시 메뉴 <b>${uMenus.length}</b> / ${ALL_MENU_KEYS.length}개</span>
            <span style="display:inline-flex;gap:8px">
              <button type="button" class="menu-mini-link" data-action="user-menus-all" data-id="${u.id}">전체 선택</button>
              <button type="button" class="menu-mini-link" data-action="user-menus-default" data-id="${u.id}">역할 기본값</button>
            </span>
          </div>
        </div>
      </td>
      <td class="card-actions">
        <div class="actions">
          ${btn('메뉴·정보 편집', 'edit-user', 'edit', 'sm', `data-id="${u.id}"`)}
          ${isCurrent
            ? `<button type="button" class="btn sm soft" disabled>${icon('check')}적용 중</button>`
            : btn('화면 전환', 'switch-user-view', 'eye', 'sm soft', `data-username="${esc(u.username)}"`)}
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div class="panel-head">
      <div>
        <h3>사용자 관리 및 메뉴 권한</h3>
        <p>사용자별로 좌측 사이드바와 모바일 메뉴에서 볼 수 있는 메뉴를 직접 선택합니다.</p>
      </div>
      ${btn('사용자 추가', 'new-user', 'plus', 'sm primary')}
    </div>
    <div class="user-perm-banner">
      ${icon('shield')}
      <div>
        <b>사용자별 표시 메뉴 실시간 제어</b> — 메뉴 칩을 클릭하면 해당 사용자의 허용 메뉴가 즉시 DB에 저장됩니다. <b>[화면 전환]</b> 또는 우측 상단 사용자 선택창으로 전환해 실제 보이는 메뉴를 바로 확인할 수 있습니다. (최소 1개 메뉴 필수 · 대표 최고관리자 <code>admin</code>의 <b>설정</b> 메뉴는 잠금 보호)
      </div>
    </div>
    <div class="table-wrap">
      <table class="mobile-card-table user-perm-table">
        <thead>
          <tr>
            <th>사용자</th>
            <th>소속 · 역할</th>
            <th>볼 수 있는 메뉴 선택 (클릭하여 즉시 반영)</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

async function saveUserMenusQuick(userId, nextMenus, customMsg = '') {
  const idx = db.users.findIndex(x => Number(x.id) === Number(userId));
  if (idx === -1) return;
  const u = normalizeUserRecord(db.users[idx], idx);
  if (u.username === 'admin' && !nextMenus.includes('settings')) {
    toast('최고관리자(admin) 계정의 [설정] 메뉴는 시스템 잠금 방지를 위해 해제할 수 없습니다.');
    return;
  }
  const ordered = ALL_MENU_KEYS.filter(k => nextMenus.includes(k));
  if (!ordered.length) {
    toast('사용자가 볼 수 있는 메뉴를 최소 1개 이상 선택해 주세요.');
    return;
  }

  db.users[idx] = { ...u, allowed_menus: ordered };
  const rIdx = userRoster.findIndex(x => x.username === u.username || Number(x.id) === Number(u.id));
  if (rIdx !== -1) userRoster[rIdx] = { ...userRoster[rIdx], allowed_menus: ordered };
  save();
  render();

  try {
    const res = await apiFetch('/api/auth/users/' + u.id + '/menus', {
      method: 'PATCH',
      body: { allowed_menus: ordered }
    });
    const resData = await res.json();
    if (!res.ok) {
      toast(resData.error || '메뉴 권한 저장에 실패했습니다.');
      await syncFromServer();
      return;
    }
    if (resData.user) {
      const updated = normalizeUserRecord(resData.user, idx);
      db.users[idx] = updated;
      if (rIdx !== -1) userRoster[rIdx] = updated;
      else userRoster.push(updated);
      save();
      render();
    }
    toast(customMsg || (u.name + '님의 표시 메뉴가 저장되었습니다. (' + ordered.length + '개 메뉴)'));
  } catch {
    toast(customMsg || (u.name + '님의 표시 메뉴가 반영되었습니다.'));
  }
}

function syncDialogMenuCards() {
  const form = $('#user-perm-form');
  if (!form) return;
  const inputs = $$('input[name="allowed_menu"][type="checkbox"]', form);
  let checkedCount = 0;
  inputs.forEach(inp => {
    const card = inp.closest('.menu-check-card');
    if (card) card.classList.toggle('is-checked', inp.checked);
    if (inp.checked) checkedCount++;
  });
  const countEl = $('#dlg-menu-count', form);
  if (countEl) countEl.textContent = checkedCount + ' / ' + ALL_MENU_KEYS.length + '개 선택됨';
}

function openUserDialog(userId = null) {
  const existingIdx = userId !== null ? db.users.findIndex(x => Number(x.id) === Number(userId)) : -1;
  const u = existingIdx !== -1 ? normalizeUserRecord(db.users[existingIdx], existingIdx) : null;
  const isEdit = Boolean(u);
  const initRole = u ? u.role : 'consultant';
  const initOrg = u ? u.org : '라이프앤조이';
  const selectedMenus = u ? getUserAllowedMenuKeys(u) : getDefaultMenusByRole(initRole);
  const isAdminLocked = Boolean(u && u.username === 'admin');

  const orgOptions = ['라이프앤조이', ...db.partners.map(p => p.name)];
  if (initOrg && !orgOptions.includes(initOrg)) orgOptions.push(initOrg);

  const roleChoices = [
    ['consultant', '상담사'],
    ['estimator', '견적 담당자'],
    ['hq_admin', '최고관리자'],
    ['accountant', '회계·정산'],
    ['partner', '파트너 관리자']
  ];

  const menuCardsHtml = ALL_MENU_KEYS.map(mKey => {
    const meta = MENU_META[mKey];
    const checked = selectedMenus.includes(mKey);
    const locked = isAdminLocked && mKey === 'settings';
    return `<label class="menu-check-card ${checked ? 'is-checked' : ''} ${locked ? 'is-locked' : ''}">
      <input type="checkbox" name="allowed_menu" value="${mKey}" ${checked ? 'checked' : ''} ${locked ? 'disabled data-locked="1"' : ''}>
      ${locked ? '<input type="hidden" name="allowed_menu" value="settings">' : ''}
      <div>
        <b>${meta.label}${locked ? ' <span class="badge gray" style="margin-left:4px">필수</span>' : ''}</b>
        <small>${esc(meta.desc)}</small>
      </div>
    </label>`;
  }).join('');

  const body = `<form id="user-perm-form" data-submit="${isEdit ? 'edit-user' : 'user'}" ${isEdit ? `data-id="${u.id}" data-mode="edit"` : 'data-mode="create"'}>
    <div class="dialog-body">
      <div class="field-grid">
        ${field('이름', 'name', u?.name || '', 'text', true)}
        <div class="field">
          <label for="username">로그인 아이디 <span>*</span></label>
          <input class="input" id="username" name="username" type="text" value="${esc(u?.username || '')}" ${isEdit ? 'readonly style="background:#f5f7fb;color:#68778d"' : 'required placeholder="영문 아이디 (예: minsu)"'}>
        </div>
        ${field('연락처', 'phone', u?.phone || '', 'tel')}
        ${field('이메일', 'email', u?.email || '', 'email')}
        ${selectField('소속 조직', 'org', orgOptions, initOrg)}
        <div class="field">
          <label for="user-role-select">업무 역할</label>
          <select class="input" id="user-role-select" name="role">
            ${roleChoices.map(([val, lbl]) => `<option value="${val}" ${initRole === val ? 'selected' : ''}>${lbl}</option>`).join('')}
          </select>
        </div>
      </div>
      ${isEdit ? field('새 비밀번호 (변경 시에만 4자리 이상 입력)', 'password', '', 'password') : field('초기 비밀번호 (미입력 시 user123!)', 'password', '', 'password')}
      <div class="divider"></div>
      <div class="field" style="margin-bottom:0">
        <div class="menu-select-head">
          <div>
            <label style="margin:0;font-size:13px">사용자별 볼 수 있는 메뉴 선택 <span>*</span></label>
            <p class="field-hint" style="margin:2px 0 0">선택한 메뉴만 해당 사용자의 좌측 메뉴바와 모바일 하단 탭에 표시됩니다.</p>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="badge" id="dlg-menu-count">${selectedMenus.length} / ${ALL_MENU_KEYS.length}개 선택됨</span>
            <button type="button" class="btn sm" data-action="dlg-menu-all">전체 선택</button>
            <button type="button" class="btn sm" data-action="dlg-menu-role-default">역할 기본값 적용</button>
          </div>
        </div>
        <div class="menu-select-grid">${menuCardsHtml}</div>
      </div>
    </div>
    <div class="dialog-footer">
      ${btn('취소', 'close')}
      <button type="submit" class="btn primary">${isEdit ? '변경사항 및 메뉴 권한 저장' : '사용자 등록하기'}</button>
    </div>
  </form>`;

  openDialog(
    isEdit ? `${esc(u.name)} 사용자 정보 · 메뉴 권한 설정` : '새 사용자 등록 및 메뉴 권한 설정',
    body,
    '',
    '',
    isEdit ? `@${esc(u.username)} · ${esc(u.org)}` : '사용자 계정 정보와 허용할 메뉴를 선택해 주세요.',
    false,
    'user-perm-dialog'
  );
}

function renderContractStatusesSettingsPanel() {
  const list = getContractStatuses();
  const colorLabelMap = Object.fromEntries(BADGE_COLOR_OPTIONS.map(([k, lbl]) => [k, lbl]));
  const rowsHtml = list.map((st, idx) => {
    const usedCnt = (db.contracts || []).filter(k => k.status === st.name).length;
    return `<div class="settings-row">
      <div class="status-order-btns">
        <button type="button" class="status-order-btn" data-action="move-contract-status" data-id="${st.id}" data-dir="up" ${idx === 0 ? 'disabled' : ''} title="위로 이동">▲</button>
        <button type="button" class="status-order-btn" data-action="move-contract-status" data-id="${st.id}" data-dir="down" ${idx === list.length - 1 ? 'disabled' : ''} title="아래로 이동">▼</button>
      </div>
      <div class="avatar" style="width:28px;height:28px">${String(idx + 1).padStart(2, '0')}</div>
      <div class="grow">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <b>${esc(st.name)}</b>
          ${badge(st.name, st.color === 'blue' ? '' : st.color)}
        </div>
        <small>배지 색상: ${esc(colorLabelMap[st.color] || '파랑')} · 현재 적용된 계약 <b>${usedCnt}</b>건</small>
      </div>
      <div class="actions">
        ${btn('수정', 'edit-contract-status', 'edit', 'sm', `data-id="${st.id}"`)}
        ${btn('삭제', 'delete-contract-status', 'trash', 'sm', `data-id="${st.id}"`)}
      </div>
    </div>`;
  }).join('');

  return `<div class="panel-head">
      <div>
        <h3>계약·수납 상태값 관리</h3>
        <p>계약관리 및 계약 상세에서 사용하는 계약·수납 상태값을 직접 추가·수정·순서 변경·삭제할 수 있습니다.</p>
      </div>
      ${btn('상태값 추가', 'new-contract-status', 'plus', 'sm primary')}
    </div>
    <div class="panel-pad">
      <div class="notice-text" style="margin-bottom:14px">상태 이름을 수정하면 기존 계약 대장에 지정된 동일 상태값도 함께 변경됩니다. 최소 1개의 상태값은 유지됩니다.</div>
      ${rowsHtml}
    </div>`;
}

function openContractStatusDialog(statusId = null) {
  const list = getContractStatuses();
  const st = statusId !== null ? list.find(x => Number(x.id) === Number(statusId)) : null;
  const isEdit = Boolean(st);
  const curColor = st?.color || 'blue';
  const colorPickerHtml = `<div class="field">
    <label>배지 색상 선택</label>
    <div class="badge-color-options" id="contract-status-color-picker">
      ${BADGE_COLOR_OPTIONS.map(([val, lbl, hex]) => `
        <label class="badge-color-opt ${curColor === val ? 'is-selected' : ''}">
          <input type="radio" name="color" value="${val}" ${curColor === val ? 'checked' : ''}>
          <span class="color-dot" style="background:${hex};width:10px;height:10px"></span>
          <span>${lbl}</span>
        </label>
      `).join('')}
    </div>
  </div>`;

  formDialog(
    isEdit ? '계약·수납 상태값 수정' : '계약·수납 상태값 추가',
    `${field('상태명', 'name', st?.name || '', 'text', true)}
     ${colorPickerHtml}
     <div class="notice-text">${isEdit ? '상태명을 변경하면 해당 상태를 사용 중인 계약 건의 상태명도 자동 업데이트됩니다.' : '새 상태값은 계약 등록 및 계약 상세의 상태 변경 목록에 즉시 반영됩니다.'}</div>`,
    'contract-status',
    '계약관리 > 계약·수납 상태 설정',
    isEdit ? `data-id="${st.id}"` : ''
  );
}

function renderFormsSettingsPanel() {
  const formsList = (db.forms || []).filter(f => f.name.includes('렌탈') || f.id === 'rental_privacy');
  if (!formsList.length && db.forms.length) {
    formsList.push(db.forms[0]);
  }
  return `
    <div class="panel-head">
      <div>
        <h3>양식 및 동의서 관리</h3>
        <p>렌탈 신청 고객의 정보와 서명을 합성하기 위한 PDF 기반 필드 매핑 및 전자 서식 관리</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${badge('렌탈 동의서 표준', 'blue')}
        ${btn('새 양식 등록', 'new-form', 'plus', 'sm primary')}
      </div>
    </div>
    <div class="panel-pad">
      ${formsList.length ? formsList.map((f, i) => {
        const fields = f.fieldsConfig || DEFAULT_FORM_FIELDS;
        const fieldTags = [
          `<span style="color:#2563eb;font-weight:600">● 날짜</span>`,
          `<span style="color:#0284c7;font-weight:600">● 성명</span>`,
          `<span style="color:#7c3aed;font-weight:600">● 서명</span>`,
          `<span style="color:#ea580c;font-weight:600">● 생년월일</span>`,
          `<span style="color:#059669;font-weight:600">● 연락처</span>`
        ].join(' &nbsp; ');
        const pdfBadge = f.pdfPath
          ? `<span style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">PDF 업로드 완료: ${esc(f.fileName || 'custom.pdf')}</span>`
          : `<span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">표준 A4 서식 템플릿 사용 중</span>`;

        return `
          <div class="settings-row" style="align-items:flex-start;padding:16px 14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;background:#ffffff">
            <div style="background:#eff6ff;color:#2563eb;padding:10px;border-radius:8px;margin-right:12px">
              ${icon('file')}
            </div>
            <div class="grow" style="display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <b style="font-size:15px;color:#0f172a">${esc(f.name)}</b>
                <span class="badge blue">v${f.version || 1}.0</span>
                ${pdfBadge}
              </div>
              <div style="font-size:12px;color:#64748b;line-height:1.4">
                ${esc(f.text || '').substring(0, 110).replace(/\n/g, ' ')}...
              </div>
              <div style="font-size:11.5px;color:#334155;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;margin-top:2px">
                <span style="font-weight:700">매핑 필드:</span> ${fieldTags}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-self:center">
              ${btn('필드 에디터 열기', 'open-form-editor', 'edit', 'primary sm', `data-id="${i}"`)}
              ${btn('실시간 미리보기', 'open-form-preview', 'eye', 'soft sm', `data-id="${i}"`)}
              ${btn('PDF 파일 교체', 'upload-form-pdf-btn', 'upload', 'sm', `data-id="${i}"`)}
              ${btn('삭제', 'delete-form', 'trash', 'danger sm', `data-id="${i}"`)}
            </div>
          </div>
        `;
      }).join('') : '<div class="empty">등록된 양식이 없습니다.</div>'}
    </div>
  `;
}

// PDF 캐시 및 헬퍼
const pdfDocCache = new Map();

async function getPdfDoc(pdfUrl) {
  if (!window.pdfjsLib || !pdfUrl) return null;
  if (pdfDocCache.has(pdfUrl)) return pdfDocCache.get(pdfUrl);
  try {
    const docOpts = String(pdfUrl).startsWith('/api/') && authToken
      ? { url: pdfUrl, httpHeaders: { Authorization: `Bearer ${authToken}` } }
      : pdfUrl;
    const loadingTask = pdfjsLib.getDocument(docOpts);
    const pdf = await loadingTask.promise;
    pdfDocCache.set(pdfUrl, pdf);
    return pdf;
  } catch (err) {
    console.error('PDF getDoc error:', err);
    return null;
  }
}

async function renderPdfPageToCanvas(pdfDoc, pageNum, canvasEl, scale = 1.5) {
  if (!pdfDoc || !canvasEl) return false;
  try {
    const pNum = Math.max(1, Math.min(pageNum, pdfDoc.numPages));
    const page = await pdfDoc.getPage(pNum);
    const viewport = page.getViewport({ scale });
    canvasEl.width = viewport.width;
    canvasEl.height = viewport.height;
    const ctx = canvasEl.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return true;
  } catch (err) {
    console.error('PDF page render error:', err);
    return false;
  }
}

// 표준 동의서 템플릿 HTML
function getStandardConsentTemplateHtml() {
  return `
    <div class="fe-default-template">
      <div class="fe-template-header">
        <div>
          <h1 class="fe-template-title">(렌탈) 개인정보 수집·이용 및 제공 동의서</h1>
          <div style="font-size:12px;color:#475569;margin-top:4px">KCC글라스 홈씨씨 인테리어 제휴 렌탈 공식 전자 서식</div>
        </div>
        <div style="text-align:right">
          <div class="fe-template-brand">KCC 홈씨씨</div>
          <div style="font-size:10px;color:#94a3b8">표준서식 No. KCC-RENTAL-2026</div>
        </div>
      </div>
      <p class="fe-template-sub">
        본 동의서는 (주)라이프앤조이 및 KCC글라스 홈씨씨 제휴 렌탈 서비스 신청 및 계약 체결을 위해 고객님의 개인정보를 수집·이용 및 제공하는 내용을 규정합니다. 내용을 충분히 숙지하신 후 동의하여 주시기 바랍니다.
      </p>

      <div class="fe-clause-card">
        <div class="fe-clause-title">제1조 (개인정보의 수집 및 이용 목적)</div>
        <ul class="fe-clause-list">
          <li>창호 및 인테리어 렌탈 서비스 신청 접수, 본인 확인 및 적격 심사</li>
          <li>렌탈 약정 체결, 월 렌탈료 청구 및 수납, 계약 유지·관리</li>
          <li>시공 현장 방문 실측, 설치 시공 일정 조율 및 사후 품질보증(A/S)</li>
        </ul>
      </div>

      <div class="fe-clause-card">
        <div class="fe-clause-title">제2조 (수집하는 개인정보의 항목)</div>
        <ul class="fe-clause-list">
          <li><strong>필수항목:</strong> 성명, 생년월일, 연락처(휴대전화), 시공 주소, 전자서명</li>
          <li><strong>계약정보:</strong> 견적번호, 선택 렌탈 플랜, 월 납부금액, 납부 기간</li>
        </ul>
      </div>

      <div class="fe-clause-card">
        <div class="fe-clause-title">제3조 (개인정보의 보유 및 이용 기간)</div>
        <ul class="fe-clause-list">
          <li>계약 체결 시: 관련 법령(상법 및 전자상거래법)에 따라 계약 종료 후 5년 보관 후 파기</li>
          <li>심사 미진행 또는 취소 시: 취소일로부터 즉시 안전하게 영구 파기</li>
        </ul>
      </div>

      <div class="fe-clause-card">
        <div class="fe-clause-title">제4조 (동의 거부 권리 및 불이익)</div>
        <div style="font-size:11px;color:#475569">
          귀하는 개인정보 수집·이용 동의를 거부할 권리가 있습니다. 단, 필수 항목 동의 거부 시 렌탈 신청 접수 및 심사 진행이 불가합니다.
        </div>
      </div>

      <div class="fe-agree-check-box">
        <span>[필수] 본인은 상기 개인정보 수집·이용 및 제공 내용을 모두 확인하였으며 이에 동의합니다.</span>
        <span style="display:inline-block;padding:2px 8px;background:#2563eb;color:#ffffff;border-radius:4px;font-size:11px">☑ 동의함</span>
      </div>

      <div class="fe-sign-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-weight:800;font-size:14px;color:#0f172a">■ 계약자 확인 및 전자서명</span>
          <span style="font-size:11px;color:#64748b">(주)라이프앤조이 / KCC글라스 홈씨씨</span>
        </div>
        <table class="fe-sign-table">
          <tr>
            <th>작성일자</th>
            <td colspan="3" style="position:relative"></td>
          </tr>
          <tr>
            <th>계약자 성명</th>
            <td style="position:relative;width:30%"></td>
            <th>서명 / 날인</th>
            <td style="position:relative;width:30%"></td>
          </tr>
          <tr>
            <th>생년월일</th>
            <td style="position:relative"></td>
            <th>연락처</th>
            <td style="position:relative"></td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// [양식 필드 에디터]: 날짜 / 성명 / 서명 / 생년월일 / 연락처 편집기 (각 페이지별 다중 선택/배치 완벽 지원)
// -------------------------------------------------------------
let editorState = null;

async function openFormEditor(formIdx) {
  const form = db.forms[formIdx];
  if (!form) return toast('양식을 찾을 수 없습니다.');

  // 다중 필드 인스턴스 배열로 정규화
  const fields = normalizeFormFields(form.fieldsConfig || DEFAULT_FORM_FIELDS);

  let pdfDoc = null;
  let totalPages = 1;
  if (form.pdfPath) {
    pdfDoc = await getPdfDoc(form.pdfPath);
    if (pdfDoc) totalPages = pdfDoc.numPages;
  }

  // 1페이지 또는 필드가 위치한 첫 번째 페이지
  const initPage = 1;
  const initialActive = fields.find(f => (parseInt(f.page, 10) || 1) === initPage) || fields[0] || null;

  editorState = {
    formIdx,
    formId: form.id,
    fields,
    activeId: initialActive ? initialActive.id : null,
    zoom: 1.0,
    currentPage: initPage,
    totalPages,
    pdfDoc,
    isDragging: false,
    isResizing: false,
    dragStartX: 0,
    dragStartY: 0,
    initialBox: null
  };

  const bodyHtml = `
    <div class="fe-toolbar">
      <div class="fe-toolbar-group">
        <span class="fe-doc-badge">${icon('file')} ${esc(form.name)} · v${form.version || 1}.0</span>
        <span id="fe-pdf-status-text" style="font-size:12px;color:#64748b">
          ${form.pdfPath ? `PDF: <b style="color:#0f172a">${esc(form.fileName || '양식.pdf')}</b>` : '표준 A4 서식 적용'}
        </span>
        <input type="file" id="fe-pdf-file-input" accept=".pdf" style="display:none">
        <button type="button" class="btn sm" id="fe-trigger-upload-btn">${icon('upload')} PDF 파일 교체</button>
      </div>

      <!-- 다중 페이지 네비게이션 -->
      <div class="fe-toolbar-group fe-page-nav-wrap">
        <div class="fe-page-nav" id="fe-page-nav-group" style="${form.pdfPath && totalPages > 1 ? '' : 'display:none'}">
          <button type="button" class="btn sm soft" id="fe-prev-page" style="padding:2px 8px" ${editorState.currentPage <= 1 ? 'disabled' : ''}>◀ 이전</button>
          <select id="fe-page-select">
            ${Array.from({ length: totalPages }, (_, i) => `
              <option value="${i + 1}" ${i + 1 === editorState.currentPage ? 'selected' : ''}>
                ${i + 1} / ${totalPages} 페이지
              </option>
            `).join('')}
          </select>
          <button type="button" class="btn sm soft" id="fe-next-page" style="padding:2px 8px" ${editorState.currentPage >= totalPages ? 'disabled' : ''}>다음 ▶</button>
          <span class="badge blue" id="fe-total-pages-badge">총 ${totalPages}페이지 문서</span>
        </div>
      </div>

      <div class="fe-toolbar-group">
        <div style="display:flex;align-items:center;gap:4px;background:#e2e8f0;padding:2px 6px;border-radius:6px">
          <button type="button" class="btn sm soft" id="fe-zoom-out" style="padding:2px 8px">－</button>
          <span id="fe-zoom-label" style="font-size:11.5px;font-weight:700;min-width:44px;text-align:center">100%</span>
          <button type="button" class="btn sm soft" id="fe-zoom-in" style="padding:2px 8px">＋</button>
          <button type="button" class="btn sm soft" id="fe-zoom-fit" style="padding:2px 8px;font-size:11px">맞춤</button>
        </div>
        <button type="button" class="btn sm soft" id="fe-reset-positions-btn">${icon('refresh')} 기본위치 복원</button>
        <button type="button" class="btn sm" style="background:#059669;color:#fff" id="fe-preview-btn">${icon('eye')} 실시간 미리보기</button>
        <button type="button" class="btn sm primary" id="fe-save-btn">${icon('check')} 필드 설정 저장</button>
      </div>
    </div>

    <div class="fe-layout">
      <!-- 중앙 문서 워크스페이스 -->
      <div class="fe-viewport" id="fe-viewport">
        <div class="fe-a4-wrapper" id="fe-a4-wrapper" style="transform: scale(1.0);">
          <div class="fe-a4-page" id="fe-a4-page">
            <span class="fp-page-number-tag" id="fe-page-indicator-tag" style="${totalPages > 1 ? '' : 'display:none'}">
              ${editorState.currentPage} / ${totalPages} 페이지
            </span>
            <canvas class="fe-pdf-canvas" id="fe-pdf-canvas" style="${form.pdfPath ? '' : 'display:none'}"></canvas>
            <div id="fe-default-template-container" style="${form.pdfPath ? 'display:none' : ''}">
              ${getStandardConsentTemplateHtml()}
            </div>
            <!-- 필드 드래그 오버레이 (현재 페이지에 배치된 모든 필드 표시) -->
            <div class="fe-fields-overlay" id="fe-fields-overlay">
              ${renderFieldBoxes(fields, editorState.activeId, editorState.currentPage)}
            </div>
          </div>
        </div>
      </div>

      <!-- 우측 속성 패널: 각 페이지별 입력란 선택/추가 및 상세 속성 조정 -->
      <aside class="fe-sidebar" id="fe-sidebar">
        ${renderFieldSidebar(fields, editorState.activeId, editorState.currentPage, totalPages)}
      </aside>
    </div>
  `;

  openDialog(
    '양식 필드 에디터 · ' + esc(form.name || '(렌탈) 개인정보 동의서'),
    bodyHtml,
    '',
    'form-editor-dialog',
    '각 페이지별로 필요한 날짜 / 성명 / 서명 / 생년월일 / 연락처 입력란을 자유롭게 선택·배치합니다.'
  );

  initFormEditorEvents(formIdx);
}

// 현재 페이지에 배치된 필드 인스턴스들 렌더링
function renderFieldBoxes(fields, activeId, curPage = 1) {
  const pageFields = (fields || []).filter(f => (parseInt(f.page, 10) || 1) === curPage && f.enabled !== false);

  return pageFields.map(f => {
    const isAct = f.id === activeId;
    const safeLabel = STANDARD_FIELD_LABELS[f.key] || f.label || '입력란';
    const sampleText = f.key === 'signature' ? '(서명 날인)' : (f.sample || sampleTextByKey(f.key));
    const styleStr = `
      left: ${f.x}%;
      top: ${f.y}%;
      width: ${f.w}%;
      height: ${f.h}%;
      font-size: ${f.fontSize || 14}px;
      font-weight: ${f.fontWeight || (f.key === 'name' ? 'bold' : 'normal')};
      text-align: ${f.align || 'center'};
    `;

    return `
      <div class="fe-field-box fe-field-${f.key} ${isAct ? 'is-selected' : ''}"
           data-id="${esc(f.id)}"
           data-key="${esc(f.key)}"
           style="${styleStr}">
        <span class="fe-field-tag">${safeLabel} (${curPage}p)</span>
        <div class="fe-field-content">${esc(sampleText)}</div>
        <div class="fe-resize-handle" data-handle-id="${esc(f.id)}"></div>
      </div>
    `;
  }).join('');
}

function sampleTextByKey(key) {
  const today = new Date();
  const dStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
  switch (key) {
    case 'date': return dStr;
    case 'name': return '홍길동';
    case 'signature': return '(서명 날인)';
    case 'birthDate': return '1985-03-15';
    case 'phone': return '010-0000-0000';
    default: return '입력란';
  }
}

// 우측 사이드바 전체 렌더링 (페이지별 입력란 선택 + 상세 속성)
function renderFieldSidebar(fields, activeId, curPage = 1, totalPages = 1) {
  const curPageFields = (fields || []).filter(f => (parseInt(f.page, 10) || 1) === curPage && f.enabled !== false);
  const activeField = (fields || []).find(f => f.id === activeId) || null;

  return `
    <div class="fe-sidebar-head">
      <h4>입력 필드 속성 에디터</h4>
      <p>각 페이지마다 필요한 입력란을 선택하여 자유롭게 배치하세요.</p>
    </div>

    <!-- 1. 현재 페이지 입력란 선택/추가 카드 -->
    <div class="fe-section-card">
      <div class="fe-section-title">
        <span>📄 ${curPage}페이지 입력란 추가</span>
        <span class="badge blue">${curPageFields.length}개 배치됨</span>
      </div>
      <p style="font-size:11px;color:#64748b;margin:0 0 8px 0;line-height:1.4">
        아래 버튼을 누르면 현재(${curPage}p) 페이지에 해당 입력란이 즉시 추가됩니다.
      </p>
      <div class="fe-add-btn-grid">
        <button type="button" class="btn sm soft fe-add-btn" data-add-key="date" title="날짜 입력란 추가">
          ${icon('plus')} 날짜
        </button>
        <button type="button" class="btn sm soft fe-add-btn" data-add-key="name" title="성명 입력란 추가">
          ${icon('plus')} 성명
        </button>
        <button type="button" class="btn sm soft fe-add-btn" data-add-key="signature" title="서명 입력란 추가">
          ${icon('plus')} 서명
        </button>
        <button type="button" class="btn sm soft fe-add-btn" data-add-key="birthDate" title="생년월일 입력란 추가">
          ${icon('plus')} 생년월일
        </button>
        <button type="button" class="btn sm soft fe-add-btn" data-add-key="phone" title="연락처 입력란 추가">
          ${icon('plus')} 연락처
        </button>
      </div>

      <!-- 현재 페이지에 배치된 입력란 목록 -->
      <div class="fe-page-fields-list" style="margin-top:10px">
        ${curPageFields.length === 0 ? `
          <div style="font-size:11.5px;color:#94a3b8;text-align:center;padding:12px 6px;background:#f8fafc;border-radius:6px;border:1px dashed #cbd5e1">
            현재 ${curPage}페이지에 배치된 입력란이 없습니다.<br>
            위 버튼을 눌러 필요한 입력란을 추가하세요.
          </div>
        ` : curPageFields.map(f => {
          const isAct = f.id === activeId;
          const safeLabel = STANDARD_FIELD_LABELS[f.key] || f.label || '입력란';
          return `
            <div class="fe-field-item-row ${isAct ? 'is-active' : ''}" data-select-id="${esc(f.id)}">
              <div class="fe-field-item-info">
                <span class="fe-field-item-label">${esc(safeLabel)}</span>
                <span class="fe-field-item-pos">X: ${Number(f.x || 0).toFixed(1)}% · Y: ${Number(f.y || 0).toFixed(1)}%</span>
              </div>
              <button type="button" class="fe-item-del-btn" data-del-id="${esc(f.id)}" title="${safeLabel} 삭제">✕</button>
            </div>
          `;
        }).join('')}
      </div>

      ${totalPages > 1 && curPage < totalPages ? `
        <button type="button" class="btn sm soft grow" id="fe-copy-to-next-page-btn" style="width:100%;margin-top:10px;font-size:11.5px">
          ${icon('copy')} 현재 필드들을 다음(${curPage + 1}p)으로 복사
        </button>
      ` : ''}
    </div>

    <!-- 2. 선택된 입력란 상세 속성 조정 -->
    <div class="fe-props-body" id="fe-props-body">
      ${renderFieldProps(activeField, totalPages, curPage)}
    </div>
  `;
}

function renderFieldProps(field, totalPages = 1, curPage = 1) {
  if (!field) {
    return `
      <div style="padding:20px 10px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:6px;border:1px dashed #cbd5e1">
        수정할 입력란 상자를 캔버스에서 클릭하거나<br>
        상단 목록에서 선택하세요.
      </div>
    `;
  }

  const isDate = field.key === 'date';
  const isSig = field.key === 'signature';
  const fieldPage = parseInt(field.page, 10) || 1;
  const safeLabel = STANDARD_FIELD_LABELS[field.key] || field.label || '입력란';

  let pageOptions = '';
  for (let p = 1; p <= totalPages; p++) {
    pageOptions += `<option value="${p}" ${p === fieldPage ? 'selected' : ''}>${p} 페이지</option>`;
  }

  return `
    <div style="padding-bottom:8px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:800;font-size:13px;color:#0f172a">선택: [${esc(safeLabel)}]</span>
      <span class="badge blue">배치: ${fieldPage}p</span>
    </div>

    ${totalPages > 1 ? `
      <div class="fe-prop-group" style="background:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0">
        <label style="color:#1e40af">📄 배치 페이지 변경</label>
        <div style="display:flex;align-items:center;gap:8px">
          <select id="prop-page" style="flex:1;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:700">
            ${pageOptions}
          </select>
          <button type="button" class="btn sm soft" id="fe-move-to-curpage-btn" style="white-space:nowrap;font-size:11px">
            현재(${curPage}p)로 이동
          </button>
        </div>
      </div>
    ` : ''}

    <div class="fe-prop-group">
      <label>위치 (A4 기준 백분율 %)</label>
      <div class="fe-prop-row">
        <div>
          <small style="color:#64748b">X 좌표 (가로)</small>
          <div class="fe-num-input">
            <input type="number" id="prop-x" value="${Number(field.x || 0).toFixed(1)}" step="0.5" min="0" max="100">
            <span>%</span>
          </div>
        </div>
        <div>
          <small style="color:#64748b">Y 좌표 (세로)</small>
          <div class="fe-num-input">
            <input type="number" id="prop-y" value="${Number(field.y || 0).toFixed(1)}" step="0.5" min="0" max="100">
            <span>%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="fe-prop-group">
      <label>크기 (A4 기준 백분율 %)</label>
      <div class="fe-prop-row">
        <div>
          <small style="color:#64748b">너비 (Width)</small>
          <div class="fe-num-input">
            <input type="number" id="prop-w" value="${Number(field.w || 10).toFixed(1)}" step="0.5" min="2" max="100">
            <span>%</span>
          </div>
        </div>
        <div>
          <small style="color:#64748b">높이 (Height)</small>
          <div class="fe-num-input">
            <input type="number" id="prop-h" value="${Number(field.h || 3).toFixed(1)}" step="0.5" min="1" max="100">
            <span>%</span>
          </div>
        </div>
      </div>
    </div>

    ${!isSig ? `
      <div class="fe-prop-group">
        <label>텍스트 스타일</label>
        <div class="fe-prop-row">
          <div>
            <small style="color:#64748b">글자 크기 (px)</small>
            <div class="fe-num-input">
              <input type="number" id="prop-fontSize" value="${field.fontSize || 14}" step="1" min="10" max="32">
              <span>px</span>
            </div>
          </div>
          <div>
            <small style="color:#64748b">정렬</small>
            <select id="prop-align" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px">
              <option value="left" ${field.align === 'left' ? 'selected' : ''}>좌측 정렬</option>
              <option value="center" ${field.align === 'center' ? 'selected' : ''}>가운데 정렬</option>
              <option value="right" ${field.align === 'right' ? 'selected' : ''}>우측 정렬</option>
            </select>
          </div>
        </div>
      </div>
    ` : ''}

    ${isDate ? `
      <div class="fe-prop-group">
        <label>날짜 표기 형식</label>
        <select id="prop-format" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px">
          <option value="YYYY년 MM월 DD일" ${(field.format || '') === 'YYYY년 MM월 DD일' ? 'selected' : ''}>2026년 11월 12일</option>
          <option value="YYYY. MM. DD" ${(field.format || '') === 'YYYY. MM. DD' ? 'selected' : ''}>2026. 11. 12</option>
          <option value="YYYY-MM-DD" ${(field.format || '') === 'YYYY-MM-DD' ? 'selected' : ''}>2026-11-12</option>
        </select>
      </div>
    ` : ''}

    <div style="display:flex;gap:6px;margin-top:6px">
      <button type="button" class="btn sm soft grow" id="fe-center-x-btn">수평 중앙 정렬</button>
      <button type="button" class="btn sm soft grow" id="fe-reset-this-btn">기본값 복원</button>
      <button type="button" class="btn sm danger" id="fe-delete-this-btn" style="white-space:nowrap">${icon('trash')} 삭제</button>
    </div>

    <div class="fe-tips-box">
      <b>💡 키보드 미세조정 팁</b><br>
      박스를 클릭한 상태에서 키보드 <b>상/하/좌/우(↑↓←→)</b> 방향키를 누르면 <b>0.2% (약 2px)</b> 단위로 정밀하게 이동합니다.<br>
      <b>Shift</b> 키를 함께 누르면 1.0% 단위로 이동합니다.
    </div>
  `;
}

function initFormEditorEvents(formIdx) {
  const form = db.forms[formIdx];
  const a4Page = $('#fe-a4-page');
  const a4Wrapper = $('#fe-a4-wrapper');
  const canvasEl = $('#fe-pdf-canvas');
  const overlayEl = $('#fe-fields-overlay');
  const sidebarEl = $('#fe-sidebar');

  // 현재 활성 필드 찾기
  const getActiveField = () => {
    if (!editorState || !editorState.fields) return null;
    return editorState.fields.find(f => f.id === editorState.activeId) || null;
  };

  // 현재 페이지 PDF 및 필드 렌더링 함수
  const renderCurrentPage = async () => {
    if (editorState.pdfDoc && canvasEl) {
      canvasEl.style.display = 'block';
      const defTpl = $('#fe-default-template-container');
      if (defTpl) defTpl.style.display = 'none';

      await renderPdfPageToCanvas(editorState.pdfDoc, editorState.currentPage, canvasEl);

      const tag = $('#fe-page-indicator-tag');
      if (tag) {
        tag.textContent = `${editorState.currentPage} / ${editorState.totalPages} 페이지`;
        tag.style.display = editorState.totalPages > 1 ? 'block' : 'none';
      }
    }

    // 캔버스 오버레이 다시 렌더링
    if (overlayEl) {
      overlayEl.innerHTML = renderFieldBoxes(editorState.fields, editorState.activeId, editorState.currentPage);
    }

    // 사이드바 다시 렌더링
    if (sidebarEl) {
      sidebarEl.innerHTML = renderFieldSidebar(editorState.fields, editorState.activeId, editorState.currentPage, editorState.totalPages);
    }
  };

  // 초기 렌더링
  if (editorState.pdfDoc) {
    renderCurrentPage();
  }

  // 페이지 이동 함수
  const goToPage = (p) => {
    const targetPage = Math.max(1, Math.min(p, editorState.totalPages));
    if (editorState.currentPage === targetPage) return;
    editorState.currentPage = targetPage;

    // 페이지 네비게이션 UI 업데이트
    const sel = $('#fe-page-select');
    if (sel) sel.value = String(targetPage);
    const prevBtn = $('#fe-prev-page');
    if (prevBtn) prevBtn.disabled = targetPage <= 1;
    const nextBtn = $('#fe-next-page');
    if (nextBtn) nextBtn.disabled = targetPage >= editorState.totalPages;

    // 현재 페이지에 속한 필드가 있다면 첫 번째 것을 자동 선택
    const curPageField = editorState.fields.find(f => (parseInt(f.page, 10) || 1) === targetPage);
    if (curPageField) {
      editorState.activeId = curPageField.id;
    } else {
      editorState.activeId = null;
    }

    renderCurrentPage();
  };

  $('#fe-prev-page')?.addEventListener('click', () => goToPage(editorState.currentPage - 1));
  $('#fe-next-page')?.addEventListener('click', () => goToPage(editorState.currentPage + 1));
  $('#fe-page-select')?.addEventListener('change', e => goToPage(parseInt(e.target.value, 10) || 1));

  // 줌 컨트롤
  const updateZoom = (z) => {
    editorState.zoom = Math.max(0.5, Math.min(2.0, z));
    if (a4Wrapper) a4Wrapper.style.transform = `scale(${editorState.zoom})`;
    const lbl = $('#fe-zoom-label');
    if (lbl) lbl.textContent = `${Math.round(editorState.zoom * 100)}%`;
  };

  $('#fe-zoom-in')?.addEventListener('click', () => updateZoom(editorState.zoom + 0.15));
  $('#fe-zoom-out')?.addEventListener('click', () => updateZoom(editorState.zoom - 0.15));
  $('#fe-zoom-fit')?.addEventListener('click', () => {
    const vp = $('#fe-viewport');
    if (vp) {
      const scale = Math.min((vp.clientWidth - 40) / 794, (vp.clientHeight - 60) / 1123);
      updateZoom(scale);
    }
  });

  // 필드 선택 함수
  function selectField(id) {
    if (!id) {
      editorState.activeId = null;
      renderCurrentPage();
      return;
    }
    const f = editorState.fields.find(item => item.id === id);
    if (!f) return;

    editorState.activeId = id;
    const targetPage = parseInt(f.page, 10) || 1;

    // 만약 선택한 필드가 현재 보고 있는 페이지와 다르면 해당 페이지로 자동 이동
    if (targetPage !== editorState.currentPage) {
      goToPage(targetPage);
    } else {
      renderCurrentPage();
    }
  }

  // 사이드바 이벤트 델리게이션
  sidebarEl?.addEventListener('click', e => {
    // 1. [✚ 필드 추가] 버튼 클릭
    const addBtn = e.target.closest('[data-add-key]');
    if (addBtn) {
      const key = addBtn.dataset.addKey;
      const tpl = DEFAULT_FIELD_TEMPLATES[key] || DEFAULT_FIELD_TEMPLATES.name;
      const curPage = editorState.currentPage;

      // 같은 키의 필드가 현재 페이지에 몇 개 있는지 세어 약간의 오프셋 부여
      const sameKeyCount = editorState.fields.filter(f => (parseInt(f.page, 10) || 1) === curPage && f.key === key).length;
      const offsetY = sameKeyCount * 4.0;

      const newId = `f_${key}_p${curPage}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const newField = {
        id: newId,
        key,
        label: STANDARD_FIELD_LABELS[key] || key,
        page: curPage,
        x: tpl.x,
        y: Math.min(92.0, tpl.y + offsetY),
        w: tpl.w,
        h: tpl.h,
        fontSize: tpl.fontSize || 14,
        fontWeight: tpl.fontWeight || (key === 'name' ? 'bold' : 'normal'),
        color: '#1a202c',
        align: tpl.align || 'center',
        format: (key === 'date') ? 'YYYY년 MM월 DD일' : undefined,
        sample: tpl.sample,
        enabled: true
      };

      editorState.fields.push(newField);
      editorState.activeId = newId;
      toast(`[${newField.label}] 입력란이 ${curPage}페이지에 추가되었습니다.`);
      renderCurrentPage();
      return;
    }

    // 2. [✕ 삭제] 개별 버튼 클릭
    const delBtn = e.target.closest('[data-del-id]');
    if (delBtn) {
      const delId = delBtn.dataset.delId;
      const target = editorState.fields.find(f => f.id === delId);
      const label = target ? target.label : '입력란';
      editorState.fields = editorState.fields.filter(f => f.id !== delId);
      if (editorState.activeId === delId) {
        const remainingInPage = editorState.fields.find(f => (parseInt(f.page, 10) || 1) === editorState.currentPage);
        editorState.activeId = remainingInPage ? remainingInPage.id : null;
      }
      toast(`[${label}] 입력란이 삭제되었습니다.`);
      renderCurrentPage();
      return;
    }

    // 3. 목록 항목 클릭하여 선택
    const itemRow = e.target.closest('[data-select-id]');
    if (itemRow && !e.target.closest('.fe-item-del-btn')) {
      selectField(itemRow.dataset.selectId);
      return;
    }

    // 4. [현재 필드들을 다음 페이지로 복사] 버튼
    if (e.target.closest('#fe-copy-to-next-page-btn')) {
      const curPage = editorState.currentPage;
      const nextPage = curPage + 1;
      if (nextPage > editorState.totalPages) return toast('마지막 페이지입니다.');

      const curFields = editorState.fields.filter(f => (parseInt(f.page, 10) || 1) === curPage);
      if (curFields.length === 0) return toast('현재 페이지에 복사할 필드가 없습니다.');

      const copied = curFields.map(f => ({
        ...JSON.parse(JSON.stringify(f)),
        id: `f_${f.key}_p${nextPage}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        page: nextPage
      }));

      editorState.fields.push(...copied);
      toast(`${curFields.length}개 입력란이 ${nextPage}페이지로 복사되었습니다.`);
      goToPage(nextPage);
      return;
    }

    // 5. 상세 속성 버튼들 (수평 중앙 정렬, 기본값 복원, 활성 필드 삭제)
    const active = getActiveField();
    if (!active) return;

    if (e.target.closest('#fe-center-x-btn')) {
      active.x = Number(((100 - active.w) / 2).toFixed(1));
      syncBoxStyle(active.id);
      renderCurrentPage();
      return;
    }

    if (e.target.closest('#fe-reset-this-btn')) {
      const tpl = DEFAULT_FIELD_TEMPLATES[active.key] || DEFAULT_FIELD_TEMPLATES.name;
      active.x = tpl.x;
      active.y = tpl.y;
      active.w = tpl.w;
      active.h = tpl.h;
      active.fontSize = tpl.fontSize || 14;
      active.align = tpl.align || 'center';
      syncBoxStyle(active.id);
      renderCurrentPage();
      return;
    }

    if (e.target.closest('#fe-delete-this-btn')) {
      const label = active.label || '입력란';
      const curDelId = active.id;
      editorState.fields = editorState.fields.filter(f => f.id !== curDelId);
      const remainingInPage = editorState.fields.find(f => (parseInt(f.page, 10) || 1) === editorState.currentPage);
      editorState.activeId = remainingInPage ? remainingInPage.id : null;
      toast(`[${label}] 입력란이 삭제되었습니다.`);
      renderCurrentPage();
      return;
    }

    if (e.target.closest('#fe-move-to-curpage-btn')) {
      active.page = editorState.currentPage;
      toast(`[${active.label}] 필드가 현재 페이지(${editorState.currentPage}p)로 이동되었습니다.`);
      renderCurrentPage();
      return;
    }
  });

  // 속성 입력 실시간 반영
  sidebarEl?.addEventListener('input', e => {
    const active = getActiveField();
    if (!active) return;

    if (e.target.id === 'prop-x') active.x = parseFloat(e.target.value) || 0;
    if (e.target.id === 'prop-y') active.y = parseFloat(e.target.value) || 0;
    if (e.target.id === 'prop-w') active.w = parseFloat(e.target.value) || 10;
    if (e.target.id === 'prop-h') active.h = parseFloat(e.target.value) || 3;
    if (e.target.id === 'prop-fontSize') active.fontSize = parseInt(e.target.value, 10) || 14;
    if (e.target.id === 'prop-align') active.align = e.target.value;
    if (e.target.id === 'prop-format') active.format = e.target.value;

    syncBoxStyle(active.id);
  });

  sidebarEl?.addEventListener('change', e => {
    const active = getActiveField();
    if (!active) return;

    if (e.target.id === 'prop-page') {
      const newPage = parseInt(e.target.value, 10) || 1;
      active.page = newPage;
      toast(`[${active.label}] 필드가 ${newPage}페이지로 이동되었습니다.`);
      selectField(active.id);
    }
  });

  function syncBoxStyle(id) {
    const f = editorState.fields.find(item => item.id === id);
    const box = $(`[data-id="${id}"]`, a4Page);
    if (!box || !f) return;
    box.style.left = `${f.x}%`;
    box.style.top = `${f.y}%`;
    box.style.width = `${f.w}%`;
    box.style.height = `${f.h}%`;
    box.style.fontSize = `${f.fontSize || 14}px`;
    box.style.textAlign = f.align || 'center';
  }

  // 드래그 & 리사이즈 마우스 인터랙션
  a4Page?.addEventListener('mousedown', e => {
    const handle = e.target.closest('.fe-resize-handle');
    if (handle) {
      e.preventDefault();
      e.stopPropagation();
      const id = handle.dataset.handleId;
      selectField(id);
      editorState.isResizing = true;
      editorState.dragStartX = e.clientX;
      editorState.dragStartY = e.clientY;
      const f = getActiveField();
      editorState.initialBox = f ? { ...f } : null;
      return;
    }

    const box = e.target.closest('.fe-field-box');
    if (box) {
      e.preventDefault();
      const id = box.dataset.id;
      selectField(id);
      editorState.isDragging = true;
      editorState.dragStartX = e.clientX;
      editorState.dragStartY = e.clientY;
      const f = getActiveField();
      editorState.initialBox = f ? { ...f } : null;
    }
  });

  const onMouseMove = (e) => {
    if (!editorState || (!editorState.isDragging && !editorState.isResizing)) return;
    const f = getActiveField();
    const init = editorState.initialBox;
    if (!f || !init) return;

    const scale = editorState.zoom || 1.0;
    const dx = (e.clientX - editorState.dragStartX) / scale;
    const dy = (e.clientY - editorState.dragStartY) / scale;

    const dxPercent = (dx / 794) * 100;
    const dyPercent = (dy / 1123) * 100;

    if (editorState.isDragging) {
      let newX = Math.round((init.x + dxPercent) * 10) / 10;
      let newY = Math.round((init.y + dyPercent) * 10) / 10;
      f.x = Math.max(0, Math.min(100 - f.w, newX));
      f.y = Math.max(0, Math.min(100 - f.h, newY));
      syncBoxStyle(f.id);
      const px = $('#prop-x'); if (px) px.value = f.x.toFixed(1);
      const py = $('#prop-y'); if (py) py.value = f.y.toFixed(1);
    } else if (editorState.isResizing) {
      let newW = Math.round((init.w + dxPercent) * 10) / 10;
      let newH = Math.round((init.h + dyPercent) * 10) / 10;
      f.w = Math.max(4, Math.min(100 - f.x, newW));
      f.h = Math.max(1.5, Math.min(100 - f.y, newH));
      syncBoxStyle(f.id);
      const pw = $('#prop-w'); if (pw) pw.value = f.w.toFixed(1);
      const ph = $('#prop-h'); if (ph) ph.value = f.h.toFixed(1);
    }
  };

  const onMouseUp = () => {
    if (editorState) {
      editorState.isDragging = false;
      editorState.isResizing = false;
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // 키보드 방향키 미세 조정
  const onKeyDown = (e) => {
    if (!editorState || !$('.dialog.form-editor-dialog')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      e.preventDefault();
      const f = getActiveField();
      if (!f) return;

      const step = e.shiftKey ? 1.0 : 0.2;
      if (e.key === 'ArrowUp') f.y = Math.max(0, Number((f.y - step).toFixed(1)));
      if (e.key === 'ArrowDown') f.y = Math.min(100 - f.h, Number((f.y + step).toFixed(1)));
      if (e.key === 'ArrowLeft') f.x = Math.max(0, Number((f.x - step).toFixed(1)));
      if (e.key === 'ArrowRight') f.x = Math.min(100 - f.w, Number((f.x + step).toFixed(1)));

      syncBoxStyle(f.id);
      const px = $('#prop-x'); if (px) px.value = f.x.toFixed(1);
      const py = $('#prop-y'); if (py) py.value = f.y.toFixed(1);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // PDF 업로드 트리거
  const fileInp = $('#fe-pdf-file-input');
  $('#fe-trigger-upload-btn')?.addEventListener('click', () => fileInp?.click());
  fileInp?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await handleFormPdfUpload(formIdx, file);
  });

  // 전체 기본위치 복구
  $('#fe-reset-positions-btn')?.addEventListener('click', () => {
    if (!confirm('표준 기본 입력란 위치로 초기화하시겠습니까?')) return;
    editorState.fields = normalizeFormFields(DEFAULT_FIELD_TEMPLATES);
    editorState.activeId = editorState.fields[0]?.id || null;
    renderCurrentPage();
    toast('표준 기본 입력란으로 복원했습니다.');
  });

  // 실시간 미리보기 버튼
  $('#fe-preview-btn')?.addEventListener('click', () => {
    openFormPreview(formIdx, null, editorState.fields);
  });

  // 저장 버튼
  $('#fe-save-btn')?.addEventListener('click', async () => {
    const curForm = db.forms[formIdx];

    // 저장 전 필드 데이터 유효성 정규화
    editorState.fields.forEach(f => {
      f.label = STANDARD_FIELD_LABELS[f.key] || f.label || '입력란';
      f.page = parseInt(f.page, 10) || 1;
      if (f.key === 'date' && (!f.format || f.format.includes('?'))) {
        f.format = 'YYYY년 MM월 DD일';
      }
    });

    curForm.fieldsConfig = JSON.parse(JSON.stringify(editorState.fields));
    save();

    if (curForm.id) {
      try {
        const res = await apiFetch('/api/settings/forms/' + encodeURIComponent(curForm.id), {
          method: 'PATCH',
          body: {
            fieldsConfig: curForm.fieldsConfig,
            pdfPath: curForm.pdfPath,
            pdfStorageId: curForm.pdfStorageId || undefined,
            fileName: curForm.fileName,
            text: curForm.text
          }
        });
        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          curForm.version = resData.version || curForm.version;
          save();
        }
      } catch (err) {
        console.warn('Server form sync err:', err);
      }
    }
    toast('양식 필드 배치 설정이 성공적으로 저장되었습니다!');
    render();
  });
}

// PDF 업로드 처리 (한글 파일명 보존, 대용량 직접 업로드 및 다중 페이지 재로딩)
async function handleFormPdfUpload(formIdx, file) {
  const form = db.forms[formIdx];
  if (!file || !form) return;

  const originalFileName = file.name || 'form.pdf';
  if (file.type && file.type !== 'application/pdf' && !originalFileName.toLowerCase().endsWith('.pdf')) {
    return toast('PDF 파일(.pdf)만 업로드할 수 있습니다.');
  }

  toast('PDF 파일을 업로드하고 있습니다...');

  try {
    let data = null;

    // 4MB 초과는 서버리스 바디 제한 우회를 위해 직접 스토리지 업로드 우선 시도
    if (file.size > 4 * 1024 * 1024) {
      try {
        const urlRes = await apiFetch('/api/settings/forms/upload-url', { method: 'POST' });
        if (urlRes.ok) {
          const { uploadUrl } = await urlRes.json();
          if (uploadUrl) {
            const upRes = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/pdf' },
              body: file
            });
            if (!upRes.ok) throw new Error('스토리지 직접 업로드 실패');
            const { storageId } = await upRes.json();
            const regRes = await apiFetch('/api/settings/forms/register-pdf', {
              method: 'POST',
              body: { storageId, fileName: originalFileName }
            });
            data = await regRes.json().catch(() => ({}));
            if (!regRes.ok) {
              return toast(data.error || 'PDF 등록에 실패했습니다.');
            }
          }
        }
      } catch (directErr) {
        console.warn('Direct PDF upload fallback:', directErr);
      }
    }

    if (!data) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileName', originalFileName);
      const res = await fetch('/api/settings/forms/upload-pdf', {
        method: 'POST',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
        body: fd
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return toast(data.error || 'PDF 업로드에 실패했습니다.');
      }
    }

    if (!data.pdfPath) {
      return toast('서버에서 PDF 경로를 반환하지 않았습니다.');
    }

    form.pdfPath = data.pdfPath;
    form.pdfStorageId = data.pdfStorageId || null;
    form.fileName = data.fileName || originalFileName;
    save();

    if (form.id) {
      try {
        const patchRes = await apiFetch('/api/settings/forms/' + encodeURIComponent(form.id), {
          method: 'PATCH',
          body: {
            pdfPath: form.pdfPath,
            pdfStorageId: form.pdfStorageId || undefined,
            fileName: form.fileName,
            fieldsConfig: form.fieldsConfig
          }
        });
        if (patchRes.ok) {
          const patchData = await patchRes.json().catch(() => ({}));
          if (patchData.version) {
            form.version = patchData.version;
            save();
          }
        }
      } catch (syncErr) {
        console.warn('PDF metadata sync warning:', syncErr);
      }
    }

    pdfDocCache.delete(data.pdfPath);

    // PDF 로드 및 총 페이지 수 파악
    const newDoc = await getPdfDoc(data.pdfPath);
    if (!newDoc) {
      toast('PDF 파일은 저장되었으나 화면 렌더링에 실패했습니다. 새로고침 후 확인해 주세요.');
    } else {
      toast(`[${form.fileName}] PDF가 성공적으로 등록되었습니다!`);
    }

    const isEditorOpen = Boolean($('#fe-pdf-canvas') && $('.overlay'));
    if (isEditorOpen && editorState) {
      editorState.pdfDoc = newDoc;
      editorState.totalPages = newDoc ? newDoc.numPages : 1;
      editorState.currentPage = 1;
      openFormEditor(formIdx);
    } else {
      render();
    }
  } catch (err) {
    console.error('PDF upload error:', err);
    toast('PDF 파일 업로드 중 오류가 발생했습니다.');
  }
}

// -------------------------------------------------------------
// [실시간 미리보기]: 렌탈 신청 고객 정보 & 서명 합성 뷰어 (다중 페이지 전체 지원)
// -------------------------------------------------------------
let previewApplicantsCache = null;

async function openFormPreview(formIdx, selectedApplicantId = null, draftFields = null) {
  const form = db.forms[formIdx];
  if (!form) return toast('양식을 찾을 수 없습니다.');

  toast('렌탈 신청 고객 및 서명 데이터를 불러오는 중...');
  let applicants = null;
  if (!selectedApplicantId && previewApplicantsCache) {
    applicants = previewApplicantsCache;
  }

  if (!applicants || (selectedApplicantId && !applicants.some(a => a.id === selectedApplicantId))) {
    try {
      const res = await apiFetch('/api/settings/forms/rental-applicants');
      if (res.ok) {
        const data = await res.json();
        applicants = data.applicants || [];
        previewApplicantsCache = applicants;
      }
    } catch {}
  }

  // 폴백 샘플 고객
  if (!applicants || !applicants.length) {
    const today = new Date();
    const dStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
    applicants = [
      {
        id: 'SAMPLE-PREVIEW',
        customerName: '홍길동',
        phone: '010-0000-0000',
        birthDate: '1985-03-15',
        date: dStr,
        signatureDataUrl: null,
        planTitle: '렌탈 신청 미리보기'
      }
    ];
  }

  const activeApp = applicants.find(a => a.id === selectedApplicantId) || applicants[0];
  const fields = normalizeFormFields(draftFields || form.fieldsConfig || DEFAULT_FORM_FIELDS);

  // PDF 문서 및 총 페이지 수 로드
  let pdfDoc = null;
  let totalPages = 1;
  if (form.pdfPath) {
    pdfDoc = await getPdfDoc(form.pdfPath);
    if (pdfDoc) totalPages = pdfDoc.numPages;
  }

  // 페이지 목록 HTML 생성 (다중 페이지 전체 연속 스크롤)
  let pagesHtml = '';
  if (form.pdfPath && totalPages > 0) {
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      pagesHtml += `
        <div class="fp-a4-page" id="fp-a4-page-${pNum}" data-page="${pNum}">
          <span class="fp-page-number-tag">${pNum} / ${totalPages} 페이지</span>
          <canvas class="fe-pdf-canvas" id="fp-pdf-canvas-${pNum}"></canvas>
          <div class="fp-rendered-fields-layer" id="fp-fields-layer-${pNum}">
            ${renderPreviewFieldsForPage(fields, activeApp, pNum, totalPages)}
          </div>
        </div>
      `;
    }
  } else {
    // PDF가 없을 경우 기본 서식 1장 표시
    pagesHtml = `
      <div class="fp-a4-page" id="fp-a4-page-1" data-page="1">
        <span class="fp-page-number-tag">1 / 1 페이지 (표준 서식)</span>
        <div id="fp-default-template-container">
          ${getStandardConsentTemplateHtml()}
        </div>
        <div class="fp-rendered-fields-layer" id="fp-fields-layer-1">
          ${renderPreviewFieldsForPage(fields, activeApp, 1, 1)}
        </div>
      </div>
    `;
  }

  const bodyHtml = `
    <div class="fp-header-bar">
      <div class="fp-applicant-select-wrap">
        <label style="font-weight:700;font-size:12px;color:#334155">${icon('users')} 렌탈 신청 고객 선택:</label>
        <select class="fp-applicant-select" id="fp-applicant-select">
          ${applicants.map(a => `
            <option value="${esc(a.id)}" ${a.id === activeApp.id ? 'selected' : ''}>
              ${esc(a.id)} | ${esc(a.customerName)} (${esc(a.phone)}) · ${esc(a.planTitle || '렌탈')}
            </option>
          `).join('')}
        </select>
        <span class="badge green" style="font-size:11px">고객 정보 및 전자서명 자동 연동</span>
        ${totalPages > 1 ? `<span class="badge blue" style="font-size:11px">총 ${totalPages}페이지 전체 연속 뷰</span>` : ''}
      </div>

      <div style="display:flex;align-items:center;gap:6px">
        ${totalPages > 1 ? `
          <button type="button" class="btn sm soft" id="fp-jump-first-page-btn">1p 이동</button>
          <button type="button" class="btn sm soft" id="fp-jump-last-page-btn">${totalPages}p(서명란) 이동</button>
        ` : ''}
        <div style="display:flex;align-items:center;gap:4px;background:#e2e8f0;padding:2px 6px;border-radius:6px">
          <button type="button" class="btn sm soft" id="fp-zoom-out" style="padding:2px 8px">－</button>
          <span id="fp-zoom-label" style="font-size:11.5px;font-weight:700;min-width:44px;text-align:center">100%</span>
          <button type="button" class="btn sm soft" id="fp-zoom-in" style="padding:2px 8px">＋</button>
        </div>
        <button type="button" class="btn sm soft" id="fp-back-to-editor-btn">${icon('edit')} 필드 에디터로 위치 수정</button>
        <button type="button" class="btn sm primary" id="fp-print-btn">${icon('send')} 전체 인쇄 / PDF 출력</button>
      </div>
    </div>

    <div class="fp-viewport" id="fp-viewport">
      <div class="fp-pages-container" id="fp-pages-container" style="transform: scale(1.0); transform-origin: top center; transition: transform 0.15s ease-out;">
        ${pagesHtml}
      </div>
    </div>
  `;

  openDialog(
    '실시간 완성본 미리보기 · (렌탈) 개인정보 동의서',
    bodyHtml,
    '',
    'form-preview-dialog',
    `총 ${totalPages}페이지 전체 문서가 연속 표시되며, 고객의 실제 정보와 전자서명이 각 페이지 지정 위치에 정확히 합성됩니다.`
  );

  initFormPreviewEvents(formIdx, applicants, fields, pdfDoc, totalPages);
}

// 특정 페이지에 배치된 모든 필드 인스턴스들을 실시간 고객 정보 및 전자서명으로 합성
function renderPreviewFieldsForPage(fields, app, targetPage = 1, totalPages = 1) {
  const normalized = normalizeFormFields(fields);
  const pageFields = normalized.filter(f => (parseInt(f.page, 10) || 1) === targetPage && f.enabled !== false);

  // 서명 렌더링 준비
  let sigContent = '';
  if (app.signatureDataUrl) {
    sigContent = `<img src="${app.signatureDataUrl}" alt="전자서명" style="max-width:100%;max-height:100%;object-fit:contain">`;
  } else {
    sigContent = `
      <div style="font-family:'Brush Script MT', cursive, sans-serif;font-size:26px;color:#1e3a8a;transform:rotate(-4deg);letter-spacing:1px;opacity:0.9">
        ${esc(app.customerName)} (인)
      </div>
    `;
  }

  const htmlList = [];

  for (const f of pageFields) {
    if (f.key === 'signature') {
      const sigStyle = `
        left: ${f.x}%;
        top: ${f.y}%;
        width: ${f.w}%;
        height: ${f.h}%;
      `;
      htmlList.push(`<div class="fp-rendered-signature" style="${sigStyle}">${sigContent}</div>`);
      continue;
    }

    let textVal = '';
    if (f.key === 'name') textVal = app.customerName || '';
    else if (f.key === 'birthDate') textVal = app.birthDate || '';
    else if (f.key === 'phone') textVal = app.phone || '';
    else if (f.key === 'date') {
      textVal = app.date || '';
      const dFmt = f.format || 'YYYY년 MM월 DD일';
      if (dFmt === 'YYYY. MM. DD') {
        textVal = (textVal || '').replace('년 ', '. ').replace('월 ', '. ').replace('일', '');
      } else if (dFmt === 'YYYY-MM-DD') {
        textVal = (textVal || '').replace('년 ', '-').replace('월 ', '-').replace('일', '');
      }
    }

    const styleStr = `
      left: ${f.x}%;
      top: ${f.y}%;
      width: ${f.w}%;
      height: ${f.h}%;
      font-size: ${f.fontSize || 14}px;
      font-weight: ${f.fontWeight || (f.key === 'name' ? 'bold' : 'normal')};
      color: ${f.color || '#1a202c'};
      text-align: ${f.align || 'center'};
    `;
    htmlList.push(`<div class="fp-rendered-field" style="${styleStr}">${esc(textVal)}</div>`);
  }

  return htmlList.join('');
}

function initFormPreviewEvents(formIdx, applicants, fields, pdfDoc, totalPages) {
  const container = $('#fp-pages-container');
  let currentZoom = 1.0;

  // 모든 페이지 캔버스 비동기 순차 렌더링 (고해상도 2.0x)
  const canvasRenderPromises = [];
  if (pdfDoc && totalPages > 0) {
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      const cv = $(`#fp-pdf-canvas-${pNum}`);
      if (cv) {
        canvasRenderPromises.push(renderPdfPageToCanvas(pdfDoc, pNum, cv, 2.0));
      }
    }
  }

  // 고객 변경
  $('#fp-applicant-select')?.addEventListener('change', e => {
    const app = applicants.find(a => a.id === e.target.value) || applicants[0];
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      const layer = $(`#fp-fields-layer-${pNum}`);
      if (layer) layer.innerHTML = renderPreviewFieldsForPage(fields, app, pNum, totalPages);
    }
  });

  // 페이지 점프
  $('#fp-jump-first-page-btn')?.addEventListener('click', () => {
    const p1 = $(`#fp-a4-page-1`);
    if (p1) p1.scrollIntoView({ behavior: 'smooth' });
  });
  $('#fp-jump-last-page-btn')?.addEventListener('click', () => {
    const pLast = $(`#fp-a4-page-${totalPages}`);
    if (pLast) pLast.scrollIntoView({ behavior: 'smooth' });
  });

  // 줌
  const updateZoom = (z) => {
    currentZoom = Math.max(0.6, Math.min(1.8, z));
    if (container) container.style.transform = `scale(${currentZoom})`;
    const lbl = $('#fp-zoom-label');
    if (lbl) lbl.textContent = `${Math.round(currentZoom * 100)}%`;
  };
  $('#fp-zoom-in')?.addEventListener('click', () => updateZoom(currentZoom + 0.15));
  $('#fp-zoom-out')?.addEventListener('click', () => updateZoom(currentZoom - 0.15));

  // 에디터로 돌아가기
  $('#fp-back-to-editor-btn')?.addEventListener('click', () => {
    openFormEditor(formIdx);
  });

  // 인쇄 / PDF 저장 (렌더링 및 서명 이미지 디코딩 완료 대기 후 호출)
  $('#fp-print-btn')?.addEventListener('click', async () => {
    if (canvasRenderPromises.length) {
      await Promise.all(canvasRenderPromises).catch(() => {});
    }
    const imgs = [...document.querySelectorAll('#fp-pages-container img')];
    if (imgs.length) {
      await Promise.all(imgs.map(img => (typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve())));
    }
    const selId = $('#fp-applicant-select')?.value;
    const selApp = applicants.find(a => a.id === selId) || applicants[0];
    const prevTitle = document.title;
    const safeCust = String(selApp?.customerName || '고객').replace(/[\\/:*?"<>|]/g, '_');
    const safeId = String(selApp?.id || 'RENTAL').replace(/[\\/:*?"<>|]/g, '_');
    document.title = `${safeCust}_렌탈동의서_${safeId}`;
    const restoreTitle = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    setTimeout(restoreTitle, 30000);
    window.print();
  });
}

function renderQuotePhoneSettingsPanel(){
  return `<div class="panel-head"><div><h3>모바일 견적서 담당자 · 전화상담 설정</h3><p>고객 모바일 견적서 하단의 <b>담당 상담사 이름</b>과 <b>전화 상담</b> 연결 번호를 설정합니다.</p></div></div>
  <div class="panel-pad">
    <form data-submit="quote-phone" style="max-width:460px;display:flex;flex-direction:column;gap:14px">
      <div class="field">
        <label for="quote-consult-manager-input">담당 상담사 이름</label>
        <input class="input" id="quote-consult-manager-input" name="managerName" type="text" value="${esc(quoteConsultManagerName)}" placeholder="예: 김지훈 팀장 또는 라이프앤조이 전담팀" maxlength="40">
      </div>
      <div class="field">
        <label for="quote-consult-phone-input">전화상담 연결 번호</label>
        <input class="input" id="quote-consult-phone-input" name="phone" type="tel" value="${esc(quoteConsultPhone)}" placeholder="예: 02-2015-8500 또는 1588-0000" maxlength="25">
      </div>
      <div class="notice-text">한 번 저장하면 모든 고객 모바일 견적서 및 실시간 미리보기에 계속 유지되며, 언제든 수정할 수 있습니다. 비우고 저장하면 견적 원본/담당자 기본값이 표시됩니다.</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button type="submit" class="btn primary">${icon('check')}상담 정보 저장</button>
        ${(quoteConsultPhone || quoteConsultManagerName) ? btn('기본값으로 초기화', 'clear-quote-phone', 'refresh', 'soft') : ''}
      </div>
    </form>
  </div>`;
}

function settingsPage(){
  const tabs=[
    ['labels','진행라벨','box'],
    ['stages','진행구분','filter'],
    ['contract-statuses','계약·수납상태','contract'],
    ['forms','양식관리','file'],
    ['users','계정·사용자관리','users'],
    ['quote-phone','견적 상담 설정','phone'],
    ['integrations','외부 연동','link'],
    ['reset','초기화 설정','refresh']
  ];
  let content='';
  if(settingsTab==='labels')content=`<div class="panel-head"><div><h3>진행라벨 관리</h3><p>고객의 특성을 표시하는 라벨입니다. 업무 단계와 별도로 관리합니다.</p></div>${btn('라벨 추가','new-label','plus','sm primary')}</div><div class="panel-pad">${db.labels.map(l=>`<div class="settings-row"><span class="color-dot" style="background:${l.color}"></span><div class="grow"><b>${esc(l.name)}</b><small>고객 목록과 상세 화면에 표시</small></div>${badge(l.name,'gray')}</div>`).join('')}</div>`;
  if(settingsTab==='stages')content=`<div class="panel-head"><div><h3>진행구분</h3><p>상담·견적·실측·계약의 업무 흐름을 표시합니다.</p></div></div><div class="panel-pad">${stages.map((s,i)=>`<div class="settings-row"><div class="avatar" style="width:28px;height:28px">${String(i+1).padStart(2,'0')}</div><div class="grow"><b>${s}</b><small>${i<5?'상담·견적 담당':'계약·운영 담당'} · 과거 이력 보존</small></div>${badge(s)}</div>`).join('')}</div>`;
  if(settingsTab==='contract-statuses')content=renderContractStatusesSettingsPanel();
  if(settingsTab==='forms')content=renderFormsSettingsPanel();
  if(settingsTab==='users')content=renderUsersSettingsPanel();
  if(settingsTab==='quote-phone')content=renderQuotePhoneSettingsPanel();
  if(settingsTab==='integrations')content=`<div class="panel-head"><div><h3>외부 서비스 연동</h3><p>실제 서비스 개통 상태와 운영 연결을 관리합니다.</p></div></div><div class="panel-pad">${[['카드결제 PG','신규 결제 요청·승인·취소·정산','credit'],['문자·알림톡','견적 안내·본인 인증·업무 알림','send'],['렌탈사 접수','심사·약정·정산 결과 연결','file'],['랜딩페이지 수집','상담 신청·유입 이벤트 연결','link']].map(([n,t,i])=>`<div class="settings-row">${icon(i)}<div class="grow"><b>${n}</b><small>${t}</small></div>${badge('미연결','gray')}${btn('연결 안내','integration','info','sm',`data-name="${n}"`)}</div>`).join('')}</div>`;
  if(settingsTab==='reset')content=`<div class="panel-head"><h3>운영 데이터 초기화</h3></div><div class="panel-pad"><div class="notice-text">고객·견적·계약·렌탈·파트너·광고링크 데이터를 모두 비우고 기본 설정(최고관리자·기본 상품·동의서 양식)만 남깁니다.</div><div style="margin-top:20px">${btn('운영 데이터 초기화','reset-data','refresh','danger')}</div></div>`;
  return pageHead('설정','운영 기준과 사용자 권한을 관리하세요.','','SYSTEM SETTINGS')+`<div class="settings-layout"><nav class="settings-nav">${tabs.map(([v,t,i])=>`<button class="${settingsTab===v?'active':''}" data-action="settings-tab" data-value="${v}">${icon(i)}${t}</button>`).join('')}</nav><section class="panel">${content}</section></div>`;
}

function openDialog(title,body,footer='',cls='',subtitle='',dark=false){
  if(mobileNavOpen) setMobileNav(false);
  if(!restoreFocus) restoreFocus = document.activeElement;
  
  const overlayEl = $('#overlay');
  const existingOverlay = overlayEl?.querySelector('.overlay');
  const existingDialog = existingOverlay?.querySelector('.dialog');

  if (existingDialog) {
    // Already open! Update in-place to avoid re-triggering slide-in animation or resetting scroll
    existingDialog.className = `dialog ${cls}`.trim();
    existingDialog.setAttribute('aria-label', title.replace(/<[^>]*>/g,''));
    
    const head = existingDialog.querySelector('.dialog-head');
    if (head) {
      head.className = `dialog-head ${dark ? 'dark' : ''}`.trim();
      head.innerHTML = `<div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="close" data-action="close" aria-label="닫기">${icon('close')}</button>`;
    }
    
    const prevBody = existingDialog.querySelector('.dialog-body');
    const prevScroll = prevBody ? prevBody.scrollTop : 0;
    
    // Remove all siblings after head
    while (head && head.nextSibling) {
      head.nextSibling.remove();
    }
    
    // Insert new body and footer
    const temp = document.createElement('div');
    temp.innerHTML = `${body}${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}`;
    while (temp.firstChild) {
      existingDialog.appendChild(temp.firstChild);
    }
    
    const newBody = existingDialog.querySelector('.dialog-body');
    if (newBody && prevScroll) {
      newBody.scrollTop = prevScroll;
    }
    document.body.style.overflow = 'hidden';
    document.body.classList.toggle('fp-print-mode', String(cls).includes('form-preview-dialog'));
    return;
  }
  
  overlayEl.innerHTML = `<div class="overlay"><section class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]*>/g,''))}"><header class="dialog-head ${dark?'dark':''}"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="close" data-action="close" aria-label="닫기">${icon('close')}</button></header>${body}${footer?`<footer class="dialog-footer">${footer}</footer>`:''}</section></div>`;
  document.body.style.overflow = 'hidden';
  document.body.classList.toggle('fp-print-mode', String(cls).includes('form-preview-dialog'));
  setTimeout(() => $('.dialog .close')?.focus(), 20);
}
function closeDialog(){ 
  $('#overlay').innerHTML = '';
  document.body.style.overflow = '';
  document.body.classList.remove('fp-print-mode');
  detailId = null;
  detailTab = 'notes';
  restoreFocus?.isConnected && restoreFocus.focus();
  restoreFocus = null;
}
function formDialog(title,fields,submit,subtitle='',extra=''){openDialog(title,`<form id="edit-form" data-submit="${submit}" ${extra}><div class="dialog-body">${fields}</div><div class="dialog-footer">${btn('취소','close')}<button type="submit" class="btn primary">저장하기</button></div></form>`,'','',subtitle)}
function linkRow(label,url,action,id,emptyLabel=label+' 등록'){return url?`<div style="display:flex;gap:6px"><a class="btn soft sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="flex:1">${icon('external')}${label} 바로가기</a><button class="btn sm" type="button" data-action="${action}" data-id="${id}" title="${label} 링크 수정" aria-label="${label} 링크 수정" style="padding:6px 9px">${icon('edit')}</button></div>`:btn(emptyLabel,action,'link','sm block',`data-id="${id}"`)}
function linkDialog(title,label,url,submit,id,customerName){const cObj=accessibleC(id);const isQuoteLink=(label==='가견적'||label==='최종견적');openDialog(title,`<form id="edit-form" data-submit="${submit}" data-id="${id}"><div class="dialog-body">${field(label+' URL','url',url||'','text')}<p class="field-hint">이동할 ${label} 페이지 주소(URL)를 입력해 주세요. CRM에서 ${label}을 발행하면 전용 모바일 링크가 자동 연결됩니다.</p><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">${isQuoteLink&&cObj?.quote?`<button type="button" class="btn soft sm" data-action="preview" data-id="${id}" data-type="${label}">${icon('eye')}${label} 모바일 화면 미리보기</button>`:''}${url?`<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('external')}새 탭에서 열기</a>`:''}</div></div><div class="dialog-footer"><button type="button" class="btn" data-action="customer" data-id="${id}">취소</button><button type="submit" class="btn primary">저장하기</button></div></form>`,'','',`${esc(customerName)} · ${label}`)}
const _customerDetailInFlight = new Set();

function getCustomerNoteLogs(c) {
  if (!c) return [];
  if (Array.isArray(db.notes[c.id])) return db.notes[c.id];
  if (Array.isArray(c.notes)) return c.notes;
  return [];
}

function getShownCustomerLogs(c, tab) {
  const logs = getCustomerNoteLogs(c);
  if (tab === 'feedback') {
    const fbs = logs.filter(n => n.type === 'feedback' && String(n.text || '').trim());
    if (fbs.length) return fbs;
    if (c.feedback && String(c.feedback).trim() && c.feedback !== '등록된 피드백이 없습니다.') {
      return [{ date: c.feedbackMeta?.date || '', by: c.feedbackMeta?.by || '영업지원팀', text: c.feedback, type: 'feedback' }];
    }
    return [];
  }
  const notes = logs.filter(n => n.type !== 'feedback' && String(n.text || '').trim());
  if (notes.length) return notes;
  if (c.note && String(c.note).trim()) {
    return [{
      date: c.noteMeta?.date || formatShortKstClient(c.createdAt) || (c.date ? c.date.slice(5).replace('-', '.') : ''),
      by: c.noteMeta?.by || (c.owner === '미배정' ? '시스템' : c.owner),
      text: c.note,
      type: 'notes'
    }];
  }
  return [];
}

function renderCustomerNotesHtml(c, tab) {
  const shown = getShownCustomerLogs(c, tab);
  return shown.map(n => {
    const author = n.by || '관리자';
    return `<div class="note"><div class="avatar">${esc(author.slice(-2))}</div><div class="note-body"><div class="note-meta"><b>${esc(author)}</b><span>${esc(n.date || '')}</span>${n.important ? badge('중요', 'orange') : ''}</div><p>${esc(n.text)}</p></div></div>`;
  }).join('') || `<div class="empty">${tab === 'feedback' ? '등록된 피드백이 없습니다.' : '등록된 상담 이력이 없습니다.'}</div>`;
}

function renderCustomerHistoryHtml(c, displayCustCh) {
  const createdKst = formatShortKstClient(c.createdAt) || (c.date ? c.date.slice(5).replace('-', '.') : '');
  const entries = (Array.isArray(db.history[c.id]) && db.history[c.id].length)
    ? db.history[c.id]
    : [
        { date: createdKst, text: '고객 접수 · ' + displayCustCh + (c.adCampaign ? (' (' + c.adCampaign + ')') : ''), by: '시스템' },
        { date: createdKst, text: '담당자 ' + c.owner, by: '운영관리자' }
      ];
  return `<h4>${icon('history')}변경 히스토리</h4>` + entries.map(h => `<div class="history-item"><time>${esc(h.date || '')}</time><p>${esc(h.text || '')}</p><small>${esc(h.by || '관리자')}</small></div>`).join('');
}

async function loadCustomerDetail(id, options = {}) {
  const cid = Number(id);
  if (!cid || !authToken) return;
  if (_customerDetailInFlight.has(cid) && !options.force) return;
  _customerDetailInFlight.add(cid);
  try {
    const res = await apiFetch('/api/customers/' + cid);
    if (!res.ok) return;
    const data = await res.json();
    const combined = [
      ...(Array.isArray(data.notes) ? data.notes.map(n => ({ ...n, type: 'notes' })) : []),
      ...(Array.isArray(data.feedback) ? data.feedback.map(n => ({ ...n, type: 'feedback' })) : [])
    ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    db.notes[cid] = combined;
    if (Array.isArray(data.history)) {
      db.history[cid] = data.history.map(h => ({
        ...h,
        text: h.action && h.text && !String(h.text).startsWith(h.action)
          ? (h.action + ' · ' + h.text)
          : (h.text || h.action || '')
      }));
    }
    const target = findC(cid);
    if (target) {
      const latestNote = combined.find(n => n.type !== 'feedback' && String(n.text || '').trim());
      const latestFb = combined.find(n => n.type === 'feedback' && String(n.text || '').trim());
      if (data.customer) {
        if (typeof data.customer.note === 'string') target.note = data.customer.note;
        if (data.customer.noteMeta !== undefined) target.noteMeta = data.customer.noteMeta;
        if (typeof data.customer.feedback === 'string') target.feedback = data.customer.feedback;
        if (data.customer.feedbackMeta !== undefined) target.feedbackMeta = data.customer.feedbackMeta;
      }
      if (latestNote) {
        target.note = latestNote.text;
        target.noteMeta = { date: latestNote.date, by: latestNote.by };
      }
      if (latestFb) {
        target.feedback = latestFb.text;
        target.feedbackMeta = { date: latestFb.date, by: latestFb.by };
      }
      target.notes = combined;
    }
    save();
    const openWrap = $('.overlay .customer-detail');
    if (openWrap && detailId === cid) {
      const cNow = accessibleC(cid) || findC(cid);
      if (cNow && ['notes', 'feedback'].includes(detailTab)) {
        const contentEl = openWrap.querySelector('.detail-content');
        if (contentEl) contentEl.innerHTML = renderCustomerNotesHtml(cNow, detailTab);
      }
      const histEl = openWrap.querySelector('.detail-history');
      if (cNow && histEl) {
        histEl.innerHTML = renderCustomerHistoryHtml(cNow, getCustomerChannel(cNow));
      }
    }
    const rowsEl = $('#customer-rows');
    if (page === 'customers' && rowsEl) {
      rowsEl.innerHTML = customerRows();
    }
  } catch (err) {
    console.warn('loadCustomerDetail warning:', err);
  } finally {
    _customerDetailInFlight.delete(cid);
  }
}

function openCustomer(id,tab='notes'){const c=accessibleC(id);if(!c)return;const wasAlreadyOpen=Boolean($('.overlay .customer-detail')&&detailId===c.id);detailId=c.id;detailTab=tab;const custContracts=db.contracts.filter(k=>k.cid===c.id);let content='';
if(['notes','feedback'].includes(tab))content=renderCustomerNotesHtml(c,tab);
if(tab==='quotes')content=`
    <div class="quote-stage-grid">
      <div class="quote-stage-card is-rough">
        <div class="qs-head"><b>가견적 (실측 전 예상안)</b>${c.roughQuote?badge('v'+c.roughQuote.version+' 발행완료','orange'):badge('미발행','gray')}</div>
        <div class="qs-price ${c.roughQuote?'':'empty-price'}">${c.roughQuote?won(c.roughQuote.totalPrice):'아직 발행된 가견적이 없습니다'}</div>
        <div class="qs-meta">${c.roughQuote?('발행일 '+esc(c.roughQuote.date)+' · '+(c.roughQuote.viewed?'고객 열람완료':'미열람')):(c.quote?'현재 견적 기준 가견적 화면 예시 미리보기 가능':'원본 엑셀을 등록해 가견적을 발행하세요')}</div>
        <div class="qs-actions">
          ${c.quote?btn(c.roughQuote?'가견적 미리보기':'가견적 예시보기','preview','eye','sm soft',`data-id="${id}" data-type="가견적"`):''}
          ${c.roughQuote?btn('가견적 발송','send-quote','send','sm primary',`data-id="${id}" data-type="가견적"`):''}
          ${canManageQuotes()?btn(c.roughQuote?'가견적 재작성':'가견적 작성','new-quote','plus','sm',`data-id="${id}" data-type="가견적"`):''}
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
          ${canManageQuotes()?btn(c.finalQuote?'최종견적 수정':'최종견적 작성','new-quote','plus','sm',`data-id="${id}" data-type="최종견적"`):''}
          ${btn('링크','final-quote-link','link','sm',`data-id="${id}"`)}
        </div>
      </div>
    </div>
    <div class="actions" style="margin-bottom:14px">
      ${canManageQuotes()?btn('새 견적서 작성','new-quote','plus','primary sm',`data-id="${id}"`):btn('본사 견적 요청','request-quote','plus','primary sm',`data-id="${id}"`)}
      ${c.quote?btn('문자·카톡 발송창 열기','send-quote','send','sm soft',`data-id="${id}"`)+btn('대표 링크 복사','copy-quote','copy','sm',`data-id="${id}"`):''}
    </div>
    ${(c.publishedQuotes&&c.publishedQuotes.length)?`<h4 style="margin:8px 0 10px;font-size:12px">발행 견적 버전 히스토리 (${c.publishedQuotes.length}건)</h4>`+c.publishedQuotes.map(pq=>`<div class="file-card" style="flex-wrap:wrap">${icon('file')}<div style="flex:1;min-width:160px"><b>[v${pq.version} · ${esc(pq.quoteType)}] ${esc(pq.title)}</b><small>${won(pq.totalPrice)} · 발행일 ${esc(pq.date)} · ${pq.viewed?'고객 열람완료':'미열람'}</small></div><div class="actions">${btn('미리보기','preview','eye','sm soft',`data-id="${id}" data-type="${esc(pq.quoteType)}" data-quote-id="${pq.id}"`)}${btn('발송','send-quote','send','sm',`data-id="${id}" data-type="${esc(pq.quoteType)}"`)}</div></div>`).join(''):(c.quote?'':'<div class="notice-text">아직 발행된 견적이 없습니다. 원본 엑셀을 등록해 가견적 또는 최종견적을 작성하세요.</div>')}
  `;
if(tab==='contract')content=`${custContracts.map(k=>{
  const isRental = k.type === '렌탈';
  const rApp = (k.rentalAppId ? db.applications.find(a => a.id === k.rentalAppId) : null) || db.applications.find(a => a.id === k.id || Number(a.cid) === Number(k.cid));
  const months = k.rentalPeriodMonths || rApp?.months || 60;
  const monthly = k.rentalMonthlyFee || rApp?.monthly || (k.amount ? Math.round((k.amount * 1.2) / months / 1000) * 1000 : 0);
  const total = k.rentalTotalFee || rApp?.total || (monthly * months) || k.amount;
  const rAppId = k.rentalAppId || rApp?.id || (isRental && String(k.id || '').startsWith('R-') ? k.id : null);
  const rawRentalSt = k.rentalStatus || rApp?.status || '접수완료';
  const rentalStText = RENTAL_STATUS_MAP[rawRentalSt] || rawRentalSt;

  if (isRental) {
    return `<div class="file-card" style="border-left:3px solid #6366f1">
      ${icon('contract')}
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${newLabelHtml(k)}<b>${esc(k.id)}</b>
          ${badge('렌탈', 'purple')}
          ${badge(k.status)}
        </div>
        <div style="margin-top:4px;font-size:13px;color:#3730a3;font-weight:700">
          월 ${won(monthly)} <small style="color:#6366f1;font-weight:500">(${months}개월 분납 · 총 ${won(total)})</small>
        </div>
        <small style="color:#64748b">렌탈 심사: <b>${esc(rentalStText)}</b>${k.createdAtText ? ' · ' + esc(k.createdAtText) : ''}</small>
      </div>
      <div class="actions">
        ${btn('계약보기', 'contract', '', 'sm soft', `data-id="${k.id}"`)}
        ${rAppId ? btn('렌탈심사', 'application', 'file', 'sm purple-btn', `data-id="${rAppId}"`) : ''}
      </div>
    </div>`;
  }

  return `<div class="file-card">
    ${icon('contract')}
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${newLabelHtml(k)}<b>${esc(k.id)}</b>
        ${badge(k.type)}
      </div>
      <small>${won(k.amount)} · 수납 ${won(k.paid)}${k.createdAtText ? ' · ' + esc(k.createdAtText) : ''}</small>
    </div>
    ${badge(k.status)}
    ${btn('보기', 'contract', '', 'sm soft', `data-id="${k.id}"`)}
  </div>`;
}).join('')||'<div class="empty">등록된 계약이 없습니다.</div>'}<div class="actions" style="margin-top:10px">${btn('계약 등록','new-contract','contract','primary sm',`data-id="${id}" data-from="customer-modal"`)}${custContracts.length?btn('계약관리에서 보기','go-customer-contracts','external','sm soft',`data-id="${id}"`):''}</div>`;
if(tab==='files')content=`<div class="notice-text">공사 현장 사진·도면·내관도 링크를 한곳에서 관리합니다.</div><div class="file-card" style="margin-top:15px">${icon('link')}<div style="flex:1"><b>내관도 링크</b><small>${c.drawing?esc(c.drawing):'등록된 내관도 링크가 없습니다.'}</small></div><div class="actions">${c.drawing?`<a class="btn sm soft" href="${esc(c.drawing)}" target="_blank" rel="noopener noreferrer">${icon('external')}바로가기</a>`:''}${btn('관리','drawing','edit','sm',`data-id="${id}"`)}</div></div><div class="field"><label>공사 희망사항</label><textarea id="case-description">${esc(c.description||c.note)}</textarea></div>${btn('공사정보 저장','save-description','check','sm soft',`data-id="${id}"`)}`;

const existingDetail = $('.overlay .customer-detail');
if (existingDetail && detailId === c.id) {
  detailTab = tab;
  existingDetail.dataset.detailTab = tab;
  existingDetail.querySelectorAll('.desktop-detail-tabs .tab, .mobile-detail-tabs .tab').forEach(b => {
    b.classList.toggle('active', b.dataset.value === tab);
  });
  const manageToggleBtn = existingDetail.querySelector('[data-action="detail-tab"][data-value="manage"], [data-action="detail-tab"][data-value="notes"]');
  if (manageToggleBtn) {
    manageToggleBtn.dataset.value = tab === 'manage' ? 'notes' : 'manage';
    manageToggleBtn.textContent = tab === 'manage' ? '상담이력 보기' : '상태·링크 변경';
  }
  const contentEl = existingDetail.querySelector('.detail-content');
  if (contentEl) contentEl.innerHTML = content;
  const histEl = existingDetail.querySelector('.detail-history');
  if (histEl) histEl.innerHTML = renderCustomerHistoryHtml(c, getCustomerChannel(c));
  const formEl = existingDetail.querySelector('.note-compose');
  if (['notes', 'feedback'].includes(tab)) {
    const formHtml = `<form class="note-compose" data-submit="note" data-id="${id}" data-type="${tab}"><div class="compose-top"><span>작성자 ${esc(getActiveUser().name)}</span><label><input type="checkbox" name="important"> 중요</label></div><div class="compose-box"><textarea name="note" placeholder="${tab==='notes'?'상담 내용과 다음 진행사항을 기록하세요.':'영업지원팀 피드백을 기록하세요.'}" aria-label="상담 내용" required></textarea><button type="submit" class="btn primary" aria-label="기록 등록">${icon('send')}</button></div></form>`;
    if (formEl) formEl.outerHTML = formHtml;
    else contentEl.insertAdjacentHTML('afterend', formHtml);
  } else if (formEl) {
    formEl.remove();
  }
  return;
}

const quoteShortcutBtn = canManageQuotes()
  ? btn('견적등록', 'new-quote', 'plus', 'soft sm', `data-id="${id}"`)
  : btn('본사 견적 요청', 'request-quote', 'plus', 'soft sm', `data-id="${id}"`);
const displayCustCh = getCustomerChannel(c);
const chDatalist = `<datalist id="ad-channel-presets">${AD_CHANNEL_PRESETS.map(p => `<option value="${esc(p)}"></option>`).join('')}<option value="직접등록"></option></datalist>`;
const body=`<div class="customer-detail" data-detail-tab="${tab}"><div class="mobile-cust-strip">${badge(c.status)}${c.label!=='일반'?badge(c.label,c.label==='긴급'?'red':c.label==='완료'?'green':'orange'):''}<span>담당 ${esc(c.owner)}</span>${c.measure?`<span>· 실측 ${esc(c.measure.slice(5))}</span>`:''}<div style="margin-left:auto;display:flex;gap:6px;align-items:center">${canManageQuotes()?`<button type="button" class="link-chip" style="background:#eef4ff;color:#2753a8;border-color:#c6d8f8" data-action="new-quote" data-id="${id}">+ 견적등록</button>`:''}<button type="button" class="link-chip" style="background:#17243c;color:#fff;border-color:#17243c" data-action="new-contract" data-id="${id}" data-from="customer-modal">+ 계약등록</button><button type="button" class="link-chip" data-action="detail-tab" data-value="${tab==='manage'?'notes':'manage'}" data-id="${id}">${tab==='manage'?'상담이력 보기':'상태·링크 변경'}</button></div></div><div class="tabs mobile-detail-tabs">${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료'],['manage','상태·링크'],['history','히스토리']].map(([v,l])=>`<button class="tab ${tab===v?'active':''}" data-action="detail-tab" data-value="${v}" data-id="${id}">${l}</button>`).join('')}</div><aside class="detail-side"><div class="detail-box"><h4>${icon('settings')}상태 및 담당자</h4>${selectField('진행구분','detail-status',stages,c.status)}${selectField('진행라벨','detail-label',db.labels.map(l=>l.name),c.label)}${selectField('담당 상담사','detail-owner',getHqOwnerOptions(c.owner),c.owner)}<div class="field"><label for="detail-source" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">유입경로 (채널) <span class="ch-pill ${channelTone(displayCustCh)}">${esc(displayCustCh)}</span></label><input class="input" id="detail-source" name="detail-source" list="ad-channel-presets" value="${esc(displayCustCh)}">${chDatalist}</div>${field('유입 광고캠페인 / 링크명','detail-ad-campaign',c.adCampaign||'')}</div><div class="detail-box"><h4>${icon('calendar')}일정 관리</h4>${field('실측 예정일','detail-measure',c.measure,'date')}${field('시공 예정일','detail-build',c.build,'date')}</div><div class="detail-box links"><h4>${icon('link')}견적 · 내관도</h4><div style="display:flex;flex-direction:column;gap:8px">${canManageQuotes()?btn('견적등록 바로가기','new-quote','plus','primary sm block',`data-id="${id}"`):btn('본사 견적 요청','request-quote','plus','primary sm block',`data-id="${id}"`)}${quoteSideRow('가견적','가견적',c.roughQuote,c.roughQuoteUrl,'rough-quote-link',id,Boolean(c.quote))}${quoteSideRow('최종견적','최종견적',c.finalQuote,c.finalQuoteUrl,'final-quote-link',id,Boolean(c.quote))}${linkRow('내관도',c.drawing,'drawing',id,'내관도 관리')}</div></div><div class="cust-side-actions">${btn('변경사항 저장','save-customer','check','primary block',`data-id="${id}"`)}${btn('계약 등록','new-contract','contract','soft block',`data-id="${id}" data-from="customer-modal"`)}</div></aside><section class="detail-center"><div class="tabs desktop-detail-tabs">${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료']].map(([v,l])=>`<button class="tab ${tab===v?'active':''}" data-action="detail-tab" data-value="${v}" data-id="${id}">${l}</button>`).join('')}</div><div class="detail-content">${content}</div>${['notes','feedback'].includes(tab)?`<form class="note-compose" data-submit="note" data-id="${id}" data-type="${tab}"><div class="compose-top"><span>작성자 ${esc(getActiveUser().name)}</span><label><input type="checkbox" name="important"> 중요</label></div><div class="compose-box"><textarea name="note" placeholder="${tab==='notes'?'상담 내용과 다음 진행사항을 기록하세요.':'영업지원팀 피드백을 기록하세요.'}" aria-label="상담 내용" required></textarea><button type="submit" class="btn primary" aria-label="기록 등록">${icon('send')}</button></div></form>`:''}</section><aside class="detail-history">${renderCustomerHistoryHtml(c,displayCustCh)}</aside></div>`;
const detailFooter = `<small>고객 상태: ${badge(c.status)}${custContracts.length ? ` · 계약 <b>${custContracts.length}건</b>` : ''} · ${esc(c.product)} · ${esc(c.partner)}</small>${custContracts.length ? btn('계약관리 이동', 'go-customer-contracts', 'external', 'sm soft', `data-id="${id}"`) : ''}${quoteShortcutBtn}${c.quote ? btn('모바일 견적 미리보기', 'preview', 'eye', 'sm soft', `data-id="${id}"`) : ''}${btn('계약 등록', 'new-contract', 'contract', 'sm primary', `data-id="${id}" data-from="customer-modal"`)}${btn('닫기', 'close', '', 'sm')}`;
openDialog(`${esc(c.name)} <span style="font-size:11px;font-weight:400;color:#91a6c9;margin-left:8px">No. ${c.id}</span>`,body,detailFooter,'wide',`${esc(c.phone)}　｜　${esc(c.address)}`,true);detailId=c.id;detailTab=tab;
if (!wasAlreadyOpen) loadCustomerDetail(c.id);
}
let _daumPostcodePromise = null;
function loadDaumPostcodeScript() {
  if (window.daum && window.daum.Postcode) return Promise.resolve();
  if (_daumPostcodePromise) return _daumPostcodePromise;
  _daumPostcodePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="postcode.v2.js"]');
    if (existing) {
      const waitCheck = setInterval(() => {
        if (window.daum && window.daum.Postcode) {
          clearInterval(waitCheck);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(waitCheck);
        if (window.daum && window.daum.Postcode) resolve();
        else reject(new Error('주소 검색 스크립트를 불러오지 못했습니다.'));
      }, 6000);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('주소 검색 스크립트 로드에 실패했습니다.'));
    document.head.appendChild(s);
  });
  return _daumPostcodePromise;
}

async function openCustomerAddressSearch() {
  const wrap = document.getElementById('cust-addr-search-wrap');
  const body = document.getElementById('cust-addr-search-body');
  if (!wrap || !body) return;
  wrap.hidden = false;
  body.innerHTML = '<div style="padding:24px;text-align:center;font-size:13px;color:#64748b">주소 검색창을 불러오는 중입니다...</div>';
  try {
    await loadDaumPostcodeScript();
    body.innerHTML = '';
    new window.daum.Postcode({
      width: '100%',
      height: '100%',
      oncomplete: (data) => {
        const zone = data.zonecode ? `[${data.zonecode}] ` : '';
        const road = data.roadAddress || '';
        const jibun = data.jibunAddress || data.autoJibunAddress || '';
        const extraParts = [];
        if (data.bname && /[동|로|가]$/.test(data.bname)) extraParts.push(data.bname);
        if (data.buildingName) extraParts.push(data.buildingName);
        const extra = extraParts.length ? ` (${extraParts.join(', ')})` : '';
        const roadFull = `${zone}${road}${extra}`.trim();
        const jibunFull = `${zone}${jibun}${extra}`.trim();
        const primary = data.userSelectedType === 'J' ? (jibunFull || roadFull) : (roadFull || jibunFull);
        const allCombined = (road && jibun && road !== jibun)
          ? `${zone}${road}${extra} (지번: ${jibun})`
          : primary;

        const baseInput = document.getElementById('cust-address-base');
        const detailInput = document.getElementById('cust-address-detail');
        const infoBox = document.getElementById('cust-addr-extra-info');
        if (baseInput) baseInput.value = allCombined;
        if (infoBox) {
          infoBox.hidden = false;
          infoBox.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;font-size:11.5px;color:#475569">
            <span>검색 결과 반영됨:</span>
            ${allCombined ? `<button type="button" class="link-chip" data-action="use-cust-addr-variant" data-value="${esc(allCombined)}">전체(도로명+지번)</button>` : ''}
            ${roadFull ? `<button type="button" class="link-chip" data-action="use-cust-addr-variant" data-value="${esc(roadFull)}">도로명만</button>` : ''}
            ${jibunFull ? `<button type="button" class="link-chip" data-action="use-cust-addr-variant" data-value="${esc(jibunFull)}">지번만</button>` : ''}
          </div>`;
        }
        wrap.hidden = true;
        if (detailInput) detailInput.focus();
      }
    }).embed(body);
  } catch (err) {
    wrap.hidden = true;
    toast((err && err.message) || '주소 검색을 열 수 없습니다. 직접 입력해 주세요.');
  }
}

function openNewCustomer(){const activeU=getActiveUser();const isP=isPartnerUser(activeU);formDialog('새 고객 등록',`<div class="notice-text" style="margin-bottom:20px">새 고객 및 공사건을 등록합니다. 광고채널이 있다면 함께 지정해 주세요.</div><div class="field-grid">${field('고객명','name','','text',true)}<div class="field"><label for="phone">연락처 <span>*</span></label><input class="input" id="phone" name="phone" type="tel" value="" placeholder="예: 010-1234-5678" required></div>${selectField('상품군','product',['창호','주방','욕실'],'창호')}${selectField('담당 상담사','owner',getHqOwnerOptions(),'미배정')}${selectField('소속 파트너','partner',!isP?['직영',...db.partners.map(p=>p.name)]:[activeU.org],!isP?'직영':activeU.org)}<div class="field"><label for="source">유입채널</label><input class="input" id="source" name="source" list="new-cust-ch-list" value="직접등록"><datalist id="new-cust-ch-list">${AD_CHANNEL_PRESETS.map(p=>`<option value="${esc(p)}"></option>`).join('')}<option value="직접등록"></option></datalist></div></div>${field('광고 캠페인 / 상세경로 (선택)','adCampaign','')}<div class="field"><label for="cust-address-base">공사 주소 (검색) <span>*</span></label><div style="display:flex;gap:8px;align-items:center"><input class="input" id="cust-address-base" name="addressBase" type="text" value="" placeholder="주소 검색 버튼을 눌러 주소를 검색하거나 직접 입력하세요." required style="flex:1"><button type="button" class="btn secondary sm" data-action="search-cust-address" style="white-space:nowrap;flex-shrink:0">${icon('search','sm')} 주소 검색</button></div><div id="cust-addr-extra-info" hidden></div><div id="cust-addr-search-wrap" hidden style="margin-top:8px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff"><div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#334155"><span>주소 검색 (전국 도로명·지번·건물명)</span><button type="button" class="btn sm soft" data-action="close-cust-addr-search">닫기</button></div><div id="cust-addr-search-body" style="width:100%;height:360px"></div></div></div><div class="field"><label for="cust-address-detail">추가 상세 주소 (동·호수 등)</label><input class="input" id="cust-address-detail" name="addressDetail" type="text" value="" placeholder="예: 101동 1202호, 단독주택 2층 등"></div><div class="field"><label>공사 희망사항</label><textarea name="note" placeholder="공사 범위와 희망 일정을 입력하세요."></textarea></div>`,'customer','고객과 공사건이 함께 생성됩니다.')}

let custPickerQuery = '';
let custPickerFilter = 'all';
let custPickerPresetType = '';

function renderCustPickerRows() {
  const q = custPickerQuery.trim().toLowerCase();
  const list = visibleCustomers().filter(c => {
    if (custPickerFilter === 'ready' && c.status !== '가견적요청' && c.quote > 0) return false;
    if (custPickerFilter === 'unquoted' && c.quote > 0) return false;
    if (custPickerFilter === 'quoted' && !(c.quote > 0)) return false;
    if (!q) return true;
    return [c.name, c.phone, c.address, c.product, c.partner, c.owner, String(c.id)]
      .some(v => String(v || '').toLowerCase().includes(q));
  });
  if (!list.length) {
    return `<div class="empty" style="padding:36px 16px">${icon('search')}<strong>검색 조건에 맞는 고객이 없습니다.</strong>다른 고객명·연락처·주소로 검색하거나 새 고객을 먼저 등록해 주세요.</div>`;
  }
  return list.map(c => `
    <button type="button" class="cust-picker-item" data-action="pick-quote-customer" data-id="${c.id}" data-type="${esc(custPickerPresetType)}">
      <div class="cust-picker-avatar">${esc((c.name || '고객').slice(-2))}</div>
      <div class="cust-picker-main">
        <div class="cust-picker-top">
          <b>${esc(c.name)}</b>
          <span class="row-code">No.${c.id}</span>
          ${badge(c.product, c.product === '주방' ? 'purple' : c.product === '욕실' ? 'green' : '')}
          ${badge(c.status)}
        </div>
        <div class="cust-picker-sub">${esc(c.phone)} · ${esc(c.address)}</div>
        <div class="cust-picker-meta">
          <span>파트너: ${esc(c.partner)}</span>
          <span>담당: ${esc(c.owner)}</span>
          <span>${c.quote > 0 ? ('기존 견적 ' + won(c.quote)) : '견적 미발행'}</span>
        </div>
      </div>
      <span class="btn sm primary cust-picker-cta">${icon('arrow')}선택</span>
    </button>
  `).join('');
}

function openQuoteCustomerPicker(presetType = '') {
  if (!canManageQuotes()) {
    toast('견적 작성 권한이 없습니다.');
    return;
  }
  custPickerQuery = '';
  custPickerFilter = 'all';
  custPickerPresetType = presetType || '';
  const allCount = visibleCustomers().length;
  const unquotedCount = visibleCustomers().filter(c => !(c.quote > 0)).length;
  const quotedCount = visibleCustomers().filter(c => c.quote > 0).length;

  const body = `<div class="dialog-body">
    <div class="steps" style="margin:-20px -24px 16px">
      <span class="active"><i>1</i>고객 선택</span>
      <span><i>2</i>엑셀 등록 · 판매가 설정</span>
      <span><i>3</i>모바일 미리보기 · 발행</span>
    </div>
    <div class="cust-picker-search-wrap">
      <div class="search-field" style="flex:1">
        ${icon('search')}
        <input class="input" id="quote-cust-picker-search" type="search" placeholder="고객명, 휴대폰 번호, 현장 주소, 고객번호(No.) 검색..." autocomplete="off">
      </div>
      ${btn('새 고객 등록', 'new-customer', 'plus', 'soft sm')}
    </div>
    <div class="cust-picker-chips" id="quote-cust-picker-chips">
      <button type="button" class="tpl-chip active" data-action="cust-picker-filter" data-value="all">전체 고객 (${allCount})</button>
      <button type="button" class="tpl-chip" data-action="cust-picker-filter" data-value="unquoted">견적 미발행 (${unquotedCount})</button>
      <button type="button" class="tpl-chip" data-action="cust-picker-filter" data-value="quoted">발행 이력 있음 (${quotedCount})</button>
    </div>
    <div class="cust-picker-list" id="quote-cust-picker-list">${renderCustPickerRows()}</div>
  </div>`;

  openDialog(
    '고객 견적서 만들기 · 고객 선택',
    body,
    `<small>견적을 작성할 고객(현장)을 먼저 선택해 주세요.</small>${btn('닫기', 'close')}`,
    'cust-picker-dialog',
    '견적서를 연결할 고객을 검색해 선택하면 견적 편집 화면이 열립니다.'
  );
  setTimeout(() => $('#quote-cust-picker-search')?.focus(), 40);
}

function openEditor(id, presetType = '') {
  if (!canManageQuotes()) {
    if (id) {
      audit(id, '견적 작성 요청');
      toast('견적 담당자에게 견적 요청이 기록되었습니다.');
    }
    return;
  }
  if (!id) {
    openQuoteCustomerPicker(presetType);
    return;
  }
  const c = accessibleC(id);
  if (!c) {
    openQuoteCustomerPicker(presetType);
    return;
  }
  const initType = presetType || (c.roughQuote && !c.finalQuote ? '최종견적' : '가견적');
  editor = {
    cid: c.id,
    margin: 100,
    marginScope: 'material', // 기본값: 자재만 적용 (기타견적 제외)
    discount: 0,
    type: initType,
    source: '',
    title: initType === '최종견적' ? `${c.product} 방문실측 확정 견적서` : `${c.product} 교체 견적서`,
    memo: '',
    meta: null,
    excelGrandTotal: null,
    excelSubtotal: null,
    showLivePreview: false,
    items: []
  };
  renderEditor();
}

function editorTotal() {
  if (!editor) {
    return { cost: 0, supplyCost: 0, materialSubtotal: 0, extraSubtotal: 0, sale: 0, vat: 0, originalPrice: 0, discount: 0, total: 0, profit: 0, netProfitExVat: 0 };
  }
  let rawItemsCostSum = 0;
  let materialSubtotal = 0;
  let extraSubtotal = 0;
  for (const it of (editor.items || [])) {
    const r = calcEditorItemRow(it, editor.margin ?? 100);
    rawItemsCostSum += r.rawCostTotal;
    if (r.isExtra) extraSubtotal += r.saleTotal;
    else materialSubtotal += r.saleTotal;
  }
  const cost = (editor.excelSubtotal !== null && editor.excelSubtotal !== undefined && Number(editor.excelSubtotal) > 0)
    ? Math.round(Number(editor.excelSubtotal))
    : Math.round(rawItemsCostSum);
  const supplyCost = (editor.excelGrandTotal !== null && editor.excelGrandTotal !== undefined && Number(editor.excelGrandTotal) > 0)
    ? Math.round(Number(editor.excelGrandTotal))
    : (cost + Math.round(cost * 0.1));
  const sale = materialSubtotal + extraSubtotal;
  const vat = Math.round(sale * 0.1);
  const originalPrice = sale + vat;
  const discount = Math.min(originalPrice, Math.max(0, parseNum(editor.discount || 0)));
  const total = Math.max(0, originalPrice - discount);
  const profit = total - supplyCost;
  const netProfitExVat = sale - cost;
  return { cost, supplyCost, materialSubtotal, extraSubtotal, sale, vat, originalPrice, discount, total, profit, netProfitExVat };
}

function editorSubtotalsBarHtml(t = editorTotal()) {
  const matCount = (editor?.items || []).filter(it => !isExtraQuoteItem(it)).length;
  const extCount = (editor?.items || []).filter(it => isExtraQuoteItem(it)).length;
  return `<div class="editor-subtotals-chip is-mat">
      <span>자재 총액 (${matCount}건 · 10원절삭 · VAT별도)</span>
      <b>${won(t.materialSubtotal)}</b>
    </div>
    <div class="editor-subtotals-chip is-ext">
      <span>기타견적 (${extCount}건 · D열 기타견적 · VAT별도)</span>
      <b>${won(t.extraSubtotal)}</b>
    </div>
    <div class="editor-subtotals-chip is-sum">
      <span>절삭 공급가 합계 (VAT별도)</span>
      <b>${won(t.sale)}</b>
    </div>`;
}

function editorSummary() {
  const t = editorTotal();
  const profitClass = t.profit >= 0 ? 'is-pos' : 'is-neg';
  const profitSign = t.profit > 0 ? '+' : '';
  return `
    <div class="summary-supply-box">
      <div class="summary-line">
        <span>공급원가 <small>(엑셀 금액총계 · 발주기준)</small></span>
        <b>${won(t.supplyCost)}</b>
      </div>
      <div class="summary-subline">
        <span>원본 공급가액 (VAT별도)</span>
        <span>${won(t.cost)}</span>
      </div>
    </div>
    <div class="summary-line"><span>자재 총액 <small>(절삭·VAT별도)</small></span><b>${won(t.materialSubtotal)}</b></div>
    <div class="summary-line"><span>기타견적 <small>(절삭·VAT별도)</small></span><b>${won(t.extraSubtotal)}</b></div>
    <div class="summary-line"><span>절삭 공급가액 합계</span><b>${won(t.sale)}</b></div>
    <div class="summary-line"><span>부가세 (10%)</span><b>${won(t.vat)}</b></div>
    <div class="summary-line is-highlight"><span>부가세 포함 총액 <small>(절삭 기준)</small></span><b>${won(t.originalPrice)}</b></div>
    ${t.discount > 0 ? `<div class="summary-line is-discount"><span>일시불 특별 할인</span><b>-${won(t.discount)}</b></div>` : ''}
    <div class="summary-total">
      <span style="font-size:11px;color:#8498b6">${t.discount > 0 ? '할인 적용 최종 합계' : '고객 최종 합계금액'}<br><small style="font-weight:400">(VAT 포함)</small></span>
      <b>${won(t.total)}</b>
    </div>
    <div class="summary-profit-box ${profitClass}">
      <div class="summary-profit-header">
        <span class="profit-title">예상 마진금액</span>
        <small class="profit-subtitle">(최종합계 - 공급원가)</small>
      </div>
      <div class="summary-profit-amount">
        <b>${profitSign}${won(t.profit)}</b>
      </div>
      <div class="summary-subline">
        <span>공급원가·마진은 고객 견적서에 절대 노출되지 않습니다.</span>
      </div>
    </div>`;
}

function syncEditorLivePreview() {
  if (!editor || !editor.showLivePreview) return;
  const c = findC(editor.cid);
  if (!c) return;
  const t = editorTotal();
  const draftPayload = buildDraftMobileQuote(c, editor, t);
  sessionStorage.setItem('kcc_draft_quote_preview', JSON.stringify(draftPayload));
  const ifr = $('#editor-live-preview-iframe');
  if (ifr?.contentWindow) {
    ifr.contentWindow.postMessage({ type: 'UPDATE_DRAFT_QUOTE', quote: draftPayload }, '*');
  }
}

function renderItemSpecChips(it) {
  const d = it.detail;
  if (!d) return '';
  const chips = [];
  if (d.seq) chips.push(`<span class="item-chip">No.${d.seq}</span>`);
  if (d.location) chips.push(`<span class="item-chip is-loc">${esc(d.location)}</span>`);
  if (d.is_insulation || d.insulation === '단열') {
    chips.push(`<span class="item-chip is-insulation">★단열</span>`);
  }
  if (d.shape) chips.push(`<span class="item-chip">${esc(d.shape)}${d.open_dir ? `(${esc(d.open_dir)})` : ''}</span>`);
  if (d.w && d.h) chips.push(`<span class="item-chip">${esc(d.w)}×${esc(d.h)}mm</span>`);
  if (d.glass) chips.push(`<span class="item-chip is-glass">${esc(d.glass)}</span>`);
  if (d.wrap) chips.push(`<span class="item-chip">랩핑 ${esc(d.wrap)}</span>`);
  if (d.handle && d.handle !== '해당 없음') chips.push(`<span class="item-chip">${esc(d.handle)}</span>`);
  if (d.mesh && d.mesh !== '미포함') chips.push(`<span class="item-chip">${esc(d.mesh)}</span>`);
  if (d.drain && d.drain !== '미적용') chips.push(`<span class="item-chip">${esc(d.drain)}</span>`);
  if (!chips.length) return '';
  return `<div class="item-spec-chips">${chips.join('')}</div>`;
}

function renderEditor() {
  const c = findC(editor.cid);
  if (!c) return;
  const t = editorTotal();
  if (editor.showLivePreview) {
    const draftPayload = buildDraftMobileQuote(c, editor, t);
    sessionStorage.setItem('kcc_draft_quote_preview', JSON.stringify(draftPayload));
  }
  const liveIframeSrc = '/quote.html?preview=1&embed=1&draft=1&type=' + encodeURIComponent(editor.type || '가견적') + '&view=quote&device=mobile';

  const meta = editor.meta;
  const metaBannerHtml = meta ? `
    <div class="excel-meta-banner">
      <div class="excel-meta-head">
        <b>${icon('check')}KCC 공식 창호 견적서 기본정보 연동됨</b>
        <span>견적일자 ${esc(meta.quote_date || '-')} · 견적번호 ${esc(meta.kcc_quote_no || '-')}</span>
      </div>
      <div class="excel-meta-grid">
        ${meta.recipient ? `<div><small>견적 수신</small><b>${esc(meta.recipient)}</b></div>` : ''}
        ${meta.site_address ? `<div><small>현장명/주소</small><b>${esc(meta.site_address)}</b></div>` : ''}
        ${meta.valid_period ? `<div><small>견적 유효기간</small><b>${esc(meta.valid_period)}</b></div>` : ''}
        ${meta.build_scheduled_date ? `<div><small>시공 예정일</small><b>${esc(meta.build_scheduled_date)}</b></div>` : ''}
        ${meta.construction_included ? `<div><small>시공 포함 여부</small><b>${esc(meta.construction_included)}</b></div>` : ''}
        ${meta.supplier_name ? `<div><small>공급자 / 담당자</small><b>${esc(meta.supplier_name)}${meta.supplier_manager ? ' · ' + esc(meta.supplier_manager) : ''}</b></div>` : ''}
      </div>
      <div class="field" style="margin:8px 0 0">
        <label for="editor-site-notes" style="font-size:11px">3. 기타 현장 특이사항 (모바일 견적서 안내사항 연동)</label>
        <textarea class="input" id="editor-site-notes" rows="2" style="min-height:54px;font-size:12px" placeholder="현장 특이사항 및 안내 문구">${esc(meta.site_notes || '')}</textarea>
      </div>
    </div>` : '';

  const rowsHtml = editor.items.length
    ? editor.items.map((item, i) => {
        const r = calcEditorItemRow(item, editor.margin ?? 100);
        return `<tr class="${r.isExtra ? 'is-extra' : ''}" data-row-index="${i}">
          <td class="qt-cat-cell" data-label="구분">
            <select class="qt-cat-select" data-item="${i}" data-key="category" aria-label="품목 ${i + 1} 소계 구분">
              <option value="window" ${!r.isExtra ? 'selected' : ''}>자재</option>
              <option value="extra" ${r.isExtra ? 'selected' : ''}>기타견적</option>
            </select>
          </td>
          <td class="qt-item-cell">
            <input class="item-name" aria-label="품목 ${i + 1} 이름" data-item="${i}" data-key="name" value="${esc(item.name)}" placeholder="품목명 입력">
            <input class="item-spec-input" aria-label="품목 ${i + 1} 규격·사양" data-item="${i}" data-key="spec" value="${esc(item.spec || '')}" placeholder="규격·유리·세부 사양">
            ${renderItemSpecChips(item)}
          </td>
          <td class="qt-qty-cell" data-label="수량">
            <input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 ${i + 1} 수량" data-item="${i}" data-key="qty" value="${num(r.qty)}">
          </td>
          <td class="qt-price-cell" data-label="원가(VAT별도)">
            <input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 ${i + 1} 원가 금액" data-item="${i}" data-key="cost_total" value="${num(Math.round(r.rawCostTotal))}">
          </td>
          <td class="qt-margin-cell" data-label="마진율(%)">
            <div class="qt-margin-wrap">
              <input class="qt-margin-input" type="number" min="0" max="500" step="1" aria-label="품목 ${i + 1} 마진율" data-item="${i}" data-key="margin_rate" value="${r.mRate}">
              <span>%</span>
            </div>
          </td>
          <td class="money qt-total-cell" data-label="절삭 공급가" id="item-total-${i}">
            <b>${won(r.saleTotal)}</b>
            <small>10원절삭 · VAT별도</small>
          </td>
          <td class="qt-del-cell">
            <button type="button" class="icon-btn sm" data-action="remove-quote-item" data-index="${i}" title="품목 삭제" aria-label="품목 ${i + 1} 삭제">${icon('trash')}</button>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7"><div class="empty" style="padding:28px 14px">${icon('upload')}<strong>원본 KCC 견적서(XLSX/CSV)를 선택하거나 아래 버튼으로 품목을 추가해 주세요.</strong>파일을 선택하면 모든 창호 사양·10원단위 절삭 금액·모바일 견적 미리보기가 즉시 표시됩니다.</div></td></tr>`;

  const body = `
    <div class="steps">
      <span class="done"><i>1</i>고객 선택 완료</span>
      <span class="active"><i>2</i>원본 등록 · 마진/할인 설정</span>
      <span class="${editor.showLivePreview ? 'active' : ''}"><i>3</i>모바일 미리보기 · 발행</span>
    </div>
    <div class="dialog-body">
      <div class="editor-layout ${editor.showLivePreview ? 'with-live-preview' : ''}">
        <section class="editor-main-col">
          <div class="selected-cust-card">
            <div class="selected-cust-info">
              <div class="avatar">${esc((c.name || '고객').slice(-2))}</div>
              <div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <b>${esc(c.name)} 고객</b>
                  <span class="row-code">No.${c.id}</span>
                  ${badge(c.product, c.product === '주방' ? 'purple' : c.product === '욕실' ? 'green' : '')}
                  ${badge(c.status)}
                </div>
                <small>${esc(c.phone)} · ${esc(c.address)}</small>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${c.quote > 0 && !editor.items.length ? btn('기존 발행 품목 불러오기', 'load-existing-quote-items', 'refresh', 'sm soft') : ''}
              ${btn('고객 다시 선택', 'change-quote-customer', 'users', 'sm')}
            </div>
          </div>

          <div class="field-grid" style="margin-top:12px">
            ${selectField('견적 구분', 'quote-type', ['가견적', '최종견적', '비교안'], editor.type)}
            <div class="field">
              <label for="quote-title">견적 제목</label>
              <input class="input" id="quote-title" value="${esc(editor.title)}">
            </div>
          </div>

          <div class="dropzone ${editor.source ? 'is-loaded' : ''}">
            ${icon('upload')}
            <div style="flex:1">
              <b id="upload-name">${editor.source ? esc(editor.source) : 'KCC 공식 창호 견적서(XLSX) 또는 CSV 파일 선택'}</b>
              <small>파일 선택 즉시 기본정보·상세 사양·10원단위 절삭·모바일 견적 미리보기가 자동 실행됩니다.</small>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <label class="btn sm primary" for="quote-file" style="cursor:pointer">${icon('upload')}파일 선택</label>
              <button type="button" class="btn sm ${editor.showLivePreview ? 'soft' : ''}" data-action="toggle-editor-live-preview">${icon('eye')}${editor.showLivePreview ? '미리보기 접기' : '모바일 미리보기'}</button>
            </div>
            <input type="file" id="quote-file" accept=".csv,.xlsx,.xls" hidden>
          </div>

          ${metaBannerHtml}

          <div class="editor-subtotals-bar" id="editor-subtotals-bar">${editorSubtotalsBarHtml(t)}</div>

          <div class="actions" style="justify-content:space-between;margin:12px 0 8px">
            <b style="font-size:12px">상세 견적 품목 (${editor.items.length}건 · 각 항목 부가세 별도 / 10원단위 절삭)</b>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${btn('자재 추가', 'add-item', 'plus', 'sm', 'data-cat="window"')}
              ${btn('기타견적 추가', 'add-item', 'plus', 'sm soft', 'data-cat="extra"')}
              ${btn('CSV 샘플', 'sample-csv', 'download', 'sm')}
            </div>
          </div>

          <div class="table-wrap">
            <table class="quote-table quote-table-v2">
              <thead>
                <tr>
                  <th style="width:86px">소계구분</th>
                  <th>품목명 / 세부 사양</th>
                  <th style="width:68px">수량</th>
                  <th style="width:124px">원가(VAT별도)</th>
                  <th style="width:94px">마진율</th>
                  <th style="width:132px">절삭 공급가</th>
                  <th style="width:42px"></th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          <div class="notice-text" style="margin-top:14px">
            <b>산출 기준 안내:</b> 엑셀의 금액 총계(부가세 포함)는 발주용 <b>공급원가</b>로 정확히 보존되며, 고객용 각 항목 금액은 마진율(기본 100%) 반영 후 <b>10원단위를 절삭</b>해 자재 총액·기타견적 소계 및 부가세 포함 총액으로 깔끔하게 표시됩니다.
          </div>
        </section>

        <aside class="summary-box">
          <h3>마진율 · 일시불 할인 설정</h3>
          <div class="margin-scope-box" style="margin-bottom:12px;background:#f5f8fd;border:1px solid #d9e4f5;border-radius:8px;padding:9px 10px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <label style="font-size:11px;font-weight:700;color:#2c3e55">마진율 적용 대상</label>
              <span class="badge ${editor.marginScope !== 'all' ? 'blue' : 'gray'}" style="font-size:10px">${editor.marginScope !== 'all' ? '자재만' : '전체'}</span>
            </div>
            <div style="display:flex;gap:5px">
              <button type="button" class="btn sm ${editor.marginScope !== 'all' ? 'primary' : 'soft'}" style="flex:1;padding:5px 8px;font-size:11px" data-action="set-margin-scope" data-value="material">자재에만 적용</button>
              <button type="button" class="btn sm ${editor.marginScope === 'all' ? 'primary' : 'soft'}" style="flex:1;padding:5px 8px;font-size:11px" data-action="set-margin-scope" data-value="all">전체 항목 적용</button>
            </div>
            <small style="display:block;margin-top:6px;font-size:10px;color:#6d7f98;line-height:1.35">
              ${editor.marginScope !== 'all' ? '<b>자재(창호)</b>에만 마진율이 적용되며, D열 기타견적(철거·양중 등)은 원가(100%)로 유지됩니다.' : '기타견적을 포함한 <b>전체 항목</b>에 동일한 마진율이 적용됩니다.'}
            </small>
          </div>

          <label class="field-hint" for="margin-input">${editor.marginScope !== 'all' ? '자재 마진율 설정' : '일괄 마진율 설정'} (기본 100% = 원가 1.0배)</label>
          <div class="margin-control">
            <input class="input" type="number" id="margin-input" min="0" max="500" step="1" value="${editor.margin}">
            <span>%</span>
          </div>
          <input id="margin-range" type="range" min="50" max="200" step="1" value="${Math.min(200, Math.max(50, editor.margin))}" aria-label="마진율 슬라이더">
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin:6px 0 12px">
            <button type="button" class="btn sm ${editor.marginScope !== 'all' ? 'soft' : ''}" style="flex:1" data-action="apply-margin-material">자재만 적용</button>
            <button type="button" class="btn sm ${editor.marginScope === 'all' ? 'soft' : ''}" style="flex:1" data-action="apply-margin-all">전체 적용</button>
            <button type="button" class="btn sm" data-action="reset-margin-100">100% 초기화</button>
          </div>
          <div class="field" style="margin:6px 0 14px">
            <label for="discount-input">일시불 할인 금액 설정 (고객 견적서 표시)</label>
            <input class="input money" type="text" id="discount-input" inputmode="numeric" data-money="1" value="${num(editor.discount || 0)}" placeholder="0">
          </div>
          <div id="quote-summary">${editorSummary()}</div>
        </aside>

        ${editor.showLivePreview ? `
        <aside class="editor-live-preview-pane" id="editor-live-preview-pane">
          <div class="editor-live-preview-head">
            <div>
              <b>고객 모바일 견적서 실시간 미리보기</b>
              <small>항목·마진율·일시불 할인 변경 시 즉시 반영됩니다</small>
            </div>
            <button type="button" class="btn sm" data-action="editor-preview" data-type="${esc(editor.type || '가견적')}">${icon('external')}크게 보기</button>
          </div>
          <div class="editor-live-phone-wrap">
            <iframe id="editor-live-preview-iframe" title="모바일 견적서 실시간 미리보기" src="${liveIframeSrc}"></iframe>
          </div>
        </aside>` : ''}
      </div>
    </div>`;

  const footer = `
    <small>${esc(c.name)} 고객 · 공급원가 및 마진 정보는 고객에게 비공개 처리됩니다.</small>
    ${btn('취소', 'close')}
    ${btn(editor.showLivePreview ? '미리보기 접기' : '실시간 미리보기', 'toggle-editor-live-preview', 'eye', 'soft')}
    ${btn('전체화면 미리보기', 'editor-preview', 'external', 'soft', `data-type="${esc(editor.type || '가견적')}"`)}
    ${btn('견적 발행하기', 'publish-quote', 'send', 'primary')}`;

  openDialog(
    '고객 견적서 만들기',
    body,
    footer,
    'quote-dialog' + (editor.showLivePreview ? ' has-live-preview' : ''),
    `${esc(c.name)} (No.${c.id}) · ${esc(c.address)}`
  );
}
function quoteMarkup(c,q=null){const total=q?.total||c.quote,items=q?.items||[{name:c.product+' 맞춤 시공',qty:1},{name:'철거 · 설치 및 마감',qty:1}];return `<div class="phone-preview"><div class="phone-top"><div class="phone-brand" style="display:flex;align-items:center;gap:6px"><img src="${ADMIN_LOGO_URL}" alt="KCC 홈씨씨" style="height:18px;width:auto;vertical-align:middle;display:inline-block;object-fit:contain"><span>· 나의 공사 견적</span></div><h2>${esc(c.name)}님을 위한<br>더 편안한 우리 집.</h2><p>${esc(c.address)}<br>${esc(q?.title||c.product+' 교체 견적')} · ${q?.type||'가견적'}</p></div><div class="phone-body"><div class="phone-price">고객 견적금액<strong>${won(total)}</strong><small>부가세 포함 · 현장 실측 및 공사 조건에 따라 변경 가능</small></div><section class="phone-block"><h4>공사 내용</h4>${items.map(i=>`<div class="summary-line"><span>${esc(i.name)}</span><b>${i.qty}식</b></div>`).join('')}</section><section class="phone-block"><h4>원하시는 방법으로 진행하세요.</h4><div class="phone-actions">${btn('상담 요청','mobile-consult','phone','',`data-id="${c.id}"`)}${btn('실측 신청','schedule','calendar','soft',`data-id="${c.id}"`)}</div><div class="divider" style="margin:15px 0"></div><div class="summary-line"><span>렌탈 신청</span><b>조건 확인 후 상담</b></div><p class="field-hint">월 납부금과 기간은 렌탈사 최종 조건에 따라 확정됩니다.</p>${btn('렌탈 신청 체험','rental-start','arrow','primary block',`data-id="${c.id}"`)}</section><p style="text-align:center;font-size:9px;color:#a8b3c3">(주)라이프앤조이 · KCC홈씨씨 파트너<br>고객 화면 미리보기 · 실제 신청 및 결제 미연결</p></div></div>`}
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
    const fallbackSale = trunc10(Math.round(fallbackTotal / 1.1));
    const fallbackPayload = buildDraftMobileQuote(
      c,
      {
        margin: 100,
        discount: 0,
        type: previewQuoteType,
        title: (c.product || '창호') + ' ' + previewQuoteType,
        items: [
          { name: (c.product || '창호') + ' 맞춤 시공 패키지', spec: '현장 맞춤 규격', category: 'window', qty: 1, cost_total: fallbackSale, margin_rate: 100 }
        ]
      },
      { total: fallbackTotal, originalPrice: fallbackTotal, materialSubtotal: fallbackSale, extraSubtotal: 0, sale: fallbackSale, vat: fallbackTotal - fallbackSale }
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
    true
  );

  const ifr = $('#crm-quote-iframe');
  if (ifr) {
    ifr.addEventListener('load', () => {
      ifr.contentWindow?.postMessage({ type: 'SET_PREVIEW_DEVICE', device: previewDeviceWidth }, '*');
      ifr.contentWindow?.postMessage({ type: 'SET_PREVIEW_VIEW', view: previewViewMode }, '*');
    });
  }
}
function openNewContractDialog(id = null, fromCustomerModal = false) {
  const cs = visibleCustomers();
  if (!cs.length) {
    toast('등록된 고객이 없습니다. 먼저 고객을 등록해 주세요.');
    return;
  }
  const targetC = id ? accessibleC(id) : null;
  const preferredC = targetC || cs.find(x => !db.contracts.some(k => k.cid === x.id) && x.quote > 0) || cs.find(x => !db.contracts.some(k => k.cid === x.id)) || cs[0];
  const defaultAmount = preferredC ? (preferredC.finalQuote?.totalPrice || preferredC.roughQuote?.totalPrice || preferredC.quote || 0) : 0;
  const statusNames = getContractStatusNames();
  const defaultStatus = statusNames.includes('계약체결') ? '계약체결' : (statusNames[0] || '계약체결');
  const returnTab = detailTab || 'notes';

  const customerFieldHtml = (fromCustomerModal && targetC)
    ? `<div class="field">
        <label>계약 대상 고객 · 공사건</label>
        <input type="hidden" name="cid" id="contract-form-cid" value="${targetC.id}">
        <div class="file-card" style="margin:0;background:#f7faff">
          ${icon('users')}
          <div style="flex:1">
            <b>${esc(targetC.name)} <span class="row-code">No.${targetC.id}</span> · ${esc(targetC.product)}</b>
            <small>${esc(targetC.phone)} · ${esc(targetC.address)}</small>
          </div>
          ${badge(targetC.status)}
        </div>
      </div>`
    : `<div class="field">
        <label for="contract-form-cid">고객 · 공사건 선택 <span>*</span></label>
        <select class="input" name="cid" id="contract-form-cid">
          ${cs.map(c => `<option value="${c.id}" ${c.id === preferredC?.id ? 'selected' : ''}>${esc(c.name)} (No.${c.id} · ${esc(c.product)}) ${c.quote > 0 ? '· 견적 ' + won(c.quote) : '· 견적 미발행'}${db.contracts.some(k => k.cid === c.id) ? ' [기등록]' : ''}</option>`).join('')}
        </select>
      </div>`;

  const cancelBtnHtml = (fromCustomerModal && targetC)
    ? `<button type="button" class="btn" data-action="customer" data-id="${targetC.id}">취소 (고객상세로)</button>`
    : btn('취소', 'close');

  const body = `<form id="edit-form" data-submit="contract" ${fromCustomerModal && targetC ? `data-from-customer="${targetC.id}" data-return-tab="${esc(returnTab)}"` : ''}>
    <div class="dialog-body">
      ${customerFieldHtml}
      <div class="field-grid">
        <div class="field">
          <label for="contract-form-type">결제방식 <span>*</span></label>
          <select class="input" id="contract-form-type" name="type">
            <option value="일시불(현금)">일시불(현금)</option>
            <option value="카드할부">카드할부 (일시불·수납)</option>
            <option value="렌탈">렌탈 (60개월)</option>
          </select>
        </div>
        <div class="field">
          <label for="contract-form-status">계약·수납 상태 <span>*</span></label>
          <select class="input" id="contract-form-status" name="status">
            ${options(statusNames, defaultStatus)}
          </select>
        </div>
      </div>
      ${field('계약금액 (원)', 'amount', defaultAmount, 'money', true)}
      <div class="field">
        <label for="contract-form-note">계약 비고 / 특이사항</label>
        <textarea class="input" id="contract-form-note" name="note" style="min-height:74px" placeholder="수납 일정, 렌탈 희망 조건 등 특이사항을 입력하세요."></textarea>
      </div>
      <div class="notice-text">계약 등록 즉시 <b>계약관리</b>(일시불·수납 또는 렌탈 신청)에 자동 등록되며, 해당 고객의 상태값(진행구분)은 <b>[계약진행]</b>으로 자동 변경됩니다. 신규 등록 건은 24시간 동안 빨간 숫자 및 <b>NEW</b> 라벨로 표시됩니다.</div>
    </div>
    <div class="dialog-footer">
      ${cancelBtnHtml}
      <button type="submit" class="btn primary">${icon('contract')}계약 등록하기</button>
    </div>
  </form>`;

  openDialog(
    '계약 등록',
    body,
    '',
    '',
    targetC ? `${esc(targetC.name)} 고객 계약원장 등록 · 고객상태 자동 [계약진행] 전환` : '신규 일시불·렌탈 계약을 계약관리 원장에 등록합니다.'
  );
}

window.openImageLightbox = function(src, title = '이미지 미리보기', downloadName = '') {
  let box = document.getElementById('image-lightbox-overlay');
  if (!box) {
    box = document.createElement('div');
    box.id = 'image-lightbox-overlay';
    box.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;backdrop-filter:blur(4px);cursor:pointer';
    box.onclick = () => { box.style.display = 'none'; };
    document.body.appendChild(box);
  }
  const ext = getDocFileExtension('', src);
  const fname = downloadName || (String(title || 'image').replace(/[\\/:*?"<>|]/g, '_') + '.' + ext);
  box.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:92vw;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);cursor:default" onclick="event.stopPropagation()">
      <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">
        <b style="font-size:15px;color:#0f172a;font-weight:700">${esc(title)}</b>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn sm soft" id="lightbox-download-btn">${icon('download')}다운로드</button>
          <button type="button" class="btn sm" onclick="document.getElementById('image-lightbox-overlay').style.display='none'">닫기 ✕</button>
        </div>
      </div>
      <div style="padding:20px;overflow:auto;display:flex;justify-content:center;align-items:center;background:#0f172a">
        <img src="${esc(src)}" alt="${esc(title)}" style="max-width:100%;max-height:76vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
      </div>
    </div>
  `;
  const dlBtn = document.getElementById('lightbox-download-btn');
  if (dlBtn) dlBtn.onclick = () => triggerDocDownload(src, fname);
  box.style.display = 'flex';
};

function openContract(id, forceCashModal = false){
  const k = db.contracts.find(k => k.id === id);
  if (!k || !accessibleC(k.cid)) return;
  const c = findC(k.cid) || { id: k.cid, name: k.customerName || '고객', product: k.product || '창호' };
  const isRental = k.type === '렌탈' || !isCashContract(k);

  const rApp = (k.rentalAppId ? db.applications.find(a => a.id === k.rentalAppId) : null) ||
               db.applications.find(a => a.id === k.id || Number(a.cid) === Number(k.cid));
  const months = k.rentalPeriodMonths || rApp?.months || 60;
  const monthly = k.rentalMonthlyFee || rApp?.monthly || (k.amount ? Math.round((k.amount * 1.2) / months / 1000) * 1000 : 0);
  const total = k.rentalTotalFee || rApp?.total || (monthly * months) || k.amount;
  const upfront = k.rentalUpfrontFee || rApp?.upfront || 0;
  const rawRentalSt = k.rentalStatus || rApp?.status || '접수완료';
  const rentalStText = RENTAL_STATUS_MAP[rawRentalSt] || rawRentalSt;

  const statusList = [...new Set([...getContractStatusNames(), k.status].filter(Boolean))];
  const canEditSettings = getUserAllowedMenuKeys(getActiveUser()).includes('settings');

  const amountSection = isRental ? `
    <div class="mini-stat"><span>월 렌탈료</span><b style="color:#3730a3;font-size:15px">월 ${won(monthly)} <small style="font-size:11px;color:#6366f1;font-weight:600">(${months}개월 약정)</small></b></div>
    <div class="mini-stat"><span>총 렌탈료 (약정 총액)</span><b style="color:var(--navy)">${won(total)}</b></div>
    ${upfront > 0 ? `<div class="mini-stat"><span>초기 선납금</span><b>${won(upfront)}</b></div>` : ''}
    <div class="mini-stat"><span>결제 방식</span><b style="color:var(--purple)">렌탈 분납약정 (자동이체/CMS)</b></div>
    <div class="mini-stat"><span>렌탈 심사 상태</span><b>${badge(rentalStText, 'purple')}</b></div>
  ` : `
    <div class="mini-stat"><span>계약금액</span><b>${won(k.amount)}</b></div>
    <div class="mini-stat"><span>수납액</span><b style="color:var(--green)">${won(k.paid)}</b></div>
    <div class="mini-stat"><span>남은 수납액</span><b style="color:var(--blue)">${won(k.amount - k.paid)}</b></div>
  `;

  const body = `<div class="dialog-body">
    <div class="info-grid">
      <div><label>고객</label><b class="contract-name-line">${newLabelHtml(k)}${esc(c.name)} · ${esc(c.product)}</b></div>
      <div><label>계약번호 / 등록일시</label><b>${esc(k.id)}${k.createdAtText ? ` <small style="font-weight:500;color:#68778d">(${esc(k.createdAtText)})</small>` : ''}</b></div>
      <div><label>결제방식</label>${badge(k.type, isRental ? 'purple' : '')}</div>
      <div><label>현재 계약·수납 상태</label>${badge(k.status)}</div>
    </div>
    <div class="contract-status-edit-box">
      <div style="flex:1;min-width:180px">
        <label for="contract-detail-status" style="display:block;font-size:11px;font-weight:700;color:#41536d;margin-bottom:4px">계약·수납 상태 변경</label>
        <select class="input" id="contract-detail-status">${options(statusList, k.status)}</select>
      </div>
      <button type="button" class="btn primary sm" data-action="save-contract-status" data-id="${esc(k.id)}" style="align-self:flex-end;height:36px">${icon('check')}상태 저장</button>
      ${canEditSettings ? `<button type="button" class="btn soft sm" data-action="go-contract-settings" style="align-self:flex-end;height:36px">${icon('settings')}상태값 설정</button>` : ''}
    </div>
    <div class="divider"></div>
    ${amountSection}
    ${k.note ? `<div class="mini-stat"><span>계약 비고</span><b>${esc(k.note)}</b></div>` : ''}
    <div class="divider"></div>
    <div class="info-grid">
      <div><label>실측일</label><b>${c.measure || '미정'}</b></div>
      <div><label>시공 예정일</label><b>${c.build || '미정'}</b></div>
    </div>
  </div>`;

  const rAppId = k.rentalAppId || rApp?.id || (isRental && String(k.id || '').startsWith('R-') ? k.id : null);
  const footer = `${btn('고객 보기', 'customer', 'users', '', `data-id="${c.id}"`)}${renderQuotePreviewButtons(c, 'soft')}${!isRental ? btn('수납 등록', 'receipt', 'credit', 'primary', `data-id="${k.id}"`) : (rAppId ? btn('렌탈 심사·서류 검토', 'application', 'file', 'primary', `data-id="${rAppId}"`) : btn('렌탈 신청 확인', 'find-application', 'file', 'primary', `data-id="${c.id}"`))}`;

  openDialog('계약 상세', body, footer, '', `${esc(c.name)} 고객의 ${isRental ? '렌탈 계약·약정' : '계약·결제'} 현황`);
}

const SUPPLEMENT_PRESETS = {
  blurry_id: '제출해주신 신분증 이미지에 빛 반사 또는 흐림이 있어 글자 확인이 어렵습니다. 밝은 곳에서 정면으로 다시 촬영하여 등록해 주세요.',
  cropped_id: '신분증 테두리 일부가 잘려 확인이 어렵습니다. 신분증 네 모서리가 모두 보이도록 다시 촬영해 주세요.',
  info_mismatch: '견적서 계약자 정보와 제출 서류 내용을 다시 대조해야 합니다. 계약자 본인 신분증으로 다시 등록해 주세요.',
  signature_redo: '전자 서명 획이 흐리거나 누락되어 확인이 어렵습니다. 서명란에 성함을 또렷하게 다시 서명해 주세요.',
  other: '원활한 렌탈 심사 진행을 위해 서류 재등록이 필요합니다. 안내 내용을 확인하신 후 다시 제출해 주세요.'
};

async function openSupplementDialog(appId) {
  const localApp = db.applications.find(x => x.id === appId);
  const custName = localApp?.name || localApp?.customerName || '고객';

  const body = `
    <div class="dialog-body">
      <div class="notice-text" style="margin-bottom:14px">
        고객에게 <b>72시간 동안 1회 유효한 서류 재제출 전용 링크</b>를 생성하여 전달합니다.
      </div>
      <div class="field">
        <label for="sup-type">보완 사유 유형</label>
        <select class="input" id="sup-type" onchange="
          const presets = ${JSON.stringify(SUPPLEMENT_PRESETS).replace(/"/g, '&quot;')};
          const msgEl = document.getElementById('sup-msg');
          if (msgEl) msgEl.value = presets[this.value] || '';
        ">
          <option value="blurry_id">신분증 빛 반사 / 흐림 (재촬영 요청)</option>
          <option value="cropped_id">신분증 테두리 잘림 (네 모서리 포함 요청)</option>
          <option value="info_mismatch">계약자 정보 / 명의 불일치</option>
          <option value="signature_redo">전자 서명 흐림 / 누락 (재서명 요청)</option>
          <option value="other">기타 심사 서류 보완 필요</option>
        </select>
      </div>
      <div class="field">
        <label for="sup-msg">고객 안내 메시지 (알림톡/문자 발송 내용)</label>
        <textarea id="sup-msg" rows="3" class="input" style="height:auto">${esc(SUPPLEMENT_PRESETS.blurry_id)}</textarea>
      </div>
      <div class="field">
        <label for="sup-basis">내부 심사 메모 (고객에게 비노출)</label>
        <input class="input" id="sup-basis" placeholder="내부 보완 요청 근거 기록 (예: 주민번호 뒷자리 마스킹 재확인 필요 등)">
      </div>
      <div class="field">
        <label>발송 및 전달 방식</label>
        <div style="display:flex;gap:14px;font-size:12px;margin-top:6px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:4px"><input type="radio" name="sup-channel" value="clipboard" checked> 링크 생성 후 클립보드 복사</label>
          <label style="display:flex;align-items:center;gap:4px"><input type="radio" name="sup-channel" value="lms"> LMS 문자 발송</label>
          <label style="display:flex;align-items:center;gap:4px"><input type="radio" name="sup-channel" value="alimtalk"> 카카오 알림톡</label>
        </div>
      </div>
    </div>
  `;

  const footer = `
    <button type="button" class="btn" data-action="application" data-id="${esc(appId)}">이전으로</button>
    <button type="button" class="btn primary" data-action="submit-supplement" data-id="${esc(appId)}">${icon('send')}보완 요청 생성 및 발송</button>
  `;

  openDialog('렌탈 서류 보완 요청', body, footer, '', `${esc(custName)} 고객 · 접수번호 ${esc(appId)}`);
}

const RENTAL_STATUS_MAP = {
  received: '신규 접수',
  review: '서류 확인 중',
  reviewing: '서류 확인 중',
  needs_info: '보완 요청',
  supplement: '보완 요청',
  screening: '심사 중',
  confirmed: '계약 확정',
  approved: '계약 확정',
  rejected: '진행 불가',
  cancelled: '취소'
};
let _activeRentalDocs = null;

function getDocFileExtension(mimeType = '', url = '') {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.includes('jpeg') || mt.includes('jpg')) return 'jpg';
  if (mt.includes('webp')) return 'webp';
  if (mt.includes('pdf')) return 'pdf';
  if (mt.includes('gif')) return 'gif';
  if (mt.includes('png')) return 'png';
  const match = /^data:image\/([a-z0-9+.-]+);/i.exec(String(url || ''));
  if (match) return match[1].replace('jpeg', 'jpg');
  return 'png';
}

async function triggerDocDownload(src, filename) {
  if (!src) {
    toast('다운로드할 파일이 없습니다.');
    return;
  }
  const safeName = String(filename || 'document.png').replace(/[\\/:*?"<>|]/g, '_');
  const fireLink = (href) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  try {
    if (String(src).startsWith('data:') || String(src).startsWith('blob:')) {
      fireLink(src);
      return;
    }
    const res = await fetch(src);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    fireLink(objUrl);
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
  } catch {
    window.open(src, '_blank', 'noopener,noreferrer');
  }
}

function renderRentalDocCard({ kind, doc, title, iconName, completedLabel, emptyLabel, archivedText, lightboxTitle }) {
  const src = doc && (doc.dataUrl || doc.viewUrl);
  const dlBtn = src
    ? `<button type="button" class="btn sm soft" data-action="download-rental-doc" data-kind="${esc(kind)}" title="${esc(title)} 다운로드">${icon('download')}다운로드</button>`
    : '';
  let bodyHtml = '';
  if (src) {
    bodyHtml = `<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px;text-align:center;cursor:pointer;transition:border-color .2s" onclick="openImageLightbox('${esc(src)}', '${esc(lightboxTitle)}')">` +
      `<img src="${esc(src)}" alt="${esc(title)}" style="max-height:160px;max-width:100%;object-fit:contain;border-radius:4px;display:block;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,0.1)">` +
      `<div style="font-size:11px;color:#64748b;margin-top:6px;display:flex;justify-content:space-between;align-items:center">` +
        `<span>${esc(doc.mimeType || 'image/png')}</span>` +
        `<span style="color:var(--blue);font-weight:600">클릭 시 확대 보기 🔍</span>` +
      `</div>` +
    `</div>`;
  } else if (doc) {
    bodyHtml = `<div style="padding:16px;text-align:center;background:#fff;border-radius:8px;border:1px dashed #cbd5e1;font-size:12px;color:#64748b">${esc(archivedText)}</div>`;
  } else {
    bodyHtml = `<div style="padding:20px;text-align:center;background:#fff;border-radius:8px;border:1px dashed #cbd5e1;font-size:12px;color:#94a3b8">${esc(emptyLabel)}</div>`;
  }
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px">` +
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">` +
      `<b style="font-size:12px;color:#334155;display:flex;align-items:center;gap:5px">${icon(iconName, 'sm')} ${esc(title)} ${doc ? '(v' + doc.versionNo + ')' : ''}</b>` +
      `<div style="display:flex;align-items:center;gap:6px">${doc ? badge(completedLabel, 'green') : badge('미제출', 'gray')}${dlBtn}</div>` +
    `</div>` +
    bodyHtml +
  `</div>`;
}

async function openApplication(id, contractId = null) {
  try {
    const [res, audRes] = await Promise.all([
      apiFetch('/api/admin/rental-applications/' + encodeURIComponent(id)),
      apiFetch('/api/admin/rental-applications/' + encodeURIComponent(id) + '/audit')
    ]);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || '렌탈 신청 상세를 불러올 수 없습니다.');
      return;
    }
    const detail = await res.json();
    const aud = audRes.ok ? await audRes.json() : { events: [] };
    const app = detail.application;
    const localApp = db.applications.find(x => x.id === app.id);
    const appNewHtml = newLabelHtml(localApp || { createdAt: app.submittedAt || app.createdAt });
    const sp = app.snapshotPricing || {};
    const perms = detail.permissions || {};
    const stepIdx = { received: 1, review: 2, needs_info: 2, screening: 3, confirmed: 4 }[app.status] || 1;
    const allowed = (app.allowedNextStatuses || [app.status]).filter(
      st => st !== 'confirmed' || perms.canConfirmContract || st === app.status
    );
    const idDoc = (detail.documents || []).find(d => d.kind === 'id_card' && d.isActive && !d.deletedAt);
    const sigDoc = (detail.documents || []).find(d => d.kind === 'signature' && d.isActive && !d.deletedAt);
    _activeRentalDocs = {
      id_card: idDoc || null,
      signature: sigDoc || null,
      appId: app.id,
      customerName: app.customerName || '고객'
    };

    // 연결된 계약 정보 및 고객 정보
    const contract = contractId
      ? db.contracts.find(k => k.id === contractId)
      : db.contracts.find(k => k.cid === Number(app.projectId) && k.type === '렌탈');
    const c = findC(app.projectId);

    // 계약 원장 요약 바 (렌탈 계약 연동 시 표시)
    const contractHeaderHtml = contract ? `
      <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;color:#0f172a;font-size:13px">${icon('contract')} 계약원장: <b>${esc(contract.id)}</b></span>
          ${badge(contract.status)}
          <span style="color:#64748b;font-size:12px">공사금액 <b>${won(contract.amount)}</b></span>
        </div>
        <button type="button" class="btn sm soft" data-action="cash-contract" data-id="${esc(contract.id)}">${icon('settings')}계약원장/수납 관리</button>
      </div>
    ` : '';

    const bodyHtml = '<div class="dialog-body">' +
      contractHeaderHtml +
      '<div class="timeline-strip">' +
        [['신청접수', 1], ['서류검토', 2], ['심사중', 3], ['계약확정', 4]].map(([lbl, idx]) =>
          '<span class="' + (idx <= stepIdx ? 'done' : '') + '">' + lbl + '</span>'
        ).join('') +
      '</div>' +
      '<div class="info-grid">' +
        '<div><label>계약자 (마스킹 연락처)</label><b class="contract-name-line">' + appNewHtml + esc(app.customerName) + ' (' + esc(app.maskedPhone) + ')</b></div>' +
        '<div><label>접수번호 / 생년월일</label><b>' + esc(app.id) + ' · ' + esc(app.maskedBirthDate) + '</b></div>' +
        '<div><label>선택 렌탈 플랜</label><b>' + esc(sp.planTitle || '60개월 렌탈') + '</b></div>' +
        '<div><label>신청 스냅샷 금액</label><b>초기 ' + won(sp.upfront || 0) + ' / 월 ' + won(sp.monthly || 0) + '</b></div>' +
      '</div>' +
      '<div class="divider"></div>' +

      // 고객 등록 사진(신분증) 및 전자 서명 이미지 직관적 표시 + 다운로드
      '<div style="margin:12px 0">' +
        '<div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px">' +
          icon('shield') + ' 고객 등록 서류 및 사진' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px">' +
          renderRentalDocCard({
            kind: 'id_card',
            doc: idDoc,
            title: '신분증 사진',
            iconName: 'shield',
            completedLabel: '등록 완료',
            emptyLabel: '등록된 신분증 사진이 없습니다.',
            archivedText: '신분증 파일 암호화 안전 보관 중 (' + (idDoc?.mimeType || 'image/png') + ')',
            lightboxTitle: '고객 등록 신분증 사진'
          }) +
          renderRentalDocCard({
            kind: 'signature',
            doc: sigDoc,
            title: '전자 서명',
            iconName: 'edit',
            completedLabel: '서명 완료',
            emptyLabel: '등록된 서명이 없습니다.',
            archivedText: '전자 서명 보관 중',
            lightboxTitle: '고객 전자 서명'
          }) +
        '</div>' +
      '</div>' +

      (role === '본사 관리자' ? (
        '<form data-submit="application" data-id="' + esc(app.id) + '" style="margin-top:14px">' +
          '<input type="hidden" name="expectedVersion" value="' + Number(app.revision || 1) + '">' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 14px;padding:10px 12px;background:#f6f9fc;border-radius:8px;font-size:12px">' +
            '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" name="checkId" ' + (app.checks?.id ? 'checked' : '') + '> 신분증 확인</label>' +
            '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" name="checkSig" ' + (app.checks?.signature ? 'checked' : '') + '> 서명 확인</label>' +
            '<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" name="checkConsent" ' + (app.checks?.consent ? 'checked' : '') + '> 필수동의 확인</label>' +
          '</div>' +
          '<div class="field-grid">' +
            '<div class="field"><label for="crm-app-status">변경할 진행 상태</label><select class="input" id="crm-app-status" name="nextStatus">' +
              allowed.map(st => '<option value="' + esc(st) + '" ' + (st === app.status ? 'selected' : '') + '>' + esc(RENTAL_STATUS_MAP[st] || st) + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label for="crm-app-ref">렌탈사 승인·계약번호 (계약확정 시 필수)</label><input class="input" id="crm-app-ref" name="contractReference" value="' + esc(app.contractReference || '') + '" placeholder="예: KCC-RNT-20261112-01"></div>' +
          '</div>' +
          '<div class="field"><label>검토 메모 / 상태 변경 사유</label><textarea name="review" placeholder="검토 결과, 확정 승인 근거 또는 취소·보완 사유를 입력하세요.">' + esc(app.reviewNote || '') + '</textarea></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn primary" style="flex:1" type="submit">검토 결과 서버 저장</button>' +
            '<button type="button" class="btn soft" data-action="open-supplement-dialog" data-id="' + esc(app.id) + '">' + icon('send') + '고객 서류 보완 요청</button>' +
          '</div>' +
        '</form>'
      ) : '<div class="notice-text">파트너 계정은 마스킹된 진행 상태만 조회할 수 있습니다.</div>') +
      ((aud.events && aud.events.length)
        ? '<div class="divider"></div><h4 style="margin:0 0 8px;font-size:12px">최근 감사 이력 (' + aud.events.length + '건)</h4>' +
          aud.events.slice(0, 4).map(ev =>
            '<div class="mini-stat"><span>' + esc(ev.action) + ' · ' + esc(ev.actorName) + '</span><b>' + esc((ev.eventTime || '').slice(0, 16).replace('T', ' ')) + '</b></div>'
          ).join('')
        : '') +
    '</div>';

    const footerButtons = [
      c ? btn('고객 보기', 'customer', 'users', '', `data-id="${c.id}"`) : '',
      renderQuotePreviewButtons(c, 'soft'),
      btn('(렌탈) 동의서 양식 출력', 'open-form-preview-by-app', 'file', 'primary', `data-app-id="${esc(app.id)}"`),
      contract ? btn('계약 원장 보기', 'cash-contract', 'contract', 'soft', `data-id="${contract.id}"`) : '',
      btn('닫기', 'close', '', 'secondary')
    ].filter(Boolean).join('');

    openDialog(
      '렌탈 신청 상세 · ' + esc(app.statusLabel),
      bodyHtml,
      footerButtons,
      '',
      esc(app.customerName) + ' 고객 · 총 납부 예정 ' + won(sp.total || 0) + ' (Rev.' + (app.revision || 1) + ')'
    );
  } catch (err) {
    toast('렌탈 상세 조회 실패: ' + err.message);
  }
}
let rentalDraft=null;
function rentalStep(step){const c=accessibleC(rentalDraft.cid);if(!c)return;let body='';if(step===1)body=`<div class="notice-text" style="margin-bottom:17px">렌탈 신청 화면 체험입니다. 실제 접수되지 않으며 예시 정보만 입력해 주세요.</div><div class="field-grid">${field('신청자명','r-name',rentalDraft.name,'text',true)}${field('휴대폰','r-phone',rentalDraft.phone,'tel',true)}</div>${field('설치 주소','r-address',rentalDraft.address,'text',true)}${selectField('희망 기간','r-plan',['36개월','48개월','60개월'],rentalDraft.plan)}<button class="btn primary block" type="submit">다음 · 제출서류 확인 ${icon('arrow')}</button>`;if(step===2)body=`<div class="file-card">${icon('shield')}<div><b>신분증 제출 영역</b><small>실제 운영 시 본인확인 서류를 안전하게 제출합니다.</small></div></div><div class="notice-text">이 체험 화면에서는 실제 신분증을 받지 않습니다. ‘예시 서류 확인’으로 다음 단계를 확인할 수 있습니다.</div><label class="checkline"><input type="checkbox" name="sample" required>예시 서류 제출 화면을 확인했습니다.</label><button class="btn primary block" type="submit">다음 · 동의 및 신청 확인 ${icon('arrow')}</button>`;if(step===3)body=`<div class="info-grid"><div><label>신청자</label><b>${esc(rentalDraft.name)}</b></div><div><label>희망 기간</label><b>${rentalDraft.plan}</b></div></div><div class="divider"></div><div class="notice-text">신청 접수 후 담당자가 조건 및 서류를 확인하는 흐름입니다. 신청 접수만으로 렌탈 계약이 체결되지는 않습니다.</div><label class="checkline"><input type="checkbox" name="consent" required>체험용 개인정보 동의 화면을 확인했습니다.</label><div class="field"><label>신청 확인 · 이름 입력</label><input class="input" name="signature" required placeholder="${esc(rentalDraft.name)}"></div><button class="btn primary block" type="submit">체험 신청 완료</button>`;openDialog('렌탈 신청',`<div class="steps">${['신청정보','제출서류','동의·확인'].map((s,i)=>`<span class="${i+1===step?'active':''}"><i>${i+1}</i>${s}</span>`).join('')}</div><form data-submit="rental" data-step="${step}"><div class="dialog-body">${body}</div></form>`,'','','고객 견적서에서 바로 이어지는 신청 흐름')}
function showSchedule(id){const c=accessibleC(id)||visibleCustomers()[0];formDialog('실측 일정 등록',`<div class="field"><label>고객·공사건</label><select name="cid" class="input">${visibleCustomers().map(x=>`<option value="${x.id}" ${x.id===c?.id?'selected':''}>${esc(x.name)} · ${esc(x.address)}</option>`).join('')}</select></div><div class="field-grid">${field('희망일','date',c?.measure||'2026-11-13','date',true)}${selectField('희망 시간대','time',['오전 10:00','오후 14:00','오후 16:00'],'오후 14:00')}</div><div class="notice-text">체험 데이터에 실측 예정 일정을 등록합니다. 실제 방문 일정은 담당팀 배정 후 확정합니다.</div>`,'schedule','방문 일정과 현장 정보를 함께 관리합니다.')}
function download(name,content,mime='text/csv;charset=utf-8'){const blob=new Blob(['\ufeff',content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvCell(v){let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('링크를 복사했습니다.')}catch{openDialog('링크 복사',`<div class="dialog-body"><input class="input" value="${esc(text)}" readonly style="width:100%"><p class="field-hint">링크를 선택해 복사해 주세요.</p></div>`)}}
function productURL(i){const p=db.products[i];if(!p?.url)return '';try{const uObj=getActiveUser();const isP=isPartnerUser(uObj);const u=new URL(p.url,window.location.origin);if(isP)u.searchParams.set('partner',uObj.org||uObj.username||'partner');return u.href}catch{return p.url}}
function syncCloneLinkUrlPreview() {
  const form = $('#clone-link-form');
  const box = $('#clone-url-preview');
  if (!form || !box) return;
  const prodSel = $('#clone-link-product', form);
  const selOpt = prodSel?.options[prodSel.selectedIndex];
  const baseUrl = selOpt?.dataset?.url || '/';
  const codeRaw = ($('#clone-link-code', form)?.value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const code = codeRaw || '__AUTO__';
  const full = buildTrackingUrl({
    targetUrl: baseUrl,
    code
  });
  box.textContent = codeRaw ? full : full.replace('__AUTO__', '자동생성5자리');
}
function openCloneLinkDialog(linkId = null, defaultProdIdx = null) {
  const existing = linkId ? (db.landingLinks || []).find(x => Number(x.id) === Number(linkId)) : null;
  const isEdit = Boolean(existing);
  const products = db.products || [];
  let defaultProd = products[0] || { id: 1, name: 'KCC 홈씨씨 창호', category: '창호', url: '/landing/' };
  if (isEdit && existing.productId) {
    defaultProd = products.find(p => Number(p.id) === Number(existing.productId)) || defaultProd;
  } else if (defaultProdIdx !== null && defaultProdIdx !== undefined && products[Number(defaultProdIdx)]) {
    defaultProd = products[Number(defaultProdIdx)];
  } else {
    defaultProd = products.find(p => p.url && p.url.startsWith('/')) || defaultProd;
  }

  const activeU = getActiveUser();
  const isP = isPartnerUser(activeU);
  const partnerChoices = isP ? [activeU.org] : ['직영', ...(db.partners || []).map(p => p.name)];
  const initChannel = existing?.channel || (isP ? '파트너 전용링크' : '네이버 검색광고');
  const initMedium = existing?.medium || (isP ? '파트너추천' : '검색광고');
  const initPartner = existing?.partnerName || (isP ? activeU.org : '직영');

  const prodList = products.length ? products : [defaultProd];
  const prodOptionsHtml = prodList.map((p, idx) => {
    const tUrl = p.url || '/landing/';
    const isSel = Number(p.id || idx) === Number(defaultProd.id || 0);
    return `<option value="${p.id || ''}" data-url="${esc(tUrl)}" ${isSel ? 'selected' : ''}>${esc(p.name)} (${esc(p.category)} · ${esc(tUrl)})</option>`;
  }).join('');

  const chipsHtml = AD_CHANNEL_PRESETS.map(ch =>
    `<button type="button" class="ad-ch-chip ${initChannel === ch ? 'active' : ''}" data-action="pick-ad-channel" data-value="${esc(ch)}">${esc(ch)}</button>`
  ).join('');

  const body = `<form id="clone-link-form" data-submit="clone-link" ${isEdit ? `data-id="${existing.id}"` : ''}>
    <div class="dialog-body">
      <div class="notice-text" style="margin-bottom:16px">
        선택한 <b>기본 랜딩페이지</b>는 그대로 유지되면서, <b>어디에 광고를 넣을지(채널·캠페인 정보)</b>가 자동 기록되는 전용 복제 URL을 발급합니다.
      </div>
      <div class="field">
        <label for="clone-link-product">1. 복사할 원본 기본 랜딩페이지 <span>*</span></label>
        <select class="input" id="clone-link-product" name="productId">${prodOptionsHtml}</select>
      </div>
      <div class="field">
        <label for="clone-link-channel">2. 어디에 광고를 넣으시나요? (광고채널 선택 또는 직접입력) <span>*</span></label>
        <div class="ad-ch-chips">${chipsHtml}</div>
        <input class="input" id="clone-link-channel" name="channel" value="${esc(initChannel)}" placeholder="예: 네이버 검색광고, 당근마켓, 인스타그램, 강남 맘카페 등" required>
      </div>
      <div class="field">
        <label for="clone-link-name">3. 광고 캠페인 / 링크 구분명 <span>*</span></label>
        <input class="input" id="clone-link-name" name="name" value="${esc(existing?.name || '')}" placeholder="예: 파워링크_30평대_특가, 당근_하남미사_단열광고" required>
        <p class="field-hint">고객관리 목록에서 채널 배지 바로 옆에 함께 표시되어 어떤 광고 소재인지 즉시 구분할 수 있습니다.</p>
      </div>
      <div class="field-grid">
        <div class="field">
          <label for="clone-link-medium">광고 유형 / 지면</label>
          <select class="input" id="clone-link-medium" name="medium">${options(AD_MEDIUM_OPTIONS, initMedium, '선택(선택사항)')}</select>
        </div>
        <div class="field">
          <label for="clone-link-partner">귀속 파트너</label>
          <select class="input" id="clone-link-partner" name="partnerName">${options(partnerChoices, initPartner)}</select>
        </div>
      </div>
      <div class="field">
        <label for="clone-link-code">추적 식별 코드 (선택)</label>
        <input class="input" id="clone-link-code" name="code" value="${esc(existing?.code || '')}" placeholder="비워두면 채널명 비노출 짧은 코드 자동 생성 (예: k7m2x)">
        <p class="field-hint">URL에는 짧은 코드(<code>?ch=코드</code>)만 노출되며, 채널명·캠페인명·파트너 귀속은 서버에서 자동 매칭됩니다.</p>
      </div>
      <div class="field">
        <label>생성될 광고 배포 링크 미리보기</label>
        <div class="clone-url-preview-box">
          <code id="clone-url-preview"></code>
          <button type="button" class="btn sm soft" data-action="copy-clone-preview">${icon('copy')}복사</button>
        </div>
      </div>
      <div class="field">
        <label for="clone-link-memo">운영 메모 (선택)</label>
        <input class="input" id="clone-link-memo" name="memo" value="${esc(existing?.memo || '')}" placeholder="집행 예산, 타겟 지역, 광고 계정 메모 등">
      </div>
      ${isEdit ? `<label class="checkline"><input type="checkbox" name="isActive" ${existing.isActive !== false ? 'checked' : ''}> <b>링크 활성화 (운영중)</b></label>` : ''}
    </div>
    <div class="dialog-footer">
      ${btn('취소', 'close')}
      <button type="submit" class="btn primary">${icon('link')}${isEdit ? '복제 링크 수정 저장' : '광고링크 복제·생성 및 복사'}</button>
    </div>
  </form>`;

  openDialog(
    isEdit ? '복제 광고링크 수정' : '기본 랜딩페이지 복제 · 광고채널 링크 생성',
    body,
    '',
    '',
    '생성된 링크를 광고 매체에 등록하면 유입 채널과 성과가 자동 분석됩니다.'
  );
  syncCloneLinkUrlPreview();
}
function normalizeURL(url){const s=String(url??'').trim();if(!s)return '';if(s.startsWith('/'))return s;return /^https?:\/\//i.test(s)?s:'https://'+s}
function validateURL(url){if(!url)return true;const s=String(url).trim();if(s.startsWith('/'))return true;try{const u=new URL(s,window.location.origin);return ['https:','http:'].includes(u.protocol)&&Boolean(u.hostname)}catch{return false}}
document.addEventListener('click',async e=>{
  // 모달(다이얼로그) 바깥 오버레이 영역을 클릭해도 창이 닫히지 않고 작업 상태를 유지하도록 차단
  if($('.overlay')&&!e.target.closest('.dialog'))return;
  if(e.target.matches('input[type=checkbox]'))return;
  const el=e.target.closest('[data-action]');
  if(!el)return;
  const a=el.dataset.action,id=el.dataset.id,v=el.dataset.value;
switch(a){case'toggle-nav':setMobileNav(!mobileNavOpen);break;case'close-nav':setMobileNav(false);break;case'refresh-data':syncFromServer().then(()=>{render();toast('최신 서버 데이터를 불러왔습니다.');});break;case'nav':setMobileNav(false);page=el.dataset.page;selected.clear();render();window.scrollTo(0,0);if(page==='stats')refreshAnalytics();break;case'close':closeDialog();break;case'customer':openCustomer(id);break;case'new-customer':openNewCustomer();break;case'search-cust-address':openCustomerAddressSearch();break;case'close-cust-addr-search':{const w=document.getElementById('cust-addr-search-wrap');if(w)w.hidden=true;break;}case'use-cust-addr-variant':{const inp=document.getElementById('cust-address-base');if(inp&&v){inp.value=v;const det=document.getElementById('cust-address-detail');if(det)det.focus();}break;}case'customer-tab':customerTab=v;render();break;case'filter-all':stageFilter='';customerTab='all';render();break;case'filter-stage':stageFilter=v;customerTab='all';render();break;case'reset-filters':query='';stageFilter='';productFilter='';partnerFilter='';sourceFilter='';linkFilter='';periodFilter='all';customerTab='all';render();break;case'clear-link-filter':linkFilter='';render();break;case'go-products-links':page='products';render();window.scrollTo(0,0);break;case'product-link-cat':productLinkCatFilter=v||'all';render();break;case'jump-link-customers':{
  const targetLink = (db.landingLinks || []).find(ll => Number(ll.id) === Number(id));
  linkFilter = String(id || '');
  sourceFilter = targetLink?.channel || '';
  query = '';
  stageFilter = '';
  productFilter = '';
  partnerFilter = '';
  periodFilter = 'all';
  customerTab = 'all';
  page = 'customers';
  render();
  window.scrollTo(0, 0);
  if (targetLink) toast(`[${targetLink.channel} · ${targetLink.name}] 유입 고객만 필터링하여 표시합니다.`);
  break;
}case'detail-tab':openCustomer(id,v);break;case'quote-tab':quoteTab=v;selected.clear();render();break;case'toggle-quote-inquiry':{const numId=Number(id);if(expandedQuoteInquiries.has(numId))expandedQuoteInquiries.delete(numId);else expandedQuoteInquiries.add(numId);const keepY=window.scrollY;render();window.scrollTo(0,keepY);break}case'contract-tab':contractTab=v;render();break;case'settings-tab':settingsTab=v;render();break;
case'clear-quote-phone':{
  (async()=>{
    try{
      const res = await apiFetch('/api/settings/quote-phone', { method: 'PUT', body: { phone: '', managerName: '' } });
      const resData = await res.json();
      if(!res.ok) throw new Error(resData.error || '초기화 실패');
      quoteConsultPhone = '';
      quoteConsultManagerName = '';
      try{
        localStorage.setItem('kcc_quote_consult_phone', '');
        localStorage.setItem('kcc_quote_consult_manager', '');
      }catch{}
      render();
      toast('모바일 견적서 담당자 및 전화상담 번호를 기본값으로 초기화했습니다.');
    }catch(err){
      toast(err.message || '초기화에 실패했습니다.');
    }
  })();
  break;
}case'new-quote':openEditor(id, el.dataset.type || '');break;
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
  }
  case'pick-quote-customer':{
    openEditor(Number(id), el.dataset.type || custPickerPresetType || '');
    break;
  }
  case'cust-picker-filter':{
    custPickerFilter = v || 'all';
    $$('[data-action="cust-picker-filter"]').forEach(b => b.classList.toggle('active', b.dataset.value === custPickerFilter));
    const listEl = $('#quote-cust-picker-list');
    if (listEl) listEl.innerHTML = renderCustPickerRows();
    break;
  }
  case'change-quote-customer':{
    openQuoteCustomerPicker(editor?.type || '');
    break;
  }
  case'toggle-editor-live-preview':{
    if (!editor) break;
    editor.showLivePreview = !editor.showLivePreview;
    renderEditor();
    break;
  }
  case'load-existing-quote-items':{
    if (!editor) break;
    try {
      const res = await apiFetch('/api/quotes/by-project/' + editor.cid + '/preview');
      if (res.ok) {
        const pData = await res.json();
        const qItems = pData?.quote?.items || [];
        if (qItems.length) {
          editor.items = qItems.map(it => ({
            name: it.name,
            spec: it.spec || '',
            category: it.category || 'window',
            detail: it.detail,
            qty: Number(it.quantity) || 1,
            price: Number(it.sale_unit_price) || 0,
            cost_total: Number(it.sale_total) || 0,
            margin_rate: 100
          }));
          editor.excelGrandTotal = null;
          editor.excelSubtotal = null;
          editor.showLivePreview = true;
          renderEditor();
          toast('기존 발행 견적 품목 ' + qItems.length + '건을 불러왔습니다.');
          break;
        }
      }
      toast('불러올 상세 품목이 없습니다.');
    } catch {
      toast('기존 품목 불러오기에 실패했습니다.');
    }
    break;
  }
  case'back-editor':renderEditor();break;
  case'add-item':{
    if (!editor) break;
    const isExt = el.dataset.cat === 'extra';
    editor.items.push({
      name: isExt ? '기타 부대공사 (철거·양중 등)' : '창호 자재 품목',
      spec: isExt ? '현장 기준 1식' : '맞춤 규격 입력',
      category: isExt ? 'extra' : 'window',
      detail: {
        product: isExt ? '기타견적' : '창호',
        type: isExt ? '기타견적 · 부대공사' : '맞춤 창호 사양'
      },
      qty: 1,
      price: 0,
      cost_total: 0,
      margin_rate: editor.margin ?? 100
    });
    editor.excelGrandTotal = null;
    editor.excelSubtotal = null;
    renderEditor();
    break;
  }
  case'remove-quote-item':{
    if (!editor) break;
    const rIdx = Number(el.dataset.index);
    if (Number.isInteger(rIdx) && rIdx >= 0 && rIdx < editor.items.length) {
      editor.items.splice(rIdx, 1);
      editor.excelGrandTotal = null;
      editor.excelSubtotal = null;
      renderEditor();
    }
    break;
  }
  case'set-margin-scope':{
    if (!editor) break;
    const scope = el.dataset.value === 'all' ? 'all' : 'material';
    editor.marginScope = scope;
    const m = Math.max(0, Number(editor.margin ?? 100));
    let matCnt = 0, extCnt = 0;
    editor.items.forEach(it => {
      if (isExtraQuoteItem(it)) {
        if (scope === 'material') it.margin_rate = 100;
        else it.margin_rate = m;
        extCnt++;
      } else {
        it.margin_rate = m;
        matCnt++;
      }
    });
    renderEditor();
    if (scope === 'material') {
      toast(`마진율 대상을 [자재에만 적용]으로 설정했습니다. (자재 ${matCnt}건 마진율 ${m}%, 기타견적 ${extCnt}건 원가 100% 유지)`);
    } else {
      toast(`마진율 대상을 [전체 항목 적용]으로 설정했습니다. (전체 ${editor.items.length}건 마진율 ${m}%)`);
    }
    break;
  }
  case'apply-margin-all':{
    if (!editor) break;
    editor.marginScope = 'all';
    const m = Math.max(0, Number(editor.margin ?? 100));
    editor.items.forEach(it => { it.margin_rate = m; });
    renderEditor();
    toast('전체 ' + editor.items.length + '개 항목에 마진율 ' + m + '%를 일괄 적용했습니다.');
    break;
  }
  case'apply-margin-material':{
    if (!editor) break;
    editor.marginScope = 'material';
    const m = Math.max(0, Number(editor.margin ?? 100));
    let cnt = 0;
    editor.items.forEach(it => {
      if (!isExtraQuoteItem(it)) {
        it.margin_rate = m;
        cnt++;
      } else {
        it.margin_rate = 100;
      }
    });
    renderEditor();
    toast('자재 항목 ' + cnt + '건에 마진율 ' + m + '%를 적용했습니다. (기타견적 100% 유지)');
    break;
  }
  case'reset-margin-100':{
    if (!editor) break;
    editor.margin = 100;
    editor.items.forEach(it => { it.margin_rate = 100; });
    renderEditor();
    toast('모든 품목의 마진율을 100%(원가 기준)로 초기화했습니다.');
    break;
  }
case'save-customer':{
    const c=accessibleC(id);
    if(!c)break;
    const changes=[];
    for(const [key,sel,label] of [['status','detail-status','진행구분'],['label','detail-label','라벨'],['owner','detail-owner','담당자'],['source','detail-source','유입채널'],['adCampaign','detail-ad-campaign','광고캠페인'],['measure','detail-measure','실측일'],['build','detail-build','시공일']]){
      const val=$('#'+sel)?.value ?? '';
      if((c[key]||'')!==val){changes.push(label+': '+(c[key]||'미정')+' → '+(val||'미정'));c[key]=val}
    }
    c.adChannel = c.source;
    try {
      const res = await apiFetch('/api/customers/' + id, {
        method: 'PATCH',
        body: { status: c.status, label: c.label, owner: c.owner, source: c.source, adCampaign: c.adCampaign, measure: c.measure, build: c.build }
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
    const c=accessibleC(editor?.cid),t=editorTotal();
    if(!c||!editor.items.length||!t.total||editor.items.some(i=>!String(i.name||'').trim()||!(parseNum(i.qty)>0))){
      toast('견적 품목과 수량·원가 금액을 먼저 입력하거나 엑셀 파일을 등록해 주세요.');
      break;
    }
    const payloadItems = editor.items.map(it => {
      const r = calcEditorItemRow(it, editor.margin ?? 100);
      return {
        name: String(it.name || '').trim(),
        spec: String(it.spec || '').trim(),
        category: r.isExtra ? 'extra' : 'window',
        detail: it.detail,
        qty: r.qty,
        quantity: r.qty,
        price: r.qty > 0 ? (r.rawCostTotal / r.qty) : r.rawCostTotal,
        cost_total: r.rawCostTotal,
        margin_rate: r.mRate
      };
    });
    try {
      const res = await apiFetch('/api/quotes', {
        method: 'POST',
        body: {
          projectId: editor.cid,
          items: payloadItems,
          marginRate: editor.margin ?? 100,
          discountAmount: editor.discount || 0,
          supplyCost: t.supplyCost,
          excelSubtotal: t.cost,
          meta: editor.meta || null,
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
        audit(c.id, '견적서 v' + qData.version + ' 발행 · 최종 ' + won(t.total) + ' (공급원가 ' + won(t.supplyCost) + ', 마진금액 ' + won(t.profit) + ')');
        save();
        await syncFromServer();
        openPreview(c.id, null, 'quote', qData.quote_type || editor.type, qData.quote_id || null);
        toast('모바일 [' + (qData.quote_type || editor.type) + ']이 발행되었습니다. (v' + qData.version + ') 문자·카톡으로 바로 발송해보세요.');
        break;
      } else {
        toast(qData.error || '견적 발행에 실패했습니다.');
        break;
      }
    } catch (err) {
      console.error('publish-quote error:', err);
      toast('서버에 견적을 저장하지 못했습니다. 네트워크 또는 서버 상태를 확인해 주세요.');
    }
    break;
  }
case'sample-csv':download('homecc-estimate-sample.csv','품목,규격,수량,원가단가\n거실 발코니 이중창,맞춤규격,1,3200000\n안방 침실 창호,맞춤규격,2,1800000\n철거 및 설치,기본시공,1,1200000');break;
case'export':{
  if(!selected.size){
    toast('엑셀로 다운로드할 고객을 먼저 선택해 주세요.');
    break;
  }
  const cs=visibleCustomers().filter(c=>selected.has(c.id));
  if(!cs.length){
    toast('선택된 고객 데이터를 찾을 수 없습니다.');
    break;
  }
  download('homecc-customers-selected.csv',[['고객번호','고객명','연락처','공사주소','상품군','진행구분','유입채널','광고캠페인','담당자','파트너'],...cs.map(c=>[c.id,c.name,c.phone,c.address,c.product,c.status,getCustomerChannel(c),c.adCampaign||'',c.owner,c.partner])].map(r=>r.map(csvCell).join(',')).join('\r\n'));
  toast(`선택한 고객 ${cs.length}건을 CSV로 내려받았습니다.`);
  break;
}
case'delete-selected':{
  if(!selected.size){
    toast('삭제할 고객을 먼저 선택해 주세요.');
    break;
  }
  const targetIds=[...selected].map(Number).filter(n=>Number.isFinite(n)&&n>0);
  if(!targetIds.length){
    toast('삭제할 고객 ID가 올바르지 않습니다.');
    break;
  }
  if(!confirm(`선택한 고객 ${targetIds.length}명과 연결된 견적·계약·렌탈 내역을 모두 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) break;
  (async()=>{
    try{
      const res=await apiFetch('/api/customers/bulk-delete',{method:'POST',body:{ids:targetIds}});
      const resData=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(resData.error||'삭제에 실패했습니다.');
      const idSet=new Set(resData.deletedIds||targetIds);
      db.customers=db.customers.filter(c=>!idSet.has(Number(c.id)));
      db.contracts=db.contracts.filter(k=>!idSet.has(Number(k.cid)));
      db.applications=db.applications.filter(a=>!idSet.has(Number(a.cid)));
      idSet.forEach(cid=>{
        delete db.notes[cid];
        delete db.history[cid];
      });
      selected.clear();
      save();
      render();
      toast(`선택한 고객 ${idSet.size}건을 삭제했습니다.`);
    }catch(err){
      toast(err.message||'고객 삭제 중 오류가 발생했습니다.');
    }
  })();
  break;
}
case'calendar':{const cs=visibleCustomers().filter(c=>c.measure||c.build);openDialog('실측·시공 일정',`<div class="dialog-body">${cs.map(c=>`<div class="notification" data-action="customer" data-id="${c.id}">${icon('calendar')}<div><b>${esc(c.name)} · ${c.product}</b><small>실측 ${c.measure||'미정'}　/　시공 ${c.build||'미정'}</small></div></div>`).join('')||'<div class="empty">등록된 일정이 없습니다.</div>'}</div>`,btn('일정 등록','schedule','plus','primary'),'','공사건별 예정 일정');break}case'schedule':showSchedule(id);break;
case'notifications':{const cs=visibleCustomers().filter(c=>c.owner==='미배정'||c.status==='가견적요청'||c.status==='실측예정');openDialog('오늘 확인할 업무',`<div class="dialog-body">${cs.map(c=>`<div class="notification" data-action="customer" data-id="${c.id}">${icon(c.status==='실측예정'?'calendar':'clock')}<div><b>${esc(c.name)} · ${c.status}</b><small>${esc(c.owner==='미배정'?'담당 상담사를 배정해 주세요.':c.note)}</small></div>${icon('chevron')}</div>`).join('')||'<div class="empty">현재 대기 업무가 없습니다.</div>'}</div>`,'','','고객별 다음 업무를 바로 확인하세요.');break}
case'assign':{if(!selected.size){toast('고객을 먼저 선택하세요.');break}const assignList=getHqOwnerOptions().filter(n=>n!=='미배정').concat(['미배정']);formDialog('담당자 일괄 배정',selectField('담당 상담사','owner',assignList,assignList[0]||'김지훈'),'assign',`${selected.size}명의 선택 고객에 적용`);break}
case'rough-quote-link':{const c=accessibleC(id);if(c)linkDialog('가견적 링크 관리','가견적',c.roughQuoteUrl,'rough-quote-link',id,c.name);break}
case'final-quote-link':{const c=accessibleC(id);if(c)linkDialog('최종견적 링크 관리','최종견적',c.finalQuoteUrl,'final-quote-link',id,c.name);break}
case'drawing':{const c=accessibleC(id);if(c)linkDialog('내관도 링크 관리','내관도',c.drawing,'drawing',id,c.name);break}
case'contract':openContract(id);break;case'cash-contract':openContract(id,true);break;case'application':openApplication(id);break;case'download-rental-doc':{const kind=el.dataset.kind;const doc=_activeRentalDocs?.[kind];const src=doc?.dataUrl||doc?.viewUrl;if(!src){toast('다운로드할 서류 파일이 없습니다.');break}const ext=getDocFileExtension(doc.mimeType,src);const label=kind==='id_card'?'신분증':'전자서명';const cust=(_activeRentalDocs?.customerName||'고객').replace(/[\\/:*?"<>|]/g,'_');const appNo=(_activeRentalDocs?.appId||'rental').replace(/[\\/:*?"<>|]/g,'_');triggerDocDownload(src,`${cust}_${appNo}_${label}_v${doc.versionNo||1}.${ext}`);break}case'find-application':{const app=db.applications.find(x=>x.cid===Number(id));if(app)openApplication(app.id);else toast('아직 접수된 렌탈 신청이 없습니다.');break}
case'open-supplement-dialog':openSupplementDialog(id);break;
case'submit-supplement':{
  const supType = $('#sup-type')?.value || 'blurry_id';
  const supMsg = $('#sup-msg')?.value || '';
  const supBasis = $('#sup-basis')?.value || '';
  const supChannel = document.querySelector('input[name="sup-channel"]:checked')?.value || 'clipboard';
  try {
    const res = await apiFetch('/api/admin/rental-applications/' + encodeURIComponent(id) + '/supplement-requests', {
      method: 'POST',
      body: {
        supplementType: supType,
        customerMessage: supMsg,
        basisNote: supBasis,
        channel: supChannel
      }
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || '보완 요청 링크 생성에 실패했습니다.');
      break;
    }
    if (data.supplementUrl) {
      try {
        await navigator.clipboard.writeText(data.outboundText || data.supplementUrl);
        toast('72시간 1회용 보완 링크가 클립보드에 복사되었습니다.');
      } catch (e) {
        toast('보완 요청이 등록되었습니다. 링크: ' + data.supplementUrl);
      }
    } else {
      toast('고객 보완 요청이 성공적으로 발송되었습니다.');
    }
    await syncFromServer();
    await openApplication(id);
  } catch (err) {
    toast('보완 요청 처리 오류: ' + err.message);
  }
  break;
}
case'new-contract':{
    const fromCust = el.dataset.from === 'customer-modal' || (detailId !== null && id && Number(detailId) === Number(id));
    openNewContractDialog(id || null, fromCust);
    break;
  }
case'go-contract-settings':{
    closeDialog();
    page = 'settings';
    settingsTab = 'contract-statuses';
    render();
    window.scrollTo(0, 0);
    break;
  }
case'go-customer-contracts':{
    closeDialog();
    page = 'contracts';
    contractTab = 'all';
    render();
    window.scrollTo(0, 0);
    break;
  }
case'save-contract-status':{
    const k = db.contracts.find(x => x.id === id);
    const nextSt = ($('#contract-detail-status')?.value || '').trim();
    if (!k || !nextSt) break;
    if (k.status === nextSt) {
      toast('이미 동일한 계약·수납 상태입니다.');
      break;
    }
    const prevSt = k.status;
    try {
      const res = await apiFetch('/api/contracts/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: { status: nextSt }
      });
      if (res.ok) {
        await syncFromServer();
        audit(k.cid, `계약·수납 상태 변경 (${k.id}) · ${prevSt} → ${nextSt}`);
        openContract(id);
        toast(`계약·수납 상태가 [${nextSt}](으)로 저장되었습니다.`);
        break;
      }
    } catch {}
    k.status = nextSt;
    audit(k.cid, `계약·수납 상태 변경 (${k.id}) · ${prevSt} → ${nextSt}`);
    save();
    render();
    openContract(id);
    toast(`계약·수납 상태가 [${nextSt}](으)로 변경되었습니다.`);
    break;
  }
case'new-contract-status':openContractStatusDialog(null);break;
case'edit-contract-status':openContractStatusDialog(id);break;
case'move-contract-status':{
    const dir = el.dataset.dir;
    if (!dir) break;
    try {
      const res = await apiFetch('/api/settings/contract-statuses/' + id, {
        method: 'PATCH',
        body: { direction: dir }
      });
      if (res.ok) {
        const resData = await res.json();
        if (Array.isArray(resData.contractStatuses)) db.contractStatuses = resData.contractStatuses;
        save();
        render();
        break;
      }
    } catch {}
    const list = getContractStatuses();
    const idx = list.findIndex(x => Number(x.id) === Number(id));
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (idx !== -1 && swapIdx >= 0 && swapIdx < list.length) {
      const tmp = list[idx].sort_order;
      list[idx].sort_order = list[swapIdx].sort_order;
      list[swapIdx].sort_order = tmp;
      db.contractStatuses = list;
      save();
      render();
    }
    break;
  }
case'delete-contract-status':{
    const list = getContractStatuses();
    if (list.length <= 1) {
      toast('최소 1개 이상의 계약·수납 상태값은 유지해야 합니다.');
      break;
    }
    const target = list.find(x => Number(x.id) === Number(id));
    if (!target) break;
    try {
      const res = await apiFetch('/api/settings/contract-statuses/' + id, { method: 'DELETE' });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(resData.error || '상태값 삭제에 실패했습니다.');
        break;
      }
      if (Array.isArray(resData.contractStatuses)) db.contractStatuses = resData.contractStatuses;
      save();
      render();
      toast(`[${target.name}] 상태값을 삭제했습니다.`);
      break;
    } catch {}
    db.contractStatuses = list.filter(x => Number(x.id) !== Number(id));
    save();
    render();
    toast(`[${target.name}] 상태값을 삭제했습니다.`);
    break;
  }
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
case'partner-mode':{
    setMobileNav(false);
    const activeU = getActiveUser();
    if (activeU.role === 'partner') {
      toast('일반 파트너 계정에서는 다른 파트너 어드민으로 이동할 수 없습니다.');
      break;
    }
    const targetUser = el.dataset.username || '';
    const targetOrg = el.dataset.org || '파트너';
    if (!targetUser) {
      toast('해당 파트너의 어드민 접속 계정이 없습니다.');
      break;
    }
    // 본사 관리자 화면을 유지한 채 새 창에서 해당 파트너 어드민을 독립 세션으로 오픈
    const targetUrl = `./?switch_user=${encodeURIComponent(targetUser)}`;
    window.open(targetUrl, '_blank');
    toast(`[${targetOrg}] 파트너 어드민을 새 창으로 열었습니다.`);
    break;
  }
case'copy-text':{
    const txt = el.dataset.text || '';
    if (txt) {
      copy(txt);
      toast('파트너 전용 상품 링크가 복사되었습니다!');
    }
    break;
  }
case'partner-detail':{
    const p = db.partners.find(x => x.id === id || String(x.orgId) === String(id) || x.code === id || x.name === id);
    if (!p) { toast('파트너 정보를 찾을 수 없습니다.'); break; }
    const activeU = getActiveUser();
    const isHq = role === '본사 관리자' || activeU.role === 'hq_admin';
    const levelNum = p.level || 1;
    const parentOpts = [['', '최상위 (1차 파트너)'], ...(db.partners || []).filter(x => x.orgId !== p.orgId && x.id !== p.id).map(x => [String(x.orgId || x.id), `${x.name} (${x.level || 1}차 파트너)`])];
    const parentFieldHtml = isHq
      ? selectField('상위 파트너 (레벨 관리)', 'parentId', parentOpts, String(p.parentId || ''))
      : `<div class="field"><label>상위 파트너</label><input class="input" value="${esc(p.parentName || '본사 직속')}" readonly style="background:#f8fafc"></div>`;

    const pUser = (db.users || []).map((u, idx) => normalizeUserRecord(u, idx)).find(u => u.org === p.name || (p.orgId && u.org_id === p.orgId) || (p.username && u.username === p.username));

    const defaultUname = `partner_${(p.code || p.id || 'new').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const accountSectionHtml = pUser ? `
      <div style="background:#f8fafc;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:14px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="badge green" style="font-weight:700">🔐 어드민 계정 연동됨</span>
            <span style="font-size:12px;color:#475569">아이디: <b style="color:#1e293b">${esc(pUser.username)}</b></span>
          </div>
          ${isHq ? `<a class="btn sm soft" href="./?switch_user=${encodeURIComponent(pUser.username)}" target="_blank" style="padding:4px 8px;font-size:11px">${icon('external','sm')} 새 창 로그인</a>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${field('접속 아이디 (파트너 코드)', 'username', pUser.username, 'text', true, '영문 소문자·숫자')}
          ${field('비밀번호 변경 (선택)', 'password', '', 'password', false, '변경 시에만 4자리 이상 입력')}
        </div>
        <div style="margin-top:6px;font-size:12px;color:#1d4ed8;background:#eff6ff;padding:6px 10px;border-radius:6px">
          🌐 <b>전용 랜딩 주소</b>: <code>https://www.kcc-life.com/?partner=${esc(pUser.username)}</code>
        </div>
      </div>
    ` : `
      <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:14px;margin:14px 0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span class="badge orange" style="font-weight:700">⚠️ 어드민 계정 미등록</span>
          <span class="badge gray">로그인 불가 상태</span>
        </div>
        <p style="font-size:12px;color:#c2410c;margin:0 0 10px;line-height:1.5">
          현재 연결된 로그인 어드민 계정이 없습니다. 접속 아이디와 비밀번호를 입력해 저장하면 파트너 어드민 접속 계정 및 전용 랜딩페이지가 즉시 생성됩니다.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${field('접속 아이디 (파트너 코드)', 'username', defaultUname, 'text', true, '영문 소문자·숫자 (예: partner_abc)')}
          ${field('접속 비밀번호', 'password', '', 'password', true, '4자리 이상 입력')}
        </div>
        <div style="margin-top:6px;font-size:12px;color:#ea580c;background:#ffedd5;padding:6px 10px;border-radius:6px">
          🌐 <b>전용 랜딩 주소</b>: <code>https://www.kcc-life.com/?partner=[입력한 아이디]</code> 주소로 즉시 자동 개설됩니다.
        </div>
      </div>
    `;

    const canDelete = isHq || (activeU.role === 'partner' && String(p.parentId) === String(activeU.org_id));
    const deleteSectionHtml = canDelete ? `
      <div style="margin-top:20px;padding:12px 14px;border:1px dashed #fca5a5;background:#fef2f2;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <strong style="color:#b91c1c;font-size:13px;display:block">파트너 조직 삭제</strong>
          <small style="color:#ef4444;font-size:11px">해당 파트너 조직 및 연관된 어드민 접속 계정을 영구 삭제합니다.</small>
        </div>
        <button type="button" class="btn danger sm" data-action="delete-partner" data-id="${p.orgId || p.id}" data-name="${esc(p.name)}">
          ${icon('trash', 'sm')} 파트너 삭제
        </button>
      </div>
    ` : '';

    formDialog('파트너 정보 상세 및 수정', `
      <div style="margin-bottom:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${badge(`${levelNum}차 파트너`, levelNum === 1 ? 'blue' : 'purple')}
        <span class="badge gray">식별 코드: ${esc(p.id)}</span>
        ${p.subPartnerCount > 0 ? badge(`직속 하위 ${p.subPartnerCount}개사`, 'green') : ''}
        ${pUser ? badge('계정 연동됨', 'green') : badge('계정 미등록', 'orange')}
      </div>
      ${parentFieldHtml}
      ${field('파트너사명', 'name', p.name, 'text', true)}
      ${field('대표 담당자', 'person', p.person, 'text', true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${field('연락처', 'phone', p.phone || '', 'tel')}
        ${field('이메일', 'email', p.email || '', 'email')}
      </div>
      ${selectField('업종', 'type', ['인테리어', '영업대행', '건재유통', '시공업체', '기타'], p.type || '인테리어')}
      ${accountSectionHtml}
      <div class="notice-text">파트너별 어드민 접속 권한과 메뉴(고객관리·상품관리·통계관리 등)는 실시간 자동 동기화됩니다.</div>
      ${deleteSectionHtml}
    `, 'partner', '', `data-id="${p.orgId || p.id}"`);
    break;
  }
case'my-profile':{
    const activeU = getActiveUser();
    const isPartner = activeU.role === 'partner';
    const partnerUsername = activeU.username || '';
    const prodSubdomain = `https://www.kcc-life.com/?partner=${encodeURIComponent(partnerUsername)}`;

    formDialog(isPartner ? '파트너 정보 및 계정 수정' : '내 정보 및 비밀번호 수정', `
      <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="color:#0f172a;font-size:14px">${esc(activeU.name)} (${esc(activeU.role_label)})</strong>
          <span class="badge blue">${esc(activeU.org)}</span>
        </div>
        <div style="font-size:12px;color:#475569;display:flex;gap:12px;flex-wrap:wrap">
          <span>아이디: <b style="color:#1e293b">${esc(partnerUsername)}</b></span>
          ${isPartner ? `<span>전용 랜딩: <b style="color:#2563eb">${esc(prodSubdomain)}</b></span>` : ''}
        </div>
      </div>
      ${isPartner ? field('파트너사명 (상호명)', 'orgName', activeU.org, 'text', true) : ''}
      ${field('담당자 성명', 'name', activeU.name, 'text', true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${field('대표 연락처', 'phone', activeU.phone || '', 'tel', true)}
        ${field('이메일', 'email', activeU.email || '', 'email')}
      </div>
      <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:12px;margin-top:12px">
        <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px">🔑 비밀번호 변경 (선택)</div>
        ${field('새 비밀번호', 'password', '', 'password', false, '변경 시에만 4자리 이상 입력')}
        <small style="color:#64748b;font-size:11px">비밀번호를 변경하지 않으려면 공란으로 두세요.</small>
      </div>
      <div class="notice-text">수정된 정보는 전용 랜딩 및 고객 상담 알림 등에 즉시 반영됩니다.</div>
    `, 'my-profile', '', '', '정보 저장');
    break;
  }
case'new-partner':{
    const activeU = getActiveUser();
    const isPartner = activeU.role === 'partner';
    const preselectedParentId = el.dataset.parentId ? String(el.dataset.parentId) : '';
    const parentFieldHtml = isPartner
      ? `<input type="hidden" name="parentId" value="${activeU.org_id}">
         <div class="field">
           <label>상위 파트너 (직속 귀속)</label>
           <input class="input" value="${esc(activeU.org)} (본인 소속 ${Number(activeU.level || 1) + 1}차 하위 파트너로 자동 귀속)" readonly style="background:#f1f5f9;font-weight:600;color:#1e3a8a">
         </div>`
      : selectField('상위 파트너 (선택 시 레벨 자동 부여)', 'parentId', [
          ['', '최상위 (1차 파트너 - 상위 파트너 없음)'],
          ...(db.partners || []).map(p => [String(p.orgId || p.id), `${p.name} (${p.level || 1}차 파트너)`])
        ], preselectedParentId);

    formDialog(isPartner ? '하위 영업파트너 등록' : '신규 파트너 등록', `
      ${parentFieldHtml}
      ${field('파트너사명 (상호명)', 'name', '', 'text', true)}
      ${field('대표 담당자명', 'person', '', 'text', true)}
      <div style="background:#f8fafc;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:12px 0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span class="badge blue" style="font-weight:700">🔐 어드민 계정 &amp; 전용 랜딩 주소</span>
          <span class="badge green">필수 입력</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${field('접속 아이디 (파트너 코드)', 'username', '', 'text', true, '영문 소문자·숫자 (예: partner_daon)')}
          ${field('접속 비밀번호', 'password', '', 'password', true, '4자리 이상 입력')}
        </div>
        <div style="margin-top:6px;font-size:12px;color:#1d4ed8;background:#eff6ff;padding:6px 10px;border-radius:6px">
          🌐 <b>전용 랜딩 주소</b>: <code>https://www.kcc-life.com/?partner=[입력한 아이디]</code> 주소로 자동 개설됩니다.
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${field('대표 연락처 (휴대폰)', 'phone', '010-', 'tel', true, '숫자 입력 시 하이픈 자동 삽입')}
        ${field('이메일 주소', 'email', '', 'email', false, 'partner@example.com')}
      </div>
      ${selectField('업종', 'type', ['인테리어', '영업대행', '건재유통', '시공업체', '기타'], '인테리어')}
      <div class="notice-text">
        ✨ <b>파트너 기본 메뉴</b>: 고객관리, 상품관리, 통계관리<br>
        ✨ <b>하위 파트너 등록 시</b>: 상위 파트너에게 <b>[파트너관리]</b> 메뉴가 자동으로 활성화됩니다.
      </div>
    `, 'partner', '', '', '파트너 등록 완료');
    break;
  }
case'delete-partner':{
    const targetId = el.dataset.id;
    const partnerName = el.dataset.name || '파트너';
    if (!targetId) { toast('삭제 대상 파트너 ID가 없습니다.'); break; }

    const targetPartner = (db.partners || []).find(x => x.id === targetId || String(x.orgId) === String(targetId) || x.name === partnerName);
    const pOrgId = targetPartner?.orgId || targetId;

    // Safety check: sub-partners in memory
    const childPartners = (db.partners || []).filter(c => (String(c.parentId) === String(pOrgId) || String(c.parent_id) === String(pOrgId) || c.parentName === partnerName) && String(c.orgId || c.id) !== String(pOrgId));
    if (childPartners.length > 0) {
      toast(`직속 하위 2차 파트너(${childPartners.length}개사)가 등록되어 있어 삭제할 수 없습니다. 하위 파트너를 먼저 삭제하거나 상위 파트너를 변경해 주세요.`);
      break;
    }

    // Safety check: customer/contract in memory
    const relCustomers = (db.customers || []).filter(c => c.partner === partnerName || (targetPartner && c.partner === targetPartner.name));
    const relContracts = (db.contracts || []).filter(k => relCustomers.some(c => c.id === k.cid));
    if (relCustomers.length > 0 || relContracts.length > 0) {
      toast(`해당 파트너로 귀속된 고객(${relCustomers.length}건) 또는 계약(${relContracts.length}건) 실적이 존재하여 삭제할 수 없습니다.`);
      break;
    }

    if (!confirm(`[${partnerName}] 파트너 조직을 정말 삭제하시겠습니까?\n\n※ 해당 파트너의 어드민 접속 계정도 함께 삭제됩니다.`)) {
      break;
    }

    try {
      const apiUrl = '/api/partners/' + encodeURIComponent(targetId);
      const res = await apiFetch(apiUrl, { method: 'DELETE' });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        db.partners = (db.partners || []).filter(x => x.id !== targetId && String(x.orgId) !== String(pOrgId) && x.name !== partnerName);
        db.users = (db.users || []).filter(u => u.org !== partnerName && String(u.org_id) !== String(pOrgId));
        save();
        await syncFromServer();
        closeDialog();
        render();
        toast(resData.message || `[${partnerName}] 파트너가 성공적으로 삭제되었습니다.`);
        break;
      } else {
        toast(resData.error || '파트너 삭제에 실패했습니다.');
        break;
      }
    } catch (err) {
      console.warn('Partner delete error:', err);
    }

    // Fallback in-memory delete
    db.partners = (db.partners || []).filter(x => x.id !== targetId && String(x.orgId) !== String(pOrgId) && x.name !== partnerName);
    db.users = (db.users || []).filter(u => u.org !== partnerName && String(u.org_id) !== String(pOrgId));
    save();
    closeDialog();
    render();
    toast(`[${partnerName}] 파트너를 삭제했습니다.`);
    break;
  }
case'open-clone-link':openCloneLinkDialog(null, id !== undefined && id !== '' ? Number(id) : null);break;
case'edit-cloned-link':openCloneLinkDialog(Number(id));break;
case'copy-cloned-link':{
  const ll = (db.landingLinks || []).find(x => Number(x.id) === Number(id));
  if (ll) copy(buildTrackingUrl(ll));
  break;
}
case'copy-clone-preview':{
  const txt = ($('#clone-url-preview')?.textContent || '').trim();
  if (txt) {
    const isEdit = Boolean($('#clone-link-form')?.dataset?.id);
    copy(txt);
    if (!isEdit) {
      toast('미리보기 링크를 복사했습니다. (하단의 [광고링크 생성] 버튼을 눌러야 정식 코드가 저장됩니다)');
    }
  }
  break;
}
case'pick-ad-channel':{
  const inp = $('#clone-link-channel');
  if (inp && v) {
    inp.value = v;
    $$('.ad-ch-chip').forEach(b => b.classList.toggle('active', b.dataset.value === v));
    syncCloneLinkUrlPreview();
  }
  break;
}
case'preview-cloned-link':{
  const ll = (db.landingLinks || []).find(x => Number(x.id) === Number(id));
  if (!ll) break;
  const fullUrl = buildTrackingUrl(ll);
  const sep = fullUrl.includes('?') ? '&' : '?';
  const prevSrc = fullUrl + sep + 'preview=1';
  openDialog(`${esc(ll.channel)} · ${esc(ll.name)} 미리보기`, `<div class="dialog-body" style="padding:0;overflow:hidden;display:flex;flex-direction:column;height:78vh"><div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:13px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="ch-pill ${channelTone(ll.channel)}">${esc(ll.channel)}</span><span style="color:#475569;font-family:monospace;font-size:12px">${esc(fullUrl)}</span></div><div style="display:flex;gap:6px"><button type="button" class="btn sm" onclick="const f=document.getElementById('landing-preview-frame');if(f){f.style.maxWidth='390px';f.style.margin='0 auto';}">${icon('phone')}모바일 390px</button><button type="button" class="btn sm" onclick="const f=document.getElementById('landing-preview-frame');if(f){f.style.maxWidth='100%';f.style.margin='0';}">${icon('window')}PC 너비</button><a class="btn sm primary" href="${esc(fullUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')} 새 탭에서 열기</a></div></div><div style="flex:1;background:#52525b;display:flex;justify-content:center;overflow:hidden;padding:12px"><iframe id="landing-preview-frame" src="${esc(prevSrc)}" style="width:100%;height:100%;border:none;border-radius:12px;background:#fff;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);transition:all 0.25s ease" title="복제 광고랜딩 미리보기"></iframe></div></div>`, btn('링크 복사', 'copy-cloned-link', 'copy', 'soft', `data-id="${ll.id}"`) + btn('닫기', 'close'));
  break;
}
case'delete-cloned-link':{
  const ll = (db.landingLinks || []).find(x => Number(x.id) === Number(id));
  if (!ll) break;
  if (!confirm(`[${ll.channel} · ${ll.name}] 복제 광고링크를 삭제하시겠습니까?\n(기존 유입 고객의 채널 기록은 유지됩니다.)`)) break;
  try {
    const res = await apiFetch('/api/products/links/' + ll.id, { method: 'DELETE' });
    const resData = await res.json().catch(() => ({}));
    if (res.ok) {
      if (Array.isArray(resData.landingLinks)) db.landingLinks = resData.landingLinks;
      save();
      await syncFromServer();
      toast('복제 광고링크를 삭제했습니다.');
      break;
    }
    if (res.status !== 404) {
      toast(resData.error || '삭제에 실패했습니다.');
      break;
    }
  } catch {}
  db.landingLinks = (db.landingLinks || []).filter(x => Number(x.id) !== Number(ll.id));
  save();
  render();
  toast('복제 광고링크를 삭제했습니다.');
  break;
}
case'copy-product':{const u=productURL(id);if(u)copy(u);else toast('랜딩 URL을 먼저 등록해 주세요.');break}
case'product-link':{openCloneLinkDialog(null, id !== undefined && id !== '' ? Number(id) : null);break}
case'preview-landing':{const p=db.products[id];const u=productURL(id)||p?.url||'/landing/';const prevU=u+(u.includes('?')?'&':'?')+'preview=1';openDialog(`${esc(p?.name||'KCC 홈씨씨 창호')} 랜딩페이지 미리보기`,`<div class="dialog-body" style="padding:0;overflow:hidden;display:flex;flex-direction:column;height:78vh"><div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:13px"><div style="display:flex;align-items:center;gap:8px"><span class="badge green">실시간 연동</span><span style="color:#64748b;font-family:monospace;font-size:12px">${esc(u)}</span></div><div style="display:flex;gap:6px"><button type="button" class="btn sm" onclick="const f=document.getElementById('landing-preview-frame');if(f){f.style.maxWidth='390px';f.style.margin='0 auto';}">${icon('phone')}모바일 390px</button><button type="button" class="btn sm" onclick="const f=document.getElementById('landing-preview-frame');if(f){f.style.maxWidth='100%';f.style.margin='0';}">${icon('window')}PC 너비</button><a class="btn sm primary" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${icon('external')} 새 탭에서 열기</a></div></div><div style="flex:1;background:#52525b;display:flex;justify-content:center;overflow:hidden;padding:12px"><iframe id="landing-preview-frame" src="${esc(prevU)}" style="width:100%;height:100%;border:none;border-radius:12px;background:#fff;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);transition:all 0.25s ease" title="창호 랜딩페이지 미리보기"></iframe></div></div>`,btn('닫기','close'));break}
case'new-product':case'edit-product':{const p=a==='edit-product'?db.products[id]:null;formDialog('상품페이지 '+(p?'수정':'등록'),`${field('상품명','name',p?.name||'','text',true)}${selectField('상품군','category',['창호','주방','욕실'],p?.category||'창호')}${field('랜딩페이지 URL','url',p?.url||'','url')}${field('간단 소개','desc',p?.desc||'')}`,'product','상품 판매 페이지의 링크를 관리합니다.',p?`data-id="${id}"`:'');break}
case'new-label':formDialog('진행라벨 추가',field('라벨명','name','','text',true)+field('색상','color','#7396dd','color'),'label');break;
case'new-user':openUserDialog(null);break;
case'edit-user':openUserDialog(id);break;
case'logout':logoutSession(false);break;
case'toggle-user-menu':{
    const idx = db.users.findIndex(x => Number(x.id) === Number(id));
    if (idx === -1) break;
    const u = normalizeUserRecord(db.users[idx], idx);
    const mKey = el.dataset.menu;
    const cur = getUserAllowedMenuKeys(u);
    const has = cur.includes(mKey);
    const next = has ? cur.filter(k => k !== mKey) : [...cur, mKey];
    await saveUserMenusQuick(u.id, next);
    break;
  }
case'user-menus-all':{
    await saveUserMenusQuick(id, [...ALL_MENU_KEYS], '모든 메뉴(7개) 표시로 설정했습니다.');
    break;
  }
case'user-menus-default':{
    const idx = db.users.findIndex(x => Number(x.id) === Number(id));
    if (idx === -1) break;
    const u = normalizeUserRecord(db.users[idx], idx);
    const defMenus = getDefaultMenusByRole(u.role);
    await saveUserMenusQuick(u.id, defMenus, `${u.name}님의 역할(${u.role_label}) 기본 메뉴로 복원했습니다.`);
    break;
  }
case'switch-user-view':{
    const targetUsername = el.dataset.username;
    if (!targetUsername) break;
    setMobileNav(false);
    query='';stageFilter='';partnerFilter='';selected.clear();customerTab='all';
    closeDialog();
    await apiSwitchRole(targetUsername);
    await syncFromServer();
    render();
    const switched = getActiveUser();
    toast(`${switched.name} (${switched.role_label}) 화면으로 전환했습니다. 허용 메뉴 ${getUserAllowedMenuKeys(switched).length}개가 표시됩니다.`);
    break;
  }
case'dlg-menu-all':{
    const form = $('#user-perm-form');
    if (form) {
      $$('input[name="allowed_menu"][type="checkbox"]', form).forEach(inp => { inp.checked = true; });
      syncDialogMenuCards();
    }
    break;
  }
case'dlg-menu-role-default':{
    const form = $('#user-perm-form');
    if (form) {
      const roleVal = $('#user-role-select', form)?.value || 'consultant';
      const def = getDefaultMenusByRole(roleVal);
      $$('input[name="allowed_menu"][type="checkbox"]', form).forEach(inp => {
        inp.checked = inp.dataset.locked === '1' ? true : def.includes(inp.value);
      });
      syncDialogMenuCards();
    }
    break;
  }
case'open-form-editor':{
  openFormEditor(Number(id));
  break;
}
case'open-form-preview':{
  openFormPreview(Number(id));
  break;
}
case'open-form-preview-by-app':{
  const appId = el.dataset.appId;
  const fIdx = Math.max(0, (db.forms || []).findIndex(f => f.name.includes('렌탈') || f.id === 'rental_privacy'));
  openFormPreview(fIdx >= 0 ? fIdx : 0, appId);
  break;
}
case'upload-form-pdf-btn':{
  const formIdx = Number(id);
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.pdf';
  inp.onchange = async (ev) => {
    const file = ev.target.files?.[0];
    if (file) {
      await handleFormPdfUpload(formIdx, file);
      render();
    }
  };
  inp.click();
  break;
}
case'edit-form':{const f=db.forms[id];formDialog('양식 편집',`<div class="field"><label>${esc(f.name)} · 현재 v${f.version}.0</label><textarea name="text" style="min-height:230px" required>${esc(f.text)}</textarea></div><div class="notice-text">저장 시 새 버전으로 생성합니다. 본문은 검토용 예시이며 실제 접수 전 확정이 필요합니다.</div>`,'consent','',`data-id="${id}"`);break}
case'new-form':{formDialog('새 양식 등록 (렌탈 동의서)',`<div class="notice-text" style="margin-bottom:14px">렌탈 신청 및 전자계약에 사용할 양식을 등록합니다.<br>등록 후 <b>날짜 / 성명 / 서명 / 생년월일 / 연락처</b> 입력 위치를 드래그 편집할 수 있는 에디터가 즉시 실행됩니다.</div>${field('양식 명칭','name','(렌탈) 개인정보 동의서','text',true)}<div class="field"><label>양식 본문 내용 (필요 시 수정)</label><textarea name="text" style="min-height:160px" required>${esc(DEFAULT_RENTAL_PRIVACY_CONTENT)}</textarea></div>`,'create-form','새 양식 추가 및 에디터 실행');break}
case'delete-form':{
  const target=db.forms[id];
  if(!target)break;
  if(db.forms.length<=1){toast('최소 1개 이상의 양식 및 동의서는 유지되어야 합니다.');break}
  if(!confirm(`'${target.name}' 양식을 정말 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`))break;
  const formId=target.id;
  if(formId){
    try{
      const res=await apiFetch('/api/settings/forms/'+encodeURIComponent(formId),{method:'DELETE'});
      const resData=await res.json().catch(()=>({}));
      if(!res.ok){toast(resData.error||'양식 삭제에 실패했습니다.');break}
      if(Array.isArray(resData.forms)){
        db.forms=resData.forms;
      }else{
        db.forms=db.forms.filter((_,idx)=>idx!==Number(id)&&_.id!==formId);
      }
      save();render();toast(`[${target.name}] 양식을 삭제했습니다.`);break;
    }catch{}
  }
  db.forms=db.forms.filter((_,idx)=>idx!==Number(id));
  save();render();toast(`[${target.name}] 양식을 삭제했습니다.`);break;
}
case'integration':{
    if (el.dataset.name === '문자·알림톡') {
      openMessagingIntegrationDialog();
    } else {
      openDialog(esc(el.dataset.name)+' 연결 안내', '<div class="dialog-body"><div class="notice-text">운영 계약 및 API 인증키 등록 후 실시간 연동됩니다.</div><div class="mini-stat"><span>운영 준비</span><b>사업자·계약 조건 확정</b></div><div class="mini-stat"><span>개발 준비</span><b>API·서버 인증 연결</b></div><div class="mini-stat"><span>오픈 검증</span><b>테스트 및 처리 결과 대조</b></div></div>');
    }
    break;
  }
case'reset-data':formDialog('운영 데이터 초기화',`<div class="notice-text" style="margin-bottom:20px">고객·견적·계약·렌탈·파트너·광고링크 데이터를 모두 비우고 기본 설정(최고관리자·기본 상품·동의서 양식)만 남깁니다.</div>${field('확인 문구 · 초기화','confirm','','text',true)}`,'reset');break;
case'request-quote':{const c=accessibleC(id);c.status='가견적요청';audit(id,'파트너 가견적 요청');render();openCustomer(id,'quotes');toast('견적 요청을 등록했습니다.');break}
}});
document.addEventListener('input',e=>{
  if (e.target.name === 'phone' || e.target.type === 'tel' || e.target.id === 'phone' || e.target.id?.includes('phone')) {
    const rawVal = e.target.value;
    const formatted = formatPhoneNumber(rawVal);
    if (rawVal !== formatted) {
      e.target.value = formatted;
    }
  }
  if(e.target.dataset.money)formatMoneyInput(e.target);
  if(e.target.id==='customer-search'){query=e.target.value;$('#customer-rows').innerHTML=customerRows();$('#list-count').innerHTML=`검색 결과 <strong>${filteredCustomers().length}</strong>건`}
  if(e.target.id==='product-link-search'){
    productLinkQuery = e.target.value;
    const tb = $('#landing-links-tbody');
    if (tb) tb.innerHTML = renderLandingLinksRows(getFilteredLandingLinks());
  }
  if(e.target.closest('#clone-link-form')){
    if(e.target.id==='clone-link-channel'){
      const vNow = e.target.value.trim();
      $$('.ad-ch-chip').forEach(b => b.classList.toggle('active', b.dataset.value === vNow));
    }
    syncCloneLinkUrlPreview();
  }
  if(e.target.id==='quote-cust-picker-search'){
    custPickerQuery = e.target.value;
    const listEl = $('#quote-cust-picker-list');
    if (listEl) listEl.innerHTML = renderCustPickerRows();
  }
  if(['margin-input','margin-range'].includes(e.target.id)&&editor){
    editor.margin = Math.max(0, Math.min(500, Number(e.target.value) || 0));
    if(e.target.id==='margin-range') $('#margin-input').value = editor.margin;
    else if ($('#margin-range')) $('#margin-range').value = Math.min(200, Math.max(50, editor.margin));
    const onlyMaterial = editor.marginScope !== 'all';
    editor.items.forEach((it, idx) => {
      const isExtra = isExtraQuoteItem(it);
      if (onlyMaterial && isExtra) {
        // 자재에만 적용 모드일 때는 기타견적(철거/양중 등)의 마진율을 변경하지 않음 (100% 유지)
        return;
      }
      it.margin_rate = editor.margin;
      const mInp = $(`.qt-margin-input[data-item="${idx}"]`);
      if (mInp) mInp.value = editor.margin;
      const r = calcEditorItemRow(it, editor.margin);
      const totCell = $('#item-total-' + idx);
      if (totCell) totCell.innerHTML = `<b>${won(r.saleTotal)}</b><small>10원절삭 · VAT별도</small>`;
    });
    const subBar = $('#editor-subtotals-bar');
    if (subBar) subBar.innerHTML = editorSubtotalsBarHtml();
    const sumBox = $('#quote-summary');
    if (sumBox) sumBox.innerHTML = editorSummary();
    syncEditorLivePreview();
  }
  if(e.target.dataset.item!==undefined&&editor){
    const i = Number(e.target.dataset.item), k = e.target.dataset.key;
    if (!editor.items[i] || k === 'category') return;
    if (k === 'name' || k === 'spec') {
      editor.items[i][k] = e.target.value;
    } else if (k === 'margin_rate') {
      editor.items[i].margin_rate = Math.max(0, Math.min(500, Number(e.target.value) || 0));
    } else if (k === 'cost_total') {
      const nextCost = Math.max(0, parseNum(e.target.value));
      editor.items[i].cost_total = nextCost;
      const qty = Math.max(1, parseNum(editor.items[i].qty) || 1);
      editor.items[i].price = Math.round(nextCost / qty);
      editor.excelGrandTotal = null;
      editor.excelSubtotal = null;
    } else if (k === 'qty') {
      const nextQty = Math.max(1, parseNum(e.target.value) || 1);
      editor.items[i].qty = nextQty;
      if (editor.items[i].cost_total !== undefined) {
        editor.items[i].price = Math.round((Number(editor.items[i].cost_total) || 0) / nextQty);
      }
    }
    const r = calcEditorItemRow(editor.items[i], editor.margin ?? 100);
    const totCell = $('#item-total-' + i);
    if (totCell) totCell.innerHTML = `<b>${won(r.saleTotal)}</b><small>10원절삭 · VAT별도</small>`;
    const subBar = $('#editor-subtotals-bar');
    if (subBar) subBar.innerHTML = editorSubtotalsBarHtml();
    const sumBox = $('#quote-summary');
    if (sumBox) sumBox.innerHTML = editorSummary();
    syncEditorLivePreview();
  }
  if(e.target.id==='quote-title'&&editor){editor.title=e.target.value;syncEditorLivePreview();}
  if(e.target.id==='discount-input'&&editor){
    editor.discount = Math.max(0, parseNum(e.target.value));
    const sumBox = $('#quote-summary');
    if (sumBox) sumBox.innerHTML = editorSummary();
    syncEditorLivePreview();
  }
  if(e.target.id==='editor-site-notes'&&editor){
    if (!editor.meta) editor.meta = {};
    editor.meta.site_notes = e.target.value;
    syncEditorLivePreview();
  }
  if(e.target.id==='send-message'&&sendState){sendState.message=e.target.value;if(sendState.previewTab==='message')renderSendRightPreview();}
  if(e.target.id==='send-phone'&&sendState){sendState.recipientPhone=e.target.value;if(sendState.previewTab==='message'&&sendState.channel==='sms')renderSendRightPreview();}
});
document.addEventListener('focusout',e=>{if(e.target.dataset?.money&&!e.target.value.trim())e.target.value='0'});
function parseCSV(text){const rows=[];let row=[],cell='',inside=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(inside&&text[i+1]==='"'){cell+='"';i++}else inside=!inside}else if(c===','&&!inside){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!inside){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows}
document.addEventListener('change',async e=>{const el=e.target,id=el.id;if(el.name==='color'&&el.closest('#contract-status-color-picker')){$$('#contract-status-color-picker .badge-color-opt').forEach(lbl=>{lbl.classList.toggle('is-selected',Boolean($('input[name="color"]',lbl)?.checked))});return}if(id==='contract-form-cid'&&el.tagName==='SELECT'){const selC=accessibleC(el.value);const amtEl=$('#amount');if(selC&&amtEl){const nextAmt=selC.finalQuote?.totalPrice||selC.roughQuote?.totalPrice||selC.quote||0;amtEl.value=num(nextAmt);}return}if(id==='contract-form-type'){const stSel=$('#contract-form-status');if(stSel){const names=getContractStatusNames();if(el.value==='렌탈'&&names.includes('약정대기'))stSel.value='약정대기';else if(el.value!=='렌탈'&&names.includes('계약체결'))stSel.value='계약체결';}return}if(el.name==='allowed_menu'){syncDialogMenuCards();return}if(id==='user-role-select'){const form=el.closest('#user-perm-form');if(form&&form.dataset.mode==='create'){const def=getDefaultMenusByRole(el.value);$$('input[name="allowed_menu"][type="checkbox"]',form).forEach(inp=>{inp.checked=inp.dataset.locked==='1'?true:def.includes(inp.value)});syncDialogMenuCards()}return}if(el.dataset.selectAll){
  const scope=el.dataset.selectAll;
  const cs=visibleCustomers();
  let targetIds=[];
  if(scope==='customers') targetIds=filteredCustomers().map(c=>c.id);
  else if(scope==='quotes'){const {allRows,inquiryRows}=getQuoteRows();targetIds=(quoteTab==='inquiries'?inquiryRows:allRows).map(c=>c.id);}
  else if(scope==='contracts'){
    const items=db.contracts.filter(k=>cs.some(c=>c.id===k.cid));
    const apps=db.applications.filter(k=>cs.some(c=>c.id===k.cid));
    const shownContracts=items.filter(k=>contractTab==='all'||isCashContract(k));
    targetIds=[...new Set((contractTab==='rental'?apps:shownContracts).map(x=>Number(x.cid)).filter(Boolean))];
  }
  targetIds.forEach(cid=>el.checked?selected.add(cid):selected.delete(cid));
  const keepY=window.scrollY;
  render();
  window.scrollTo(0,keepY);
  return;
}
if(el.dataset.select){const n=Number(el.dataset.select);el.checked?selected.add(n):selected.delete(n);const keepY=window.scrollY;render();window.scrollTo(0,keepY);return}if(el.dataset.item!==undefined&&el.dataset.key==='category'&&editor){const idx=Number(el.dataset.item);if(editor.items[idx]){editor.items[idx].category=el.value==='extra'?'extra':'window';const tr=el.closest('tr');if(tr)tr.classList.toggle('is-extra',el.value==='extra');const subBar=$('#editor-subtotals-bar');if(subBar)subBar.innerHTML=editorSubtotalsBarHtml();const sumBox=$('#quote-summary');if(sumBox)sumBox.innerHTML=editorSummary();syncEditorLivePreview();}return}if(id==='role-switch'){
  const targetUser=el.value;
  const activeU=getActiveUser();
  if(targetUser && targetUser!==activeU.username){
    const u=new URL(location.href);
    u.searchParams.set('switch_user', targetUser);
    window.open(u.toString(), '_blank', 'noopener');
    const selectedLabel=el.options[el.selectedIndex]?.text||targetUser;
    el.value=activeU.username;
    toast(`${selectedLabel} 화면을 새 창으로 열었습니다.`);
  }
  return;
}if(id==='filter-product'){productFilter=el.value;render()}if(id==='filter-stage'){stageFilter=el.value;render()}if(id==='filter-partner'){partnerFilter=el.value;render()}if(id==='filter-source'){sourceFilter=el.value;linkFilter='';render()}if(id==='filter-period'){periodFilter=el.value;render()}if(id==='sort-order'){sortOrder=el.value;render()}if(id==='stats-period'){statsPeriod=el.value;render();refreshAnalytics(statsPeriod);}if(el.closest('#clone-link-form')){syncCloneLinkUrlPreview();}if(id==='quote-customer'){editor.cid=Number(el.value);renderEditor()}if(id==='quote-type'&&editor){editor.type=el.value;syncEditorLivePreview()}if(id==='quote-file'){const file=el.files[0];if(!file)return;editor.source=file.name;{
    const upNameEl = $('#upload-name');
    if (upNameEl) upNameEl.textContent = file.name;
    const formData = new FormData();
    formData.append('file', file);
    if (editor.cid) formData.append('projectId', editor.cid);
    toast('KCC 원본 견적 파일 분석 중...');
    try {
      const res = await apiFetch('/api/quotes/parse-file', { method: 'POST', body: formData });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '분석 실패');
      const d = resData.data;
      editor.meta = d.meta || null;
      editor.excelGrandTotal = d.supply_cost || (d.total_cost + Math.round(d.total_cost * 0.1));
      editor.excelSubtotal = d.total_cost || 0;
      editor.margin = 100;
      editor.marginScope = 'material'; // 기본값: 자재만 적용 (기타견적 100% 유지)
      if (d.meta?.pyeong_type && editor.title) {
        const cCur = findC(editor.cid);
        editor.title = `${cCur?.product || '창호'} ${d.meta.pyeong_type} 상세 견적서`;
      }
      editor.items = (d.items || []).map(it => ({
        name: it.name,
        spec: it.spec || '',
        category: it.category || 'window',
        detail: it.detail_json ? (typeof it.detail_json === 'string' ? JSON.parse(it.detail_json) : it.detail_json) : (it.detail || undefined),
        qty: Number(it.quantity) || 1,
        price: Number(it.cost_unit_price) || 0,
        cost_total: Number(it.cost_total) || ((Number(it.cost_unit_price) || 0) * (Number(it.quantity) || 1)),
        margin_rate: Number(it.margin_rate ?? 100)
      }));
      editor.showLivePreview = true;
      renderEditor();
      toast(`KCC 견적서 불러오기 완료: 총 ${d.item_count}개 항목 · 공급원가 ${won(editor.excelGrandTotal)} · 모바일 미리보기가 실행되었습니다.`);
    } catch (err) {
      toast('파일 분석 오류: ' + err.message);
    }
  }}});
document.addEventListener('submit',async e=>{const f=e.target;if(!f.dataset.submit)return;e.preventDefault();const d=Object.fromEntries(new FormData(f));const id=f.dataset.id;switch(f.dataset.submit){case'customer':{
    const phone=d.phone.replace(/\D/g,'');
    if(phone.length<10||phone.length>11){toast('연락처를 확인해 주세요.');return}
    const baseAddr=(d.addressBase||d.address||'').trim();
    const detailAddr=(d.addressDetail||'').trim();
    const fullAddress=[baseAddr,detailAddr].filter(Boolean).join(' ');
    if(!fullAddress){toast('공사 주소를 입력해 주세요.');return}
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        body: {
          name: d.name.trim(),
          phone: d.phone.trim(),
          address: fullAddress,
          product: d.product,
          partner: d.partner,
          owner: d.owner,
          source: d.source || '직접등록',
          adCampaign: d.adCampaign || '',
          note: d.note || ''
        }
      });
      const cData = await res.json();
      if (res.ok) {
        await syncFromServer();
        closeDialog();
        query='';customerTab='all';stageFilter='';productFilter='';partnerFilter='';sourceFilter='';linkFilter='';periodFilter='all';
        render();
        toast('새 고객과 공사건이 서버 DB에 등록되었습니다. (No. ' + cData.id + ')');
        break;
      }
    } catch (err) {}
    const cid=Math.max(...db.customers.map(c=>c.id),1000)+1;
    const isoNow=new Date().toISOString();
    const todayKst=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
    db.customers.unshift({id:cid,name:d.name.trim(),phone:d.phone.trim(),address:fullAddress,product:d.product,status:'신규접수',label:'일반',source:d.source||'직접등록',adChannel:d.source||'직접등록',adCampaign:d.adCampaign||'',partner:d.partner,owner:d.owner,date:todayKst,createdAt:isoNow,updatedAt:isoNow,note:d.note||'신규 고객이 등록되었습니다.',feedback:'등록된 피드백이 없습니다.',measure:'',build:'',quote:0,viewed:false});
    audit(cid,'관리자 직접 등록');closeDialog();query='';customerTab='all';stageFilter='';productFilter='';partnerFilter='';sourceFilter='';linkFilter='';periodFilter='all';render();toast('새 고객과 공사건을 등록했습니다.');break;
  }
case'note':{
    const c=accessibleC(id);
    if(!c)break;
    const text=d.note.trim();
    if(!text)return;
    if(f.dataset.submitting==='1')return;
    f.dataset.submitting='1';
    const submitBtn=f.querySelector('button[type="submit"]');
    if(submitBtn)submitBtn.disabled=true;
    const type=f.dataset.type==='feedback'?'feedback':'notes';
    const authorName=getActiveUser().name||(role==='본사 관리자'?'김지훈':'파트너 관리자');
    const createdAtIso=new Date().toISOString();
    try {
      const res = await apiFetch('/api/customers/' + c.id + '/notes', {
        method: 'POST',
        body: { type, note: text, important: !!d.important }
      });
      if (res.ok) {
        const entry={date:now(),by:authorName,text,important:!!d.important,type,createdAt:createdAtIso};
        const curLogs=Array.isArray(db.notes[c.id])?[...db.notes[c.id]]:[];
        curLogs.unshift(entry);
        db.notes[c.id]=curLogs;
        if(type==='feedback'){c.feedback=text;c.feedbackMeta={date:entry.date,by:authorName};}
        else{c.note=text;c.noteMeta={date:entry.date,by:authorName};}
        audit(c.id,(type==='feedback'?'피드백 등록 · ':'상담 이력 등록 · ')+text.slice(0,50));
        openCustomer(c.id, type);
        const rowsEl=$('#customer-rows');
        if(page==='customers'&&rowsEl)rowsEl.innerHTML=customerRows();
        toast((type==='feedback'?'피드백':'상담 기록') + '이 서버에 저장되었습니다.');
        await syncFromServer();
        await loadCustomerDetail(c.id, { force: true });
        break;
      }
      let errMsg='기록 저장에 실패했습니다.';
      try{const errData=await res.json();if(errData?.error)errMsg=errData.error;}catch{}
      toast(errMsg);
      break;
    } catch (err) {
      if (authToken) {
        toast('서버 연결 오류로 기록을 저장하지 못했습니다.');
        break;
      }
    } finally {
      if(f.isConnected){
        delete f.dataset.submitting;
        if(submitBtn)submitBtn.disabled=false;
      }
    }
    const curLogs=Array.isArray(db.notes[c.id])?[...db.notes[c.id]]:[];
    curLogs.unshift({date:now(),by:authorName,text,important:!!d.important,type,createdAt:createdAtIso});
    db.notes[c.id]=curLogs;
    if(type==='feedback')c.feedback=text;else c.note=text;
    audit(c.id,(type==='feedback'?'피드백':'상담이력')+' 등록');render();openCustomer(c.id,type);toast('기록을 저장했습니다.');break;
  }
case'schedule':{const c=accessibleC(d.cid);if(!c)break;c.measure=d.date;c.status='실측예정';audit(c.id,`실측 예정 ${d.date} ${d.time}`);closeDialog();render();toast('실측 일정을 체험 데이터에 등록했습니다.');break}
case'assign':for(const cid of selected){const c=accessibleC(cid);if(c){const prev=c.owner;c.owner=d.owner;audit(cid,`담당자 ${prev} → ${d.owner}`)}}selected.clear();closeDialog();render();toast('담당자를 배정했습니다.');break;
case'rough-quote-link':{
    const c=accessibleC(id);
    const url=normalizeURL(d.url);
    if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}
    try { const res = await apiFetch('/api/customers/' + id, { method: 'PATCH', body: { roughQuoteUrl: url } }); if (res.ok) await syncFromServer(); } catch {}
    c.roughQuoteUrl=url;audit(id,url?'가견적 링크 등록·수정':'가견적 링크 제거');openCustomer(id,detailTab||'notes');toast(url?'가견적 링크를 저장했습니다.':'가견적 링크를 제거했습니다.');break;
  }
  case'final-quote-link':{
    const c=accessibleC(id);
    const url=normalizeURL(d.url);
    if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}
    try { const res = await apiFetch('/api/customers/' + id, { method: 'PATCH', body: { finalQuoteUrl: url } }); if (res.ok) await syncFromServer(); } catch {}
    c.finalQuoteUrl=url;audit(id,url?'최종견적 링크 등록·수정':'최종견적 링크 제거');openCustomer(id,detailTab||'notes');toast(url?'최종견적 링크를 저장했습니다.':'최종견적 링크를 제거했습니다.');break;
  }
  case'drawing':{
    const c=accessibleC(id);
    const url=normalizeURL(d.url);
    if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}
    try { const res = await apiFetch('/api/customers/' + id, { method: 'PATCH', body: { drawing: url } }); if (res.ok) await syncFromServer(); } catch {}
    c.drawing=url;audit(id,url?'내관도 링크 등록·수정':'내관도 링크 제거');openCustomer(id,detailTab||'files');toast(url?'내관도 링크를 저장했습니다.':'내관도 링크를 제거했습니다.');break;
  }
case'contract':{
    const c = accessibleC(d.cid);
    if (!c) {
      toast('계약 대상 고객을 찾을 수 없습니다.');
      return;
    }
    const amt = Math.max(0, parseNum(d.amount ?? c.quote ?? 0));
    const contractType = (d.type || '일시불(현금)').trim();
    const contractStatus = (d.status || (contractType === '렌탈' ? '약정대기' : '계약체결')).trim();
    const contractNote = (d.note || '').trim();
    const fromCustomerId = f.dataset.fromCustomer ? Number(f.dataset.fromCustomer) : null;
    const returnTab = f.dataset.returnTab || 'notes';
    const prevCustStatus = c.status;

    try {
      const res = await apiFetch('/api/contracts', {
        method: 'POST',
        body: {
          projectId: c.id,
          type: contractType,
          amount: amt,
          depositAmount: contractType === '렌탈' ? 0 : Math.round(amt * 0.3),
          balanceAmount: contractType === '렌탈' ? amt : (amt - Math.round(amt * 0.3)),
          status: contractStatus,
          note: contractNote
        }
      });
      const cData = await res.json().catch(() => ({}));
      if (res.ok) {
        await syncFromServer();
        const refreshedC = accessibleC(c.id) || c;
        refreshedC.status = '계약진행';
        audit(
          c.id,
          `계약 등록 (${cData.contractId || contractType} · ${won(amt)}) · 고객 상태 자동 변경: ${prevCustStatus} → 계약진행`
        );
        if (fromCustomerId) {
          render();
          openCustomer(c.id, returnTab);
          toast(`${c.name} 고객이 계약관리에 자동 등록되었으며, 고객 상태값이 [계약진행]으로 변경되었습니다.`);
        } else {
          closeDialog();
          page = 'contracts';
          contractTab = 'all';
          render();
          toast(`${c.name} 고객 계약(${cData.contractId || ''})이 계약관리에 등록되었습니다.`);
        }
        break;
      } else {
        toast(cData.error || '계약 등록에 실패했습니다.');
        return;
      }
    } catch {}

    const newIso = new Date().toISOString();
    const newId = 'C-' + Date.now().toString().slice(-8);
    db.contracts.unshift({
      id: newId,
      cid: c.id,
      customerName: c.name,
      product: c.product,
      type: contractType,
      amount: amt,
      paid: 0,
      status: contractStatus,
      note: contractNote,
      date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      createdAt: newIso,
      createdAtText: now()
    });
    if (contractType === '렌탈' && !db.applications.some(a => a.cid === c.id)) {
      db.applications.unshift({
        id: 'R-' + Date.now().toString().slice(-8),
        cid: c.id,
        customerName: c.name,
        product: c.product,
        plan: '60개월',
        monthly: Math.max(1000, Math.round((amt * 0.0222) / 1000) * 1000),
        status: '접수완료',
        date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
        createdAt: newIso,
        createdAtText: now()
      });
    }
    c.status = '계약진행';
    audit(c.id, `${contractType} 계약 등록 (${newId} · ${won(amt)}) · 고객 상태 자동 변경: ${prevCustStatus} → 계약진행`);
    save();
    if (fromCustomerId) {
      render();
      openCustomer(c.id, returnTab);
      toast(`${c.name} 고객이 계약관리에 자동 등록되었으며, 고객 상태값이 [계약진행]으로 변경되었습니다.`);
    } else {
      closeDialog();
      page = 'contracts';
      contractTab = 'all';
      render();
      toast('계약관리에 등록되었으며 고객 상태가 [계약진행]으로 변경되었습니다.');
    }
    break;
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
case'application':{
    try {
      const res = await apiFetch('/api/admin/rental-applications/' + encodeURIComponent(id) + '/review', {
        method: 'PATCH',
        body: {
          expectedVersion: Number(d.expectedVersion || 1),
          status: d.nextStatus,
          contractReference: (d.contractReference || '').trim() || undefined,
          checks: {
            id: Boolean(d.checkId),
            signature: Boolean(d.checkSig),
            consent: Boolean(d.checkConsent)
          },
          memo: (d.review || '').trim()
        }
      });
      const rawText = await res.text();
      let rData = {};
      try {
        rData = rawText ? JSON.parse(rawText) : {};
      } catch {
        rData = { error: `서버 응답 오류 (HTTP ${res.status}): ${rawText.slice(0, 80)}` };
      }
      if (!res.ok) {
        toast(rData.error || '검토 결과 저장에 실패했습니다.');
        if (res.status === 409) await openApplication(id);
        return;
      }
      await syncFromServer();
      await openApplication(id);
      toast('렌탈 신청 검토 결과가 서버에 저장되었습니다. (' + rData.statusLabel + ')');
    } catch (err) {
      toast('렌탈 검토 저장 오류: ' + err.message);
    }
    break;
  }
case'rental':{const step=Number(f.dataset.step);if(step===1){rentalDraft={...rentalDraft,name:d['r-name'],phone:d['r-phone'],address:d['r-address'],plan:d['r-plan']};rentalStep(2)}else if(step===2)rentalStep(3);else{if(d.signature.trim()!==rentalDraft.name.trim()){toast('신청자 이름과 동일하게 입력해 주세요.');return}const c=accessibleC(rentalDraft.cid);if(db.applications.some(a=>a.cid===c.id&&!['반려'].includes(a.status))){toast('해당 고객의 진행 중인 렌탈 신청이 이미 있습니다.');return}db.applications.unshift({id:'R-'+Date.now().toString().slice(-8),cid:c.id,customerName:c.name,product:c.product,plan:rentalDraft.plan,monthly:Math.round(c.quote*1.2/parseInt(rentalDraft.plan)/1000)*1000,status:'서류검토',date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),createdAt:new Date().toISOString(),createdAtText:now(),consent:true});c.status='계약진행';audit(c.id,'체험 렌탈 신청 접수');save();closeDialog();page='contracts';contractTab='rental';render();toast('체험 신청이 렌탈 신청 목록에 등록되었습니다.');}break}
case'my-profile':{
    const cleanName = (d.name || '').trim();
    const cleanPhone = (d.phone || '').trim();
    if (!cleanName) { toast('담당자 성명을 입력해 주세요.'); return; }
    if (!cleanPhone) { toast('대표 연락처를 입력해 주세요.'); return; }
    if (d.password && d.password.trim() && d.password.trim().length < 4) {
      toast('새 비밀번호는 4자리 이상 입력해 주세요.');
      return;
    }
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: {
          name: cleanName,
          phone: cleanPhone,
          email: (d.email || '').trim(),
          orgName: (d.orgName || '').trim(),
          password: (d.password || '').trim() || undefined
        }
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        await syncFromServer();
        closeDialog();
        render();
        toast(resData.message || '회원 정보가 성공적으로 수정되었습니다.');
        break;
      } else {
        toast(resData.error || '정보 수정에 실패했습니다.');
        return;
      }
    } catch (err) {
      toast('정보 수정 중 오류가 발생했습니다.');
    }
    break;
  }
case'partner':{
    const cleanName = (d.name || '').trim();
    if (!cleanName) { toast('파트너사명을 입력해 주세요.'); return; }
    const isEdit = Boolean(id);
    const cleanUname = (d.username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanPw = (d.password || '').trim();
    const cleanPh = (d.phone || '').trim();

    if (!isEdit) {
      if (!cleanUname) { toast('어드민 접속 및 서브도메인 아이디를 입력해 주세요.'); return; }
      if (!cleanPw || cleanPw.length < 4) { toast('비밀번호를 4자리 이상 입력해 주세요.'); return; }
      if (!cleanPh) { toast('대표 연락처를 입력해 주세요.'); return; }
    } else {
      // If editing and password provided, validate length
      if (cleanPw && cleanPw.length < 4) {
        toast('비밀번호를 4자리 이상 입력해 주세요.');
        return;
      }
    }

    try {
      const apiUrl = isEdit ? ('/api/partners/' + encodeURIComponent(id)) : '/api/partners';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(apiUrl, {
        method,
        body: {
          name: cleanName,
          person: (d.person || '').trim(),
          phone: cleanPh,
          email: (d.email || '').trim(),
          type: d.type || '인테리어',
          parentId: d.parentId ? Number(d.parentId) : null,
          username: cleanUname,
          password: cleanPw
        }
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        await syncFromServer();
        closeDialog();
        render();
        toast(resData.message || (isEdit ? '파트너 정보 및 계정이 수정되었습니다.' : `새 파트너 [${cleanName}] 및 어드민 계정이 등록되었습니다.`));
        break;
      } else {
        toast(resData.error || '파트너 저장에 실패했습니다.');
        return;
      }
    } catch (err) {
      console.warn('Partner save error:', err);
    }

    // Fallback in-memory
    if (db.partners.some(p => p.name === cleanName && p.id !== id && String(p.orgId) !== String(id))) {
      toast('같은 이름의 파트너가 있습니다.');
      return;
    }
    if (id) {
      const p = db.partners.find(x => x.id === id || String(x.orgId) === String(id) || x.name === cleanName);
      if (p) {
        Object.assign(p, {
          name: cleanName,
          person: (d.person || '').trim(),
          phone: cleanPh,
          email: (d.email || '').trim(),
          type: d.type || p.type || '인테리어',
          parentId: d.parentId !== undefined ? (d.parentId ? Number(d.parentId) : null) : p.parentId
        });
        if (cleanUname) p.username = cleanUname;
      }
      // Update or create linked user in memory
      let u = (db.users || []).find(x => x.org === cleanName || (p && p.orgId && x.org_id === p.orgId) || (cleanUname && x.username === cleanUname));
      if (u) {
        u.org = cleanName;
        if (cleanUname) u.username = cleanUname;
        if (d.person) u.name = d.person.trim();
        if (cleanPh) u.phone = cleanPh;
        if (d.email) u.email = d.email.trim();
      } else if (cleanUname) {
        db.users.push({
          id: Date.now(),
          org_id: p ? (p.orgId || p.id) : 999,
          org: cleanName,
          username: cleanUname,
          name: (d.person || cleanName).trim(),
          phone: cleanPh,
          email: (d.email || `${cleanUname}@example.com`).trim(),
          role: 'partner',
          role_label: '파트너 관리자',
          allowed_menus: ['customers', 'products', 'stats'],
          active: true
        });
      }
    } else {
      const newCode = 'P' + String(db.partners.length + 1).padStart(3, '0');
      db.partners.push({
        id: newCode,
        orgId: Date.now(),
        code: newCode,
        name: cleanName,
        person: (d.person || '').trim(),
        phone: cleanPh,
        email: (d.email || '').trim(),
        type: d.type || '인테리어',
        parentId: d.parentId ? Number(d.parentId) : null,
        level: d.parentId ? 2 : 1,
        active: true,
        username: cleanUname
      });
      if (cleanUname) {
        db.users.push({
          id: Date.now(),
          org_id: Date.now(),
          org: cleanName,
          username: cleanUname,
          name: (d.person || cleanName).trim(),
          phone: cleanPh,
          email: (d.email || `${cleanUname}@example.com`).trim(),
          role: 'partner',
          role_label: '파트너 관리자',
          allowed_menus: ['customers', 'products', 'stats'],
          active: true
        });
      }
    }
    save(); closeDialog(); render(); toast('파트너 정보를 저장했습니다.'); break;
  }
case'product':{
    if(!validateURL(d.url)){toast('올바른 URL을 입력해 주세요.');return}
    const prodObj = id!==undefined ? db.products[Number(id)] : null;
    try {
      const apiUrl = prodObj?.id ? ('/api/products/' + prodObj.id) : '/api/products';
      const method = prodObj?.id ? 'PATCH' : 'POST';
      const res = await apiFetch(apiUrl, { method, body: { name: d.name, category: d.category, desc: d.desc, url: d.url } });
      if (res.ok) {
        await syncFromServer();
        closeDialog();
        render();
        toast('상품페이지를 서버에 저장했습니다.');
        break;
      }
    } catch {}
    if(id!==undefined)Object.assign(db.products[Number(id)],d);else db.products.push({...d,icon:d.category==='창호'?'window':d.category==='주방'?'kitchen':'bath',color:'#edf3f9',views:0,active:!!d.url});
    save();closeDialog();render();toast('상품페이지를 저장했습니다.');break;
  }
case'clone-link':{
    const channelVal = (d.channel || '').trim();
    const nameVal = (d.name || '').trim();
    if (!channelVal) { toast('어디에 광고할지 광고채널을 입력해 주세요.'); return; }
    if (!nameVal) { toast('광고 캠페인 또는 링크 구분명을 입력해 주세요.'); return; }
    const prodId = d.productId ? Number(d.productId) : null;
    const prodObj = (db.products || []).find(p => Number(p.id) === prodId) || db.products[0];
    const targetUrl = prodObj?.url || '/landing/';
    const isEdit = Boolean(id);
    const payload = {
      productId: prodId,
      channel: channelVal,
      name: nameVal,
      medium: (d.medium || '').trim(),
      partnerName: (d.partnerName || '직영').trim(),
      code: (d.code || '').trim(),
      targetUrl,
      includeUtm: false,
      memo: (d.memo || '').trim(),
      isActive: isEdit ? Boolean(d.isActive) : true
    };
    let handledByServer = false;
    try {
      const res = await apiFetch(isEdit ? ('/api/products/links/' + id) : '/api/products/links', {
        method: isEdit ? 'PATCH' : 'POST',
        body: payload
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        handledByServer = true;
        if (Array.isArray(resData.landingLinks)) db.landingLinks = resData.landingLinks;
        save();
        await syncFromServer();
        closeDialog();
        render();
        if (!isEdit && resData.link) {
          const fullUrl = buildTrackingUrl(resData.link);
          try {
            await navigator.clipboard.writeText(fullUrl);
            toast(`[${channelVal} · ${nameVal}] 복제 링크를 생성하고 클립보드에 복사했습니다!`);
          } catch {
            toast(`[${channelVal} · ${nameVal}] 복제 광고링크가 생성되었습니다.`);
          }
        } else {
          toast('복제 광고링크 정보를 저장했습니다.');
        }
      } else if (res.status !== 404) {
        toast(resData.error || '복제 광고링크 저장에 실패했습니다.');
        return;
      }
    } catch {}
    if (!handledByServer) {
      db.landingLinks = Array.isArray(db.landingLinks) ? db.landingLinks : [];
      const genCode = payload.code || Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 5).padEnd(5, 'x');
      if (isEdit) {
        const idx = db.landingLinks.findIndex(x => Number(x.id) === Number(id));
        if (idx !== -1) {
          db.landingLinks[idx] = {
            ...db.landingLinks[idx],
            ...payload,
            code: genCode,
            productName: prodObj?.name || db.landingLinks[idx].productName || 'KCC 홈씨씨 창호',
            productCategory: prodObj?.category || db.landingLinks[idx].productCategory || '창호'
          };
        }
        save();
        closeDialog();
        render();
        toast('복제 광고링크 정보를 저장했습니다.');
      } else {
        const nextId = Math.max(0, ...db.landingLinks.map(x => Number(x.id) || 0)) + 1;
        const created = {
          id: nextId,
          code: genCode,
          productId: prodObj?.id || prodId || 1,
          productName: prodObj?.name || 'KCC 홈씨씨 창호',
          productCategory: prodObj?.category || '창호',
          name: nameVal,
          channel: channelVal,
          medium: payload.medium,
          campaign: nameVal,
          partnerName: payload.partnerName || '직영',
          targetUrl: payload.targetUrl || '/landing/',
          includeUtm: payload.includeUtm,
          memo: payload.memo,
          isActive: true,
          views: 0,
          leads: 0,
          quotes: 0,
          contracts: 0,
          conversionRate: 0
        };
        db.landingLinks.unshift(created);
        save();
        closeDialog();
        render();
        const fullUrl = buildTrackingUrl(created);
        try {
          await navigator.clipboard.writeText(fullUrl);
          toast(`[${channelVal} · ${nameVal}] 복제 링크를 생성하고 클립보드에 복사했습니다!`);
        } catch {
          toast(`[${channelVal} · ${nameVal}] 복제 광고링크가 생성되었습니다.`);
        }
      }
    }
    break;
  }
case'label':if(db.labels.some(l=>l.name===d.name.trim())){toast('이미 등록된 라벨입니다.');return}db.labels.push({name:d.name.trim(),color:d.color});save();closeDialog();render();toast('라벨을 추가했습니다.');break;
case'contract-status':{
    const stName = (d.name || '').trim();
    const stColor = (d.color || 'blue').trim();
    if (!stName) {
      toast('상태명을 입력해 주세요.');
      return;
    }
    const isEdit = Boolean(id);
    try {
      const url = isEdit ? ('/api/settings/contract-statuses/' + id) : '/api/settings/contract-statuses';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await apiFetch(url, { method, body: { name: stName, color: stColor } });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(resData.error || '계약·수납 상태값 저장에 실패했습니다.');
        return;
      }
      await syncFromServer();
      closeDialog();
      render();
      toast(isEdit ? `계약·수납 상태값 [${stName}]이(가) 수정되었습니다.` : `새 계약·수납 상태값 [${stName}]이(가) 추가되었습니다.`);
      break;
    } catch {}

    const list = getContractStatuses();
    if (list.some(x => x.name === stName && Number(x.id) !== Number(id))) {
      toast('이미 동일한 이름의 상태값이 있습니다.');
      return;
    }
    if (isEdit) {
      const target = list.find(x => Number(x.id) === Number(id));
      if (target) {
        const oldName = target.name;
        target.name = stName;
        target.color = stColor;
        if (oldName !== stName) {
          (db.contracts || []).forEach(k => { if (k.status === oldName) k.status = stName; });
        }
      }
      db.contractStatuses = list;
    } else {
      const nextId = Math.max(...list.map(x => Number(x.id) || 0), 0) + 1;
      const nextOrder = Math.max(...list.map(x => Number(x.sort_order) || 0), 0) + 1;
      db.contractStatuses = [...list, { id: nextId, name: stName, color: stColor, sort_order: nextOrder }];
    }
    save();
    closeDialog();
    render();
    toast(isEdit ? `계약·수납 상태값 [${stName}]이(가) 수정되었습니다.` : `새 계약·수납 상태값 [${stName}]이(가) 추가되었습니다.`);
    break;
  }
case'user':
case'edit-user':{
    const fd = new FormData(f);
    const rawMenus = [...new Set(fd.getAll('allowed_menu').filter(k => ALL_MENU_KEYS.includes(k)))];
    const uname = (d.username || '').trim();
    const uNameLabel = (d.name || '').trim();
    if (!uNameLabel || !uname) {
      toast('이름과 로그인 아이디를 입력해 주세요.');
      return;
    }
    if (uname === 'admin' && !rawMenus.includes('settings')) rawMenus.push('settings');
    const orderedMenus = ALL_MENU_KEYS.filter(k => rawMenus.includes(k));
    if (!orderedMenus.length) {
      toast('볼 수 있는 메뉴를 최소 1개 이상 선택해 주세요.');
      return;
    }

    const isEdit = f.dataset.submit === 'edit-user';
    const payload = {
      username: uname,
      name: uNameLabel,
      phone: (d.phone || '').trim(),
      email: (d.email || '').trim(),
      org: d.org || '라이프앤조이',
      role: d.role || 'consultant',
      allowed_menus: orderedMenus
    };
    if (d.password && String(d.password).trim()) {
      const cleanPw = String(d.password).trim();
      if (cleanPw.length < 4) {
        toast('비밀번호는 4자리 이상 입력해 주세요.');
        return;
      }
      payload.password = cleanPw;
    }

    try {
      const url = isEdit ? ('/api/auth/users/' + id) : '/api/auth/users';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await apiFetch(url, { method, body: payload });
      const resData = await res.json();
      if (!res.ok) {
        toast(resData.error || '사용자 저장에 실패했습니다.');
        return;
      }
      await syncFromServer();
      closeDialog();
      render();
      toast(isEdit
        ? `${uNameLabel}님의 정보와 표시 메뉴(${orderedMenus.length}개)가 저장되었습니다.`
        : `${uNameLabel} 사용자가 등록되었습니다. (허용 메뉴 ${orderedMenus.length}개)`);
      break;
    } catch {}

    if (isEdit) {
      const idx = db.users.findIndex(x => Number(x.id) === Number(id));
      if (idx !== -1) {
        const updated = normalizeUserRecord({ ...db.users[idx], ...payload, id: Number(id) }, idx);
        db.users[idx] = updated;
        const rIdx = userRoster.findIndex(x => x.username === updated.username || Number(x.id) === updated.id);
        if (rIdx !== -1) userRoster[rIdx] = updated;
      }
    } else {
      if (db.users.some(u => u.username === uname)) {
        toast('이미 사용 중인 아이디입니다.');
        return;
      }
      const nextId = Math.max(...db.users.map(u => Number(u.id) || 0), 0) + 1;
      const created = normalizeUserRecord({ ...payload, id: nextId, active: true }, db.users.length);
      db.users.push(created);
      userRoster.push(created);
    }
    save();
    closeDialog();
    render();
    toast(isEdit ? '사용자 정보 및 메뉴 권한을 저장했습니다.' : '새 사용자를 등록했습니다.');
    break;
  }
case'consent':{
  const form=db.forms[id];
  if(!form)break;
  const formId=form.id;
  if(formId){
    try{
      const res=await apiFetch('/api/settings/forms/'+encodeURIComponent(formId),{method:'PATCH',body:{text:d.text}});
      if(res.ok){
        const resData=await res.json().catch(()=>({}));
        form.previous??=[];
        form.previous.push({version:form.version,text:form.text});
        form.version=resData.version||(form.version+1);
        form.text=d.text;
        save();closeDialog();render();toast('새 양식 버전을 저장했습니다.');break;
      }
    }catch{}
  }
  form.previous??=[];
  form.previous.push({version:form.version,text:form.text});
  form.text=d.text;
  form.version++;
  save();closeDialog();render();toast('새 양식 버전을 저장했습니다.');break;
}
case'create-form':{
  const title=(d.name||'').trim();
  const text=(d.text||'').trim() || DEFAULT_RENTAL_PRIVACY_CONTENT;
  if(!title){toast('양식 명칭을 입력해 주세요.');break}
  let newIdx = 0;
  try{
    const res=await apiFetch('/api/settings/forms',{
      method:'POST',
      body:{
        name:title,
        text,
        fieldsConfig: DEFAULT_FORM_FIELDS
      }
    });
    if(res.ok){
      const resData=await res.json().catch(()=>({}));
      if(Array.isArray(resData.forms)){
        db.forms=resData.forms;
        newIdx = Math.max(0, db.forms.findIndex(f => f.name === title));
      }else{
        db.forms.push({id:'form_'+Date.now(),name:title,version:1,text,fieldsConfig:JSON.parse(JSON.stringify(DEFAULT_FORM_FIELDS))});
        newIdx = db.forms.length - 1;
      }
      save();closeDialog();render();
      toast(`[${title}] 양식을 등록했습니다. 필드 에디터를 실행합니다.`);
      setTimeout(() => openFormEditor(newIdx), 150);
      break;
    }
  }catch{}
  db.forms.push({id:'form_'+Date.now(),name:title,version:1,text,fieldsConfig:JSON.parse(JSON.stringify(DEFAULT_FORM_FIELDS))});
  newIdx = db.forms.length - 1;
  save();closeDialog();render();
  toast(`[${title}] 양식을 등록했습니다. 필드 에디터를 실행합니다.`);
  setTimeout(() => openFormEditor(newIdx), 150);
  break;
}
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
  case'quote-phone':{
    const phone = String(d.phone || '').trim();
    const managerName = String(d.managerName || '').trim();
    try {
      const res = await apiFetch('/api/settings/quote-phone', {
        method: 'PUT',
        body: { phone, managerName }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '저장에 실패했습니다.');
      quoteConsultPhone = String(resData.phone || '').trim();
      quoteConsultManagerName = String(resData.managerName || '').trim();
      try {
        localStorage.setItem('kcc_quote_consult_phone', quoteConsultPhone);
        localStorage.setItem('kcc_quote_consult_manager', quoteConsultManagerName);
      } catch {}
      render();
      toast((quoteConsultPhone || quoteConsultManagerName)
        ? '모바일 견적서 담당자 · 전화상담 설정이 저장되었습니다.'
        : '모바일 견적서 상담 설정이 기본값으로 초기화되었습니다.');
    } catch (err) {
      toast(err.message || '상담 설정 저장에 실패했습니다.');
    }
    break;
  }
  case'reset':{
    if(d.confirm!=='초기화'){toast('확인 문구에 초기화를 입력해 주세요.');return}
    try {
      const res = await apiFetch('/api/settings/reset', { method: 'POST', body: { confirm: '초기화' } });
      if (res.ok) {
        await apiSwitchRole(activeUsername || 'admin');
        await syncFromServer();
        selected.clear();
        closeDialog();
        render();
        toast('서버 데이터베이스 및 체험 데이터를 초기화했습니다.');
        break;
      }
    } catch {}
    db=initial();db.users=db.users.map((u,i)=>normalizeUserRecord(u,i));userRoster=[...db.users];activeUsername='admin';try{localStorage.setItem('kcc_active_username','admin');localStorage.removeItem('kcc_auth_token');sessionStorage.clear();}catch{}save();selected.clear();closeDialog();render();toast('운영 데이터를 클린 초기화했습니다.');break;
  }
}});
window.addEventListener('resize',()=>{if(window.innerWidth>900&&mobileNavOpen)setMobileNav(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.overlay')){closeDialog();return}if(e.key==='Escape'&&mobileNavOpen){setMobileNav(false);return}if(e.key==='Enter'&&e.target.matches('.customer-row'))e.target.click();if(e.key==='Tab'&&$('.dialog')){const els=$$('button:not(:disabled),a[href],input:not([type=hidden]),select,textarea,[tabindex="0"]',$('.dialog')).filter(el=>el.offsetParent!==null);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
const params=new URLSearchParams(location.search);if(params.has('demo_quote')){const c=findC(Number(params.get('demo_quote')));if(c?.quote){const q=db.quotes.filter(x=>x.cid===c.id).at(-1);$('#app').innerHTML=`<main style="padding:25px 10px;max-width:490px;margin:auto"><div class="notice-text" style="margin-bottom:15px;text-align:center">체험용 견적 화면 · 같은 브라우저의 예시 데이터를 조회합니다.<br>실제 고객 본인 인증과 공유 기능은 운영 연결 후 제공됩니다.</div>${quoteMarkup(c,q)}</main>`;$$('[data-action]').forEach(b=>{b.removeAttribute('data-action');b.disabled=true});}else{$('#app').innerHTML='<main><h2>체험용 견적이 없습니다.</h2><p>견적을 발행한 브라우저에서 링크를 확인해 주세요.</p><a href="./">관리자 화면으로</a></main>'}}else {
  const switchUserParam = params.get('switch_user') || params.get('as_user');
  if (switchUserParam) {
    (async () => {
      await apiSwitchRole(switchUserParam, { isolated: true });
      await syncFromServer();
      render();
      startRealtimeSync();
      const u = getActiveUser();
      toast(`[${u.org}] 파트너 어드민 새 창으로 접속했습니다.`);
    })();
  } else {
    if (!authToken) {
      render();
    } else {
      (async () => {
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + authToken }
          });
          if (!meRes.ok) {
            logoutSession(true);
            return;
          }
          const meData = await meRes.json().catch(() => ({}));
          if (meData.user) {
            const norm = normalizeUserRecord(meData.user);
            activeUsername = norm.username;
            role = isPartnerUser(norm) ? '파트너 관리자' : '본사 관리자';
          }
          await syncFromServer();
          render();
          startRealtimeSync();
        } catch {
          render();
          startRealtimeSync();
        }
      })();
    }
  }
}
