'use strict';
// Additional controls share the consultation state across modal & bottom form.
document.querySelectorAll('[data-plan-size]').forEach(link => {
  link.addEventListener('click', () => {
    if (typeof setSize === 'function') setSize(link.dataset.planSize);
  });
});
document.querySelectorAll('[data-scope]').forEach(link => {
  link.addEventListener('click', () => {
    if (typeof setScope === 'function') {
      setScope(link.dataset.scope);
    } else {
      const bottomScope = document.querySelector('#customer-scope');
      if (bottomScope) bottomScope.value = link.dataset.scope;
      const modalScope = document.querySelector('#modal-customer-scope');
      if (modalScope) modalScope.value = link.dataset.scope;
      document.querySelectorAll('.optional-fields').forEach(el => { el.open = true; });
    }
  });
});
const comparisonRange = document.querySelector('#comparison-range');
if (comparisonRange) {
  comparisonRange.addEventListener('input', () => {
    document.querySelector('#comparison-slider').style.setProperty('--reveal', `${comparisonRange.value}%`);
    comparisonRange.setAttribute('aria-valuetext', `교체 전 이미지 ${comparisonRange.value}% 표시`);
  });
}
