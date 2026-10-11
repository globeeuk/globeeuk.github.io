const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('exeter/christmas-trees/index.html');
test('Tree buying guide has four sourced retailers and matching indexable metadata', () => {
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.dateModified, '2026-10-11');
  assert.equal(data.mainEntity.numberOfItems, 4);
  assert.equal(data.mainEntity.itemListElement.length, 4);
  assert.match(html, /name="robots" content="index,follow"/);
  assert.match(read('sitemap.xml'), /<loc>https:\/\/globeeuk.github.io\/exeter\/christmas-trees\/<\/loc>\s*<lastmod>2026-10-11<\/lastmod>/);
  const source = JSON.parse(read('qa/christmas-tree-buying-sources.json'));
  for (const row of source.sources) {
    assert.match(html, new RegExp('id="' + row.id + '"'));
    for (const url of row.urls) assert.ok(html.includes('href="' + url + '"'), url);
  }
});
test('Prices retain sizes, tree distinctions and season caveats', () => {
  assert.match(html, /£38 standard \/ £55 premium/);
  assert.match(html, /Norway 2–3ft: <strong>£24.50/);
  assert.match(html, /Minimum 5ft: <strong>fir £46 \/ spruce £30/);
  assert.match(html, /minimum heights, not 5–6ft bands/);
  const greendale = html.match(/<article class="activity" id="greendale">([\s\S]*?)<\/article>/)[1];
  assert.match(greendale, /from £23/); assert.match(greendale, /from £35/);
  assert.match(greendale, /2026 collection dates TBC/);
  assert.match(greendale, /Confirm 2026 availability, prices/);
  assert.match(html, /price table does not state its season year/);
  assert.match(html, /not confirmed tree-rental services/);
  assert.match(html, /not mean pot-grown or guarantee survival/);
});
