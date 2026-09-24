// Run with Playwright available in NODE_PATH and CHROME_PATH set if needed.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 async function scenario(seed={},options={}){
  const context=await browser.newContext({viewport:{width:390,height:844}}),requests=[];
  await context.addInitScript(({seed,options})=>{
   if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}
   if(options.gpc)Object.defineProperty(navigator,'globalPrivacyControl',{value:true});
   if(options.storageFails)Storage.prototype.setItem=function(){throw Error('blocked');};
  },{seed,options});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname===(options.local?'localhost':'globeeuk.github.io')){
    const file=path.join(__dirname,'..',u.pathname==='/'?'index.html':u.pathname);
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
    return route.fulfill({status:404,body:''});
   }
   if(/cloudflareinsights|googletagmanager/.test(u.hostname))requests.push(u.hostname);
   return route.fulfill({status:200,body:'',contentType:'application/javascript'});
  });
  const page=await context.newPage();await page.goto(`https://${options.local?'localhost':'globeeuk.github.io'}/privacy.html?q=private&age=3`);await page.waitForLoadState('networkidle');
  return {context,page,requests};
 }
 try{
  const a=await scenario();assert.deepEqual(a.requests,['static.cloudflareinsights.com']);assert.equal((await a.context.cookies()).length,0);
  assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await a.page.getByRole('button',{name:'No thanks',exact:true}).click();await a.page.reload();await a.page.waitForLoadState('networkidle');
  assert.deepEqual(a.requests,['static.cloudflareinsights.com','static.cloudflareinsights.com']);
  await a.page.getByRole('button',{name:'Stop basic statistics',exact:true}).click();await a.page.waitForLoadState('networkidle');
  assert.equal(a.requests.length,2);await a.page.reload();await a.page.waitForLoadState('networkidle');assert.equal(a.requests.length,2);
  await a.context.close();
  for(const seed of [{'globee-analytics-opt-out':'true'},{'globee-analytics-choice':'denied'},{'globee-analytics-consent-v2':'denied'},{'globee-basic-analytics-v1':'off'}]){
   const a=await scenario(seed);assert.equal(a.requests.length,0);await a.context.close();
  }
  for(const options of [{gpc:true},{local:true},{storageFails:true}]){const a=await scenario({},options);assert.equal(a.requests.length,0);await a.context.close();}
  const b=await scenario();await b.page.getByRole('button',{name:'Allow analytics',exact:true}).click();await b.page.waitForLoadState('networkidle');assert(b.requests.includes('www.googletagmanager.com'));assert.equal(b.requests.filter(x=>x==='static.cloudflareinsights.com').length,1);await b.context.close();
  console.log('PASS: default cookie-free counts, GA separation, withdrawal/reload, legacy refusals, GPC, storage failure, local previews, mobile width.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
