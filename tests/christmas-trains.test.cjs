const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),db=require('../db-adapter.js'),discovery=require('../discovery-model.js'),images=require('../image-catalog.js');
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['db-snapshot.js','editorial.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const {master,events}=ctx.window.GLOBEE_SNAPSHOT;
const items=db.normalise(master,events,ctx.window.GLOBEE_EDITORIAL);
const evidence=JSON.parse(fs.readFileSync(path.join(root,'qa/christmas-trains-2026-10-07.json'),'utf8'));
const trains=[
  {name:'Christmas Train of Lights – Dartmouth Steam Railway',count:24,first:'2026-11-27',last:'2026-12-30',url:'https://www.dartmouthrailriver.co.uk/tickets/christmas-train-of-lights',image:'dartmouth-train-of-lights'},
  {name:'Train of Lights+Santa – Dartmouth Steam Railway',count:16,first:'2026-11-28',last:'2026-12-23',url:'https://www.dartmouthrailriver.co.uk/tickets/train-of-lights-santa',image:'dartmouth-train-santa'},
  {name:'THE POLAR EXPRESS™ Train Ride – South Devon Railway',count:15,first:'2026-11-27',last:'2026-12-23',url:'https://www.southdevonrailway.co.uk/event/the-polar-express-train-ride-at-south-devon-railway/',image:'south-devon-polar-express'}
];
test('2026 Christmas trains are distinct Days out records with selected official dates and photos',()=>{
  for(const expected of trains){
    const row=master.find(p=>p.name===expected.name),item=items.find(p=>p.name===expected.name);
    assert(row&&item,expected.name);
    assert.equal(row.tab,'dayout');assert.equal(item.region,'Exeter');assert.equal(item.category,'Christmas trains');
    assert.equal(item.source,expected.url);assert.equal(item.priceType,'paid');assert.equal(item.bookAhead,true);
    assert.equal(item.datePeriods.length,expected.count);assert.equal(item.datePeriods[0].start,expected.first);
    assert.equal(item.datePeriods.at(-1).start,expected.last);
    assert.deepEqual(Array.from(item.datePeriods,p=>p.start),evidence.sources.find(p=>p.name===expected.name).dates);
    assert(item.datePeriods.every(p=>p.start===p.end&&p.start.startsWith('2026-')));
    assert(!item.datePeriods.some(p=>p.start==='2026-12-25'));
    assert.equal(events.filter(e=>e.name===expected.name).length,expected.count);
    const photo=images.decorate(item);assert.equal(photo.image,`assets/images/${expected.image}.webp`);
    assert.equal(photo.imageLabel,'Railway photo');assert(photo.imageReference.includes('not a photograph of the current event'));
    assert(fs.statSync(path.join(root,photo.image)).size<80000);
  }
  assert.match(items.find(p=>p.name===trains[0].name).note,/Santa does not board/);
  assert.match(items.find(p=>p.name===trains[1].name).note,/separate/);
});
test('All three are in the Exeter Christmas book-ahead edit and not Bristol',()=>{
  const exeter=discovery.seasonalPlaces(items.filter(p=>p.region==='Exeter'),'2026-10-07','christmas-book-ahead');
  const bristol=discovery.seasonalPlaces(items.filter(p=>p.region==='Bristol'),'2026-10-07','christmas-book-ahead');
  for(const {name} of trains){assert(exeter.some(p=>p.name===name),name);assert(!bristol.some(p=>p.name===name),name);}
});
