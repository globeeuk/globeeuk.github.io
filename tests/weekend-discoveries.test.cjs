const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};for(const f of ['db-snapshot.js','editorial.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const db=require('../db-adapter.js'),images=require('../image-catalog.js'),model=require('../discovery-model.js'),q=require('../qa/weekend-discoveries-2026-10-15.json');
const items=db.normalise(ctx.window.GLOBEE_SNAPSHOT.master,ctx.window.GLOBEE_SNAPSHOT.events,ctx.window.GLOBEE_EDITORIAL);
test('All three discoveries join exactly one dated native master, with licensed relevant photos and map references',()=>{
 for(const e of q.events){const found=items.filter(p=>p.name===e.name&&p.region==='Exeter');assert.equal(found.length,1);const p=found[0];assert.equal(p.kind,'event');assert.equal(p.sourceRows.events,1);assert.equal(p.datePeriods[0].start,e.date);assert.equal(p.datePeriods[0].end,e.date);assert(p.coords?.length===2);const photo=images.decorate(p);assert.equal(photo.imageKind,e.id==='sidmouth-robot-workshop-2026'?'activity':'venue');assert(fs.existsSync(photo.image));assert.match(photo.photoLicence,/CC BY-SA/);}
});
test('Robot Workshop uses a real educational robot reference rather than a hall photograph',()=>{
 const robot=images.decorate(items.find(p=>p.name==='Robot Workshop – Sidmouth Science Festival'));
 assert.equal(robot.image,'assets/images/robotics-activity.webp');assert.equal(robot.imageLabel,'Robot reference photo');
 assert.equal(robot.credit,'Javier Leiva / Wikimedia Commons');assert.equal(robot.photoLicence,'CC BY-SA 4.0');
 assert.match(robot.imageAlt,/real LEGO Mindstorms/);assert.match(robot.imageReference,/NOT a photograph of the Sidmouth event/);
 assert(!robot.image.includes('all-saints'));assert(fs.readFileSync('image-credits.html','utf8').includes('data-activity-photo="robotics-activity"'));
 for(const f of ['index.html','plans.html'])assert.match(fs.readFileSync(f,'utf8'),/image-catalog\.js\?v=[^\"]*-robot1/);
});
test('Weekend and Next 4 weeks surface new dates without inventing free tickets or universal age suitability',()=>{
 const selected=items.filter(p=>q.events.some(e=>e.name===p.name));for(const pick of [model.weekendPicks(selected,'2026-10-15'),model.nextFourWeeksPicks(selected,'2026-10-15')])assert.equal(pick.length,3);
 const writing=selected.find(p=>p.name.startsWith('Mermaids'));assert.deepEqual(Array.from(writing.ages),[8,12]);assert.equal(writing.priceType,'unknown');assert.equal(writing.priceLabel,'TBC');
 const robot=selected.find(p=>p.name.startsWith('Robot'));assert.equal(robot.priceType,'free');assert.equal(robot.ages,null);
 const nlo=selected.find(p=>p.name.startsWith('Family'));assert.equal(nlo.priceType,'paid');assert.equal(nlo.ages,null);assert.match(nlo.note,/timed planetarium/);
 assert.equal(items.filter(p=>p.name==='Arietty (U) – Exeter Phoenix').length,1);
});
test('Current Weekend Edit carries the four varied experiences; familiar venues stay in the directory',()=>{
 const html=fs.readFileSync('exeter/this-weekend/index.html','utf8'),current=html.split('Next weekend')[0];
 for(const e of q.events)assert(current.includes(e.name));assert.match(current,/Arrietty/);
 assert(items.some(p=>/Darts Farm.*Pumpkin|Pumpkin.*Darts Farm/i.test(p.name)));assert(items.some(p=>/Crealy/i.test(p.name)));
});
