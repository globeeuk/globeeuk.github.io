/* Ephemeral checklist only. No persistence, analytics or network requests. */
(() => {
  'use strict';
  const inputs = [...document.querySelectorAll('[data-check]')];
  const progress = document.querySelector('.bp-checkprogress');
  function update() {
    if (progress) progress.textContent = `${inputs.filter(input => input.checked).length} of ${inputs.length} checked · on this page only`;
  }
  inputs.forEach(input => input.addEventListener('change', update));
  update();
})();
