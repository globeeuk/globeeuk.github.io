'use strict';
// 6 November is GMT in Exeter; the banner ends at 23:59 UK local time.
const MUSIC_FEATURE_END=Date.parse('2026-11-06T23:59:00Z');
const musicFeature=document.getElementById('exeter-music-feature');
function syncMusicFeature(region){
  if(!musicFeature)return;
  musicFeature.hidden=region!=='Exeter'||Date.now()>=MUSIC_FEATURE_END;
}
window.GlobeeMusicFeature={sync:syncMusicFeature};
syncMusicFeature(document.getElementById('region-label')?.textContent==='Exeter · Devon'?'Exeter':null);
setTimeout(()=>syncMusicFeature(document.getElementById('region-label')?.textContent==='Exeter · Devon'?'Exeter':null),Math.max(0,MUSIC_FEATURE_END-Date.now()));
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)syncMusicFeature(document.getElementById('region-label')?.textContent==='Exeter · Devon'?'Exeter':null);
});
