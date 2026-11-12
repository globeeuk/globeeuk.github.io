(function(root){
  'use strict';
  const region=r=>({Devon:'Exeter',Exeter:'Exeter',Bristol:'Bristol',Nottingham:'Nottingham'}[String(r).trim()]||null);
  const key=s=>String(s||'').normalize('NFC').trim().toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ');
  const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const safeURL=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const publicationKey=(name,r)=>`${region(r)}|${key(name)}`;
  // Persist first publication, including null for undated legacy rows and keys
  // for removed listings. Never replace it with a refresh or later session date.
  function publicationHistory(master,events,previous={}){
    const history={...previous},groups=new Map();
    for(const [rows,field] of [[master,'date_added'],[events,'added']])for(const row of rows){
      if(!region(row.region)||!row.name)continue;
      const k=publicationKey(row.name,row.region);
      if(!groups.has(k))groups.set(k,{master:undefined,dates:[]});
      const group=groups.get(k),value=row[field]||'';
      if(field==='date_added')group.master=value;
      group.dates.push(value);
    }
    for(const [k,g]of groups){
      if(Object.prototype.hasOwnProperty.call(history,k))continue;
      const dates=g.dates.filter(iso).sort();
      history[k]=(g.master!==undefined?!iso(g.master):g.dates.some(d=>!iso(d)))?null:dates[0]||null;
    }
    return history;
  }
  function londonDay(now=new Date()){
    if(!(now instanceof Date))now=new Date(now);
    if(Number.isNaN(now.getTime()))return null;
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function isNewThisWeek(item,now=new Date()){
    const today=londonDay(now),added=item.firstPublished;
    if(!today||!['event','club'].includes(item.kind)||!iso(added)||added>today)return false;
    if(item.datePeriods?.length?!item.datePeriods.some(d=>d.end>=today):item.endDate&&item.endDate<today)return false;
    const monday=new Date(today+'T12:00:00Z');
    monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
    return added>=monday.toISOString().slice(0,10);
  }
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
  // A term/block span is not a session on every date. Expand only plain weekly
  // schedules, including a single explicitly dated exclusion. School holidays
  // and other recurrence rules need individual event rows, not inferred dates.
  function sessionPeriods(periods,schedule){
    const text=String(schedule||'').replace(/\bweekly booking\b/gi,'');
    const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      .flatMap((day,index)=>new RegExp(`\\b(?:every\\s+|each\\s+)${day}\\b|\\b${day}s\\b`,'i').test(text)?[index]:[]);
    const recurring=weekdays.length||/\b(?:weekly|fortnightly|monthly|term[ -]?time)\b/i.test(text)
      ||/\b(?:every|each|first|second|third|fourth|last)\b[^.;]*\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(text);
    if(!recurring)return {periods,unconfirmed:false};
    const excluded=text.match(/\b(?:except|excluding)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?\s*\.?$/i);
    const rule=excluded?text.slice(0,excluded.index):text;
    const uncertain=!weekdays.length||/\b(?:term[ -]?time|fortnightly|monthly|alternate|alternating|other|first|second|third|fourth|last|except\w*|exclud\w*)\b/i.test(rule);
    let unconfirmed=false;
    const dates=new Set();
    for(const period of periods){
      // An explicitly supplied individual session remains authoritative.
      if(period.start===period.end){dates.add(period.start);continue;}
      const first=new Date(period.start+'T12:00:00Z'),last=new Date(period.end+'T12:00:00Z');
      if(uncertain||(last-first)/86400000>3660){unconfirmed=true;continue;}
      let excludedDay=null;
      if(excluded){
        // An omitted year is unambiguous only within a single-year block.
        if(!excluded[3]&&period.start.slice(0,4)!==period.end.slice(0,4)){unconfirmed=true;continue;}
        const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(excluded[2].toLowerCase())+1;
        excludedDay=`${excluded[3]||period.start.slice(0,4)}-${String(month).padStart(2,'0')}-${excluded[1].padStart(2,'0')}`;
        if(!iso(excludedDay)){unconfirmed=true;continue;}
      }
      for(const cursor=new Date(first);cursor<=last;cursor.setUTCDate(cursor.getUTCDate()+1)){
        const day=cursor.toISOString().slice(0,10);
        if(weekdays.includes(cursor.getUTCDay())&&day!==excludedDay)dates.add(day);
      }
    }
    return {periods:[...dates].sort().map(day=>({start:day,end:day})),unconfirmed};
  }
  function normalise(master,events,editorial={},previousPublications={}){
    validate(master,events);
    const groups=new Map(),aliases=editorial.aliases||{},annotations=editorial.annotations||{};
    const groupKey=(name,r)=>`${r}|${key(name)}`;
    const history=publicationHistory(master,events,previousPublications),publications=new Map();
    for(const [id,day]of Object.entries(history)){
      const split=id.indexOf('|'),r=id.slice(0,split),oldName=id.slice(split+1);
      const alias=Object.entries(aliases).find(([name])=>key(name)===oldName)?.[1];
      const k=groupKey(alias||oldName,r),known=publications.get(k);
      // An unknown earlier identity stays unknown, even after a dated rename.
      publications.set(k,known===null||!iso(day)?null:known&&known<day?known:day);
    }
    for(const m of master){const r=region(m.region);if(!r||!m.name)continue;const k=groupKey(m.name,r);if(groups.has(k))throw new Error('Duplicate master record');groups.set(k,{master:m,events:[],region:r});}
    for(const e of events){const r=region(e.region);if(!r||!e.name)continue;const name=aliases[e.name]||e.name,k=groupKey(name,r);if(!groups.has(k))groups.set(k,{master:null,events:[],region:r,name});groups.get(k).events.push(e);}
    const items=[];
    for(const [k,g] of groups){
      const m=g.master||{},es=g.events,name=m.name||g.name,a=annotations[name]||{};
      if(/\bcancelled\b|\bcanceled\b/i.test([m.dates,m.description].join(' ')))continue;
      const rawPeriods=[];
      for(const e of es){if(!iso(e.date)||e.end&&!iso(e.end))continue;const d={start:e.date,end:e.end||e.date};if(d.end<d.start)continue;if(!rawPeriods.some(v=>v.start===d.start&&v.end===d.end))rawPeriods.push(d);}
      rawPeriods.sort((x,y)=>x.start.localeCompare(y.start));
      const sessions=sessionPeriods(rawPeriods,m.dates),datePeriods=sessions.periods;
      // Checked 17 Oct 2026: this St Luke's venue currently says it has no
      // online-bookable courses. Hide its undated legacy listing, not the provider;
      // a newly verified dated course can still appear from the Sheet.
      if(/\/venue\/courses\/20996(?:\/|\?|$)/.test(m.url||'')&&!datePeriods.length)continue;
      const kind=a.kind||(m.tab==='club'?'club':rawPeriods.length||iso(m.end_date)?'event':'place');
      const isShow=m.tab==='dayout'&&m.type==='theatre';
      const type=kind==='club'?'club':isShow?'theatre':a.type||({art:'art',arts:'art',animation:'art',outdoor:'outdoors',themepark:'outdoors',cafe:'cafe',ice:'ice',market:'market'}[m.type]||'activity');
      const category=a.category||(kind==='club'?'Holiday club':({sports:'Sport',theatre:'Theatre',music:'Music',arts:'Arts & making',art:'Arts & making',history:'History',sensory:'Sensory activities',education:'Learning',food:'Food & drink',outdoor:'Outdoors',themepark:'Theme park',film:'Film',cinema:'Cinema',dance:'Dance',animation:'Animation',festival:'Festival'}[m.type]|| (kind==='event'?'What’s on':'Family activity')));
      const ageMin=m.age_min===''||m.age_min==null?null:Number(m.age_min),ageMax=m.age_max===''||m.age_max==null?null:Number(m.age_max);
      const ages=Number.isFinite(ageMin)&&Number.isFinite(ageMax)&&ageMin>=0&&ageMax>=ageMin?[ageMin,ageMax]:null;
      // Event-tab prices describe the dated visit. Conflicting entries remain TBC.
      const eventPrices=[...new Set(es.map(e=>e.price).filter(Boolean))];
      const eventPrice=eventPrices.length===1?eventPrices[0]:eventPrices.length>1?'Price varies — check provider':'';
      const priceLabel=a.priceCaution?'Check admission details':eventPrice||m.price||'Price TBC';
      const priceType=a.priceCaution?'unknown':eventPrices.length>1?'unknown':eventPrice?(/^free(?: entry| admission)?$/i.test(eventPrice)?'free':/ticket|£|paid/i.test(eventPrice)?'paid':'unknown'):m.price_type==='free'?(/^free(?: entry| admission)?$/i.test(m.price||'')?'free':'unknown'):m.price_type==='paid'?'paid':'unknown';
      const source=safeURL(m.url),venue=source?(editorial.venues||[]).find(v=>new URL(source).hostname.replace(/^www\./,'')===v.host.replace(/^www\./,'')&&(!v.matchLocation||new RegExp(v.matchLocation,'i').test(m.location||''))):null;
      const filteredAges=Array.isArray(a.ages)&&a.ages.length===2?a.ages:ages;
      const item={id:'db-'+encodeURIComponent(k),name,region:g.region,type,kind,category,description:m.description||'Open the details for the available schedule. Further venue information is being checked.',address:m.location||'Location details TBC',source,priceType,priceLabel,ages:filteredAges,ageLabel:a.ageLabel||(filteredAges?(filteredAges[0]===0&&filteredAges[1]>=16?'All ages':`${filteredAges[0]}–${filteredAges[1]} years`):'Age TBC'),dateNote:datePeriods.length?'':kind==='place'?(m.dates||'Check opening times'):'Dates TBC',datePeriods:datePeriods.length?datePeriods:null,endDate:iso(m.end_date)?m.end_date:null,scheduleText:m.dates||'Dates TBC',note:a.priceCaution||'Prices & schedules change — always check the provider before booking.',image:a.image||'',imageAlt:a.imageAlt||'',credit:a.credit||'',imageReference:a.imageReference||'',coords:a.coords||venue?.coords||null,collections:kind==='place'?(a.collections||[]):[],bookAhead:a.bookAhead===true,editReasons:a.editReasons||{},editEvidence:a.editEvidence||{},editChecked:a.editChecked||'',eatPlay:a.eatPlay||null,photoSource:a.photoSource||'',photoLicence:a.photoLicence||'',photoLicenceUrl:a.photoLicenceUrl||'',sourceRows:{master:!!g.master,events:es.length}};
      if(a.note)item.note=a.note+' Prices & schedules change — always check the provider before booking.';
      if(a.recommendationPaused===true)item.recommendationPaused=true;
      item.firstPublished=publications.get(k)||null;
      if(sessions.unconfirmed&&!datePeriods.length)item.dateNote='Session dates TBC — check the provider';
      if(!source)item.note='The official venue link and practical details are being checked. Please confirm the event with its organiser before travelling.';
      if(isShow)item.category='Theatre & shows';
      items.push(item);
    }
    return items;
  }
  const api={parseCSV,normalise,validate,iso,safeURL,publicationHistory,londonDay,isNewThisWeek};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeDB=api;
})(typeof window!=='undefined'?window:globalThis);
