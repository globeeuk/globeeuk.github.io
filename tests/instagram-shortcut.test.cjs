const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
test('Homepage has only a plain Instagram account shortcut, not the founder video/card', () => {
  const html = read('index.html');
  const links = html.match(/<a class="instagram-shortcut"[^>]+>/g);
  assert.equal(links.length, 1);
  assert.match(links[0], /href="https:\/\/www.instagram.com\/globee.uk\/"/);
  assert.match(links[0], /target="_blank" rel="noopener noreferrer"/);
  assert.match(links[0], /data-social-platform="instagram"/);
  assert.match(html, /id="winter-map-link"/);
  assert.doesNotMatch(html, /<video|<iframe|founder-story|founder-film|Dejg0QpNW9s|Watch the film|Still curious/i);
  assert.match(read('instagram-shortcut.css'), /\.map-mode \.home-secondary-links\{display:none\}/);
});
test('No publicly served founder film or image assets remain; private film is not a website dependency', () => {
  for (const file of ['assets/founder-story/still-curious-76s.mp4', 'assets/founder-story/family.webp', 'assets/founder-story/title.webp', 'founder-story.js', 'founder-story.css']) assert.equal(fs.existsSync(path.join(__dirname, '..', file)), false, file);
});
