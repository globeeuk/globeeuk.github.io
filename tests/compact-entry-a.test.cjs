const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('Christmas switch uses one compact banner with the family handprint photograph', () => {
  const home = read('index.html');
  const entry = home.match(/<a class="entry-card entry-card-christmas"[\s\S]*?<\/a>/)[0];
  assert.match(entry, /<h2>The Christmas<br>Edit<\/h2>/);
  assert.match(entry, /Trees · Festive days out · Shows/);
  assert.match(entry, /child-handprint-christmas-tree-2026\.jpg/);
  assert.doesNotMatch(home, /id="christmas-tree-entry"/);
  assert.match(home, /ice-cream\.css\?v=christmas-switch1/);
});

test('Christmas banner keeps the low desktop row and a full-width mobile card', () => {
  const css = read('ice-cream.css');
  assert.match(css, /\.entry-cards-winter\{grid-template-columns:minmax\(0,1\.35fr\) repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.entry-cards \.entry-card\{min-height:140px/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /\.entry-cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.entry-cards \.entry-card-christmas\{grid-column:1\/-1;min-height:112px/);
  assert.match(read('app.js'), /christmasEntry\.hidden=!christmasActive/);
  assert.match(read('app.js'), /scoopPromo\.hidden=halfTermActive\|\|christmasActive/);
});
