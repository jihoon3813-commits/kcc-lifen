/**
 * Customer-Safe Mobile Quote Formatter
 * Strictly strips internal cost & margin and prepares structured data for the mobile estimate UI.
 */

export const maskName = name => {
  if (!name) return '';
  const clean = String(name).trim();
  if (clean.length <= 1) return clean;
  if (clean.length === 2) return clean[0] + '*';
  return clean[0] + '*'.repeat(clean.length - 2) + clean.slice(-1);
};

export const maskPhone = p => {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  }
  return String(p).replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
};

function sanitizeCustomerMeta(rawMeta) {
  if (!rawMeta) return null;
  let parsed = rawMeta;
  if (typeof rawMeta === 'string') {
    try {
      parsed = JSON.parse(rawMeta);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  // Strictly whitelist customer-safe quote header & site fields (never expose excel_grand_total / cost)
  const safe = {
    doc_title: parsed.doc_title || '',
    kcc_quote_no: parsed.kcc_quote_no || '',
    quote_date: parsed.quote_date || '',
    valid_period: parsed.valid_period || '',
    build_scheduled_date: parsed.build_scheduled_date || '',
    recipient: parsed.recipient || '',
    site_address: parsed.site_address || '',
    construction_included: parsed.construction_included || '',
    supplier_name: parsed.supplier_name || '',
    supplier_biz_no: parsed.supplier_biz_no || '',
    supplier_ceo: parsed.supplier_ceo || '',
    supplier_address: parsed.supplier_address || '',
    supplier_manager: parsed.supplier_manager || '',
    supplier_phone: parsed.supplier_phone || '',
    site_notes: parsed.site_notes || ''
  };

  const hasAny = Object.values(safe).some(v => String(v || '').trim() !== '');
  return hasAny ? safe : null;
}

function inferWindowDetail(item) {
  let parsed = null;
  if (item.detail_json) {
    try {
      parsed = typeof item.detail_json === 'string' ? JSON.parse(item.detail_json) : item.detail_json;
    } catch {
      parsed = null;
    }
  } else if (item.detail && typeof item.detail === 'object') {
    parsed = item.detail;
  }

  const excelProd = String(parsed?.excel_product || '').replace(/\s+/g, '');
  const isExtra =
    excelProd === '기타견적' ||
    excelProd === '기타' ||
    item.category === 'extra' ||
    (!excelProd &&
      item.category !== 'window' &&
      !parsed?.model &&
      /(철거|사다리|양중|보양|몰딩|마감|기타견적|폐기물)/.test(item.name || '') &&
      !/(창호|이중창|발코니|분합|통바|공틀)/.test(item.name || ''));

  if (isExtra) {
    return {
      category: 'extra',
      detail: {
        seq: parsed?.seq || undefined,
        excel_product: parsed?.excel_product || '기타견적',
        product_name: parsed?.product_name || parsed?.excel_product || '기타견적',
        model_name: parsed?.model_name || parsed?.model || item.name || '',
        location: parsed?.location || '',
        type: parsed?.type || '기타견적',
        model: parsed?.model || item.name || '',
        sub: parsed?.sub || parsed?.remark || (item.spec && item.spec !== '기본 시공' && item.spec !== '표준 규격' && item.spec !== '기타견적' ? item.spec : ''),
        remark: parsed?.remark || '',
        is_insulation: false,
        insulation: '',
        calc_date: parsed?.calc_date || ''
      }
    };
  }

  const name = item.name || '창호 시공';
  const defaultPanes = /(거실|안방|확장|3W)/.test(name) ? 3 : /(고정|픽스|1W|통바|공틀)/.test(name) ? 1 : 2;
  const defaultType = /(발코니)/.test(name)
    ? '발코니창141'
    : /(분합|공틀)/.test(name)
    ? '공틀창225'
    : /(이중창)/.test(name)
    ? '일반이중창230'
    : /(고정)/.test(name)
    ? '고정창'
    : 'KCC 홈씨씨 맞춤사양';

  const isInsulation = Boolean(parsed?.is_insulation || parsed?.insulation === '단열');

  return {
    category: 'window',
    detail: {
      seq: parsed?.seq || undefined,
      location: parsed?.location || '',
      excel_product: parsed?.excel_product || parsed?.product_name || defaultType,
      product_name: parsed?.product_name || parsed?.excel_product || defaultType,
      model_name: parsed?.model_name || parsed?.model || 'KCC HOMECC 정품 사양',
      model: parsed?.model || parsed?.model_name || 'KCC HOMECC 정품 사양',
      type: parsed?.type || defaultType,
      size: parsed?.size || item.spec || '현장 실측 규격',
      sub_size: parsed?.sub_size || '',
      shape: parsed?.shape || (defaultPanes === 3 ? '3W (1:2:1)' : defaultPanes === 2 ? '2W (1:1)' : '1W 고정'),
      open_dir: parsed?.open_dir || '',
      w: parsed?.w || '',
      w1: parsed?.w1 || '',
      w2: parsed?.w2 || '',
      h: parsed?.h || '',
      h1: parsed?.h1 || '',
      h2: parsed?.h2 || '',
      wrap_in: parsed?.wrap_in || '',
      wrap_out: parsed?.wrap_out || '',
      wrap: parsed?.wrap || '',
      is_insulation: isInsulation,
      insulation: isInsulation ? '단열' : (parsed?.insulation || ''),
      glass_thick_in: parsed?.glass_thick_in || '',
      glass_thick_out: parsed?.glass_thick_out || '',
      glass_type_in: parsed?.glass_type_in || '',
      glass_type_out: parsed?.glass_type_out || '',
      glass_in: parsed?.glass_in || '',
      glass_out: parsed?.glass_out || '',
      glass: parsed?.glass || '24T~28T 로이 복층유리',
      handle: parsed?.handle || (defaultPanes > 1 ? 'L-PLUS_N 자동/반자동 핸들' : '해당 없음'),
      handle_height: parsed?.handle_height || '',
      opt1: parsed?.opt1 || 'X',
      opt2: parsed?.opt2 || 'X',
      options: parsed?.options || '',
      mesh: parsed?.mesh || (/(발코니|이중창)/.test(name) ? '방충망 포함' : '현장 기준 적용'),
      drain: parsed?.drain || '',
      calc_date: parsed?.calc_date || '',
      remark: parsed?.remark || '',
      panes: Number(parsed?.panes) || defaultPanes,
      upgrade: Boolean(isInsulation || parsed?.upgrade || (parsed?.glass || '').includes('더블로이') || (parsed?.mesh || '').includes('STS'))
    }
  };
}

export function buildRentalPlans(cashPrice, discountAmount = 0, originalPrice = 0) {
  const total = Math.max(0, Math.round(Number(cashPrice) || 0));
  const discount = Math.max(0, Math.round(Number(discountAmount) || 0));
  const origTotal = originalPrice > 0 ? Math.round(Number(originalPrice)) : total + discount;
  const splitDeposit = Math.round(total / 2);
  const splitBalance = total - splitDeposit;

  // -------------------------------------------------------------
  // [렌탈금액 산정기준] (할인된 일시불 금액 기준)
  // 1) 월 111,000원 플랜: 할인 일시불금액 - 5,000,000원 = 초회납입금
  // 2) 월 222,000원 플랜: 할인 일시불금액 - 10,000,000원 = 초회납입금
  // 3) 월 333,000원 플랜: 할인 일시불금액 - 15,000,000원 = 초회납입금
  // ※ 모바일 견적서 렌탈금액표에서는 고객 부담 완화를 위해 '총액'을 노출하지 않음
  // -------------------------------------------------------------
  const upfront111 = Math.max(0, total - 5000000);
  const monthly111 = 111000;
  const total111 = upfront111 + monthly111 * 60;

  const upfront222 = Math.max(0, total - 10000000);
  const monthly222 = 222000;
  const total222 = upfront222 + monthly222 * 60;

  const upfront333 = Math.max(0, total - 15000000);
  const monthly333 = 333000;
  const total333 = upfront333 + monthly333 * 60;

  const fmtMan = v => {
    if (v <= 0) return '0원';
    if (v >= 10000 && v % 10000 === 0) {
      const man = v / 10000;
      return `${man.toLocaleString('ko-KR')}만원`;
    }
    if (v >= 1000 && v % 1000 === 0) {
      const man = Math.floor(v / 10000);
      const chun = (v % 10000) / 1000;
      return `${man > 0 ? man + '만' : ''}${chun}천원`;
    }
    return v.toLocaleString('ko-KR') + '원';
  };

  const plan111Obj = {
    key: 'plan111',
    tag: '월 111,000원',
    heading: '월 부담을 최소화하고 싶다면',
    mainLabel: '월 렌탈료',
    mainAmount: monthly111,
    upfront: upfront111,
    months: 60,
    total: total111,
    name: '월 111,000원 렌탈 플랜',
    detail: `초회납입금 ${upfront111.toLocaleString('ko-KR')}원 + 월 111,000원 (60개월)`,
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
    total: total222,
    name: '월 222,000원 렌탈 플랜',
    detail: `초회납입금 ${upfront222.toLocaleString('ko-KR')}원 + 월 222,000원 (60개월)`,
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
    total: total333,
    name: '월 333,000원 렌탈 플랜',
    detail: `초회납입금 ${upfront333.toLocaleString('ko-KR')}원 + 월 333,000원 (60개월)`,
    button: '월 333,000원 조건 상담하기'
  };

  return {
    cash: {
      key: 'cash',
      tag: discount > 0 ? '일시불 특별할인' : '일시불',
      heading: '총 납부금액을 줄이고 싶다면',
      mainLabel: discount > 0 ? '일시불 할인 적용가' : '일시불 예상 금액',
      mainAmount: total,
      originalAmount: origTotal,
      discountAmount: discount,
      deposit: splitDeposit,
      balance: splitBalance,
      total: total,
      name: discount > 0 ? '일시불 할인 결제' : '일시불 결제',
      detail: discount > 0
        ? `정상가 ${origTotal.toLocaleString('ko-KR')}원 → ${discount.toLocaleString('ko-KR')}원 할인 · 선금 50% / 잔금 50%`
        : `총 ${total.toLocaleString('ko-KR')}원 · 선금 50% / 잔금 50%`,
      button: '일시불 결제 상담하기'
    },
    plan111: plan111Obj,
    plan222: plan222Obj,
    plan333: plan333Obj,
    // 하위 호환 매핑:
    // lowmonthly(월부담 최소) -> plan111 (월 111,000원)
    // lowupfront(초기부담 최소) -> plan222 (월 222,000원)
    lowmonthly: { ...plan111Obj, key: 'lowmonthly' },
    lowupfront: { ...plan222Obj, key: 'lowupfront' }
  };
}

export function formatCustomerSafeQuote(quote, rawItems = []) {
  const cashPrice = Number(quote.total_price) || 0;
  const discountAmount = Math.max(0, Number(quote.discount_amount) || 0);
  const originalPrice = Number(quote.original_price) > 0
    ? Number(quote.original_price)
    : cashPrice + discountAmount;
  const splitDeposit = Math.round(cashPrice / 2);
  const splitBalance = cashPrice - splitDeposit;

  let calcMaterialSub = 0;
  let calcExtraSub = 0;
  let runningVatInc = 0;

  // Map items strictly without cost/margin
  const safeItems = rawItems.map((it, idx) => {
    const { category, detail } = inferWindowDetail(it);
    const saleTotal = Number(it.sale_total) || 0;
    const saleUnitPrice = Number(it.sale_unit_price) || 0;

    if (category === 'extra') {
      calcExtraSub += saleTotal;
    } else {
      calcMaterialSub += saleTotal;
    }

    const baseTotalSale = Number(quote.sale_price) || 1;
    let amountVatInc = Math.round((saleTotal / baseTotalSale) * originalPrice);
    if (idx === rawItems.length - 1 && rawItems.length > 0 && originalPrice > 0) {
      const diff = originalPrice - (runningVatInc + amountVatInc);
      if (Math.abs(diff) <= 500) {
        amountVatInc += diff;
      }
    }
    runningVatInc += amountVatInc;

    return {
      sort_order: it.sort_order ?? idx + 1,
      name: it.name,
      spec: it.spec || detail.size || '',
      category,
      detail,
      quantity: Number(it.quantity) || 1,
      sale_unit_price: saleUnitPrice,
      sale_total: saleTotal,
      amount_vat_inc: amountVatInc
    };
  });

  const materialSubtotal =
    Number(quote.material_subtotal) > 0 || (Number(quote.extra_subtotal) > 0 && calcMaterialSub === 0)
      ? Number(quote.material_subtotal) || 0
      : calcMaterialSub;
  const extraSubtotal =
    Number(quote.extra_subtotal) > 0 || (Number(quote.material_subtotal) > 0 && calcExtraSub === 0)
      ? Number(quote.extra_subtotal) || 0
      : calcExtraSub;

  const salePrice = Number(quote.sale_price) || (materialSubtotal + extraSubtotal);
  const vat = Number(quote.vat) || Math.round(salePrice * 0.1);
  const safeMeta = sanitizeCustomerMeta(quote.meta_json || quote.meta);

  return {
    id: quote.id,
    project_id: quote.project_id,
    quote_no: String(quote.project_id || quote.id || 0).padStart(4, '0'),
    version: quote.version || 1,
    title: quote.title || '맞춤 창호 견적서',
    quote_type: quote.quote_type || '가견적',
    access_token: quote.access_token || '',
    customer_name: quote.customer_name || '고객',
    customer_phone: maskPhone(quote.customer_phone || ''),
    customer_address: quote.customer_address || safeMeta?.site_address || '',
    product: quote.product || '창호',
    drawing_url: quote.drawing_url || '',
    material_subtotal: materialSubtotal,
    extra_subtotal: extraSubtotal,
    sale_price: salePrice,
    vat,
    original_price: originalPrice,
    discount_amount: discountAmount,
    total_price: cashPrice,
    split_deposit: splitDeposit,
    split_balance: splitBalance,
    plans: buildRentalPlans(cashPrice, discountAmount, originalPrice),
    meta: safeMeta,
    manager_name: quote.owner_name && quote.owner_name !== '미배정' ? quote.owner_name : '전담 상담사',
    manager_phone: quote.manager_phone || quote.org_phone || '1588-0000',
    partner_name: quote.partner_name || '(주)라이프앤조이',
    published_at: quote.published_at || new Date().toISOString(),
    items: safeItems
  };
}
