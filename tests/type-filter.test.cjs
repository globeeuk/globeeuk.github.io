const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const declaration=app.match(/^const types=.*;$/m)[0];
const available=app.match(/^const availableTypes=.*;$/m)[0];
function options(isPlansPage){return vm.runInNewContext(`${declaration}\n${available}\nJSON.stringify(availableTypes)`,{isPlansPage});}
test('Cafés is removed from visible type choices without removing the other filters',()=>{
 assert.deepEqual(JSON.parse(options(false)).map(([id])=>id),['all','activity','theatre','market','ice','outdoors','fossil','art','club']);
 assert(!JSON.parse(options(true)).some(([id])=>id==='cafe'));
});
test('retiring the café filter leaves the legacy record adapter intact',()=>{
 const db=require('../db-adapter.js');
 const record={name:'Legacy cafe',tab:'dayout',type:'cafe',region:'Exeter',description:'Preserved place',location:'Exeter',url:'https://example.com/',price_type:'paid'};
 const events=[{name:'Legacy cafe',date:'',end:'',region:'Exeter',price:''}];
 const result=db.normalise([record],events,{});
 assert.equal(result.length,1);assert.equal(result[0].type,'cafe');
});
test('all app entry points request the updated filter script',()=>{
 for(const page of ['index.html','plans.html','halloween.html'])assert(fs.readFileSync(path.join(root,page),'utf8').includes('app.js?v=activity-filter1'),page);
});
