const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const routes=['holiday-childcare-alternatives','classes-cost-comparison'];
test('Approved class and care notes are indexable static pages, not private research',()=>{
 for(const route of routes){const html=read('parent-notes/'+route+'/index.html');
  assert.match(html,/<meta name="robots" content="index,follow">/);assert(html.includes(`rel="canonical" href="https://globeeuk.github.io/parent-notes/${route}/"`));
  assert.match(html,/"@type":"BlogPosting"/);assert.match(html,/"@type":"BreadcrumbList"/);assert.match(html,/"datePublished":"2026-10-21"/);
  assert.doesNotMatch(html,/REVIEW DRAFT|noindex|operator-notes|Ohai|DOWTK|href="(?:exeter-classes|bristol-classes|comparison|holiday-care)\.html/);
  assert.match(html,/data-analytics-toggle/);assert.match(html,/src="\/basic-analytics\.js\?v=basic2"/);assert.match(html,/src="\/analytics\.js\?v=music-banner-click1"/);
  assert(read('sitemap.xml').includes('https://globeeuk.github.io/parent-notes/'+route+'/'));
 }
});
test('All forty course tracks remain visible without paging; full sources remain available',()=>{
 for(const [region,count] of [['exeter',20],['bristol',20]]){
  const html=read(region==='exeter'?'classes.html':'bristol/classes/index.html');
  assert.equal((html.match(/data-course-id=/g)||[]).length,count);
  assert.equal((html.match(/Checked 2026-10-21/g)||[]).length,count);
  assert.doesNotMatch(html,/<details[^>]* open|Show more/);
 }
 const ex=read('classes.html'),br=read('bristol/classes/index.html');
 for(const value of ['£23.20','£8 /','Fully booked','Not a free trial'])assert(ex.includes(value),value);
 assert.match(br,/£66/);assert.match(br,/joining fee/i);
 assert.equal((read('parent-notes/classes-cost-comparison/index.html').match(/<tr>/g)||[]).length,42);
 assert.match(read('parent-notes/holiday-childcare-alternatives/index.html'),/not independently verified/);
});
test('Class comparison cards are inline in the matching Classes tab, with corrected known prices retained',()=>{
 const ex=read('classes.html'),br=read('bristol/classes/index.html');
 assert.doesNotMatch(ex+br,/class="class-note-link"/);
 assert.match(ex,/id="exeter-18"/);assert.match(br,/id="bristol-20"/);
 const tots=ex.match(/<article[^>]+id="exeter-14"[\s\S]*?<\/article>/)?.[0];assert(tots);
 const currentPrice=tots.match(/<div class="payment quick-cost">[\s\S]*?<\/div>/)?.[0];assert(currentPrice);
 assert.match(currentPrice,/£8 \/ session/);assert.doesNotMatch(currentPrice,/£6\.60/);
 assert.doesNotMatch(ex,/£50–£75|beginner places currently full/i);
 assert.match(ex,/£23\.20/);
});
test('Parent notes entries remain compact and are filtered by current region',()=>{
 const html=read('index.html'),js=read('notebook.js');
 assert.match(html,/data-notes-region="Exeter"/);assert.match(html,/data-notes-region="Exeter Bristol"/);
 assert.doesNotMatch(html,/href="\/parent-notes\/(?:exeter|bristol)-childrens-classes-costs\/"/);
 assert.match(html,/data-notes-empty hidden/);assert.match(html,/href="\/parent-notes\/exeter-birthday-parties\/"/);
 assert.match(js,/card\.dataset\.notesRegion\.split\(' '\)\.includes\(localRegion\)/);
 assert.doesNotMatch(read('parent-notes/class-notes.js'),/fetch\(|gtag|localStorage|document\.cookie/);
});
