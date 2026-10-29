const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const db=require('../db-adapter.js'),images=require('../image-catalog.js'),model=require('../discovery-model.js'),root=path.join(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['db-snapshot.js','editorial.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const snapshot=ctx.window.GLOBEE_SNAPSHOT,items=db.normalise(snapshot.master,snapshot.events,ctx.window.GLOBEE_EDITORIAL);
test('Two source-bound Clip n Climb venues are current Days out places, not fabricated events or lessons',()=>{
 for(const [name,region,url]of [['Clip ’n Climb Exeter','Exeter','https://clipnclimbexeter.co.uk/'],['Clip ’n Climb Nottingham','Nottingham','https://www.clipnclimbnottingham.co.uk/']]){
  const masters=snapshot.master.filter(p=>p.name===name&&p.region===region);assert.equal(masters.length,1);assert.equal(masters[0].tab,'dayout');assert.equal(masters[0].age_min,'4');assert.equal(masters[0].age_max,'');assert.equal(masters[0].end_date,'');
  const p=items.find(p=>p.name===name&&p.region===region);assert(p);assert.equal(p.source,url);assert.equal(p.kind,'place');assert.equal(p.type,'activity');assert.equal(p.category,'Indoor climbing');assert.equal(p.datePeriods,null);assert.equal(p.priceType,'paid');assert.equal(p.ageLabel,'4+ years');assert.deepEqual(Array.from(p.ages),[4,99]);assert.equal(p.coords,null);
  assert(!snapshot.events.some(e=>e.name===name));assert(!model.weekendPicks([p],'2026-10-29').length);const photo=images.decorate(p);assert.equal(photo.image,null);assert.equal(photo.imageKind,'none');
 }
});
test('Price and session qualifications stay region-specific',()=>{
 const ex=items.find(p=>p.name==='Clip ’n Climb Exeter'),nt=items.find(p=>p.name==='Clip ’n Climb Nottingham');
 assert.match(ex.priceLabel,/16\.95/);assert.match(ex.priceLabel,/1\.05/);assert.match(ex.note,/55 minutes/);assert.match(ex.note,/120cm/);
 assert.match(nt.priceLabel,/16 regular/);assert.match(nt.priceLabel,/12 midweek term-time/);assert.match(nt.note,/parent must remain on site/);assert.match(nt.note,/hours differ/);assert(!nt.priceLabel.includes('10'));
});
test('All directory entry points request the new snapshot and annotations without removing photo-first styling',()=>{
 for(const f of ['index.html','plans.html','halloween.html']){const s=fs.readFileSync(path.join(root,f),'utf8');assert(s.includes('db-snapshot.js?v=clipnclimb-20261029'));assert(s.includes('editorial.js?v=clipnclimb-20261029'));assert(s.includes('photo-first.css?v=20261029-1'));}
});
