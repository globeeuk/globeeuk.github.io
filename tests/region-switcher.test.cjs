const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('The region button explains its action and retains the existing dialog',()=>{
 const html=read('index.html');
 assert.match(html,/class="region-switch-label">Change area<\/span>/);
 assert.match(html,/aria-haspopup="dialog" aria-controls="filter-dialog"/);
 assert.match(html,/id="region-label">Exeter · Devon/);
 assert.match(read('notebook.js'),/Change area\. Current area:/);
});
test('All notebook pages load the visible-region controls and preserve native class selection',()=>{
 for(const f of ['index.html','classes.html','bristol/classes/index.html','nottingham/classes/index.html']){
  assert.match(read(f),/notebook\.css\?v=notebook1-region1/);assert.match(read(f),/notebook\.js\?v=notebook1-region1/);
 }
 const script=read('notebook.js');assert.match(script,/wrapper\.append\(caption,classRegion,arrow\)/);
 assert.match(script,/window\.location\.href=url\('classes',event\.currentTarget\.value\)/);
 assert.match(read('notebook.css'),/min-height:62px/);assert.match(read('notebook.css'),/min-height:60px/);
});
test('The fixed Exeter article offers real regional navigation, not a false local article filter',()=>{
 const html=read('parent-notes/exeter-birthday-parties/index.html');
 assert.match(html,/<details class="bp-region-switch">/);assert.match(html,/This note covers Exeter &amp; Devon/);
 for(const region of ['Devon','Bristol','Nottingham'])assert(html.includes(`href="/?region=${region}"`));
 assert.match(read('parent-notes/birthday.js'),/event\.key==='Escape'/);
 assert.doesNotMatch(read('notebook.js')+read('parent-notes/birthday.js'),/localStorage|document\.cookie|gtag|sendBeacon|fetch\(/);
});
