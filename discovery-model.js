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
  function hasMapLocation(p){return Array.isArray(p.coords)&&p.coords.length===2&&p.coords.every(Number.isFinite)&&Math.abs(p.coords[0])<=90&&Math.abs(p.coords[1])<=180;}
  function initialMapSelection(places,previousId,random=Math.random){
    const located=places.filter(hasMapLocation);
    if(located.some(p=>p.id===previousId))return previousId;
    const recommended=located.filter(p=>(p.collections||[]).includes('best'));
    const pool=recommended.length?recommended:located;
    return pool.length?pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))].id:null;
  }
  function mapGroups(places,project,radius=65){
    const groups=[];
    for(const p of places.filter(hasMapLocation)){
      const point=project(p),key=p.coords.map(n=>n.toFixed(4)).join(',');
      const group=groups.find(g=>g.key===key||Math.hypot(g.point.x-point.x,g.point.y-point.y)<radius);
      if(group)group.places.push(p);else groups.push({key,point,places:[p]});
    }
    return groups;
  }
  const api={weekendRange,weekendPicks,nextBatch,hasMapLocation,initialMapSelection,mapGroups};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeDiscovery=api;
})(typeof window!=='undefined'?window:globalThis);
