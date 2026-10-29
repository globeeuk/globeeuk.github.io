const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('The approved four notebook sections are available in every regional class page',()=>{
 for(const file of ['index.html','classes.html','bristol/classes/index.html','nottingham/classes/index.html']){
  const html=read(file),nav=html.match(/<nav class="notebook-index"[\s\S]*?<\/nav>/)[0];
  for(const section of ['days','classes','holidays','notes'])assert(nav.includes(`data-notebook-section="${section}"`),file+' '+section);
  assert.match(html,/notebook\.css\?v=notebook1/);assert.match(html,/notebook\.js\?v=notebook1/);
 }
});
test('Parent notes links to the approved birthday research, without an AI banner',()=>{
 const html=read('index.html');
 assert.match(html,/id="parent-notes-pending" hidden/);
 assert.match(html,/href="\/parent-notes\/exeter-birthday-parties\/"/);
 assert.match(html,/Research notes from Yewon’s own planning stage/);
 assert.doesNotMatch(html,/party-preview|The first notes will appear here when they’re ready/);
});
test('Notebook lists use automatic batches with an all-items fallback and only holiday club records',()=>{
 const app=read('app.js');
 assert.match(app,/state\.notebookSection==='holidays'&&p\.kind!=='club'/);
 assert.match(app,/remaining&&!isNotebookHome/);
 assert.match(app,/isNotebookHome&&!\('IntersectionObserver' in window\)\)visibleCount=places\.length/);
 assert.match(app,/window\.GlobeeNotebook\?\.sync\(state\)/);
});
test('The shared class presentation retains all existing entries and combines search with interests',()=>{
 for(const [file,count] of [['classes.html',35],['bristol/classes/index.html',37],['nottingham/classes/index.html',18]])assert.equal((read(file).match(/<article class="card(?: quick-card)?"/g)||[]).length,count,file);
 const script=read('notebook.js');assert.match(script,/words\.every\(word=>text\.includes\(word\)\)/);assert.match(script,/filter!=='all'&&card\.dataset\.category!==filter/);
 assert.doesNotMatch(script,/localStorage|document\.cookie|gtag|google-analytics|fetch\(/);
});
