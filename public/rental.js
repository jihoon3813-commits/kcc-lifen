(() => {
  'use strict';

  const won = n => new Intl.NumberFormat('ko-KR').format(Math.round(Number(n) || 0)) + '원';
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const urlParams = new URLSearchParams(location.search);
  const supplementTokenParam = urlParams.get('supplement') || '';

  const DEFAULT_PREVIEW_TERMS = [
    {
      id: 'collection',
      version: 'v2026.11.1',
      title: '개인(신용)정보 수집·이용 동의서',
      body: '[필수] 개인(신용)정보 수집·이용 동의서\n수집·이용 주체: (주)라이프앤조이 및 KCC글라스 홈씨씨 제휴 렌탈 운영기관\n목적: 렌탈 신청 접수, 계약자 적격 확인, 납부 조건 안내 및 민원 처리'
    },
    {
      id: 'inquiry',
      version: 'v2026.11.1',
      title: '개인(신용)정보 조회 동의서',
      body: '[필수] 개인(신용)정보 조회 동의서\n조회 주체: KCC글라스 홈씨씨 제휴 렌탈 심사기관\n목적: 렌탈 약정 체결 가능 여부 및 한도 심사 확인'
    },
    {
      id: 'provision',
      version: 'v2026.11.1',
      title: '개인(신용)정보 제3자 제공 동의서',
      body: '[필수] 개인(신용)정보 제3자 제공 동의서\n제공받는 자: KCC글라스(주) 홈씨씨 시공·품질보증 부문 및 제휴 렌탈사\n목적: 렌탈 약정 심사, 정품 시공 일정 조율 및 보증 등록'
    }
  ];

  let runtimeCtx = {
    mode: 'live',
    endpoint: '/api/rental/applications',
    csrfToken: '',
    approvedTerms: false,
    quote: {
      id: '',
      quoteNo: '0000',
      version: '',
      customerName: '',
      phone: '',
      location: '',
      product: 'KCC 홈씨씨 창호 교체'
    },
    plans: {},
    termsVersion: '',
    terms: [],
    activeApplication: null
  };

  let supplementInfo = null; // Active when ?supplement=<token> is used

  const modal = document.createElement('dialog');
  modal.id = 'rental-dialog';
  modal.setAttribute('aria-labelledby', 'r-title');
  modal.innerHTML = `<div class="r-shell">
    <header class="r-head"><div class="r-topline"><div class="r-brand"><img src="https://res.cloudinary.com/lyjyvy54/image/upload/v1794544823/01_full_color_homecc_BI2_1_mmapgw.png" alt="KCC 홈씨씨" style="object-fit:contain"><span id="r-brand-label">렌탈 신청</span></div><button class="r-close" type="button" aria-label="렌탈 신청 닫기">×</button></div>
    <div class="r-eyebrow" id="r-head-eyebrow">MY HOME · RENTAL APPLICATION</div><h2 id="r-title" tabindex="-1">내 집을 위한 새로운 시작.</h2><p id="r-subtitle">견적에서 바로, 간편하게 신청하세요.</p>
    <ol class="r-progress" aria-label="신청 진행 단계"><li><i>1</i>정보 확인</li><li><i>2</i>신분증 등록</li><li><i>3</i>동의·서명</li></ol></header>
    <div class="r-body">
      <div class="r-preview" id="r-preview-banner" hidden><strong>미리보기 모드</strong><span>관리자 미리보기 화면입니다. 실제 접수되지 않으며 테스트 이미지로 전 과정을 확인할 수 있습니다.</span></div>
      <div class="r-supplement-notice" id="r-supplement-banner" hidden><strong id="r-sup-title">서류 보완 안내</strong><span id="r-sup-msg"></span></div>
      <section data-r-step="1"><div class="r-panel"><h3 class="r-section-title"><span>01</span><b id="r-step1-heading" style="font-weight:750">신청자 정보를 확인해주세요.</b></h3><div class="r-fields">
        <div class="r-field"><label for="r-name">계약자 이름</label><input id="r-name" readonly autocomplete="off"></div>
        <div class="r-field"><label for="r-phone">휴대폰 번호</label><input id="r-phone" readonly autocomplete="off"></div>
        <div class="r-field wide" id="r-birth-wrap"><label for="r-birth">생년월일 <span aria-hidden="true">*</span></label><input id="r-birth" type="text" inputmode="numeric" autocomplete="off" placeholder="YYYY-MM-DD" maxlength="10" aria-required="true" aria-describedby="r-birth-help r-birth-error"><small id="r-birth-help">숫자 8자리를 입력하면 자동으로 구분됩니다. (만 19세 이상 계약자 본인)</small><p id="r-birth-error" class="r-error" hidden></p></div>
      </div><p class="r-note" id="r-step1-note">견적서의 신청자 정보입니다. 정보가 다르면 담당자에게 변경을 요청해주세요.</p></div>
      <div id="r-plan-card" class="r-panel r-amount"></div>
      <label class="r-checkline" id="r-price-check-wrap"><input id="r-price-check" type="checkbox"><span>위 <b>초회납입금 및 월 납부액</b>을 확인했습니다.</span></label>
      <p class="r-note">신청 후 담당자가 계약 조건과 진행 가능 여부를 안내합니다. 신청만으로 계약이 확정되지는 않습니다.</p></section>
      <section data-r-step="2" hidden><div class="r-eyebrow">DOCUMENT VERIFICATION</div><h3 class="r-upload-title">계약자 본인의<br>신분증을 등록해주세요.</h3><p class="r-lead">사진을 선택하거나 바로 촬영할 수 있어요.<br>등록한 파일은 제출 전까지 변경할 수 있습니다.</p>
      <div class="r-panel"><div id="r-empty-file" class="r-upload-box"><div class="r-id-art" aria-hidden="true"><div class="r-id-person"></div><div class="r-id-lines"><i></i><i></i><i></i></div></div><strong>신분증 사진 1장</strong><p>JPG · PNG · HEIC · 최대 10MB</p></div>
      <div id="r-file-card" class="r-file-card" hidden><img id="r-file-preview" alt="선택한 첨부 이미지 미리보기"><p class="r-file-fallback" id="r-file-fallback" hidden>이 브라우저에서 미리보기를 지원하지 않는 형식입니다.<br>파일은 선택되었습니다. 선명한 JPG 또는 PNG로 바꿀 수 있어요.</p><div class="r-file-meta"><div><strong id="r-file-name"></strong><small id="r-file-size"></small></div><button class="r-remove" type="button">삭제</button></div></div>
      <div class="r-upload-buttons"><button id="r-choose-file" type="button">사진 선택</button><button id="r-take-photo" type="button">카메라로 촬영</button></div>
      <input id="r-file-input" type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" hidden><input id="r-camera-input" type="file" accept="image/*" capture="environment" hidden>
      <p id="r-file-error" class="r-error" role="alert" hidden></p><ul class="r-tips"><li>신분증의 네 모서리가 모두 보이게 촬영해주세요.</li><li>빛 반사나 흔들림 없이 선명한 사진을 사용해주세요.</li><li>등록된 서류는 암호화되어 비공개 보관되며 권한 있는 담당자만 확인합니다.</li></ul></div><p class="r-note">카메라 실행 여부는 기기와 브라우저에 따라 달라집니다. 사진 선택으로도 등록할 수 있어요.</p></section>
      <section data-r-step="3" hidden><div class="r-panel" id="r-consent-panel"><h3 class="r-section-title"><span>03</span>신청에 필요한 동의</h3><label class="r-checkline r-all"><input id="r-all-terms" type="checkbox"><span>모든 약관에 전체 동의합니다.</span></label><div id="r-terms"></div><p class="r-terms-note" id="r-terms-preview-note" hidden>관리자 미리보기 화면입니다. 운영 환경에서는 승인된 최신 약관 버전이 결합됩니다.</p></div>
      <div class="r-panel"><div class="r-sign-top"><h3>전자 서명 <small style="color:#2967e8">필수</small></h3><div><button id="r-sign-expand" type="button" aria-expanded="false">크게 쓰기</button><button id="r-sign-clear" type="button">다시 쓰기</button></div></div><div class="r-sign-wrap"><canvas id="r-signature" aria-label="손가락 또는 마우스로 서명하는 영역" role="img"></canvas><div class="r-sign-hint"><span>✎</span>이곳에 계약자 본인이 서명해주세요.</div></div><div class="r-sign-status"><span id="r-sign-status" role="status">아직 서명하지 않았어요.</span><span>손가락 · 마우스 · 펜</span></div><p class="r-note">위 신청 내용과 동의서를 확인한 후 서명해주세요. 서명은 이번 신청 내용과 함께 제출됩니다.</p></div>
      <div id="r-final-summary" class="r-summary"></div></section>
      <section id="r-complete" class="r-success" hidden><div class="r-success-icon">✓</div><div class="r-eyebrow" id="r-complete-eyebrow">APPLICATION RECEIVED</div><h3 id="r-complete-heading">렌탈 신청이<br>접수되었습니다.</h3><p id="r-complete-desc">담당자가 신청 내용과 제출 서류를 확인한 뒤 연락드립니다.<br>렌탈사 승인 및 최종 계약 확정 여부는 별도로 안내합니다.</p><div id="r-receipt" class="r-summary"></div><ol class="r-next-steps"><li>신청 내용 및 제출 서류 확인</li><li>필요 시 보완 안내 및 렌탈사 심사 진행</li><li>렌탈사 승인 후 계약 확정 및 시공 일정 협의</li></ol></section>
    </div>
    <footer class="r-footer"><p id="r-form-error" class="r-error" role="alert" hidden></p><div class="r-footer-status"><span id="r-step-label">STEP 1 OF 3</span><b id="r-footer-amount"></b></div><div class="r-button-row"><button id="r-prev" class="r-button r-secondary" type="button" hidden>이전</button><button id="r-next" class="r-button r-primary" type="button">신분증 등록하기 <span>→</span></button></div></footer>
    <div class="r-exit" role="alertdialog" aria-modal="true" aria-labelledby="r-exit-title" hidden><div><h3 id="r-exit-title">작성을 중단할까요?</h3><p>입력한 생년월일, 첨부파일과 서명이 삭제됩니다. 계속 작성하면 지금 내용을 유지할 수 있어요.</p><div class="r-button-row"><button id="r-continue" class="r-button r-primary" type="button">계속 작성하기</button><button id="r-discard" class="r-button r-secondary" type="button">내용 지우고 닫기</button></div></div></div>
  </div>`;
  document.body.append(modal);

  const $ = id => modal.querySelector('#' + id);
  const body = modal.querySelector('.r-body');
  const canvas = $('r-signature');
  const ctx = canvas.getContext('2d');

  let step = 1;
  let planKey = '';
  let isSupplementFlow = false;
  let file = null;
  let fileUrl = '';
  let strokes = [];
  let drawing = false;
  let currentStroke = null;
  let changed = false;
  let busy = false;
  let complete = false;
  let originFocus = null;
  let requestKey = '';
  let lastPayload = '';
  let fileSelectionId = 0;
  let canvasScale = 1;

  const isPreviewMode = () => Boolean(window.KccQuoteApp?.isPreview?.());
  const total = p => (Number(p?.upfront) || 0) + (Number(p?.monthly) || 0) * (Number(p?.months) || 60);

  function summaryHtml(p) {
    return `<div><span>선택 상품</span><strong>${escape(runtimeCtx.quote.product || 'KCC 홈씨씨 창호 교체')}</strong></div>` +
      `<div><span>초회납입금</span><strong>${won(p.upfront)}</strong></div>` +
      `<div><span>월 납부액</span><strong>${won(p.monthly)} / ${p.months}개월</strong></div>`;
  }

  function renderTermsList(terms) {
    $('r-terms').innerHTML = terms.map(t => (
      `<div class="r-term"><div class="r-term-head">` +
      `<label class="r-checkline"><input type="checkbox" name="r-term" value="${escape(t.id)}" data-version="${escape(t.version || runtimeCtx.termsVersion)}"><span>${escape(t.title)} <small>(필수)</small></span></label>` +
      `<button type="button" aria-expanded="false" aria-controls="r-term-${escape(t.id)}">보기</button>` +
      `</div><div class="r-term-copy" id="r-term-${escape(t.id)}" hidden>${escape(t.body)}</div></div>`
    )).join('');

    modal.querySelectorAll('[name=r-term]').forEach(i => i.addEventListener('change', syncAll));
    modal.querySelectorAll('.r-term-head button').forEach(b => b.addEventListener('click', () => {
      const target = $(b.getAttribute('aria-controls'));
      if (!target) return;
      target.hidden = !target.hidden;
      b.setAttribute('aria-expanded', String(!target.hidden));
      b.textContent = target.hidden ? '보기' : '접기';
    }));
  }

  function renderActiveApplicationBanner() {
    const banner = document.getElementById('rental-active-banner');
    if (!banner) return;
    const active = runtimeCtx.activeApplication;
    if (!active || isPreviewMode()) {
      banner.hidden = true;
      banner.innerHTML = '';
      return;
    }

    const isNeedsInfo = active.status === 'needs_info';
    banner.className = `rental-active-banner${isNeedsInfo ? ' is-needs-info' : ''}`;
    const supMsg = isNeedsInfo && active.supplement?.customerMessage
      ? `<div style="margin-top:2px"><b>보완 안내:</b> ${escape(active.supplement.customerMessage)}</div>`
      : '';
    const noteText = active.status === 'confirmed'
      ? '렌탈사 승인 및 계약 확정이 완료되었습니다.'
      : isNeedsInfo
      ? '담당자 서류 확인 결과 보완 등록이 필요합니다.'
      : '렌탈 신청 접수가 완료되어 담당자가 서류를 검토 중입니다. (렌탈사 승인·계약 확정 전 단계)';

    banner.innerHTML =
      `<div class="rental-active-banner-head">` +
      `<strong>접수번호 ${escape(active.receiptId)} · ${escape(active.planTitle || '60개월 렌탈')}</strong>` +
      `<span class="rental-active-pill">${escape(active.statusLabel)}</span>` +
      `</div>` +
      `<div>초기 ${won(active.upfront)} · 월 ${won(active.monthly)} × ${active.months}개월 (총 ${won(active.total)})<br>${escape(noteText)}</div>` +
      supMsg;
    banner.hidden = false;
  }

  async function syncRentalContext() {
    if (isPreviewMode()) {
      const q = window.KccQuoteApp?.getCurrentQuote?.();
      if (!q) return false;
      const p = q.plans || window.KccQuoteApp?.getPlans?.() || {};
      runtimeCtx = {
        mode: 'preview',
        endpoint: '',
        csrfToken: '',
        approvedTerms: false,
        quote: {
          id: String(q.id || q.project_id || '0000'),
          quoteNo: String(q.quote_no || '0000'),
          version: `preview-v${q.version || 1}`,
          customerName: q.customer_name || '고객',
          phone: q.customer_phone || '010-****-0000',
          location: q.customer_address || '',
          product: `KCC 홈씨씨 ${q.product || '창호'} 교체`
        },
        plans: {
          plan111: {
            title: p.plan111?.name || '월 111,000원 렌탈 플랜',
            upfront: p.plan111?.upfront ?? Math.max(0, (q.total_price || 0) - 5000000),
            monthly: 111000,
            months: 60
          },
          plan222: {
            title: p.plan222?.name || '월 222,000원 렌탈 플랜',
            upfront: p.plan222?.upfront ?? Math.max(0, (q.total_price || 0) - 10000000),
            monthly: 222000,
            months: 60
          },
          plan333: {
            title: p.plan333?.name || '월 333,000원 렌탈 플랜',
            upfront: p.plan333?.upfront ?? Math.max(0, (q.total_price || 0) - 15000000),
            monthly: 333000,
            months: 60
          },
          lowupfront: {
            title: p.plan222?.name || '월 222,000원 렌탈 플랜',
            upfront: p.plan222?.upfront ?? Math.max(0, (q.total_price || 0) - 10000000),
            monthly: 222000,
            months: 60
          },
          lowmonthly: {
            title: p.plan111?.name || '월 111,000원 렌탈 플랜',
            upfront: p.plan111?.upfront ?? Math.max(0, (q.total_price || 0) - 5000000),
            monthly: 111000,
            months: 60
          }
        },
        termsVersion: 'preview-2026.11',
        terms: DEFAULT_PREVIEW_TERMS,
        activeApplication: null
      };
      renderTermsList(runtimeCtx.terms);
      renderActiveApplicationBanner();
      return true;
    }

    const vTok = window.KccQuoteApp?.getViewerToken?.() || '';
    const headers = vTok ? { 'Authorization': `Bearer ${vTok}` } : {};
    try {
      const res = await fetch('/api/rental/context', {
        method: 'GET',
        credentials: 'same-origin',
        headers
      });
      if (res.status === 401) {
        return false;
      }
      if (!res.ok) return false;
      const data = await res.json();
      runtimeCtx = data;
      renderTermsList(runtimeCtx.terms || []);
      renderActiveApplicationBanner();
      return true;
    } catch {
      return false;
    }
  }

  window.addEventListener('kcc:quote-rendered', () => {
    syncRentalContext();
  });

  function setError(message = '') {
    const error = $('r-form-error');
    error.hidden = !message;
    error.textContent = message;
  }

  function clearSignature() {
    strokes = [];
    currentStroke = null;
    drawing = false;
    paint();
    signStatus();
  }

  function signed() {
    return strokes.some(stroke =>
      stroke.reduce((len, p, i) => i ? len + Math.hypot(p.x - stroke[i - 1].x, p.y - stroke[i - 1].y) : 0, 0) > 0.07
    );
  }

  function signStatus() {
    const yes = signed();
    modal.querySelector('.r-sign-hint').hidden = yes;
    $('r-sign-status').textContent = yes ? '서명을 입력했어요.' : '아직 서명하지 않았어요.';
    $('r-sign-status').classList.toggle('signed', yes);
  }

  function clearFile() {
    fileSelectionId++;
    file = null;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = '';
    $('r-file-preview').removeAttribute('src');
    $('r-file-card').hidden = true;
    $('r-empty-file').hidden = false;
    $('r-file-input').value = '';
    $('r-camera-input').value = '';
    $('r-file-error').hidden = true;
  }

  function discard() {
    if (busy) return;
    modal.close();
  }

  function exitAsk() {
    if (busy) return;
    if (!changed || complete) {
      discard();
      return;
    }
    modal.querySelector('.r-exit').hidden = false;
    modal.querySelector('.r-head').inert = true;
    body.inert = true;
    modal.querySelector('.r-footer').inert = true;
    $('r-continue').focus();
  }

  function exitCancel() {
    modal.querySelector('.r-exit').hidden = true;
    modal.querySelector('.r-head').inert = false;
    body.inert = false;
    modal.querySelector('.r-footer').inert = false;
    modal.querySelector('.r-close').focus();
  }

  function setStep(n) {
    step = n;
    setError();
    const preview = isPreviewMode();
    modal.querySelectorAll('[data-r-step]').forEach(el => {
      el.hidden = Number(el.dataset.rStep) !== n;
    });
    modal.querySelectorAll('.r-progress li').forEach((li, i) => {
      li.classList.toggle('current', i + 1 === n);
      li.classList.toggle('complete', i + 1 < n);
      if (i + 1 === n) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.querySelector('i').textContent = i + 1 < n ? '✓' : i + 1;
    });
    $('r-prev').hidden = n === 1;

    if (isSupplementFlow) {
      $('r-next').textContent = [
        '',
        '보완 신분증 등록으로 이동  →',
        '서명 확인 단계로 계속  →',
        '보완 서류 최종 제출하기  →'
      ][n];
    } else {
      $('r-next').textContent = [
        '',
        '신분증 등록하기  →',
        '동의·서명으로 계속  →',
        preview ? '신청 완료 화면 확인하기  →' : '렌탈 신청 접수하기  →'
      ][n];
    }

    $('r-step-label').textContent = `STEP ${n} OF 3`;
    $('r-title').textContent = isSupplementFlow
      ? ['', '계약자 본인 확인', '보완 서류 다시 등록', '서명 확인 및 재제출'][n]
      : ['', '내 집을 위한 새로운 시작.', '신청에 필요한 서류 등록', '마지막으로 동의와 서명'][n];
    $('r-subtitle').textContent = isSupplementFlow
      ? ['', '안내받으신 계약자 성함과 휴대폰 번호를 확인해주세요.', '선명한 신분증 사진을 다시 선택하거나 촬영해주세요.', '서명을 입력하면 보완 서류 제출이 완료됩니다.'][n]
      : ['', '견적에서 바로, 간편하게 신청하세요.', '계약자 본인의 신분증을 준비해주세요.', '신청 내용을 확인하고 서명해주세요.'][n];

    body.scrollTop = 0;
    $('r-title').focus({ preventScroll: true });
    if (n === 3) requestAnimationFrame(resizeCanvas);
  }

  async function openPlanModal(key) {
    const ok = await syncRentalContext();
    if (!ok) {
      window.KccQuoteApp?.requireReLogin?.('본인확인 세션이 만료되었습니다. 다시 로그인 후 렌탈을 신청해 주세요.');
      return;
    }

    if (!isPreviewMode() && runtimeCtx.activeApplication) {
      const act = runtimeCtx.activeApplication;
      window.KccQuoteApp?.showToast?.(`이미 진행 중인 렌탈 신청(${act.receiptId} · ${act.statusLabel})이 있습니다.`);
      document.getElementById('rental-active-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const p = runtimeCtx.plans?.[key];
    if (!p) return;

    isSupplementFlow = false;
    originFocus = document.activeElement;
    planKey = key;
    step = 1;
    changed = false;
    complete = false;
    requestKey = crypto.randomUUID();
    lastPayload = '';

    const preview = isPreviewMode();
    $('r-brand-label').textContent = '렌탈 신청';
    $('r-head-eyebrow').textContent = 'MY HOME · RENTAL APPLICATION';
    $('r-preview-banner').hidden = !preview;
    $('r-terms-preview-note').hidden = !preview;
    $('r-supplement-banner').hidden = true;
    $('r-consent-panel').hidden = false;
    $('r-birth-wrap').hidden = false;
    $('r-price-check-wrap').hidden = false;

    $('r-name').readOnly = true;
    $('r-phone').readOnly = true;
    $('r-name').value = runtimeCtx.quote.customerName || '';
    $('r-phone').value = runtimeCtx.quote.phone || '';
    $('r-step1-heading').textContent = '신청자 정보를 확인해주세요.';
    $('r-step1-note').textContent = '견적서의 신청자 정보입니다. 정보가 다르면 담당자에게 변경을 요청해주세요.';

    $('r-birth').value = '';
    $('r-birth').removeAttribute('aria-invalid');
    $('r-birth-error').hidden = true;
    $('r-price-check').checked = false;

    modal.querySelectorAll('[name=r-term]').forEach(i => { i.checked = false; });
    $('r-all-terms').checked = false;
    $('r-all-terms').indeterminate = false;
    modal.querySelector('.r-sign-wrap').classList.remove('expanded');
    $('r-sign-expand').setAttribute('aria-expanded', 'false');
    $('r-sign-expand').textContent = '크게 쓰기';

    clearFile();
    clearSignature();

    modal.querySelector('.r-exit').hidden = true;
    modal.querySelector('.r-head').inert = false;
    body.inert = false;
    modal.querySelector('.r-footer').inert = false;
    modal.querySelector('.r-progress').hidden = false;
    $('r-complete').hidden = true;

    $('r-plan-card').innerHTML =
      `<div class="r-amount-title">${escape(p.title)}</div>` +
      `<div class="r-monthly"><span>매월</span><strong>${new Intl.NumberFormat('ko-KR').format(p.monthly)}<small>원</small></strong><span>/ ${p.months}개월</span></div>` +
      `<div class="r-cost-grid"><div><small>초회납입금</small><b>${won(p.upfront)}</b></div><div><small>약정기간</small><b>${p.months}개월</b></div></div>`;
    $('r-footer-amount').textContent = `월 ${won(p.monthly)} · ${p.months}개월`;
    $('r-final-summary').innerHTML = summaryHtml(p);

    modal.showModal();
    document.body.style.overflow = 'hidden';
    setStep(1);
  }

  async function openSupplementFlow(supToken) {
    try {
      const res = await fetch(`/api/rental/supplement/${encodeURIComponent(supToken)}`, {
        credentials: 'same-origin'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.KccQuoteApp?.showToast?.(data.error || '유효하지 않거나 만료된 서류 보완 링크입니다.');
        return;
      }

      supplementInfo = { token: supToken, ...data };
      isSupplementFlow = true;
      step = 1;
      changed = false;
      complete = false;
      requestKey = crypto.randomUUID();

      $('r-brand-label').textContent = '서류 보완 등록';
      $('r-head-eyebrow').textContent = `SUPPLEMENT · ${data.receiptId}`;
      $('r-preview-banner').hidden = true;
      $('r-supplement-banner').hidden = false;
      $('r-sup-title').textContent = `접수번호 ${data.receiptId} · 서류 보완 요청`;
      $('r-sup-msg').textContent = data.customerMessage || '선명한 신분증 사진을 다시 등록해 주세요.';

      // In supplement link mode, ask customer to enter exact name & phone to verify ownership
      $('r-name').readOnly = false;
      $('r-phone').readOnly = false;
      $('r-name').value = '';
      $('r-name').placeholder = `계약자 성함 (${data.maskedName})`;
      $('r-phone').value = '';
      $('r-phone').placeholder = `휴대폰 번호 (${data.maskedPhone})`;
      $('r-step1-heading').textContent = '보완 제출을 위해 본인 정보를 입력해주세요.';
      $('r-step1-note').textContent = '접수번호만으로는 서류를 변경할 수 없으며, 계약자 성함과 휴대폰 번호가 일치해야 합니다.';

      $('r-birth-wrap').hidden = true;
      $('r-price-check-wrap').hidden = true;
      $('r-consent-panel').hidden = true;

      const p = data.plan;
      $('r-plan-card').innerHTML =
        `<div class="r-amount-title">${escape(p.title)}</div>` +
        `<div class="r-monthly"><span>매월</span><strong>${new Intl.NumberFormat('ko-KR').format(p.monthly)}<small>원</small></strong><span>/ ${p.months}개월</span></div>` +
        `<div class="r-cost-grid"><div><small>초회납입금</small><b>${won(p.upfront)}</b></div><div><small>약정기간</small><b>${p.months}개월</b></div></div>`;
      $('r-footer-amount').textContent = `접수번호 ${data.receiptId}`;
      $('r-final-summary').innerHTML =
        `<div><span>접수 번호</span><strong>${escape(data.receiptId)}</strong></div>` +
        `<div><span>선택 조건</span><strong>${escape(p.title)}</strong></div>` +
        `<div><span>월 납부액 · ${p.months}개월</span><strong>${won(p.monthly)}</strong></div>` +
        `<div><span>초회납입금</span><strong>${won(p.upfront)}</strong></div>`;

      clearFile();
      clearSignature();
      modal.querySelector('.r-exit').hidden = true;
      modal.querySelector('.r-progress').hidden = false;
      $('r-complete').hidden = true;

      modal.showModal();
      document.body.style.overflow = 'hidden';
      setStep(1);
    } catch {
      window.KccQuoteApp?.showToast?.('보완 요청 정보를 불러오지 못했습니다.');
    }
  }

  // Bind Dual CTA buttons in quote.html
  document.querySelectorAll('[data-rental-open]').forEach(b => {
    b.addEventListener('click', () => openPlanModal(b.dataset.rentalOpen));
  });

  document.querySelectorAll('[data-rental-consult]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.rentalConsult;
      const allPlans = window.KccQuoteApp?.getPlans?.() || {};
      const p = allPlans[key];
      const ctxStr = p ? `${p.name} · ${p.detail}` : '60개월 렌탈 상담';
      window.KccQuoteApp?.openConsult?.('결제 방식 비교', ctxStr, key, null);
    });
  });

  modal.querySelector('.r-close').addEventListener('click', exitAsk);
  $('r-continue').addEventListener('click', exitCancel);
  $('r-discard').addEventListener('click', () => { exitCancel(); discard(); });

  modal.addEventListener('cancel', e => {
    e.preventDefault();
    if (!modal.querySelector('.r-exit').hidden) exitCancel();
    else exitAsk();
  });

  modal.addEventListener('close', () => {
    document.body.style.overflow = '';
    clearFile();
    clearSignature();
    $('r-birth').value = '';
    modal.querySelectorAll('input[type=checkbox]').forEach(i => { i.checked = false; });
    changed = false;
    if (originFocus) originFocus.focus({ preventScroll: true });
  });

  // Phone auto-hyphen when in supplement verification mode
  $('r-phone').addEventListener('input', e => {
    if ($('r-phone').readOnly) return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (digits.length < 4) e.target.value = digits;
    else if (digits.length < 8) e.target.value = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    else if (digits.length === 10) e.target.value = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    else e.target.value = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    changed = true;
  });

  // Birthdate auto-hyphen & validation
  $('r-birth').addEventListener('input', e => {
    const el = e.target;
    const caret = el.selectionStart;
    const count = el.value.slice(0, caret).replace(/\D/g, '').length;
    const digits = el.value.replace(/\D/g, '').slice(0, 8);
    el.value = digits.slice(0, 4)
      + (digits.length > 4 ? '-' + digits.slice(4, 6) : '')
      + (digits.length > 6 ? '-' + digits.slice(6, 8) : '');
    const pos = count + (count > 4 ? 1 : 0) + (count > 6 ? 1 : 0);
    el.setSelectionRange(pos, pos);
    el.removeAttribute('aria-invalid');
    $('r-birth-error').hidden = true;
    changed = true;
    clearSignature();
  });

  $('r-birth').addEventListener('keydown', e => {
    const el = e.target;
    const p = el.selectionStart;
    if (e.key === 'Backspace' && p === el.selectionEnd && p > 0 && el.value[p - 1] === '-') {
      e.preventDefault();
      el.setRangeText('', p - 2, p, 'end');
      el.dispatchEvent(new Event('input'));
    }
  });

  function validBirth() {
    const v = $('r-birth').value;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    let errText = '';
    if (!m) {
      errText = '생년월일을 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요.';
    } else {
      const year = +m[1], month = +m[2], day = +m[3];
      const date = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const isReal = year >= 1900 && date <= today && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
      if (!isReal) {
        errText = '생년월일을 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요.';
      } else {
        let age = today.getFullYear() - year;
        const md = (today.getMonth() + 1) - month;
        if (md < 0 || (md === 0 && today.getDate() < day)) age -= 1;
        if (age < 19) {
          errText = '만 19세 이상 성인 계약자만 렌탈 신청이 가능합니다.';
        }
      }
    }
    if (errText) {
      $('r-birth-error').hidden = false;
      $('r-birth-error').textContent = errText;
      $('r-birth').setAttribute('aria-invalid', 'true');
      $('r-birth').focus();
      return false;
    }
    return true;
  }

  $('r-price-check').addEventListener('change', () => {
    changed = true;
    clearSignature();
  });

  $('r-choose-file').addEventListener('click', () => $('r-file-input').click());
  $('r-take-photo').addEventListener('click', () => $('r-camera-input').click());

  async function chooseFile(e) {
    const candidate = e.target.files[0];
    if (!candidate) return;
    const sequence = ++fileSelectionId;
    let error = '';
    if (candidate.size > 10 * 1024 * 1024) {
      error = '10MB 이하의 파일을 선택해주세요.';
    } else if (!candidate.size) {
      error = '비어 있는 파일입니다. 다른 사진을 선택해주세요.';
    } else {
      const bytes = new Uint8Array(await candidate.slice(0, 32).arrayBuffer());
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const brand = String.fromCharCode(...bytes.slice(4, 12));
      const heic = brand.startsWith('ftyp') && /heic|heix|hevc|hevx|mif1|msf1/.test(String.fromCharCode(...bytes));
      if (!png && !jpg && !heic) {
        error = 'JPG, PNG 또는 HEIC 사진을 선택해주세요.';
      }
    }
    if (sequence !== fileSelectionId || !modal.open) return;
    if (error) {
      $('r-file-error').textContent = error;
      $('r-file-error').hidden = false;
      e.target.value = '';
      return;
    }
    clearFile();
    file = candidate;
    fileUrl = URL.createObjectURL(file);
    const img = $('r-file-preview');
    img.hidden = false;
    $('r-file-fallback').hidden = true;
    img.onerror = () => {
      img.hidden = true;
      $('r-file-fallback').hidden = false;
    };
    img.src = fileUrl;
    $('r-file-name').textContent = file.name;
    $('r-file-size').textContent = `${(file.size / 1024 / 1024).toFixed(2)}MB · 파일 선택 완료`;
    $('r-file-card').hidden = false;
    $('r-empty-file').hidden = true;
    changed = true;
    clearSignature();
    setError();
  }

  $('r-file-input').addEventListener('change', chooseFile);
  $('r-camera-input').addEventListener('change', chooseFile);
  modal.querySelector('.r-remove').addEventListener('click', () => {
    clearFile();
    clearSignature();
    changed = true;
  });

  function syncAll() {
    const boxes = [...modal.querySelectorAll('[name=r-term]')];
    const count = boxes.filter(x => x.checked).length;
    $('r-all-terms').checked = boxes.length > 0 && count === boxes.length;
    $('r-all-terms').indeterminate = count > 0 && count < boxes.length;
    changed = true;
    clearSignature();
  }

  $('r-all-terms').addEventListener('change', e => {
    modal.querySelectorAll('[name=r-term]').forEach(i => { i.checked = e.target.checked; });
    syncAll();
  });

  function paint() {
    if (!canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!drawing) {
      let extentX = 1, extentY = 0.01;
      for (const stroke of strokes) {
        for (const p of stroke) {
          extentX = Math.max(extentX, p.x);
          extentY = Math.max(extentY, p.y);
        }
      }
      canvasScale = Math.min(canvas.width / (extentX + 0.02), canvas.height / (extentY + 0.02));
    }
    ctx.strokeStyle = '#1b334e';
    ctx.lineWidth = 2.4 * (window.devicePixelRatio || 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      ctx.beginPath();
      stroke.forEach((p, i) => {
        const x = p.x * canvasScale, y = p.y * canvasScale;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    canvas.width = Math.round(rect.width * (window.devicePixelRatio || 1));
    canvas.height = Math.round(rect.height * (window.devicePixelRatio || 1));
    paint();
  }
  new ResizeObserver(resizeCanvas).observe(canvas);

  function point(e) {
    const r = canvas.getBoundingClientRect();
    const scale = canvasScale / (window.devicePixelRatio || 1);
    return {
      x: Math.max(0, Math.min(r.width, e.clientX - r.left)) / scale,
      y: Math.max(0, Math.min(r.height, e.clientY - r.top)) / scale
    };
  }

  canvas.addEventListener('pointerdown', e => {
    if (busy || e.button !== 0) return;
    e.preventDefault();
    drawing = true;
    currentStroke = [point(e)];
    strokes.push(currentStroke);
    canvas.setPointerCapture(e.pointerId);
    changed = true;
  });

  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    e.preventDefault();
    currentStroke.push(point(e));
    paint();
    signStatus();
  });

  function endStroke(e) {
    if (!drawing) return;
    drawing = false;
    currentStroke = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    paint();
    signStatus();
  }

  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', () => {
    drawing = false;
    currentStroke = null;
  });

  $('r-sign-clear').addEventListener('click', clearSignature);
  $('r-sign-expand').addEventListener('click', () => {
    const big = modal.querySelector('.r-sign-wrap').classList.toggle('expanded');
    $('r-sign-expand').setAttribute('aria-expanded', String(big));
    $('r-sign-expand').textContent = big ? '작게 보기' : '크게 쓰기';
  });

  $('r-prev').addEventListener('click', () => {
    if (!busy && step > 1) setStep(step - 1);
  });

  function finish(receipt, isSupDone = false) {
    complete = true;
    const preview = isPreviewMode() && !isSupDone;
    modal.querySelectorAll('[data-r-step]').forEach(el => { el.hidden = true; });
    $('r-complete').hidden = false;
    modal.querySelector('.r-progress').hidden = true;

    $('r-complete-eyebrow').textContent = preview ? 'PREVIEW COMPLETE' : (isSupDone ? 'SUPPLEMENT SUBMITTED' : 'APPLICATION RECEIVED');
    $('r-complete-heading').innerHTML = preview
      ? '신청 과정을 모두<br>확인했어요.'
      : (isSupDone ? '보완 서류 등록이<br>완료되었습니다.' : '렌탈 신청 접수가<br>완료되었습니다.');
    $('r-complete-desc').innerHTML = preview
      ? '관리자 미리보기 모드로 실제 접수나 전송은 이루어지지 않았습니다.<br>실제 고객 화면에서는 비공개 암호화 저장 후 접수번호가 부여됩니다.'
      : (isSupDone
        ? '담당자가 재등록하신 보완 서류를 확인한 뒤 심사를 이어서 진행합니다.'
        : '담당자가 신청 내용과 제출 서류를 확인한 뒤 연락드립니다.<br>렌탈사 승인 및 최종 계약 확정은 별도로 안내해드립니다.');

    $('r-title').textContent = preview ? '신청 미리보기 완료' : (isSupDone ? '보완 서류 제출 완료' : '렌탈 신청 접수 완료');
    $('r-subtitle').textContent = preview ? '입력하신 정보는 저장되지 않았습니다.' : '접수 번호와 신청 내용을 확인해주세요.';

    const p = isSupDone ? supplementInfo.plan : runtimeCtx.plans[planKey];
    $('r-receipt').innerHTML =
      `<div><span>${preview ? '미리보기 번호' : '접수 번호'}</span><strong>${escape(receipt.id)}</strong></div>` +
      summaryHtml(p);

    $('r-prev').hidden = true;
    $('r-next').textContent = '내 견적서로 돌아가기';
    $('r-step-label').textContent = preview ? 'PREVIEW' : 'RECEIVED';
    body.scrollTop = 0;

    clearFile();
    clearSignature();
    $('r-birth').value = '';
    $('r-title').focus({ preventScroll: true });

    if (!preview && !isSupDone) {
      syncRentalContext();
    }
  }

  async function submitSupplement() {
    if (!signed()) {
      setError('계약자 본인의 서명을 입력해주세요.');
      modal.querySelector('.r-sign-wrap').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (!file) {
      setStep(2);
      setError('보완 제출할 신분증 사진을 등록해주세요.');
      return;
    }

    busy = true;
    setError();
    const buttons = [...modal.querySelectorAll('button,input')];
    buttons.forEach(b => { b.disabled = true; });
    $('r-next').textContent = '보완 서류를 전송하고 있어요…';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const signature = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!signature) throw new Error('signature_blob_failed');

      const form = new FormData();
      form.append('name', $('r-name').value.trim());
      form.append('phone', $('r-phone').value.trim());
      form.append('idDocument', file, file.name);
      form.append('signature', signature, 'signature.png');

      const res = await fetch(`/api/rental/supplement/${encodeURIComponent(supplementInfo.token)}`, {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setStep(1);
        } else if (res.status === 413 || res.status === 415) {
          setStep(2);
        }
        throw new Error(data.error || '보완 서류 제출에 실패했습니다.');
      }
      // Clean ?supplement=... from URL bar without reload
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.delete('supplement');
      history.replaceState({}, '', nextUrl.pathname + nextUrl.search);
      finish({ id: data.receiptId }, true);
    } catch (err) {
      setError(err.name === 'AbortError'
        ? '전송 확인이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
        : (err.message || '보완 서류 전송 중 오류가 발생했습니다.'));
    } finally {
      clearTimeout(timeout);
      busy = false;
      buttons.forEach(b => { b.disabled = false; });
      if (!complete) $('r-next').textContent = '보완 서류 다시 제출하기  →';
    }
  }

  async function submitApplication() {
    const termBoxes = [...modal.querySelectorAll('[name=r-term]')];
    if (!termBoxes.length || !termBoxes.every(i => i.checked)) {
      setError('필수 동의 항목을 모두 확인해주세요.');
      const first = modal.querySelector('[name=r-term]:not(:checked)');
      first?.focus();
      return;
    }
    if (!signed()) {
      setError('계약자 본인의 서명을 입력해주세요.');
      modal.querySelector('.r-sign-wrap').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (!file) {
      setStep(2);
      setError('신분증 사진을 등록해주세요.');
      return;
    }

    if (isPreviewMode()) {
      finish({ id: `PREVIEW-${runtimeCtx.quote.quoteNo}` });
      return;
    }

    if (!runtimeCtx.approvedTerms || !runtimeCtx.endpoint) {
      setError('신청 서비스 연결 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
      return;
    }

    const target = new URL(runtimeCtx.endpoint, location.href);
    if (target.origin !== location.origin) {
      setError('신청 서비스 주소를 확인해주세요.');
      return;
    }

    busy = true;
    setError();
    const buttons = [...modal.querySelectorAll('button,input')];
    buttons.forEach(b => { b.disabled = true; });
    $('r-next').textContent = '신청 내용을 전송하고 있어요…';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const fingerprint = JSON.stringify({
        birth: $('r-birth').value,
        quote: runtimeCtx.quote.version,
        plan: planKey,
        terms: runtimeCtx.termsVersion,
        file: [file.name, file.size, file.lastModified],
        strokes
      });
      if (lastPayload && lastPayload !== fingerprint) {
        requestKey = crypto.randomUUID();
      }
      lastPayload = fingerprint;

      const signature = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!signature) throw new Error('signature_failed');

      const form = new FormData();
      form.append('applicant', JSON.stringify({
        name: runtimeCtx.quote.customerName,
        phone: runtimeCtx.quote.phone,
        birthDate: $('r-birth').value
      }));
      form.append('quote', JSON.stringify({
        id: runtimeCtx.quote.id,
        version: runtimeCtx.quote.version,
        plan: planKey
      }));
      form.append('consents', JSON.stringify(
        runtimeCtx.terms.map(t => ({
          id: t.id,
          version: t.version || runtimeCtx.termsVersion,
          agreed: true
        }))
      ));
      form.append('idDocument', file, file.name);
      form.append('signature', signature, 'signature.png');

      const vTok = window.KccQuoteApp?.getViewerToken?.() || '';
      const headers = {
        'Idempotency-Key': requestKey,
        'X-CSRF-Token': runtimeCtx.csrfToken
      };
      if (vTok) headers['Authorization'] = `Bearer ${vTok}`;

      const response = await fetch(target.href, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: form,
        signal: controller.signal
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          modal.close();
          window.KccQuoteApp?.requireReLogin?.('세션이 만료되었습니다. 본인확인 로그인 후 다시 신청해주세요.');
          return;
        }
        if (response.status === 413 || response.status === 415) {
          setStep(2);
          throw new Error(result.error || '첨부 사진 형식 또는 크기를 확인해주세요. (JPG·PNG·HEIC, 최대 10MB)');
        }
        if (response.status === 409) {
          if (result.code === 'ACTIVE_APPLICATION_EXISTS') {
            await syncRentalContext();
            throw new Error(result.error || '이미 접수된 렌탈 신청 건이 존재합니다.');
          }
          await syncRentalContext();
          clearSignature();
          throw new Error(result.error || '견적 또는 약관 버전이 업데이트되었습니다. 내용을 다시 확인한 후 서명해주세요.');
        }
        if (response.status === 429) {
          throw new Error(result.error || '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.');
        }
        throw new Error(result.error || '접수를 완료하지 못했습니다. 입력 내용은 유지되니 잠시 후 다시 시도해주세요.');
      }

      if (!result.receiptId || result.status !== 'received') {
        throw new Error('서버 접수 확인 응답이 올바르지 않습니다. 다시 시도해주세요.');
      }

      finish({ id: result.receiptId });
    } catch (error) {
      setError(
        error.name === 'AbortError'
          ? '접수 확인이 지연되고 있습니다. 다시 시도하면 동일한 신청 건으로 안전하게 확인합니다.'
          : (error.message || '접수를 완료하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해주세요.')
      );
    } finally {
      clearTimeout(timeout);
      busy = false;
      buttons.forEach(b => { b.disabled = false; });
      if (!complete) $('r-next').textContent = '렌탈 신청 다시 접수하기  →';
    }
  }

  $('r-next').addEventListener('click', () => {
    if (busy) return;
    setError();
    if (complete) {
      discard();
      return;
    }
    if (step === 1) {
      if (isSupplementFlow) {
        if (!$('r-name').value.trim() || $('r-phone').value.replace(/\D/g, '').length < 10) {
          setError('본인 확인을 위해 계약자 성함과 휴대폰 번호를 정확히 입력해주세요.');
          return;
        }
        setStep(2);
        return;
      }
      if (!validBirth()) return;
      if (!$('r-price-check').checked) {
        setError('납부 금액 확인에 체크해주세요.');
        $('r-price-check').focus();
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!file) {
        setError('등록할 신분증 사진을 선택해주세요.');
        return;
      }
      setStep(3);
    } else {
      if (isSupplementFlow) submitSupplement();
      else submitApplication();
    }
  });

  window.addEventListener('beforeunload', e => {
    if (modal.open && changed && !complete) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Boot: if ?supplement=<token> is present, open the supplement resubmission modal immediately
  if (supplementTokenParam) {
    openSupplementFlow(supplementTokenParam);
  }
})();
