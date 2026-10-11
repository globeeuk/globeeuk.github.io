(function(root){
  'use strict';
  // Display-only points within the existing Charmouth Sheet record, not new activities.
  // Beach guidance: https://charmouth.org/charmouth_village/charmouth-beach/
  // Current collecting/tide advice: https://charmouth.org/chcc/frequently-asked-questions/
  // Positions: published OpenStreetMap beach geometry and Heritage Centre building.
  const placeName='Charmouth Beach – Fossil Hunting (Dorset day trip)';
  const source='https://charmouth.org/chcc/frequently-asked-questions/';
  const spots=[
    {id:'west-beach',name:'West Beach',category:'Fossil beach',coords:[50.733643,-2.90629],description:'Look among loose pebbles and shingle on a falling tide. Stay well away from Black Ven cliffs and mudslides.',coordinateSource:'https://www.openstreetmap.org/api/0.6/map?bbox=-2.906,50.732,-2.895,50.736'},
    {id:'east-beach',name:'East Beach',category:'Fossil beach',coords:[50.733178,-2.896506],description:'Look for small ammonites and belemnites loose along the tideline. Use the footbridge to cross the River Char; keep away from cliffs and mudslides.',coordinateSource:'https://www.openstreetmap.org/api/0.6/map?bbox=-2.906,50.732,-2.895,50.736'},
    {id:'heritage-centre',name:'Heritage Coast Centre',category:'Start here',coords:[50.73348,-2.90199],description:'Ask the wardens about current beach conditions and your finds. Guided fossil walks need advance booking; check opening times before visiting.',coordinateSource:'https://www.openstreetmap.org/way/131652504'}
  ];
  const isFossilPlace=p=>p.name===placeName;
  function expand(places){
    return places.flatMap(p=>isFossilPlace(p)?spots.map(s=>({...p,id:p.id+'--'+s.id,parentId:p.id,name:s.name,category:s.category,coords:s.coords,fossilSpot:{...s,source,checked:'2026-10-11'}})):[p]);
  }
  const api={placeName,spots,isFossilPlace,expand};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeFossilMap=api;
})(typeof window!=='undefined'?window:globalThis);
