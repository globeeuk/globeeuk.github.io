/* Date-based weekend selection and bounded list batches; no invented dates. */
(function(root){
  'use strict';
  const date=s=>new Date(s+'T12:00:00Z');
  function plusDays(s,n){const d=date(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function weekendRange(today){const day=date(today).getUTCDay(),start=day===0?today:plusDays(today,(6-day+7)%7);return {start,end:day===0?today:plusDays(start,1)};}
  function weekendPicks(places,today,limit=5){
    const range=weekendRange(today),seen=new Set();
    // Keep only confirmed overlapping dates, and one card per directory entry.
    const eligible=places.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return (p.datePeriods||[]).some(d=>d.start<=range.end&&d.end>=range.start);});
    // A short dated outing comes before a long-running programme. Stable names
    // break ties; the selection never claims to rank quality or popularity.
    const span=p=>Math.min(...p.datePeriods.filter(d=>d.start<=range.end&&d.end>=range.start).map(d=>date(d.end)-date(d.start)));
    return eligible.sort((a,b)=>span(a)-span(b)||a.name.localeCompare(b.name)).slice(0,limit);
  }
  function nextBatch(places,shown,size=12){return places.slice(Math.max(0,shown),Math.max(0,shown)+size);}
  const api={weekendRange,weekendPicks,nextBatch};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeDiscovery=api;
})(typeof window!=='undefined'?window:globalThis);
