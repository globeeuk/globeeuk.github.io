(function () {
  'use strict';
  const dialog = document.getElementById('founder-story-dialog');
  const video = document.getElementById('founder-film');
  if (!dialog || !video || typeof dialog.showModal !== 'function') return;
  const status = document.getElementById('founder-film-status');
  let trigger, tracked = false;

  document.querySelectorAll('[data-founder-story-open]').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      // Modified clicks and browsers without dialog support retain the Instagram link.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      try { dialog.showModal(); } catch { return; }
      event.preventDefault();
      trigger = link;
      tracked = false;
      status.hidden = true;
      document.documentElement.classList.add('founder-film-open');
      // No movie request until the visitor explicitly opens the film.
      if (!video.getAttribute('src')) video.src = video.dataset.videoSrc;
      const play = video.play();
      if (play && typeof play.catch === 'function') play.catch(() => { if (dialog.open) status.hidden = false; });
    });
  });
  dialog.querySelector('.founder-film-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    video.pause();
    document.documentElement.classList.remove('founder-film-open');
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  video.addEventListener('error', () => { status.hidden = false; });
  video.addEventListener('playing', () => {
    if (!dialog.open) { video.pause(); return; }
    status.hidden = true;
    if (!tracked && typeof window.globeeTrack === 'function') {
      window.globeeTrack('founder_story_play', { collection: 'founder-story' });
      tracked = true;
    }
  });
})();
