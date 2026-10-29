'use strict';
const PATHS={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',chevron:'<path d="m6 9 6 6 6-6"/>',map:'<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Z"/><path d="M9 3v15M15 6v15"/>',list:'<rect x="3" y="4" width="5" height="5" rx="1"/><rect x="3" y="15" width="5" height="5" rx="1"/><path d="M12 5h9M12 8h7M12 16h9M12 19h7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',activity:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',cafe:'<path d="M4 4h12v10a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h2a3 3 0 1 1 0 6h-2M3 22h15"/>',ice:'<path d="M5 9a7 7 0 0 1 14 0M5 9h14l-7 13ZM8 9l4 10M16 9l-4 10"/>',club:'<path d="m3 20 9-16 9 16ZM12 4v16M8 20l4-7 4 7"/>',art:'<path d="m14 3 7 7-9 9-8 1 1-8Z"/><path d="m5 12 7 7M14 3l-3 3 7 7 3-3"/>',outdoors:'<path d="m12 2 6 8h-3l5 7H4l5-7H6ZM12 17v5"/>'};
PATHS.calendar='<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M7 15h2M13 15h2M7 18h2"/>';
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]||PATHS.activity}</svg>`;}
document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
const $=s=>document.querySelector(s);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const isPlansPage=document.body.dataset.page==='plans';
const isNotebookHome=document.body.classList.contains('notebook-home');
const dedicatedEdit=document.body.dataset.edit||null;
const routeParams=new URLSearchParams(window.location.search);
const REGIONS=['Exeter','Bristol','Nottingham'];
const REGION_LABELS={Exeter:'Exeter · Devon',Bristol:'Bristol',Nottingham:'Nottingham'};
const REGION_CENTRES={Exeter:[50.7236,-3.5303],Bristol:[51.4545,-2.5879],Nottingham:[52.951,-1.15]};
const requestedRegion=routeParams.get('region');
const PAGE_SIZE=12;
const state={region:requestedRegion==='Devon'?'Exeter':REGIONS.includes(requestedRegion)?requestedRegion:'Exeter',age:[],price:'all',type:'all',query:'',dates:null,collection:null,edit:null,view:'list',browseAll:false};
state.notebookSection=isNotebookHome&&['holidays','notes'].includes(routeParams.get('section'))?routeParams.get('section'):'days';
const ageBands=[{id:'0-2',label:'0–2',min:0,max:2},{id:'3-5',label:'3–5',min:3,max:5},{id:'6-8',label:'6–8',min:6,max:8},{id:'9-12',label:'9–12',min:9,max:12},{id:'13+',label:'13+',min:13,max:17}];
const types=[['all','All types'],['activity','Activities'],['theatre','Theatre & shows'],['market','Markets'],['ice','Ice cream'],['outdoors','Parks & nature'],['fossil','Fossil hunting'],['art','Arts & making'],['club','Holiday clubs']];
let plansWindow='weekend';
const availableTypes=isPlansPage?types.filter(([id])=>!['ice','fossil'].includes(id)):types;
let currentMenu=null,map=null,markers=[],selectedId=null,listScroll=0;
let mapPlaces=[],mapSelectionContext=null,mapSelectionDismissed=false;
const spotKey=p=>p.coords?.map(n=>Number(n).toFixed(4)).join(',');
// Editorial stopgap for verified Bristol clubs missing from the published Sheet.
// Keep these separate from the Sheet source and deduplicate when a provider is added there.
const VERIFIED_HALF_TERM_CLUBS=[
  {id:'verified-bristol-schools-out-henleaze-2026',name:'School’s Out Henleaze – October Holiday Club',region:'Bristol',type:'club',kind:'club',category:'Holiday club',description:'Autumn crafts, outdoor play, sports and games. Full or half days, 26–30 October; booking required.',address:'Henleaze Infant School, Park Grove, Bristol BS9 4LG',source:'https://www.schoolsouthenleaze.co.uk/holiday-club-programme',priceType:'paid',priceLabel:'£32.50 full day · £20 half day',ages:[4,11],ageLabel:'4–11 years',datePeriods:[{start:'2026-10-26',end:'2026-10-30'}],endDate:'2026-10-30',scheduleText:'26–30 Oct 2026 · full day 8.15am–5.30pm; half-day options',note:'£12 annual registration fee applies. Booking is open; check places with the organiser.',checked:'17 October 2026',coords:null,collections:[]},
  {id:'verified-bristol-fun-science-2026',name:'Fun Science Bristol – October Holiday Club',region:'Bristol',type:'club',kind:'club',category:'Holiday club',description:'Three science days with biology, chemistry and physics activities, 27–29 October, 10am–3pm. Booking required.',address:'Scout Hut 6388, St Bartholomew’s Road, Bishopston, Bristol BS7 9BJ',source:'https://www.fun-science.org.uk/event/bristol-october-half-term-holiday-club-2026/',priceType:'paid',priceLabel:'£34 per day · £90 for three days',ages:[4,10],ageLabel:'4–10 years',datePeriods:[{start:'2026-10-27',end:'2026-10-29'}],endDate:'2026-10-29',scheduleText:'27–29 Oct 2026 · 10am–3pm; optional extra hours',note:'Sibling prices and optional stay-and-play hours are listed by the organiser. Check availability before booking.',checked:'17 October 2026',coords:null,collections:[]}
];
function withVerifiedHalfTermClubs(places){
  const known=new Set(places.map(p=>`${p.region}|${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'')}`));
  const sources=new Set(places.map(p=>p.source).filter(Boolean));
  return [...places,...VERIFIED_HALF_TERM_CLUBS.filter(p=>!known.has(`${p.region}|${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'')}`)&&!sources.has(p.source))];
}
let data=withVerifiedHalfTermClubs(window.GLOBEE_PLACES||[]).map(GlobeeImages.decorate);
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
state.query=routeParams.get('q')||'';
if(isPlansPage||isNotebookHome){
  state.age=(routeParams.get('age')||'').split(',').filter(id=>ageBands.some(b=>b.id===id));
  if(['free','paid'].includes(routeParams.get('price')))state.price=routeParams.get('price');
  if(availableTypes.some(([id])=>id===routeParams.get('type')))state.type=routeParams.get('type');
  const from=routeParams.get('from'),to=routeParams.get('to');
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(utcDate(s).getTime())&&isoDate(utcDate(s))===s;
  if(validDate(from)&&validDate(to)&&from<=to)state.dates={start:from,end:to};
  const edit=dedicatedEdit||(isPlansPage?routeParams.get('edit'):null);
  if(GlobeeDiscovery.seasonalDefinition(edit,TODAY))state.edit=edit;
}
function updatePlanRoute(){
  if(!isPlansPage){const params=new URLSearchParams(window.location.search);params.set('region',state.region==='Exeter'?'Devon':state.region);if(state.query)params.set('q',state.query);else params.delete('q');if(state.view==='map')params.set('view','map');else params.delete('view');if(isNotebookHome){if(state.notebookSection==='days')params.delete('section');else params.set('section',state.notebookSection);if(state.age.length)params.set('age',state.age.join(','));else params.delete('age');if(state.price!=='all')params.set('price',state.price);else params.delete('price');if(state.type!=='all')params.set('type',state.type);else params.delete('type');if(state.dates){params.set('from',state.dates.start);params.set('to',state.dates.end);}else{params.delete('from');params.delete('to');}}window.history.replaceState(null,'',`${window.location.pathname}?${params}${window.location.hash}`);return;}
  const params=new URLSearchParams();params.set('region',state.region==='Exeter'?'Devon':state.region);
  if(state.query)params.set('q',state.query);
  if(state.view==='map')params.set('view','map');
  if(state.age.length)params.set('age',state.age.join(','));
  if(state.price!=='all')params.set('price',state.price);
  if(state.type!=='all')params.set('type',state.type);
  if(state.dates){params.set('from',state.dates.start);params.set('to',state.dates.end);}
  if(state.edit&&!dedicatedEdit)params.set('edit',state.edit);
  window.history.replaceState(null,'',`${window.location.pathname}?${params}`);
  $('#back-explore').href=pageLink('index.html');
  $('.brand').href=pageLink('index.html');
  const editMapLink=document.querySelector('[data-edit-map-link]');
  if(editMapLink&&state.edit)editMapLink.href=`plans.html?region=${encodeURIComponent(state.region==='Exeter'?'Devon':state.region)}&edit=${encodeURIComponent(state.edit)}`;
}
let draftDates=null,calendarMonth=TODAY.slice(0,7),calendarPickingEnd=false;
const railObservers=[];
let lastListSignature='';
let lastFilterSignature=null,lastPrimaryPlansKey=null;
let visibleCount=PAGE_SIZE,moreObserver=null;
function matches(p,ignore){
  if(!isCurrent(p))return false;
  if(isNotebookHome&&state.notebookSection==='notes')return false;
  if(isNotebookHome&&state.notebookSection==='holidays'&&p.kind!=='club')return false;
  if(isPlansPage&&!isFamilyPlan(p))return false;
  if(ignore!=='edit'&&state.edit&&!GlobeeDiscovery.matchesSeasonal(p,TODAY,state.edit))return false;
  if(ignore!=='region'&&p.region!==state.region)return false;
  if(ignore!=='dates'&&state.dates&&!occursWithin(p,state.dates))return false;
  if(ignore!=='price'&&state.price!=='all'&&p.priceType!==state.price)return false;
  if(ignore!=='type'&&state.type!=='all'&&!(p.type===state.type||(state.type==='fossil'&&p.category==='Fossil hunting')||(state.type==='activity'&&['club','art','outdoors','theatre','market'].includes(p.type))))return false;
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
function visiblePlaces(){return data.filter(p=>matches(p)).sort((a,b)=>nextPlanDate(a).localeCompare(nextPlanDate(b))||a.name.localeCompare(b.name));}
function fallback(p){return `<span class="card-category">${escapeHTML(p.category)}</span>`;}
function imageTag(p,alt=p.imageAlt||p.name){return `<img data-src="${escapeHTML(p.image)}" data-place-id="${escapeHTML(p.id)}" alt="${escapeHTML(alt)}" style="object-position:${p.image.endsWith('/ramm.webp')?'50% 0%':'50% 50%'}" draggable="false" loading="lazy" decoding="async" width="640" height="426" referrerpolicy="no-referrer">`;}
function photo(p){return p.image?`${imageTag(p)}<span class="image-kind">${escapeHTML(p.imageLabel||(p.imageKind==='location'?'Location photo':p.imageKind==='activity'?'Activity photo':'Venue photo'))}</span>`:'';}
function meta(p){return `<span class="price ${p.priceType==='free'?'free':''}">${escapeHTML(p.priceLabel)}</span><span class="meta-dot">·</span><span class="age">${escapeHTML(p.ageLabel||'Age TBC')}</span>`;}
function locality(p){const fossil=window.GlobeeFossilMap?.isFossilPlace(p);return `<span class="card-locality ${p.region.toLowerCase()}${fossil?' fossil-locality':''}">${icon('pin')}${escapeHTML(fossil?'Dorset · Day trip':REGION_LABELS[p.region]||p.region)}</span>`;}
const observedImages=new Set(),preparedImages=new WeakSet();
function loadImage(img){const src=img.dataset.src;if(!src||!img.isConnected)return;img.src=src;delete img.dataset.src;imageObserver?.unobserve(img);observedImages.delete(img);}
const imageObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)loadImage(entry.target);});},{rootMargin:'80px 0px',threshold:0.01}):null;
function fixImages(container){
  for(const img of observedImages)if(!img.isConnected){imageObserver?.unobserve(img);observedImages.delete(img);}
  container.querySelectorAll('img[data-src]').forEach(img=>{
    if(!preparedImages.has(img)){
      preparedImages.add(img);
      img.addEventListener('error',()=>{const p=data.find(v=>v.id===img.dataset.placeId),picture=img.closest('.picture,.detail-picture'),card=img.closest('.place-card'),mapCard=img.closest('.map-card');if(card&&p){card.classList.add('no-photo');card.querySelector('.card-body').insertAdjacentHTML('afterbegin',fallback(p));}if(picture)picture.remove();else img.remove();if(mapCard)mapCard.classList.add('no-photo');},{once:true});
    }
    if(imageObserver){imageObserver.observe(img);observedImages.add(img);}else loadImage(img);
  });
}
function card(p){
  const fossil=window.GlobeeFossilMap?.isFossilPlace(p);
  const title=fossil?p.name.replace(' (Dorset day trip)',''):p.name;
  const description=fossil?p.description.split('. ')[0]+'.':p.description;
  const practical=fossil?'<p class="date-note">Self-guided · No booking<br>Parking extra · Check tides before visiting</p>':(p.dateNote||p.datePeriods?.length)?`<p class="date-note ${p.datePeriods?'event-date':''}">${p.datePeriods?icon('calendar'):''}${escapeHTML(scheduleLabel(p))}</p>`:'';
  const clubSchedule=isNotebookHome&&state.notebookSection==='holidays'?`<p class="club-practical">${escapeHTML(p.scheduleText||'Daily hours TBC — check with the provider.')}</p>`:'';
  return `<article class="place-card${p.image?'':' no-photo'}"><button class="card-open" data-open="${escapeHTML(p.id)}" aria-label="View ${escapeHTML(p.name)}">${p.image?`<div class="picture">${photo(p)}<span class="category-badge">${icon(p.type)}${escapeHTML(p.category)}</span></div>`:''}<div class="card-body">${p.image?'':fallback(p)}${locality(p)}<div class="card-heading"><h3>${escapeHTML(title)}</h3>${icon('arrow')}</div><p class="card-description">${escapeHTML(description)}</p><div class="card-meta">${meta(fossil?{...p,priceLabel:'Free beach entry'}:p)}</div>${practical}${clubSchedule}</div></button></article>`;
}
function hasFilters(){return isNotebookHome&&state.notebookSection!=='days'||state.browseAll||state.age.length||state.price!=='all'||state.type!=='all'||state.query||state.dates||state.collection||state.edit;}
function renderWeekend(){
  if(isPlansPage)return;
  const container=$('#main-plans');
  container.hidden=!!hasFilters()||state.view==='map';
  if(container.hidden)return;
  const regional=data.filter(p=>p.region===state.region);
  const seasonal=GlobeeDiscovery.seasonalEdit(regional,TODAY);
  const bookAhead=TODAY<'2026-10-30'?GlobeeDiscovery.bookAheadEdit(regional,TODAY):null;
  const eligible=regional.filter(p=>TODAY<'2026-10-30'||!GlobeeDiscovery.matchesSeasonal(p,TODAY,'halloween'));
  const weekend=plansWindow==='four-weeks'?GlobeeDiscovery.nextFourWeeksPicks(eligible,TODAY):GlobeeDiscovery.weekendPicks(eligible,TODAY);
  const primaryKey=`${state.region}|${TODAY}|${plansWindow}|${seasonal?.id||'none'}|${seasonal?.picks.map(p=>p.id).join(',')||''}|${bookAhead?.picks.map(p=>p.id).join(',')||''}|${weekend.map(p=>p.id).join(',')}`;
  if(lastPrimaryPlansKey===primaryKey){container.hidden=!container.children.length;return;}
  lastPrimaryPlansKey=primaryKey;
  const range=plansWindow==='four-weeks'?GlobeeDiscovery.nextFourWeeksRange(TODAY):GlobeeDiscovery.weekendRange(TODAY);
  const sections=[];
  if(seasonal){
    const region=encodeURIComponent(state.region==='Exeter'?'Devon':state.region);
    const allLink=seasonal.page?`${seasonal.page}?region=${region}`:`plans.html?region=${region}&edit=${encodeURIComponent(seasonal.id)}`;
    if(seasonal.id==='half-term'){
      const clubs=GlobeeDiscovery.seasonalPlaces(regional,TODAY,'half-term').filter(p=>p.kind==='club');
      sections.push(rail('half-term-clubs','Half-term holiday clubs','Confirmed dates and official booking links',clubs.slice(0,5),`${allLink}&type=club`,`View all clubs (${clubs.length})`));
    }
    const seasonalPicks=seasonal.id==='half-term'?seasonal.picks.filter(p=>p.kind!=='club'):seasonal.picks;
    if(seasonalPicks.length){
      const seasonalSubtitle=seasonal.id==='christmas'&&state.region!=='Exeter'?'Festive days out and shows':seasonal.subtitle;
      sections.push(rail(`${seasonal.id}-picks`,seasonal.id==='half-term'?'October half-term days out & shows':seasonal.title,seasonal.homeEnd?seasonalSubtitle:`${seasonalSubtitle} · Until ${dateShort(seasonal.end)}`,seasonalPicks,allLink,`View all (${seasonal.total})`));
    }
    else sections.push(`<section class="seasonal-pending" aria-labelledby="seasonal-pending-heading"><h2 id="seasonal-pending-heading">${escapeHTML(seasonal.title)}</h2><p>We’re checking festive family plans in ${escapeHTML(REGION_LABELS[state.region])}. Dates and booking details will appear here once confirmed.</p></section>`);
  }
  if(bookAhead){
    const region=encodeURIComponent(state.region==='Exeter'?'Devon':state.region);
    const allLink=`plans.html?region=${region}&edit=christmas-book-ahead`;
    sections.push(rail('christmas-book-ahead-picks',bookAhead.title,`${bookAhead.subtitle} · Check current availability`,bookAhead.picks,allLink,`View all (${bookAhead.total})`));
  }
  const tabs=`<div class="plans-window-tabs" role="tablist" aria-label="When to go">${[['weekend','This weekend'],['four-weeks','Next 4 weeks']].map(([id,label])=>`<button type="button" role="tab" id="plans-window-${id}" data-plans-window="${id}" aria-selected="${plansWindow===id}" aria-controls="plans-window-panel" tabindex="${plansWindow===id?0:-1}">${label}</button>`).join('')}</div>`;
  const allLink=`${pageLink('plans.html')}&from=${range.start}&to=${range.end}`;
  sections.push(`<div class="plans-window">${tabs}<div id="plans-window-panel" role="tabpanel" aria-labelledby="plans-window-${plansWindow}" tabindex="0">${weekend.length?rail('weekend-picks',`${plansWindow==='four-weeks'?'Next 4 weeks':'This weekend'} · ${weekend.length} ${weekend.length===1?'idea':'ideas'}`,dateRangeLabel(range),weekend,allLink,'View all'): `<p class="plans-window-empty">No confirmed plans for ${escapeHTML(dateRangeLabel(range))} yet. Try the other date tab.</p>`}</div></div>`);
  container.setAttribute('aria-label',seasonal||bookAhead?'Seasonal and weekend plans':'This weekend');
  container.innerHTML=sections.join('');
  container.hidden=!sections.length;
  fixImages(container);setupRails();
}
function rail(id,title,subtitle,places,allLink='',allLabel='View all'){if(!places.length)return '';return `<section class="discovery-row" aria-labelledby="${id}-heading"><div class="rail-heading"><div><h2 id="${id}-heading">${escapeHTML(title)}</h2><p>${escapeHTML(subtitle)}</p></div><div class="rail-tools"><span>${places.length} ${places.length===1?'pick':'picks'}</span>${allLink?`<a class="view-all-link" href="${escapeHTML(allLink)}" aria-label="${escapeHTML(allLabel)} ${escapeHTML(title)}">${escapeHTML(allLabel)}${icon('arrow')}</a>`:''}<button class="rail-nav previous" data-rail="${id}" data-direction="-1" aria-label="Previous ${escapeHTML(title)} places">${icon('arrow')}</button><button class="rail-nav" data-rail="${id}" data-direction="1" aria-label="Next ${escapeHTML(title)} places">${icon('arrow')}</button></div></div><div id="${id}" class="place-rail" aria-label="${escapeHTML(title)}">${places.map(card).join('')}</div></section>`;}
function renderRails(places){
  if(isPlansPage&&state.edit==='half-term'&&places.length){
    const clubs=places.filter(p=>p.kind==='club'),outings=places.filter(p=>p.kind!=='club');
    const group=(id,title,description,items)=>items.length?`<section class="half-term-results-group" aria-labelledby="${id}"><div class="half-term-results-heading"><h3 id="${id}">${title}</h3><p>${description} · ${items.length} ${items.length===1?'plan':'plans'}</p></div><div class="plans-grid" aria-label="${title}">${items.map(card).join('')}</div></section>`:'';
    $('#discovery-rails').innerHTML=group('half-term-clubs-heading','Holiday clubs','For school-break days',clubs)+group('half-term-outings-heading','Days out & shows','For time together',outings);
  }else if(isPlansPage&&state.edit==='christmas'){
    const showTreeSources=state.region==='Exeter'&&!state.age.length&&state.price==='all'&&state.type==='all'&&!state.query&&!state.dates&&!state.collection;
    const treeSources=[
      ['Cotley Farm Christmas','Whimple · East Devon','Book a vehicle slot','cotley-farm'],
      ['Exe Valley Christmas Trees','Thorverton · Mid Devon','25 Nov–23 Dec 2026','exe-valley'],
      ['Haldon Christmas Tree Centre','Haldon Forest · Near Exeter','25 Nov–22 Dec 2026','haldon'],
      ['Greendale Farm Shop','Near Farringdon · East Devon','2026 collection dates TBC','greendale']
    ];
    const treeGuide=showTreeSources?`<section class="seasonal-results-group" aria-labelledby="christmas-trees-heading"><div class="seasonal-results-heading"><h3 id="christmas-trees-heading">Christmas trees</h3><p>Four places to buy a real tree near Exeter. Compare cut and pot-grown choices, prices and visiting details.</p><a class="seasonal-guide-link" href="/exeter/christmas-trees/">Compare tree-buying places ${icon('arrow')}</a></div><div class="tree-source-grid" aria-label="Christmas tree buying places">${treeSources.map(([name,area,status,id])=>`<a class="tree-source-card" href="/exeter/christmas-trees/#${id}"><span class="tree-source-area">${area}</span><h4>${name}</h4><span class="tree-source-status">${status}</span><span class="tree-source-action">See buying details ${icon('arrow')}</span></a>`).join('')}</div></section>`:'';
    const events=showTreeSources?places.filter(p=>p.name!=='Cotley Farm Christmas'):places;
    const eventGroup=events.length?`<section class="seasonal-results-group" aria-labelledby="christmas-events-heading"><div class="seasonal-results-heading"><h3 id="christmas-events-heading">Festive events &amp; shows</h3><p>${events.length} ${events.length===1?'plan':'plans'} with published dates and organiser links. Check availability before booking.</p></div><div class="plans-grid" aria-label="Festive events and shows">${events.map(card).join('')}</div></section>`:'';
    $('#discovery-rails').innerHTML=treeGuide+eventGroup;
  }else $('#discovery-rails').innerHTML=places.length?`<div class="plans-grid" aria-label="${isPlansPage?'All matching events and holiday clubs':'All matching places, events and holiday clubs'}">${places.map(card).join('')}</div>`:'';
  fixImages($('#discovery-rails'));
}
function renderBristolGrowthNote(){
  $('#discovery-rails').innerHTML=`<aside class="region-growth-note" aria-label="Help Globee grow in Bristol"><p><strong>Want more Bristol?</strong> Follow <a class="growth-social-link" data-social-platform="instagram" href="https://www.instagram.com/globee.uk/" target="_blank" rel="noopener noreferrer">@globee.uk</a> and let us know you’re here — the more Bristol families join in, the faster we can grow this guide. <span aria-hidden="true">🐝</span></p></aside>`;
}
function renderLoadMore(total){
  moreObserver?.disconnect();
  const container=$('#list-progress');
  container.hidden=state.view!=='list'||!total;
  if(container.hidden)return;
  const shown=Math.min(visibleCount,total),remaining=total-shown;
  container.innerHTML=`<p role="status">${remaining?`${shown} of ${total}${isNotebookHome?' · Keep scrolling':''}`:`You’ve seen all ${total} results`}</p>${remaining&&!isNotebookHome?`<button type="button" class="load-more" data-load-more>Show ${Math.min(PAGE_SIZE,remaining)} more</button>`:''}`;
  if(remaining&&'IntersectionObserver' in window){
    moreObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)&&!container.contains(document.activeElement)){moreObserver.disconnect();loadMore();}},{rootMargin:'180px 0px'});
    moreObserver.observe(container);
  }
}
function loadMore(manual=false){
  if(state.view!=='list')return;
  const places=visiblePlaces(),next=GlobeeDiscovery.nextBatch(places,visibleCount,PAGE_SIZE);
  if(!next.length)return;
  $('#discovery-rails .plans-grid').insertAdjacentHTML('beforeend',next.map(card).join(''));
  const firstNewIndex=visibleCount;visibleCount+=next.length;
  if(manual)$('#discovery-rails .plans-grid').children[firstNewIndex]?.querySelector('button')?.focus({preventScroll:true});
  fixImages($('#discovery-rails'));renderLoadMore(places.length);
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
  const weekendOnlyPilot=!isNotebookHome&&!isPlansPage&&state.region==='Bristol'&&!hasFilters()&&state.view==='list'&&places.length>0&&places.length<=10&&GlobeeDiscovery.weekendPicks(places,TODAY).length===places.length;
  const filterSignature=JSON.stringify([state.region,state.age,state.price,state.type,state.query,state.dates,state.collection,state.edit,state.browseAll]);
  if(lastFilterSignature!==null&&lastFilterSignature!==filterSignature){visibleCount=PAGE_SIZE;if(state.view==='list')window.scrollTo({top:0,behavior:'instant'});}
  lastFilterSignature=filterSignature;
  if(isNotebookHome&&!('IntersectionObserver' in window))visibleCount=places.length;
  updatePlanRoute();
  $('#region-label').textContent=REGION_LABELS[state.region];
  window.GlobeeMusicFeature?.sync(state.region);
  $('#dates-label').textContent=state.dates?dateRangeLabel(state.dates):'Dates';
  $('#age-label').textContent=state.age.length===1?ageBands.find(b=>b.id===state.age[0]).label:state.age.length?`Age (${state.age.length})`:'Age';
  $('#price-label').textContent=state.price==='all'?'Price':state.price==='free'?'Free':'Paid';
  $('#type-label').textContent=state.type==='all'?'Type':'Type (1)';
  document.querySelectorAll('[data-menu]').forEach(b=>b.classList.toggle('active',b.dataset.menu==='dates'?!!state.dates:b.dataset.menu==='age'?!!state.age.length:b.dataset.menu==='search'?!!state.query:b.dataset.menu==='region'?false:state[b.dataset.menu]!=='all'));
  if($('#location-eyebrow'))$('#location-eyebrow').textContent=REGION_LABELS[state.region].toUpperCase();
  const activeEdit=state.edit?GlobeeDiscovery.seasonalDefinition(state.edit,TODAY):null;
  if($('#plans-page-title')){
    $('#plans-page-title').textContent=activeEdit?activeEdit.title:'What’s on & holiday clubs';
    $('.plans-intro-copy').textContent=activeEdit?.id==='christmas-book-ahead'?'Family Christmas events with published 2026 dates and booking links. Check availability with the organiser.':activeEdit?.id==='half-term'?'Holiday clubs, days out and shows with confirmed dates for the October school break. Check places, times and prices with each organiser.':activeEdit?.id==='christmas'&&state.region==='Exeter'?'Tree-buying ideas and Christmas events together. Check dates, prices and booking with each organiser.':activeEdit?.id==='christmas'?'Christmas events and shows with published dates. Check availability with each organiser.':activeEdit?'Every verified seasonal plan, together in one list.':'Browse upcoming events and holiday clubs in one place.';
    document.title=activeEdit?`${activeEdit.title} in ${state.region==='Exeter'?'Exeter & Devon':state.region} | Globee`:'What’s on & holiday clubs | Globee';
  }
  if($('.weekend-shortcut'))$('.weekend-shortcut').hidden=!!activeEdit;
  const scoopPromo=$('#scoop-promo-link');
  const halfTermEntry=$('#half-term-entry');
  const christmasEntry=$('#christmas-entry');
  const winterMapLink=$('#winter-map-link');
  if(halfTermEntry){
    const halfTermActive=!!GlobeeDiscovery.seasonalDefinition('half-term',TODAY);
    const christmasActive=!!GlobeeDiscovery.seasonalDefinition('christmas',TODAY);
    halfTermEntry.hidden=!halfTermActive;
    halfTermEntry.href=`plans.html?region=${encodeURIComponent(state.region==='Exeter'?'Devon':state.region)}&edit=half-term`;
    if(christmasEntry){
      christmasEntry.hidden=!christmasActive;
      christmasEntry.href=`plans.html?region=${encodeURIComponent(state.region==='Exeter'?'Devon':state.region)}&edit=christmas`;
      christmasEntry.querySelector('.christmas-kinds').textContent=state.region==='Exeter'?'Trees · Festive days out · Shows':'Festive days out · Shows';
    }
    if(scoopPromo)scoopPromo.hidden=halfTermActive||christmasActive;
    if(winterMapLink)winterMapLink.hidden=!halfTermActive||state.region==='Nottingham';
    halfTermEntry.closest('.entry-cards').classList.toggle('entry-cards-winter',halfTermActive||christmasActive);
  }
  if(scoopPromo)scoopPromo.href=`ice-cream.html?from=${state.region==='Bristol'?'Bristol':'Devon'}`;
  if(winterMapLink)winterMapLink.querySelector('a').href=`ice-cream.html?from=${state.region==='Bristol'?'Bristol':'Devon'}`;
  const classesEntry=$('#classes-entry-link');
  if(classesEntry){classesEntry.href=state.region==='Bristol'?'/bristol/classes/':state.region==='Nottingham'?'/nottingham/classes/':'/classes.html';classesEntry.querySelector('.entry-kicker').textContent=state.region==='Bristol'?'Bristol':state.region==='Nottingham'?'Nottingham':'Exeter · Devon';}
  $('#results-heading').textContent=state.view==='map'?(activeEdit?`${activeEdit.title} on the map`:'Explore on the map'):activeEdit?.id==='half-term'?'All half-term plans':activeEdit?.id==='christmas'?'All Christmas plans':activeEdit?`All ${activeEdit.title}`:weekendOnlyPilot?'Bristol is growing 🐝':hasFilters()?'Matching plans':isPlansPage?'All upcoming plans':'Explore all';
  $('#results-subtitle').textContent=activeEdit?`${activeEdit.id==='christmas'&&state.region!=='Exeter'?'Festive days out and shows':activeEdit.subtitle} · Until ${dateShort(activeEdit.end)}`:weekendOnlyPilot?`We’re starting with ${places.length} checked picks for this weekend.`:isPlansPage?'What’s on & holiday clubs':hasFilters()?'Places and activities that match your filters.':'Places, what’s on & holiday clubs';
  if(isNotebookHome&&state.notebookSection==='holidays'){
    $('#results-heading').textContent=state.view==='map'?'Holiday clubs on the map':'Holiday clubs';
    $('#results-subtitle').textContent='School-break clubs and multi-day workshops. Check dates, hours and places with the provider.';
  }
  const combinedChristmas=activeEdit?.id==='christmas'&&state.region==='Exeter'&&!state.age.length&&state.price==='all'&&state.type==='all'&&!state.query&&!state.dates&&!state.collection;
  $('#result-count').textContent=weekendOnlyPilot?'':combinedChristmas?`4 tree places · ${Math.max(0,places.length-1)} festive plans`:`${places.length} ${places.length===1?'result':'results'}`;
  $('#date-scope-note').hidden=!state.dates;
  $('#date-scope-note').textContent=isPlansPage?'Showing events and clubs with confirmed dates. Clear Dates to include clubs with dates TBC.':'Showing date-confirmed events. Clear Dates to include cafés, regular places and activities with dates TBC.';
  renderWeekend();
  if(state.view==='list'&&filterSignature!==lastListSignature){if(weekendOnlyPilot)renderBristolGrowthNote();else renderRails(['half-term','christmas'].includes(state.edit)&&isPlansPage?places:places.slice(0,visibleCount));lastListSignature=filterSignature;}
  renderLoadMore(weekendOnlyPilot||['half-term','christmas'].includes(state.edit)&&isPlansPage?0:places.length);
  $('#empty-state').hidden=places.length>0;
  const chips=[];
  if(activeEdit&&!dedicatedEdit)chips.push(['edit',activeEdit.title]);
  if(state.browseAll)chips.push(['browseAll','All places']);
  if(state.dates)chips.push(['dates',dateRangeLabel(state.dates)]);
  if(state.query)chips.push(['query',`“${state.query}”`]);
  if(state.age.length)chips.push(['age',`Ages ${state.age.map(id=>ageBands.find(b=>b.id===id).label).join(', ')}`]);
  if(state.price!=='all')chips.push(['price',state.price==='free'?'Free':'Paid']);
  if(state.type!=='all')chips.push(['type',types.find(t=>t[0]===state.type)[1]]);
  $('#applied-filters').hidden=!chips.length;
  $('#applied-filters').innerHTML=chips.map(([key,label])=>`<button class="applied-chip" data-clear="${key}" aria-label="Remove ${escapeHTML(label)} filter">${escapeHTML(label)}${icon('close')}</button>`).join('')+(chips.length>1?'<button class="clear-all" data-reset>Clear all</button>':'');
  if(isNotebookHome)window.GlobeeNotebook?.sync(state);
  if(state.view==='map')renderMap(places);
}
function resetFilters(){state.age=[];state.price='all';state.type='all';state.query='';state.dates=null;state.collection=null;state.edit=dedicatedEdit;state.browseAll=false;render();}
function clearFilter(key){state[key]=key==='browseAll'?false:['dates','collection','edit'].includes(key)?null:key==='age'?[]:key==='query'?'':'all';render();}
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
  if(menu==='region')html=`<p class="filter-help">Choose a local area to explore.</p><div class="filter-options">${option('Exeter','Exeter · Devon','Exeter and across Devon',state.region==='Exeter')}${option('Bristol','Bristol','Bristol family events and days out',state.region==='Bristol')}${option('Nottingham','Nottingham','Nottingham & nearby places',state.region==='Nottingham')}</div>`;
  if(menu==='age')html=`<p class="filter-help">Choose one or more ages. We’ll show places suitable for at least one selected age. Places with unconfirmed ages are left out.</p><div class="filter-options age-options">${ageBands.map(b=>option(b.id,b.label+' years','',state.age.includes(b.id),'checkbox','ages')).join('')}</div>`;
  if(menu==='price')html=`<p class="filter-help">Paid includes tickets and food or drink purchases. Conditional offers are explained on the place card.</p><div class="filter-options">${option('all','Any price','',state.price==='all')}${option('free','Free','No entry fee for the activity shown',state.price==='free')}${option('paid','Paid','Tickets, food or drink',state.price==='paid')}</div>`;
  if(menu==='type')html=`<div class="filter-options">${availableTypes.filter(([id])=>id!=='fossil'||state.region==='Exeter').map(([id,title])=>option(id,title,id==='activity'?'Includes arts, outdoor activities and holiday clubs':id==='market'?'Farmers’ markets, produce and food & makers markets':id==='fossil'?'Jurassic Coast day trips from Exeter · Devon':'',state.type===id)).join('')}</div>`;
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
  const credits=p.imageKind==='illustration'?`Illustration: ${escapeHTML(p.credit)}. ${escapeHTML(p.imageReference)} <a href="image-credits.html#children-climbing">Image credits</a>.`:p.photoSource?`Photo: <a href="${escapeHTML(p.photoSource)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.credit)}</a>${p.photoLicenceUrl?` · <a href="${escapeHTML(p.photoLicenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.photoLicence)}</a>`:''}. ${escapeHTML(p.imageReference||'Photograph shown with a layout crop.')}`:'No photograph shown: a suitable image with confirmed reuse permission is not available.';
  const editReason=p.editReasons?.[state.collection];
  const evidence=p.editEvidence?.[state.collection];
  const editNote=editReason?`<div class="detail-note edit-detail"><h3>Why it’s in this edit</h3><p>${escapeHTML(editReason)}</p>${evidence?`<p>${evidence.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)}</a>`).join(' · ')}</p><p class="evidence-date">Official information checked ${escapeHTML(p.editChecked)}.</p>`:''}</div>`:'';
  const pairing=state.collection==='eat-play'&&p.eatPlay?`<div class="detail-note play-pair"><h3>Two stops, one outing</h3><dl><dt>Eat</dt><dd>${escapeHTML(p.eatPlay.food)}</dd><dt>Play</dt><dd>${escapeHTML(p.eatPlay.play)}</dd><dt>Between the two</dt><dd>${escapeHTML(p.eatPlay.connection)}</dd></dl><p>${escapeHTML(p.eatPlay.note)}</p></div>`:'';
  $('#detail-content').innerHTML=`${p.image?`<div class="detail-picture">${photo(p)}</div>`:''}<div class="detail-body">${locality(p)}<h2>${escapeHTML(p.name)}</h2><div class="card-meta">${meta(p)}</div>${(p.dateNote||p.datePeriods?.length)?`<p class="date-note event-date">${p.datePeriods?icon('calendar'):''}${escapeHTML(scheduleLabel(p))}</p>`:''}<p>${escapeHTML(p.description)}</p>${editNote}${pairing}<div class="detail-note"><h3>Good to know</h3><p>${escapeHTML(p.note)}</p><p><strong>Schedule:</strong> ${escapeHTML(p.scheduleText||'Check the provider')}</p>${p.datePeriods?.length?`<p>${p.datePeriods.filter(d=>d.end>=TODAY).map(dateRangeLabel).join(' · ')}</p>`:''}</div><p class="detail-address">${icon('pin')} ${escapeHTML(p.address)}</p>${p.source?`<a class="primary-button detail-link" href="${escapeHTML(p.source)}" target="_blank" rel="noopener noreferrer">Check the official details${icon('external')}</a>`:'<p class="detail-note">Official link to follow.</p>'}<p class="detail-source">${credits}${p.checked?`<br>Official event details checked: ${escapeHTML(p.checked)}.`:''}<br>Prices & schedules change — always check the provider before booking.</p></div>`;
  if(window.GlobeeFossilMap?.isFossilPlace(p))$('#detail-content .detail-address').insertAdjacentHTML('afterend','<p><a class="primary-button" href="/?region=Devon&amp;q=fossil&amp;view=map">See fossil-hunting spots on the Globee Map ↗</a></p>');
  fixImages($('#detail-content'));$('#detail-dialog').showModal();
}
$('#detail-close').addEventListener('click',()=>$('#detail-dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('click',event=>{
  const windowTab=event.target.closest('[data-plans-window]');
  if(windowTab){plansWindow=windowTab.dataset.plansWindow;renderWeekend();document.getElementById(`plans-window-${plansWindow}`)?.focus({preventScroll:true});return;}
  if(event.target.closest('[data-close-map-selection]')){selectedId=null;mapSelectionDismissed=true;$('#map-selection').hidden=true;document.querySelectorAll('.map-pin.selected').forEach(el=>el.classList.remove('selected'));return;}
  const mapChoice=event.target.closest('[data-select-map]');if(mapChoice){selectMapPlace(mapChoice.dataset.selectMap);return;}
  if(event.target.closest('[data-browse-all]')){state.browseAll=true;render();$('#results-heading').scrollIntoView({block:'start'});return;}
  if(event.target.closest('[data-retry-map]')){render();return;}
  if(event.target.closest('[data-load-more]')){loadMore(true);return;}
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
document.addEventListener('keydown',event=>{
  if(!event.target.matches('[data-plans-window]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  plansWindow=event.key==='Home'?'weekend':event.key==='End'?'four-weeks':plansWindow==='weekend'?'four-weeks':'weekend';
  renderWeekend();document.getElementById(`plans-window-${plansWindow}`)?.focus({preventScroll:true});
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
function drawMapMarkers(){
  if(!map||state.view!=='map')return;
  const L=window.L;
  markers.forEach(m=>map.removeLayer(m));markers=[];
  const fossilFocus=mapPlaces.length>0&&mapPlaces.every(p=>p.fossilSpot);
  const groups=GlobeeDiscovery.mapGroups(mapPlaces,p=>map.latLngToContainerPoint(p.coords),(fossilFocus&&map.getZoom()>=15)||map.getZoom()>=18?0:65);
  groups.forEach(({places:group})=>{
    const p=group.find(v=>v.id===selectedId)||group[0];
    const clustered=new Set(group.map(spotKey)).size>1;
    const isEvent=p.type!=='club'&&p.datePeriods?.length>0;
    const baseLabel=p.type==='club'?'Holiday club':isEvent?'What’s on':p.type==='cafe'?'Café':p.type==='ice'?'Ice cream':p.category||'Activity';
    const fossilTown=group.every(v=>v.fossilSpot&&v.fossilSpot.town===p.fossilSpot?.town)?p.fossilSpot.town:null;
    const label=clustered?`${fossilTown?fossilTown+' · ':''}${group.length} ${group.every(v=>v.fossilSpot)?'spots':'plans'}`:p.fossilSpot?p.name:group.length>1?`${group.every(v=>v.kind===p.kind)?baseLabel:'Places'} · ${group.length}`:baseLabel;
    const coords=clustered?[0,1].map(i=>group.reduce((sum,v)=>sum+v.coords[i],0)/group.length):p.coords;
    const pin=p.fossilSpot&&!clustered?`<span class="map-pin fossil-point ${p.fossilSpot.id==='heritage-centre'?'fossil-centre':''}" data-marker-id="${escapeHTML(p.id)}"><b>${escapeHTML(label)}</b></span>`:`<span class="map-pin ${clustered?'cluster ':''}${group.some(v=>v.id===selectedId)?'selected':''}" data-marker-id="${escapeHTML(p.id)}" data-group-ids="${escapeHTML(group.map(v=>v.id).join('|'))}">${icon(clustered?'map':isEvent?'calendar':p.type)}${escapeHTML(label)}</span>`;
    const marker=L.marker(coords,{icon:L.divIcon({className:'globee-map-marker',html:pin,iconSize:null,iconAnchor:p.fossilSpot&&!clustered?[10,10]:[32,20]}),title:clustered?`${group.length} nearby plans — zoom in to explore`:group.map(v=>v.name).join(' · '),keyboard:true}).addTo(map);
    marker.on('click',()=>{if(clustered){const bounds=L.latLngBounds(group.map(v=>v.coords)),zoom=Math.min(18,Math.max(map.getZoom()+2,map.getBoundsZoom(bounds,false,[90,90])));map.setView(bounds.getCenter(),zoom,{animate:false});}else selectMapPlace(p.id);});markers.push(marker);
  });
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
    map.on('zoomend',drawMapMarkers);
  }
  const records=places.filter(GlobeeDiscovery.hasMapLocation);
  const located=window.GlobeeFossilMap?GlobeeFossilMap.expand(records):records;
  const fossilFocus=located.length>0&&located.every(p=>p.fossilSpot);
  mapPlaces=located;
  if(mapSelectionContext!==lastFilterSignature)mapSelectionDismissed=false;
  mapSelectionContext=lastFilterSignature;
  selectedId=mapSelectionDismissed?null:fossilFocus?(located.some(p=>p.id===selectedId)?selectedId:null):GlobeeDiscovery.initialMapSelection(located,selectedId);
  const spots=new Set(located.map(spotKey));
  map.invalidateSize();
  if(located.length)map.fitBounds(L.latLngBounds(located.map(p=>p.coords)),{paddingTopLeft:fossilFocus?[90,110]:[40,40],paddingBottomRight:fossilFocus?[130,110]:[40,200],maxZoom:fossilFocus?17:14,animate:false});
  else map.setView(REGION_CENTRES[state.region],12);
  drawMapMarkers();
  const missing=places.length-records.length;
  $('#map-note').textContent=fossilFocus?'Pins mark beach areas and the information centre, not guaranteed finds or a walking route. Check tides and conditions; keep well away from cliffs and mudslides.':`${records.length} of ${places.length} results mapped · ${spots.size} map points. Zoom into numbered groups.${missing?` ${missing} ${missing===1?'result has':'results have'} no single confirmed pin; see the list.`:''} Pins mark venues or grounds; check the provider for the entrance.`;
  if(fossilFocus){$('#results-heading').textContent='Fossil hunting on the Jurassic Coast';$('#results-subtitle').textContent=[...new Set(located.map(p=>p.fossilSpot.town))].join(' & ')+' · Dorset day trips';$('#result-count').textContent=`${spots.size} map spots · ${records.length} ${records.length===1?'outing':'outings'}`;}
  if(selectedId)selectMapPlace(selectedId);else $('#map-selection').hidden=true;
  $('#map-view').scrollIntoView({block:'start',behavior:'instant'});
}
function selectMapPlace(id){
  const p=mapPlaces.find(v=>v.id===id);if(!p)return;
  selectedId=id;mapSelectionDismissed=false;
  $('#map-selection').hidden=false;
  $('#map-selection').innerHTML=`<button class="map-selection-close" data-close-map-selection aria-label="Hide selected place">${icon('close')}</button><button class="map-card${p.image?'':' no-photo'}" data-open="${escapeHTML(p.parentId||p.id)}">${p.image?imageTag(p):''}<div><p>${escapeHTML(p.category)} · ${escapeHTML(p.fossilSpot?p.fossilSpot.locality:REGION_LABELS[p.region]||p.region)}</p><h3>${escapeHTML(p.name)}</h3><span class="price ${p.priceType==='free'?'free':''}">${escapeHTML(p.priceLabel)}</span></div></button>`;
  if(p.fossilSpot)$('#map-selection').innerHTML+=`<div class="fossil-map-note"><p>${escapeHTML(p.fossilSpot.description)}</p><a href="${escapeHTML(p.fossilSpot.source)}" target="_blank" rel="noopener noreferrer">Official collecting &amp; tide advice ↗</a></div>`;
  const group=mapPlaces.filter(v=>spotKey(v)===spotKey(p)),index=group.findIndex(v=>v.id===id);
  if(group.length>1)$('#map-selection').innerHTML+=`<div class="map-group-nav"><button data-select-map="${escapeHTML(group[(index-1+group.length)%group.length].id)}" aria-label="Previous activity at this location">←</button><span>${index+1} of ${group.length} at this location</span><button data-select-map="${escapeHTML(group[(index+1)%group.length].id)}" aria-label="Next activity at this location">→</button></div>`;
  fixImages($('#map-selection'));
  document.querySelectorAll('[data-marker-id]').forEach(e=>e.classList.toggle('selected',(e.dataset.groupIds||e.dataset.markerId).split('|').includes(id)));
}
$('#view-toggle').addEventListener('click',()=>{
  const toMap=state.view==='list';if(toMap)listScroll=window.scrollY;
  state.view=toMap?'map':'list';document.body.classList.toggle('map-mode',toMap);
  $('#map-view').hidden=!toMap;$('#list-view').hidden=toMap;
  $('#view-toggle').innerHTML=`${icon(toMap?'list':'map')}<span>${toMap?'Show list':'Show map'}</span>`;
  $('#view-toggle').setAttribute('aria-label',toMap?'Show list':'Show map');
  if(toMap)window.scrollTo({top:0,behavior:'instant'});
  render();
  if(!toMap)window.scrollTo({top:listScroll,behavior:'instant'});
  if(toMap&&map)requestAnimationFrame(()=>map.invalidateSize());
});
window.GlobeeNotebookSearch=query=>{state.query=String(query||'').trim();render();};
window.addEventListener('globee:data',event=>{data=withVerifiedHalfTermClubs(event.detail.places).map(GlobeeImages.decorate);lastListSignature='';lastPrimaryPlansKey=null;render();if(currentMenu==='dates')renderCalendar();});
render();
if(routeParams.get('view')==='map')$('#view-toggle').click();
