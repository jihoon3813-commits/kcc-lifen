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
let viewerToken = '';
let selectedPlan = 'cash';
let activePaymentMethod = 'cash';
let activeDepositAmount = null;
let activeContext = '';
let focusBeforeDialog = null;
let isSubmittingConsult = false;

let plans = {
  cash: { name: '일시불 할인 결제', detail: '선금 50% / 잔금 50%', button: '일시불 결제 상담하기' },
  lowupfront: { name: '초기 부담을 줄이는 렌탈', detail: '60개월 렌탈', button: '초기 부담 완화 조건 상담하기' },
  lowmonthly: { name: '월 부담을 줄이는 렌탈', detail: '60개월 렌탈', button: '월 부담 완화 조건 상담하기' }
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

function choosePlan(key) {
  if (!plans[key]) key = 'cash';
  selectedPlan = key;
  document.querySelectorAll('[data-plan]').forEach(card => {
    const selected = card.dataset.plan === key;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-checked', String(selected));
    card.tabIndex = selected ? 0 : -1;
  });
  const cta = document.getElementById('plan-cta');
  if (cta) {
    cta.innerHTML = `${esc(plans[key].button)}<svg><use href="#i-arrow"/></svg>`;
  }
}

function renderQuote(q) {
  currentQuote = q;
  const product = q.product || '창호';
  const cashPrice = Number(q.total_price) || 0;
  const discountAmount = Number(q.discount_amount) || 0;
  const originalPrice = Number(q.original_price) || (cashPrice + discountAmount);
  const splitDeposit = Number(q.split_deposit) || Math.round(cashPrice / 2);
  const splitBalance = Number(q.split_balance) || (cashPrice - splitDeposit);
  const quoteNo = q.quote_no || String(q.project_id || q.id || 0).padStart(4, '0');
  const quoteType = q.quote_type || '가견적';
  const isFinal = quoteType === '최종견적';
  const customerName = q.customer_name || '고객';

  document.title = `KCC홈씨씨 · ${customerName} 고객님 ${product} ${quoteType}`;
  document.getElementById('header-product-label').textContent = `나의 ${product} ${quoteType}`;
  const heroBadge = document.getElementById('hero-badge');
  heroBadge.textContent = isFinal ? '최종견적 · 실측확정' : (quoteType === '가견적' ? '가견적 · 실측전' : quoteType);
  heroBadge.className = `quote-badge ${isFinal ? 'is-final' : 'is-rough'}`;
  document.getElementById('hero-greeting').textContent = `${customerName} 고객님을 위한 ${quoteType} 제안`;
  document.getElementById('hero-heading').innerHTML = `우리 집 ${esc(product)} 교체,<br>비용과 결제 방법을<br><span>한눈에.</span>`;

  // Address & No.
  const addrParts = String(q.customer_address || '').split('·').map(s => s.trim()).filter(Boolean);
  const locEl = document.getElementById('customer-location');
  if (addrParts.length >= 2) {
    locEl.innerHTML = `${esc(addrParts[0])} <i></i> ${esc(addrParts.slice(1).join(' · '))}`;
  } else {
    locEl.textContent = q.customer_address || '맞춤 시공 현장';
  }
  document.getElementById('customer-no').textContent = `No. ${quoteNo}`;

  // Top Quote Card
  document.getElementById('quote-top-label').textContent = isFinal
    ? (discountAmount > 0 ? '일시불 할인 적용 최종 확정금액' : '방문 실측 반영 최종 확정금액')
    : (discountAmount > 0 ? '일시불 할인 적용 가견적 금액' : '고객 맞춤 가견적 예상금액');
  document.getElementById('quote-price').innerHTML = `${num(cashPrice)}<span>원</span>`;

  const discountBox = document.getElementById('quote-discount');
  if (discountAmount > 0) {
    discountBox.hidden = false;
    document.getElementById('quote-original-price').textContent = money(originalPrice);
    document.getElementById('quote-discount-badge').innerHTML = `<svg><use href="#i-down"/></svg> ${money(discountAmount)} 할인`;
  } else {
    discountBox.hidden = true;
  }

  document.getElementById('split-pay-amount').textContent = splitDeposit === splitBalance
    ? `각 ${money(splitDeposit)}`
    : `${money(splitDeposit)} / ${money(splitBalance)}`;
  document.getElementById('quote-date').textContent = `${quoteType}일 ${formatDotDate(q.published_at)}`;

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
  const pLowUp = plans.lowupfront;
  const pLowMo = plans.lowmonthly;

  document.getElementById('cash-main-label').textContent = pCash.mainLabel || '할인 적용 금액';
  document.getElementById('cash-main-amount').innerHTML = `${num(pCash.mainAmount ?? cashPrice)}<small>원</small>`;
  document.getElementById('cash-deposit').textContent = money(pCash.deposit ?? splitDeposit);
  document.getElementById('cash-balance').textContent = money(pCash.balance ?? splitBalance);
  document.getElementById('cash-total').textContent = `총 ${money(pCash.total ?? cashPrice)}`;

  document.getElementById('lowup-monthly').innerHTML = `${num(pLowUp.mainAmount)}<small>원</small>`;
  document.getElementById('lowup-upfront').textContent = money(pLowUp.upfront);
  document.getElementById('lowup-total').textContent = `총 ${money(pLowUp.total)}`;

  document.getElementById('lowmo-monthly').innerHTML = `${num(pLowMo.mainAmount)}<small>원</small>`;
  document.getElementById('lowmo-upfront').textContent = money(pLowMo.upfront);
  document.getElementById('lowmo-total').textContent = `총 ${money(pLowMo.total)}`;

  choosePlan('cash');

  // Smart Subscription Calculator
  const depositInput = document.getElementById('deposit');
  const defaultDep = Math.floor((cashPrice / 2) / 10000) * 10000;
  depositInput.max = String(cashPrice);
  depositInput.value = String(defaultDep);
  document.getElementById('deposit-error').textContent = `0원부터 ${money(cashPrice)} 사이로 입력해주세요.`;
  validateDeposit();

  // Items separation: Windows (main items) vs Extra Works
  const items = Array.isArray(q.items) ? q.items : [];
  const windowItems = items.filter(i => i.category !== 'extra');
  const extraItems = items.filter(i => i.category === 'extra');
  const displayMainItems = windowItems.length > 0 ? windowItems : items;

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

  // Section 03: Detailed Window Accordion
  document.getElementById('window-count-badge').textContent = `${product} ${displayMainItems.length}`;
  document.getElementById('window-list').innerHTML = displayMainItems.map(w => {
    const d = w.detail || {};
    const amount = w.amount_vat_inc ?? Math.round((w.sale_total || 0) * 1.1);
    const rows = [
      ['규격', d.size || w.spec || '맞춤 규격'],
      ['창 형태', d.shape || `${w.quantity || 1}식`],
      ['모델명', d.model || 'KCC HOMECC 정품'],
      ['유리 사양', d.glass || '표준 로이유리'],
      ['핸들', d.handle || '표준 핸들'],
      ['방충망', d.mesh || '현장 기준']
    ];
    return `<details class="window-item">
      <summary>
        <div class="window-thumb">${windowIcon(d.panes || 2)}</div>
        <div class="window-name"><strong>${esc(w.name)}</strong><small>${esc(d.type || w.spec || product)}</small></div>
        <strong class="window-amount">${money(amount)}</strong>
        <svg><use href="#i-down"/></svg>
      </summary>
      <div class="window-detail">
        <dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        ${d.upgrade ? '<span class="tag">더블로이 유리 · 고급 사양 적용</span>' : ''}
        <button class="text-link" type="button" data-consult="${esc(w.name)} 사양 상담">이 항목에 대해 문의하기<svg><use href="#i-arrow"/></svg></button>
      </div>
    </details>`;
  }).join('');

  // Re-bind dynamic [data-consult] buttons inside #window-list
  document.querySelectorAll('#window-list [data-consult]').forEach(btn => {
    btn.addEventListener('click', () => openConsult(btn.dataset.consult));
  });

  // Extra Costs List
  const extraBox = document.getElementById('extra-costs-box');
  if (extraItems.length > 0 && windowItems.length > 0) {
    extraBox.hidden = false;
    document.getElementById('extra-costs-count').textContent = `${extraItems.length}개 항목`;
    document.getElementById('extra-costs-list').innerHTML = extraItems.map(ex => {
      const amount = ex.amount_vat_inc ?? Math.round((ex.sale_total || 0) * 1.1);
      const sub = ex.detail?.sub ? ` <small>${esc(ex.detail.sub)}</small>` : '';
      return `<div><dt>${esc(ex.name)}${sub}</dt><dd>${money(amount)}</dd></div>`;
    }).join('');
  } else {
    extraBox.hidden = true;
  }

  document.getElementById('item-total-amount').textContent = money(originalPrice);
  const sumDisplayed = items.reduce((s, i) => s + (i.amount_vat_inc ?? Math.round((i.sale_total || 0) * 1.1)), 0);
  document.getElementById('item-diff-note').hidden = Math.abs(sumDisplayed - originalPrice) <= 10;

  // FAQ & Contact & Aside & Footer
  document.getElementById('faq-split-text').textContent =
    `현재 견적은 선금 50%와 잔금 50%로 나누어 납부하는 방식입니다. 일시불 기준 선금 ${money(splitDeposit)}, 잔금 ${money(splitBalance)}이며 납부 시점은 상담에서 안내해드립니다.`;
  document.getElementById('contact-heading').innerHTML = `${esc(customerName)} 고객님,<br>어떤 부분을 도와드릴까요?`;

  document.getElementById('aside-avatar').textContent = customerName.slice(0, 1);
  document.getElementById('aside-name').textContent = `${customerName} 고객님`;
  document.getElementById('aside-meta').textContent = `${quoteType} No. ${quoteNo}${addrParts[1] ? ' · ' + addrParts[1] : ''}`;
  document.getElementById('aside-price-label').textContent = discountAmount > 0 ? '일시불 할인 적용' : '고객 견적금액';
  document.getElementById('aside-cash-price').textContent = money(cashPrice);
  document.getElementById('aside-item-label').textContent = `${product} 교체`;
  document.getElementById('aside-window-count').textContent = `${displayMainItems.length}개 항목`;

  document.getElementById('footer-partner-name').textContent = q.partner_name || '(주)라이프앤조이';
  document.getElementById('footer-manager-info').textContent = `${q.manager_name || '전담 상담사'} · ${q.manager_phone || '1588-0000'}`;
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
}

// Payment Card Events
document.querySelectorAll('[data-plan]').forEach((card, index) => {
  card.addEventListener('click', () => choosePlan(card.dataset.plan));
  card.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      const cards = [...document.querySelectorAll('[data-plan]')];
      const next = (index + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) + cards.length) % cards.length;
      choosePlan(cards[next].dataset.plan);
      cards[next].focus();
    }
  });
});

// Smart Subscription Validation
const deposit = document.getElementById('deposit');
function validateDeposit() {
  const maxPrice = Number(currentQuote?.total_price) || 10500000;
  const value = Number(deposit.value);
  const valid = deposit.value.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= maxPrice;
  document.getElementById('deposit-error').hidden = valid;
  document.getElementById('balance').textContent = valid ? money(maxPrice - value) : '금액을 확인해주세요';
  deposit.setAttribute('aria-invalid', String(!valid));
  return valid;
}
deposit.addEventListener('input', validateDeposit);

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

document.getElementById('subscription-cta').addEventListener('click', () => {
  if (!validateDeposit()) {
    deposit.focus();
    return;
  }
  const maxPrice = Number(currentQuote?.total_price) || 0;
  const depVal = Number(deposit.value);
  openConsult(
    '결제 방식 비교',
    `스마트 구독 · 선납금 ${money(depVal)} / 구독 전환 ${money(maxPrice - depVal)}`,
    'subscription',
    depVal
  );
});

document.querySelectorAll('[data-scroll]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('phone-btn').addEventListener('click', () => {
  const tel = String(currentQuote?.manager_phone || '1588-0000').replace(/[^\d+]/g, '');
  if (isPreview) {
    showToast(`미리보기 모드 · 실제 화면에서는 담당자(${currentQuote?.manager_phone || '1588-0000'})에게 전화 연결됩니다.`);
    return;
  }
  window.location.href = `tel:${tel}`;
});

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
    const cacheKey = `kcc_verified_quote_${data.quote.access_token || urlToken || 'portal'}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      viewer_token: viewerToken,
      quote: data.quote,
      available_quotes: data.available_quotes || null
    }));

    if (data.available_quotes && data.available_quotes.length > 1) {
      setupMultiQuoteSelector(data.available_quotes, data.quote.access_token, name, phone);
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

function setupMultiQuoteSelector(list, activeTok, name, phone) {
  const bar = document.getElementById('multi-quote-bar');
  const sel = document.getElementById('quote-select');
  bar.hidden = false;
  sel.innerHTML = list.map(item =>
    `<option value="${esc(item.access_token)}" ${item.access_token === activeTok ? 'selected' : ''}>` +
    `[${esc(item.quote_type)}] ${esc(item.title)} · ${money(item.total_price)}</option>`
  ).join('');

  sel.onchange = async () => {
    const nextTok = sel.value;
    const res = await fetch('/api/public/quotes/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: nextTok, name, phone })
    });
    if (res.ok) {
      const d = await res.json();
      viewerToken = d.viewer_token || '';
      renderQuote(d.quote);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
}

document.getElementById('logout-btn').addEventListener('click', () => {
  Object.keys(sessionStorage).forEach(k => {
    if (k.startsWith('kcc_verified_quote_')) sessionStorage.removeItem(k);
  });
  viewerToken = '';
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

  // 2. Customer Mode: Check cached login session for current token
  if (urlToken) {
    const cached = sessionStorage.getItem(`kcc_verified_quote_${urlToken}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.quote) {
          viewerToken = parsed.viewer_token || '';
          renderQuote(parsed.quote);
          setScreenView('quote');
          return;
        }
      } catch {}
    }

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

init();
