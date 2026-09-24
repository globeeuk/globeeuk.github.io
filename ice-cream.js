(function(){
  'use strict';
  const places=window.GLOBEE_ICE_CREAM_PLACES||[];
  const $=selector=>document.querySelector(selector);
  const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cone='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9a7 7 0 0 1 14 0M5 9h14l-7 13ZM8 9l4 10M16 9l-4 10"/></svg>';
  const params=new URLSearchParams(location.search);
  let region=params.get('region')==='Bristol'?'Bristol':'Devon';
  let listed=false,map=null,markers=[],selectedId=null,assetPromise=null;
  const current=()=>places.filter(place=>place.region===region);
  const placeArea=place=>place.town===place.region?place.town:`${place.town} · ${place.region}`;
  function placeLinks(place){
    const query=encodeURIComponent(`${place.name}, ${place.address}`);
    const links=[`<a href="https://www.google.com/maps/search/?api=1&amp;query=${query}" target="_blank" rel="noopener noreferrer">Directions ↗</a>`];
    if(place.website)links.push(`<a href="${safe(place.website)}" target="_blank" rel="noopener noreferrer">${place.website.includes('facebook.com')?'Provider page':'Official site'} ↗</a>`);
    if(place.instagram)links.push(`<a href="${safe(place.instagram)}" target="_blank" rel="noopener noreferrer" data-social-platform="instagram">Instagram ↗</a>`);
    return `<div class="scoop-place-links">${links.join('')}</div>`;
  }
  function facts(place){return `<div class="scoop-facts"><span>${safe(place.style)}</span>${place.maker?`<span>${safe(place.maker)}</span>`:''}</div>`;}
  function selection(place){return `<button type="button" class="scoop-selection-close" data-close-selection aria-label="Hide selected place">×</button><small>${safe(placeArea(place))}</small><h2>${safe(place.name)}</h2>${facts(place)}<p>${safe(place.note)}</p><p>${safe(place.address)}</p>${placeLinks(place)}`;}
  function renderList(){
    $('#scoop-list').innerHTML=current().map(place=>`<article class="scoop-list-card"><small>${safe(placeArea(place))}</small><h2>${safe(place.name)}</h2>${facts(place)}<p>${safe(place.note)}</p><p>${safe(place.address)}</p>${placeLinks(place)}<button type="button" data-see-on-map="${safe(place.id)}">See on map →</button></article>`).join('');
  }
  function pinIcon(active){return L.divIcon({className:'scoop-leaflet-marker',html:`<span class="scoop-map-pin ${active?'selected':''}">${cone}<span>Ice cream</span></span>`,iconSize:[38,38],iconAnchor:[19,19]});}
  function select(id){
    const place=current().find(item=>item.id===id);if(!place)return;
    selectedId=id;
    $('#scoop-selection').innerHTML=selection(place);
    $('#scoop-selection').hidden=false;
    markers.forEach(({marker,place:item})=>{const active=item.id===id;marker.setIcon(pinIcon(active));marker.setZIndexOffset(active?1000:0);});
  }
  function drawMarkers(){
    if(!map)return;
    markers.forEach(({marker})=>marker.remove());markers=[];
    current().forEach(place=>{
      const marker=L.marker(place.coords,{icon:pinIcon(place.id===selectedId),title:place.name,keyboard:true}).addTo(map);
      marker.on('click',()=>select(place.id));
      markers.push({marker,place});
    });
    if(selectedId)select(selectedId);
  }
  function fitRegion(){
    if(!map)return;
    const visible=current();
    if(visible.length)map.fitBounds(L.latLngBounds(visible.map(place=>place.coords)),{paddingTopLeft:[38,45],paddingBottomRight:[38,155],maxZoom:13,animate:false});
    else map.setView(region==='Bristol'?[51.4545,-2.5879]:[50.7236,-3.5303],11);
  }
  function loadAssets(){
    if(window.L)return Promise.resolve();
    if(assetPromise)return assetPromise;
    assetPromise=new Promise((resolve,reject)=>{
      const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.async=true;
      const timeout=setTimeout(()=>reject(new Error('Map library timed out')),15000);
      script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);reject(new Error('Map library unavailable'));};
      document.head.appendChild(css);document.head.appendChild(script);
    }).catch(error=>{assetPromise=null;throw error;});
    return assetPromise;
  }
  async function showMap(){
    if(listed)return;
    if(!map){
      $('#scoop-status').textContent='Loading the map…';
      try{await loadAssets();}catch{
        $('#scoop-map').innerHTML='<div class="scoop-map-unavailable">The map could not load. The full list is still available below.</div>';
        $('#scoop-status').textContent='Map unavailable. Choose Show list to browse every place.';
        return;
      }
      if(listed)return;
      if(!map){
        $('#scoop-map').innerHTML='';
        map=L.map('scoop-map',{scrollWheelZoom:false,zoomControl:false});
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
        L.control.zoom({position:'topright'}).addTo(map);
      }
    }
    map.invalidateSize();drawMarkers();fitRegion();
    if(!selectedId||!current().some(place=>place.id===selectedId))select(current()[0]?.id);
    $('#scoop-status').textContent=`${current().length} places on the map · Tap a pin for scoop notes.`;
  }
  function setList(value){
    listed=value;
    $('#scoop-map-stage').hidden=value;
    $('#scoop-list').hidden=!value;
    $('#scoop-view-toggle').textContent=value?'Show map':'Show list';
    $('#scoop-view-toggle').setAttribute('aria-expanded',String(value));
    if(!value)requestAnimationFrame(showMap);
  }
  function render(){
    const label=region==='Bristol'?'Bristol':'Exeter & Devon';
    $('#scoop-region-label').textContent=label;
    $('#scoop-count').textContent=`${current().length} places`;
    $('#scoop-status').textContent=`${current().length} places on the map · Tap a pin for scoop notes.`;
    $('#scoop-home-link').href=`index.html?region=${region}`;
    $('#scoop-back').href=`index.html?region=${region}`;
    $('#scoop-footer-home').href=`index.html?region=${region}`;
    document.querySelectorAll('[data-scoop-region]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scoopRegion===region)));
    renderList();
    if(!listed)showMap();
  }
  document.addEventListener('click',event=>{
    const regionButton=event.target.closest('[data-scoop-region]');
    if(regionButton){region=regionButton.dataset.scoopRegion;selectedId=null;params.set('region',region);history.replaceState(null,'',`${location.pathname}?${params}`);render();return;}
    if(event.target.closest('[data-close-selection]')){$('#scoop-selection').hidden=true;selectedId=null;drawMarkers();return;}
    const see=event.target.closest('[data-see-on-map]');if(see){selectedId=see.dataset.seeOnMap;setList(false);$('#scoop-map-stage').scrollIntoView({block:'start'});return;}
    if(event.target.closest('#scoop-view-toggle'))setList(!listed);
  });
  render();
})();
