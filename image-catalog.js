/* Licensed venue photos take priority. Illustrations never depict a real venue. */
(function(root){
  'use strict';
  const photos={
  "cathedral": {
    "image": "assets/images/cathedral.webp",
    "credit": "Wigulf~commonswiki / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:Exeter_Cathedral.jpg",
    "photoLicence": "CC BY 2.5",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by/2.5",
    "imageReference": "Venue photograph (2005); not a photograph of the current event. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "venue",
    "imageAlt": "The west front of Exeter Cathedral; venue photograph from 2005"
  },
  "ramm": {
    "image": "assets/images/ramm.webp",
    "credit": "Pymouss / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:RAMM_-_Gerald_the_giraffe_02.jpg",
    "photoLicence": "CC BY-SA 4.0",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "imageReference": "Venue photograph (2015); not a photograph of the current event. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "venue",
    "imageAlt": "Gerald the giraffe in the Royal Albert Memorial Museum; venue photograph from 2015"
  },
  "wollaton": {
    "image": "assets/images/wollaton.webp",
    "credit": "ChrisSampson87 / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:Wollaton_Hall_Nottingham.jpg",
    "photoLicence": "CC BY-SA 4.0",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "imageReference": "Venue photograph (2012); not a photograph of the current event. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "venue",
    "imageAlt": "Wollaton Hall in Nottingham; venue photograph from 2012"
  },
  "phoenix": {
    "image": "assets/images/phoenix.webp",
    "credit": "Derek Harper / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:Exeter_Phoenix_-_geograph.org.uk_-_315723.jpg",
    "photoLicence": "CC BY-SA 2.0",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "imageReference": "Venue photograph (2007); not a photograph of the current event. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "venue",
    "imageAlt": "The Exeter Phoenix arts centre exterior; venue photograph"
  },
  "justice": {
    "image": "assets/images/justice.webp",
    "credit": "Roland Turner / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:High_Pavement_and_the_National_Justice_Museum,_Nottingham_(cropped).jpg",
    "photoLicence": "CC BY-SA 2.0",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "imageReference": "Venue photograph (2019); not a photograph of the current event. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "venue",
    "imageAlt": "The National Justice Museum on High Pavement, Nottingham; venue photograph"
  },
  "quay": {
    "image": "assets/images/quay.webp",
    "credit": "Dietmar Rabich / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:Exeter_(Devon,_UK),_Quay_--_2013_--_4.jpg",
    "photoLicence": "CC BY-SA 4.0",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageReference": "Location photograph (2013); not a photograph of the current event. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "location",
    "imageAlt": "Exeter Quay; location photograph from 2013, not the current festival"
  },
  "chess": {
    "image": "assets/images/chess.webp",
    "credit": "Mikkel Houmøller / Wikimedia Commons",
    "photoSource": "https://commons.wikimedia.org/wiki/File:Chess_set.jpg",
    "photoLicence": "CC BY-SA 4.0",
    "photoLicenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "imageAlt": "A wooden chess set; an activity reference photograph, not the online club",
    "imageReference": "Activity reference photograph; not a photograph of the provider or programme. Resized, converted to WebP and cropped by the card layout. The derivative retains the source licence.",
    "imageKind": "activity"
  }
};
  const descriptions={reading:'An illustrated reading nook with books and a comfortable chair',making:'An illustrated table of paints, brushes and clay animals',woodland:'An illustrated woodland path, ferns and wellington boots',sports:'An illustrated collection of sports and skate equipment',performance:'An illustrated theatre stage with musical instruments',play:'An illustrated arrangement of early years toys and soft play shapes',heritage:'An illustrated collection of historical objects and a magnifying glass',food:'An illustrated picnic with gelato, a pastry and fruit',autumn:'An illustrated autumn garden with pumpkins and wellington boots'};
  function photoKey(p){
    if(p.name==='Chessed.me (Online Chess)')return 'chess';
    if(p.region==='Exeter'){
      if(p.name==='Exeter Cathedral')return 'cathedral';
      if(/RAMM|Royal Albert Memorial Museum/.test(p.name))return 'ramm';
      if(/Exeter Phoenix/.test(p.name))return 'phoenix';
      if(/Quayside Shanty|Custom House/.test(p.name))return 'quay';
    }
    if(p.region==='Nottingham'){
      if(/National Justice Museum/.test(p.name))return 'justice';
      if(/Wollaton/.test(p.name))return 'wollaton';
    }
    return null;
  }
  function theme(p){
    const title=p.name.toLowerCase(),text=[p.name,p.category,p.description].join(' ').toLowerCase();
    if(/halloween|pumpkin|autumn/.test(title))return 'autumn';
    if(/library|libraries|book quest|reading/.test(title))return 'reading';
    if(/cinema|film|theatre|music|ballet|proms|dance/.test(text)&&p.type!=='art'&&p.kind!=='club')return 'performance';
    if(/art|animation|animated|brickfilm|craft|meraki/.test(title)||p.type==='art')return 'making';
    if(/sensory|early years|wonderlings/.test(text))return 'play';
    if(/darts farm|food festival|café|cafe|gelato/.test(title)||['cafe','ice'].includes(p.type))return 'food';
    if(/wood|wild|forest|bridge|falls|outdoor|donkey|sanctuary|a la ronde|poltimore|haven banks/.test(title)||p.type==='outdoors')return 'woodland';
    if(/museum|heritage|cathedral|history/.test(text))return 'heritage';
    if(/sport|tennis|skate|gymnastics|david lloyd|premier|city community/.test(title))return 'sports';
    if(/tubers/.test(title))return 'making';
    if(/chess/.test(title))return 'play';
    return p.kind==='club'?'play':'making';
  }
  function decorate(p){
    const k=photoKey(p),t=theme(p);
    const image=k?photos[k]:{image:`assets/images/${t}.webp`,imageKind:'illustration',imageAlt:descriptions[t]+'; an activity illustration, not the venue',credit:'Globee',imageReference:'AI-generated activity illustration, created for Globee. It does not depict the venue or event.',photoSource:'',photoLicence:'',photoLicenceUrl:''};
    return {...p,...image};
  }
  const api={decorate,theme};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlobeeImages=api;
})(typeof window!=='undefined'?window:globalThis);
