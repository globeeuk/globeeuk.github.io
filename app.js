'use strict';
const PATHS={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',chevron:'<path d="m6 9 6 6 6-6"/>',map:'<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Z"/><path d="M9 3v15M15 6v15"/>',list:'<rect x="3" y="4" width="5" height="5" rx="1"/><rect x="3" y="15" width="5" height="5" rx="1"/><path d="M12 5h9M12 8h7M12 16h9M12 19h7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',activity:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',cafe:'<path d="M4 4h12v10a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h2a3 3 0 1 1 0 6h-2M3 22h15"/>',ice:'<path d="M5 9a7 7 0 0 1 14 0M5 9h14l-7 13ZM8 9l4 10M16 9l-4 10"/>',club:'<path d="m3 20 9-16 9 16ZM12 4v16M8 20l4-7 4 7"/>',art:'<path d="m14 3 7 7-9 9-8 1 1-8Z"/><path d="m5 12 7 7M14 3l-3 3 7 7 3-3"/>',outdoors:'<path d="m12 2 6 8h-3l5 7H4l5-7H6ZM12 17v5"/>'};
PATHS.calendar='<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M7 15h2M13 15h2M7 18h2"/>';
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]||PATHS.activity}</svg>`;}
document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
const $=s=>document.querySelector(s);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const isPlansPage=document.body.dataset.page==='plans';
const routeParams=new URLSearchParams(window.location.search);
const PAGE_SIZE=12,HOME_RAIL_LIMIT=6;
const requestedPage=Number(routeParams.get('page'));
const state={region:routeParams.get('region')==='Nottingham'?'Nottingham':'Exeter',age:[],price:'all',type:'all',query:'',dates:null,collection:null,view:'list',browseAll:false,page:isPlansPage&&Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1};
const ageBands=[{id:'0-2',label:'0–2',min:0,max:2},{id:'3-5',label:'3–5',min:3,max:5},{id:'6-8',label:'6–8',min:6,max:8},{id:'9-12',label:'9–12',min:9,max:12},{id:'13+',label:'13+',min:13,max:17}];
const types=[['all','All types'],['activity','Activities'],['cafe','Cafés'],['ice','Ice cream'],['outdoors','Parks & nature'],['art','Arts & making'],['club','Holiday clubs']];
const availableTypes=isPlansPage?types.filter(([id])=>!['cafe','ice'].includes(id)):types;
let currentMenu=null,map=null,markers=[],selectedId=null,listScroll=0;
let mapPagePlaces=[];
const spotKey=p=>p.coords?.map(n=>Number(n).toFixed(4)).join(',');
let data=window.GLOBEE_PLACES||[];
const TODAY=window.GLOBEE_TODAY||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const utcDate=s=>new Date(s+'T12:00:00Z');
const isoDate=d=>d.toISOString().slice(0,10);
function addDays(s,n){const d=utcDate(s);d.setUTCDate(d.getUTCDate()+n);return isoDate(d);}
function dateShort(s){return utcDate(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});}
function dateRangeLabel(range){return range?range.start===range.end?dateShort(range.start):`${dateShort(range.start)} – ${dateShort(range.end)}`:'Any date';}
function shortcutDates(key){if(key==='all')return null;if(key==='today')return {start:TODAY,end:TODAY};if(key==='tomorrow'){const d=addDays(TODAY,1);return {start:d,end:d};}const day=utcDate(TODAY).getUTCDay(),start=day===0?TODAY:addDays(TODAY,(6-day+7)%7);return {start,end:day===0?TODAY:addDays(start,1)};}
function occursWithin(p,range){return !!range&&(p.datePeriods||[]).some(d=>d.start<=range.end&&d.end>=range.start);}
function isCurrent(p){return p.datePeriods?.length?p.datePeriods.some(d=>d.end>=TODAY):!p.endDate||p.endDate>=TODAY;}
function isFamilyPlan(p){return (['event','club'].includes(p.kind)||p.datePeriods?.length>0)&&isCurrent(p);}
function scheduleLabel(p){const periods=(p.datePeriods||[]).filter(d=>d.end>=TODAY&&( !state.dates||d.start<=state.dates.end&&d.end>=state.dates.start));return periods.length?dateRangeLabel(periods[0])+(periods.length>1?` · +${periods.length-1} dates`:''):p.dateNote||'Dates TBC';}
function pageLink(page){return `${page}?region=${encodeURIComponent(state.region==='Exeter'?'Devon':state.region)}`;}
function nextPlanDate(p){return (p.datePeriods||[]).filter(d=>d.end>=(state.dates?.start||TODAY)).map(d=>d.start<TODAY?TODAY:d.start).sort()[0]||'9999-12-31';}
if(isPlansPage){
  state.query=routeParams.get('q')||'';
  state.age=(routeParams.get('age')||'').split(',').filter(id=>ageBands.some(b=>b.id===id));
  if(['free','paid'].includes(routeParams.get('price')))state.price=routeParams.get('price');
  if(availableTypes.some(([id])=>id===routeParams.get('type')))state.type=routeParams.get('type');
  const from=routeParams.get('from'),to=routeParams.get('to');
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(utcDate(s).getTime())&&isoDate(utcDate(s))===s;
  if(validDate(from)&&validDate(to)&&from<=to)state.dates={start:from,end:to};
}
function updatePlanRoute(){
  if(!isPlansPage)return;
  const params=new URLSearchParams();params.set('region',state.region==='Exeter'?'Devon':state.region);
  if(state.query)params.set('q',state.query);
  if(state.age.length)params.set('age',state.age.join(','));
  if(state.price!=='all')params.set('price',state.price);
  if(state.type!=='all')params.set('type',state.type);
  if(state.dates){params.set('from',state.dates.start);params.set('to',state.dates.end);}
  if(state.page>1)params.set('page',String(state.page));
  window.history.replaceState(null,'',`${window.location.pathname}?${params}`);
  $('#back-explore').href=pageLink('index.html');
  $('.brand').href=pageLink('index.html');
}
const collections=[
 {id:'best',badge:'THE LOCAL SHORTLIST',title:'BEST <strong>10</strong>',name:'BEST 10 · The local shortlist',caption:'Building a lasting shortlist',target:10,imageId:'ramm',note:'A lasting local shortlist, chosen across five criteria: things for children to do, practical facilities, value, reasons to return and local character. We are building this shortlist as practical details are checked.',criteria:[['Something for children','A clear activity, discovery or food stop that fits a family outing.'],['Practical to visit','Consider travel, toilets, buggy access, seating and booking needs; show anything still to be confirmed.'],['Worth the spend','Weigh the whole visit, including food, parking and extra activities.'],['Worth returning to','Favour regular places with more than a one-off reason to visit.'],['A sense of place','Include local character and a balance of ages, budgets, activities and locations.']],exclusion:'We choose the ten as a balanced set, not by Google rating alone. The list grows as we check candidates; we do not fill ten places just to reach a number.'},
 {id:'rain',badge:'A PLAN UNDER COVER',title:'Rainy-day<br>rescues',name:'Rainy-day rescues',caption:'Something to do indoors',imageId:'ramm',note:'Regular indoor places where children can explore, make or play when the weather turns. Each pick names the indoor activity; check opening times and any age or booking conditions.',criteria:[['The main activity is indoors','A visit should work without relying on a garden, outdoor play area or fine weather.'],['Something to do','Look for exhibits to explore, hands-on activities, making or indoor play. A café seat alone does not qualify.'],['A practical family visit','Check age suitability, opening and booking arrangements, access and toilets. Unconfirmed details stay TBC.']],exclusion:'Temporary exhibitions stay with dated events. Where a venue has both indoor and outdoor areas, this edit recommends only the named indoor part.'},
 {id:'eat-play',badge:'A BITE. THEN AN ADVENTURE.',title:'Eat, then<br>play',name:'Eat, then play',caption:'Food stops with play nearby',imageId:'cow-cacao',note:'A food stop paired with a named outdoor play space, on the same site or a checked short walk away. Each pick shows both parts of the outing.',criteria:[['Food children can choose','Confirm the menu, food costs and whether the stop is sit-in or takeaway.'],['A real place to play','Name a playground or a suitable park space. Outdoor tables or a waterside pavement alone do not qualify.'],['An easy connection','Use the same site, or a walking route checked at about ten minutes or less. Record crossings, access and toilets; do not guess walking times.']],exclusion:'The food and play pairing is checked separately from Google ratings. Weather, supervision and age suitability still matter; unverified facilities are marked TBC.'}
];
function inCollection(p,id){return !p.datePeriods&&(p.collections||[]).includes(id);}
let draftDates=null,calendarMonth=TODAY.slice(0,7),calendarPickingEnd=false;
const railObservers=[];
let lastListSignature='';
let lastFilterSignature=null,lastGuideRegion=null;
function matches(p,ignore){
  if(!isCurrent(p))return false;
  if(isPlansPage&&!isFamilyPlan(p))return false;
  if(ignore!=='region'&&p.region!==state.region)return false;
  if(ignore!=='dates'&&state.dates&&!occursWithin(p,state.dates))return false;
  if(ignore!=='collection'&&state.collection&&!inCollection(p,state.collection))return false;
  if(ignore!=='price'&&state.price!=='all'&&p.priceType!==state.price)return false;
  if(ignore!=='type'&&state.type!=='all'&&!(p.type===state.type||(state.type==='activity'&&['club','art','outdoors'].includes(p.type))))return false;
  if(ignore!=='age'&&state.age.length){
    if(!p.ages)return false;
    if(!state.age.some(id=>{const b=ageBands.find(v=>v.id===id);return p.ages[0]<=b.max&&p.ages[1]>=b.min;}))return false;
  }
  if(ignore!=='search'&&state.query){
    const text=[p.name,p.description,p.address,p.type,p.category,...(p.keywords||[])].join(' ').toLowerCase();
    if(!state.query.toLowerCase().trim().split(/\s+/).every(word=>text.includes(word)))return false;
  }
  return true;
}
function visiblePlaces(){const places=data.filter(p=>matches(p));return isPlansPage?places.sort((a,b)=>nextPlanDate(a).localeCompare(nextPlanDate(b))||a.name.localeCompare(b.name)):places;}
function fallback(p){return `<div class="photo-fallback">${icon(p.type)}<span>${escapeHTML(p.category)}</span></div>`;}
function imageTag(p,alt=p.imageAlt||p.name){return `<img data-src="${escapeHTML(p.image)}" data-place-id="${escapeHTML(p.id)}" alt="${escapeHTML(alt)}" draggable="false" loading="lazy" decoding="async" width="640" height="426" referrerpolicy="no-referrer">`;}
function photo(p){return p.image?`${imageTag(p)}<span class="photo-credit">Photo: ${escapeHTML(p.credit)}</span>`:fallback(p);}
function meta(p){return `<span class="price ${p.priceType==='free'?'free':''}">${escapeHTML(p.priceLabel)}</span><span class="meta-dot">·</span><span class="age">${escapeHTML(p.ageLabel||'Age TBC')}</span>`;}
function locality(p){return `<span class="card-locality ${p.region==='Nottingham'?'nottingham':''}">${icon('pin')}${p.region==='Exeter'?'Exeter · Devon':'Nottingham'}</span>`;}
const observedImages=new Set(),preparedImages=new WeakSet();
function loadImage(img){const src=img.dataset.src;if(!src||!img.isConnected)return;img.src=src;delete img.dataset.src;imageObserver?.unobserve(img);observedImages.delete(img);}
const imageObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)loadImage(entry.target);});},{rootMargin:'80px 0px',threshold:0.01}):null;
function fixImages(container){
  for(const img of observedImages)if(!img.isConnected){imageObserver?.unobserve(img);observedImages.delete(img);}
  container.querySelectorAll('img[data-src]').forEach(img=>{
    if(!preparedImages.has(img)){
      preparedImages.add(img);
      img.addEventListener('error',()=>{const p=data.find(v=>v.id===img.dataset.placeId);if(p&&img.parentElement.matches('.picture,.detail-picture'))img.parentElement.innerHTML=fallback(p);else img.remove();},{once:true});
    }
    if(imageObserver){imageObserver.observe(img);observedImages.add(img);}else loadImage(img);
  });
}
function card(p){return `<article class="place-card"><button class="card-open" data-open="${escapeHTML(p.id)}" aria-label="View ${escapeHTML(p.name)}"><div class="picture">${photo(p)}${p.image?`<span class="category-badge">${icon(p.type)}${escapeHTML(p.category)}</span>`:''}</div><div class="card-body">${locality(p)}<div class="card-heading"><h3>${escapeHTML(p.name)}</h3>${icon('arrow')}</div><p class="card-description">${escapeHTML(p.editReasons?.[state.collection]||p.description)}</p><div class="card-meta">${meta(p)}</div>${(p.dateNote||p.datePeriods?.length)?`<p class="date-note ${p.datePeriods?'event-date':''}">${p.datePeriods?icon('calendar'):''}${escapeHTML(scheduleLabel(p))}</p>`:''}</div></button></article>`;}
function hasFilters(){return state.browseAll||state.age.length||state.price!=='all'||state.type!=='all'||state.query||state.dates||state.collection;}
function pageResults(places){const pages=Math.max(1,Math.ceil(places.length/PAGE_SIZE));state.page=Math.min(Math.max(1,state.page),pages);const start=(state.page-1)*PAGE_SIZE;return {items:places.slice(start,start+PAGE_SIZE),start,total:places.length,pages};}
function renderPagination(page,enabled){
  const container=$('#results-pagination');container.hidden=!enabled||!page.total;
  if(container.hidden){container.innerHTML='';return;}
  const button=(n,label,disabled=false)=>`<button type="button" data-results-page="${n}" ${disabled?'disabled':''} ${n===state.page?'aria-current="page"':''} aria-label="${typeof label==='number'?`Page ${n}`:label}">${label}</button>`;
  const numbers=[1,state.page-1,state.page,state.page+1,page.pages].filter((n,i,all)=>n>=1&&n<=page.pages&&all.indexOf(n)===i).sort((a,b)=>a-b);
  let previous=0;
  const links=numbers.map(n=>{const gap=previous&&n-previous>1?'<span aria-hidden="true">…</span>':'';previous=n;return gap+button(n,n);}).join('');
  container.innerHTML=`<p class="page-range" role="status">Showing ${page.start+1}–${page.start+page.items.length} of ${page.total}<span>Up to ${PAGE_SIZE} per page</span></p>${page.pages>1?`<nav class="page-controls" aria-label="Results pages">${button(state.page-1,'Previous',state.page===1)}<div class="page-numbers">${links}</div>${button(state.page+1,'Next',state.page===page.pages)}</nav>`:''}`;
}
function goToPage(n){if(!Number.isSafeInteger(n)||n<1)return;state.page=n;render();const heading=$('#results-heading');heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});listScroll=window.scrollY;}
function renderGuides(){
  if(lastGuideRegion===state.region){document.querySelectorAll('[data-collection]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.collection===state.collection)));return;}
  lastGuideRegion=state.region;
  const scrollPosition=$('#guide-rail').scrollLeft;
  $('#guide-rail').innerHTML=collections.map(c=>{
    const choices=data.filter(p=>p.region===state.region&&inCollection(p,c.id));
    const imagePlace=choices.find(p=>p.image);
    return `<button class="guide-cover ${c.id}" data-collection="${c.id}" ${choices.length?'':'disabled'} aria-pressed="${state.collection===c.id}">${imagePlace?.image?imageTag(imagePlace,''):''}<span class="guide-kicker">${c.badge}</span><span class="guide-name">${c.title}</span><span class="guide-caption">${c.caption}</span><span class="guide-sample">${!choices.length?'Being checked · coming soon':c.target?`${choices.length} picks · building our ten`:`${choices.length} ${choices.length===1?'pick':'picks'}`}</span><span class="guide-arrow">${icon('arrow')}</span></button>`;
  }).join('');
  $('#edits-criteria').innerHTML=collections.map(c=>`<section class="edit-method"><h3>${escapeHTML(c.name)}</h3><ul>${c.criteria.map(([label,reason])=>`<li><strong>${escapeHTML(label)}</strong><span>${escapeHTML(reason)}</span></li>`).join('')}</ul><p>${escapeHTML(c.exclusion)}</p></section>`).join('');
  $('#guide-rail').scrollLeft=scrollPosition;
  fixImages($('#guide-rail'));
}
function rail(id,title,subtitle,places,allLink=''){if(!places.length)return '';return `<section class="discovery-row" aria-labelledby="${id}-heading"><div class="rail-heading"><div><h3 id="${id}-heading">${escapeHTML(title)}</h3><p>${escapeHTML(subtitle)}</p></div><div class="rail-tools"><span>${places.length} ${places.length===1?'pick':'picks'}</span>${allLink?`<a class="view-all-link" href="${escapeHTML(allLink)}" aria-label="View all events and holiday clubs">View all${icon('arrow')}</a>`:''}<button class="rail-nav previous" data-rail="${id}" data-direction="-1" aria-label="Previous ${escapeHTML(title)} places">${icon('arrow')}</button><button class="rail-nav" data-rail="${id}" data-direction="1" aria-label="Next ${escapeHTML(title)} places">${icon('arrow')}</button></div></div><div id="${id}" class="place-rail" aria-label="${escapeHTML(title)}">${places.map(card).join('')}</div></section>`;}
function renderRails(places){
  if(isPlansPage){
    $('#discovery-rails').innerHTML=places.length?`<div class="plans-grid" aria-label="All matching events and holiday clubs">${places.map(card).join('')}</div>`:'';
    fixImages($('#discovery-rails'));return;
  }
  const active=collections.find(c=>c.id===state.collection);
  if(hasFilters())$('#main-plans').innerHTML='';
  if(hasFilters())$('#discovery-rails').innerHTML=(active?`<p class="guide-selection-note">${escapeHTML(active.note)}</p>`:'')+rail('filtered-places',state.dates?`Plans for ${dateRangeLabel(state.dates)}`:active?active.name:'Your little shortlist',state.dates?'Dated events and clubs · check opening and booking details on each card':'Swipe to explore the selection',places);
  else{
    const upcoming=places.filter(p=>p.type!=='club'&&isFamilyPlan(p)).sort((a,b)=>nextPlanDate(a).localeCompare(nextPlanDate(b)));
    const clubs=places.filter(p=>p.type==='club'&&(!p.datePeriods||p.datePeriods.some(d=>d.end>=TODAY)));
    const plans=[...upcoming,...clubs];
    const anytime=places.filter(p=>!isFamilyPlan(p));
    $('#main-plans').innerHTML=rail('family-plans','What’s on & holiday clubs','Upcoming events and holiday club options. View all to explore every date.',plans.slice(0,HOME_RAIL_LIMIT),pageLink('plans.html'))||`<div class="primary-plans-empty"><h2>What’s on &amp; holiday clubs</h2><p>No upcoming events or holiday clubs are listed for this region yet.</p><a class="view-all-link" href="${escapeHTML(pageLink('plans.html'))}">View all${icon('arrow')}</a></div>`;
    $('#discovery-rails').innerHTML=rail('local-list','Good places to have up your sleeve','Museums, outdoor stops and everyday family activities.',anytime.slice(0,HOME_RAIL_LIMIT))+(anytime.length>HOME_RAIL_LIMIT?'<button class="text-button browse-all-places" data-browse-all>See all places</button>':'');
  }
  fixImages($('#main-plans'));
  fixImages($('#discovery-rails'));setupRails();
}
function setupRails(){
  railObservers.splice(0).forEach(observer=>observer.disconnect());
  document.querySelectorAll('.place-rail').forEach(el=>{
    const previous=document.querySelector(`[data-rail="${el.id}"][data-direction="-1"]`),next=document.querySelector(`[data-rail="${el.id}"][data-direction="1"]`);
    const update=()=>{previous.disabled=el.scrollLeft<=2;next.disabled=el.scrollLeft+el.clientWidth>=el.scrollWidth-3;};
    el.addEventListener('scroll',update,{passive:true});const observer=new ResizeObserver(update);observer.observe(el);railObservers.push(observer);requestAnimationFrame(update);
    let startX=0,startScroll=0,dragging=false,moved=false;
    el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;dragging=true;moved=false;startX=e.clientX;startScroll=el.scrollLeft;});
    el.addEventListener('pointermove',e=>{if(!dragging)return;const delta=e.clientX-startX;if(Math.abs(delta)>6){moved=true;el.classList.add('dragging');el.scrollLeft=startScroll-delta;}});
    const end=()=>{dragging=false;el.classList.remove('dragging');};el.addEventListener('pointerup',end);el.addEventListener('pointerleave',end);
    el.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
  });
}
function render(){
  const places=visiblePlaces();
  const filterSignature=JSON.stringify([state.region,state.age,state.price,state.type,state.query,state.dates,state.collection,state.browseAll]);
  if(lastFilterSignature!==null&&lastFilterSignature!==filterSignature)state.page=1;
  lastFilterSignature=filterSignature;
  const paginated=isPlansPage||!!hasFilters()||state.view==='map',page=pageResults(places);
  updatePlanRoute();
  $('#region-label').textContent=state.region==='Exeter'?'Exeter · Devon':state.region;
  $('#dates-label').textContent=state.dates?dateRangeLabel(state.dates):'Dates';
  $('#age-label').textContent=state.age.length===1?ageBands.find(b=>b.id===state.age[0]).label:state.age.length?`Age (${state.age.length})`:'Age';
  $('#price-label').textContent=state.price==='all'?'Price':state.price==='free'?'Free':'Paid';
  $('#type-label').textContent=state.type==='all'?'Type':'Type (1)';
  document.querySelectorAll('[data-menu]').forEach(b=>b.classList.toggle('active',b.dataset.menu==='dates'?!!state.dates:b.dataset.menu==='age'?!!state.age.length:b.dataset.menu==='search'?!!state.query:b.dataset.menu==='region'?false:state[b.dataset.menu]!=='all'));
  $('#location-eyebrow').textContent=isPlansPage?(state.region==='Exeter'?'EXETER · DEVON':'NOTTINGHAM'):state.region==='Exeter'?'THE EXETER · DEVON EDIT':'THE NOTTINGHAM EDIT';
  $('#results-heading').textContent=isPlansPage?(state.view==='map'?'Explore on the map':hasFilters()?'Matching plans':'All upcoming plans'):hasFilters()?'Your kind of day':state.view==='map'?'Find your next little stop':'A few lovely places to start';
  $('#results-subtitle').textContent=isPlansPage?'Events and clubs together, ordered by date. Dates TBC appear last.':hasFilters()?'Places and activities that match your filters.':state.region==='Exeter'?'A few practical ideas for time together.':'Local places and activities, added as details are checked.';
  $('#result-count').textContent=`${places.length} ${isPlansPage?(places.length===1?'plan':'plans'):(places.length===1?'place':'places')}`;
  $('.results-top').classList.toggle('home-results',!isPlansPage&&!hasFilters()&&state.view==='list');
  $('#date-scope-note').hidden=!state.dates;
  $('#date-scope-note').textContent=isPlansPage?'Showing events and clubs with confirmed dates. Clear Dates to include clubs with dates TBC.':'Showing date-confirmed events. Clear Dates to include cafés, regular places and activities with dates TBC.';
  if(!isPlansPage){$('#main-plans').hidden=hasFilters()||state.view==='map';renderGuides();}
  const signature=JSON.stringify([filterSignature,paginated,state.page]);
  if(state.view==='list'&&signature!==lastListSignature){renderRails(paginated?page.items:places);lastListSignature=signature;}
  renderPagination(page,paginated);
  $('#empty-state').hidden=places.length>0;
  const chips=[];
  if(state.browseAll)chips.push(['browseAll','All places']);
  if(state.collection)chips.push(['collection',collections.find(c=>c.id===state.collection).name]);
  if(state.dates)chips.push(['dates',dateRangeLabel(state.dates)]);
  if(state.query)chips.push(['query',`“${state.query}”`]);
  if(state.age.length)chips.push(['age',`Ages ${state.age.map(id=>ageBands.find(b=>b.id===id).label).join(', ')}`]);
  if(state.price!=='all')chips.push(['price',state.price==='free'?'Free':'Paid']);
  if(state.type!=='all')chips.push(['type',types.find(t=>t[0]===state.type)[1]]);
  $('#applied-filters').hidden=!chips.length;
  $('#applied-filters').innerHTML=chips.map(([key,label])=>`<button class="applied-chip" data-clear="${key}" aria-label="Remove ${escapeHTML(label)} filter">${escapeHTML(label)}${icon('close')}</button>`).join('')+(chips.length>1?'<button class="clear-all" data-reset>Clear all</button>':'');
  if(state.view==='map')renderMap(page.items);
}
function resetFilters(){state.age=[];state.price='all';state.type='all';state.query='';state.dates=null;state.collection=null;state.browseAll=false;state.page=1;render();}
function clearFilter(key){state[key]=key==='browseAll'?false:['dates','collection'].includes(key)?null:key==='age'?[]:key==='query'?'':'all';render();}
function option(value,title,sub,selected,inputType='radio',name='choice'){return `<label class="option-label"><input type="${inputType}" name="${name}" value="${escapeHTML(value)}" ${selected?'checked':''}><span>${escapeHTML(title)}${sub?`<small>${escapeHTML(sub)}</small>`:''}</span></label>`;}
function renderCalendar(){
  const first=utcDate(calendarMonth+'-01');
  const weekday=(first.getUTCDay()+6)%7;
  const total=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const monthLabel=first.toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
  const filtered=data.filter(p=>matches(p,'dates'));
  let cells='<span class="calendar-blank" aria-hidden="true"></span>'.repeat(weekday);
  for(let day=1;day<=total;day++){
    const iso=`${calendarMonth}-${String(day).padStart(2,'0')}`;
    const count=filtered.filter(p=>occursWithin(p,{start:iso,end:iso})).length;
    const chosen=draftDates&&(iso===draftDates.start||iso===draftDates.end);
    const inRange=draftDates&&draftDates.end&&iso>draftDates.start&&iso<draftDates.end;
    const fullDate=utcDate(iso).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
    cells+=`<button type="button" data-calendar-day="${iso}" aria-label="${fullDate}${count?`, ${count} confirmed ${count===1?'event':'events'}`:''}" aria-pressed="${!!chosen}" class="${chosen?'chosen ':''}${inRange?'in-range ':''}${iso===TODAY?'today ':''}${count?'has-events':''}" ${iso<TODAY?'disabled':''}>${day}</button>`;
  }
  const quick=[['all','Any date'],['today','Today'],['tomorrow','Tomorrow'],['weekend','This weekend']].map(([key,label])=>{
    const r=shortcutDates(key),active=(!r&&!draftDates)||(r&&draftDates&&r.start===draftDates.start&&r.end===draftDates.end);
    return `<button type="button" data-calendar-quick="${key}" class="${active?'active':''}" aria-pressed="${!!active}">${label}</button>`;
  }).join('');
  $('#filter-content').innerHTML=`<div class="quick-dates">${quick}</div><div class="calendar-top"><h3>${monthLabel}</h3><div class="calendar-controls"><button type="button" data-calendar-month="-1" class="previous" aria-label="Previous month" ${calendarMonth<=TODAY.slice(0,7)?'disabled':''}>${icon('arrow')}</button><button type="button" data-calendar-month="1" aria-label="Next month">${icon('arrow')}</button></div></div><div class="calendar-weekdays">${['M','T','W','T','F','S','S'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${cells}</div><p class="calendar-legend">A dot means a date-confirmed event matches your filters.</p><div class="calendar-summary" aria-live="polite"><span>${calendarPickingEnd?'Pick an end date, or apply this day':'Your dates'}</span><strong>${draftDates?dateRangeLabel({start:draftDates.start,end:draftDates.end||draftDates.start}):'Any date'}</strong></div><p class="calendar-hint">Choose one day, or a start and end date. Dates filter confirmed events; clear Dates to include regular places and dates TBC.</p>`;
}
function openMenu(menu){
  currentMenu=menu;
  const titles={search:'Find a little plan',region:'Where shall we go?',dates:'When shall we go?',age:'How old are your children?',price:'What works for your budget?',type:'What do you fancy?'};
  $('#filter-title').textContent=titles[menu];
  let html='';
  if(menu==='search')html=`<label for="search-input" class="filter-help">${isPlansPage?'Search events, activities and holiday clubs.':'Search places, activities or a little treat.'}</label><input id="search-input" class="search-field" type="search" name="query" value="${escapeHTML(state.query)}" placeholder="${isPlansPage?'Music, sport, holiday camps…':'Museum, coffee, ice cream…'}" autocomplete="off"><p class="search-examples">${isPlansPage?'Search the full event and club list.':'Try RAMM, art or gelato.'}<br>Search stays within your selected region.</p>`;
  if(menu==='region')html=`<p class="filter-help">Handpicked places in two corners of the country.</p><div class="filter-options">${option('Exeter','Exeter · Devon','Exeter and across Devon',state.region==='Exeter')}${option('Nottingham','Nottingham','Nottingham & nearby places',state.region==='Nottingham')}</div>`;
  if(menu==='age')html=`<p class="filter-help">Choose one or more ages. We’ll show places suitable for at least one selected age. Places with unconfirmed ages are left out.</p><div class="filter-options age-options">${ageBands.map(b=>option(b.id,b.label+' years','',state.age.includes(b.id),'checkbox','ages')).join('')}</div>`;
  if(menu==='price')html=`<p class="filter-help">Paid includes tickets and food or drink purchases. Conditional offers are explained on the place card.</p><div class="filter-options">${option('all','Any price','',state.price==='all')}${option('free','Free','No entry fee for the activity shown',state.price==='free')}${option('paid','Paid','Tickets, food or drink',state.price==='paid')}</div>`;
  if(menu==='type')html=`<div class="filter-options">${availableTypes.map(([id,title])=>option(id,title,id==='activity'?'Includes arts, outdoor activities and holiday clubs':'',state.type===id)).join('')}</div>`;
  $('#filter-content').innerHTML=html;
  $('#filter-dialog').classList.toggle('date-dialog',menu==='dates');
  if(menu==='dates'){draftDates=state.dates?{...state.dates}:null;calendarPickingEnd=false;calendarMonth=(draftDates?.start||TODAY).slice(0,7);renderCalendar();}
  $('#filter-apply').textContent=menu==='search'?'Search':isPlansPage?'Show plans':'Show places';
  $('#filter-clear').textContent=menu==='region'?'Reset region':'Clear';
  document.querySelector(`[data-menu="${menu}"]`).setAttribute('aria-expanded','true');
  $('#filter-dialog').showModal();
  if(menu==='search')$('#search-input').focus();
}
function closeMenu(){$('#filter-dialog').close();}
$('#filter-dialog').addEventListener('close',()=>{if(currentMenu)document.querySelector(`[data-menu="${currentMenu}"]`).setAttribute('aria-expanded','false');currentMenu=null;});
$('#filter-form').addEventListener('submit',event=>{
  event.preventDefault();const form=new FormData(event.currentTarget);
  if(currentMenu==='search')state.query=String(form.get('query')||'').trim();
  else if(currentMenu==='dates')state.dates=draftDates?{start:draftDates.start,end:draftDates.end||draftDates.start}:null;
  else if(currentMenu==='age')state.age=form.getAll('ages');
  else state[currentMenu]=form.get('choice')||'all';
  closeMenu();render();
});
$('#filter-clear').addEventListener('click',()=>{
  if(currentMenu==='search')$('#search-input').value='';
  else if(currentMenu==='dates'){draftDates=null;calendarPickingEnd=false;renderCalendar();}
  else if(currentMenu==='age')$('#filter-content').querySelectorAll('input').forEach(input=>input.checked=false);
  else $('#filter-content').querySelector(`input[value="${currentMenu==='region'?'Exeter':'all'}"]`).checked=true;
});
$('#filter-close').addEventListener('click',closeMenu);
$('#empty-reset').addEventListener('click',resetFilters);
function openDetail(id){
  const p=data.find(v=>v.id===id);if(!p)return;
  const credits=p.photoSource?`Photo: <a href="${escapeHTML(p.photoSource)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.credit)}</a>${p.photoLicenceUrl?` · <a href="${escapeHTML(p.photoLicenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.photoLicence)}</a>`:''}. ${escapeHTML(p.imageReference||'Photograph shown with a layout crop.')}`:`Photo: ${escapeHTML(p.credit||'to be confirmed')}.`;
  const editReason=p.editReasons?.[state.collection];
  const evidence=p.editEvidence?.[state.collection];
  const editNote=editReason?`<div class="detail-note edit-detail"><h3>Why it’s in this edit</h3><p>${escapeHTML(editReason)}</p>${evidence?`<p>${evidence.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)}</a>`).join(' · ')}</p><p class="evidence-date">Official information checked ${escapeHTML(p.editChecked)}.</p>`:''}</div>`:'';
  const pairing=state.collection==='eat-play'&&p.eatPlay?`<div class="detail-note play-pair"><h3>Two stops, one outing</h3><dl><dt>Eat</dt><dd>${escapeHTML(p.eatPlay.food)}</dd><dt>Play</dt><dd>${escapeHTML(p.eatPlay.play)}</dd><dt>Between the two</dt><dd>${escapeHTML(p.eatPlay.connection)}</dd></dl><p>${escapeHTML(p.eatPlay.note)}</p></div>`:'';
  $('#detail-content').innerHTML=`<div class="detail-picture">${photo(p,true)}</div><div class="detail-body">${locality(p)}<h2>${escapeHTML(p.name)}</h2><div class="card-meta">${meta(p)}</div>${(p.dateNote||p.datePeriods?.length)?`<p class="date-note event-date">${p.datePeriods?icon('calendar'):''}${escapeHTML(scheduleLabel(p))}</p>`:''}<p>${escapeHTML(p.description)}</p>${editNote}${pairing}<div class="detail-note"><h3>Good to know</h3><p>${escapeHTML(p.note)}</p><p><strong>Schedule:</strong> ${escapeHTML(p.scheduleText||'Check the provider')}</p>${p.datePeriods?.length?`<p>${p.datePeriods.filter(d=>d.end>=TODAY).map(dateRangeLabel).join(' · ')}</p>`:''}</div><p class="detail-address">${icon('pin')} ${escapeHTML(p.address)}</p>${p.source?`<a class="primary-button detail-link" href="${escapeHTML(p.source)}" target="_blank" rel="noopener noreferrer">Check the official details${icon('external')}</a>`:'<p class="detail-note">Official link to follow.</p>'}<p class="detail-source">${credits}${p.checked?`<br>Official event details checked: ${escapeHTML(p.checked)}.`:''}<br>Prices & schedules change — always check the provider before booking.</p></div>`;
  fixImages($('#detail-content'));$('#detail-dialog').showModal();
}
$('#detail-close').addEventListener('click',()=>$('#detail-dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('click',event=>{
  const mapChoice=event.target.closest('[data-select-map]');if(mapChoice){selectMapPlace(mapChoice.dataset.selectMap);return;}
  const pageButton=event.target.closest('[data-results-page]');if(pageButton&&!pageButton.disabled){goToPage(Number(pageButton.dataset.resultsPage));return;}
  if(event.target.closest('[data-browse-all]')){state.browseAll=true;render();$('#results-heading').scrollIntoView({block:'start'});return;}
  if(event.target.closest('[data-retry-map]')){render();return;}
  const guide=event.target.closest('[data-collection]');if(guide){state.collection=state.collection===guide.dataset.collection?null:guide.dataset.collection;render();}
  const nav=event.target.closest('[data-rail]');if(nav){const el=document.getElementById(nav.dataset.rail);el.scrollBy({left:Number(nav.dataset.direction)*(el.querySelector('.place-card').offsetWidth+18),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  const shortcut=event.target.closest('[data-date-shortcut]');if(shortcut){state.dates=shortcutDates(shortcut.dataset.dateShortcut);render();}
  const quick=event.target.closest('[data-calendar-quick]');if(quick){draftDates=shortcutDates(quick.dataset.calendarQuick);calendarPickingEnd=false;calendarMonth=(draftDates?.start||TODAY).slice(0,7);renderCalendar();}
  const month=event.target.closest('[data-calendar-month]');if(month){const d=utcDate(calendarMonth+'-01');d.setUTCMonth(d.getUTCMonth()+Number(month.dataset.calendarMonth));calendarMonth=isoDate(d).slice(0,7);renderCalendar();}
  const day=event.target.closest('[data-calendar-day]');if(day){
    const chosen=day.dataset.calendarDay;
    if(!draftDates||!calendarPickingEnd){draftDates={start:chosen,end:chosen};calendarPickingEnd=true;}
    else{draftDates={start:chosen<draftDates.start?chosen:draftDates.start,end:chosen<draftDates.start?draftDates.start:chosen};calendarPickingEnd=false;}
    renderCalendar();
  }
  const menu=event.target.closest('[data-menu]');if(menu)openMenu(menu.dataset.menu);
  const place=event.target.closest('[data-open]');if(place)openDetail(place.dataset.open);
  const clear=event.target.closest('[data-clear]');if(clear)clearFilter(clear.dataset.clear);
  if(event.target.closest('[data-reset]'))resetFilters();
});
const mapAssetLoads={};
let mapRenderVersion=0;
function loadMapAsset(kind){
  if(kind==='script'&&window.L)return Promise.resolve();
  if(mapAssetLoads[kind])return mapAssetLoads[kind];
  mapAssetLoads[kind]=new Promise((resolve,reject)=>{
    const asset=document.createElement(kind==='style'?'link':'script');
    if(kind==='style'){asset.rel='stylesheet';asset.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';}
    else{asset.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';asset.async=true;}
    const failed=()=>{clearTimeout(timer);asset.onload=asset.onerror=null;asset.remove();delete mapAssetLoads[kind];reject(new Error('Map asset unavailable'));};
    const timer=setTimeout(failed,20000);
    asset.onload=()=>{clearTimeout(timer);asset.onload=asset.onerror=null;resolve();};asset.onerror=failed;
    document.head.appendChild(asset);
  });
  return mapAssetLoads[kind];
}
async function renderMap(places){
  const version=++mapRenderVersion;
  if(!map){
    $('#map').innerHTML='<p class="map-unavailable" role="status">Loading the map… You can return to the list at any time.</p>';
    $('#map-selection').hidden=true;
    try{await Promise.all([loadMapAsset('style'),loadMapAsset('script')]);}
    catch(error){if(state.view==='map'&&version===mapRenderVersion)$('#map').innerHTML='<div class="map-unavailable" role="status"><p>The map could not load. Try again, or choose Show list below.</p><button class="primary-button" data-retry-map>Try again</button></div>';return;}
  }
  if(state.view!=='map'||version!==mapRenderVersion)return;
  const L=window.L;
  if(!map){
    $('#map').innerHTML='';
    map=L.map('map',{zoomControl:false,scrollWheelZoom:false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    L.control.zoom({position:'topright'}).addTo(map);
  }
  markers.forEach(m=>map.removeLayer(m));markers=[];
  const located=places.filter(p=>p.coords);
  mapPagePlaces=located;
  selectedId=located[0]?.id||null;
  const spots=new Map();located.forEach(p=>{const key=spotKey(p);if(!spots.has(key))spots.set(key,[]);spots.get(key).push(p);});
  spots.forEach(group=>{
    const p=group[0];
    const isEvent=p.type!=='club'&&p.datePeriods?.length>0;
    const baseLabel=p.type==='club'?'Holiday club':isEvent?'What’s on':p.type==='cafe'?'Café':p.type==='ice'?'Ice cream':p.category||'Activity';
    const label=group.length>1?`${group.every(v=>v.kind===p.kind)?baseLabel:'Places'} · ${group.length}`:baseLabel;
    const marker=L.marker(p.coords,{icon:L.divIcon({className:'globee-map-marker',html:`<span class="map-pin" data-marker-id="${escapeHTML(p.id)}" data-group-ids="${escapeHTML(group.map(v=>v.id).join('|'))}">${icon(isEvent?'calendar':p.type)}${escapeHTML(label)}</span>`,iconSize:null,iconAnchor:[32,20]}),title:group.map(v=>v.name).join(' · '),keyboard:true}).addTo(map);
    marker.on('click',()=>selectMapPlace(p.id));markers.push(marker);
  });
  map.invalidateSize();
  if(located.length)map.fitBounds(L.latLngBounds(located.map(p=>p.coords)),{paddingTopLeft:[40,40],paddingBottomRight:[40,200],maxZoom:14,animate:false});
  else map.setView(state.region==='Exeter'?[50.7236,-3.5303]:[52.951,-1.15],12);
  const missing=places.length-located.length;
  $('#map-note').textContent=`Showing this page’s ${places.length} ${places.length===1?'result':'results'} (up to ${PAGE_SIZE}). Map locations are approximate; check the provider for the exact entrance.${missing?` ${missing} ${missing===1?'place has':'places have'} no confirmed map location and ${missing===1?'is':'are'} still shown in the list.`:''}`;
  if(selectedId)selectMapPlace(selectedId);else $('#map-selection').hidden=true;
}
function selectMapPlace(id){
  selectedId=id;const p=data.find(v=>v.id===id);if(!p)return;
  $('#map-selection').hidden=false;
  $('#map-selection').innerHTML=`<button class="map-card" data-open="${escapeHTML(p.id)}">${p.image?imageTag(p):`<div>${icon(p.type)}</div>`}<div><p>${escapeHTML(p.category)} · ${escapeHTML(p.region==='Exeter'?'Exeter · Devon':p.region)}</p><h3>${escapeHTML(p.name)}</h3><span class="price ${p.priceType==='free'?'free':''}">${escapeHTML(p.priceLabel)}</span></div></button>`;
  const group=mapPagePlaces.filter(v=>spotKey(v)===spotKey(p)),index=group.findIndex(v=>v.id===id);
  if(group.length>1)$('#map-selection').innerHTML+=`<div class="map-group-nav"><button data-select-map="${escapeHTML(group[(index-1+group.length)%group.length].id)}" aria-label="Previous activity at this location">←</button><span>${index+1} of ${group.length} at this location</span><button data-select-map="${escapeHTML(group[(index+1)%group.length].id)}" aria-label="Next activity at this location">→</button></div>`;
  fixImages($('#map-selection'));
  document.querySelectorAll('[data-marker-id]').forEach(e=>e.classList.toggle('selected',(e.dataset.groupIds||e.dataset.markerId).split('|').includes(id)));
}
$('#view-toggle').addEventListener('click',()=>{
  const toMap=state.view==='list';if(toMap)listScroll=window.scrollY;
  if(toMap&&!isPlansPage&&!hasFilters())state.browseAll=true;
  state.view=toMap?'map':'list';document.body.classList.toggle('map-mode',toMap);
  $('#map-view').hidden=!toMap;$('#list-view').hidden=toMap;
  $('#view-toggle').innerHTML=`${icon(toMap?'list':'map')}<span>${toMap?'Show list':'Show map'}</span>`;
  $('#view-toggle').setAttribute('aria-label',toMap?'Show list':'Show map');
  render();window.scrollTo({top:toMap?0:listScroll,behavior:'instant'});
  if(toMap&&map)requestAnimationFrame(()=>map.invalidateSize());
});
window.addEventListener('globee:data',event=>{data=event.detail.places;lastListSignature='';lastGuideRegion=null;render();if(currentMenu==='dates')renderCalendar();});
render();
