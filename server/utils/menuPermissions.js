export const ALL_MENUS = [
  { key: 'customers', label: '고객관리' },
  { key: 'quotes', label: '견적관리' },
  { key: 'contracts', label: '계약관리' },
  { key: 'payments', label: '카드결제' },
  { key: 'products', label: '상품관리' },
  { key: 'partners', label: '파트너관리' },
  { key: 'stats', label: '통계관리' },
  { key: 'settings', label: '설정' }
];

export const ALL_MENU_KEYS = ALL_MENUS.map(m => m.key);

export const MENU_LABEL_MAP = Object.fromEntries(ALL_MENUS.map(m => [m.key, m.label]));

export const ROLE_LABELS = {
  hq_admin: '최고관리자',
  consultant: '상담사',
  estimator: '견적 담당자',
  accountant: '회계·정산',
  partner: '파트너 관리자'
};

const ROLE_ALIAS_MAP = {
  hq_admin: 'hq_admin',
  '최고관리자': 'hq_admin',
  '운영관리자': 'hq_admin',
  '본사 관리자': 'hq_admin',
  consultant: 'consultant',
  '상담사': 'consultant',
  estimator: 'estimator',
  '견적 담당자': 'estimator',
  accountant: 'accountant',
  '회계·정산': 'accountant',
  '회계 담당자': 'accountant',
  partner: 'partner',
  '파트너 관리자': 'partner',
  '영업파트너': 'partner'
};

export function normalizeRoleCode(roleInput) {
  if (!roleInput) return 'consultant';
  const trimmed = String(roleInput).trim();
  return ROLE_ALIAS_MAP[trimmed] || 'consultant';
}

export function getDefaultMenusForRole(roleInput) {
  const role = normalizeRoleCode(roleInput);
  switch (role) {
    case 'hq_admin':
      return [...ALL_MENU_KEYS];
    case 'consultant':
    case 'estimator':
      return ['customers', 'quotes', 'contracts', 'payments', 'products'];
    case 'accountant':
      return ['customers', 'contracts', 'payments', 'stats'];
    case 'partner':
      return ['customers', 'products', 'stats'];
    default:
      return ['customers', 'quotes', 'contracts', 'payments', 'products'];
  }
}

export function parseAllowedMenus(raw, role, username = '') {
  let list = null;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const validSet = new Set(
    (list || []).filter(k => ALL_MENU_KEYS.includes(k))
  );

  if (validSet.size === 0) {
    for (const k of getDefaultMenusForRole(role)) {
      validSet.add(k);
    }
  }

  if (username === 'admin') {
    validSet.add('settings');
    validSet.add('payments');
  } else if (normalizeRoleCode(role) === 'hq_admin') {
    validSet.add('payments');
  }

  return ALL_MENU_KEYS.filter(k => validSet.has(k));
}

export function validateRequestedMenus(menusInput, username = '') {
  if (!Array.isArray(menusInput)) {
    return { ok: false, error: '메뉴 목록 형식이 올바르지 않습니다.' };
  }

  const validSet = new Set(menusInput.filter(k => ALL_MENU_KEYS.includes(k)));
  if (validSet.size === 0) {
    return { ok: false, error: '최소 1개 이상의 메뉴를 선택해 주세요.' };
  }

  if (username === 'admin' && !validSet.has('settings')) {
    return { ok: false, error: '최고관리자(admin) 계정의 [설정] 메뉴는 시스템 관리를 위해 해제할 수 없습니다.' };
  }

  const canonical = ALL_MENU_KEYS.filter(k => validSet.has(k));
  return { ok: true, menus: canonical };
}

export function serializeUser(row) {
  if (!row) return null;
  const roleCode = normalizeRoleCode(row.role);
  const allowedMenus = parseAllowedMenus(row.allowed_menus, roleCode, row.username);
  const subPartnerCount = Number(row.sub_partner_count || 0);

  // If a partner has child/sub-partners, grant them the 'partners' management menu dynamically
  if (roleCode === 'partner' && subPartnerCount > 0 && !allowedMenus.includes('partners')) {
    allowedMenus.push('partners');
  }

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    role: roleCode,
    role_label: ROLE_LABELS[roleCode] || row.role,
    active: Boolean(row.active),
    org_id: row.org_id,
    org_name: row.org_name || '라이프앤조이',
    org: row.org_name || '라이프앤조이',
    org_type: row.org_type || (roleCode === 'partner' ? 'partner' : 'hq'),
    parent_id: row.parent_id || null,
    level: row.level || 1,
    sub_partner_count: subPartnerCount,
    has_sub_partners: subPartnerCount > 0,
    allowed_menus: allowedMenus,
    created_at: row.created_at
  };
}
