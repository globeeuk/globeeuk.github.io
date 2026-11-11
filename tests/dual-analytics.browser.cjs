// Local-only integration check: every third-party request is intercepted.
// UMAMI_SCRIPT_FIXTURE points to the official script saved for this review.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const TEST_ID='00000000-0000-4000-8000-000000000001';
const vendor=fs.readFileSync(process.env.UMAMI_SCRIPT_FIXTURE,'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 async function scenario(seed={},options={}){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const scripts=[],sends=[];
  await context.addInitScript(({seed,options})=>{
   if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}
   if(options.gpc)Object.defineProperty(navigator,'globalPrivacyControl',{value:true});
   if(options.storageFails)Storage.prototype.setItem=function(){throw Error('blocked');};
  },{seed,options});
  await context.route('**/*',route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.hostname===(options.local?'localhost':'globeeuk.github.io')){
    const file=path.join(__dirname,'..',u.pathname==='/'?'index.html':u.pathname);
    if(u.pathname==='/basic-analytics.js'){
     let source=fs.readFileSync(file,'utf8');
     source=source.replace(/const UMAMI_WEBSITE_ID='[^']*';/,`const UMAMI_WEBSITE_ID='${options.unconfigured?'':TEST_ID}';`);
     return route.fulfill({contentType:'application/javascript',body:source});
    }
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
    return route.fulfill({status:404,body:''});
   }
   if(request.resourceType()==='script')scripts.push(u.hostname);
   if(u.hostname==='cloud.umami.is'&&u.pathname==='/script.js')return route.fulfill({contentType:'application/javascript',body:vendor});
   if(request.method()==='POST')sends.push(JSON.parse(request.postData()));
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({cache:'test-cache'})});
  });
  const page=await context.newPage();
  await page.goto(`https://${options.local?'localhost':'globeeuk.github.io'}/privacy.html?q=private-name&age=3#private`,{referer:'https://example.org/private-path?email=private@example.org'});
  await page.waitForLoadState('networkidle');
  return {context,page,scripts,sends};
 }
 try{
  const empty=await scenario({}, {unconfigured:true});
  assert.deepEqual(empty.scripts,['static.cloudflareinsights.com']);assert.equal(empty.sends.length,0);await empty.context.close();
  const a=await scenario();
  assert.deepEqual(a.scripts,['static.cloudflareinsights.com','cloud.umami.is']);
  assert.equal(a.sends.length,1,'one initial pageview');
  const first=a.sends[0];assert.equal(first.type,'event');assert.equal(first.payload.url,'/privacy.html');assert.equal(first.payload.referrer,'https://example.org');
  assert.equal(first.payload.website,TEST_ID);assert(!JSON.stringify(first).includes('private'));assert.equal((await a.context.cookies()).length,0);
  await a.page.evaluate(()=>history.pushState(null,'','?q=another-private#results'));await a.page.waitForLoadState('networkidle');assert.equal(a.sends.length,1,'filter changes are not pageviews');
  await a.page.reload();await a.page.waitForLoadState('networkidle');assert.equal(a.sends.length,2,'a document reload is a separate pageview');
  const hook=await a.page.evaluate(()=>({event:window.globeeUmamiBeforeSend('event',{name:'unexpected',data:{email:'private'}}),identify:window.globeeUmamiBeforeSend('identify',{id:'private'})}));
  assert.equal(hook.event,false);assert.equal(hook.identify,false);
  await a.page.getByRole('button',{name:'Stop basic statistics',exact:true}).click();await a.page.waitForLoadState('networkidle');
  assert.equal(a.sends.length,2);assert.equal(a.scripts.filter(x=>x==='static.cloudflareinsights.com').length,2);assert.equal(a.scripts.filter(x=>x==='cloud.umami.is').length,2);
  await a.page.reload();await a.page.waitForLoadState('networkidle');assert.equal(a.sends.length,2);await a.context.close();
  for(const seed of [{'globee-analytics-opt-out':'true'},{'globee-analytics-choice':'denied'},{'globee-analytics-consent-v2':'denied'},{'globee-basic-analytics-v1':'off'}]){
   const a=await scenario(seed);assert.equal(a.scripts.length,0);assert.equal(a.sends.length,0);await a.context.close();
  }
  for(const options of [{gpc:true},{local:true},{storageFails:true}]){
   const a=await scenario({},options);assert.equal(a.scripts.length,0);assert.equal(a.sends.length,0);await a.context.close();
  }
  console.log('PASS: official Umami script, one pageview per document, query/referrer minimisation, unchanged Cloudflare, empty ID disabled, shared withdrawal, legacy refusals, GPC, local preview, storage failure. All requests intercepted; no real analytics data sent.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
