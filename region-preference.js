(function () {
  'use strict';

  const key = 'globee:region:v1';
  const regions = ['Exeter', 'Bristol', 'Nottingham'];
  const root = document.documentElement;
  const requested = normalise(new URLSearchParams(window.location.search).get('region'));
  const home = window.location.pathname === '/' || window.location.pathname === '/index.html';
  let saved = null;
  let onChoose = null;
  let mounted = false;

  function normalise(value) {
    if (value === 'Devon') return 'Exeter';
    return regions.includes(value) ? value : null;
  }

  try {
    saved = normalise(window.localStorage.getItem(key));
  } catch {
    // Browsing still works when the browser blocks saved preferences.
  }

  const preference = {
    initialRegion: requested || saved || 'Exeter',
    needsChoice: home && !requested && !saved,
    remember,
    mount
  };
  window.GlobeeRegionPreference = preference;

  if (preference.needsChoice) root.classList.add('region-choice-pending');

  function remember(value) {
    const region = normalise(value);
    if (!region) return false;
    preference.needsChoice = false;
    preference.initialRegion = region;
    let stored = false;
    try {
      window.localStorage.setItem(key, region);
      stored = window.localStorage.getItem(key) === region;
    } catch {
      // Keep the selected region for the current page and its links.
    }
    const message = document.getElementById('region-save-message');
    if (message) message.hidden = stored;
    return stored;
  }

  function mount(callback) {
    if (typeof callback === 'function') onChoose = callback;
    const dialog = document.getElementById('region-choice');
    if (!dialog || mounted) return;
    mounted = true;

    dialog.addEventListener('cancel', event => event.preventDefault());
    dialog.addEventListener('close', () => {
      if (preference.needsChoice && !dialog.open) dialog.showModal();
    });
    dialog.addEventListener('click', event => {
      const choice = event.target.closest('[data-choose-region]');
      if (!choice) return;
      const region = normalise(choice.dataset.chooseRegion);
      if (!region) return;
      remember(region);
      if (onChoose) {
        event.preventDefault();
        dialog.close();
        root.classList.remove('region-choice-pending');
        document.body.classList.remove('region-choice-open');
        onChoose(region);
      }
    });

    if (preference.needsChoice && typeof dialog.showModal === 'function') {
      dialog.showModal();
      document.body.classList.add('region-choice-open');
    }
    root.classList.remove('region-choice-pending');
  }

  document.addEventListener('DOMContentLoaded', () => mount(), { once: true });
})();
