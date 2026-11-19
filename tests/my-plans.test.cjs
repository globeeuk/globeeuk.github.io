const test=require('node:test');
const assert=require('node:assert/strict');
const {group,fromPlace,plan,londonDay,nextWeeks,LIMIT,planningShortcut}=require('../my-plans.js');
const make=(id,endDate,extra={})=>({id,name:id,endDate,...extra});
test('The planning action follows the saved list, including the last removal and ended-item retention',()=>{
  const empty=group([],'2026-11-19');
  assert.equal(planningShortcut('Bristol',empty.items.length).href,'/?region=Bristol#plans-window-weekend');
  const saved=group([make('first','2026-11-21'),make('second','2026-11-22')],'2026-11-19');
  assert.deepEqual(planningShortcut('Nottingham',saved.items.length),{action:'saved',label:'My plans · 2',href:'/my-plans/?region=Nottingham'});
  const removed=group(saved.items.filter(p=>p.id==='first'),'2026-11-19');
  assert.equal(planningShortcut('Nottingham',removed.items.length).label,'My plans · 1');
  assert.equal(planningShortcut('Nottingham',group([], '2026-11-19').items.length).action,'weekend');
  const ended=group(saved.items,'2026-11-23');
  assert.equal(planningShortcut('Bristol',ended.items.length).label,'My plans · 2');
});
test('The planning action keeps the current region and shares the existing My plans default',()=>{
  for(const region of ['Devon','Exeter','invalid']){
    assert.equal(planningShortcut(region,0).href,'/?region=Devon#plans-window-weekend');
    assert.equal(planningShortcut(region,1).href,'/my-plans/');
  }
  for(const region of ['Bristol','Nottingham']){
    assert.equal(planningShortcut(region,0).href,'/?region='+region+'#plans-window-weekend');
    assert.equal(planningShortcut(region,50).href,'/my-plans/?region='+region);
  }
});
test('Past plans are kept by last day and the fifth older entry is pruned',()=>{
  const rows=['05','13','01','14','16'].map(day=>make('plan-'+day,'2026-11-'+day));
  const on=group(rows,'2026-11-16');
  assert.deepEqual(on.upcoming.map(p=>p.id),['plan-16']);
  assert.deepEqual(on.past.map(p=>p.id),['plan-14','plan-13','plan-05','plan-01']);
  const next=group(on.items,'2026-11-17');
  assert.deepEqual(next.items.map(p=>p.id),['plan-16','plan-14','plan-13','plan-05']);
  assert.deepEqual(group(next.items,'2026-11-20').items,next.items);
});
test('The London day, including a summer midnight, governs the cutoff',()=>{
  assert.equal(londonDay(new Date('2027-07-14T22:59:59Z')),'2027-07-14');
  assert.equal(londonDay(new Date('2027-07-14T23:00:00Z')),'2027-07-15');
  assert.equal(londonDay(new Date('2026-11-16T00:00:00Z')),'2026-11-16');
});
test('Save uses the final confirmed occurrence and does not invent a date for places or unknown events',()=>{
  const event={id:'a',name:'Series',kind:'event',datePeriods:[
    {start:'2026-12-19',end:'2026-12-20'},{start:'2026-11-12',end:'2026-11-13'}
  ],endDate:'2026-12-19'};
  assert.equal(fromPlace(event).endDate,'2026-12-20');
  assert.equal(fromPlace({...event,kind:'place'}),null);
  assert.equal(fromPlace({...event,datePeriods:[],endDate:'2026-02-30'}),null);
  assert.equal(plan({...event,source:'//some-relative-resource'}).source,'');
});
test('The storage limit and the rolling four-week destination stay consistent',()=>{
  const rows=Array.from({length:LIMIT+1},(_,i)=>make('event '+i,'2026-12-20'));
  assert.equal(group([...rows,rows[0]],'2026-11-17').items.length,LIMIT);
  assert.equal(nextWeeks('Bristol','2026-11-16'),'/plans.html?region=Bristol&from=2026-11-16&to=2026-12-13');
});
