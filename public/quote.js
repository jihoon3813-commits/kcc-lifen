const num = value => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0));
const money = value => num(value) + '원';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const topics = [
  '총비용과 추가 비용',
  '결제 방식 비교',
  '제품이나 시공 범위 변경',
  '시공 일정과 소요 시간',
  '시공 후 A/S와 보증 범위'
];

const params = new URLSearchParams(location.search);
const urlToken = params.get('token') || '';
const isPreview = params.get('preview') === '1';
const isEmbed = params.get('embed') === '1';
const isDraftPreview = params.get('draft') === '1';
const previewProjectId = params.get('projectId') || '';
const previewTypeParam = params.get('type') || '';
const previewQuoteIdParam = params.get('quoteId') || '';
const initialView = params.get('view') || 'quote';
const initialDevice = params.get('device') || 'mobile';
let desiredPreviewView = initialView;

function setPreviewDevice(mode) {
  if (!isPreview) return;
  document.documentElement.dataset.previewDevice = mode === 'wide' ? 'wide' : 'mobile';
}

let currentQuote = null;
let configuredConsultPhone = '';
let viewerToken = '';
let csrfToken = '';
let selectedPlan = 'cash';
let activePaymentMethod = 'cash';
let activeDepositAmount = null;
let activeContext = '';
let focusBeforeDialog = null;
let isSubmittingConsult = false;

let plans = {
  cash: { name: '일시불 할인 결제', detail: '선금 50% / 잔금 50%', button: '일시불 결제 상담하기' },
  plan111: { name: '월 111,000원 렌탈 플랜', detail: '60개월 약정', button: '월 111,000원 조건 상담하기' },
  plan222: { name: '월 222,000원 렌탈 플랜', detail: '60개월 약정', button: '월 222,000원 조건 상담하기' },
  plan333: { name: '월 333,000원 렌탈 플랜', detail: '60개월 약정', button: '월 333,000원 조건 상담하기' },
  lowupfront: { name: '월 222,000원 렌탈 플랜', detail: '60개월 약정', button: '월 222,000원 조건 상담하기' },
  lowmonthly: { name: '월 111,000원 렌탈 플랜', detail: '60개월 약정', button: '월 111,000원 조건 상담하기' }
};

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window.__quoteToastTimer);
  window.__quoteToastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function formatPhoneInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatDotDate(isoOrStr) {
  if (!isoOrStr) return '2026.11.12';
  const s = String(isoOrStr).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replaceAll('-', '.');
  return s;
}

function windowIcon(panes) {
  const p = Number(panes) || 2;
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><path class="glass-fill" d="M5 6h30v28H5z"/><path d="M4 5h32v30H4zM6 7h28v26H6z${p === 2 ? 'M20 5v30' : p === 3 ? 'M13 5v30M27 5v30' : ''}"/>${p > 1 ? '<path d="M10 18v5M30 18v5"/>' : ''}</svg>`;
}

// Render consultation topic checkboxes once
document.getElementById('topic-options').innerHTML = topics
  .map(t => `<label><input type="checkbox" name="topic" value="${esc(t)}"><span>${esc(t)}</span></label>`)
  .join('');

function setScreenView(mode) {
  const loginScreen = document.getElementById('login-screen');
  const quoteView = document.getElementById('quote-view');
  const consultBtn = document.getElementById('header-consult-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const btnPrevQuote = document.getElementById('btn-prev-quote');
  const btnPrevLogin = document.getElementById('btn-prev-login');

  if (mode === 'login') {
    loginScreen.hidden = false;
    quoteView.hidden = true;
    consultBtn.hidden = true;
    logoutBtn.hidden = true;
    btnPrevQuote?.classList.remove('active');
    btnPrevLogin?.classList.add('active');
  } else {
    loginScreen.hidden = true;
    quoteView.hidden = false;
    consultBtn.hidden = false;
    logoutBtn.hidden = isPreview;
    btnPrevQuote?.classList.add('active');
    btnPrevLogin?.classList.remove('active');
    updateNav();
  }
}

function isPlanSelectable(key) {
  if (key === 'cash') return true;
  if (!plans[key]) return false;
  const card = document.querySelector(`[data-plan="${key}"]`);
  if (!card) return false;
  const optionWrap = card.closest('.rental-option');
  if (card.disabled || card.hidden || (optionWrap && optionWrap.hidden)) return false;
  if (Number(plans[key].upfront ?? 0) <= 0) return false;
  return true;
}

function choosePlan(key) {
  if (!isPlanSelectable(key)) key = 'cash';
  selectedPlan = key;
  document.querySelectorAll('[data-plan-actions]').forEach(el => {
    el.hidden = el.dataset.planActions !== key;
  });
  document.querySelectorAll('[data-plan]').forEach(card => {
    const selected = card.dataset.plan === key;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-checked', String(selected));
    card.tabIndex = selected ? 0 : -1;
  });
  const cta = document.getElementById('plan-cta');
  if (cta) {
    cta.hidden = key !== 'cash';
    cta.innerHTML = `${esc(plans[key].button)}<svg><use href="#i-arrow"/></svg>`;
  }
}

function renderQuote(q) {
  currentQuote = q;
  const product = q.product || '창호';
  const items = Array.isArray(q.items) ? q.items : [];
  const windowItems = items.filter(i => i.category !== 'extra');
  const extraItems = items.filter(i => i.category === 'extra');
  const displayMainItems = windowItems.length > 0 ? windowItems : (extraItems.length === 0 ? items : []);

  const calcMatSub = windowItems.reduce((s, i) => s + (Number(i.sale_total) || 0), 0);
  const calcExtSub = extraItems.reduce((s, i) => s + (Number(i.sale_total) || 0), 0);
  const materialSubtotal = Number(q.material_subtotal) > 0 || (calcMatSub === 0 && Number(q.extra_subtotal) > 0)
    ? Number(q.material_subtotal) || 0
    : calcMatSub;
  const extraSubtotal = Number(q.extra_subtotal) > 0 || (calcExtSub === 0 && Number(q.material_subtotal) > 0)
    ? Number(q.extra_subtotal) || 0
    : calcExtSub;
  const salePrice = Number(q.sale_price) || (materialSubtotal + extraSubtotal);
  const vatAmount = Number(q.vat) || Math.round(salePrice * 0.1);

  const cashPrice = Number(q.total_price) || 0;
  const discountAmount = Math.max(0, Number(q.discount_amount) || 0);
  const originalPrice = Number(q.original_price) > 0 ? Number(q.original_price) : (cashPrice + discountAmount);
  const splitDeposit = Number(q.split_deposit) || Math.round(cashPrice / 2);
  const splitBalance = Number(q.split_balance) || (cashPrice - splitDeposit);
  const quoteNo = q.quote_no || String(q.project_id || q.id || 0).padStart(4, '0');
  const quoteType = q.quote_type || '가견적';
  const isFinal = quoteType === '최종견적';
  const customerName = q.customer_name || '고객';
  const meta = q.meta && typeof q.meta === 'object' ? q.meta : null;

  document.title = `KCC홈씨씨 · ${customerName} 고객님 ${product} ${quoteType}`;
  document.getElementById('header-product-label').textContent = `나의 ${product} ${quoteType}`;
  const heroBadge = document.getElementById('hero-badge');
  heroBadge.textContent = isFinal ? '최종견적 · 실측확정' : (quoteType === '가견적' ? '가견적 · 실측전' : quoteType);
  heroBadge.className = `quote-badge ${isFinal ? 'is-final' : 'is-rough'}`;
  document.getElementById('hero-greeting').textContent = `${customerName} 고객님을 위한 ${quoteType} 제안`;
  document.getElementById('hero-heading').innerHTML = `우리 집 ${esc(product)} 교체,<br>비용과 결제 방법을<br><span>한눈에.</span>`;

  // Address & No.
  // Address & No. (앱 등록 고객 정보 우선)
  const displayAddress = q.customer_address || '';
  const addrParts = String(displayAddress).split('·').map(s => s.trim()).filter(Boolean);
  const locEl = document.getElementById('customer-location');
  if (addrParts.length >= 2) {
    locEl.innerHTML = `${esc(addrParts[0])} <i></i> ${esc(addrParts.slice(1).join(' · '))}`;
  } else {
    locEl.textContent = displayAddress || '맞춤 시공 현장';
  }
  document.getElementById('customer-no').textContent = meta?.kcc_quote_no ? `견적번호 ${meta.kcc_quote_no}` : `No. ${quoteNo}`;

  // Top Quote Card
  document.getElementById('quote-top-label').textContent = isFinal
    ? (discountAmount > 0 ? '일시불 할인 적용 최종 확정금액' : '방문 실측 반영 최종 확정금액 (절삭기준)')
    : (discountAmount > 0 ? '일시불 할인 적용 예상금액' : '고객 맞춤 예상금액 (절삭기준)');
  document.getElementById('quote-price').innerHTML = `${num(cashPrice)}<span>원</span>`;

  const discountBox = document.getElementById('quote-discount');
  if (discountAmount > 0) {
    discountBox.hidden = false;
    document.getElementById('quote-original-price').textContent = money(originalPrice);
    document.getElementById('quote-discount-badge').innerHTML = `<svg><use href="#i-down"/></svg> 일시불 ${money(discountAmount)} 할인`;
  } else {
    discountBox.hidden = true;
  }

  const topMatEl = document.getElementById('top-material-subtotal');
  const topExtEl = document.getElementById('top-extra-subtotal');
  const topOrigEl = document.getElementById('top-original-total');
  if (topMatEl) topMatEl.textContent = money(materialSubtotal);
  if (topExtEl) topExtEl.textContent = money(extraSubtotal);
  if (topOrigEl) topOrigEl.textContent = money(originalPrice);

  document.getElementById('split-pay-amount').textContent = splitDeposit === splitBalance
    ? `각 ${money(splitDeposit)}`
    : `${money(splitDeposit)} / ${money(splitBalance)}`;
  document.getElementById('quote-date').textContent = meta?.quote_date
    ? `최종견적일 ${meta.quote_date}${meta.valid_period ? ' · 유효기간 ' + meta.valid_period : ''}`
    : `${quoteType}일 ${formatDotDate(q.published_at)}`;

  // Render KCC Basic Info Card (우측 배지에 엑셀 창호견적번호, 본문에는 견적발행일·고객명·연락처·주소 표시)
  const metaCard = document.getElementById('kcc-meta-card');
  if (metaCard) {
    metaCard.hidden = false;
    const metaNoEl = document.getElementById('kcc-meta-no');
    const excelQuoteNo = meta?.kcc_quote_no || q.kcc_quote_no || (q.quote_no && q.quote_no.includes('-') ? q.quote_no : '900000-006428-017-001');
    if (metaNoEl) {
      metaNoEl.textContent = excelQuoteNo;
    }

    // 견적발행일은 생성한 날(당일/발행일자)
    const issueDate = formatDotDate(q.published_at) || meta?.quote_date || '2026.11.12';

    const appCustName = q.customer_name || customerName || '고객';
    const appCustPhone = q.customer_phone || '-';
    const appCustAddress = q.customer_address || '맞춤 시공 현장';

    const metaRows = [
      { k: '견적발행일', v: issueDate },
      { k: '고객명', v: appCustName },
      { k: '연락처', v: appCustPhone },
      { k: '공사 주소', v: appCustAddress, full: true }
    ];

    document.getElementById('kcc-meta-grid').innerHTML = metaRows
      .map(r => `<div class="${r.full ? 'full-span' : ''}"><dt>${esc(r.k)}</dt><dd><b>${esc(r.v)}</b></dd></div>`)
      .join('');

    const siteNotesEl = document.getElementById('kcc-site-notes');
    if (siteNotesEl) {
      if (meta?.site_notes) {
        siteNotesEl.hidden = false;
        siteNotesEl.innerHTML = `<strong>기타 현장 특이사항</strong>${esc(meta.site_notes).replace(/\n/g, '<br>')}`;
      } else {
        siteNotesEl.hidden = true;
      }
    }
  }

  const estNote = document.getElementById('estimate-note');
  if (estNote) {
    estNote.textContent = isFinal
      ? '현장 방문 실측이 반영된 최종 확정 견적서입니다. 원하시는 결제 조건으로 계약을 진행하실 수 있습니다.'
      : '방문 실측 전 산출된 예상 가견적이며, 현장 확인 및 최종 시공 사양에 따라 금액이 달라질 수 있습니다.';
  }
  const faqConfirmA = document.getElementById('faq-confirm-a');
  if (faqConfirmA) {
    faqConfirmA.textContent = isFinal
      ? '본 견적은 현장 방문 실측과 선택 사양이 반영된 최종 확정 견적입니다. 추가 사양 변경이 없는 한 안내된 금액으로 계약이 진행됩니다.'
      : '현재 견적은 실측 및 최종 사양 확정 전 가견적 기준입니다. 현장 확인, 최종 제품 사양, 작업 범위에 따라 금액이 달라질 수 있으니 변경되는 항목과 비용을 확인한 뒤 결정해주세요.';
  }

  const btnPrevRough = document.getElementById('btn-prev-rough');
  const btnPrevFinal = document.getElementById('btn-prev-final');
  if (btnPrevRough && btnPrevFinal) {
    btnPrevRough.classList.toggle('active', quoteType === '가견적');
    btnPrevFinal.classList.toggle('active', quoteType === '최종견적');
  }

  // Payment Plans
  if (q.plans) {
    plans = q.plans;
  }
  const pCash = plans.cash;
  const p111 = plans.plan111 || plans.lowmonthly || { mainAmount: 111000, upfront: Math.max(0, cashPrice - 5000000) };
  const p222 = plans.plan222 || plans.lowupfront || { mainAmount: 222000, upfront: Math.max(0, cashPrice - 10000000) };
  const p333 = plans.plan333 || { mainAmount: 333000, upfront: Math.max(0, cashPrice - 15000000) };

  const cashPayTag = document.getElementById('cash-pay-tag');
  if (cashPayTag) cashPayTag.textContent = discountAmount > 0 ? '일시불 특별할인' : '일시불';
  document.getElementById('cash-main-label').textContent = pCash.mainLabel || (discountAmount > 0 ? '일시불 할인 적용가' : '일시불 예상 금액');
  document.getElementById('cash-main-amount').innerHTML = `${num(pCash.mainAmount ?? cashPrice)}<small>원</small>`;

  const cashDiscBanner = document.getElementById('cash-discount-banner');
  if (cashDiscBanner) {
    if (discountAmount > 0) {
      cashDiscBanner.hidden = false;
      document.getElementById('cash-orig-amount').textContent = money(originalPrice);
      document.getElementById('cash-discount-amount').textContent = `-${money(discountAmount)} 일시불 할인`;
    } else {
      cashDiscBanner.hidden = true;
    }
  }

  document.getElementById('cash-deposit').textContent = money(pCash.deposit ?? splitDeposit);
  document.getElementById('cash-balance').textContent = money(pCash.balance ?? splitBalance);
  document.getElementById('cash-total').textContent = `총 ${money(pCash.total ?? cashPrice)}`;

  // -----------------------------------------------------------
  // [렌탈 금액표 바인딩] 고객 부담을 줄이기 위해 '총액'은 미표시
  // 초회납입금이 0원 이하인 플랜은 화면에서 숨기고 선택 불가 처리
  // 1) 월 111,000원 플랜 (500만원 초과분 = 초회납입금)
  // 2) 월 222,000원 플랜 (1,000만원 초과분 = 초회납입금)
  // 3) 월 333,000원 플랜 (1,500만원 초과분 = 초회납입금)
  // -----------------------------------------------------------
  const rentalPlanSpecs = [
    { key: 'plan111', data: p111, defaultMo: 111000, threshold: 5000000, moElId: 'p111-monthly', upElId: 'p111-upfront' },
    { key: 'plan222', data: p222, defaultMo: 222000, threshold: 10000000, moElId: 'p222-monthly', upElId: 'p222-upfront' },
    { key: 'plan333', data: p333, defaultMo: 333000, threshold: 15000000, moElId: 'p333-monthly', upElId: 'p333-upfront' }
  ];
  for (const spec of rentalPlanSpecs) {
    const moVal = Number(spec.data?.mainAmount || spec.defaultMo);
    const upVal = Number(spec.data?.upfront ?? Math.max(0, cashPrice - spec.threshold));
    const elMo = document.getElementById(spec.moElId);
    const elUp = document.getElementById(spec.upElId);
    if (elMo) elMo.innerHTML = `${num(moVal)}<small>원</small>`;
    if (elUp) elUp.textContent = money(upVal);

    const isAvailable = upVal > 0;
    const card = document.querySelector(`[data-plan="${spec.key}"]`);
    if (card) {
      card.disabled = !isAvailable;
      card.hidden = !isAvailable;
      const optionWrap = card.closest('.rental-option');
      if (optionWrap) optionWrap.hidden = !isAvailable;
    }
  }

  // 하위 호환 구형 엘리먼트가 있을 경우 대응 (총액 노출 제거)
  const elLowUpMo = document.getElementById('lowup-monthly');
  const elLowUpUp = document.getElementById('lowup-upfront');
  const elLowUpTot = document.getElementById('lowup-total');
  if (elLowUpMo) elLowUpMo.innerHTML = `${num(p222.mainAmount)}<small>원</small>`;
  if (elLowUpUp) elLowUpUp.textContent = money(p222.upfront);
  if (elLowUpTot) elLowUpTot.closest('.pay-footer')?.remove();

  const elLowMoMo = document.getElementById('lowmo-monthly');
  const elLowMoUp = document.getElementById('lowmo-upfront');
  const elLowMoTot = document.getElementById('lowmo-total');
  if (elLowMoMo) elLowMoMo.innerHTML = `${num(p111.mainAmount)}<small>원</small>`;
  if (elLowMoUp) elLowMoUp.textContent = money(p111.upfront);
  if (elLowMoTot) elLowMoTot.closest('.pay-footer')?.remove();

  choosePlan('cash');

  // Smart Subscription Calculator (if present)
  const depositInput = document.getElementById('deposit');
  if (depositInput) {
    const defaultDep = Math.floor((cashPrice / 2) / 10000) * 10000;
    depositInput.max = String(cashPrice);
    depositInput.value = String(defaultDep);
    const depErr = document.getElementById('deposit-error');
    if (depErr) depErr.textContent = `0원부터 ${money(cashPrice)} 사이로 입력해주세요.`;
    validateDeposit();
  }

  document.getElementById('included-product-name').textContent = product;
  document.getElementById('included-count').textContent = String(displayMainItems.length);
  const uniqueTypes = [...new Set(displayMainItems.map(w => w.detail?.type || w.spec || product).filter(Boolean))].slice(0, 4);
  document.getElementById('included-types').textContent = uniqueTypes.length
    ? uniqueTypes.join(' · ')
    : `${product} 맞춤 사양`;

  if (extraItems.length > 0) {
    document.getElementById('included-work-grid').innerHTML = extraItems.slice(0, 4).map(ex => {
      const sub = ex.detail?.sub ? `<small>${esc(ex.detail.sub)}</small>` : '';
      return `<div><svg><use href="#i-check"/></svg><strong>${esc(ex.name)}</strong>${sub}</div>`;
    }).join('');
  }

  // Section 03: Detailed Material (자재) Accordion — Per-item amounts are VAT-excluded & 10-won truncated
  document.getElementById('window-count-badge').textContent = `자재 ${displayMainItems.length} · 기타 ${extraItems.length}`;
  const matGroupSub = document.getElementById('material-group-subtotal');
  if (matGroupSub) matGroupSub.textContent = `자재 총액 ${money(materialSubtotal)}`;

  document.getElementById('window-list').innerHTML = displayMainItems.map(w => {
    const d = w.detail || {};
    const amountExcl = Number(w.sale_total) || 0;
    const qty = Number(w.quantity) || 1;
    const isInsulation = Boolean(d.is_insulation || d.insulation === '단열');

    const shapeWithDir = [d.shape, d.open_dir].filter(Boolean).join(' · ') || `${qty}식`;
    const sizeWithSub = [d.size || w.spec || '맞춤 규격', d.sub_size ? `(${d.sub_size})` : ''].filter(Boolean).join(' ');
    const meshWithDrain = [
      d.mesh || '현장 기준',
      d.drain && d.drain !== '미적용' ? `배수홀 ${d.drain}` : ''
    ].filter(Boolean).join(' · ');

    const glassIn = d.glass_in || (d.glass_type_in ? `${d.glass_thick_in ? d.glass_thick_in + 'T ' : ''}${d.glass_type_in}` : '');
    const glassOut = d.glass_out || (d.glass_type_out ? `${d.glass_thick_out ? d.glass_thick_out + 'T ' : ''}${d.glass_type_out}` : '');
    const glassFull = glassIn && glassOut
      ? `내창 ${glassIn} / 외창 ${glassOut}`
      : glassIn || glassOut || d.glass || '해당 없음';

    const wrapFull = [
      d.wrap_in ? `내부 ${d.wrap_in}` : '',
      d.wrap_out ? `외부 ${d.wrap_out}` : ''
    ].filter(Boolean).join(' / ') || d.wrap || '표준 WH';

    const subSizeFull = [
      d.w1 ? `W1 ${d.w1}mm` : '',
      d.w2 ? `W2 ${d.w2}mm` : '',
      d.h1 ? `H1 ${d.h1}mm` : '',
      d.h2 ? `H2 ${d.h2}mm` : ''
    ].filter(Boolean).join(' · ');

    const rows = [
      ['순번', `${d.seq ? `${d.seq}번` : '-'}`],
      ['설치위치', d.location || '맞춤 위치'],
      ['제품명', d.product_name || d.excel_product || d.type || product],
      ['모델명', d.model_name || d.model || 'KCC HOMECC 정품'],
      ['창형태', shapeWithDir],
      ['길이(W)', `${d.w ? `${d.w} mm` : '-'}${d.w1 || d.w2 ? ` (세부: ${[d.w1 ? `W1 ${d.w1}` : '', d.w2 ? `W2 ${d.w2}` : ''].filter(Boolean).join(' / ')})` : ''}`],
      ['높이(H)', `${d.h ? `${d.h} mm` : '-'}${d.h1 || d.h2 ? ` (세부: ${[d.h1 ? `H1 ${d.h1}` : '', d.h2 ? `H2 ${d.h2}` : ''].filter(Boolean).join(' / ')})` : ''}`],
      ['내·외부 랩핑', wrapFull],
      ['유리 두께', `${d.glass_thick_in ? `내창 ${d.glass_thick_in}T` : ''}${d.glass_thick_out ? ` / 외창 ${d.glass_thick_out}T` : ''}` || (d.glass && d.glass !== '해당 없음' ? '복층 24T~28T' : '해당 없음')],
      ['유리 종류', glassFull],
      ['수량', `${qty}개 (식)`],
      ['잠금장치', `${d.handle || '-'}${d.handle_height ? ` (핸들높이: ${d.handle_height})` : ''}`],
      ['옵션 1 / 2', `옵션1: ${d.opt1 || 'X'} · 옵션2: ${d.opt2 || 'X'}${d.options && d.options !== '미적용' ? ` (${d.options})` : ''}`],
      ['방충망', d.mesh || '미포함'],
      ['배수홀', d.drain || '미적용'],
      ['단열 성능', isInsulation ? '<b class="is-highlight">[단열] KCC 공인 단열 특화 사양 적용</b>' : (d.insulation || '일반 사양')],
      ['금액 (VAT별도)', `<b>${money(amountExcl)}</b> <small style="color:#7f90a6">(10원단위 절삭 적용)</small>`]
    ];
    if (d.calc_date) rows.push(['최종계산일', d.calc_date]);
    if (d.remark) rows.push(['비고', d.remark]);

    const subCaption = [
      d.product_name || d.excel_product || d.type || product,
      d.size && d.size !== '맞춤 규격' ? d.size : d.model,
      qty > 1 ? `${qty}개` : ''
    ].filter(Boolean).join(' · ');

    const insulationTag = isInsulation ? '<span class="badge-insulation" title="엑셀 K열 단열 인증">단열</span>' : '';

    return `<details class="window-item ${isInsulation ? 'is-insulation' : ''}">
      <summary>
        <div class="window-thumb">${windowIcon(d.panes || 2)}</div>
        <div class="window-name">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            <strong>${d.seq ? `${d.seq}. ` : ''}${esc(w.name)}</strong>
            ${insulationTag}
          </div>
          <small>${esc(subCaption)}</small>
        </div>
        <div class="window-amount-wrap">
          <strong class="window-amount">${money(amountExcl)}</strong>
          <small>부가세 별도</small>
        </div>
        <svg><use href="#i-down"/></svg>
      </summary>
      <div class="window-detail">
        ${isInsulation ? `
          <div class="window-insulation-banner">
            <svg style="width:16px;height:16px;flex-shrink:0"><use href="#i-check"/></svg>
            <span>엑셀 견적서 K열 공인 <strong>단열 우수 창호</strong> 사양이 적용된 품목입니다.</span>
          </div>` : ''}
        <table class="window-spec-table">
          <tbody>
            ${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}
          </tbody>
        </table>
        ${d.upgrade ? '<span class="tag">고단열 · 로이유리 사양 적용</span>' : ''}
        <button class="text-link" type="button" data-consult="${esc(w.name)} 사양 상담">이 항목에 대해 문의하기<svg><use href="#i-arrow"/></svg></button>
      </div>
    </details>`;
  }).join('');

  // Re-bind dynamic [data-consult] buttons inside #window-list
  document.querySelectorAll('#window-list [data-consult]').forEach(btn => {
    btn.addEventListener('click', () => openConsult(btn.dataset.consult));
  });

  // Extra Costs List (기타견적) — VAT-excluded & 10-won truncated
  const extraBox = document.getElementById('extra-costs-box');
  if (extraItems.length > 0) {
    extraBox.hidden = false;
    document.getElementById('extra-costs-count').textContent = `${extraItems.length}개 항목 · 부가세 별도`;
    const extGroupSub = document.getElementById('extra-group-subtotal');
    if (extGroupSub) extGroupSub.textContent = `기타견적 ${money(extraSubtotal)}`;
    document.getElementById('extra-costs-list').innerHTML = extraItems.map(ex => {
      const amountExcl = Number(ex.sale_total) || 0;
      const qty = Number(ex.quantity) || 1;
      const subParts = [ex.detail?.sub || '', qty > 1 ? `${qty}식` : ''].filter(Boolean).join(' · ');
      const sub = subParts ? ` <small>(${esc(subParts)})</small>` : '';
      return `<div><dt>${ex.detail?.seq ? `${ex.detail.seq}. ` : ''}${esc(ex.name)}${sub}</dt><dd>${money(amountExcl)}</dd></div>`;
    }).join('');
  } else {
    extraBox.hidden = true;
  }

  // Subtotals & VAT-Included Total & Lump-Sum Discount Breakdown Card
  const qbMat = document.getElementById('qb-material');
  const qbExt = document.getElementById('qb-extra');
  const qbSale = document.getElementById('qb-sale');
  const qbVat = document.getElementById('qb-vat');
  const qbDiscRow = document.getElementById('qb-discount-row');
  const qbDisc = document.getElementById('qb-discount');
  const qbFinalRow = document.getElementById('qb-final-row');
  const qbFinal = document.getElementById('qb-final');

  if (qbMat) qbMat.textContent = money(materialSubtotal);
  if (qbExt) qbExt.textContent = money(extraSubtotal);
  if (qbSale) qbSale.textContent = money(salePrice);
  if (qbVat) qbVat.textContent = money(vatAmount);
  document.getElementById('item-total-amount').textContent = money(originalPrice);

  if (qbDiscRow && qbFinalRow) {
    if (discountAmount > 0) {
      qbDiscRow.hidden = false;
      qbFinalRow.hidden = false;
      if (qbDisc) qbDisc.textContent = `-${money(discountAmount)}`;
      if (qbFinal) qbFinal.textContent = money(cashPrice);
    } else {
      qbDiscRow.hidden = true;
      qbFinalRow.hidden = true;
    }
  }
  document.getElementById('item-diff-note').hidden = false;

  // FAQ & Contact & Aside & Footer
  document.getElementById('faq-split-text').textContent =
    `현재 견적은 선금 50%와 잔금 50%로 나누어 납부하는 방식입니다. 일시불 기준 선금 ${money(splitDeposit)}, 잔금 ${money(splitBalance)}이며 납부 시점은 상담에서 안내해드립니다.`;
  document.getElementById('contact-heading').innerHTML = `${esc(customerName)} 고객님,<br>어떤 부분을 도와드릴까요?`;

  document.getElementById('aside-avatar').textContent = customerName.slice(0, 1);
  document.getElementById('aside-name').textContent = `${customerName} 고객님`;
  document.getElementById('aside-meta').textContent = `${quoteType} No. ${quoteNo}${addrParts[1] ? ' · ' + addrParts[1] : ''}`;
  document.getElementById('aside-price-label').textContent = discountAmount > 0 ? '일시불 할인 적용가' : '부가세 포함 총액';
  document.getElementById('aside-cash-price').textContent = money(cashPrice);
  document.getElementById('aside-item-label').textContent = `자재 · 기타 내역`;
  document.getElementById('aside-window-count').textContent = `자재 ${displayMainItems.length} · 기타 ${extraItems.length}`;

  document.getElementById('footer-partner-name').textContent = q.partner_name || '(주)라이프앤조이';
  const effectivePhone = configuredConsultPhone || q.manager_phone || '1588-0000';
  document.getElementById('footer-manager-info').textContent = `${q.manager_name || '전담 상담사'} · ${effectivePhone}`;
  document.getElementById('dialog-sub').textContent = `${customerName} 고객님의 견적을 기준으로 안내해드립니다.`;
  document.getElementById('dialog-masked-phone').textContent = q.customer_phone || '본인확인 완료';

  // Preview vs Live mode indicators
  document.getElementById('consult-preview-notice').hidden = !isPreview;
  document.getElementById('consult-submit-btn').innerHTML = isPreview
    ? `<span>상담 요청 화면 확인하기</span><svg><use href="#i-arrow"/></svg>`
    : `<span>상담 요청 접수하기</span><svg><use href="#i-arrow"/></svg>`;

  if (isPreview) {
    document.getElementById('footer-mode-note').innerHTML = `<span class="demo-dot"></span>관리자 미리보기 모드 · 상담 정보는 실제 접수되지 않습니다.`;
  }

  window.dispatchEvent(new CustomEvent('kcc:quote-rendered', { detail: { quote: q, isPreview } }));
}

// Payment Card Events
document.querySelectorAll('[data-plan]').forEach((card) => {
  card.addEventListener('click', () => choosePlan(card.dataset.plan));
  card.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      const cards = [...document.querySelectorAll('[data-plan]')].filter(c => {
        const wrap = c.closest('.rental-option');
        return !c.disabled && !c.hidden && !(wrap && wrap.hidden);
      });
      const currentIdx = cards.indexOf(card);
      if (currentIdx === -1 || cards.length === 0) return;
      const next = (currentIdx + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) + cards.length) % cards.length;
      choosePlan(cards[next].dataset.plan);
      cards[next].focus();
    }
  });
});

// Smart Subscription Validation (Optional)
const deposit = document.getElementById('deposit');
function validateDeposit() {
  if (!deposit) return true;
  const maxPrice = Number(currentQuote?.total_price) || 10500000;
  const value = Number(deposit.value);
  const valid = deposit.value.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= maxPrice;
  const depErr = document.getElementById('deposit-error');
  if (depErr) depErr.hidden = valid;
  const balEl = document.getElementById('balance');
  if (balEl) balEl.textContent = valid ? money(maxPrice - value) : '금액을 확인해주세요';
  deposit.setAttribute('aria-invalid', String(!valid));
  return valid;
}
if (deposit) {
  deposit.addEventListener('input', validateDeposit);
}

// Consultation Dialog
const dialog = document.getElementById('consult-dialog');
function openConsult(topic, context = '', methodKey = 'undecided', depositAmt = null) {
  focusBeforeDialog = document.activeElement;
  activeContext = context;
  activePaymentMethod = methodKey;
  activeDepositAmount = depositAmt;

  document.getElementById('success-content').hidden = true;
  document.getElementById('consult-content').hidden = false;
  document.getElementById('consult-form').reset();

  document.querySelectorAll('[name=topic]').forEach(input => {
    input.checked = input.value === topic || (topic.includes('사양') && input.value === topics[2]);
  });

  const qNo = currentQuote?.quote_no || '0000';
  const selected = document.getElementById('selected-plan');
  selected.textContent = context || (topics.includes(topic) || topic === '견적 상담' ? `견적 No. ${qNo} · ${topic}` : topic);

  dialog.showModal();
  document.body.style.overflow = 'hidden';
  dialog.scrollTop = 0;
}

function closeDialog() {
  dialog.close();
}

dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  if (focusBeforeDialog) focusBeforeDialog.focus({ preventScroll: true });
});

document.querySelectorAll('[data-consult]').forEach(button => {
  button.addEventListener('click', () => openConsult(button.dataset.consult));
});
document.querySelectorAll('.close-dialog,.close-success').forEach(button => {
  button.addEventListener('click', closeDialog);
});

document.getElementById('plan-cta').addEventListener('click', () => {
  const p = plans[selectedPlan];
  openConsult('결제 방식 비교', `${p.name} · ${p.detail}`, selectedPlan, null);
});

const subCtaBtn = document.getElementById('subscription-cta');
if (subCtaBtn) {
  subCtaBtn.addEventListener('click', () => {
    if (!validateDeposit()) {
      deposit?.focus();
      return;
    }
    const maxPrice = Number(currentQuote?.total_price) || 0;
    const depVal = Number(deposit?.value || 0);
    openConsult(
      '결제 방식 비교',
      `스마트 구독 · 선납금 ${money(depVal)} / 구독 전환 ${money(maxPrice - depVal)}`,
      'subscription',
      depVal
    );
  });
}

document.querySelectorAll('[data-scroll]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('phone-btn').addEventListener('click', () => {
  const displayPhone = configuredConsultPhone || currentQuote?.manager_phone || '1588-0000';
  const tel = String(displayPhone).replace(/[^\d+]/g, '');
  if (isPreview) {
    showToast(`미리보기 모드 · 실제 화면에서는 담당자(${displayPhone})에게 전화 연결됩니다.`);
    return;
  }
  window.location.href = `tel:${tel}`;
});

// Load admin-configured consult phone so it applies across preview & live quotes
(async function loadConfiguredConsultPhone() {
  try {
    const res = await fetch('/api/settings/quote-phone', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    const phone = String(data?.phone || '').trim();
    if (phone) {
      configuredConsultPhone = phone;
      if (currentQuote) {
        const footerInfo = document.getElementById('footer-manager-info');
        if (footerInfo) {
          footerInfo.textContent = `${currentQuote.manager_name || '전담 상담사'} · ${configuredConsultPhone}`;
        }
      }
    }
  } catch {}
})();

// Consultation Form Submit
document.getElementById('consult-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (isSubmittingConsult) return;

  const selectedTopics = [...document.querySelectorAll('[name=topic]:checked')].map(el => el.value);
  const time = document.querySelector('[name=time]:checked')?.value || '상관없음';
  const memoVal = document.getElementById('memo').value.trim();
  const cName = currentQuote?.customer_name || '고객';
  const qNo = currentQuote?.quote_no || '0000';

  if (!isPreview) {
    isSubmittingConsult = true;
    const submitBtn = document.getElementById('consult-submit-btn');
    const origHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>상담 접수 중...</span>`;

    try {
      const res = await fetch('/api/public/quotes/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentQuote?.access_token || urlToken,
          viewerToken,
          paymentMethod: activePaymentMethod,
          planSummary: activeContext || `${cName} 고객님 · 견적 No. ${qNo}`,
          depositAmount: activeDepositAmount,
          topics: selectedTopics,
          preferredTime: time,
          memo: memoVal
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '상담 요청 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } catch (err) {
      showToast(err.message || '네트워크 오류가 발생했습니다.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
      isSubmittingConsult = false;
      return;
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
      isSubmittingConsult = false;
    }
  }

  const summary = document.getElementById('success-summary');
  summary.replaceChildren();
  const lines = [
    activeContext || `${cName} 고객님 · 견적 No. ${qNo}`,
    '문의: ' + (selectedTopics.join(', ') || '견적 전반 상담'),
    '희망 시간: ' + time,
    ...(memoVal ? ['남기신 메모: ' + memoVal] : [])
  ];
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    summary.appendChild(p);
  }

  document.getElementById('success-eyebrow').textContent = isPreview ? 'PREVIEW COMPLETE' : 'CONSULTATION REQUESTED';
  document.getElementById('success-heading').innerHTML = isPreview
    ? '상담 요청 화면을<br>확인했어요.'
    : '상담 요청이<br>정상 접수되었어요.';
  document.getElementById('success-foot').textContent = isPreview
    ? '현재는 관리자 미리보기 화면으로 실제 상담이 저장되지 않았습니다.'
    : '담당 상담사에게 고객님의 문의 내역이 실시간으로 전달되었습니다.';

  document.getElementById('consult-content').hidden = true;
  document.getElementById('success-content').hidden = false;
  dialog.scrollTop = 0;
  document.querySelector('.close-success')?.focus({ preventScroll: true });
});

// Sticky Section Nav Observer
const navLinks = [...document.querySelectorAll('.section-nav a')];
const observedSections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
let scrolling = false;
function updateNav() {
  if (document.getElementById('quote-view').hidden) {
    scrolling = false;
    return;
  }
  const pos = window.scrollY + 150;
  let active = 0;
  observedSections.forEach((section, i) => {
    if (section && section.offsetTop <= pos) active = i;
  });
  navLinks.forEach((link, i) => {
    link.classList.toggle('active', i === active);
    if (i === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrolling = false;
}
window.addEventListener('scroll', () => {
  if (!scrolling) {
    requestAnimationFrame(updateNav);
    scrolling = true;
  }
}, { passive: true });

// Customer Login Form Logic (이름 + 휴대폰 번호)
const phoneInput = document.getElementById('login-phone');
phoneInput.addEventListener('input', () => {
  phoneInput.value = formatPhoneInput(phoneInput.value);
});

document.getElementById('customer-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const errorBox = document.getElementById('login-error');
  errorBox.hidden = true;

  const name = document.getElementById('login-name').value.trim();
  const phone = document.getElementById('login-phone').value.trim();

  if (!name) {
    errorBox.textContent = '고객님의 성함을 입력해 주세요.';
    errorBox.hidden = false;
    document.getElementById('login-name').focus();
    return;
  }
  if (phone.replace(/\D/g, '').length < 10) {
    errorBox.textContent = '휴대폰 번호 10~11자리를 정확히 입력해 주세요.';
    errorBox.hidden = false;
    phoneInput.focus();
    return;
  }

  if (isPreview) {
    // In preview mode, allow testing login transition smoothly
    if (currentQuote) {
      showToast('미리보기 로그인 확인 완료 · 견적서 본문으로 전환합니다.');
      setScreenView('quote');
      return;
    }
  }

  const submitBtn = document.getElementById('login-submit-btn');
  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = '본인 확인 중...';

  try {
    const res = await fetch('/api/public/quotes/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: urlToken, name, phone })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errorBox.textContent = data.error || '본인 확인에 실패했습니다. 성함과 휴대폰 번호를 다시 확인해 주세요.';
      errorBox.hidden = false;
      return;
    }

    viewerToken = data.viewer_token || '';
    csrfToken = data.csrf_token || '';

    if (data.available_quotes && data.available_quotes.length > 1) {
      setupMultiQuoteSelector(data.available_quotes, data.quote.access_token);
    }

    renderQuote(data.quote);
    setScreenView('quote');
    window.scrollTo(0, 0);
    showToast(`${data.quote.customer_name} 고객님, 환영합니다.`);
  } catch {
    errorBox.textContent = '서버와 통신할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    errorBox.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = '내 견적서 확인하기';
  }
});

function setupMultiQuoteSelector(list, activeTok) {
  const bar = document.getElementById('multi-quote-bar');
  const sel = document.getElementById('quote-select');
  bar.hidden = false;
  sel.innerHTML = list.map(item =>
    `<option value="${esc(item.access_token)}" ${item.access_token === activeTok ? 'selected' : ''}>` +
    `[${esc(item.quote_type)}] ${esc(item.title)} · ${money(item.total_price)}</option>`
  ).join('');

  sel.onchange = async () => {
    const nextTok = sel.value;
    const res = await fetch('/api/public/quotes/session/switch', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: nextTok })
    });
    if (res.ok) {
      const d = await res.json();
      viewerToken = d.viewer_token || '';
      csrfToken = d.csrf_token || '';
      renderQuote(d.quote);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await fetch('/api/public/quotes/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {}
  viewerToken = '';
  csrfToken = '';
  currentQuote = null;
  document.getElementById('customer-login-form').reset();
  setScreenView('login');
  window.scrollTo(0, 0);
});

async function fetchAdminPreviewQuote(typeFilter = '', quoteIdFilter = '', retried = false) {
  if (!previewProjectId) return null;
  let authToken = localStorage.getItem('kcc_auth_token') || '';
  const qs = new URLSearchParams();
  if (typeFilter) qs.set('type', typeFilter);
  if (quoteIdFilter) qs.set('quoteId', quoteIdFilter);
  const queryStr = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`/api/quotes/by-project/${encodeURIComponent(previewProjectId)}/preview${queryStr}`, {
    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
  });
  if (res.status === 401 && !retried) {
    try {
      const authRes = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: '본사 관리자' })
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.token) {
          localStorage.setItem('kcc_auth_token', authData.token);
          return fetchAdminPreviewQuote(typeFilter, quoteIdFilter, true);
        }
      }
    } catch {}
  }
  if (!res.ok) return null;
  const data = await res.json();
  renderQuote(data.quote);
  const hint = document.getElementById('login-hint');
  hint.innerHTML = `<strong>${esc(data.quote.customer_name.slice(0, 1) + '*' + data.quote.customer_name.slice(-1))}</strong> 고객님 (${esc(data.quote.customer_phone)}) 전용 <b>${esc(data.quote.quote_type)}</b>이 도착했습니다.`;
  hint.hidden = false;
  return data;
}

// Preview Mode Top Bar Buttons & Parent PostMessage Bridge
document.getElementById('btn-prev-quote')?.addEventListener('click', () => setScreenView('quote'));
document.getElementById('btn-prev-login')?.addEventListener('click', () => setScreenView('login'));
document.getElementById('btn-prev-rough')?.addEventListener('click', async () => {
  if (isDraftPreview && currentQuote) {
    renderQuote({ ...currentQuote, quote_type: '가견적' });
  } else {
    await fetchAdminPreviewQuote('가견적');
  }
});
document.getElementById('btn-prev-final')?.addEventListener('click', async () => {
  if (isDraftPreview && currentQuote) {
    renderQuote({ ...currentQuote, quote_type: '최종견적' });
  } else {
    await fetchAdminPreviewQuote('최종견적');
  }
});

window.addEventListener('message', async event => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'SET_PREVIEW_VIEW') {
    desiredPreviewView = msg.view === 'login' ? 'login' : 'quote';
    setScreenView(desiredPreviewView);
  } else if (msg.type === 'SET_PREVIEW_DEVICE') {
    setPreviewDevice(msg.device);
  } else if (msg.type === 'SET_PREVIEW_QUOTE_TYPE') {
    if (isDraftPreview && currentQuote) {
      renderQuote({ ...currentQuote, quote_type: msg.quoteType || '가견적' });
    } else if (previewProjectId) {
      await fetchAdminPreviewQuote(msg.quoteType || '', msg.quoteId || '');
    }
  } else if (msg.type === 'UPDATE_DRAFT_QUOTE' && msg.quote) {
    renderQuote(msg.quote);
  } else if (msg.type === 'LOAD_PREVIEW_QUOTE' && msg.quote) {
    renderQuote(msg.quote);
    if (msg.maskedHint) {
      const hint = document.getElementById('login-hint');
      hint.innerHTML = msg.maskedHint;
      hint.hidden = false;
    }
    desiredPreviewView = msg.view === 'login' ? 'login' : 'quote';
    setScreenView(desiredPreviewView);
  }
});

// Boot Logic
async function init() {
  // 1. Admin Preview Mode
  if (isPreview) {
    setPreviewDevice(initialDevice);
    if (!isEmbed) {
      document.getElementById('preview-bar').hidden = false;
      const bRough = document.getElementById('btn-prev-rough');
      const bFinal = document.getElementById('btn-prev-final');
      if (bRough && bFinal) {
        bRough.hidden = false;
        bFinal.hidden = false;
        bRough.classList.add('type-btn');
        bFinal.classList.add('type-btn');
      }
    }

    if (isDraftPreview) {
      try {
        const raw = sessionStorage.getItem('kcc_draft_quote_preview');
        if (raw) {
          const draftQuote = JSON.parse(raw);
          if (previewTypeParam) draftQuote.quote_type = previewTypeParam;
          renderQuote(draftQuote);
          const hint = document.getElementById('login-hint');
          hint.innerHTML = `<strong>${esc(draftQuote.customer_name)}</strong> 고객님 (${esc(draftQuote.customer_phone || '010-****-0000')}) 전용 <b>${esc(draftQuote.quote_type || '가견적')}</b>이 도착했습니다.<br>본인 성함과 휴대폰 번호를 입력해 로그인하세요.`;
          hint.hidden = false;
          setScreenView(desiredPreviewView === 'login' ? 'login' : 'quote');
          return;
        }
      } catch {}
    }

    if (previewProjectId) {
      try {
        const data = await fetchAdminPreviewQuote(previewTypeParam, previewQuoteIdParam);
        if (data) {
          setScreenView(desiredPreviewView === 'login' ? 'login' : 'quote');
          return;
        }
      } catch {}

      try {
        const fbRaw = sessionStorage.getItem('kcc_fallback_quote_preview');
        if (fbRaw) {
          const fbQuote = JSON.parse(fbRaw);
          if (previewTypeParam) fbQuote.quote_type = previewTypeParam;
          renderQuote(fbQuote);
          setScreenView(desiredPreviewView === 'login' ? 'login' : 'quote');
          return;
        }
      } catch {}
    }
  }

  // 2. Customer Mode: Restore active HttpOnly session cookie if valid for this token
  try {
    const sessUrl = urlToken
      ? `/api/public/quotes/session/current?token=${encodeURIComponent(urlToken)}`
      : '/api/public/quotes/session/current';
    const sessRes = await fetch(sessUrl, { credentials: 'same-origin' });
    if (sessRes.ok) {
      const sessData = await sessRes.json();
      if (sessData?.authenticated && sessData?.quote) {
        viewerToken = sessData.viewer_token || '';
        csrfToken = sessData.csrf_token || '';
        if (sessData.available_quotes && sessData.available_quotes.length > 1) {
          setupMultiQuoteSelector(sessData.available_quotes, sessData.quote.access_token);
        }
        renderQuote(sessData.quote);
        setScreenView('quote');
        return;
      }
    }
  } catch {}

  if (urlToken) {
    // Fetch masked info for token to display helpful customer login prompt
    try {
      const res = await fetch(`/api/public/quotes/${encodeURIComponent(urlToken)}`);
      const info = await res.json().catch(() => ({}));
      const hint = document.getElementById('login-hint');
      if (!res.ok) {
        const errBox = document.getElementById('login-error');
        errBox.textContent = info.error || '유효하지 않거나 만료된 견적서 링크입니다. 아래에서 성함과 휴대폰 번호로 직접 조회해보세요.';
        errBox.hidden = false;
      } else {
        hint.innerHTML = `<strong>${esc(info.masked_name)}</strong> 고객님 (${esc(info.masked_phone)}) 앞으로 발행된 <strong>${esc(info.quote_type || '맞춤')} 견적서</strong>입니다.<br>본인 성함과 휴대폰 번호를 입력하시면 바로 확인하실 수 있습니다.`;
        hint.hidden = false;
      }
    } catch {}
  } else {
    const hint = document.getElementById('login-hint');
    hint.innerHTML = `문자와 카카오톡으로 안내받으신 <strong>성함</strong>과 <strong>휴대폰 번호</strong>를 입력하시면 고객님의 모바일 견적서를 확인하실 수 있습니다.`;
    hint.hidden = false;
  }

  setScreenView('login');
}

window.KccQuoteApp = {
  getCurrentQuote: () => currentQuote,
  getViewerToken: () => viewerToken,
  getCsrfToken: () => csrfToken,
  isPreview: () => isPreview,
  getPlans: () => plans,
  openConsult: (topic, context, methodKey, depositAmt) => openConsult(topic, context, methodKey, depositAmt),
  showToast: msg => showToast(msg),
  requireReLogin: msg => {
    viewerToken = '';
    csrfToken = '';
    setScreenView('login');
    if (msg) {
      const errBox = document.getElementById('login-error');
      if (errBox) {
        errBox.textContent = msg;
        errBox.hidden = false;
      }
    }
  }
};

init();
