'use strict';
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

const menuButton = $('.menu-toggle');
const mobileMenu = $('#mobile-menu');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
  mobileMenu.hidden = true;
}
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
  mobileMenu.hidden = expanded;
});
$$('a', mobileMenu).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

const sizeSelect = $('#customer-size');
function setSize(size) {
  sizeSelect.value = size;
  $$('.size-options button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
  $('#size-summary').textContent = size && size !== '잘 모르겠어요'
    ? `${size} 선택 · 우리 집 조건에 맞춰 상담해드려요.`
    : '평형을 정확히 모르셔도 괜찮아요.';
}
$$('.size-options button').forEach(button => button.addEventListener('click', () => setSize(button.dataset.size)));
sizeSelect.addEventListener('change', () => setSize(sizeSelect.value));

function setPurpose(purpose) {
  $(`input[name="purpose"][value="${purpose}"]`).checked = true;
  $('#submit-label').textContent = purpose === 'measure' ? '무료 실측 상담 신청하기' : '월 납입금 상담 신청하기';
}
$$('[data-purpose]').forEach(link => link.addEventListener('click', () => setPurpose(link.dataset.purpose)));
$$('input[name="purpose"]').forEach(input => input.addEventListener('change', () => setPurpose(input.value)));

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

let previousFocus;
function openDialog(id) {
  previousFocus = document.activeElement;
  $(id).showModal();
  document.body.style.overflow = 'hidden';
}
$$('[data-dialog]').forEach(button => button.addEventListener('click', () => openDialog(`#${button.dataset.dialog}`)));
$$('dialog').forEach(dialog => {
  $$('.dialog-close,.dialog-confirm', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  });
});

const phoneInput = $('#customer-phone');
phoneInput.addEventListener('input', () => {
  let digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
  phoneInput.value = digits.length > 7 ? `${digits.slice(0,3)}-${digits.slice(3,digits.length-4)}-${digits.slice(-4)}` : digits.length > 3 ? `${digits.slice(0,3)}-${digits.slice(3)}` : digits;
});
const fields = [
  { input: $('#customer-name'), error: $('#name-error'), valid: input => input.value.trim().length >= 2, message: '성함을 두 글자 이상 입력해 주세요.' },
  { input: phoneInput, error: $('#phone-error'), valid: input => /^01[016789]\d{7,8}$/.test(input.value.replace(/\D/g, '')), message: '연락 가능한 휴대전화 번호를 확인해 주세요.' },
  { input: $('#customer-region'), error: $('#region-error'), valid: input => Boolean(input.value), message: '설치 지역을 선택해 주세요.' },
  { input: $('#privacy-consent'), error: $('#consent-error'), valid: input => input.checked, message: '개인정보 안내를 확인하고 동의해 주세요.' }
];
function validate(field) {
  const valid = field.valid(field.input);
  field.error.textContent = valid ? '' : field.message;
  field.input.setAttribute('aria-invalid', String(!valid));
  return valid;
}
fields.forEach(field => {
  field.input.addEventListener(field.input.type === 'checkbox' || field.input.tagName === 'SELECT' ? 'change' : 'input', () => {
    if (field.input.getAttribute('aria-invalid') === 'true') validate(field);
  });
});
$('#consult-form').addEventListener('submit', event => {
  event.preventDefault();
  const invalid = fields.filter(field => !validate(field));
  if (invalid.length) { invalid[0].input.focus(); return; }
  // Design preview only. No network request, storage, analytics or real lead submission.
  openDialog('#success-dialog');
});

const mobileCta = $('#mobile-cta');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    mobileCta.classList.toggle('is-hidden', entries.some(entry => entry.isIntersecting));
  }, { threshold: 0, rootMargin: '0px 0px -70px 0px' });
  observer.observe($('#consult-form'));
}
