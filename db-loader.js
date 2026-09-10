/* Public, read-only Sheet connection. Metadata is small; photos and map load separately. */
(function(){
  'use strict';
  const BASE='https://docs.google.com/spreadsheets/d/e/2PACX-1vRjvwZecLwxmLMRcd6Um0chyEW_2_zrmyJsL4bVZUpQ1Vu2GU5cUzF5HvyEG_jpbZz0-vxYoJfTy9J9/pub';
  const CACHE='globee-db-v1',FRESH=5*60*1000;
  let saved=window.GLOBEE_SNAPSHOT,running=false;
  function apply(snapshot){GlobeeDB.validate(snapshot.master,snapshot.events);if(JSON.stringify(snapshot.master)!==JSON.stringify(saved.master)||JSON.stringify(snapshot.events)!==JSON.stringify(saved.events)){const places=GlobeeDB.normalise(snapshot.master,snapshot.events,window.GLOBEE_EDITORIAL);window.dispatchEvent(new CustomEvent('globee:data',{detail:{places,fetchedAt:snapshot.fetchedAt}}));}saved=snapshot;}
  function status(message,retry=false){const el=document.getElementById('database-status');el.innerHTML='';el.append(document.createTextNode(message));if(retry){const b=document.createElement('button');b.className='text-button';b.textContent='Refresh';b.addEventListener('click',()=>refresh(true));el.append(b);}}
  try{const cache=JSON.parse(localStorage.getItem(CACHE));if(cache?.schema===1&&Date.parse(cache.fetchedAt)>Date.parse(saved.fetchedAt)){apply(cache);}}catch{}
  const savedDate=()=>new Date(saved.fetchedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});
  async function fetchSheet(gid,signal){const response=await fetch(`${BASE}?gid=${gid}&single=true&output=csv`,{signal,credentials:'omit'});if(!response.ok)throw new Error('Database unavailable');const body=await response.text();if(body.length>2000000)throw new Error('Database response too large');return GlobeeDB.parseCSV(body);}
  async function refresh(force=false){
    if(running)return;
    if(!force&&Date.now()-Date.parse(saved.fetchedAt)<FRESH){status(`Directory updated ${savedDate()}.`);return;}
    running=true;status('Checking for the latest activities…');const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{const [master,events]=await Promise.all([fetchSheet(0,controller.signal),fetchSheet(1801686098,controller.signal)]);const snapshot={schema:1,fetchedAt:new Date().toISOString(),master,events};apply(snapshot);try{localStorage.setItem(CACHE,JSON.stringify(snapshot));}catch{}status(`Directory updated ${savedDate()}.`);}
    catch{controller.abort();status(`Showing the saved directory from ${savedDate()}. The latest update could not load.`,true);}
    finally{clearTimeout(timeout);running=false;}
  }
  refresh();
})();
