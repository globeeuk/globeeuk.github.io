const test=require('node:test'),assert=require('node:assert/strict');
const db=require('../db-adapter.js'),discovery=require('../discovery-model.js');
function normalise(schedule,periods){
  const master={name:'Weekly class',tab:'club',type:'music',region:'Devon',price_type:'paid',url:'https://example.org/class',dates:schedule};
  const events=periods.map(([date,end=''])=>({name:master.name,region:'Devon',date,end,price:'Ticketed'}));
  const before=JSON.stringify({master,events}),item=db.normalise([master],events)[0];
  assert.equal(JSON.stringify({master,events}),before);
  return item;
}
const occurs=(p,day)=>(p.datePeriods||[]).some(d=>d.start<=day&&d.end>=day);
test('Tuesday term block yields actual Tuesdays and no weekend picks',()=>{
  const p=normalise('Tuesdays, 3 November–15 December 2026, 2–4pm',[['2026-11-03','2026-12-15']]);
  assert.deepEqual(p.datePeriods.map(d=>d.start),['2026-11-03','2026-11-10','2026-11-17','2026-11-24','2026-12-01','2026-12-08','2026-12-15']);
  assert.equal(occurs(p,'2026-11-14'),false);assert.equal(occurs(p,'2026-11-17'),true);
  assert.deepEqual(discovery.weekendPicks([p],'2026-11-11'),[]);
  assert.equal(discovery.nextFourWeeksPicks([p],'2026-11-11')[0],p);
});
test('Every Wednesday is a weekly session; exact range boundaries and duplicate rows are preserved',()=>{
  const p=normalise('Every Wednesday, 12–1pm',[['2026-11-10','2026-11-25'],['2026-11-18']]);
  assert.deepEqual(p.datePeriods,[{start:'2026-11-11',end:'2026-11-11'},{start:'2026-11-18',end:'2026-11-18'},{start:'2026-11-25',end:'2026-11-25'}]);
  assert.equal(occurs(p,'2026-11-10'),false);assert.equal(occurs(p,'2026-11-26'),false);
});
test('Several weekly weekdays, weekend classes, leap days and year boundaries are kept',()=>{
  const p=normalise('Tuesdays, Wednesdays and Thursdays',[['2028-02-28','2028-03-02']]);
  assert.deepEqual(p.datePeriods.map(d=>d.start),['2028-02-29','2028-03-01','2028-03-02']);
  const weekend=normalise('Saturdays and Sundays',[['2026-12-31','2027-01-03']]);
  assert.deepEqual(weekend.datePeriods.map(d=>d.start),['2027-01-02','2027-01-03']);
  assert.equal(discovery.weekendPicks([weekend],'2026-12-31').length,1);
});
test('Term time and exceptions are not invented; explicit verified sessions still work',()=>{
  for(const schedule of ['Every Wednesday during term time','Saturdays except school holidays','Every other Wednesday','First Wednesday each month','Weekly sessions — dates TBC']){
    const p=normalise(schedule,[['2026-09-09','2027-07-21']]);
    assert.equal(p.datePeriods,null,schedule);assert.match(p.dateNote,/Session dates TBC/);assert.equal(p.kind,'club');
    assert.deepEqual(discovery.nextFourWeeksPicks([p],'2026-11-11'),[]);
    const verified=normalise(schedule,[['2026-09-09','2027-07-21'],['2026-11-18']]);
    assert.deepEqual(verified.datePeriods,[{start:'2026-11-18',end:'2026-11-18'}]);
  }
});
test('Explicit exclusion keeps valid Saturday sessions without guessing an ambiguous year',()=>{
  const p=normalise('Saturdays 10am–1pm, excluding 24 October',[['2026-09-05','2026-12-12']]);
  assert.equal(occurs(p,'2026-10-24'),false);assert.equal(occurs(p,'2026-11-14'),true);
  assert.equal(discovery.weekendPicks([p],'2026-11-11').length,1);
  const ambiguous=normalise('Saturdays except 2 January',[['2026-01-01','2027-01-03']]);
  assert.equal(ambiguous.datePeriods,null);
  const explicit=normalise('Saturdays except 2 January 2027',[['2026-12-26','2027-01-03']]);
  assert.deepEqual(explicit.datePeriods,[{start:'2026-12-26',end:'2026-12-26'}]);
});
test('Continuous events, daily holiday camps and weekly booking options retain date spans',()=>{
  for(const schedule of ['14–15 November, 10am–3pm daily','19–23 October 2026; weekly booking','Winter exhibition']){
    const p=normalise(schedule,[['2026-11-14','2026-11-15']]);
    assert.deepEqual(p.datePeriods,[{start:'2026-11-14',end:'2026-11-15'}]);
    assert.equal(discovery.weekendPicks([p],'2026-11-11').length,1);
  }
});
test('Source rows are immutable and invalid calendar dates cannot become sessions',()=>{
  const p=normalise('Wednesdays',[['2026-02-30','2026-03-04'],['2026-11-20','2026-11-01'],['2026-11-11']]);
  assert.deepEqual(p.datePeriods,[{start:'2026-11-11',end:'2026-11-11'}]);
});
