(function (root) {
  'use strict';
  const regions = {england: 'England', devon: 'Devon', cornwall: 'Cornwall'};
  const heights = {england: 640, devon: 560, cornwall: 530};

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function mount(container) {
    const data = root.GlobeeChristmasMarketData;
    if (!container || !data || container.dataset.ready) return;
    container.dataset.ready = 'true';
    const paper = container.dataset.marketMapVariant === 'paper';
    let selectedRegion = 'devon';
    let selectedTown = 'Exeter';
    if (!paper) {
      const label = element('p', 'THE GLOBEE CHRISTMAS EDIT · 2026', 'market-map-kicker');
      const heading = element('h3', 'Christmas Markets Map');
      heading.id = 'christmas-map-title';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-labelledby', heading.id);
      container.append(label, heading);
    }

    const nav = element('div', '', 'market-map-controls');
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Map area');
    const warning = element('p', 'The map image couldn’t load. Choose an area to try again, or browse the dates below.', 'market-map-status');
    warning.setAttribute('role', 'status');
    warning.hidden = true;
    const panel = element('div', '', 'market-map-layout');
    const canvas = element('div', '', 'market-map-canvas');
    const mapSurface = paper ? element('div', '', 'market-map-frame') : canvas;
    if (paper) {
      const logo = element('img', '', 'market-map-logo');
      logo.src = '/assets/brand/globee-handwriting-v2.png';
      logo.alt = 'Globee';
      logo.width = 1774;
      logo.height = 887;
      logo.decoding = 'async';
      mapSurface.append(canvas, logo);
    }
    const aside = element('div', '', 'market-map-side');
    const info = element('div', '', 'market-map-info');
    info.setAttribute('aria-live', 'polite');
    const all = element('details', '', 'market-map-index');
    const allTitle = element('summary');
    const index = element('ul');
    all.append(allTitle, index);
    aside.append(info, all);
    panel.append(mapSurface, aside);

    const foot = element('p', 'Pins show market towns or local areas. Check the organiser for the venue and opening hours. ', 'market-map-credit');
    const attribution = element('a', 'Boundary data and licence');
    attribution.href = 'https://www.data.gov.uk/dataset/e4bc1e1b-72b1-4559-b270-b34a9740a990/counties-and-unitary-authorities-december-2024-boundaries-uk-bgc';
    foot.append(attribution, ' · Contains OS and National Statistics data © Crown copyright and database right 2024 (OGL v3.0).');
    container.querySelector('[data-market-map-placeholder]')?.remove();
    container.append(nav, warning, panel, foot);

    function showTown(name, focusDetails = false) {
      selectedTown = name;
      const towns = data[selectedRegion];
      const townIndex = towns.findIndex(town => town.town === name);
      const town = towns[townIndex];
      if (!town) return;
      for (const button of panel.querySelectorAll('[data-market-town]')) {
        button.setAttribute('aria-pressed', String(button.dataset.marketTown === name));
      }
      const placeHeading = element(paper ? 'h3' : 'h4', `${townIndex + 1}. ${town.town}`);
      info.replaceChildren(placeHeading);
      for (const market of town.events) {
        const article = element('article', '', 'market-map-event');
        const official = element('a', 'Official details →');
        official.href = market.url;
        article.append(element(paper ? 'h4' : 'h5', market.name), element('p', market.date, 'market-map-date'));
        if (market.note) article.append(element('p', market.note));
        article.append(official);
        info.append(article);
      }
      if (focusDetails) {
        placeHeading.tabIndex = -1;
        placeHeading.focus();
      }
    }

    function renderRegion(area, preserveTown = false) {
      selectedRegion = area;
      for (const control of nav.querySelectorAll('button')) {
        control.setAttribute('aria-pressed', String(control.dataset.marketRegion === area));
      }
      const outline = element('img', '', 'market-map-outline');
      const asset = paper ? 'home-christmas-markets' : 'christmas-markets';
      outline.alt = '';
      outline.width = 620;
      outline.height = heights[area];
      outline.addEventListener('error', () => {
        if (outline.parentElement !== canvas) return;
        mapSurface.hidden = true;
        warning.hidden = false;
        panel.classList.add('market-map-no-outline');
        all.open = true;
      });
      mapSurface.hidden = false;
      warning.hidden = true;
      panel.classList.remove('market-map-no-outline');
      canvas.replaceChildren(outline);
      outline.src = `/assets/maps/${asset}-${area}.svg`;
      index.replaceChildren();
      all.open = false;
      const towns = data[area];
      const count = towns.reduce((total, town) => total + town.events.length, 0);
      allTitle.textContent = `Browse all ${count} market dates`;
      for (const [i, town] of towns.entries()) {
        const pin = element('button', String(i + 1), 'market-map-pin');
        pin.type = 'button';
        pin.dataset.marketTown = town.town;
        pin.setAttribute('aria-label', `${i + 1}. ${town.town}`);
        pin.style.left = `${town.x}%`;
        pin.style.top = `${town.y}%`;
        pin.addEventListener('click', () => showTown(town.town));
        canvas.append(pin);

        const row = element('li');
        const townButton = element('button', `${i + 1}. ${town.town}`);
        townButton.type = 'button';
        townButton.dataset.marketTown = town.town;
        townButton.addEventListener('click', () => showTown(town.town, true));
        row.append(townButton, element('span', town.events.map(market => market.date).join(' · ')));
        index.append(row);
      }
      const preferredTown = preserveTown && towns.some(town => town.town === selectedTown) ? selectedTown : null;
      showTown(preferredTown || (area === 'devon' ? 'Exeter' : towns[0].town));
    }

    for (const [area, name] of Object.entries(regions)) {
      const control = element('button', name);
      control.type = 'button';
      control.dataset.marketRegion = area;
      control.addEventListener('click', () => renderRegion(area));
      nav.append(control);
    }
    renderRegion(selectedRegion, true);
  }

  root.GlobeeChristmasMarketMap = {mount};
  for (const container of document.querySelectorAll('[data-christmas-market-map]:not([hidden])')) mount(container);
})(window);
