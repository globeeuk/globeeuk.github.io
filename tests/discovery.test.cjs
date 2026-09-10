const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const model=require('../discovery-model.js'),images=require('../image-catalog.js'),db=require('../db-adapter.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['db-snapshot.js','editorial.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const items=db.normalise(ctx.window.GLOBEE_SNAPSHOT.master,ctx.window.GLOBEE_SNAPSHOT.events,ctx.window.GLOBEE_EDITORIAL);
const current=items.filter(p=>p.datePeriods?.length?p.datePeriods.some(d=>d.end>='2026-09-10'):!p.endDate||p.endDate>='2026-09-10');
test('Weekend moves forward on Monday, includes remaining Sunday, and crosses year boundaries',()=>{
 assert.deepEqual(model.weekendRange('2026-09-10'),{start:'2026-09-12',end:'2026-09-13'});
 assert.deepEqual(model.weekendRange('2026-09-13'),{start:'2026-09-13',end:'2026-09-13'});
 assert.deepEqual(model.weekendRange('2026-09-14'),{start:'2026-09-19',end:'2026-09-20'});
 assert.deepEqual(model.weekendRange('2027-12-31'),{start:'2028-01-01',end:'2028-01-02'});
});
test('Actual weekend picks use confirmed dates, stay in-region and do not pad a small selection',()=>{
 const devon=model.weekendPicks(current.filter(p=>p.region==='Exeter'),'2026-09-10');
 assert.equal(devon.length,5);assert(devon.some(p=>p.name.includes('Shanty')));assert(!devon.some(p=>p.name.includes('Halloween')));
 const notts=model.weekendPicks(current.filter(p=>p.region==='Nottingham'),'2026-09-10');assert.equal(notts.length,1);assert(notts[0].name.includes('Trial'));
 const p={id:'repeat',name:'Recurring',datePeriods:[{start:'2026-09-12',end:'2026-09-12'},{start:'2026-09-13',end:'2026-09-13'}]};
 assert.equal(model.weekendPicks([p,p,{id:'tbc',name:'TBC'}],'2026-09-10').length,1);
 assert.deepEqual(model.weekendPicks([p],'2026-09-14'),[]);
});
test('Twelve-card batches reach every actual record exactly once with a partial final batch',()=>{
 for(const region of ['Exeter','Nottingham']){const all=current.filter(p=>p.region===region),shown=[];let chunk;
 while((chunk=model.nextBatch(all,shown.length)).length){assert(chunk.length<=12);shown.push(...chunk);}
 assert.equal(shown.length,all.length);assert.equal(new Set(shown.map(p=>p.id)).size,all.length);assert.deepEqual(model.nextBatch(all,shown.length),[]);}
});
test('Every current card has a small local asset and honest image metadata',()=>{
 for(const p of current.map(images.decorate)){
 assert.match(p.image,/^assets\/images\/[a-z]+\.webp$/);const asset=path.join(__dirname,'..',p.image);assert(fs.statSync(asset).size<80000,p.name);
 assert(p.imageAlt);if(p.imageKind==='illustration'){assert(p.imageReference.includes('AI-generated'));assert.equal(p.photoSource,'');}else{assert.match(p.photoSource,/^https:\/\/commons.wikimedia.org/);assert(p.photoLicence.startsWith('CC BY'));assert.match(p.photoLicenceUrl,/^https:\/\/creativecommons.org/);}
 }
 // A place sharing a word with a venue must not inherit another region's photo.
 assert.equal(images.decorate({name:'RAMM workshop',region:'Nottingham',type:'art'}).imageKind,'illustration');
});
test('Map selection considers all located records, prefers existing recommendations and stays stable',()=>{
 const all=Array.from({length:24},(_,i)=>({id:String(i),coords:[50.7+i/1000,-3.5],collections:i>=20?['best']:[]}));
 assert.equal(model.initialMapSelection(all,null,()=>0),'20');
 assert.equal(model.initialMapSelection(all,null,()=>.99),'23');
 assert.equal(model.initialMapSelection(all,'8',()=>0),'8');
 assert.equal(model.initialMapSelection(all.slice(0,3),null,()=>.99),'2');
 assert.equal(model.initialMapSelection([{id:'online'}],null),null);
 assert(!model.hasMapLocation({coords:[NaN,-3]}));assert(!model.hasMapLocation({coords:[50,190]}));
});
test('Map groups keep every matching record, split on zoom and retain shared-venue activities',()=>{
 const all=[{id:'a',coords:[50,-3]},{id:'b',coords:[50,-3]},{id:'c',coords:[50.001,-3.001]},{id:'d',coords:[51,-4]}];
 const low=p=>({x:p.id==='d'?300:10,y:10}),high=p=>({x:p.id==='c'?100:p.id==='d'?300:10,y:10});
 const a=model.mapGroups(all,low);assert.equal(a.length,2);assert.equal(a.flatMap(g=>g.places).length,4);
 const b=model.mapGroups(all,high);assert.equal(b.length,3);assert.equal(b[0].places.length,2);
 assert.equal(model.mapGroups(all,low,0).length,3);
});
test('New map locations match named UK venues; multi-venue and online records remain unlocated',()=>{
 const map=current.filter(model.hasMapLocation);
 assert.equal(map.filter(p=>p.region==='Exeter').length,25);assert.equal(map.filter(p=>p.region==='Nottingham').length,14);
 for(const name of ['Chessed.me (Online Chess)','Sporty Stars Holiday Camps','Heritage Open Days - Exeter','Nottingham City Gymnastics'])assert.equal(current.find(p=>p.name===name).coords,null);
 const library=current.find(p=>p.name==='Exeter Library');assert(library.coords[0]>50&&library.coords[0]<51);assert(library.coords[1]>-4&&library.coords[1]<-3);
});
