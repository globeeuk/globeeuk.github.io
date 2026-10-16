const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
test('Homepage has only a plain Instagram account shortcut, not the founder video/card', () => {
  const html = read('index.html');
  const links = html.match(/<a class="instagram-shortcut home-shortcut"[^>]+>/g);
  assert.equal(links.length, 1);
  assert.match(links[0], /href="https:\/\/www.instagram.com\/globee.uk\/"/);
  assert.match(links[0], /target="_blank" rel="noopener noreferrer"/);
  assert.match(links[0], /data-social-platform="instagram"/);
  assert.match(html, /id="winter-map-link"/);
  assert.doesNotMatch(html, /<video|<iframe|founder-story|founder-film|Dejg0QpNW9s|Watch the film|Still curious/i);
  assert.match(read('instagram-shortcut.css'), /\.map-mode \.home-secondary-links\{display:none\}/);
});
test('Map and Instagram share one compact button style without changing their destinations', () => {
  const html = read('index.html'), css = read('instagram-shortcut.css');
  assert.equal((html.match(/class="(?:instagram-shortcut )?home-shortcut"/g) || []).length, 2);
  assert.match(html, /class="home-shortcut" href="ice-cream.html\?from=Devon"/);
  assert.match(html, /<span>Ice cream map<\/span>/);
  assert.doesNotMatch(html, /Still here: the ice cream map/);
  assert.match(css, /\.home-secondary-links \.home-shortcut\{[^}]*min-height:44px/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.home-secondary-links:has\(\.winter-map-link\[hidden\]\)\{grid-template-columns:1fr\}/);
  assert.match(css, /\.home-shortcut svg\{width:16px;height:16px\}/);
  assert.match(html, /instagram-shortcut.css\?v=2/);
});
test('No publicly served founder film or image assets remain; private film is not a website dependency', () => {
  for (const file of ['assets/founder-story/still-curious-76s.mp4', 'assets/founder-story/family.webp', 'assets/founder-story/title.webp', 'founder-story.js', 'founder-story.css']) assert.equal(fs.existsSync(path.join(__dirname, '..', file)), false, file);
});
