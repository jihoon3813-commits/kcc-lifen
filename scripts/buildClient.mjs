import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const origPath = path.resolve('hoon/kcc-homecc-crm-v3-antigravity/app/app.js');
let code = fs.readFileSync(origPath, 'utf8');

function mustReplace(target, replacement, label) {
  assert(code.includes(target), `Build error: target not found for [${label}]`);
  code = code.replace(target, () => replacement);
}

// 1. Add API token, sync helpers, Live Preview Drawer, and SMS/KakaoTalk Dispatch Drawer
const helperCode = `
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

  const maskedPhone = String(c.phone || '').replace(/(\\d{3})-?(\\d{3,4})-?(\\d{4})/, '$1-****-$3');

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
    return '[KCC홈씨씨] ' + cName + ' 고객님, 요청하신 ' + product + ' 가견적서와 방문실측 안내드립니다.\\n\\n' +
      '■ 견적 구분: ' + quoteType + '\\n' +
      '■ 예상 견적가: ' + priceStr + ' (부가세 포함)\\n\\n' +
      '▼ 모바일 견적서 및 결제조건 확인하기\\n' + quoteUrl + '\\n\\n' +
      '※ 본인 확인을 위해 성함(' + cName + ')과 휴대폰 번호로 로그인해 주세요.\\n' +
      '견적서 내 [상담 요청하기]로 희망 실측 일정을 남겨주시면 빠르게 안내드리겠습니다.';
  }
  if (tplKey === 'final') {
    return '[KCC홈씨씨] ' + cName + ' 고객님, 현장 실측이 반영된 최종 모바일 견적서가 발행되었습니다.\\n\\n' +
      '■ 견적 구분: 최종견적\\n' +
      '■ 확정 견적가: ' + priceStr + ' (일시불·구독·60개월 렌탈 비교 가능)\\n\\n' +
      '▼ 내 모바일 견적서 확인하기\\n' + quoteUrl + '\\n\\n' +
      '※ 고객님 성함(' + cName + ')과 휴대폰 번호 입력 후 상세 창호 사양을 확인하실 수 있습니다.';
  }
  return '[KCC홈씨씨] ' + cName + ' 고객님, 우리 집 맞춤 ' + product + ' 모바일 견적서가 도착했습니다.\\n\\n' +
    '■ 견적 구분: ' + quoteType + '\\n' +
    '■ 예상 금액: ' + priceStr + ' (부가세 포함)\\n' +
    '■ 결제 비교: 일시불 · 스마트 구독 · 60개월 렌탈\\n\\n' +
    '▼ 나의 모바일 견적서 바로가기\\n' + quoteUrl + '\\n\\n' +
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
        '<div class="sms-bubble"><pre id="live-msg-preview">[Web발신]\\n' + msgText + '</pre></div>' +
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
  const smsHref = 'sms:' + encodeURIComponent(s.recipientPhone.replace(/[^\\d+]/g, '')) + '?body=' + encodeURIComponent(s.message);

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
`;

mustReplace("let page='customers'", helperCode + "\nlet page='customers'", 'inject helperCode');

// 2. Enhance customerRows to show 가견적 / 최종견적 preview + send-quote buttons
mustReplace(
  `<div class="row-links"><button class="link-chip \${c.quote?'':'muted'}" data-action="\${c.quote?'preview':'new-quote'}" data-id="\${c.id}">\${c.quote?'가견적 ↗':'견적 작성'}</button><button class="link-chip" data-action="customer" data-id="\${c.id}">상세보기</button></div><div class="row-bottom">\${c.quote?(c.viewed?'● 고객 열람 완료':'○ 아직 열람하지 않음'):'견적 발행 전'}</div>`,
  `<div class="row-links">\${c.quote?(c.roughQuote&&c.finalQuote?\`<button class="link-chip" data-action="preview" data-id="\${c.id}" data-type="가견적">가견적 ↗</button><button class="link-chip" style="background:#eef8f4;border-color:#a8dac6;color:#1f6853" data-action="preview" data-id="\${c.id}" data-type="최종견적">최종견적 ↗</button>\`:\`<button class="link-chip" data-action="preview" data-id="\${c.id}" data-type="\${esc(c.quoteType||'가견적')}">\${esc(c.quoteType||'가견적')} ↗</button>\`):\`<button class="link-chip muted" data-action="new-quote" data-id="\${c.id}">견적 작성</button>\`}\${c.quote?\`<button class="link-chip" style="background:#fffbeb;border-color:#f2d675;color:#855a00" data-action="send-quote" data-id="\${c.id}">문자·카톡</button>\`:''}<button class="link-chip" data-action="customer" data-id="\${c.id}">상세보기</button></div><div class="row-bottom">\${c.quote?(c.viewed?'● 고객 열람 완료':'○ 아직 열람하지 않음')+(c.dispatchCount?\` · 발송 \${c.dispatchCount}회\`:''):'견적 발행 전'}</div>`,
  'customerRows links'
);

// 3. Enhance quotesPage table actions to include 가견적/최종견적 미리보기 & 문자·카톡 발송 buttons
mustReplace(
  `<td><div class="actions">\${btn(c.quote?'수정본 작성':'엑셀 등록','new-quote',c.quote?'edit':'upload','sm',\`data-id="\${c.id}"\`)}\${c.quote?btn('미리보기','preview','eye','sm soft',\`data-id="\${c.id}"\`):''}</div></td>`,
  `<td><div class="actions">\${btn(c.quote?'수정본 작성':'엑셀 등록','new-quote',c.quote?'edit':'upload','sm',\`data-id="\${c.id}"\`)}\${c.quote?btn('가견적 보기','preview','eye','sm soft',\`data-id="\${c.id}" data-type="가견적"\`)+btn('최종견적 보기','preview','eye','sm soft',\`data-id="\${c.id}" data-type="최종견적"\`)+btn('문자·카톡 발송','send-quote','send','sm primary',\`data-id="\${c.id}"\`):''}</div></td>`,
  'quotesPage actions'
);

// 4. Enhance openCustomer quotes tab + left sidebar + linkDialog for 가견적 / 최종견적 미리보기
mustReplace(
  `if(tab==='quotes')content=\`<div class="file-card">\${icon('link')}<div style="flex:1"><b>가견적 링크</b><small>\${c.roughQuoteUrl?esc(c.roughQuoteUrl):'등록된 가견적 링크가 없습니다.'}</small></div><div class="actions">\${c.roughQuoteUrl?\`<a class="btn sm soft" href="\${esc(c.roughQuoteUrl)}" target="_blank" rel="noopener noreferrer">\${icon('external')}바로가기</a>\`:''}\${btn(c.roughQuoteUrl?'관리':'등록','rough-quote-link','edit','sm',\`data-id="\${id}"\`)}</div></div><div class="file-card" style="margin-bottom:18px">\${icon('link')}<div style="flex:1"><b>최종견적 링크</b><small>\${c.finalQuoteUrl?esc(c.finalQuoteUrl):'등록된 최종견적 링크가 없습니다.'}</small></div><div class="actions">\${c.finalQuoteUrl?\`<a class="btn sm soft" href="\${esc(c.finalQuoteUrl)}" target="_blank" rel="noopener noreferrer">\${icon('external')}바로가기</a>\`:''}\${btn(c.finalQuoteUrl?'관리':'등록','final-quote-link','edit','sm',\`data-id="\${id}"\`)}</div></div><div class="actions" style="margin-bottom:18px">\${role==='본사 관리자'?btn('새 견적 작성','new-quote','plus','primary sm',\`data-id="\${id}"\`):btn('견적 요청','request-quote','plus','primary sm',\`data-id="\${id}"\`)}</div>\${c.quote?\`<div class="file-card">\${icon('file')}<div><b>고객 견적서 · \${esc(c.product)}</b><small>\${won(c.quote)} · \${c.viewed?'열람 완료':'미열람'}</small></div>\${btn('보기','preview','eye','sm soft',\`data-id="\${id}"\`)}</div>\`:'<div class="notice-text">아직 발행된 견적이 없습니다. 원본 엑셀을 등록해 고객용 견적서를 작성하세요.</div>'}\${db.quotes.filter(q=>q.cid===c.id).map(q=>\`<div class="note"><div class="note-body"><div class="note-meta"><b>\${esc(q.title)}</b><span>\${q.date}</span></div><p>\${won(q.total)}\${role==='본사 관리자'?\` · 마진 \${q.margin}%\`:''} · 발행본 보관</p></div></div>\`).join('')}\`;`,
  `if(tab==='quotes')content=\`
    <div class="quote-stage-grid">
      <div class="quote-stage-card is-rough">
        <div class="qs-head"><b>가견적 (실측 전 예상안)</b>\${c.roughQuote?badge('v'+c.roughQuote.version+' 발행완료','orange'):badge('미발행','gray')}</div>
        <div class="qs-price \${c.roughQuote?'':'empty-price'}">\${c.roughQuote?won(c.roughQuote.totalPrice):'아직 발행된 가견적이 없습니다'}</div>
        <div class="qs-meta">\${c.roughQuote?('발행일 '+esc(c.roughQuote.date)+' · '+(c.roughQuote.viewed?'고객 열람완료':'미열람')):(c.quote?'현재 견적 기준 가견적 화면 예시 미리보기 가능':'원본 엑셀을 등록해 가견적을 발행하세요')}</div>
        <div class="qs-actions">
          \${c.quote?btn(c.roughQuote?'가견적 미리보기':'가견적 예시보기','preview','eye','sm soft',\`data-id="\${id}" data-type="가견적"\`):''}
          \${c.roughQuote?btn('가견적 발송','send-quote','send','sm primary',\`data-id="\${id}" data-type="가견적"\`):''}
          \${role==='본사 관리자'?btn(c.roughQuote?'가견적 재작성':'가견적 작성','new-quote','plus','sm',\`data-id="\${id}" data-type="가견적"\`):''}
          \${btn('링크','rough-quote-link','link','sm',\`data-id="\${id}"\`)}
        </div>
      </div>
      <div class="quote-stage-card is-final">
        <div class="qs-head"><b>최종견적 (실측 확정안)</b>\${c.finalQuote?badge('v'+c.finalQuote.version+' 발행완료','green'):badge('실측 후 확정 대기','gray')}</div>
        <div class="qs-price \${c.finalQuote?'':'empty-price'}">\${c.finalQuote?won(c.finalQuote.totalPrice):'아직 발행된 최종견적이 없습니다'}</div>
        <div class="qs-meta">\${c.finalQuote?('발행일 '+esc(c.finalQuote.date)+' · '+(c.finalQuote.viewed?'고객 열람완료':'미열람')):(c.quote?'발행 전 최종견적 모바일 화면 예시 미리보기 가능':'방문 실측 후 최종견적을 확정 발행하세요')}</div>
        <div class="qs-actions">
          \${c.quote?btn(c.finalQuote?'최종견적 미리보기':'최종견적 예시보기','preview','eye','sm soft',\`data-id="\${id}" data-type="최종견적"\`):''}
          \${c.finalQuote?btn('최종견적 발송','send-quote','send','sm primary',\`data-id="\${id}" data-type="최종견적"\`):''}
          \${role==='본사 관리자'?btn(c.finalQuote?'최종견적 수정':'최종견적 작성','new-quote','plus','sm',\`data-id="\${id}" data-type="최종견적"\`):''}
          \${btn('링크','final-quote-link','link','sm',\`data-id="\${id}"\`)}
        </div>
      </div>
    </div>
    <div class="actions" style="margin-bottom:14px">
      \${role==='본사 관리자'?btn('새 견적서 작성','new-quote','plus','primary sm',\`data-id="\${id}"\`):btn('본사 견적 요청','request-quote','plus','primary sm',\`data-id="\${id}"\`)}
      \${c.quote?btn('문자·카톡 발송창 열기','send-quote','send','sm soft',\`data-id="\${id}"\`)+btn('대표 링크 복사','copy-quote','copy','sm',\`data-id="\${id}"\`):''}
    </div>
    \${(c.publishedQuotes&&c.publishedQuotes.length)?\`<h4 style="margin:8px 0 10px;font-size:12px">발행 견적 버전 히스토리 (\${c.publishedQuotes.length}건)</h4>\`+c.publishedQuotes.map(pq=>\`<div class="file-card" style="flex-wrap:wrap">\${icon('file')}<div style="flex:1;min-width:160px"><b>[v\${pq.version} · \${esc(pq.quoteType)}] \${esc(pq.title)}</b><small>\${won(pq.totalPrice)} · 발행일 \${esc(pq.date)} · \${pq.viewed?'고객 열람완료':'미열람'}</small></div><div class="actions">\${btn('미리보기','preview','eye','sm soft',\`data-id="\${id}" data-type="\${esc(pq.quoteType)}" data-quote-id="\${pq.id}"\`)}\${btn('발송','send-quote','send','sm',\`data-id="\${id}" data-type="\${esc(pq.quoteType)}"\`)}</div></div>\`).join(''):(c.quote?'':'<div class="notice-text">아직 발행된 견적이 없습니다. 원본 엑셀을 등록해 가견적 또는 최종견적을 작성하세요.</div>')}
  \`;`,
  'openCustomer quotes tab full replacement'
);

mustReplace(
  `<div class="detail-box links"><h4>\${icon('link')}견적 · 내관도</h4><div style="display:flex;flex-direction:column;gap:8px">\${linkRow('가견적',c.roughQuoteUrl,'rough-quote-link',id)}\${linkRow('최종견적',c.finalQuoteUrl,'final-quote-link',id)}\${linkRow('내관도',c.drawing,'drawing',id,'내관도 관리')}</div></div>`,
  `<div class="detail-box links"><h4>\${icon('link')}견적 · 내관도</h4><div style="display:flex;flex-direction:column;gap:8px">\${quoteSideRow('가견적','가견적',c.roughQuote,c.roughQuoteUrl,'rough-quote-link',id,Boolean(c.quote))}\${quoteSideRow('최종견적','최종견적',c.finalQuote,c.finalQuoteUrl,'final-quote-link',id,Boolean(c.quote))}\${linkRow('내관도',c.drawing,'drawing',id,'내관도 관리')}</div></div>`,
  'openCustomer sidebar quote links'
);

mustReplace(
  `function linkDialog(title,label,url,submit,id,customerName){openDialog(title,\`<form id="edit-form" data-submit="\${submit}" data-id="\${id}"><div class="dialog-body">\${field(label+' URL','url',url||'','text')}<p class="field-hint">이동할 \${label} 페이지 주소(URL)를 입력해 주세요. 공란으로 저장하면 링크가 제거됩니다.</p>\${url?\`<div style="margin-top:12px"><a class="btn soft sm" href="\${esc(url)}" target="_blank" rel="noopener noreferrer">\${icon('external')}현재 등록된 페이지 바로가기</a></div>\`:''}</div><div class="dialog-footer"><button type="button" class="btn" data-action="customer" data-id="\${id}">취소</button><button type="submit" class="btn primary">저장하기</button></div></form>\`,'','',\`\${esc(customerName)} · \${label}\`)}`,
  `function linkDialog(title,label,url,submit,id,customerName){const cObj=accessibleC(id);const isQuoteLink=(label==='가견적'||label==='최종견적');openDialog(title,\`<form id="edit-form" data-submit="\${submit}" data-id="\${id}"><div class="dialog-body">\${field(label+' URL','url',url||'','text')}<p class="field-hint">이동할 \${label} 페이지 주소(URL)를 입력해 주세요. CRM에서 \${label}을 발행하면 전용 모바일 링크가 자동 연결됩니다.</p><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">\${isQuoteLink&&cObj?.quote?\`<button type="button" class="btn soft sm" data-action="preview" data-id="\${id}" data-type="\${label}">\${icon('eye')}\${label} 모바일 화면 미리보기</button>\`:''}\${url?\`<a class="btn sm" href="\${esc(url)}" target="_blank" rel="noopener noreferrer">\${icon('external')}새 탭에서 열기</a>\`:''}</div></div><div class="dialog-footer"><button type="button" class="btn" data-action="customer" data-id="\${id}">취소</button><button type="submit" class="btn primary">저장하기</button></div></form>\`,'','',\`\${esc(customerName)} · \${label}\`)}`,
  'linkDialog preview button'
);

// 5. Enhance openEditor, renderEditor & openContract to support presetType (가견적 / 최종견적) and dual preview buttons
mustReplace(
  `function openEditor(id){if(role!=='본사 관리자'){if(id){audit(id,'파트너 견적 요청');toast('본사 견적 요청이 기록되었습니다.')}return}const cs=visibleCustomers();if(!cs.length)return;const c=accessibleC(id)||cs.find(x=>x.status==='가견적요청')||cs[0];editor={cid:c.id,margin:20,type:'가견적',source:'',title:\`\${c.product} 교체 제안\`,items:[`,
  `function openEditor(id,presetType=''){if(role!=='본사 관리자'){if(id){audit(id,'파트너 견적 요청');toast('본사 견적 요청이 기록되었습니다.')}return}const cs=visibleCustomers();if(!cs.length)return;const c=accessibleC(id)||cs.find(x=>x.status==='가견적요청')||cs[0];const initType=presetType||(c.roughQuote&&!c.finalQuote?'최종견적':'가견적');editor={cid:c.id,margin:20,discount:0,type:initType,source:'',title:initType==='최종견적'?\`\${c.product} 방문실측 확정 견적서\`:\`\${c.product} 교체 제안\`,items:[`,
  'openEditor init discount & presetType'
);

mustReplace(
  `<div class="panel-caption" style="margin:-6px 0 14px">현재 표시된 품목은 체험용 샘플입니다. XLSX 자동 분석은 미연결 상태입니다.</div>`,
  `<div class="panel-caption" style="margin:-6px 0 14px">KCC 글라스 공식 창호 견적서(XLSX) 및 표준 CSV 파일 자동 분석이 지원됩니다.</div>`,
  'renderEditor caption'
);

mustReplace(
  `<div id="quote-summary">\${editorSummary()}</div></aside>`,
  `<div class="field" style="margin:8px 0 14px"><label for="discount-input">일시불 할인 표시액 (선택)</label><input class="input money" type="text" id="discount-input" inputmode="numeric" data-money="1" value="\${num(editor.discount||0)}" placeholder="0"></div><div id="quote-summary">\${editorSummary()}</div></aside>`,
  'renderEditor discount input'
);

mustReplace(
  `\`\${btn('취소','close')}\${btn('고객 화면 미리보기','editor-preview','eye','soft')}\${btn('견적 발행하기','publish-quote','send','primary')}\``,
  `\`\${btn('취소','close')}\${btn('가견적 미리보기','editor-preview','eye','soft','data-type="가견적"')}\${btn('최종견적 미리보기','editor-preview','eye','soft','data-type="최종견적"')}\${btn('견적 발행하기','publish-quote','send','primary')}\``,
  'renderEditor dual preview buttons'
);

mustReplace(
  `\`\${btn('고객 보기','customer','users','',\`data-id="\${c.id}"\`)}\${k.type==='일시불'?btn('수납 등록','receipt','credit','primary',\`data-id="\${k.id}"\`):btn('렌탈 신청 확인','find-application','file','primary',\`data-id="\${c.id}"\`)}\``,
  `\`\${btn('고객 보기','customer','users','',\`data-id="\${c.id}"\`)}\${c.quote?btn('가견적 보기','preview','eye','soft',\`data-id="\${c.id}" data-type="가견적"\`)+btn('최종견적 보기','preview','eye','soft',\`data-id="\${c.id}" data-type="최종견적"\`):''}\${k.type==='일시불'?btn('수납 등록','receipt','credit','primary',\`data-id="\${k.id}"\`):btn('렌탈 신청 확인','find-application','file','primary',\`data-id="\${c.id}"\`)}\``,
  'openContract preview buttons'
);

// 6. Replace openPreview with full KCC Mobile Estimate Live Iframe Preview (가견적 / 최종견적 Switcher + Quote/Login View + Responsive Width + Send)
const oldOpenPreview = `function openPreview(id,q=null){const c=accessibleC(id);if(!c)return;if(!q&&!c.quote){toast('발행된 견적이 없습니다.');return}quotePreviewId=id;openDialog('모바일 견적 미리보기',\`<div class="dialog-body" style="background:#e9edf4">\${quoteMarkup(c,q)}</div>\`,\`\${q?btn('견적 편집으로','back-editor','edit'):btn('조회 링크 복사','copy-quote','link','soft',\`data-id="\${id}"\`)}\${btn('닫기','close')}\`,'','고객에게는 공급원가와 내부 마진이 표시되지 않습니다.')}`;

const newOpenPreview = `function openPreview(id, q = null, viewMode = 'quote', preferredType = '', quoteId = null) {
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
    true
  );

  const ifr = $('#crm-quote-iframe');
  if (ifr) {
    ifr.addEventListener('load', () => {
      ifr.contentWindow?.postMessage({ type: 'SET_PREVIEW_DEVICE', device: previewDeviceWidth }, '*');
      ifr.contentWindow?.postMessage({ type: 'SET_PREVIEW_VIEW', view: previewViewMode }, '*');
    });
  }
}`;

mustReplace(oldOpenPreview, newOpenPreview, 'openPreview replacement');

// 7. Enhance role-switch in change listener
mustReplace(
  "if(id==='role-switch'){role=el.value;query='';stageFilter='';partnerFilter='';selected.clear();customerTab='all';render()}",
  "if(id==='role-switch'){role=el.value;query='';stageFilter='';partnerFilter='';selected.clear();customerTab='all';(async()=>{await apiSwitchRole(role);await syncFromServer();render();toast('역할이 ['+role+'](으)로 전환되었습니다. 서버 권한이 적용됩니다.');})();}",
  'role-switch'
);

// 8. Enhance quote-file upload (preserving category & detail from KCC official Excel!)
mustReplace(
  "if(file.name.toLowerCase().endsWith('.csv')){try{const rows=parseCSV((await file.text()).replace(/^\\ufeff/,''));if(!rows.length||rows[0].length!==4)throw Error();const items=rows.slice(1).map(r=>({name:r[0],spec:r[1]||'',qty:parseNum(r[2]),price:parseNum(r[3])}));if(!items.length||items.some(i=>!i.name||!Number.isFinite(i.qty)||i.qty<=0||!Number.isFinite(i.price)||i.price<0))throw Error();editor.items=items;renderEditor();toast(`${items.length}개 품목을 가져왔습니다. 원본과 금액을 확인해 주세요.`)}catch{toast('샘플 CSV와 같은 품목·규격·수량·원가단가 형식을 사용해 주세요.')}}else{ $('#upload-name').textContent=file.name;toast('파일 선택을 확인했습니다. XLSX 자동 분석은 미연결이며 샘플 품목을 유지합니다.')}}",
  `{
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
  }}`,
  'quote-file upload'
);

// 9. Enhance input listener for discount-input & send-message/send-phone live preview
mustReplace(
  "if(e.target.id==='quote-title')editor.title=e.target.value;",
  `if(e.target.id==='quote-title')editor.title=e.target.value;
  if(e.target.id==='discount-input'&&editor){editor.discount=Math.max(0,parseNum(e.target.value));}
  if(e.target.id==='send-message'&&sendState){sendState.message=e.target.value;if(sendState.previewTab==='message')renderSendRightPreview();}
  if(e.target.id==='send-phone'&&sendState){sendState.recipientPhone=e.target.value;if(sendState.previewTab==='message'&&sendState.channel==='sms')renderSendRightPreview();}`,
  'input listener extensions'
);

// 10. Enhance click actions: new-quote, preview, editor-preview, prev-quote-type, send-quote, switch-send-quote-type, etc.
mustReplace(
  "case'new-quote':openEditor(id);break;case'preview':openPreview(id);break;case'editor-preview':openPreview(editor.cid,{...editor,...editorTotal()});break;",
  `case'new-quote':openEditor(id, el.dataset.type || '');break;
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
    if (phoneVal.replace(/\\D/g, '').length < 10) {
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
  }`,
  'preview & send actions'
);

mustReplace(
  "case'copy-quote':{const c=accessibleC(id);if(c)copy(location.origin+location.pathname+'?demo_quote='+encodeURIComponent(c.id));break}",
  `case'copy-quote':{
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
  }`,
  'copy-quote'
);

mustReplace(
  "case'publish-quote':{const c=accessibleC(editor.cid),t=editorTotal();if(!c||!t.cost||editor.items.some(i=>!i.name||!Number.isFinite(i.qty)||i.qty<=0||i.price<0)){toast('품목과 수량·금액을 확인해 주세요.');break}const q={...JSON.parse(JSON.stringify(editor)),...t,date:now(),id:'Q-'+Date.now()};db.quotes.push(q);c.quote=t.total;c.viewed=false;c.status=editor.type==='최종견적'?'최종견적':'견적안내';c.note=`${editor.type} 발행 · ${won(t.total)}`;audit(c.id,`${editor.type} 발행 ${won(t.total)} · 마진 ${editor.margin}%`);render();openPreview(c.id,q);toast('고객 견적을 발행했습니다. 체험 데이터에 저장됩니다.');break}",
  `case'publish-quote':{
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
        openPreview(c.id, null, 'quote', qData.quote_type || editor.type);
        toast('모바일 [' + (qData.quote_type || editor.type) + ']이 발행되었습니다. (v' + qData.version + ') 문자·카톡으로 바로 발송해보세요.');
        break;
      }
    } catch (err) {}
    const q={...JSON.parse(JSON.stringify(editor)),...t,date:now(),id:'Q-'+Date.now()};
    db.quotes.push(q);c.quote=t.total;c.viewed=false;c.status=editor.type==='최종견적'?'최종견적':'견적안내';c.note=editor.type+' 발행 · '+won(t.total);
    audit(c.id,editor.type+' 발행 '+won(t.total)+' · 마진 '+editor.margin+'%');
    render();openPreview(c.id,q);toast('고객 견적을 발행했습니다.');
    break;
  }`,
  'publish-quote'
);

mustReplace(
  "case'integration':openDialog(esc(el.dataset.name)+' 연결 안내',`<div class=\"dialog-body\"><div class=\"notice-text\">현재는 화면 체험 단계로 연결되지 않았습니다.</div><div class=\"mini-stat\"><span>운영 준비</span><b>사업자·계약 조건 확정</b></div><div class=\"mini-stat\"><span>개발 준비</span><b>API·서버 인증 연결</b></div><div class=\"mini-stat\"><span>오픈 검증</span><b>테스트 및 처리 결과 대조</b></div><p class=\"field-hint\">실제 운영 키는 이 체험 화면에 입력하지 않습니다.</p></div>`);break;",
  `case'integration':{
    if (el.dataset.name === '문자·알림톡') {
      openMessagingIntegrationDialog();
    } else {
      openDialog(esc(el.dataset.name)+' 연결 안내', '<div class="dialog-body"><div class="notice-text">운영 계약 및 API 인증키 등록 후 실시간 연동됩니다.</div><div class="mini-stat"><span>운영 준비</span><b>사업자·계약 조건 확정</b></div><div class="mini-stat"><span>개발 준비</span><b>API·서버 인증 연결</b></div><div class="mini-stat"><span>오픈 검증</span><b>테스트 및 처리 결과 대조</b></div></div>');
    }
    break;
  }`,
  'integration action'
);

// 11. Enhance save-customer
mustReplace(
  "case'save-customer':{const c=accessibleC(id);if(!c)break;const changes=[];for(const [key,sel,label] of [['status','detail-status','진행구분'],['label','detail-label','라벨'],['owner','detail-owner','담당자'],['source','detail-source','유입채널'],['measure','detail-measure','실측일'],['build','detail-build','시공일']]){const val=$('#'+sel).value;if(c[key]!==val){changes.push(`${label}: ${c[key]||'미정'} → ${val||'미정'}`);c[key]=val}}if(changes.length){audit(id,changes.join(' / '));render();openCustomer(id,detailTab);toast('고객 정보와 변경 이력을 저장했습니다.')}else toast('변경된 내용이 없습니다.');break}",
  `case'save-customer':{
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
  }`,
  'save-customer'
);

// 12. Make submit listener async & connect server endpoints
mustReplace(
  "document.addEventListener('submit',e=>{",
  "document.addEventListener('submit',async e=>{",
  'async submit listener'
);

mustReplace(
  "case'customer':{const phone=d.phone.replace(/\\D/g,'');if(phone.length<10||phone.length>11){toast('연락처를 확인해 주세요.');return}if(db.customers.some(c=>c.phone.replace(/\\D/g,'')===phone)){toast('같은 연락처의 고객이 있습니다. 기존 고객을 먼저 확인해 주세요.');return}const cid=Math.max(...db.customers.map(c=>c.id),3100)+1;db.customers.unshift({id:cid,name:d.name.trim(),phone:d.phone,address:d.address,product:d.product,status:'신규접수',label:'일반',source:d.source||'직접등록',partner:d.partner,owner:d.owner,date:'2026-11-12',note:d.note||'신규 고객이 등록되었습니다.',feedback:'등록된 피드백이 없습니다.',measure:'',build:'',quote:0,viewed:false});audit(cid,'관리자 직접 등록');closeDialog();query='';customerTab='all';stageFilter='';productFilter='';partnerFilter='';periodFilter='all';render();toast('새 고객과 공사건을 등록했습니다.');break}",
  `case'customer':{
    const phone=d.phone.replace(/\\D/g,'');
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
  }`,
  'submit customer'
);

mustReplace(
  "case'note':{const c=accessibleC(id);const text=d.note.trim();if(!text)return;const type=f.dataset.type;(db.notes[id]??=[{date:c.date,by:c.owner,text:c.note,type:'notes'}]).unshift({date:now(),by:role==='본사 관리자'?'김지훈':'파트너 관리자',text,important:!!d.important,type});if(type==='feedback')c.feedback=text;else c.note=text;audit(id,(type==='feedback'?'피드백':'상담이력')+' 등록');render();openCustomer(id,type);toast('기록을 저장했습니다.');break}",
  `case'note':{
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
  }`,
  'submit note'
);

mustReplace(
  `case'rough-quote-link':{const c=accessibleC(id);const url=normalizeURL(d.url);if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}c.roughQuoteUrl=url;audit(id,url?'가견적 링크 등록·수정':'가견적 링크 제거');openCustomer(id,detailTab||'notes');toast(url?'가견적 링크를 저장했습니다.':'가견적 링크를 제거했습니다.');break}
case'final-quote-link':{const c=accessibleC(id);const url=normalizeURL(d.url);if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}c.finalQuoteUrl=url;audit(id,url?'최종견적 링크 등록·수정':'최종견적 링크 제거');openCustomer(id,detailTab||'notes');toast(url?'최종견적 링크를 저장했습니다.':'최종견적 링크를 제거했습니다.');break}
case'drawing':{const c=accessibleC(id);const url=normalizeURL(d.url);if(!validateURL(url)){toast('올바른 http 또는 https 링크를 입력해 주세요.');return}c.drawing=url;audit(id,url?'내관도 링크 등록·수정':'내관도 링크 제거');openCustomer(id,detailTab||'files');toast(url?'내관도 링크를 저장했습니다.':'내관도 링크를 제거했습니다.');break}`,
  `case'rough-quote-link':{
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
  }`,
  'submit links'
);

mustReplace(
  "case'contract':{const c=accessibleC(d.cid);if(!c||db.contracts.some(k=>k.cid===c.id)){toast('이미 계약이 등록된 공사건입니다.');return}db.contracts.unshift({id:'C-'+Date.now().toString().slice(-8),cid:c.id,type:d.type,amount:c.quote,paid:0,status:d.type==='렌탈'?'약정대기':'미수납'});c.status='계약진행';audit(c.id,`${d.type} 계약 등록 · ${won(c.quote)}`);closeDialog();page='contracts';contractTab='all';render();toast('계약대장에 등록했습니다.');break}",
  `case'contract':{
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
  }`,
  'submit contract'
);

mustReplace(
  "case'receipt':{const k=db.contracts.find(x=>x.id===id),amt=parseNum(d.amount);if(!(amt>0)||amt>k.amount-k.paid){toast('남은 수납액 범위 안에서 금액을 입력해 주세요.');return}if(d.method==='카드 결제 요청'){openDialog('카드 결제 요청',`<div class=\"dialog-body\"><div class=\"summary-total\"><span>결제 요청금액</span><b>${won(amt)}</b></div><div class=\"notice-text\" style=\"margin-top:20px\">PG가 연결되지 않아 실제 결제 요청을 만들지 않았습니다. 운영 연결 후 고객에게 결제 링크를 제공하고 승인 결과를 확인합니다.</div></div>`);return}k.paid+=amt;k.status=k.paid>=k.amount?'수납완료':'선금완료';audit(k.cid,`체험 ${d.phase} 수납 등록 ${won(amt)}`);render();openContract(id);toast('체험 수납 기록을 저장했습니다.');break}",
  `case'receipt':{
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
  }`,
  'submit receipt'
);

mustReplace(
  "case'reset':if(d.confirm!=='초기화'){toast('확인 문구에 초기화를 입력해 주세요.');return}db=initial();save();selected.clear();closeDialog();render();toast('체험 데이터를 초기화했습니다.');break;",
  `case'messaging-config':{
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
        closeDialog();
        render();
        toast('서버 데이터베이스 및 체험 데이터를 초기화했습니다.');
        break;
      }
    } catch {}
    db=initial();save();selected.clear();closeDialog();render();toast('체험 데이터를 초기화했습니다.');break;
  }`,
  'submit messaging-config & reset'
);

// 13. Initial boot: sync from server
mustReplace(
  "else render();",
  "else { render(); syncFromServer(); }",
  'initial boot sync'
);

// 14. Mobile Optimization: Off-canvas Left Sidebar ('더보기'), Mobile Bottom Bar, Responsive Card Tables & Detail Tabs
mustReplace(
  "trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'};",
  "trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',menu:'M4 6h16M4 12h16M4 18h16',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'};",
  'add menu & grid icons'
);

mustReplace(
  `function render(){if(role!=='본사 관리자'&&!['customers','contracts','products'].includes(page))page='customers';const current=menus.find(m=>m[0]===page);$('#app').innerHTML=\`<div class="app"><aside class="sidebar"><div class="brand"><div class="brand-top">\${symbol()}<strong>KCC 홈씨씨</strong></div><small>CRM WORKSPACE</small></div><div class="workspace"><span>운영 파트너</span><strong>\${role==='본사 관리자'?'(주)라이프앤조이':'한빛인테리어'}</strong></div><div class="nav-label">WORKSPACE</div><nav>\${menus.filter(m=>role==='본사 관리자'||['customers','contracts','products'].includes(m[0])).map(m=>\`<button class="nav-btn \${page===m[0]?'active':''}" data-action="nav" data-page="\${m[0]}" title="\${m[1]}" aria-label="\${m[1]}" \${page===m[0]?'aria-current="page"':''}>\${icon(m[2])}<span>\${m[1]}</span>\${m[0]==='customers'?\`<em>\${visibleCustomers().length}</em>\`:''}</button>\`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-note"><b><span class="dot"></span>화면 체험</b>예시 데이터로 자유롭게 확인하세요.</div><div class="version"><span>KCC HOMECC</span><span>Ver. 3.0</span></div></div></aside><div class="shell"><header class="topbar"><div class="breadcrumb"><span>라이프앤조이</span>\${icon('chevron')}<b>\${current[1]}</b></div><div class="top-actions"><select class="role-select" id="role-switch" aria-label="관리자 화면 전환"><option \${role==='본사 관리자'?'selected':''}>본사 관리자</option><option \${role==='파트너 관리자'?'selected':''}>파트너 관리자</option></select><button class="bell" data-action="notifications" aria-label="업무 알림">\${icon('bell')}</button><div class="user"><div class="avatar">\${role==='본사 관리자'?'지훈':'한빛'}</div><div><strong>\${role==='본사 관리자'?'김지훈':'한빛인테리어'}</strong><small>\${role==='본사 관리자'?'최고관리자':'영업파트너'}</small></div></div></div></header><main id="main">\${({customers:customersPage,quotes:quotesPage,contracts:contractsPage,products:productsPage,partners:partnersPage,stats:statsPage,settings:settingsPage}[page])()}<div class="page-footer"><span>© LIFE & JOY · KCC HOMECC CRM 3.0</span><span>화면 체험 · 예시 데이터 / 브라우저에 저장</span></div></main></div></div>\`}`,
  `function render(){
    if(role!=='본사 관리자'&&!['customers','contracts','products'].includes(page))page='customers';
    const current=menus.find(m=>m[0]===page);
    const allowedMenus=menus.filter(m=>role==='본사 관리자'||['customers','contracts','products'].includes(m[0]));
    const quickTabs=role==='본사 관리자'
      ?[['customers','고객관리','users'],['quotes','견적관리','file'],['contracts','계약관리','contract']]
      :[['customers','고객관리','users'],['contracts','계약관리','contract'],['products','상품관리','box']];
    const isSecondaryPage=!quickTabs.some(t=>t[0]===page);
    $('#app').innerHTML=\`<div class="app"><div class="sidebar-backdrop \${mobileNavOpen?'open':''}" data-action="close-nav" aria-hidden="true"></div><aside class="sidebar \${mobileNavOpen?'open':''}" id="app-sidebar" aria-label="전체 좌측 메뉴"><div class="brand"><div class="brand-top">\${symbol()}<strong>KCC 홈씨씨</strong><button type="button" class="sidebar-close-btn" data-action="close-nav" aria-label="메뉴 닫기">\${icon('close')}</button></div><small>CRM WORKSPACE</small></div><div class="workspace"><span>운영 파트너</span><strong>\${role==='본사 관리자'?'(주)라이프앤조이':'한빛인테리어'}</strong></div><div class="nav-label">WORKSPACE</div><nav>\${allowedMenus.map(m=>\`<button class="nav-btn \${page===m[0]?'active':''}" data-action="nav" data-page="\${m[0]}" title="\${m[1]}" aria-label="\${m[1]}" \${page===m[0]?'aria-current="page"':''}>\${icon(m[2])}<span>\${m[1]}</span>\${m[0]==='customers'?\`<em>\${visibleCustomers().length}</em>\`:''}</button>\`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-mobile-user"><div class="avatar">\${role==='본사 관리자'?'지훈':'한빛'}</div><div><strong>\${role==='본사 관리자'?'김지훈':'한빛인테리어'}</strong><small>\${role==='본사 관리자'?'최고관리자 · 본사':'영업파트너'}</small></div></div><div class="sidebar-note"><b><span class="dot"></span>운영 시스템</b>실시간 DB 및 권한 연동 중</div><div class="version"><span>KCC HOMECC</span><span>Ver. 3.0</span></div></div></aside><div class="shell"><header class="topbar"><div class="topbar-left"><button type="button" class="mobile-more-btn \${mobileNavOpen?'active-open':''}" data-action="toggle-nav" aria-controls="app-sidebar" aria-expanded="\${mobileNavOpen}" aria-label="좌측 메뉴 더보기">\${icon('menu')}<span>더보기</span></button><div class="breadcrumb"><span>라이프앤조이</span>\${icon('chevron')}<b>\${current[1]}</b></div></div><div class="top-actions"><select class="role-select" id="role-switch" aria-label="관리자 화면 전환"><option \${role==='본사 관리자'?'selected':''}>본사 관리자</option><option \${role==='파트너 관리자'?'selected':''}>파트너 관리자</option></select><button class="bell" data-action="notifications" aria-label="업무 알림">\${icon('bell')}</button><div class="user"><div class="avatar">\${role==='본사 관리자'?'지훈':'한빛'}</div><div><strong>\${role==='본사 관리자'?'김지훈':'한빛인테리어'}</strong><small>\${role==='본사 관리자'?'최고관리자':'영업파트너'}</small></div></div></div></header><main id="main">\${({customers:customersPage,quotes:quotesPage,contracts:contractsPage,products:productsPage,partners:partnersPage,stats:statsPage,settings:settingsPage}[page])()}<div class="page-footer"><span>© LIFE & JOY · KCC HOMECC CRM 3.0</span><span>실운영 데이터 연동 시스템</span></div></main><nav class="mobile-bottom-nav" aria-label="모바일 빠른 메뉴">\${quickTabs.map(t=>\`<button type="button" class="m-tab \${!mobileNavOpen&&page===t[0]?'active':''}" data-action="nav" data-page="\${t[0]}" \${page===t[0]?'aria-current="page"':''}>\${icon(t[2])}<span>\${t[1]}</span></button>\`).join('')}<button type="button" class="m-tab more-trigger \${mobileNavOpen||isSecondaryPage?'active':''} \${mobileNavOpen?'active-open':''}" data-action="toggle-nav" aria-controls="app-sidebar" aria-expanded="\${mobileNavOpen}">\${icon('grid')}<span>더보기</span></button></nav></div></div>\`}`,
  'mobile off-canvas sidebar & bottom more nav'
);

// Responsive mobile card tables for quotesPage, contractsPage, and settingsPage (users)
mustReplace(
  `<div class="table-wrap"><table><thead><tr><th>고객 / 견적번호</th><th>상품</th><th>진행 상태</th><th>고객 견적금액</th><th>고객 열람</th><th>담당자</th><th>관리</th></tr></thead><tbody>\${[...ready,...published].map(c=>\`<tr><td><b class="quote-customer-name">\${esc(c.name)}</b><small>\${c.quote?'Q':'REQ'}-\${c.id} · \${esc(c.address)}</small></td><td>\${badge(c.product,'gray')}</td><td>\${badge(c.quote?'발행완료':'원본대기',c.quote?'green':'orange')}</td><td class="money">\${c.quote?won(c.quote):'—'}</td><td>\${c.quote?badge(c.viewed?'열람완료':'미열람',c.viewed?'green':'gray'):'—'}</td><td>\${esc(c.owner)}</td><td><div class="actions">\${btn(c.quote?'수정본 작성':'엑셀 등록','new-quote',c.quote?'edit':'upload','sm',\`data-id="\${c.id}"\`)}\${c.quote?btn('가견적 보기','preview','eye','sm soft',\`data-id="\${c.id}" data-type="가견적"\`)+btn('최종견적 보기','preview','eye','sm soft',\`data-id="\${c.id}" data-type="최종견적"\`)+btn('문자·카톡 발송','send-quote','send','sm primary',\`data-id="\${c.id}"\`):''}</div></td></tr>\`).join('')}</tbody></table></div>`,
  `<div class="table-wrap"><table class="mobile-card-table"><thead><tr><th>고객 / 견적번호</th><th>상품</th><th>진행 상태</th><th>고객 견적금액</th><th>고객 열람</th><th>담당자</th><th>관리</th></tr></thead><tbody>\${[...ready,...published].map(c=>\`<tr><td class="card-primary"><b class="quote-customer-name">\${esc(c.name)}</b><small>\${c.quote?'Q':'REQ'}-\${c.id} · \${esc(c.address)}</small></td><td data-label="상품">\${badge(c.product,'gray')}</td><td data-label="진행 상태">\${badge(c.quote?'발행완료':'원본대기',c.quote?'green':'orange')}</td><td data-label="고객 견적금액" class="money"><b>\${c.quote?won(c.quote):'—'}</b></td><td data-label="고객 열람">\${c.quote?badge(c.viewed?'열람완료':'미열람',c.viewed?'green':'gray'):'—'}</td><td data-label="담당자">\${esc(c.owner)}</td><td class="card-actions"><div class="actions">\${btn(c.quote?'수정본 작성':'엑셀 등록','new-quote',c.quote?'edit':'upload','sm',\`data-id="\${c.id}"\`)}\${c.quote?btn('가견적 보기','preview','eye','sm soft',\`data-id="\${c.id}" data-type="가견적"\`)+btn('최종견적 보기','preview','eye','sm soft',\`data-id="\${c.id}" data-type="최종견적"\`)+btn('문자·카톡 발송','send-quote','send','sm primary',\`data-id="\${c.id}"\`):''}</div></td></tr>\`).join('')}</tbody></table></div>`,
  'quotesPage responsive card table'
);

mustReplace(
  `<div class="table-wrap"><table><thead><tr>\${contractTab==='rental'?'<th>고객 / 신청번호</th><th>렌탈 조건</th><th>월 납부금</th><th>상태</th><th>접수일</th><th>관리</th>':'<th>고객 / 계약번호</th><th>결제방식</th><th>계약금액</th><th>수납액</th><th>계약·수납 상태</th><th>관리</th>'}</tr></thead><tbody>\${contractTab==='rental'?apps.map(a=>{const c=findC(a.cid);return \`<tr><td><b class="quote-customer-name">\${esc(c.name)}</b><small>\${a.id} · \${c.product}</small></td><td>\${a.plan}</td><td>\${won(a.monthly)}</td><td>\${badge(a.status)}</td><td>\${a.date}</td><td>\${btn('신청서 확인','application','file','sm soft',\`data-id="\${a.id}"\`)}</td></tr>\`}).join(''):items.filter(k=>contractTab==='all'||k.type==='일시불').map(k=>{const c=findC(k.cid);return \`<tr><td><b class="quote-customer-name">\${esc(c.name)}</b><small>\${k.id} · \${c.product}</small></td><td>\${badge(k.type,k.type==='렌탈'?'purple':'')}</td><td>\${won(k.amount)}</td><td>\${won(k.paid)}</td><td>\${badge(k.status)}</td><td>\${btn('계약 상세','contract','contract','sm soft',\`data-id="\${k.id}"\`)}</td></tr>\`}).join('')}</tbody></table></div>`,
  `<div class="table-wrap"><table class="mobile-card-table"><thead><tr>\${contractTab==='rental'?'<th>고객 / 신청번호</th><th>렌탈 조건</th><th>월 납부금</th><th>상태</th><th>접수일</th><th>관리</th>':'<th>고객 / 계약번호</th><th>결제방식</th><th>계약금액</th><th>수납액</th><th>계약·수납 상태</th><th>관리</th>'}</tr></thead><tbody>\${contractTab==='rental'?apps.map(a=>{const c=findC(a.cid);return \`<tr><td class="card-primary"><b class="quote-customer-name">\${esc(c.name)}</b><small>\${a.id} · \${c.product}</small></td><td data-label="렌탈 조건">\${a.plan}</td><td data-label="월 납부금" class="money"><b>\${won(a.monthly)}</b></td><td data-label="상태">\${badge(a.status)}</td><td data-label="접수일">\${a.date}</td><td class="card-actions">\${btn('신청서 확인','application','file','sm soft',\`data-id="\${a.id}"\`)}</td></tr>\`}).join(''):items.filter(k=>contractTab==='all'||k.type==='일시불').map(k=>{const c=findC(k.cid);return \`<tr><td class="card-primary"><b class="quote-customer-name">\${esc(c.name)}</b><small>\${k.id} · \${c.product}</small></td><td data-label="결제방식">\${badge(k.type,k.type==='렌탈'?'purple':'')}</td><td data-label="계약금액" class="money"><b>\${won(k.amount)}</b></td><td data-label="수납액" class="money">\${won(k.paid)}</td><td data-label="계약·수납 상태">\${badge(k.status)}</td><td class="card-actions">\${btn('계약 상세','contract','contract','sm soft',\`data-id="\${k.id}"\`)}</td></tr>\`}).join('')}</tbody></table></div>`,
  'contractsPage responsive card table'
);

mustReplace(
  `<div class="table-wrap"><table><thead><tr><th>사용자</th><th>소속</th><th>권한</th><th>상태</th></tr></thead><tbody>\${db.users.map(u=>\`<tr><td><b>\${esc(u.name)}</b><small>\${esc(u.email)}</small></td><td>\${esc(u.org)}</td><td>\${esc(u.role)}</td><td>\${badge('정상','green')}</td></tr>\`).join('')}</tbody></table></div>`,
  `<div class="table-wrap"><table class="mobile-card-table"><thead><tr><th>사용자</th><th>소속</th><th>권한</th><th>상태</th></tr></thead><tbody>\${db.users.map(u=>\`<tr><td class="card-primary"><b>\${esc(u.name)}</b><small>\${esc(u.email)}</small></td><td data-label="소속">\${esc(u.org)}</td><td data-label="권한">\${esc(u.role)}</td><td data-label="상태">\${badge('정상','green')}</td></tr>\`).join('')}</tbody></table></div>`,
  'settingsPage users responsive card table'
);

// Auto-close mobile sidebar when opening any dialog
mustReplace(
  `function openDialog(title,body,footer='',cls='',subtitle='',dark=false){restoreFocus=document.activeElement;`,
  `function openDialog(title,body,footer='',cls='',subtitle='',dark=false){if(mobileNavOpen)setMobileNav(false);restoreFocus=document.activeElement;`,
  'openDialog closes mobileNav'
);

// 15. Live Rental Operations Integration in CRM (contractsPage + openApplication + submit application)
mustReplace(
  `const stageColor=s=>({'신규접수':'','상담중':'purple','가견적요청':'orange','견적안내':'','실측예정':'green','최종견적':'purple','계약진행':'green','시공완료':'gray','보류':'gray','서류검토':'orange','보완요청':'red','심사중':'purple','승인':'green','반려':'red','약정대기':'orange','선금완료':'','수납완료':'green'}[s]||'');`,
  `const stageColor=s=>({'신규접수':'','상담중':'purple','가견적요청':'orange','견적안내':'','실측예정':'green','최종견적':'purple','계약진행':'green','계약완료':'green','시공완료':'gray','보류':'gray','접수완료':'','서류검토':'orange','서류보완':'red','보완요청':'red','심사중':'purple','승인':'green','약정완료':'green','반려':'gray','부결':'red','약정대기':'orange','선금완료':'','수납완료':'green'}[s]||'');`,
  'stageColor rental statuses'
);

mustReplace(
  `return pageHead('계약관리','공사계약, 렌탈 접수, 수납 현황을 함께 확인하세요.',btn('계약 등록','new-contract','plus','primary'),'CONTRACT & PAYMENT')`,
  `return pageHead('계약관리','공사계약, 모바일 렌탈 접수·심사, 수납 현황을 함께 확인하세요.','<a class="btn soft" href="/admin.html" target="_blank" rel="noopener noreferrer">'+icon('external')+'렌탈 운영 콘솔</a>'+btn('계약 등록','new-contract','plus','primary'),'CONTRACT & PAYMENT')`,
  'contractsPage console button'
);

mustReplace(
  `<div class="panel-caption">렌탈 신청 접수, 심사 승인, 약정 완료, 정산 완료를 각각 관리합니다. 표시 금액은 예시입니다.</div>`,
  `<div class="panel-caption">렌탈 신청 접수, 서류 검토·보완 요청, 심사, 약정 확정을 실시간 DB 및 감사 로그와 연동해 관리합니다.</div>`,
  'contractsPage live caption'
);

mustReplace(
  `<td class="card-actions">\${btn('신청서 확인','application','file','sm soft',\`data-id="\${a.id}"\`)}</td>`,
  `<td class="card-actions"><div class="actions">\${btn('신청서 검토','application','file','sm soft',\`data-id="\${a.id}"\`)}<a class="btn sm" href="/admin.html?id=\${encodeURIComponent(a.id)}" target="_blank" rel="noopener noreferrer">\${icon('external')}콘솔</a></div></td>`,
  'contractsPage rental row console link'
);

const oldOpenApplication = `function openApplication(id){const a=db.applications.find(x=>x.id===id);if(!a||!accessibleC(a.cid))return;const c=findC(a.cid);openDialog('렌탈 신청 상세',\`<div class="dialog-body"><div class="timeline-strip">\${['신청접수','서류검토','심사','약정'].map((s,i)=>\`<span class="\${i<2?'done':''}">\${s}</span>\`).join('')}</div><div class="info-grid"><div><label>고객명</label><b>\${esc(c.name)}</b></div><div><label>신청번호</label><b>\${a.id}</b></div><div><label>희망 기간</label><b>\${a.plan}</b></div><div><label>월 납부금 · 예시</label><b>\${won(a.monthly)}</b></div></div><div class="divider"></div><div class="file-card">\${icon('shield')}<div><b>신분확인 서류</b><small>화면 설계용 영역 · 실제 신분증 미보관</small></div>\${badge('확인 대상','orange')}</div><div class="file-card">\${icon('edit')}<div><b>개인정보 동의 · 서명</b><small>양식 버전 및 제출 시각 관리 영역</small></div>\${badge(a.consent?'체험 동의':'예시','gray')}</div><form data-submit="application" data-id="\${a.id}">\${selectField('처리 상태','app-status',['서류검토','보완요청','심사중','승인','반려','약정완료'],a.status)}<div class="field"><label>검토 내용 / 보완 요청 사유</label><textarea name="review" placeholder="확인한 내용과 보완할 항목을 기록하세요.">\${esc(a.review||'')}</textarea></div><button class="btn primary block" type="submit">검토 결과 저장</button></form><p class="field-hint">상태 변경은 체험 데이터에만 반영됩니다. 실제 심사 결과를 대신하지 않습니다.</p></div>\`,'','','신청서·제출서류·처리 이력을 한곳에서 확인합니다.')}`;

const newOpenApplication = `const RENTAL_STATUS_MAP = {
  received: '신규 접수',
  review: '서류 확인 중',
  needs_info: '보완 요청',
  screening: '심사 중',
  confirmed: '계약 확정',
  rejected: '진행 불가',
  cancelled: '취소'
};
async function openApplication(id) {
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
    const sp = app.snapshotPricing || {};
    const perms = detail.permissions || {};
    const stepIdx = { received: 1, review: 2, needs_info: 2, screening: 3, confirmed: 4 }[app.status] || 1;
    const allowed = (app.allowedNextStatuses || [app.status]).filter(
      st => st !== 'confirmed' || perms.canConfirmContract || st === app.status
    );
    const idDoc = (detail.documents || []).find(d => d.kind === 'id_card' && d.isActive && !d.deletedAt);
    const sigDoc = (detail.documents || []).find(d => d.kind === 'signature' && d.isActive && !d.deletedAt);

    const bodyHtml = '<div class="dialog-body">' +
      '<div class="timeline-strip">' +
        [['신청접수', 1], ['서류검토', 2], ['심사중', 3], ['계약확정', 4]].map(([lbl, idx]) =>
          '<span class="' + (idx <= stepIdx ? 'done' : '') + '">' + lbl + '</span>'
        ).join('') +
      '</div>' +
      '<div class="info-grid">' +
        '<div><label>계약자 (마스킹 연락처)</label><b>' + esc(app.customerName) + ' (' + esc(app.maskedPhone) + ')</b></div>' +
        '<div><label>접수번호 / 생년월일</label><b>' + esc(app.id) + ' · ' + esc(app.maskedBirthDate) + '</b></div>' +
        '<div><label>선택 렌탈 플랜</label><b>' + esc(sp.planTitle || '60개월 렌탈') + '</b></div>' +
        '<div><label>신청 스냅샷 금액</label><b>초기 ' + won(sp.upfront || 0) + ' / 월 ' + won(sp.monthly || 0) + '</b></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="file-card">' + icon('shield') +
        '<div style="flex:1"><b>신분증 암호화 보관본 ' + (idDoc ? '(v' + idDoc.versionNo + ')' : '') + '</b><small>' +
          (idDoc ? (esc(idDoc.mimeType) + ' · SHA256 ' + esc(idDoc.digestPrefix) + '…') : '제출본 없음 또는 파기 완료') +
        '</small></div>' +
        (idDoc ? '<a class="btn sm soft" href="/admin.html?id=' + encodeURIComponent(app.id) + '" target="_blank" rel="noopener noreferrer">재인증 열람 ↗</a>' : badge('없음', 'gray')) +
      '</div>' +
      '<div class="file-card">' + icon('edit') +
        '<div style="flex:1"><b>전자 서명 및 필수 동의 (' + (detail.consents || []).length + '종 고정)</b><small>' +
          (sigDoc ? ('서명 v' + sigDoc.versionNo + ' · SHA256 ' + esc(sigDoc.digestPrefix) + '…') : '서명 보관본 없음') +
        '</small></div>' +
        badge('동의 고정됨', 'green') +
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
            '<a class="btn soft" href="/admin.html?id=' + encodeURIComponent(app.id) + '" target="_blank" rel="noopener noreferrer">' + icon('external') + '보완링크 발송 · 원본열람 콘솔</a>' +
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

    openDialog(
      '렌탈 신청 상세 · ' + esc(app.statusLabel),
      bodyHtml,
      '',
      '',
      esc(app.customerName) + ' 고객 · 총 납부 예정 ' + won(sp.total || 0) + ' (Rev.' + (app.revision || 1) + ')'
    );
  } catch (err) {
    toast('렌탈 상세 조회 실패: ' + err.message);
  }
}`;

mustReplace(oldOpenApplication, newOpenApplication, 'openApplication live API');

mustReplace(
  `case'application':{const a=db.applications.find(x=>x.id===id);a.status=d['app-status'];a.review=d.review;audit(a.cid,\`렌탈 신청 검토: \${a.status} · \${d.review||''}\`);render();openApplication(id);toast('검토 결과를 저장했습니다.');break}`,
  `case'application':{
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
      const rData = await res.json();
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
  }`,
  'submit application live API'
);

// Mobile-friendly tabs & quick strip inside Customer Detail Drawer (상태·링크 & 히스토리 accessible on mobile!)
mustReplace(
  `const body=\`<div class="customer-detail"><aside class="detail-side"><div class="detail-box"><h4>\${icon('settings')}상태 및 담당자</h4>\${selectField('진행구분','detail-status',stages,c.status)}\${selectField('진행라벨','detail-label',db.labels.map(l=>l.name),c.label)}\${selectField('담당 상담사','detail-owner',['미배정','오영진','김정연','마지희'],c.owner)}\${field('유입채널','detail-source',c.source)}</div><div class="detail-box"><h4>\${icon('calendar')}일정 관리</h4>\${field('실측 예정일','detail-measure',c.measure,'date')}\${field('시공 예정일','detail-build',c.build,'date')}</div><div class="detail-box links"><h4>\${icon('link')}견적 · 내관도</h4><div style="display:flex;flex-direction:column;gap:8px">\${quoteSideRow('가견적','가견적',c.roughQuote,c.roughQuoteUrl,'rough-quote-link',id,Boolean(c.quote))}\${quoteSideRow('최종견적','최종견적',c.finalQuote,c.finalQuoteUrl,'final-quote-link',id,Boolean(c.quote))}\${linkRow('내관도',c.drawing,'drawing',id,'내관도 관리')}</div></div>\${btn('변경사항 저장','save-customer','check','primary block',\`data-id="\${id}"\`)}</aside><section class="detail-center"><div class="tabs">\${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료']].map(([v,l])=>\`<button class="tab \${tab===v?'active':''}" data-action="detail-tab" data-value="\${v}" data-id="\${id}">\${l}</button>\`).join('')}</div><div class="detail-content">\${content}</div>\${['notes','feedback'].includes(tab)?\`<form class="note-compose" data-submit="note" data-id="\${id}" data-type="\${tab}"><div class="compose-top"><span>작성자 \${role==='본사 관리자'?'김지훈':'파트너 관리자'}</span><label><input type="checkbox" name="important"> 중요</label></div><div class="compose-box"><textarea name="note" placeholder="\${tab==='notes'?'상담 내용과 다음 진행사항을 기록하세요.':'영업지원팀 피드백을 기록하세요.'}" aria-label="상담 내용" required></textarea><button type="submit" class="btn primary" aria-label="기록 등록">\${icon('send')}</button></div></form>\`:''}</section><aside class="detail-history"><h4>\${icon('history')}변경 히스토리</h4>\${[...(db.history[id]||[]),{date:c.date.slice(5)+' 09:30',text:'고객 접수 · '+c.source,by:'시스템'},{date:c.date.slice(5)+' 09:30',text:'담당자 '+c.owner,by:'운영관리자'}].map(h=>\`<div class="history-item"><time>\${esc(h.date)}</time><p>\${esc(h.text)}</p><small>\${esc(h.by)}</small></div>\`).join('')}</aside></div>\`;`,
  `const body=\`<div class="customer-detail" data-detail-tab="\${tab}"><div class="mobile-cust-strip">\${badge(c.status)}\${c.label!=='일반'?badge(c.label,c.label==='긴급'?'red':c.label==='완료'?'green':'orange'):''}<span>담당 \${esc(c.owner)}</span>\${c.measure?\`<span>· 실측 \${esc(c.measure.slice(5))}</span>\`:''}<button type="button" class="link-chip" style="margin-left:auto" data-action="detail-tab" data-value="\${tab==='manage'?'notes':'manage'}" data-id="\${id}">\${tab==='manage'?'상담이력 보기':'상태·링크 변경'}</button></div><div class="tabs mobile-detail-tabs">\${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료'],['manage','상태·링크'],['history','히스토리']].map(([v,l])=>\`<button class="tab \${tab===v?'active':''}" data-action="detail-tab" data-value="\${v}" data-id="\${id}">\${l}</button>\`).join('')}</div><aside class="detail-side"><div class="detail-box"><h4>\${icon('settings')}상태 및 담당자</h4>\${selectField('진행구분','detail-status',stages,c.status)}\${selectField('진행라벨','detail-label',db.labels.map(l=>l.name),c.label)}\${selectField('담당 상담사','detail-owner',['미배정','오영진','김정연','마지희'],c.owner)}\${field('유입채널','detail-source',c.source)}</div><div class="detail-box"><h4>\${icon('calendar')}일정 관리</h4>\${field('실측 예정일','detail-measure',c.measure,'date')}\${field('시공 예정일','detail-build',c.build,'date')}</div><div class="detail-box links"><h4>\${icon('link')}견적 · 내관도</h4><div style="display:flex;flex-direction:column;gap:8px">\${quoteSideRow('가견적','가견적',c.roughQuote,c.roughQuoteUrl,'rough-quote-link',id,Boolean(c.quote))}\${quoteSideRow('최종견적','최종견적',c.finalQuote,c.finalQuoteUrl,'final-quote-link',id,Boolean(c.quote))}\${linkRow('내관도',c.drawing,'drawing',id,'내관도 관리')}</div></div>\${btn('변경사항 저장','save-customer','check','primary block',\`data-id="\${id}"\`)}</aside><section class="detail-center"><div class="tabs desktop-detail-tabs">\${[['notes','상담이력'],['feedback','피드백'],['quotes','견적'],['contract','계약·결제'],['files','공사자료']].map(([v,l])=>\`<button class="tab \${tab===v?'active':''}" data-action="detail-tab" data-value="\${v}" data-id="\${id}">\${l}</button>\`).join('')}</div><div class="detail-content">\${content}</div>\${['notes','feedback'].includes(tab)?\`<form class="note-compose" data-submit="note" data-id="\${id}" data-type="\${tab}"><div class="compose-top"><span>작성자 \${role==='본사 관리자'?'김지훈':'파트너 관리자'}</span><label><input type="checkbox" name="important"> 중요</label></div><div class="compose-box"><textarea name="note" placeholder="\${tab==='notes'?'상담 내용과 다음 진행사항을 기록하세요.':'영업지원팀 피드백을 기록하세요.'}" aria-label="상담 내용" required></textarea><button type="submit" class="btn primary" aria-label="기록 등록">\${icon('send')}</button></div></form>\`:''}</section><aside class="detail-history"><h4>\${icon('history')}변경 히스토리</h4>\${[...(db.history[id]||[]),{date:c.date.slice(5)+' 09:30',text:'고객 접수 · '+c.source,by:'시스템'},{date:c.date.slice(5)+' 09:30',text:'담당자 '+c.owner,by:'운영관리자'}].map(h=>\`<div class="history-item"><time>\${esc(h.date)}</time><p>\${esc(h.text)}</p><small>\${esc(h.by)}</small></div>\`).join('')}</aside></div>\`;`,
  'openCustomer mobile tabs & quick strip'
);

// Mobile-friendly Quote Editor item table cells
mustReplace(
  `<div class="table-wrap"><table class="quote-table"><thead><tr><th>품목</th><th>수량</th><th>원가 단가</th><th>합계</th></tr></thead><tbody>\${editor.items.map((item,i)=>\`<tr><td><input class="item-name" aria-label="품목 \${i+1} 이름" data-item="\${i}" data-key="name" value="\${esc(item.name)}"><small>\${esc(item.spec)}</small></td><td><input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 \${i+1} 수량" data-item="\${i}" data-key="qty" value="\${num(item.qty)}"></td><td><input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 \${i+1} 단가" data-item="\${i}" data-key="price" value="\${num(item.price)}"></td><td class="money" id="item-total-\${i}">\${won(item.qty*item.price)}</td></tr>\`).join('')}</tbody></table></div>`,
  `<div class="table-wrap"><table class="quote-table"><thead><tr><th>품목</th><th>수량</th><th>원가 단가</th><th>합계</th></tr></thead><tbody>\${editor.items.map((item,i)=>\`<tr><td class="qt-item-cell"><input class="item-name" aria-label="품목 \${i+1} 이름" data-item="\${i}" data-key="name" value="\${esc(item.name)}"><small>\${esc(item.spec)}</small></td><td class="qt-qty-cell" data-label="수량"><input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 \${i+1} 수량" data-item="\${i}" data-key="qty" value="\${num(item.qty)}"></td><td class="qt-price-cell" data-label="원가 단가"><input class="money" type="text" inputmode="numeric" data-money="1" aria-label="품목 \${i+1} 단가" data-item="\${i}" data-key="price" value="\${num(item.price)}"></td><td class="money qt-total-cell" data-label="합계" id="item-total-\${i}">\${won(item.qty*item.price)}</td></tr>\`).join('')}</tbody></table></div>`,
  'renderEditor quote-table mobile cells'
);

// Mobile nav toggle, close, Escape, and resize handlers
mustReplace(
  `switch(a){case'nav':page=el.dataset.page;selected.clear();render();window.scrollTo(0,0);break;`,
  `switch(a){case'toggle-nav':setMobileNav(!mobileNavOpen);break;case'close-nav':setMobileNav(false);break;case'nav':setMobileNav(false);page=el.dataset.page;selected.clear();render();window.scrollTo(0,0);break;`,
  'nav toggle & close actions'
);

mustReplace(
  `case'partner-mode':role='파트너 관리자';selected.clear();page='customers';customerTab='all';partnerFilter='';stageFilter='';query='';closeDialog();render();toast('한빛인테리어 전용 화면으로 전환했습니다.');break;`,
  `case'partner-mode':setMobileNav(false);role='파트너 관리자';selected.clear();page='customers';customerTab='all';partnerFilter='';stageFilter='';query='';closeDialog();(async()=>{await apiSwitchRole(role);await syncFromServer();render();})();toast('한빛인테리어 전용 화면으로 전환했습니다.');break;`,
  'partner-mode closes mobile nav & syncs role'
);

mustReplace(
  `document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.overlay')){closeDialog();return}`,
  `window.addEventListener('resize',()=>{if(window.innerWidth>900&&mobileNavOpen)setMobileNav(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.overlay')){closeDialog();return}if(e.key==='Escape'&&mobileNavOpen){setMobileNav(false);return}`,
  'keydown Escape & resize for mobile nav'
);

fs.writeFileSync('public/app.js', code, 'utf8');
console.log('Successfully generated public/app.js! Total size:', code.length);
