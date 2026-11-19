/* Local town filtering. No storage, location request, remote fetch or new tracking. */
(function () {
  'use strict';
  const picker = document.getElementById('choose-area');
  if (!picker) return;
  const buttons = [...picker.querySelectorAll('[data-holiday-area-choice]')];
  const programmes = [...document.querySelectorAll('[data-holiday-programme]')];
  const picks = document.getElementById('local-picks');
  const more = document.getElementById('more-clubs');
  const pending = document.getElementById('holiday-area-pending');
  const counter = document.getElementById('holiday-area-count');
  if (!buttons.length || !programmes.length || !picks || !more || !counter) return;
  const headings = [picks, more].map(section => section.querySelector('h2'));
  const originalHeadings = headings.map(heading => heading.textContent);
  const originalCaption = more.querySelector('caption').textContent;
  const labels = new Map(buttons.map(button => [button.dataset.holidayAreaChoice, button.textContent.trim()]));
  const normalise = key => labels.has(key) ? key : 'all';
  function apply(key, updateAddress) {
    key = normalise(key);
    const all = key === 'all';
    const label = labels.get(key);
    let count = 0;
    programmes.forEach(programme => {
      programme.hidden = !all && programme.dataset.holidayArea !== key;
      if (!programme.hidden) count++;
    });
    const hasPicks = programmes.some(programme => picks.contains(programme) && !programme.hidden);
    const hasMore = programmes.some(programme => more.contains(programme) && !programme.hidden);
    picks.hidden = !hasPicks;
    more.hidden = !hasMore;
    const pickJump = document.querySelector('.holiday-jumps a[href="#local-picks"]');
    const moreJump = document.querySelector('.holiday-jumps a[href="#more-clubs"]');
    if (pickJump) { pickJump.hidden = !hasPicks; pickJump.textContent = all ? 'Places to start' : 'Selected programmes'; }
    if (moreJump) { moreJump.hidden = !hasMore; moreJump.textContent = all ? 'More programmes' : 'Selected programmes'; }
    headings[0].textContent = all ? originalHeadings[0] : 'Programmes in ' + label + '.';
    headings[1].textContent = all ? originalHeadings[1] : (hasPicks ? 'More in ' : 'Programmes in ') + label + '.';
    [picks, more].forEach(section => {
      const intro = section.querySelector('.holiday-section-intro');
      if (intro) intro.hidden = !all;
    });
    more.querySelector('caption').textContent = all ? originalCaption : 'December 2026 · Check the provider for current prices and places';
    if (pending) pending.hidden = !all;
    document.querySelectorAll('[data-holiday-area-reset]').forEach(button => { button.hidden = all; });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.holidayAreaChoice === key)));
    counter.textContent = all
      ? count + ' programmes across ' + new Set(programmes.map(programme => programme.dataset.holidayArea)).size + ' areas.'
      : count + (count === 1 ? ' programme in ' : ' programmes in ') + label + '.';
    if (updateAddress) {
      const url = new URL(location.href);
      if (all) url.searchParams.delete('area'); else url.searchParams.set('area', key);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.holidayAreaChoice, true)));
  document.querySelectorAll('[data-holiday-area-reset]').forEach(button => button.addEventListener('click', () => {
    apply('all', true);
    buttons[0].focus({preventScroll: true});
    picker.scrollIntoView({block: 'start'});
  }));
  function restore() { apply(new URL(location.href).searchParams.get('area') || 'all', false); }
  addEventListener('popstate', restore);
  addEventListener('pageshow', restore);
  restore();
  picker.hidden = false;
  if (location.hash === '#choose-area') picker.scrollIntoView({block: 'start'});
})();
