(function (root) {
  'use strict';
  const regionLabels = {Exeter: 'Exeter & Devon', Bristol: 'Bristol', Nottingham: 'Nottingham'};
  const postcodeRegions = {EX: 'Exeter', TQ: 'Exeter', PL: 'Exeter', BS: 'Bristol', NG: 'Nottingham'};

  function distanceMiles(from, to) {
    if (!Array.isArray(to) || to.length !== 2 ||
        !to.every(Number.isFinite) || Math.abs(to[0]) > 90 || Math.abs(to[1]) > 180) return Infinity;
    const radians = Math.PI / 180;
    const latitude = Math.sin((to[0] - from[0]) * radians / 2);
    const longitude = Math.sin((to[1] - from[1]) * radians / 2);
    const a = latitude ** 2 + Math.cos(from[0] * radians) * Math.cos(to[0] * radians) * longitude ** 2;
    return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }

  function mount(container, select, clear, dataset) {
    const panel = container.querySelector('#nearby-panel');
    const toggle = container.querySelector('#nearby-toggle');
    const choice = container.querySelector('#nearby-town');
    const input = container.querySelector('#nearby-postcode');
    const message = container.querySelector('#nearby-message');
    const device = container.querySelector('#nearby-device');
    const clearButton = container.querySelector('#nearby-clear');
    const distance = container.querySelector('#nearby-distance');
    const originLabel = container.querySelector('#nearby-origin-label');
    let request = 0;
    let lastOrigin = null;

    for (const [region, towns] of Object.entries(dataset.towns)) {
      const group = document.createElement('optgroup');
      group.label = regionLabels[region];
      for (const town of Object.keys(towns)) group.append(new Option(town, region + '|' + town));
      choice.append(group);
    }

    function openPanel(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    }

    function finish(origin) {
      request++;
      input.value = '';
      choice.value = '';
      message.textContent = '';
      device.disabled = false;
      openPanel(false);
      select(origin);
    }

    toggle.addEventListener('click', () => openPanel(panel.hidden));
    container.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const code = input.value.trim().toUpperCase();
      if (!/^[A-Z]{1,2}\d[A-Z\d]?$/.test(code)) {
        message.textContent = 'Use the first part only, for example EX3.';
        input.focus();
        return;
      }
      const coords = dataset.districts[code];
      if (!coords) {
        message.textContent = 'This postcode district is outside our lookup. Choose a town instead.';
        input.focus();
        return;
      }
      finish({region: postcodeRegions[code.match(/^[A-Z]+/)[0]], label: code, coords});
    });

    choice.addEventListener('change', () => {
      if (!choice.value) return;
      const [region, label] = choice.value.split('|');
      finish({region, label, coords: dataset.towns[region][label]});
    });

    if (!root.navigator?.geolocation) device.hidden = true;
    device.addEventListener('click', () => {
      const id = ++request;
      device.disabled = true;
      message.textContent = 'Finding your location…';
      root.navigator.geolocation.getCurrentPosition(result => {
        if (id !== request) return;
        const coords = [result.coords.latitude, result.coords.longitude];
        let best = 35, nearestRegion = null;
        for (const [region, towns] of Object.entries(dataset.towns)) {
          for (const town of Object.values(towns)) {
            const miles = distanceMiles(coords, town);
            if (miles < best) {
              best = miles;
              nearestRegion = region;
            }
          }
        }
        if (nearestRegion) finish({region: nearestRegion, label: 'your location', coords});
        else {
          device.disabled = false;
          message.textContent = 'Choose a town in one of the areas we cover.';
        }
      }, () => {
        if (id !== request) return;
        device.disabled = false;
        message.textContent = 'Location is unavailable. Use a town or the first part of a postcode.';
      }, {enableHighAccuracy: false, timeout: 8000, maximumAge: 0});
    });
    clearButton.addEventListener('click', clear);

    return {
      sync(origin, miles, visible) {
        container.hidden = !visible;
        distance.hidden = !origin;
        clearButton.hidden = !origin;
        if (!visible || lastOrigin && !origin) {
          request++;
          device.disabled = false;
          message.textContent = '';
        }
        lastOrigin = origin;
        if (!origin) {
          originLabel.textContent = 'Choose a town or postcode';
        } else {
          originLabel.textContent = origin.label === 'your location' ? 'Using your location' : origin.label;
        }
        for (const button of distance.querySelectorAll('button')) {
          button.setAttribute('aria-pressed', String(Number(button.dataset.nearbyMiles) === miles));
        }
      }
    };
  }

  const api = {distanceMiles, mount};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GlobeeNearby = api;
})(typeof window !== 'undefined' ? window : globalThis);
