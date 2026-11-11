const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const db=require('../db-adapter.js');
const master=(name='Pottery workshop',added='2026-11-09')=>({name,region:'Devon',tab:'dayout',type:'art',price_type:'paid',price:'£5',url:'https://example.org/workshop',date_added:added});
const event=(name='Pottery workshop',added='2026-11-09',date='2026-12-01')=>({name,region:'Devon',date,end:date,added,price:'£5'});
const item=(added='2026-11-09')=>db.normalise([master(undefined,added)],[event(undefined,added)])[0];
test('London Monday boundary, not rolling seven days or the event date',()=>{
 const p=item();for(const [when,expected]of [['2026-11-08T23:59:59Z',false],['2026-11-09T00:00:00Z',true],['2026-11-15T23:59:59Z',true],['2026-11-16T00:00:00Z',false]])assert.equal(db.isNewThisWeek(p,when),expected,when);
 assert.equal(db.isNewThisWeek(item('2026-11-08'),'2026-11-09T10:00:00Z'),false);
});
test('London spring/autumn DST and year boundary work independently of host timezone',()=>{
 for(const [added,before,at]of [['2026-03-29','2026-03-29T22:59:59Z','2026-03-29T23:00:00Z'],['2026-10-25','2026-10-25T23:59:59Z','2026-10-26T00:00:00Z'],['2027-01-03','2027-01-03T23:59:59Z','2027-01-04T00:00:00Z']]){
  const p={kind:'event',firstPublished:added};assert.equal(db.isNewThisWeek(p,before),true,added);assert.equal(db.isNewThisWeek(p,at),false,added);
 }
 assert.equal(db.londonDay('2026-03-29T23:00:00Z'),'2026-03-30');
 assert.equal(db.londonDay('2026-10-25T00:30:00Z'),'2026-10-25');assert.equal(db.londonDay('2026-10-25T01:30:00Z'),'2026-10-25');
});
test('Missing, malformed, impossible and future dates do not qualify; undated legacy stays unknown',()=>{
 for(const d of ['',null,'11/11/2026','2026-02-30','2026-11-12'])assert.equal(db.isNewThisWeek(item(d),'2026-11-11T12:00:00Z'),false,String(d));
 const history=db.publicationHistory([master(undefined,'')],[event(undefined,'')]);
 assert.equal(db.normalise([master()],[event()],{},history)[0].firstPublished,null);
 assert.equal(db.isNewThisWeek(item(),'bad clock'),false);
});
test('Session, date, description, price and photo edits retain original publication',()=>{
 const m=master(undefined,'2026-10-10'),es=[event(undefined,'2026-10-10')],h=db.publicationHistory([m],es);
 const changed={...m,date_added:'2026-11-11',price:'£9',description:'Updated',dates:'Extra date'};
 const p=db.normalise([changed],[...es,event(undefined,'2026-11-11','2026-12-10')],{annotations:{[m.name]:{image:'new.jpg'}}},h)[0];
 assert.equal(p.firstPublished,'2026-10-10');assert.equal(db.isNewThisWeek(p,'2026-11-11T12:00Z'),false);assert.equal(p.datePeriods.length,2);
});
test('Re-registration and explicit title-only rename preserve event identity',()=>{
 const h=db.publicationHistory([master(undefined,'2026-10-10')],[event(undefined,'2026-10-10')]);
 const removed=db.publicationHistory([],[],h);
 assert.equal(db.normalise([master()],[event()],{},removed)[0].firstPublished,'2026-10-10');
 const renamed=db.normalise([master('Renamed workshop')],[event('Renamed workshop')],{aliases:{'Pottery workshop':'Renamed workshop'}},h)[0];
 assert.equal(renamed.firstPublished,'2026-10-10');assert.equal(db.isNewThisWeek(renamed,'2026-11-11T12:00Z'),false);
});
test('Same organiser and URL allow distinct programmes; ambiguous duplicate generic titles fail validation',()=>{
 const names=['Craft Club — paper folding','Craft Club — Christmas decorations'];
 const ps=db.normalise([master(names[0],'2026-10-10'),master(names[1],'2026-11-11')],[event(names[0],'2026-10-10'),event(names[1],'2026-11-11')]);
 assert.equal(ps.length,2);assert.equal(db.isNewThisWeek(ps[0],'2026-11-11T12:00Z'),false);assert.equal(db.isNewThisWeek(ps[1],'2026-11-11T12:00Z'),true);
 assert.throws(()=>db.normalise([master(),master()],[event()]),/Duplicate master/);
});
test('Cancellation and expiry exclusions remain intact; ordinary venues are not new events',()=>{
 assert.equal(db.normalise([{...master(),description:'Cancelled'}],[event()]).length,0);
 const p=item();p.datePeriods=[{start:'2026-11-09',end:'2026-11-10'}];assert.equal(db.isNewThisWeek(p,'2026-11-11T12:00Z'),false);
 p.datePeriods=null;p.endDate='2026-11-10';assert.equal(db.isNewThisWeek(p,'2026-11-11T12:00Z'),false);
 p.kind='place';p.endDate=null;assert.equal(db.isNewThisWeek(p,'2026-11-11T12:00Z'),false);
});
test('Real recent examples qualify; old ice-rink listings do not renew with added sessions',()=>{
 const context={window:{}};for(const file of ['db-snapshot.js','editorial.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
 const s=context.window.GLOBEE_SNAPSHOT,p=db.normalise(s.master,s.events,context.window.GLOBEE_EDITORIAL,s.publicationHistory);
 for(const name of ['Discover, Decode, Preserve – Exeter Innovation Hub','Theatre in the Library: Mimi and the Golden Touch – Exeter Library','Bridwell Christmas Makers Festival'])assert.equal(db.isNewThisWeek(p.find(p=>p.name===name),'2026-11-11T14:00:00Z'),true,name);
 const rink=p.find(p=>p.name==='Undercover Real Ice Rink – Exeter Winter Wonderland');assert.equal(rink.firstPublished,'2026-11-06');assert.equal(db.isNewThisWeek(rink,'2026-11-11T14:00:00Z'),false);
 assert(p.some(p=>p.firstPublished===null));const count=p.filter(p=>db.isNewThisWeek(p,'2026-11-11T14:00:00Z')).length;assert(count>0&&count<40,`${count}/${p.length}`);
});
test('CSV refresh and browser cache retain original dates and unknown legacy identities',async()=>{
 const old=[master('Old programme','2026-10-10'),master('Undated legacy','')],oldEvents=[event('Old programme','2026-10-10'),event('Undated legacy','')];
 const saved={schema:1,fetchedAt:'2026-09-01T00:00:00Z',master:old,events:oldEvents,publicationHistory:db.publicationHistory(old,oldEvents)};
 const freshMaster=[master('Old programme'),master('Undated legacy'),master('Distinct new programme')];
 const freshEvents=freshMaster.map(m=>event(m.name));
 const csv=rows=>[Object.keys(rows[0]).join(','),...rows.map(row=>Object.values(row).join(','))].join('\n');
 const updates=[],store=new Map(),status={append(){},innerHTML:''};
 const ctx={Date,Intl,JSON,Promise,AbortController,setTimeout,clearTimeout,GlobeeDB:db,GLOBEE_SNAPSHOT:saved,GLOBEE_EDITORIAL:{},localStorage:{getItem:()=>null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:()=>status,createTextNode:t=>t,createElement:()=>({addEventListener(){}})},CustomEvent:class{constructor(n,a){this.detail=a.detail;}},dispatchEvent:e=>updates.push(e.detail),fetch:async url=>({ok:true,text:async()=>csv(url.includes('gid=0&')?freshMaster:freshEvents)})};
 ctx.window=ctx;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../db-loader.js'),'utf8'),ctx);await new Promise(setImmediate);
 assert.equal(updates.length,1);assert.deepEqual(updates[0].places.map(p=>p.firstPublished),['2026-10-10',null,'2026-11-09']);
 const cache=JSON.parse(store.get('globee-db-v1'));assert.equal(cache.publicationHistory['Exeter|old programme'],'2026-10-10');assert.equal(cache.publicationHistory['Exeter|undated legacy'],null);
});
