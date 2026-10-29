const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('parent-notes/amsterdam-with-kids/index.html'),url='https://globeeuk.github.io/parent-notes/amsterdam-with-kids/';
test('Amsterdam is one indexable static Parent note with truthful publication metadata',()=>{
 assert(html.includes('<link rel="canonical" href="'+url+'">'));
 assert.match(html,/<meta name="robots" content="index,follow">/);
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
 const post=schemas.find(g=>g['@type']==='BlogPosting');
 assert.equal(post.url,url);assert.equal(post.author.name,'Yewon');assert.equal(post.datePublished,'2026-10-29');
 assert.equal(schemas.find(g=>g['@type']==='BreadcrumbList').itemListElement.length,3);
 assert.match(read('sitemap.xml'),/https:\/\/globeeuk.github.io\/parent-notes\/amsterdam-with-kids\//);
 for(const id of ['friday','saturday','sunday','monday','tuesday','wednesday','spots','nearby','stay','map','practical','uk-flights'])assert(html.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/PRIVATE DRAFT|review-toggle|editor-note|photo-review|>To add<|Actual menu|bill to add|still needs|still need|noindex|\/Users\//i);
});
test('Travel discovery is compact and shared across all existing regions, not another main banner',()=>{
 const home=read('index.html');
 assert.match(home,/<article class="notebook-note-card" data-notes-region="Exeter Bristol Nottingham">/);
 assert(home.indexOf('/parent-notes/amsterdam-with-kids/')<home.indexOf('/parent-notes/exeter-childrens-classes-costs/'));
 assert.match(home,/href="\/parent-notes\/exeter-birthday-parties\/"/);
});
test('Only twelve supplied web photos ship, with no unlicensed room photo or original media',()=>{
 const source=JSON.parse(read('qa/amsterdam-family-travel-sources-2026-10-29.json'));
 assert.equal(source.photos.files.length,12);
 assert.deepEqual(fs.readdirSync(path.join(root,'assets/parent-notes/amsterdam')).sort(),source.photos.files.slice().sort());
 for(const src of html.matchAll(/<img[^>]+src="([^"]+)"/g))assert(fs.existsSync(path.join(root,src[1])),src[1]);
 assert.match(html,/See official family-room photos &amp; information/);
 assert.doesNotMatch(html,/stayokay-family-room-reference|\.HEIC|\.MOV/);
 assert.match(read('parent-notes/amsterdam-with-kids/travel.js'),/figure img\[data-trip-photo\]/);
 assert.match(html,/cannot prevent screenshots/);
});
test('Qualifications and existing privacy controls are retained',()=>{
 for(const text of ['Planned, then cancelled','NOT VISITED','Zuid-Kennemerland','Zaanse Schans','not an all-hotel cost comparison','If you choose a GVB day ticket','East Midlands (EMA) currently says it is not flying'])assert(html.includes(text),text);
 for(const text of ['/basic-analytics.js?v=basic2','/analytics.js?v=music-banner-click1','data-analytics-toggle','/privacy.html'])assert(html.includes(text),text);
 assert.doesNotMatch(read('parent-notes/amsterdam-with-kids/travel.js'),/fetch\(|gtag|sendBeacon|localStorage|document.cookie/);
});
