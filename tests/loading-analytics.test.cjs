const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function analytics(hostname='globeeuk.github.io',seed={}){
 const requests=[],store=new Map(Object.entries(seed));
 const button=value=>({dataset:{analyticsChoice:value},textContent:'',attrs:{},addEventListener(k,fn){this[k]=fn;},setAttribute(k,v){this.attrs[k]=v;},focus(){}});
 const allow=button('granted'),deny=button('denied'),toggle=button(),status={textContent:''};
 const panel={setAttribute(){},querySelectorAll:()=>[allow,deny],querySelector:()=>allow,scrollIntoView(){}};
 const document={title:'Globee',cookie:'_ga=old',referrer:'https://example.org/?private=yes',head:{appendChild:s=>requests.push(s)},createElement:t=>t==='section'?panel:{},querySelector:()=>({prepend(){}}),querySelectorAll:s=>s==='[data-analytics-toggle]'?[toggle]:s==='[data-analytics-status]'?[status]:[],addEventListener(){}};
 const ctx={document,location:{hostname,origin:'https://'+hostname,pathname:'/plans.html',search:'?q=private-name&age=3-5'},URL,Date,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('analytics.js'),ctx);return {ctx,toggle,status,requests,store,allow,deny,panel};
}
test('No GA before an explicit choice; accepting enables analytics but not advertising',()=>{
 const a=analytics();assert.equal(a.requests.length,0);assert.equal(a.ctx.dataLayer,undefined);assert.equal(a.panel.hidden,false);
 a.allow.click();assert.equal(a.requests.length,1);assert.equal(a.panel.hidden,true);
 const events=a.ctx.dataLayer.map(x=>Array.from(x));
 assert(events.some(x=>x[0]==='consent'&&x[1]==='update'&&x[2].analytics_storage==='granted'));
 assert(!events.some(x=>x[2]?.ad_storage==='granted'));
 assert.equal(events.filter(x=>x[0]==='event'&&x[1]==='page_view').length,1);
 assert(!JSON.stringify(events).includes('private'));assert(!JSON.stringify(events).includes('3-5'));
 a.ctx.globeeTrack('social_visit',{social_platform:'instagram',region:'Bristol',query:'private'});
 assert(JSON.stringify(a.ctx.dataLayer).includes('instagram'));assert(!JSON.stringify(a.ctx.dataLayer).includes('private'));
 a.allow.click();assert.equal(a.requests.length,1);assert.equal(a.ctx.dataLayer.filter(x=>x[1]==='page_view').length,1);
});
test('Refusal, withdrawal, re-acceptance and saved consent work on the same page',()=>{
 const a=analytics();a.deny.click();assert.equal(a.requests.length,0);assert.equal(a.panel.hidden,true);
 a.toggle.click();assert.equal(a.panel.hidden,false);a.allow.click();assert.equal(a.requests.length,1);
 a.toggle.click();a.deny.click();const count=a.ctx.dataLayer.length;a.ctx.globeeTrack('switch_view',{view:'map'});assert.equal(a.ctx.dataLayer.length,count);assert(a.ctx['ga-disable-G-YRRY654LS1']);
 a.allow.click();assert.equal(a.requests.length,1);assert.equal(a.ctx['ga-disable-G-YRRY654LS1'],false);assert.equal(a.ctx.dataLayer.filter(x=>x[1]==='page_view').length,2);
 assert.equal(analytics('globeeuk.github.io',Object.fromEntries(a.store)).requests.length,1);
});
test('Existing refusals are preserved; absence of opt-out does not mean consent',()=>{
 for(const seed of [{'globee-analytics-choice':'denied'},{'globee-analytics-opt-out':'true'},{'globee-analytics-consent-v2':'denied'}]){
  const a=analytics('globeeuk.github.io',seed);assert.equal(a.requests.length,0);assert.equal(a.panel.hidden,true);a.toggle.click();a.allow.click();assert.equal(a.requests.length,1);assert.equal(a.store.has('globee-analytics-opt-out'),false);assert.equal(a.store.has('globee-analytics-choice'),false);
 }
 assert.equal(analytics('globeeuk.github.io',{'globee-analytics-opt-out':'false'}).requests.length,0);
});
test('Local previews never contact GA even after allowing',()=>{const a=analytics('127.0.0.1');a.allow.click();assert.equal(a.requests.length,0);assert.equal(a.ctx.dataLayer,undefined);});
test('All public entry pages use the revised settings control and script',()=>{for(const name of ['index.html','plans.html','halloween.html','privacy.html','exeter/index.html','exeter/this-weekend/index.html','exeter/free-things-to-do/index.html','exeter/rainy-day/index.html','bristol/index.html','bristol/this-weekend/index.html']){const html=source(name);assert(html.includes('data-analytics-toggle'),name);assert(html.includes('analytics.js?v=consent2'),name);assert(!html.includes('Stop site analytics</button>'),name);}});
function loader(fetch){const updates=[],status={innerHTML:'',parts:[],append(n){this.parts.push(n);}},snap={schema:1,fetchedAt:'2026-09-01T10:00:00Z',master:[{name:'saved'}],events:[{name:'saved'}]};const ctx={console,Date,JSON,Promise,AbortController,setTimeout,clearTimeout,fetch,localStorage:{getItem(){return null;},setItem(){}},document:{getElementById:()=>status,createTextNode:t=>t,createElement:()=>({addEventListener(){}})},CustomEvent:class{constructor(name,arg){this.detail=arg.detail;}},GLOBEE_SNAPSHOT:snap,GLOBEE_EDITORIAL:{},GlobeeDB:{validate(m,e){if(!m.length||!e.length)throw Error('empty');},parseCSV(s){if(s==='bad')throw Error('bad');return [{name:s}];},normalise:(m,e)=>m},dispatchEvent:e=>updates.push(e.detail)};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('db-loader.js'),ctx);return {updates,status};}
test('Loss of connection retains saved results and offers retry',async()=>{const a=loader(()=>Promise.reject(Error('offline')));await new Promise(setImmediate);assert.equal(a.updates.length,0);assert(a.status.parts.some(p=>typeof p==='string'&&p.includes('saved directory')));assert(a.status.parts.some(p=>p.textContent==='Refresh'));});
test('Live refresh replaces data only after both sheets succeed',async()=>{const a=loader(async url=>({ok:true,text:async()=>url.includes('gid=0&')?'new master':'new events'}));await new Promise(setImmediate);assert.equal(a.updates.length,1);assert.equal(a.updates[0].places[0].name,'new master');const bad=loader(async url=>({ok:true,text:async()=>url.includes('gid=0&')?'new master':'bad'}));await new Promise(setImmediate);assert.equal(bad.updates.length,0);});
