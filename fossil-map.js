(function(root){
  'use strict';
  // Display-only points within existing Sheet records, not duplicate activities.
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
  const monmouthName='Monmouth Beach – Fossil Hunting (Dorset day trip)';
  const destinations={
    [placeName]:{locality:'Charmouth · Dorset',town:'Charmouth',source,spots},
    [monmouthName]:{
      locality:'Lyme Regis · Dorset',town:'Lyme Regis',source:'https://www.dinosaurland.co.uk/monmouth-beach/',
      spots:[{id:'monmouth-start',name:'Monmouth Beach',category:'Beach visit · start here',coords:[50.7194904,-2.9454451],description:'Start near the Monmouth Beach car parks; this is not a fossil-find pin. Explore loose beach gravel only when tides and conditions allow. Leave the ammonite pavement and embedded fossils intact; stay away from cliffs and slippery seaweed. Parking costs extra.',coordinateSource:'https://www.lymeregistowncouncil.gov.uk/car-parks'}]
    }
  };
  const isFossilPlace=p=>Object.hasOwn(destinations,p.name);
  function expand(places){
    return places.flatMap(p=>{
      const destination=destinations[p.name];
      return destination?destination.spots.map(s=>({...p,id:p.id+'--'+s.id,parentId:p.id,name:s.name,category:s.category,coords:s.coords,fossilSpot:{...s,source:destination.source,locality:destination.locality,town:destination.town,checked:'2026-10-11'}})):[p];
    });
  }
  const api={placeName,monmouthName,spots,destinations,isFossilPlace,expand};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeFossilMap=api;
})(typeof window!=='undefined'?window:globalThis);
