const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('Christmas switch uses one illustrated banner for the seasonal edit', () => {
  const home = read('index.html');
  const entry = home.match(/<a class="entry-card entry-card-christmas"[\s\S]*?<\/a>/)[0];
  assert.match(entry, /<h2>The Christmas Edit<\/h2>/);
  assert.match(entry, /Markets · Trees · Days out · Shows/);
  assert.match(entry, /christmas-banner-2026\.webp/);
  assert.match(entry, /plans\.html\?region=Devon&amp;edit=christmas/);
  assert.doesNotMatch(home, /id="year-end-entry"/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets/christmas-banner-2026.webp')));
  assert.doesNotMatch(home, /id="christmas-tree-entry"/);
  assert.match(home, /ice-cream\.css\?v=christmas-banner-20261104/);
});

test('Christmas banner keeps one full-width mobile card and the scheduled switch', () => {
  const css = read('ice-cream.css');
  assert.match(css, /\.entry-cards-winter\{grid-template-columns:minmax\(0,1\.35fr\) repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.entry-cards \.entry-card\{min-height:140px/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /\.entry-cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.entry-cards #christmas-entry\{grid-column:1\/-1;min-height:177px/);
  assert.match(read('app.js'), /christmasEntry\.hidden=!christmasActive/);
  assert.match(read('app.js'), /scoopPromo\.hidden=halfTermActive\|\|christmasActive/);
});
