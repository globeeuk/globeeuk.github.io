const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const model=require('../discovery-model.js'),images=require('../image-catalog.js'),db=require('../db-adapter.js');
const imageSources=JSON.parse(fs.readFileSync(path.join(__dirname,'..','qa','image-sources.json'),'utf8'));
const ctx={window:{}};vm.createContext(ctx);for(const f of ['db-snapshot.js','editorial.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const items=db.normalise(ctx.window.GLOBEE_SNAPSHOT.master,ctx.window.GLOBEE_SNAPSHOT.events,ctx.window.GLOBEE_EDITORIAL);
const current=items.filter(p=>p.datePeriods?.length?p.datePeriods.some(d=>d.end>='2026-09-13'):!p.endDate||p.endDate>='2026-09-13');
test('Weekend moves forward on Monday, includes remaining Sunday, and crosses year boundaries',()=>{
 assert.deepEqual(model.weekendRange('2026-09-10'),{start:'2026-09-12',end:'2026-09-13'});
 assert.deepEqual(model.weekendRange('2026-09-13'),{start:'2026-09-13',end:'2026-09-13'});
 assert.deepEqual(model.weekendRange('2026-09-14'),{start:'2026-09-19',end:'2026-09-20'});
 assert.deepEqual(model.weekendRange('2027-12-31'),{start:'2028-01-01',end:'2028-01-02'});
});
test('Actual weekend picks use confirmed dates, stay in-region and do not pad a small selection',()=>{
 const devon=model.weekendPicks(items.filter(p=>p.region==='Exeter'),'2026-09-10');
 assert.equal(devon.length,5);assert(devon.some(p=>p.name.includes('Shanty')));assert(!devon.some(p=>p.name.includes('Halloween')));
 const notts=model.weekendPicks(items.filter(p=>p.region==='Nottingham'),'2026-09-10');assert.equal(notts.length,1);assert(notts[0].name.includes('Trial'));
 const p={id:'repeat',name:'Recurring',datePeriods:[{start:'2026-09-12',end:'2026-09-12'},{start:'2026-09-13',end:'2026-09-13'}]};
 assert.equal(model.weekendPicks([p,p,{id:'tbc',name:'TBC'}],'2026-09-10').length,1);
 assert.deepEqual(model.weekendPicks([p],'2026-09-14'),[]);
});
test('Seasonal edits run through their end date, stay regional and never pad the shortlist',()=>{
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-09-12'),null);
 const devon=model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-09-13');
 assert.equal(devon.id,'halloween');assert.equal(devon.total,7);assert.equal(devon.picks.length,5);assert.deepEqual(devon.picks.map(p=>p.name),['Pennywell Pumpkin Festival','Pumpkin Trick or Treat Trail – The Donkey Sanctuary','Darts Farm Pumpkin Fest 2026','Halloween Spook-Fest – Crealy','Model a Monster – Exeter Phoenix']);
 const notts=model.seasonalEdit(current.filter(p=>p.region==='Nottingham'),'2026-09-13');
 assert.equal(notts.picks.length,4);assert(notts.picks.every(p=>p.region==='Nottingham'));
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Nottingham'),'2026-10-31').picks.length,2);
  const undated={id:'undated',name:'Halloween event',description:'Family Halloween activity'};
 assert.equal(model.seasonalEdit([undated],'2026-10-01'),null);
 const festive=i=>({id:String(i),name:`Christmas activity ${i}`,description:'Family Christmas event',datePeriods:[{start:'2026-12-01',end:'2026-12-24'}]});
 assert.equal(model.seasonalEdit([festive(1)],'2026-11-01').id,'christmas');
 assert.equal(model.seasonalEdit([festive(1)],'2026-12-25'),null);
});
test('Seasonal list keeps every matching event while the home edit stays at five cards',()=>{
 const halloween=Array.from({length:17},(_,i)=>({id:String(i),name:`Halloween plan ${String(i).padStart(2,'0')}`,description:'Pumpkin activity',datePeriods:[{start:'2026-10-01',end:'2026-10-31'}]}));
 const edit=model.seasonalEdit(halloween,'2026-09-13');
 assert.equal(edit.picks.length,5);assert.equal(edit.total,17);
 assert.equal(model.seasonalPlaces(halloween,'2026-09-13','halloween').length,17);
 assert(model.matchesSeasonal(halloween[0],'2026-09-13','halloween'));
 assert.equal(model.nextBatch(model.seasonalPlaces(halloween,'2026-09-13','halloween'),12).length,5);
});
test('Twelve-card batches reach every actual record exactly once with a partial final batch',()=>{
 for(const region of ['Exeter','Bristol','Nottingham']){const all=current.filter(p=>p.region===region),shown=[];let chunk;
 while((chunk=model.nextBatch(all,shown.length)).length){assert(chunk.length<=12);shown.push(...chunk);}
 assert.equal(shown.length,all.length);assert.equal(new Set(shown.map(p=>p.id)).size,all.length);assert.deepEqual(model.nextBatch(all,shown.length),[]);}
});
test('Every current card has a small local asset and honest image metadata',()=>{
 const decorated=current.map(images.decorate);
 for(const p of decorated){
 assert.match(p.image,/^assets\/images\/[a-z-]+\.webp$/);const asset=path.join(__dirname,'..',p.image);assert(fs.statSync(asset).size<80000,p.name);
 assert(p.imageAlt);if(p.imageKind==='illustration'){assert(p.imageReference.includes('AI-generated'));assert.equal(p.photoSource,'');}else{
  assert.match(p.photoSource,/^https:\/\/commons.wikimedia.org/);assert.match(p.photoLicence,/^(CC BY|CC0)/);assert.match(p.photoLicenceUrl,/^https:\/\/creativecommons.org\/(licenses\/by(?:-sa)?|publicdomain\/zero)\//);assert(p.imageReference.includes('not a photograph of the current event'));
 }
 }
 assert.equal(decorated.filter(p=>p.imageKind!=='illustration').length,53);
 assert.equal(decorated.filter(p=>p.imageKind==='illustration').length,35);
 assert.equal(new Set(decorated.map(p=>p.image)).size,49);
 // A place sharing a word with a venue must not inherit another region's photo.
 assert.equal(images.decorate({name:'RAMM workshop',region:'Nottingham',type:'art'}).imageKind,'illustration');
});
test('The public image register matches every licensed local photo',()=>{
 assert.equal(imageSources.photos.length,41);assert.equal(imageSources.coverage.licensedPhotoCards,53);
 assert.equal(new Set(imageSources.photos.map(p=>p.key)).size,41);assert.equal(new Set(imageSources.photos.map(p=>p.image)).size,41);
 for(const p of imageSources.photos){
  const asset=path.join(__dirname,'..',p.image);assert.equal(fs.statSync(asset).size,p.bytes,p.key);assert(p.creator);assert.match(p.source,/^https:\/\/commons.wikimedia.org\/wiki\/File:/);assert.match(p.licence,/^(CC BY|CC0)/);
 }
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
 assert.equal(map.filter(p=>p.region==='Exeter').length,32);assert.equal(map.filter(p=>p.region==='Nottingham').length,14);
 const halloween=model.seasonalPlaces(current.filter(p=>p.region==='Exeter'),'2026-09-13','halloween');assert.equal(halloween.length,7);assert(halloween.every(model.hasMapLocation));
 const bristol=current.filter(p=>p.region==='Bristol');assert.equal(bristol.length,3);assert(bristol.every(p=>!model.hasMapLocation(p)));
 for(const name of ['Chessed.me (Online Chess)','Sporty Stars Holiday Camps','Heritage Open Days - Exeter','Nottingham City Gymnastics'])assert.equal(current.find(p=>p.name===name).coords,null);
 const library=current.find(p=>p.name==='Exeter Library');assert(library.coords[0]>50&&library.coords[0]<51);assert(library.coords[1]>-4&&library.coords[1]<-3);
});
