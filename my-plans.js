(function(root){
  'use strict';
  const KEY='globee-my-plans-v1', LIMIT=50, PAST_LIMIT=4;
  const london=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
  const regions={Exeter:'Exeter · Devon',Devon:'Exeter · Devon',Bristol:'Bristol',Nottingham:'Nottingham',Cornwall:'Cornwall'};
  const text=(value,limit=280)=>typeof value==='string'?value.trim().slice(0,limit):'';
  const dateOf=day=>new Date(day+'T12:00:00Z');
  const validDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(+dateOf(day))&&dateOf(day).toISOString().slice(0,10)===day;
  const publicDate=day=>format.format(dateOf(day));
  function londonDay(now=new Date()){
    const d=Object.fromEntries(london.formatToParts(now).map(x=>[x.type,x.value]));
    return [d.year,d.month,d.day].join('-');
  }
  function safeLink(value){
    try{
      const url=new URL(value);
      return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&url.href.length<=1200?url.href:'';
    }catch{return '';}
  }
  function plan(value){
    const id=text(value?.id,500),name=text(value?.name,240),endDate=value?.endDate;
    if(!id||!name||!validDay(endDate))return null;
    return {id,name,region:Object.hasOwn(regions,value.region)?value.region:'',
      origin:value.origin==='edit'?'edit':'directory',
      address:text(value.address),dateLabel:text(value.dateLabel),price:text(value.price,180),source:safeLink(value.source),
      startDate:validDay(value.startDate)&&value.startDate<=endDate?value.startDate:endDate,
      endDate,unavailable:value.unavailable===true};
  }
  function fromPlace(p){
    if(!p||!['event','club'].includes(p.kind))return null;
    const periods=(p.datePeriods||[]).filter(d=>validDay(d.start)&&validDay(d.end)&&d.start<=d.end);
    const endDate=periods.length?periods.map(d=>d.end).sort().at(-1):p.endDate;
    if(!validDay(endDate))return null;
    const start=periods.length?periods.map(d=>d.start).sort()[0]:null;
    const datedLabel=periods.length===1
      ?(start===endDate?publicDate(endDate):(format.formatRange?.(dateOf(start),dateOf(endDate))||publicDate(start)+' – '+publicDate(endDate)))
      :periods.length>1?'Selected dates · Last session '+publicDate(endDate):'Until '+publicDate(endDate);
    const schedule=text(p.scheduleText);
    const dateLabel=periods.length>1&&schedule&&!/\bTBC\b|^check/i.test(schedule)?schedule:datedLabel;
    return plan({...p,origin:'directory',startDate:start,endDate,dateLabel,price:p.priceLabel});
  }
  function pastOrder(a,b){
    return b.endDate.localeCompare(a.endDate)||a.name.localeCompare(b.name,'en-GB')||a.id.localeCompare(b.id);
  }
  function group(entries,today){
    const ids=new Set(),unique=[];
    for(const raw of entries){
      const item=plan(raw);
      if(item&&!ids.has(item.id)){ids.add(item.id);unique.push(item);}
    }
    const upcoming=unique.filter(p=>p.endDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.name.localeCompare(b.name,'en-GB')||a.id.localeCompare(b.id)).slice(0,LIMIT);
    const past=unique.filter(p=>p.endDate<today).sort(pastOrder).slice(0,Math.min(PAST_LIMIT,LIMIT-upcoming.length));
    return {upcoming,past,items:[...upcoming,...past]};
  }
  function nextWeeks(region,today){
    const end=dateOf(today);end.setUTCDate(end.getUTCDate()+27);
    const selected=['Bristol','Nottingham'].includes(region)?region:'Devon';
    return '/plans.html?'+new URLSearchParams({region:selected,from:today,to:end.toISOString().slice(0,10)});
  }
  function planningShortcut(region,count){
    const selected=['Bristol','Nottingham'].includes(region)?region:'Devon';
    return count>0
      ?{action:'saved',label:'My plans · '+count,href:'/my-plans/'+(selected==='Devon'?'':'?region='+selected)}
      :{action:'weekend',label:'This weekend',href:'/?region='+selected+'#plans-window-weekend'};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={KEY,LIMIT,PAST_LIMIT,group,fromPlace,plan,londonDay,nextWeeks,planningShortcut};return;}
  const doc=root.document;
  const panel=doc.querySelector('[data-my-plans-page]');
  const shortcut=panel?.querySelector('[data-my-plans-shortcut]');
  const shortcutHome=shortcut?.querySelector('[data-my-plans-home]');
  const setupHash='#home-shortcut-setup';
  const country=new URLSearchParams(root.location.search).get('region');
  let region=['Bristol','Nottingham'].includes(country)?country:'Devon';
  const directory=new Map(),edits=new Map();
  let authoritative=false,visibleIds=new Set(),undo=null,lastRemoved=false,status='',lastDay='';

  function asRead(){
    try{
      const raw=root.localStorage.getItem(KEY);
      if(raw===null)return {items:[],raw,error:false};
      let entries;
      try{entries=JSON.parse(raw);}catch{return {items:[],raw,error:false};}
      return {items:Array.isArray(entries)?entries.slice(0,200):[],raw,error:false};
    }catch{return {items:[],raw:null,error:true};}
  }
  function write(items){
    try{root.localStorage.setItem(KEY,JSON.stringify(items));return true;}
    catch{return false;}
  }
  function snapshot(){
    const saved=asRead(),today=londonDay();
    const reconciled=saved.items.flatMap(raw=>{
      const p=plan(raw);
      if(!p)return [];
      if(p.origin==='edit')return [edits.get(p.id)||p];
      // An older offline snapshot must not roll a previously updated date back.
      return [authoritative?(directory.get(p.id)||{...p,unavailable:true}):p];
    });
    const state=group(reconciled,today);
    const changed=saved.raw!==null&&JSON.stringify(state.items)!==saved.raw;
    return {...state,today,error:saved.error||(changed&&!write(state.items))};
  }
  function h(tag,content,cls){
    const n=doc.createElement(tag);
    if(cls)n.className=cls;
    if(content)n.textContent=content;
    return n;
  }
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function buttonMarkup(item,details=false){
    if(!item||item.endDate<londonDay())return '';
    const active=visibleIds.has(item.id);
    return '<div class="my-plan-action'+(details?' my-plan-action-detail':'')+'"><button class="my-plan-toggle" type="button" data-save-plan="'+escape(item.id)+'" aria-pressed="'+active+'" aria-label="'+escape((active?'Remove ':'Save ')+item.name+(active?' from My plans':' to My plans'))+'">'+(active?'Saved':'Save')+'</button><p class="my-plan-inline" role="status" hidden></p></div>';
  }
  function cardAction(p,inDetail=false){
    const item=directory.get(p.id);
    return buttonMarkup(item,inDetail);
  }
  function addEditorialButtons(container){
    for(const node of container.querySelectorAll('[data-visit-id][data-visit-end]')){
      const source=safeLink(node.querySelector('a[href]')?.href),endDate=node.dataset.visitEnd;
      const matches=[...directory.values()].filter(p=>p.source===source&&p.endDate===endDate);
      const found=matches.length===1?matches[0]:null;
      const id=node.dataset.visitId;
      const date=node.querySelector('p strong')?.textContent;
      const item=found||plan({id:'santa-2026-'+id,name:node.querySelector('h5')?.textContent,
        region:node.closest('[data-visit-region]')?.dataset.visitRegion,origin:'edit',
        address:node.querySelector('p')?.textContent,dateLabel:date?date+' 2026':'',
        price:node.querySelector('[data-visit-price]')?.textContent,source,startDate:node.dataset.visitStart,endDate});
      if(item?.origin==='edit')edits.set(item.id,item);
      node.insertAdjacentHTML('beforeend',buttonMarkup(item));
    }
  }
  function setDirectory(places,isLive=false){
    directory.clear();
    for(const place of places){
      const entry=fromPlace(place);
      if(entry)directory.set(entry.id,entry);
    }
    authoritative=isLive;
    sync();
  }
  function setRegion(value){
    region=['Bristol','Nottingham'].includes(value)?value:'Devon';
  }
  function setButton(button,item,saved){
    button.textContent=saved?'Saved':'Save';
    button.setAttribute('aria-pressed',String(saved));
    button.setAttribute('aria-label',(saved?'Remove ':'Save ')+item.name+(saved?' from My plans':' to My plans'));
  }
  function renderSavedCard(item,past){
    const card=h('article','',past?'my-plan-card my-plan-card-ended':'my-plan-card');
    const top=h('div','','my-plan-card-top');
    top.append(h('p',regions[item.region]||'Family outing','my-plan-kicker'));
    if(past)top.append(h('span','Ended','my-plan-ended'));
    card.append(top,h('h3',item.name),h('p',item.address,'my-plan-address'),
      h('p',past?'Ended on '+publicDate(item.endDate):item.dateLabel,'my-plan-dates'));
    if(!past){
      if(item.price)card.append(h('p',item.price,'my-plan-price'));
      if(item.unavailable)card.append(h('p','This plan is no longer listed. Check with the organiser before travelling.','my-plan-muted'));
    }
    const actions=h('div','','my-plan-card-buttons');
    if(!past&&!item.unavailable&&item.source){
      const link=h('a','Official details ↗','my-plan-source');
      link.href=item.source;link.target='_blank';link.rel='noopener noreferrer';
      link.setAttribute('aria-label','Official details for '+item.name+' (opens in a new tab)');
      actions.append(link);
    }
    const remove=h('button','','my-plan-toggle');remove.type='button';remove.dataset.savePlan=item.id;
    setButton(remove,item,true);
    actions.append(remove);card.append(actions);
    return card;
  }
  function renderSaved(state){
    const selected=[...panel.querySelectorAll('[data-save-plan]')].indexOf(doc.activeElement);
    const oldId=doc.activeElement?.dataset?.savePlan;
    panel.querySelector('[data-my-plans-total]').textContent=state.items.length===1?'1 saved plan':state.items.length+' saved plans';
    panel.querySelector('[data-my-plans-error]').hidden=!state.error;
    panel.querySelector('[data-my-plans-empty]').hidden=state.items.length>0||state.error;
    panel.querySelector('[data-my-plans-empty-heading]').textContent=lastRemoved?'You’ve removed your last plan.':'No plans saved yet.';
    for(const key of ['upcoming','past']){
      const section=panel.querySelector('[data-my-plans-'+key+']');
      section.hidden=!state[key].length;
      section.querySelector('.my-plan-grid').replaceChildren(...state[key].map(p=>renderSavedCard(p,key==='past')));
    }
    panel.querySelector('[data-my-plans-status]').textContent=status;
    panel.querySelector('[data-my-plans-undo]').hidden=!undo;
    panel.querySelector('[data-my-plans-limit]').hidden=state.items.length<LIMIT;
    for(const link of panel.querySelectorAll('[data-my-plans-browse]'))link.href=nextWeeks(region,state.today);
    if(shortcut){
      const appWindow=root.navigator.standalone===true||root.matchMedia('(display-mode: standalone)').matches;
      shortcut.hidden=state.error||state.items.length===0||appWindow;
    }
    for(const link of doc.querySelectorAll('[data-my-plans-home]')){
      link.href='/?region='+region+(link===shortcutHome?setupHash:'');
    }
    if(oldId){
      const buttons=[...panel.querySelectorAll('[data-save-plan]')];
      const target=buttons.find(b=>b.dataset.savePlan===oldId)||buttons[Math.min(selected,buttons.length-1)]||(undo?panel.querySelector('[data-my-plans-undo]'):panel.querySelector('[data-my-plans-browse]'));
      target?.focus({preventScroll:true});
    }
  }
  function sync(){
    const state=snapshot();lastDay=state.today;
    visibleIds=new Set(state.items.map(p=>p.id));
    if(panel)renderSaved(state);
    for(const link of doc.querySelectorAll('[data-my-plans-link]')){
      link.href='/my-plans/'+(region==='Devon'?'':'?region='+region);
      const count=link.querySelector('[data-my-plans-count]');
      count.hidden=state.items.length===0;count.textContent=state.items.length;
      link.setAttribute('aria-label',state.items.length?'My plans ('+state.items.length+' saved)':'My plans');
    }
    for(const link of doc.querySelectorAll('[data-planning-shortcut]')){
      const next=planningShortcut(region,state.items.length);
      link.href=next.href;
      link.dataset.planningAction=next.action;
      link.dataset.planningRegion=region;
      link.setAttribute('aria-label',next.action==='saved'?'My plans ('+state.items.length+' saved)':'This weekend in '+regions[region]);
      if(link.querySelector('[data-planning-label]').textContent!==next.label){
        link.querySelector('[data-planning-label]').textContent=next.label;
        link.querySelector('svg').innerHTML=next.action==='saved'
          ?'<path d="M6 4h12v16l-6-4-6 4z"/>'
          :'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18"/>';
      }
    }
    if(!panel)for(const button of doc.querySelectorAll('[data-save-plan]')){
      const item=directory.get(button.dataset.savePlan)||edits.get(button.dataset.savePlan);
      if(!item)continue;
      button.hidden=item.endDate<state.today;
      setButton(button,item,visibleIds.has(item.id));
    }
    return state;
  }
  function actionMessage(button,message,ok){
    const inline=button.parentElement?.querySelector('.my-plan-inline');
    if(!inline)return;
    inline.classList.toggle('is-success',ok);
    inline.hidden=!message;inline.textContent=message;
  }
  if(shortcut){
    shortcut.addEventListener('toggle',()=>{
      if(shortcut.open&&!shortcut.hidden)root.globeeTrack?.('home_shortcut_guide_open');
    });
  }
  if(root.location.pathname==='/'&&root.location.hash===setupHash){
    // Measure the arrival after navigation. Leave the ordinary homepage URL for the bookmark.
    root.history.replaceState(root.history.state,'',root.location.pathname+root.location.search);
    doc.addEventListener('DOMContentLoaded',()=>root.globeeTrack?.('home_shortcut_setup_start'),{once:true});
  }
  doc.addEventListener('click',event=>{
    const button=event.target.closest('[data-save-plan],[data-my-plans-undo]');
    if(!button)return;
    const state=snapshot(),id=button.dataset.savePlan;
    const before=state.items.find(p=>p.id===id);
    const restoring=button.hasAttribute('data-my-plans-undo');
    if(restoring&&!undo)return;
    const add=restoring?undo:directory.get(id)||edits.get(id);
    let items=state.items,message='',ok=false;
    if(state.error)message='This browser couldn’t save changes. Check whether site storage is allowed and try again.';
    else if(before&&!restoring){
      items=items.filter(p=>p.id!==before.id);message=before.name+' removed.';ok=true;
    }else if(items.length>=LIMIT){
      message='You can save '+LIMIT+' plans. Remove one in My plans to make room.';
    }else if(!add||(!restoring&&add.endDate<state.today)){
      message='This plan has ended or is no longer listed.';
    }else{
      const changed=group([...items,add],state.today).items;
      if(!changed.some(p=>p.id===add.id))message='Only the four most recently ended plans can be kept.';
      else{items=changed;message=add.name+(restoring?' restored.':' saved to My plans.');ok=true;}
    }
    if(ok&&!write(items)){ok=false;message='This browser couldn’t save changes. Check site storage and try again.';}
    if(ok){
      undo=panel&&before&&!restoring?before:null;
      lastRemoved=items.length===0;
    }
    if(panel)status=message;else actionMessage(button,message,ok);
    sync();
    if(restoring&&ok){
      const restored=[...panel.querySelectorAll('[data-save-plan]')].find(b=>b.dataset.savePlan===add.id);
      restored?.focus({preventScroll:true});
    }
  });
  root.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){lastRemoved=false;sync();}});
  root.addEventListener('pageshow',sync);
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)sync();});
  root.setInterval(()=>{if(londonDay()!==lastDay)sync();},30000);
  root.GlobeeMyPlans={cardAction,setDirectory,setRegion,sync,addEditorialButtons};
  if(panel){
    setDirectory(root.GLOBEE_PLACES||[]);
    root.addEventListener('globee:data',event=>setDirectory(event.detail.places,true));
  }
})(typeof window!=='undefined'?window:globalThis);
