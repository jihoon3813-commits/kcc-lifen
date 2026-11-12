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

  const isExtra = item.category === 'extra' || (
    !parsed?.model &&
    /(철거|사다리|양중|보양|몰딩|마감|기타견적|폐기물)/.test(item.name || '') &&
    !/(창호|이중창|발코니|분합)/.test(item.name || '')
  );

  if (isExtra) {
    return {
      category: 'extra',
      detail: {
        sub: parsed?.sub || (item.spec && item.spec !== '기본 시공' && item.spec !== '표준 규격' ? item.spec : '')
      }
    };
  }

  const name = item.name || '창호 시공';
  const defaultPanes = /(거실|안방|확장|3W)/.test(name) ? 3 : /(고정|픽스|1W)/.test(name) ? 1 : 2;
  const defaultType = /(발코니)/.test(name)
    ? '발코니창141'
    : /(분합|공틀)/.test(name)
    ? '공틀창225'
    : /(이중창)/.test(name)
    ? '일반이중창230'
    : /(고정)/.test(name)
    ? '고정창'
    : 'KCC 홈씨씨 맞춤사양';

  return {
    category: 'window',
    detail: {
      type: parsed?.type || defaultType,
      size: parsed?.size || item.spec || '현장 실측 규격',
      shape: parsed?.shape || (defaultPanes === 3 ? '3W (1:2:1)' : defaultPanes === 2 ? '2W (1:1)' : '1W 고정'),
      model: parsed?.model || 'KCC HOMECC 정품 사양',
      glass: parsed?.glass || '24T~28T 로이 복층유리',
      handle: parsed?.handle || (defaultPanes > 1 ? 'L-PLUS_N 자동/반자동 핸들' : '해당 없음'),
      mesh: parsed?.mesh || (/(발코니|이중창)/.test(name) ? '방충망 포함' : '현장 기준 적용'),
      panes: Number(parsed?.panes) || defaultPanes,
      upgrade: Boolean(parsed?.upgrade || (parsed?.glass || '').includes('더블로이') || (parsed?.mesh || '').includes('STS'))
    }
  };
}

export function buildRentalPlans(cashPrice, discountAmount = 0) {
  const total = Math.max(0, Math.round(Number(cashPrice) || 0));
  const splitDeposit = Math.round(total / 2);
  const splitBalance = total - splitDeposit;

  // Rental Plan A: Low upfront (default 500,000 KRW when total >= 1,500,000)
  const upfrontA = total >= 1500000
    ? 500000
    : Math.max(0, Math.floor((total * 0.1) / 100000) * 100000);
  const financedA = Math.max(0, total - upfrontA);
  const monthlyA = Math.max(1000, Math.round((financedA * 0.0222) / 1000) * 1000);
  const totalA = upfrontA + monthlyA * 60;

  // Rental Plan B: Low monthly (~52.38% upfront rounded to 500,000 KRW, matching 5,500,000 on 10,500,000)
  let upfrontB = Math.round((total * 0.52381) / 500000) * 500000;
  if (upfrontB <= upfrontA || upfrontB >= total) {
    upfrontB = Math.round((total * 0.5) / 100000) * 100000;
  }
  const financedB = Math.max(0, total - upfrontB);
  const monthlyB = Math.max(1000, Math.round((financedB * 0.0222) / 1000) * 1000);
  const totalB = upfrontB + monthlyB * 60;

  const fmtMan = v => {
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

  return {
    cash: {
      key: 'cash',
      tag: '일시불',
      heading: '총 납부금액을 줄이고 싶다면',
      mainLabel: discountAmount > 0 ? '할인 적용 금액' : '일시불 예상 금액',
      mainAmount: total,
      deposit: splitDeposit,
      balance: splitBalance,
      total: total,
      name: discountAmount > 0 ? '일시불 할인 결제' : '일시불 결제',
      detail: `총 ${total.toLocaleString('ko-KR')}원 · 선금 50% / 잔금 50%`,
      button: '일시불 결제 상담하기'
    },
    lowupfront: {
      key: 'lowupfront',
      tag: '60개월 렌탈',
      heading: '처음 내는 금액을 줄이고 싶다면',
      mainLabel: '월 납부금액',
      mainAmount: monthlyA,
      upfront: upfrontA,
      months: 60,
      total: totalA,
      name: '초기 부담을 줄이는 렌탈',
      detail: `초기 ${upfrontA.toLocaleString('ko-KR')}원 + 월 ${monthlyA.toLocaleString('ko-KR')}원 × 60개월`,
      button: `초기 ${fmtMan(upfrontA)} 조건 상담하기`
    },
    lowmonthly: {
      key: 'lowmonthly',
      tag: '60개월 렌탈',
      heading: '매월 내는 금액을 줄이고 싶다면',
      mainLabel: '월 납부금액',
      mainAmount: monthlyB,
      upfront: upfrontB,
      months: 60,
      total: totalB,
      name: '월 부담을 줄이는 렌탈',
      detail: `초기 ${upfrontB.toLocaleString('ko-KR')}원 + 월 ${monthlyB.toLocaleString('ko-KR')}원 × 60개월`,
      button: `월 ${fmtMan(monthlyB)} 조건 상담하기`
    }
  };
}

export function formatCustomerSafeQuote(quote, rawItems = []) {
  const cashPrice = Number(quote.total_price) || 0;
  const discountAmount = Number(quote.discount_amount) || 0;
  const originalPrice = cashPrice + discountAmount;
  const splitDeposit = Math.round(cashPrice / 2);
  const splitBalance = cashPrice - splitDeposit;

  // Map items strictly without cost/margin
  let runningVatInc = 0;
  const safeItems = rawItems.map((it, idx) => {
    const { category, detail } = inferWindowDetail(it);
    const saleTotal = Number(it.sale_total) || 0;
    const saleUnitPrice = Number(it.sale_unit_price) || 0;
    // Scale item VAT-inclusive price proportionally to originalPrice so item totals align
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
    customer_address: quote.customer_address || '',
    product: quote.product || '창호',
    drawing_url: quote.drawing_url || '',
    sale_price: Number(quote.sale_price) || 0,
    vat: Number(quote.vat) || 0,
    total_price: cashPrice,
    discount_amount: discountAmount,
    original_price: originalPrice,
    split_deposit: splitDeposit,
    split_balance: splitBalance,
    plans: buildRentalPlans(cashPrice, discountAmount),
    manager_name: quote.owner_name && quote.owner_name !== '미배정' ? quote.owner_name : '전담 상담사',
    manager_phone: quote.manager_phone || quote.org_phone || '1588-0000',
    partner_name: quote.partner_name || '(주)라이프앤조이',
    published_at: quote.published_at || new Date().toISOString(),
    items: safeItems
  };
}
