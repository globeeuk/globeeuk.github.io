const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={window:{}};
for(const f of ['db-snapshot.js','editorial.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const research=JSON.parse(fs.readFileSync(path.join(root,'qa/farmers-markets-2026-10-13.json'),'utf8'));
const db=require('../db-adapter.js'),images=require('../image-catalog.js'),model=require('../discovery-model.js');
const items=db.normalise(ctx.window.GLOBEE_SNAPSHOT.master,ctx.window.GLOBEE_SNAPSHOT.events,ctx.window.GLOBEE_EDITORIAL);
const markets=research.markets.map(m=>items.find(p=>p.name===m.name&&p.region===m.region));
test('Eight source-bound market cards join thirty occurrences without duplication',()=>{
 assert.equal(markets.length,8);assert.equal(new Set(markets.map(p=>p.id)).size,8);
 let dates=0;for(const [i,p]of markets.entries()){const m=research.markets[i];assert.equal(p.source,m.source);assert.equal(p.type,'market');assert.equal(p.category,m.category);assert.equal(p.kind,'event');assert.equal(p.scheduleText,m.schedule);assert.equal(p.sourceRows.events,m.dates.length);assert.deepEqual(Array.from(p.datePeriods,d=>d.start),m.dates);dates+=p.datePeriods.length;}assert.equal(dates,30);
 assert.equal(markets.filter(p=>p.region==='Exeter').length,3);assert.equal(markets.filter(p=>p.region==='Bristol').length,2);assert.equal(markets.filter(p=>p.region==='Nottingham').length,3);
});
test('Unknown admission, ages, times and market sites are not invented',()=>{
 assert.equal(markets[0].priceType,'free');assert.match(markets[0].description,/purchases extra/i);
 for(const p of markets.slice(1)){assert.equal(p.priceType,'unknown');assert.equal(p.priceLabel,'TBC');}
 for(const p of markets){assert.equal(p.ages,null);assert.equal(p.ageLabel,'Age TBC');assert.match(p.note,/Checked 13 October 2026/);}
 assert.match(markets[1].scheduleText,/hours TBC/);assert.match(markets[2].address,/site TBC/);assert.equal(markets[2].coords,null);assert.match(markets[5].scheduleText,/closing time TBC/i);
});
test('Recurring schedules remain explicitly qualified, and unpublished closure dates are excluded',()=>{
 assert.match(markets[0].note,/explicitly published/);assert.match(markets[4].note,/explicitly shown/);
 for(const i of [1,2,3,5,6,7])assert.match(markets[i].note,/calculated/);
 assert(!markets[4].datePeriods.some(d=>d.start==='2026-12-27'));
 assert(!markets[6].datePeriods.some(d=>d.start.startsWith('2027-01')));
 assert(markets.every(p=>p.datePeriods.every(d=>d.start>='2026-10-13'&&d.start===d.end)));
});
test('Weekend and Next 4 weeks include scheduled markets once, without mixing regions',()=>{
 const exeter=markets.filter(p=>p.region==='Exeter');assert.deepEqual(model.weekendPicks(exeter,'2026-10-13').map(p=>p.name).sort(),exeter.slice(0,2).map(p=>p.name).sort());
 assert(!model.nextFourWeeksPicks(exeter,'2026-10-13').some(p=>p.name==='Cullompton Farmers’ Market'));
 assert(model.nextFourWeeksPicks(markets.filter(p=>p.region==='Nottingham'),'2026-10-13').some(p=>p.name==='Ruddington Village Market'));
});
test('All new markets use licensed local photographs with honest venue/location references',()=>{
 const sources=JSON.parse(fs.readFileSync(path.join(root,'qa/image-sources.json'),'utf8'));
 for(const p of markets){const d=images.decorate(p),asset=path.join(root,d.image);assert(['venue','location'].includes(d.imageKind));assert(fs.statSync(asset).size<80000);assert.match(d.imageReference,/not a photograph of the current event/);assert.match(d.photoLicence,/CC BY-SA/);assert(sources.photos.some(s=>s.image===d.image));}
 assert.match(images.decorate(markets[2]).imageAlt,/not confirmation/);assert.match(images.decorate(markets[7]).imageAlt,/before later redevelopment/);
 assert.equal(images.decorate({...markets[0],region:'Bristol'}).imageKind,'illustration');
});
