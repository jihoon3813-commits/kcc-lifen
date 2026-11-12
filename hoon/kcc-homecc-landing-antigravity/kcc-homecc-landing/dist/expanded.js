'use strict';
// Additional controls share the original page's consultation state.
document.querySelectorAll('[data-plan-size]').forEach(link => {
  link.addEventListener('click', () => setSize(link.dataset.planSize));
});
document.querySelectorAll('[data-scope]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('#customer-scope').value = link.dataset.scope;
    document.querySelector('.optional-fields').open = true;
  });
});
const comparisonRange = document.querySelector('#comparison-range');
comparisonRange.addEventListener('input', () => {
  document.querySelector('#comparison-slider').style.setProperty('--reveal', `${comparisonRange.value}%`);
  comparisonRange.setAttribute('aria-valuetext', `교체 전 이미지 ${comparisonRange.value}% 표시`);
});
