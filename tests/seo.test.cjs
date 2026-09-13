const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('Halloween has an indexable dedicated page and sitemap entry',()=>{
  const html=fs.readFileSync(path.join(root,'halloween.html'),'utf8');
  assert.match(html,/<title>Halloween family events in Exeter &amp; Devon 2026 \| Globee<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/globeeuk\.github\.io\/halloween\.html"/);
  assert.match(html,/data-edit="halloween"/);
  assert.match(html,/og:image" content="https:\/\/globeeuk\.github\.io\/assets\/halloween-plans-2026\.jpg"/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(schema['@type'],'CollectionPage');assert.equal(schema.mainEntity.numberOfItems,5);
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.match(sitemap,/https:\/\/globeeuk\.github\.io\/halloween\.html/);
});
