const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function analytics(hostname='globeeuk.github.io',seed={},options={}){
 const requests=[],store=new Map(Object.entries(seed)),listeners={};
 const button=value=>({dataset:{analyticsChoice:value},textContent:'',attrs:{},addEventListener(k,fn){this[k]=fn;},setAttribute(k,v){this.attrs[k]=v;},focus(){}});
 const allow=button('granted'),deny=button('denied'),toggle=button(),status={textContent:''};
 const panel={setAttribute(){},querySelectorAll:()=>[allow,deny],querySelector:()=>allow,scrollIntoView(){}};
 const document={title:'Globee',cookie:'_ga=old',referrer:options.referrer??'https://example.org/?private=yes',head:{appendChild:s=>requests.push(s)},createElement:t=>t==='section'?panel:{},querySelector:()=>({prepend(){}}),querySelectorAll:s=>s==='[data-analytics-toggle]'?[toggle]:s==='[data-analytics-status]'?[status]:[],addEventListener(type,fn){listeners[type]=fn;}};
 const ctx={document,location:{hostname,origin:'https://'+hostname,pathname:'/plans.html',search:options.search??'?q=private-name&age=3-5'},URL,Date,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('analytics.js'),ctx);return {ctx,toggle,status,requests,store,allow,deny,panel,listeners};
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
test('All public entry pages use the revised settings control and script',()=>{for(const name of ['index.html','plans.html','halloween.html','ice-cream.html','privacy.html','exeter/index.html','exeter/this-weekend/index.html','exeter/free-things-to-do/index.html','exeter/rainy-day/index.html','bristol/index.html','bristol/this-weekend/index.html','bristol/edit/index.html']){const html=source(name);assert(html.includes('data-analytics-toggle'),name);assert(html.includes('analytics.js?v=consent4'),name);assert(html.includes('basic-analytics.js?v=basic2'),name);assert(html.indexOf('basic-analytics.js')<html.indexOf('analytics.js?v=consent4'),name);assert(!html.includes('Stop site analytics</button>'),name);}});
test('Initial campaign labels survive URL cleaning and filter changes, only after consent',()=>{
 const a=analytics(undefined,{}, {search:'?utm_source=ig&utm_medium=social&utm_campaign=winter_2026&utm_content=link_in_bio&utm_id=nov12&q=private-name&age=3-5&utm_term=private-term'});
 assert.equal(a.ctx.dataLayer,undefined);
 a.ctx.location.search='?q=another-private-name';a.allow.click();
 const event=a.ctx.dataLayer.find(x=>x[0]==='event'&&x[1]==='page_view')[2];
 assert.equal(event.page_location,'https://globeeuk.github.io/plans.html');
 for(const [key,value] of Object.entries({campaign_source:'ig',campaign_medium:'social',campaign_name:'winter_2026',campaign_content:'link_in_bio',campaign_id:'nov12'}))assert.equal(event[key],value);
 assert(!JSON.stringify(a.ctx.dataLayer).includes('private'));assert(!JSON.stringify(a.ctx.dataLayer).includes('3-5'));
});
test('Invalid campaign values and malformed referrers do not leak or stop collection',()=>{
 const a=analytics(undefined,{}, {search:'?utm_source=test%40example.com&utm_medium=email&utm_content=child%20name&utm_campaign='+ 'a'.repeat(101),referrer:'not a valid URL'});a.allow.click();
 const event=a.ctx.dataLayer.find(x=>x[0]==='event'&&x[1]==='page_view')[2];
 assert.equal(event.campaign_medium,'email');for(const k of ['campaign_source','campaign_content','campaign_name'])assert.equal(event[k],undefined);
 assert(!JSON.stringify(a.ctx.dataLayer).includes('test@example.com'));assert.equal(a.requests.length,1);
});
test('Map, weekend, sample and form actions respect consent without adding page views',()=>{
 const a=analytics();
 const click=(dataset={},matches=[],href)=>{
  const element={dataset,tagName:href?'A':'BUTTON',href,matches:s=>matches.includes(s),closest:()=>({querySelector:()=>({dataset:{marketRegion:'devon'}})})};
  a.listeners.click({target:{closest:()=>element}});
 };
 click({marketTown:'Totnes'});assert.equal(a.ctx.dataLayer,undefined);a.allow.click();
 click({marketTown:'Totnes'});click({marketRegion:'cornwall'});click({plansWindow:'four-weeks'});click({rail:'weekend-picks',direction:'1'});
 click({},[], 'https://globeeuk.github.io/weekend-edit/sample/');
 click({},['.market-map-event a'],'https://provider.example/event?private=ignored');
 a.listeners.toggle({target:{id:'weekend-newsletter-signup',open:true}});a.listeners.toggle({target:{id:'weekend-newsletter-signup',open:false}});
 const events=a.ctx.dataLayer.filter(x=>x[0]==='event');
 for(const name of ['page_view','market_town_select','market_area_select','weekend_period_select','weekend_list_move','newsletter_sample_open','provider_visit','newsletter_form_open'])assert.equal(events.filter(x=>x[1]===name).length,1,name);
 assert(!JSON.stringify(events).includes('private'));assert(!events.some(x=>/submit|sign_up/.test(x[1])));
 a.deny.click();const count=a.ctx.dataLayer.length;click({marketTown:'Totnes'});a.listeners.toggle({target:{id:'weekend-newsletter-signup',open:true}});assert.equal(a.ctx.dataLayer.length,count);
});
test('Published sample uses the shared consent and basic statistics controls',()=>{
 const html=source('weekend-edit/sample/index.html');
 assert.equal((html.match(/src="\/analytics.js\?v=consent4"/g)||[]).length,1);
 assert.equal((html.match(/src="\/basic-analytics.js\?v=basic2"/g)||[]).length,1);
 assert(html.includes('data-analytics-toggle'));assert(html.includes('href="/privacy.html"'));
});
function loader(fetch){const updates=[],status={innerHTML:'',parts:[],append(n){this.parts.push(n);}},snap={schema:1,fetchedAt:'2026-09-01T10:00:00Z',master:[{name:'saved'}],events:[{name:'saved'}]};const ctx={console,Date,JSON,Promise,AbortController,setTimeout,clearTimeout,fetch,localStorage:{getItem(){return null;},setItem(){}},document:{getElementById:()=>status,createTextNode:t=>t,createElement:()=>({addEventListener(){}})},CustomEvent:class{constructor(name,arg){this.detail=arg.detail;}},GLOBEE_SNAPSHOT:snap,GLOBEE_EDITORIAL:{},GlobeeDB:{publicationHistory:require('../db-adapter.js').publicationHistory,validate(m,e){if(!m.length||!e.length)throw Error('empty');},parseCSV(s){if(s==='bad')throw Error('bad');return [{name:s}];},normalise:(m,e)=>m},dispatchEvent:e=>updates.push(e.detail)};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('db-loader.js'),ctx);return {updates,status};}
test('Loss of connection retains saved results and offers retry',async()=>{const a=loader(()=>Promise.reject(Error('offline')));await new Promise(setImmediate);assert.equal(a.updates.length,0);assert(a.status.parts.some(p=>typeof p==='string'&&p.includes('saved directory')));assert(a.status.parts.some(p=>p.textContent==='Refresh'));});
test('Live refresh replaces data only after both sheets succeed',async()=>{const a=loader(async url=>({ok:true,text:async()=>url.includes('gid=0&')?'new master':'new events'}));await new Promise(setImmediate);assert.equal(a.updates.length,1);assert.equal(a.updates[0].places[0].name,'new master');const bad=loader(async url=>({ok:true,text:async()=>url.includes('gid=0&')?'new master':'bad'}));await new Promise(setImmediate);assert.equal(bad.updates.length,0);});
