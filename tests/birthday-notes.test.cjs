const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const html=read('parent-notes/exeter-birthday-parties/index.html');
test('The birthday note is an indexable static article with all nineteen providers',()=>{
 assert.equal((html.match(/data-provider-id=/g)||[]).length,19);
 assert.match(html,/<html lang="en-GB">/);
 assert.match(html,/<link rel="canonical" href="https:\/\/globeeuk.github.io\/parent-notes\/exeter-birthday-parties\/">/);
 assert.match(html,/<meta name="robots" content="index,follow">/);
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(schema['@type'],'BlogPosting');assert.equal(schema.author.name,'Yewon');
 assert.doesNotMatch(html,/__PROVIDER_DATA__|bp-view-outline|bp-reviewbar|openai|Private design|data:image/);
 assert.match(read('sitemap.xml'),/https:\/\/globeeuk.github.io\/parent-notes\/exeter-birthday-parties\//);
});
test('The note retains compact hall limits, entertainment, savings and uncertainty',()=>{
 assert.equal((html.match(/data-hire-fact="Capacity"/g)||[]).length,5);
 assert.equal((html.match(/data-hire-fact="Min hire"/g)||[]).length,5);
 assert.equal((html.match(/data-hire-fact="Max hire"/g)||[]).length,5);
 for(const value of ['Ask venue','Ozzy D','Mr Phil','Devon Science','Miss Sparkles','Meraki','No Exeter children’s-party January voucher sale has been verified','50 seated / 70 standing'])assert(html.includes(value),value);
 assert.match(html,/Studio party prices are not a quote/);
 assert.match(html,/not a review of a party we’ve already held/);
});
test('Only licensed photographs ship; the other six venues link to official galleries',()=>{
 assert.equal((html.match(/class="bp-venue-photo"/g)||[]).length,2);
 assert.equal((html.match(/Venue photos on official site/g)||[]).length,6);
 for(const id of ['iplay','wonderland','sidwells','parklife','wonford','longdown'])assert(!fs.existsSync(path.join(__dirname,'../assets/parent-notes',id+'.jpg')));
 for(const src of html.matchAll(/<img[^>]+src="([^"]+)"/g))assert(fs.existsSync(path.join(__dirname,'..',src[1])));
 assert.match(html,/CC BY-SA 2.0/);assert.match(html,/Sam Grozyan/);
});
test('Existing analytics scripts and settings remain, with no new tracking in article behaviour',()=>{
 assert.match(html,/basic-analytics.js\?v=basic2/);assert.match(html,/analytics.js\?v=music-banner-click1/);
 assert.match(html,/data-analytics-toggle/);
 assert.doesNotMatch(read('parent-notes/birthday.js'),/localStorage|document.cookie|fetch\(|gtag|sendBeacon/);
 assert.match(html,/href="\/classes.html"/);
});
test('Birthday planning has valid breadcrumbs and crawlable links from the Exeter guides',()=>{
 const graphs=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
 const breadcrumb=graphs.find(g=>g['@type']==='BreadcrumbList');
 assert.equal(breadcrumb.itemListElement.length,3);
 assert.deepEqual(breadcrumb.itemListElement.map(e=>e.position),[1,2,3]);
 assert.match(html,/href="\/exeter\/"/);
 for(const file of ['exeter/index.html','exeter/this-weekend/index.html','exeter/free-things-to-do/index.html','exeter/rainy-day/index.html'])assert.match(read(file),/href="\/parent-notes\/exeter-birthday-parties\/">Exeter birthday parties &amp; hall hire<\/a>/);
});
