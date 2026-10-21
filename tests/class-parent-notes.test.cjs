const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const routes=['exeter-childrens-classes-costs','bristol-childrens-classes-costs','holiday-childcare-alternatives','classes-cost-comparison'];
test('Approved class and care notes are indexable static pages, not private research',()=>{
 for(const route of routes){const html=read('parent-notes/'+route+'/index.html');
  assert.match(html,/<meta name="robots" content="index,follow">/);assert(html.includes(`rel="canonical" href="https://globeeuk.github.io/parent-notes/${route}/"`));
  assert.match(html,/"@type":"BlogPosting"/);assert.match(html,/"@type":"BreadcrumbList"/);assert.match(html,/"datePublished":"2026-10-21"/);
  assert.doesNotMatch(html,/REVIEW DRAFT|noindex|operator-notes|Ohai|DOWTK|\.html#(?:exeter|bristol)-|href="(?:exeter-classes|bristol-classes|comparison|holiday-care)\.html/);
  assert.match(html,/data-analytics-toggle/);assert.match(html,/src="\/basic-analytics\.js\?v=basic2"/);assert.match(html,/src="\/analytics\.js\?v=music-banner-click1"/);
  assert(read('sitemap.xml').includes('https://globeeuk.github.io/parent-notes/'+route+'/'));
 }
});
test('All forty course tracks remain visible without paging; full sources remain available',()=>{
 for(const [region,count] of [['exeter',20],['bristol',20]]){
  const html=read(`parent-notes/${region}-childrens-classes-costs/index.html`);
  assert.equal((html.match(/class="course quick-card" id=/g)||[]).length,count);
  assert.equal((html.match(/class="source-details"/g)||[]).length,count);
  assert.doesNotMatch(html,/<details[^>]* open|Show more/);
 }
 const ex=read('parent-notes/exeter-childrens-classes-costs/index.html'),br=read('parent-notes/bristol-childrens-classes-costs/index.html');
 for(const value of ['£23.20','£8 /','Fully booked','Not a free trial'])assert(ex.includes(value),value);
 assert.match(br,/£66/);assert.match(br,/joining fee/i);
 assert.equal((read('parent-notes/classes-cost-comparison/index.html').match(/<tr>/g)||[]).length,42);
 assert.match(read('parent-notes/holiday-childcare-alternatives/index.html'),/not independently verified/);
});
test('Existing class cards link to exact regional notes, with old known prices corrected',()=>{
 const ex=read('classes.html'),br=read('bristol/classes/index.html');
 assert.equal((ex.match(/class="class-note-link"/g)||[]).length,13);assert.equal((br.match(/class="class-note-link"/g)||[]).length,10);
 assert.match(ex,/href="\/parent-notes\/exeter-childrens-classes-costs\/#exeter-18"/);
 assert.match(br,/href="\/parent-notes\/bristol-childrens-classes-costs\/#bristol-20"/);
 assert.doesNotMatch(ex,/£6\.60|£50–£75|beginner places currently full/i);
 assert.match(ex,/£23\.20/);
});
test('Parent notes entries remain compact and are filtered by current region',()=>{
 const html=read('index.html'),js=read('notebook.js');
 assert.match(html,/data-notes-region="Exeter"/);assert.match(html,/data-notes-region="Bristol"/);assert.match(html,/data-notes-region="Exeter Bristol"/);
 assert.match(html,/data-notes-empty hidden/);assert.match(html,/href="\/parent-notes\/exeter-birthday-parties\/"/);
 assert.match(js,/card\.dataset\.notesRegion\.split\(' '\)\.includes\(localRegion\)/);
 assert.doesNotMatch(read('parent-notes/class-notes.js'),/fetch\(|gtag|localStorage|document\.cookie/);
});
