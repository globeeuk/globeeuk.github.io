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
 assert(devon.length<=10);assert(devon.some(p=>p.name.includes('Shanty')));assert(!devon.some(p=>p.name.includes('Halloween')));
 const notts=model.weekendPicks(items.filter(p=>p.region==='Nottingham'),'2026-09-10');assert.equal(notts.length,1);assert(notts[0].name.includes('Trial'));
 const p={id:'repeat',name:'Recurring',datePeriods:[{start:'2026-09-12',end:'2026-09-12'},{start:'2026-09-13',end:'2026-09-13'}]};
 assert.equal(model.weekendPicks([p,p,{id:'tbc',name:'TBC'}],'2026-09-10').length,1);
 assert.deepEqual(model.weekendPicks([p],'2026-09-14'),[]);
 const many=Array.from({length:14},(_,i)=>({id:String(i),name:`Weekend plan ${i}`,datePeriods:[{start:'2026-09-12',end:'2026-09-12'}]}));
 assert.equal(model.weekendPicks(many,'2026-09-10').length,10);
});
test('Seasonal edits run through their end date, stay regional and never pad the shortlist',()=>{
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-09-12'),null);
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-09-13'),null);
 const devon=model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-10-16');
 assert.equal(devon.id,'half-term');assert.equal(devon.total,model.seasonalPlaces(current.filter(p=>p.region==='Exeter'),'2026-10-16','half-term').length);assert.equal(devon.picks.length,5);assert(devon.picks.every(p=>p.region==='Exeter'));
 const coaver=model.seasonalPlaces(current.filter(p=>p.region==='Exeter'),'2026-09-13','halloween').find(p=>p.name==='Kids’ Halloween Spooky Disco – Coaver Club');
 assert(coaver);assert.equal(coaver.datePeriods[0].start,'2026-10-23');
 const notts=model.seasonalEdit(current.filter(p=>p.region==='Nottingham'),'2026-10-16');
 assert(notts.picks.length<=5);assert(notts.picks.length>0);assert(notts.picks.every(p=>p.region==='Nottingham'));
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Nottingham'),'2026-10-31').id,'christmas');
 const bristol=model.seasonalEdit(items.filter(p=>p.region==='Bristol'),'2026-10-16');
 assert.equal(bristol.id,'half-term');assert(bristol.total>=2);assert(bristol.picks.every(p=>p.region==='Bristol'));
 const bristolChristmas=model.seasonalEdit(items.filter(p=>p.region==='Bristol'),'2026-10-31');
 assert.equal(bristolChristmas.id,'christmas');assert(bristolChristmas.picks.every(p=>p.region==='Bristol'));
  const undated={id:'undated',name:'Halloween event',description:'Family Halloween activity'};
 assert.equal(model.seasonalEdit([undated],'2026-10-01'),null);
 const festive=i=>({id:String(i),name:`Christmas activity ${i}`,description:'Family Christmas event',datePeriods:[{start:'2026-12-01',end:'2026-12-24'}]});
 assert.equal(model.seasonalEdit([festive(1)],'2026-10-31').id,'christmas');
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-10-29').id,'half-term');
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-10-30').id,'christmas');
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-10-31').id,'christmas');
 assert.equal(model.seasonalEdit(current.filter(p=>p.region==='Exeter'),'2026-11-02').id,'christmas');
 assert.equal(model.seasonalDefinition('halloween','2026-10-31').id,'halloween');
 assert.equal(model.seasonalEdit([festive(1)],'2026-12-25'),null);
});
test('Seasonal list keeps every matching event while the home edit stays at five cards',()=>{
 const halloween=Array.from({length:17},(_,i)=>({id:String(i),name:`Halloween plan ${String(i).padStart(2,'0')}`,description:'Pumpkin activity',region:'Exeter',kind:'event',datePeriods:[{start:'2026-10-26',end:'2026-10-26'}]}));
 const edit=model.seasonalEdit(halloween,'2026-10-16');
 assert.equal(edit.picks.length,5);assert.equal(edit.total,17);
 assert.equal(model.seasonalPlaces(halloween,'2026-09-13','halloween').length,17);
 assert(model.matchesSeasonal(halloween[0],'2026-09-13','halloween'));
 assert.equal(model.nextBatch(model.seasonalPlaces(halloween,'2026-09-13','halloween'),12).length,5);
});
test('October edit includes all dated days out and clubs, including early Sidmouth science events',()=>{
 const exeter=items.filter(p=>p.region==='Exeter');
 const picks=model.seasonalPlaces(exeter,'2026-10-17','half-term');
 const names=new Set(picks.map(p=>p.name));
 assert(names.has('Robot Workshop – Sidmouth Science Festival'));
 assert(names.has('Family Fun Day – Norman Lockyer Observatory'));
 assert(names.has('Exeter Quayside Farmers’ Market'));
 assert(model.matchesSeasonal({id:'ordinary-outing',name:'Sidmouth nature walk',region:'Exeter',kind:'event',datePeriods:[{start:'2026-10-18',end:'2026-10-18'}]},'2026-10-17','half-term'));
 assert(picks.every(p=>['event','club'].includes(p.kind)));
 assert(picks.every(p=>p.datePeriods.some(d=>d.end>='2026-10-17'&&d.start<='2026-11-01')));
 for(const region of ['Exeter','Bristol','Nottingham']){
  const regional=items.filter(p=>p.region===region);
  const expected=regional.filter(p=>['event','club'].includes(p.kind)&&p.datePeriods?.some(d=>d.end>='2026-10-17'&&d.start<='2026-11-01'));
  const actual=model.seasonalPlaces(regional,'2026-10-17','half-term');
  assert.deepEqual(new Set(actual.map(p=>p.id)),new Set(expected.map(p=>p.id)),region);
 }
 assert(!model.seasonalPlaces(exeter,'2026-10-18','half-term').some(p=>p.name==='Robot Workshop – Sidmouth Science Festival'));
 assert.equal(model.seasonalDefinition('half-term','2026-10-30'),null);
});
test('Christmas book-ahead edit contains checked Exeter and Bristol booking pages without mixing regions',()=>{
 const exeter=items.filter(p=>p.region==='Exeter');
 const early=model.bookAheadEdit(exeter,'2026-10-05');
 assert.equal(model.seasonalEdit(exeter,'2026-10-05'),null);
 assert(early);assert.equal(early.total,8);
 assert.deepEqual(early.picks.map(p=>p.name),[
  'Christmas Train of Lights – Dartmouth Steam Railway',
  'Sleeping Beauty – Exeter Northcott',
  'THE POLAR EXPRESS™ Train Ride – South Devon Railway',
  'Train of Lights+Santa – Dartmouth Steam Railway',
  'Pinocchio – Exeter Corn Exchange'
 ]);
 assert(early.picks.every(p=>p.source&&p.priceType==='paid'&&p.datePeriods?.length));
 const bristol=model.bookAheadEdit(items.filter(p=>p.region==='Bristol'),'2026-10-06');
 assert.equal(bristol.total,3);
 assert(bristol.picks.every(p=>p.region==='Bristol'&&p.source&&p.priceType==='paid'));
 assert.equal(bristol.picks.find(p=>p.name.includes('Noah')).datePeriods.length,10);
 assert.equal(bristol.picks.find(p=>p.name.includes('Old Down')).datePeriods.length,18);
 assert.equal(bristol.picks.find(p=>p.name.includes('Hippodrome')).datePeriods.length,25);
 assert(!bristol.picks.some(p=>p.datePeriods.some(d=>d.start<='2026-12-25'&&d.end>='2026-12-25')));
 assert.equal(model.bookAheadEdit(items.filter(p=>p.region==='Nottingham'),'2026-10-06'),null);
 assert.equal(model.bookAheadEdit(exeter,'2027-01-04'),null);
 assert.equal(model.seasonalEdit(exeter,'2026-10-31').id,'christmas');
});
test('October half-term rail is rendered before Christmas book-ahead on the homepage',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 const body=app.slice(app.indexOf('function renderWeekend(){'),app.indexOf('function rail('));
 assert(body.indexOf('rail(`${seasonal.id}-picks`')<body.indexOf("rail('christmas-book-ahead-picks'"));
 const home=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert(home.includes('id="half-term-entry"'));
 assert(!home.includes('id="christmas-tree-entry"'));
 assert(!home.includes('id="exeter-music-feature"'));
 assert(!home.includes('src="music-feature.js'));
});
test('30 October Christmas switch uses one handprint banner and a combined tree-and-events edit',()=>{
 const exeter=items.filter(p=>p.region==='Exeter');
 const christmas=model.seasonalPlaces(exeter,'2026-10-30','christmas');
 assert(christmas.some(p=>p.name==='Cotley Farm Christmas'));
 assert(christmas.some(p=>p.name.includes('Christmas Train of Lights')));
 assert.equal(model.seasonalDefinition('half-term','2026-10-30'),null);
 assert.equal(model.seasonalDefinition('christmas','2026-10-29'),null);
 const home=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert(home.includes('id="christmas-entry"'));
 assert(home.includes('child-handprint-christmas-tree-2026.jpg'));
 assert(!home.includes('id="christmas-tree-entry"'));
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert(app.includes("state.edit==='christmas'"));
 assert(app.includes('Compare tree-buying places'));
 assert(app.includes("['Exe Valley Christmas Trees'"));
 assert(app.includes("['Haldon Christmas Tree Centre'"));
 assert(app.includes("['Greendale Farm Shop'"));
 assert(app.includes('Festive events &amp; shows'));
});
test('Twelve-card batches reach every actual record exactly once with a partial final batch',()=>{
 for(const region of ['Exeter','Bristol','Nottingham']){const all=current.filter(p=>p.region===region),shown=[];let chunk;
 while((chunk=model.nextBatch(all,shown.length)).length){assert(chunk.length<=12);shown.push(...chunk);}
 assert.equal(shown.length,all.length);assert.equal(new Set(shown.map(p=>p.id)).size,all.length);assert.deepEqual(model.nextBatch(all,shown.length),[]);}
});
test('Every current card has a licensed local photograph or an explicit text-only state',()=>{
 const decorated=current.map(images.decorate);
 for(const p of decorated){
 if(!p.image){assert.equal(p.imageKind,'none');assert.equal(p.photoSource,'');continue;}
 assert.match(p.image,/^assets\/images\/[a-z-]+\.webp$/);const asset=path.join(__dirname,'..',p.image);assert(fs.statSync(asset).size<80000,p.name);
 assert(p.imageAlt);{
  assert.match(p.photoSource,/^https:\/\/commons.wikimedia.org/);assert.match(p.photoLicence,/^(CC BY|CC0)/);assert.match(p.photoLicenceUrl,/^https:\/\/creativecommons.org\/(licenses\/by(?:-sa)?|publicdomain\/zero)\//);assert(p.imageReference.includes('not a photograph of the current event'));
 }
 }
 assert(decorated.some(p=>p.image));
 assert(decorated.some(p=>p.imageKind==='none'));
 assert(new Set(decorated.map(p=>p.image)).size>20);
 // A place sharing a word with a venue must not inherit another region's photo.
 assert.equal(images.decorate({name:'RAMM workshop',region:'Nottingham',type:'art'}).imageKind,'none');
});
test('The public image register matches every licensed local photo',()=>{
 assert.equal(imageSources.photos.length,74);
 assert.equal(new Set(imageSources.photos.map(p=>p.key)).size,imageSources.photos.length);assert.equal(new Set(imageSources.photos.map(p=>p.image)).size,imageSources.photos.length);
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
 assert(map.filter(p=>p.region==='Exeter').length>=32);assert(map.filter(p=>p.region==='Nottingham').length>=14);
 const halloween=model.seasonalPlaces(current.filter(p=>p.region==='Exeter'),'2026-09-13','halloween');assert(halloween.length>=8);assert(halloween.every(model.hasMapLocation));
 const coaver=halloween.find(p=>p.name==='Kids’ Halloween Spooky Disco – Coaver Club');assert(coaver);assert.deepEqual(Array.from(coaver.coords),[50.715577,-3.518649]);
 const bristol=current.filter(p=>p.region==='Bristol');assert(bristol.length>=6);assert(bristol.every(model.hasMapLocation));
 const allBristol=items.filter(p=>p.region==='Bristol');assert(allBristol.length>=bristol.length);assert(allBristol.every(model.hasMapLocation));
 for(const name of ['Chessed.me (Online Chess)','Sporty Stars Holiday Camps','Heritage Open Days - Exeter','Nottingham City Gymnastics'])assert.equal(current.find(p=>p.name===name).coords,null);
 const library=current.find(p=>p.name==='Exeter Library');assert(library.coords[0]>50&&library.coords[0]<51);assert(library.coords[1]>-4&&library.coords[1]<-3);
});
