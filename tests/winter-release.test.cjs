const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),images=require('../image-catalog.js');
test('Nine Devon Christmas search choices use licensed photos with honest farm labels',()=>{
 const names=['Cotley Farm Christmas','Exe Valley Christmas Trees','RHS Glow – Rosemoor','Bay of Lights Christmas Illumination Trail – Torquay','Dartington Christmas Makers Fayre','Totnes Christmas Markets and Late Night Shopping','Tavistock Dickensian Christmas Evening','Plymouth Christmas Market','A (little) Christmas Carol – Exeter Northcott'];
 for(const name of names){const p=images.decorate({name,region:'Exeter'});assert.notEqual(p.imageKind,'illustration',name);assert(p.photoSource);assert(fs.existsSync(path.join(root,p.image)));}
 assert.equal(images.decorate({name:names[0],region:'Exeter'}).imageLabel,'Tree reference photo');
 assert.equal(images.decorate({name:names[1],region:'Exeter'}).imageLabel,'Thorverton village');
 assert.match(images.decorate({name:names[8],region:'Exeter'}).image,/barnfield-auditorium/);
 assert.equal(images.decorate({name:names[0],region:'Bristol'}).imageKind,'illustration');
});
test('Winter entry links to an indexable guide and retains the ice cream map',()=>{
 const home=read('index.html'),guide=read('exeter/christmas-trees/index.html'),css=read('ice-cream.css');
 assert.match(home,/id="christmas-tree-entry"/);assert.match(home,/href="\/exeter\/christmas-trees\/"/);assert.match(home,/id="winter-map-link"/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/grid-column:1\/-1/);
 assert.match(guide,/<link rel="canonical" href="https:\/\/globeeuk.github.io\/exeter\/christmas-trees\/">/);
 assert.match(read('sitemap.xml'),/<loc>https:\/\/globeeuk.github.io\/exeter\/christmas-trees\/<\/loc>/);
 assert.match(guide,/not confirmed tree-rental services/);
 for(const match of guide.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]));
});
