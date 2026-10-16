const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('Approved A uses accessible live copy, not a square poster setting the card height', () => {
  const home = read('index.html');
  const entry = home.match(/<a class="entry-card entry-card-tree"[\s\S]*?<\/a>/)[0];
  assert.match(entry, /<h2>The Christmas<br>Tree Edit<\/h2>/);
  assert.match(entry, /class="tree-art"/);
  assert.match(entry, /christmas-tree-characters\.png/);
  assert.doesNotMatch(entry, /tree-desktop-art|christmas-tree-edit\.jpg/);
  assert.match(home, /ice-cream\.css\?v=compact-entry-a3/);
});

test('A keeps a low desktop row and a full-width tree banner above two mobile cards', () => {
  const css = read('ice-cream.css');
  assert.match(css, /\.entry-cards-winter\{grid-template-columns:minmax\(0,1\.35fr\) repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.entry-cards \.entry-card\{min-height:140px/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /\.entry-cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-column:1\/-1;min-height:112px/);
  assert.match(css, /\.entry-cards \.entry-card-tree p,\.tree-region\{display:none\}/);
  assert.match(read('app.js'), /treeEntry\.hidden=!isTreeRegion/);
  assert.match(read('app.js'), /if\(scoopPromo\)scoopPromo\.hidden=isTreeRegion/);
});
