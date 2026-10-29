const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const migration=JSON.parse(read('qa/classes-main-migration-2026-10-29.json'));
test('The user-approved price-first course cards belong in Classes, not Parent notes',()=>{
 for(const region of migration.regions){
  const html=read(region.file);
  assert.match(html,/class-cost-catalogue/);assert.match(html,/data-notebook-section="classes" aria-current="page"/);
  assert.equal((html.match(/data-course-id=/g)||[]).length,20);
  for(const id of region.courseIds)assert.equal((html.match(new RegExp('\\sid="'+id+'"','g'))||[]).length,1,id);
  assert.match(html,/class="payment quick-cost"/);assert.match(html,/First bill ≠ monthly fee/);
  assert.match(html,/class="source-details"/);assert.match(html,/"@type":"CollectionPage"/);
  assert.doesNotMatch(html,/class="class-note-link"|"@type":"BlogPosting"|href="\/parent-notes\/(exeter|bristol)-childrens-classes-costs\//);
 }
});
test('All old directory entries and unknowns survive without pretending the layout is a new verification',()=>{
 for(const region of migration.regions){
  const html=read(region.file);
  assert.equal(region.originalDirectoryEntries,region.originalNames.length);
  assert.deepEqual(region.allDirectoryEntries.slice().sort(),region.originalNames.slice().sort());
  assert.equal(region.options,region.city==='Exeter'?35:37);
  assert.match(html,/not a fresh price or availability check/);
  assert.match(html,/Checked 2026-10-21/);
  assert.match(html,/data-analytics-toggle/);
 }
 assert.equal(migration.facts_reverified,false);
});
test('Old article URLs move to existing class routes, preserving deep-link anchors',()=>{
 const sitemap=read('sitemap.xml');
 for(const [region,target]of [['exeter','/classes.html'],['bristol','/bristol/classes/']]){
  const old=read(`parent-notes/${region}-childrens-classes-costs/index.html`);
  assert(old.includes('rel="canonical" href="https://globeeuk.github.io'+target+'"'));
  assert(old.includes('content="0;url='+target+'"'));
  assert.match(old,/location\.replace\([^;]+\+location\.hash\)/);
  assert.doesNotMatch(old,/BlogPosting|data-course-id/);
  assert(!sitemap.includes(`/parent-notes/${region}-childrens-classes-costs/`));
 }
 assert.match(sitemap,/https:\/\/globeeuk.github.io\/classes.html/);
 assert.match(sitemap,/https:\/\/globeeuk.github.io\/bristol\/classes\//);
});
