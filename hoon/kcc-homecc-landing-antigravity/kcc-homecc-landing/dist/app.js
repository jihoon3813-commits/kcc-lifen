'use strict';
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

const menuButton = $('.menu-toggle');
const mobileMenu = $('#mobile-menu');
function closeMenu() {
  if (!menuButton || !mobileMenu) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
  mobileMenu.hidden = true;
}
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menuButton.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
    mobileMenu.hidden = expanded;
  });
  $$('a', mobileMenu).forEach(link => link.addEventListener('click', closeMenu));
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

const sizeSelect = $('#customer-size');
const modalSizeSelect = $('#modal-customer-size');
function setSize(size) {
  if (sizeSelect) sizeSelect.value = size;
  if (modalSizeSelect) modalSizeSelect.value = size;
  $$('.size-options button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
  const summary = $('#size-summary');
  if (summary) {
    summary.textContent = size && size !== '잘 모르겠어요'
      ? `${size} 선택 · 우리 집 조건에 맞춰 상담해드려요.`
      : '평형을 정확히 모르셔도 괜찮아요.';
  }
}
$$('.size-options button').forEach(button => button.addEventListener('click', () => setSize(button.dataset.size)));
if (sizeSelect) sizeSelect.addEventListener('change', () => setSize(sizeSelect.value));
if (modalSizeSelect) modalSizeSelect.addEventListener('change', () => setSize(modalSizeSelect.value));

function setPurpose(purpose) {
  const targetPurpose = purpose === 'measure' ? 'measure' : 'cost';
  const labelText = targetPurpose === 'measure' ? '무료 실측 상담 신청하기' : '월 납입금 상담 신청하기';
  const bottomRadio = $(`input[name="purpose"][value="${targetPurpose}"]`);
  if (bottomRadio) bottomRadio.checked = true;
  const modalRadio = $(`input[name="modal-purpose"][value="${targetPurpose}"]`);
  if (modalRadio) modalRadio.checked = true;
  const submitLabel = $('#submit-label');
  if (submitLabel) submitLabel.textContent = labelText;
  const modalSubmitLabel = $('#modal-submit-label');
  if (modalSubmitLabel) modalSubmitLabel.textContent = labelText;
}
$$('input[name="purpose"]').forEach(input => input.addEventListener('change', () => setPurpose(input.value)));
$$('input[name="modal-purpose"]').forEach(input => input.addEventListener('change', () => setPurpose(input.value)));

function setScope(scope) {
  const bottomScope = $('#customer-scope');
  const modalScope = $('#modal-customer-scope');
  if (bottomScope) bottomScope.value = scope;
  if (modalScope) modalScope.value = scope;
  if (scope) {
    $$('.optional-fields').forEach(details => { details.open = true; });
  }
}

const scenes = {
  day: { image: 'assets/hero.webp', alt: '햇살이 들어오는 거실 공간 연출', kicker: 'LIVING ROOM', lines: ['빛이 머무는 곳,', '가족이 모이는 거실.'], position: '66% 57%' },
  evening: { image: 'assets/living.webp', alt: '가족이 함께하는 저녁 거실 공간 연출', kicker: 'FAMILY MOMENT', lines: ['하루의 끝에서,', '함께 쉬어가는 공간.'], position: 'center 60%' },
  corner: { image: 'assets/room.webp', alt: '창가에서 휴식하는 가족 공간 연출', kicker: 'A QUIET AFTERNOON', lines: ['창가에 앉아,', '나누는 작은 여유.'], position: 'center 38%' }
};
const tabs = $$('.space-tabs [role="tab"]');
function showScene(tab) {
  tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
  const scene = scenes[tab.dataset.scene];
  $('#space-image').src = scene.image;
  $('#space-image').alt = scene.alt;
  $('#space-image').style.objectPosition = scene.position;
  $('#space-kicker').textContent = scene.kicker;
  const title = $('#space-title');
  title.replaceChildren(document.createTextNode(scene.lines[0]), document.createElement('br'), document.createTextNode(scene.lines[1]));
  $('#space-panel').setAttribute('aria-labelledby', tab.id);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showScene(tab));
  tab.addEventListener('keydown', event => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); showScene(tabs[next]); tabs[next].focus();
  });
});

function openDialog(id) {
  const dialog = $(id);
  if (!dialog) return;
  dialog._previousFocus = document.activeElement;
  if (!dialog.open) dialog.showModal();
  document.body.style.overflow = 'hidden';
}

$$('[data-dialog]').forEach(button => button.addEventListener('click', () => openDialog(`#${button.dataset.dialog}`)));
$$('dialog').forEach(dialog => {
  $$('.dialog-close,.dialog-confirm', dialog).forEach(button => {
    button.addEventListener('click', () => {
      if (dialog.id === 'privacy-dialog' && button.classList.contains('dialog-confirm')) {
        const consultDialog = $('#consult-dialog');
        if (consultDialog && consultDialog.open) {
          const modalConsent = $('#modal-privacy-consent');
          if (modalConsent) {
            modalConsent.checked = true;
            modalConsent.setAttribute('aria-invalid', 'false');
            const err = $('#modal-consent-error');
            if (err) err.textContent = '';
          }
        } else {
          const bottomConsent = $('#privacy-consent');
          if (bottomConsent) {
            bottomConsent.checked = true;
            bottomConsent.setAttribute('aria-invalid', 'false');
            const err = $('#consent-error');
            if (err) err.textContent = '';
          }
        }
      }
      dialog.close();
    });
  });
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    if (!$$('dialog[open]').length) {
      document.body.style.overflow = '';
    }
    const prev = dialog._previousFocus;
    if (prev && prev.isConnected) prev.focus({ preventScroll: true });
  });
});

// Open consultation modal from all consultation CTA links/buttons outside the bottom #consult section
$$('a[href="#consult"], [data-open-consult]').forEach(trigger => {
  if (trigger.closest('#consult')) return;
  trigger.addEventListener('click', event => {
    event.preventDefault();
    closeMenu();
    if (trigger.dataset.purpose) setPurpose(trigger.dataset.purpose);
    if (trigger.dataset.planSize) setSize(trigger.dataset.planSize);
    if (trigger.dataset.scope) setScope(trigger.dataset.scope);
    openDialog('#consult-dialog');
  });
});

// Automatic hyphenation for phone number inputs
function formatPhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function bindPhoneAutoHyphen(input) {
  if (!input) return;
  const applyFormat = () => {
    const formatted = formatPhoneNumber(input.value);
    if (input.value !== formatted) {
      input.value = formatted;
    }
  };
  input.addEventListener('input', applyFormat);
  input.addEventListener('change', applyFormat);
  input.addEventListener('blur', applyFormat);
}

$$('#customer-phone, #modal-customer-phone, input[type="tel"][name="phone"]').forEach(bindPhoneAutoHyphen);

// URL query & analytics tracking (persist within session)
const urlParams = new URLSearchParams(window.location.search);
const isPreviewMode = urlParams.get('preview') === '1';

let storedAttr = {};
try {
  storedAttr = JSON.parse(sessionStorage.getItem('kcc_landing_attr') || '{}') || {};
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
    sessionStorage.setItem('kcc_landing_attr', JSON.stringify({
      ch: currentCh,
      partner: currentPartner,
      utm_source: currentUtmSource,
      utm_medium: currentUtmMedium,
      utm_campaign: currentUtmCampaign
    }));
  } catch {}
}

// Track page view (skip when opened inside CRM preview modal)
if (!isPreviewMode) {
  try {
    fetch('/api/landing/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'page_view',
        product_name: 'KCC 홈씨씨 창호',
        ch: currentCh,
        partner: currentPartner,
        utm_source: currentUtmSource,
        utm_medium: currentUtmMedium,
        utm_campaign: currentUtmCampaign
      })
    }).catch(() => {});
  } catch (e) {}
}

// If partner or cloned link specified, fetch attribution info
if (currentPartner || currentCh) {
  fetch(`/api/landing/info?ch=${encodeURIComponent(currentCh)}&partner=${encodeURIComponent(currentPartner)}`)
    .then(r => r.json())
    .then(data => {
      if (data?.partner?.name) {
        const label = `${data.partner.name} 전용 접수`;
        const tag = $('#landing-mode-tag');
        if (tag) tag.textContent = label;
        const modalTag = $('#modal-landing-mode-tag');
        if (modalTag) modalTag.textContent = label;
      }
    }).catch(() => {});
}

function validate(field) {
  const valid = field.valid(field.input);
  if (field.error) field.error.textContent = valid ? '' : field.message;
  field.input.setAttribute('aria-invalid', String(!valid));
  return valid;
}

function setupConsultForm({
  formSelector,
  nameSelector,
  nameErrorSelector,
  phoneSelector,
  phoneErrorSelector,
  regionSelector,
  regionErrorSelector,
  sizeSelector,
  districtSelector,
  apartmentSelector,
  scopeSelector,
  consentSelector,
  consentErrorSelector,
  purposeName,
  submitBtnSelector,
  submitLabelSelector,
  isModal = false
}) {
  const form = $(formSelector);
  if (!form) return;

  const nameInput = $(nameSelector);
  const phoneInput = $(phoneSelector);
  const regionInput = $(regionSelector);
  const consentInput = $(consentSelector);

  const formFields = [
    { input: nameInput, error: $(nameErrorSelector), valid: input => input.value.trim().length >= 2, message: '성함을 두 글자 이상 입력해 주세요.' },
    { input: phoneInput, error: $(phoneErrorSelector), valid: input => /^01[016789]\d{7,8}$/.test(input.value.replace(/\D/g, '')), message: '연락 가능한 휴대전화 번호를 확인해 주세요.' },
    { input: regionInput, error: $(regionErrorSelector), valid: input => Boolean(input.value), message: '설치 지역을 선택해 주세요.' },
    { input: consentInput, error: $(consentErrorSelector), valid: input => input.checked, message: '개인정보 안내를 확인하고 동의해 주세요.' }
  ].filter(f => f.input);

  formFields.forEach(field => {
    field.input.addEventListener(field.input.type === 'checkbox' || field.input.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (field.input.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const invalid = formFields.filter(field => !validate(field));
    if (invalid.length) {
      invalid[0].input.focus();
      return;
    }

    const submitBtn = $(submitBtnSelector) || $('.submit-button', form);
    const submitLabel = $(submitLabelSelector);
    const origText = submitLabel ? submitLabel.textContent : '';

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = '상담 접수 처리 중...';

      const payload = {
        name: nameInput?.value?.trim(),
        phone: formatPhoneNumber(phoneInput?.value?.trim()),
        region: regionInput?.value,
        size: $(sizeSelector)?.value || '',
        district: $(districtSelector)?.value?.trim() || '',
        apartment: $(apartmentSelector)?.value?.trim() || '',
        scope: $(scopeSelector)?.value || '',
        purpose: form.querySelector(`input[name="${purposeName}"]:checked`)?.value || 'cost',
        ch: currentCh,
        partner: currentPartner,
        utm_source: currentUtmSource,
        utm_medium: currentUtmMedium,
        utm_campaign: currentUtmCampaign
      };

      const res = await fetch('/api/landing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok && !data.alreadySubmitted) {
        alert(data.error || '상담 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const receiptNo = $('#receipt-no');
      if (receiptNo) receiptNo.textContent = `No. ${data.receiptId || '-'}`;
      const receiptName = $('#receipt-name');
      if (receiptName) receiptName.textContent = data.customerName || payload.name;
      const receiptPhone = $('#receipt-phone');
      if (receiptPhone) receiptPhone.textContent = data.phone || payload.phone;
      const receiptPurpose = $('#receipt-purpose');
      if (receiptPurpose) receiptPurpose.textContent = data.purpose || (payload.purpose === 'measure' ? '무료 방문실측 예약' : '월 납입금 견적상담');
      const receiptMsg = $('#receipt-msg');
      if (receiptMsg && data.message) receiptMsg.textContent = data.message;

      if (isModal) {
        const consultDialog = $('#consult-dialog');
        if (consultDialog && consultDialog.open) consultDialog.close();
      }

      openDialog('#success-dialog');

      setTimeout(() => {
        $('#consult-form')?.reset();
        $('#modal-consult-form')?.reset();
        setSize('');
        setPurpose('cost');
      }, 500);

    } catch (err) {
      console.error('Submit error:', err);
      if (isModal) {
        const consultDialog = $('#consult-dialog');
        if (consultDialog && consultDialog.open) consultDialog.close();
      }
      openDialog('#success-dialog');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = origText || '월 납입금 상담 신청하기';
    }
  });
}

// Initialize bottom inline form and modal form
setupConsultForm({
  formSelector: '#consult-form',
  nameSelector: '#customer-name',
  nameErrorSelector: '#name-error',
  phoneSelector: '#customer-phone',
  phoneErrorSelector: '#phone-error',
  regionSelector: '#customer-region',
  regionErrorSelector: '#region-error',
  sizeSelector: '#customer-size',
  districtSelector: '#customer-district',
  apartmentSelector: '#customer-apartment',
  scopeSelector: '#customer-scope',
  consentSelector: '#privacy-consent',
  consentErrorSelector: '#consent-error',
  purposeName: 'purpose',
  submitBtnSelector: '#submit-btn',
  submitLabelSelector: '#submit-label',
  isModal: false
});

setupConsultForm({
  formSelector: '#modal-consult-form',
  nameSelector: '#modal-customer-name',
  nameErrorSelector: '#modal-name-error',
  phoneSelector: '#modal-customer-phone',
  phoneErrorSelector: '#modal-phone-error',
  regionSelector: '#modal-customer-region',
  regionErrorSelector: '#modal-region-error',
  sizeSelector: '#modal-customer-size',
  districtSelector: '#modal-customer-district',
  apartmentSelector: '#modal-customer-apartment',
  scopeSelector: '#modal-customer-scope',
  consentSelector: '#modal-privacy-consent',
  consentErrorSelector: '#modal-consent-error',
  purposeName: 'modal-purpose',
  submitBtnSelector: '#modal-submit-btn',
  submitLabelSelector: '#modal-submit-label',
  isModal: true
});

const mobileCta = $('#mobile-cta');
if (mobileCta && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    mobileCta.classList.toggle('is-hidden', entries.some(entry => entry.isIntersecting));
  }, { threshold: 0, rootMargin: '0px 0px -70px 0px' });
  const bottomForm = $('#consult-form');
  if (bottomForm) observer.observe(bottomForm);
}
