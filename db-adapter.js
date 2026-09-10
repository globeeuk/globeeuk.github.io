(function(root){
  'use strict';
  const region=r=>({Devon:'Exeter',Exeter:'Exeter',Nottingham:'Nottingham'}[String(r).trim()]||null);
  const key=s=>String(s||'').normalize('NFC').trim().toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ');
  const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const safeURL=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  function parseCSV(text){
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}}
      else cell+=c;
    }
    if(quoted)throw new Error('Incomplete CSV');
    if(cell||row.length){row.push(cell);rows.push(row);}
    if(!rows.length)throw new Error('Empty CSV');
    const headers=rows.shift().map(h=>h.replace(/^\uFEFF/,'').trim());
    if(!headers.includes('name')||new Set(headers).size!==headers.length)throw new Error('Unexpected CSV headers');
    return rows.filter(r=>r.some(v=>v.trim())).map(r=>{if(r.length!==headers.length)throw new Error('Incomplete CSV row');return Object.fromEntries(headers.map((h,i)=>[h,r[i].trim()]));});
  }
  function validate(master,events){
    if(!Array.isArray(master)||!Array.isArray(events)||!master.length||!events.length)throw new Error('Missing database rows');
    if(!['name','tab','type','region','url','price_type'].every(k=>k in master[0])||!['name','date','end','region','price'].every(k=>k in events[0]))throw new Error('Database columns changed');
    if(master.length+events.length>10000)throw new Error('Database response too large');
    return true;
  }
  function normalise(master,events,editorial={}){
    validate(master,events);
    const groups=new Map(),aliases=editorial.aliases||{},annotations=editorial.annotations||{};
    const groupKey=(name,r)=>`${r}|${key(name)}`;
    for(const m of master){const r=region(m.region);if(!r||!m.name)continue;const k=groupKey(m.name,r);if(groups.has(k))throw new Error('Duplicate master record');groups.set(k,{master:m,events:[],region:r});}
    for(const e of events){const r=region(e.region);if(!r||!e.name)continue;const name=aliases[e.name]||e.name,k=groupKey(name,r);if(!groups.has(k))groups.set(k,{master:null,events:[],region:r,name});groups.get(k).events.push(e);}
    const items=[];
    for(const [k,g] of groups){
      const m=g.master||{},es=g.events,name=m.name||g.name,a=annotations[name]||{};
      if(/\bcancelled\b|\bcanceled\b/i.test([m.dates,m.description].join(' ')))continue;
      const datePeriods=[];
      for(const e of es){if(!iso(e.date)||e.end&&!iso(e.end))continue;const d={start:e.date,end:e.end||e.date};if(d.end<d.start)continue;if(!datePeriods.some(v=>v.start===d.start&&v.end===d.end))datePeriods.push(d);}
      datePeriods.sort((x,y)=>x.start.localeCompare(y.start));
      const kind=a.kind||(m.tab==='club'?'club':datePeriods.length||iso(m.end_date)?'event':'place');
      const type=kind==='club'?'club':a.type||({art:'art',arts:'art',animation:'art',outdoor:'outdoors',themepark:'outdoors',cafe:'cafe',ice:'ice'}[m.type]||'activity');
      const category=a.category||(kind==='club'?'Holiday club':({sports:'Sport',theatre:'Theatre',music:'Music',arts:'Arts & making',art:'Arts & making',history:'History',sensory:'Sensory activities',education:'Learning',food:'Food & drink',outdoor:'Outdoors',themepark:'Theme park',film:'Film',cinema:'Cinema',dance:'Dance',animation:'Animation',festival:'Festival'}[m.type]|| (kind==='event'?'What’s on':'Family activity')));
      const ageMin=m.age_min===''||m.age_min==null?null:Number(m.age_min),ageMax=m.age_max===''||m.age_max==null?null:Number(m.age_max);
      const ages=Number.isFinite(ageMin)&&Number.isFinite(ageMax)&&ageMin>=0&&ageMax>=ageMin?[ageMin,ageMax]:null;
      // Event-tab prices describe the dated visit. Conflicting entries remain TBC.
      const eventPrices=[...new Set(es.map(e=>e.price).filter(Boolean))];
      const eventPrice=eventPrices.length===1?eventPrices[0]:eventPrices.length>1?'Price varies — check provider':'';
      const priceLabel=a.priceCaution?'Check admission details':eventPrice||m.price||'Price TBC';
      const priceType=a.priceCaution?'unknown':eventPrices.length>1?'unknown':eventPrice?(/^free(?: entry| admission)?$/i.test(eventPrice)?'free':/ticket|£|paid/i.test(eventPrice)?'paid':'unknown'):m.price_type==='free'?(/^free(?: entry| admission)?$/i.test(m.price||'')?'free':'unknown'):m.price_type==='paid'?'paid':'unknown';
      const source=safeURL(m.url),venue=source?(editorial.venues||[]).find(v=>new URL(source).hostname.replace(/^www\./,'')===v.host.replace(/^www\./,'')&&(!v.matchLocation||new RegExp(v.matchLocation,'i').test(m.location||''))):null;
      const item={id:'db-'+encodeURIComponent(k),name,region:g.region,type,kind,category,description:m.description||'Open the details for the available schedule. Further venue information is being checked.',address:m.location||'Location details TBC',source,priceType,priceLabel,ages,ageLabel:ages?(ages[0]===0&&ages[1]>=16?'All ages':`${ages[0]}–${ages[1]} years`):'Age TBC',dateNote:datePeriods.length?'':kind==='place'?(m.dates||'Check opening times'):'Dates TBC',datePeriods:datePeriods.length?datePeriods:null,endDate:iso(m.end_date)?m.end_date:null,scheduleText:m.dates||'Dates TBC',note:a.priceCaution||'Prices & schedules change — always check the provider before booking.',image:a.image||'',imageAlt:a.imageAlt||'',credit:a.credit||'',imageReference:a.imageReference||'',coords:a.coords||venue?.coords||null,collections:kind==='place'?(a.collections||[]):[],editReasons:a.editReasons||{},editEvidence:a.editEvidence||{},editChecked:a.editChecked||'',eatPlay:a.eatPlay||null,photoSource:a.photoSource||'',photoLicence:a.photoLicence||'',photoLicenceUrl:a.photoLicenceUrl||'',sourceRows:{master:!!g.master,events:es.length}};
      if(a.note)item.note=a.note+' Prices & schedules change — always check the provider before booking.';
      if(!source)item.note='The official venue link and practical details are being checked. Please confirm the event with its organiser before travelling.';
      items.push(item);
    }
    return items;
  }
  const api={parseCSV,normalise,validate,iso,safeURL};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeDB=api;
})(typeof window!=='undefined'?window:globalThis);
