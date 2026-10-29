const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Both course catalogues request the clearer card-boundary stylesheet',()=>{
 for(const file of ['classes.html','bristol/classes/index.html']){
  assert.match(read(file),/\/classes-costs\.css\?v=20261029-2/);
  assert.equal((read(file).match(/data-course-id=/g)||[]).length,20);
 }
});
test('Card surfaces have a distinct canvas, full outline and visible spacing',()=>{
 const css=read('classes-costs.css');
 assert.match(css,/\.notebook-page\.class-cost-catalogue\{background:#f3f2ed\}/);
 assert.match(css,/border:2px solid #a7b39f/);assert.match(css,/background:#fff;box-shadow:/);
 assert.match(css,/gap:28px/);assert.match(css,/grid-template-columns:1fr;gap:24px/);
});
