const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {matchesQuery}=require('../discovery-model.js');
test('ice finds words and prefixes, not price/service/choice substrings',()=>{
 for(const text of ['Ice skating','ICE-RINK','Ice cream','Iceskating sessions'])assert(matchesQuery({name:text},'ice'),text);
 for(const text of ['Christingle Service','Admission price TBC','A choice of crafts'])assert.equal(matchesQuery({name:text},'ice'),false,text);
 assert(matchesQuery({name:'Skating lessons'},'skat'));assert(!matchesQuery({name:'Ice rink'},'skating'));
});
test('Search handles multiple words, punctuation, accents and blank queries without dropping constraints',()=>{
 assert(matchesQuery({name:'Exeter ice rink',address:'Devon'},'ice devon'));assert(!matchesQuery({name:'Exeter ice rink'},'ice bristol'));
 assert(matchesQuery({name:'Café – Théâtre'},'cafe thea'));assert(matchesQuery({name:'Mimi: Golden Touch'},'Mimi: golden'));
 assert(matchesQuery({keywords:['ice skating']},'ICE'));assert(matchesQuery({},'  '));assert(!matchesQuery({name:'Any listing'},'???'));
});
test('Real data keeps verified Devon/Cornwall skating listings while excluding unrelated service results',()=>{
 const ctx={window:{}};for(const f of ['db-snapshot.js','editorial.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
 const s=ctx.window.GLOBEE_SNAPSHOT,p=require('../db-adapter.js').normalise(s.master,s.events,ctx.window.GLOBEE_EDITORIAL,s.publicationHistory);
 const names=p.filter(p=>p.region==='Exeter'&&matchesQuery(p,'ice')).map(p=>p.name);
 for(const name of ['Eden Project Ice Skating – Cornwall',"Cornwall's Winter Wonderland – Pool Ice Rink",'North Devon Christmas Ice Rink – Barnstaple','Plymouth Winter Wonderland – Ice Rink','Undercover Real Ice Rink – Exeter Winter Wonderland','Bay of Lights Ice Rink – Torquay'])assert(names.includes(name),name);
 assert(!names.includes('Christingle Service 2026 – Exeter Cathedral'));
});
function notebook(){
 const element=()=>({hidden:false,value:'',events:{},addEventListener(k,fn){this.events[k]=fn;},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}});
 const input=element(),form=element(),heading=element(),promos=[element(),element(),element()],results=element(),search=element(),timers=new Map(),calls=[];let next=0;
 const selections={'.entry-cards':promos[0],'.home-secondary-links':promos[1],'.notebook-browse-row':promos[2],'.notebook-home .result-section':results,'.notebook-home .notebook-search-row':search,'#notebook-home-query':input};
 const ids={'notebook-home-query':input,'notebook-home-search':form,'results-heading':heading};
 const document={body:{dataset:{},classList:{contains:c=>c==='notebook-page'}},querySelector:s=>selections[s]||null,querySelectorAll:()=>[],getElementById:id=>ids[id]||null};
 const ctx={document,URLSearchParams,setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)};ctx.window=ctx;ctx.GlobeeNotebookSearch=q=>calls.push(q);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../notebook.js'),'utf8'),ctx);
 return {ctx,input,form,heading,promos,results,search,calls,flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('Search reveals results by hiding promos and restores them when cleared',()=>{
 const n=notebook();n.ctx.GlobeeNotebook.sync({query:'ice',notebookSection:'days'});assert(n.promos.every(e=>e.hidden));assert(!n.results.hidden&&!n.search.hidden);
 n.ctx.GlobeeNotebook.sync({query:'',notebookSection:'days'});assert(n.promos.every(e=>!e.hidden));
 n.ctx.GlobeeNotebook.sync({query:'',notebookSection:'notes'});assert(n.results.hidden&&n.search.hidden&&n.promos.every(e=>e.hidden));
});
test('Latest input wins and reset cancels pending search instead of restoring stale text',()=>{
 const n=notebook();n.input.value='ice';n.input.events.input();n.input.value='Mimi';n.input.events.input();n.flush();assert.deepEqual(n.calls,['Mimi']);
 n.input.value='ice';n.input.events.input();n.ctx.GlobeeNotebook.cancelSearch();n.ctx.GlobeeNotebook.sync({query:''});n.flush();assert.deepEqual(n.calls,['Mimi']);assert.equal(n.input.value,'');
});
test('A directory refresh preserves search input until the pending query is applied',()=>{
 const n=notebook();
 n.input.value='ice';n.input.events.input();n.ctx.GlobeeNotebook.sync({query:'',notebookSection:'days'});
 assert.equal(n.input.value,'ice');n.flush();assert.deepEqual(n.calls,['ice']);
 n.input.events.compositionstart();n.input.value='미';n.ctx.GlobeeNotebook.sync({query:'ice',notebookSection:'days'});
 assert.equal(n.input.value,'미');
});
test('Enter immediately submits once and moves focus to results; IME waits until composition finishes',()=>{
 const n=notebook();n.input.value=' ice ';n.input.events.input();n.form.events.submit({preventDefault(){}});n.flush();assert.deepEqual(n.calls,['ice']);assert(n.heading.focused&&n.heading.scrolled);
 n.input.events.compositionstart();n.input.value='미';n.input.events.input();n.flush();assert.equal(n.calls.length,1);
 n.input.value='미술';n.input.events.compositionend();n.flush();assert.deepEqual(n.calls,['ice','미술']);
});
