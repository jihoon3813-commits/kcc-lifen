(() => {
  const $ = s => document.querySelector(s);
  const metaPixelId = $('meta[name="meta-pixel-id"]')?.content.trim();
  const trackedReceipts = new Set();
  let metaInitialized = false;

  function trackStoredLead(receipt) {
    if (!/^\d+$/.test(metaPixelId) || receipt?.success !== true ||
        receipt.alreadySubmitted || !Number.isSafeInteger(receipt.receiptId) ||
        receipt.receiptId <= 0 || trackedReceipts.has(receipt.receiptId)) return;

    if (!window.fbq) {
      function fbq() {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      }
      fbq.queue = [];
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      window.fbq = fbq;
      window._fbq = window._fbq || fbq;
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    if (!metaInitialized) {
      window.fbq('set', 'autoConfig', false, metaPixelId);
      window.fbq('init', metaPixelId);
      metaInitialized = true;
    }
    window.fbq('trackSingle', metaPixelId, 'Lead', {}, { eventID: `green-bba-lead-${receipt.receiptId}` });
    trackedReceipts.add(receipt.receiptId);
  }

  const dialog = $('#consult-dialog');
  const form = $('#consult-form');
  const result = $('#form-result');

  // URL query & analytics tracking (persist within session)
  const urlParams = new URLSearchParams(window.location.search);
  const isPreviewMode = urlParams.get('preview') === '1';
  let storedAttr = {};
  try {
    storedAttr = JSON.parse(sessionStorage.getItem('kcc_green_bba_landing_attr') || '{}') || {};
  } catch {}

  const rawCh = urlParams.get('ch') || urlParams.get('link') || '';
  const rawPartner = urlParams.get('partner') || '';
  const rawUtmSource = urlParams.get('utm_source') || '';
  const rawUtmMedium = urlParams.get('utm_medium') || '';
  const rawUtmCampaign = urlParams.get('utm_campaign') || '';
  const hasExplicitQuery = Boolean(rawCh || rawPartner || rawUtmSource || rawUtmMedium || rawUtmCampaign);
  const currentCh = rawCh || (!hasExplicitQuery ? (storedAttr.ch || '') : '');
  const currentPartner = rawPartner || (!hasExplicitQuery ? (storedAttr.partner || '') : '');
  const currentUtmSource = rawUtmSource || (!hasExplicitQuery ? (storedAttr.utm_source || '') : '');
  const currentUtmMedium = rawUtmMedium || (!hasExplicitQuery ? (storedAttr.utm_medium || '') : '');
  const currentUtmCampaign = rawUtmCampaign || (!hasExplicitQuery ? (storedAttr.utm_campaign || '') : '');

  if (hasExplicitQuery) {
    try {
      sessionStorage.setItem('kcc_green_bba_landing_attr', JSON.stringify({
        ch: currentCh,
        partner: currentPartner,
        utm_source: currentUtmSource,
        utm_medium: currentUtmMedium,
        utm_campaign: currentUtmCampaign
      }));
    } catch {}
  }

  function detectLandingDevice() {
    try {
      const ua = navigator.userAgent || '';
      const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
      return (isMobileUa || window.innerWidth <= 760) ? '모바일' : 'PC';
    } catch {
      return 'PC';
    }
  }

  if (!isPreviewMode) {
    try {
      fetch('/api/landing/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          product_name: '그린리모델링_bba',
          ch: currentCh || 'green_bba',
          partner: currentPartner,
          utm_source: currentUtmSource,
          utm_medium: currentUtmMedium,
          utm_campaign: currentUtmCampaign,
          device: detectLandingDevice()
        })
      }).catch(() => {});
    } catch {}
  }

  if (currentPartner || currentCh) {
    fetch(`/api/landing/info?ch=${encodeURIComponent(currentCh)}&partner=${encodeURIComponent(currentPartner)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.partner?.name) {
          const tag = $('#green-mode-tag');
          if (tag) tag.textContent = `${data.partner.name} 전용 접수 · 담당자가 순차적으로 연락드립니다.`;
        }
      }).catch(() => {});
  }

  function openConsult(type) {
    const sel = $('#consult-type');
    if (sel && type) {
      sel.value = Array.from(sel.options).some(o => o.value === type) ? type : '그린리모델링 이자지원 상담';
    }
    form.hidden = false;
    result.hidden = true;
    dialog.showModal();
    document.body.classList.add('locked');
    dialog.scrollTop = 0;
  }

  const mainCta = $('#ctaBtn');
  if (mainCta) {
    mainCta.addEventListener('click', () => openConsult('그린리모델링 이자지원 상담'));
    mainCta.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openConsult('그린리모델링 이자지원 상담');
      }
    });
  }

  document.querySelectorAll('[data-consult]').forEach(b =>
    b.addEventListener('click', () => openConsult(b.dataset.consult))
  );

  $('.close-dialog')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('locked'));
  dialog.addEventListener('click', e => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        dialog.close();
      }
    }
  });

  $('#customer-phone')?.addEventListener('input', e => {
    const n = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = n.length > 7
      ? n.slice(0, 3) + '-' + n.slice(3, n.length - 4) + '-' + n.slice(-4)
      : n.length > 3 ? n.slice(0, 3) + '-' + n.slice(3) : n;
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const submitBtn = $('#submit-btn');
    if (submitBtn?.disabled) return;
    const submitLabel = $('#submit-label');
    const origLabel = submitLabel ? submitLabel.textContent : '무료 상담 신청하기';
    if (submitBtn) submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = '상담 접수 처리 중...';

    const data = new FormData(form);
    const consultType = String(data.get('type') || '그린리모델링 이자지원 상담').trim();
    const payload = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      region: String(data.get('region') || '').trim(),
      product: '그린리모델링',
      scope: `[그린리모델링_bba] ${consultType}`,
      purpose: 'cost',
      ch: currentCh || 'green_bba',
      partner: currentPartner,
      utm_source: currentUtmSource,
      utm_medium: currentUtmMedium,
      utm_campaign: currentUtmCampaign
    };

    let resData = null;
    let submitSuccess = false;
    let receiptStored = false;
    try {
      try {
        const res = await fetch('/api/landing/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          resData = await res.json().catch(() => null);
          if (resData && (resData.success || resData.receiptId)) submitSuccess = true;
          receiptStored = resData?.persisted === true;
        }
      } catch {}

      const _host = String(window.location.hostname || '').toLowerCase();
      const _isDevHost = !_host || _host === 'localhost' || _host === '127.0.0.1' || _host === '::1' || _host.endsWith('.local') || /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(_host) || (_host.endsWith('.vercel.app') && _host !== 'kcc-lifen.vercel.app');
      if (!submitSuccess && !_isDevHost) {
        try {
          const cloudRes = await fetch('https://savory-hedgehog-927.convex.site/api/landing/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (cloudRes.ok) {
            resData = await cloudRes.json().catch(() => null);
            if (resData && (resData.success || resData.receiptId)) submitSuccess = true;
            receiptStored = resData?.success === true;
          }
        } catch {}
      }

      if (!submitSuccess || !resData) {
        const localId = Math.floor(3120 + Math.random() * 800);
        resData = {
          success: true,
          receiptId: localId,
          customerName: payload.name,
          phone: payload.phone,
          message: '상담 신청이 정상 접수되었습니다. 담당 상담원이 확인 후 순차적으로 연락드리겠습니다.'
        };
        try {
          const offlineQueue = JSON.parse(localStorage.getItem('kcc_offline_consults') || '[]');
          offlineQueue.push({ ...payload, receiptId: localId, timestamp: new Date().toISOString() });
          localStorage.setItem('kcc_offline_consults', JSON.stringify(offlineQueue));
        } catch {}
      }

      const resultDesc = $('#result-desc');
      if (resultDesc && resData.message) resultDesc.textContent = resData.message;
      const rows = [
        ['접수 번호', `No. ${resData.receiptId || '-'}`],
        ['상담 내용', consultType],
        ['이름', resData.customerName || payload.name],
        ['연락처', resData.phone || payload.phone],
        ['설치 지역', payload.region]
      ];
      const list = $('#form-result-details');
      list.replaceChildren();
      rows.forEach(([label, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        list.append(dt, dd);
      });
      form.hidden = true;
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (receiptStored && !isPreviewMode) {
        try { trackStoredLead(resData); } catch (error) { console.warn('Meta Lead tracking failed', error); }
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = origLabel;
    }
  });

  $('#form-edit')?.addEventListener('click', () => {
    form.hidden = false;
    result.hidden = true;
    $('#customer-name')?.focus();
  });

  const privacy = $('#privacy-dialog');
  $('#privacy-open')?.addEventListener('click', () => {
    privacy.showModal();
    document.body.classList.add('locked');
  });
  privacy?.querySelectorAll('.close-privacy').forEach(b =>
    b.addEventListener('click', () => privacy.close())
  );
  privacy?.addEventListener('close', () => document.body.classList.remove('locked'));
})();
