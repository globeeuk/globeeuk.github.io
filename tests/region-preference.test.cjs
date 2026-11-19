const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'region-preference.js'), 'utf8');

function boot({ values = new Map(), search = '', pathname = '/', readBlocked = false, writeBlocked = false } = {}) {
  const classes = new Set();
  const message = { hidden: true };
  const storage = {
    getItem(key) {
      if (readBlocked) throw new Error('Storage unavailable');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (writeBlocked) throw new Error('Storage unavailable');
      values.set(key, value);
    }
  };
  const context = {
    URLSearchParams,
    window: { location: { search, pathname }, localStorage: storage },
    document: {
      documentElement: { classList: { add: name => classes.add(name) } },
      getElementById: id => id === 'region-save-message' ? message : null,
      addEventListener() {}
    }
  };
  vm.runInNewContext(source, context);
  return { preference: context.window.GlobeeRegionPreference, values, classes, message };
}

test('A fresh home visit asks for an area before exposing a regional default', () => {
  const { preference, classes } = boot();
  assert.equal(preference.needsChoice, true);
  assert.equal(classes.has('region-choice-pending'), true);
});

test('Every selected area becomes the default on a new home visit', () => {
  for (const region of ['Exeter', 'Bristol', 'Nottingham']) {
    const { preference, values } = boot();
    assert.equal(preference.remember(region), true);
    const revisit = boot({ values }).preference;
    assert.equal(revisit.initialRegion, region);
    assert.equal(revisit.needsChoice, false);
  }
});

test('The most recent manual area selection replaces an older preference', () => {
  const { preference, values } = boot();
  preference.remember('Bristol');
  preference.remember('Nottingham');
  assert.equal(boot({ values }).preference.initialRegion, 'Nottingham');
});

test('A shared region URL opens its named area and keeps the chosen default for future visits', () => {
  const values = new Map([['globee:region:v1', 'Bristol']]);
  const shared = boot({ values, search: '?region=Devon' }).preference;
  assert.equal(shared.initialRegion, 'Exeter');
  assert.equal(shared.needsChoice, false);
  assert.equal(boot({ values }).preference.initialRegion, 'Bristol');
});

test('Invalid saved or requested areas return to the picker and are never persisted', () => {
  const values = new Map([['globee:region:v1', 'London']]);
  const { preference } = boot({ values, search: '?region=unknown' });
  assert.equal(preference.needsChoice, true);
  assert.equal(preference.remember('__proto__'), false);
  assert.equal(values.get('globee:region:v1'), 'London');
});

test('Clearing the saved preference restores the first-visit choice', () => {
  const { preference, values } = boot();
  preference.remember('Bristol');
  values.clear();
  assert.equal(boot({ values }).preference.needsChoice, true);
});

test('Blocked storage allows a current selection and shows the save limitation', () => {
  const { preference, message } = boot({ readBlocked: true, writeBlocked: true });
  assert.equal(preference.needsChoice, true);
  assert.equal(preference.remember('Bristol'), false);
  assert.equal(preference.initialRegion, 'Bristol');
  assert.equal(preference.needsChoice, false);
  assert.equal(message.hidden, false);
});

test('The first-visit picker belongs to the generic home entry', () => {
  assert.equal(boot({ pathname: '/index.html' }).preference.needsChoice, true);
  assert.equal(boot({ pathname: '/plans.html' }).preference.needsChoice, false);
  assert.equal(boot({ pathname: '/bristol/classes/' }).preference.needsChoice, false);
});
