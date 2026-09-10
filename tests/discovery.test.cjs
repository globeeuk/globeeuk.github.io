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
