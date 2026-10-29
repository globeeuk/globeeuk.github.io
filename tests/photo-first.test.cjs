const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),images=require('../image-catalog.js'),db=require('../db-adapter.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['db-snapshot.js','editorial.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const items=db.normalise(ctx.window.GLOBEE_SNAPSHOT.master,ctx.window.GLOBEE_SNAPSHOT.events,ctx.window.GLOBEE_EDITORIAL);
test('Only the two explicitly requested climbing cards use an illustration; other missing photos stay text-only',()=>{
 const requested=new Set(['Exeter|Clip ’n Climb Exeter','Nottingham|Clip ’n Climb Nottingham']),illustrated=[];
 for(const p of items.map(images.decorate)){
  if(p.imageKind==='illustration'){const key=p.region+'|'+p.name;assert(requested.has(key),key);illustrated.push(key);assert.equal(p.imageLabel,'Illustration');assert.equal(p.image,'assets/images/children-climbing-illustration.webp');assert.equal(p.photoSource,'');assert.match(p.imageReference,/not a photograph/);assert(fs.existsSync(path.join(root,p.image)));continue;}
  if(p.image){assert(p.photoSource,p.name);assert(p.photoLicence,p.name);assert(fs.existsSync(path.join(root,p.image)),p.name);}
  else{assert.equal(p.imageKind,'none');assert.equal(p.imageAlt,'');assert.equal(p.photoSource,'');}
 }
 assert.deepEqual(illustrated.sort(),[...requested].sort());
 assert.equal(images.decorate({name:'RAMM workshop',region:'Nottingham',type:'art'}).image,null);
 assert.equal(images.decorate({name:'Clip ’n Climb Exeter',region:'Nottingham',type:'activity'}).image,null);
});
test('New Devon mappings identify the correct venue and retain event data unchanged',()=>{
 const expected={'October Half Term Family Activities – Exeter Cathedral':'cathedral','Monster Book Workshop – Theatre Alibi':'theatre-alibi','Exeter Library':'exeter-library','Christmas at Killerton':'killerton-house',"Teddy Bear's Christmas at Greenway":'greenway-house','Father Christmas Storytelling – Arlington Court':'arlington-court'};
 for(const [name,key]of Object.entries(expected)){
  const p=items.find(p=>p.region==='Exeter'&&p.name===name);assert(p,name);const d=images.decorate(p);assert.equal(d.image,`assets/images/${key}.webp`);assert.equal(d.imageKind,'venue');assert.match(d.imageReference,/not a photograph of the current event/);
  for(const field of ['id','name','region','description','source','datePeriods','endDate','priceLabel','priceType','ages','ageLabel','address','coords','checked','scheduleText'])assert.deepEqual(d[field],p[field],name+' '+field);
 }
 const source=items.find(p=>p.name==='Premier Education: Swan Lake – Exeter Northcott');assert.equal(images.decorate(source).image,'assets/images/barnfield-auditorium.webp');
});
test('Five added venue assets are small and attributed in both the public register and credits',()=>{
 const registry=JSON.parse(fs.readFileSync(path.join(root,'qa/image-sources.json'))),credits=fs.readFileSync(path.join(root,'image-credits.html'),'utf8');
 for(const key of ['exeter-library','theatre-alibi','killerton-house','arlington-court','greenway-house']){const p=registry.photos.find(p=>p.key===key);assert(p,key);assert.equal(fs.statSync(path.join(root,p.image)).size,p.bytes);assert(p.bytes<80000);assert.match(p.licence,/^CC BY/);assert(credits.includes(p.source.replace(/'/g,'%27'))||credits.includes(p.source),key);}
});
test('All directory entry points receive the same photo-first script and compact text-only styling',()=>{
 for(const f of ['index.html','plans.html','halloween.html']){const html=fs.readFileSync(path.join(root,f),'utf8');assert(html.includes('image-catalog.js?v=climbing-illustration-20261029'));assert(html.includes('app.js?v=climbing-illustration-20261029'));assert(html.includes('photo-first.css?v=20261029-1'));}
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert(!app.includes('AI-generated activity illustration'));assert(app.includes('class="place-card${p.image?\'\':\' no-photo\'}"'));assert(app.includes('${p.image?`<div class="detail-picture">'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('child-rocket-half-term-2026.png'));assert(html.includes('child-handprint-christmas-tree-2026.jpg'));
});
