const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),db=require('../db-adapter.js'),model=require('../discovery-model.js'),images=require('../image-catalog.js');
const ctx={window:{}};vm.createContext(ctx);
for(const f of ['db-snapshot.js','editorial.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const snap=ctx.window.GLOBEE_SNAPSHOT,items=db.normalise(snap.master,snap.events,ctx.window.GLOBEE_EDITORIAL);
const evidence=JSON.parse(fs.readFileSync(path.join(root,'qa/theatre-days-out-2026-10-06.json'),'utf8'));
const shows=[...evidence.sources,...evidence.correctedExisting];
test('Verified shows are single Days out records with exact public performance dates and real venue photos',()=>{
 for(const source of shows){
  const matches=items.filter(p=>p.name===source.name);assert.equal(matches.length,1,source.name);
  const p=matches[0],m=snap.master.find(m=>m.name===source.name);
  assert.equal(m.tab,'dayout');assert.equal(p.type,'theatre');assert.equal(p.category,'Theatre & shows');assert.equal(p.source,source.url);
  assert.deepEqual(Array.from(p.datePeriods,d=>d.start),source.dates,source.name);
  assert(p.datePeriods.every(d=>d.start===d.end));assert.equal(p.priceType,'paid');assert.equal(p.region,'Exeter');
  const photo=images.decorate(p);assert.equal(photo.imageKind,'venue');assert(fs.existsSync(path.join(root,photo.image)));assert.match(photo.photoLicence,/CC BY-SA/);
 }
});
test('Drama lessons and holiday clubs are not relabelled as performances',()=>{
 const base={...snap.master[0],region:'Exeter',type:'theatre',name:'Drama lesson test',tab:'lesson',end_date:''};
 assert.notEqual(db.normalise([base],snap.events).find(p=>p.name===base.name).type,'theatre');
 const club={...base,tab:'club',name:'Drama club test'};
 assert.equal(db.normalise([club],snap.events).find(p=>p.name===club.name).type,'club');
});
test('No-school-only, dark-day and adult-only false positives in public show schedules',()=>{
 const get=name=>items.find(p=>p.name===name).datePeriods.map(d=>d.start);
 const pino=get('Pinocchio – Exeter Corn Exchange');for(const date of ['2026-12-14','2026-12-18','2026-12-25'])assert(!pino.includes(date));
 const beauty=get('Sleeping Beauty – Exeter Northcott');for(const date of ['2026-12-07','2026-12-08','2026-12-09','2026-12-25','2026-12-30'])assert(!beauty.includes(date));
 const carol=get('A (little) Christmas Carol – Exeter Northcott');assert(!carol.includes('2026-12-18'));assert(!carol.includes('2026-12-25'));
 assert.equal(items.find(p=>p.name==='Shrek the Musical Jr – Stage by Stage').ageLabel,'Age TBC');
});
test('Next four weeks includes exactly 28 calendar dates, ten distinct cards and no undated fillers',()=>{
 assert.deepEqual(model.nextFourWeeksRange('2026-10-06'),{start:'2026-10-06',end:'2026-11-02'});
 assert.deepEqual(model.nextFourWeeksRange('2026-12-20'),{start:'2026-12-20',end:'2027-01-16'});
 const plan=(id,start,end=start)=>({id,name:id,datePeriods:[{start,end}]});
 const first=plan('first','2026-10-06'),last=plan('last','2026-11-02');
 assert.deepEqual(model.nextFourWeeksPicks([last,first,first,plan('past','2026-10-05'),plan('after','2026-11-03'),{id:'tbc'}],'2026-10-06').map(p=>p.id),['first','last']);
 assert.equal(model.nextFourWeeksPicks(Array.from({length:14},(_,i)=>plan(String(i),'2026-10-10')),'2026-10-06').length,10);
 const shrek=items.find(p=>p.name==='Shrek the Musical Jr – Stage by Stage');
 assert.equal(model.nextFourWeeksPicks([shrek],'2026-10-06').length,1);assert.equal(model.weekendPicks([shrek],'2026-10-06').length,0);assert.equal(model.nextFourWeeksPicks([shrek],'2026-10-28').length,0);
});
test('Holiday shows reuse existing Christmas edit without making non-seasonal Shrek festive',()=>{
 const edit=model.bookAheadEdit(items.filter(p=>p.region==='Exeter'),'2026-10-06');
 for(const name of ['Pinocchio – Exeter Corn Exchange','Cinderella – Barnfield Theatre'])assert(model.seasonalPlaces(items.filter(p=>p.region==='Exeter'),'2026-10-06','christmas-book-ahead').some(p=>p.name===name));
 assert(!model.seasonalPlaces(items.filter(p=>p.region==='Exeter'),'2026-10-06','christmas-book-ahead').some(p=>p.name.includes('Shrek')));
});
test('Every application entry has matching cache versions for theatre and date-tab changes',()=>{
 for(const page of ['index.html','plans.html','halloween.html']){const html=fs.readFileSync(path.join(root,page),'utf8');for(const asset of ['db-adapter.js','editorial.js','db-snapshot.js','image-catalog.js','discovery-model.js','app.js','discovery-v2.css'])assert(html.includes(`${asset}?v=`),`${page}: ${asset}`);}
});
