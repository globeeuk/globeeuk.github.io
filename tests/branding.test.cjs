const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = ['index.html','plans.html','halloween.html','ice-cream.html','classes.html',
  'bristol/classes/index.html','nottingham/classes/index.html','exeter/index.html',
  'exeter/this-weekend/index.html','exeter/free-things-to-do/index.html','exeter/rainy-day/index.html',
  'exeter/christmas-trees/index.html','bristol/index.html','bristol/this-weekend/index.html','bristol/edit/index.html'];
const read = file => fs.readFileSync(path.join(root,file),'utf8');
test('All public wordmarks share the approved child-inspired artwork and sizing', () => {
  assert(fs.statSync(path.join(root,'assets/brand/globee-handwriting-v2.png')).size > 0);
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /class="brand-art"><img src="\/assets\/brand\/globee-handwriting-v2\.png" alt="Globee" width="1774" height="887">/, page);
    assert.match(html, /href="\/brand\.css\?v=child1"/,page);
    assert.doesNotMatch(html, /class="brand-mark"|Glo<span/,page);
  }
});
test('Small-page icons and the SEO generation template cannot restore the old G badge', () => {
  for(const file of [...pages,'privacy.html','image-credits.html','seo/build.py']) {
    assert.match(read(file), /href="\/favicon\.svg\?v=child1"/,file);
  }
  assert.match(read('seo/build.py'), /globee-handwriting-v2\.png/);
  assert.doesNotMatch(read('seo/build.py'), /class="brand-mark"/);
  assert.doesNotMatch(read('favicon.svg'), /<text[^>]*>G<\/text>/);
});
test('Brand update preserves the homepage slogan, mobile sizing and verification tag', () => {
  assert.match(read('index.html'), /Little plans\. Lovely days\./);
  assert.match(read('index.html'), /google-site-verification/);
  assert.match(read('brand.css'), /@media\(max-width:700px\)/);
  assert.match(read('brand.css'), /\.brand-art\{width:138px\}/);
  assert.match(read('brand.css'), /\.footer-brand \.brand-art\{width:130px\}/);
});
