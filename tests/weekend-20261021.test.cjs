const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};for(const f of ['db-snapshot.js','editorial.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
const db=require('../db-adapter.js'),model=require('../discovery-model.js'),images=require('../image-catalog.js');
const data=db.normalise(ctx.window.GLOBEE_SNAPSHOT.master,ctx.window.GLOBEE_SNAPSHOT.events,ctx.window.GLOBEE_EDITORIAL);
test('Wednesday selection reaches both homepage date windows with no invented fee, age or map point',()=>{
 const names=['Wear your story – Adire family workshop','Autumn Week at Blaise Museum','The Great Bristol Ball Run','Bayeux Around Britain digital trail – RAMM','Wildwood (12A) – Exeter Phoenix'];
 for(const name of names){const matches=data.filter(p=>p.name===name);assert.equal(matches.length,1,name);for(const pick of [model.weekendPicks(matches,'2026-10-21'),model.nextFourWeeksPicks(matches,'2026-10-21')])assert.equal(pick.length,1,name);}
 const adire=data.find(p=>p.name===names[0]);assert.equal(adire.region,'Bristol');assert.equal(adire.priceType,'unknown');assert.equal(adire.ages,null);assert.equal(adire.coords,null);assert.equal(images.decorate(adire).image,'assets/images/bristol-museum.webp');
 const blaise=data.find(p=>p.name===names[1]);assert(!blaise.datePeriods.some(p=>p.start<='2026-10-27'&&p.end>='2026-10-27'));assert(blaise.datePeriods.some(p=>p.start==='2026-10-29'));
});
test('The two public Weekend Edits preserve the reviewed programme and explicit uncertainties',()=>{
 const bristol=fs.readFileSync('bristol/this-weekend/index.html','utf8'),exeter=fs.readFileSync('exeter/this-weekend/index.html','utf8');
 for(const text of ['Wear your story','Blaise','Ball Run','4–16 £3','Time, charge, booking and numerical ages remain TBC'])assert(bristol.includes(text),text);
 for(const text of ['Bayeux','Wildwood','12A','17:15'])assert(exeter.includes(text),text);
 assert(!exeter.split('Next weekend')[0].includes('Cat Video Fest'));
});
