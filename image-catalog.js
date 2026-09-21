/* Licensed venue photos take priority. Illustrations never depict a real venue. */
(function(root){
  'use strict';
  const photoRows=[
    ['cathedral','Wigulf~commonswiki','https://commons.wikimedia.org/wiki/File:Exeter_Cathedral.jpg','CC BY 2.5','https://creativecommons.org/licenses/by/2.5','2005','venue','The west front of Exeter Cathedral'],
    ['ramm','Pymouss','https://commons.wikimedia.org/wiki/File:RAMM_-_Gerald_the_giraffe_02.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2015','venue','Gerald the giraffe inside RAMM'],
    ['wollaton','ChrisSampson87','https://commons.wikimedia.org/wiki/File:Wollaton_Hall_Nottingham.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2012','venue','Wollaton Hall in Nottingham'],
    ['phoenix','Derek Harper','https://commons.wikimedia.org/wiki/File:Exeter_Phoenix_-_geograph.org.uk_-_315723.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2007','venue','The Exeter Phoenix arts centre exterior'],
    ['justice','Roland Turner','https://commons.wikimedia.org/wiki/File:High_Pavement_and_the_National_Justice_Museum,_Nottingham_(cropped).jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2019','venue','The National Justice Museum on High Pavement, Nottingham'],
    ['quay','Dietmar Rabich','https://commons.wikimedia.org/wiki/File:Exeter_(Devon,_UK),_Quay_--_2013_--_4.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2013','location','Exeter Quay'],
    ['chess','Mikkel Houmøller','https://commons.wikimedia.org/wiki/File:Chess_set.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','','activity','A wooden chess set'],
    ['powderham','Nilfanion','https://commons.wikimedia.org/wiki/File:Powderham%20Castle%20%287686%29.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2015','venue','Powderham Castle in Devon'],
    ['pennywell','AngusMurray1989','https://commons.wikimedia.org/wiki/File:Pennywell%20Farm%20is%20home%20to%20some%20beautiful%20Highland%20Cows.jpg','CC0','https://creativecommons.org/publicdomain/zero/1.0','2018','venue','Highland cattle at Pennywell Farm'],
    ['crealy','tormentor4555','https://commons.wikimedia.org/wiki/File:Water%20chute%20-%20panoramio.jpg','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0','2008','venue','A water ride at Crealy Theme Park'],
    ['canonteign','Elliott Brown','https://commons.wikimedia.org/wiki/File:Canonteign%20Falls%20-%20Waterfall%20near%20Exeter%20-%202000%20%285371099464%29.jpg','CC BY 2.0','https://creativecommons.org/licenses/by/2.0','2000','location','Canonteign Falls in Devon'],
    ['alaaronde','Markfromexeter','https://commons.wikimedia.org/wiki/File:A%20la%20Ronde%2002.JPG','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0','2013','venue','The sixteen-sided A la Ronde house in Exmouth'],
    ['donkey-sanctuary','Richard Gillin','https://commons.wikimedia.org/wiki/File:Donkey%20Sanctuary.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2010','venue','A donkey in a field at The Donkey Sanctuary in Sidmouth'],
    ['fingle-bridge','Partonez','https://commons.wikimedia.org/wiki/File:Fingle%20Bridge.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2016','location','The stone Fingle Bridge over the River Teign'],
    ['haldon-forest','Roger Cornfoot','https://commons.wikimedia.org/wiki/File:Walking%20trail%2C%20Haldon%20Forest%20Park%20-%20geograph.org.uk%20-%201429313.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2009','location','A walking trail through Haldon Forest Park'],
    ['poltimore','David Smith','https://commons.wikimedia.org/wiki/File:The%20front%20of%20Poltimore%20House%20-%20geograph.org.uk%20-%208126540.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2025','venue','The front of Poltimore House during restoration work'],
    ['bill-douglas','Ridiculopathy','https://commons.wikimedia.org/wiki/File:The%20Bill%20Douglas%20Cinema%20Museum%2C%20Exeter%2C%20UK%2002.jpg','CC0','https://creativecommons.org/publicdomain/zero/1.0','2023','venue','The entrance display at the Bill Douglas Cinema Museum'],
    ['northernhay','Derek Harper','https://commons.wikimedia.org/wiki/File:Northernhay%20Gardens%2C%20Exeter%20-%20geograph.org.uk%20-%20275904.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2006','location','Northernhay Gardens in Exeter'],
    ['darts-farm','Felix Russell-Saw','https://commons.wikimedia.org/wiki/File:Darts%20Farm%20Village%2C%20Exeter%2C%20United%20Kingdom%20%28Unsplash%29.jpg','CC0','https://creativecommons.org/publicdomain/zero/1.0','2016','venue','Hands brushing through crops at Darts Farm'],
    ['theatre-royal-front','Elliott Brown','https://commons.wikimedia.org/wiki/File:Theatre%20Royal%20-%20Talbot%20Street%20-%20South%20Sherwood%20Street%2C%20Nottingham%20%2815291943574%29.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2014','venue','The modern side of Theatre Royal Nottingham'],
    ['theatre-royal-classic','mattbuck','https://commons.wikimedia.org/wiki/File:Nottingham%20MMB%2073%20Theatre%20Royal.jpg','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0','2010','venue','The classical front of Theatre Royal Nottingham'],
    ['concert-hall-interior','Johnnyguitar01','https://commons.wikimedia.org/wiki/File:Nottingham%20Royal%20Concert%20Hall.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2017','venue','The auditorium inside Nottingham Royal Concert Hall'],
    ['concert-hall-exterior','mattbuck','https://commons.wikimedia.org/wiki/File:Nottingham%20MMB%2037%20Royal%20Concert%20Hall.jpg','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0','2008','venue','Nottingham Royal Concert Hall reflected in its glass exterior'],
    ['nottingham-contemporary','Aethonatic','https://commons.wikimedia.org/wiki/File:Nottingham%20Contemporary%20-%2031%20July%202026.jpg','CC0','https://creativecommons.org/publicdomain/zero/1.0','2026','venue','Nottingham Contemporary arts centre'],
    ['lakeside-waterfront','Andrewrabbott','https://commons.wikimedia.org/wiki/File:Lakeside%20Arts%20Centre.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2015','venue','Lakeside Arts Centre beside the water'],
    ['lakeside-day','Alan Murray-Rust','https://commons.wikimedia.org/wiki/File:Lakeside%20Arts%20Centre%20-%20geograph.org.uk%20-%207064347.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2022','venue','Lakeside Arts Centre and surrounding grounds'],
    ['lakeside-night','David Lally','https://commons.wikimedia.org/wiki/File:The%20Lakeside%20Arts%20Centre%20-%20geograph.org.uk%20-%20673112.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2008','venue','Lakeside Arts Centre illuminated at night'],
    ['nottingham-high-school','ClemRutter','https://commons.wikimedia.org/wiki/File:Nottingham%20High%20School%206503.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2017','venue','The garden and buildings at Nottingham High School'],
    ['we-the-curious','Ruth Sharville','https://commons.wikimedia.org/wiki/File:%22We_the_Curious%22_museum_from_Trinity_Street_steps,_Bristol_-_geograph.org.uk_-_8331936.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2026','venue','We The Curious in Bristol, viewed from Trinity Street steps'],
    ['m-shed','Christine Johnstone','https://commons.wikimedia.org/wiki/File:M_Shed_and_the_cranes,_Prince%27s_Wharf_-_geograph.org.uk_-_4485418.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2015','venue','M Shed and the harbour cranes on Princes Wharf, Bristol'],
    ['bristol-museum','Gareth James','https://commons.wikimedia.org/wiki/File:Bristol_Museum_%5E_Art_Gallery_-_geograph.org.uk_-_8138804.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2025','venue','Bristol Museum & Art Gallery'],
    ['kings-weston','Michael Murray','https://commons.wikimedia.org/wiki/File:Kings_Weston_Roman_Villa.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2006','venue','Kings Weston Roman Villa near Lawrence Weston, Bristol'],
    ['exeter-tennis','Pierre Terre','https://commons.wikimedia.org/wiki/File:Exeter%20Tennis%20Centre%2C%20University%20of%20Exeter%20-%20geograph.org.uk%20-%201004177.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2008','venue','Exeter Tennis Centre at the University of Exeter'],
    ['heavitree','David Smith','https://commons.wikimedia.org/wiki/File:Heavitree%20Pleasure%20Ground%2C%20Exeter%20-%20geograph.org.uk%20-%206477874.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2020','location','A wide green and path at Heavitree Pleasure Ground'],
    ['flowerpot-skatepark','Derek Harper','https://commons.wikimedia.org/wiki/File:Flowerpot%20Chill%20Zone%2C%20Exeter%20-%20geograph.org.uk%20-%201069980.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2008','location','The ramps at Flowerpot Skatepark in Exeter'],
    ['st-lukes','Eugene Birchall','https://commons.wikimedia.org/wiki/File:Exeter%20University%20-%20St%20Luke%27s%20Campus.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2012','venue',"The cloister courtyard at the University of Exeter's St Luke's Campus"],
    ['ramm-ancient','Pymouss','https://commons.wikimedia.org/wiki/File:RAMM%20-%20Ancient%20worlds.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2015','venue','The Ancient Worlds gallery inside RAMM'],
    ['ramm-roman','Pymouss','https://commons.wikimedia.org/wiki/File:RAMM%20-%20Roman%20wall.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2015','venue','The Roman wall in the grounds of RAMM'],
    ['ramm-gallery','Derek Harper','https://commons.wikimedia.org/wiki/File:Royal%20Albert%20Memorial%20Museum%2C%20Exeter%20-%20geograph.org.uk%20-%203296752.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2013','venue','A gallery doorway inside RAMM'],
    ['phoenix-front','Stephen Richards','https://commons.wikimedia.org/wiki/File:Arts%20centre%2C%20Bradninch%20Place%2C%20Exeter%20-%20geograph.org.uk%20-%206332204.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2014','venue','The front of Exeter Phoenix arts centre'],
    ['phoenix-side','David Smith','https://commons.wikimedia.org/wiki/File:The%20west%20side%20of%20the%20Phoenix%20Centre%2C%20Exeter%20-%20geograph.org.uk%20-%205266527.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2017','venue','A side view of Exeter Phoenix arts centre'],
    ['phoenix-sculpture','Derek Harper','https://commons.wikimedia.org/wiki/File:Sculpture%20at%20Exeter%20Phoenix%20-%20geograph.org.uk%20-%20316461.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2007','venue','The metal phoenix sculpture outside Exeter Phoenix'],
    ['justice-courtroom','Fayerollinson','https://commons.wikimedia.org/wiki/File:Victorian%20Civil%20Courtroom%2C%20National%20Justice%20Museum%2C%20June%202010.jpg','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0','2010','venue','The Victorian civil courtroom inside the National Justice Museum'],
    ['justice-door','Alan Murray-Rust','https://commons.wikimedia.org/wiki/File:County%20Gaol%2C%20Shire%20Hall%2C%20Nottingham.%20-%20geograph.org.uk%20-%20349944.jpg','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0','2007','venue','The old County Gaol doorway at the National Justice Museum'],
    ['wollaton-garden','Enchufla Con Clave','https://commons.wikimedia.org/wiki/File:Circular%20Pond%20On%20The%20Upper%20Garden%20Terrace%20In%20Front%20Of%20Wollaton%20Hall%2C%20Nottingham%20%281%29.jpg','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0','2018','venue','The upper garden terrace and Wollaton Hall']
  ];
  const kindLabels={venue:'Venue',location:'Location',activity:'Activity reference'};
  const photos=Object.fromEntries(photoRows.map(([key,creator,source,photoLicence,photoLicenceUrl,date,imageKind,description])=>[key,{
    image:`assets/images/${key}.webp`,credit:`${creator} / Wikimedia Commons`,photoSource:source,photoLicence,photoLicenceUrl,
    imageReference:`${kindLabels[imageKind]} photograph${date?` (${date})`:''}; not a photograph of the current event. Cropped to fit, resized and converted to WebP. Source licence and credit are recorded on the Image credits page.`,
    imageKind,imageAlt:`${description}; ${imageKind==='activity'?'activity reference':imageKind} photograph${date?` from ${date}`:''}`
  }]));
  const descriptions={reading:'An illustrated reading nook with books and a comfortable chair',making:'An illustrated table of paints, brushes and clay animals',woodland:'An illustrated woodland path, ferns and wellington boots',sports:'An illustrated collection of sports and skate equipment',performance:'An illustrated theatre stage with musical instruments',play:'An illustrated arrangement of early years toys and soft play shapes',heritage:'An illustrated collection of historical objects and a magnifying glass',food:'An illustrated picnic with gelato, a pastry and fruit',autumn:'An illustrated autumn garden with pumpkins and wellington boots'};
  function photoKey(p){
    if(p.name==='Chessed.me (Online Chess)')return 'chess';
    if(p.region==='Exeter'){
      if(p.name==='Exeter Cathedral')return 'cathedral';
      if(/RAMM|Royal Albert Memorial Museum/.test(p.name)){
        if(/^RAMM – Royal Albert/.test(p.name))return 'ramm';
        if(/Roman Exeter/.test(p.name))return 'ramm-roman';
        if(/Second World War|Musical Moments/.test(p.name))return 'ramm-gallery';
        if(/Art Club|The Mushroom Show/.test(p.name))return 'ramm-ancient';
        return 'ramm';
      }
      if(/Exeter Phoenix/.test(p.name)){
        if(/Truth About Trees/.test(p.name))return 'phoenix-front';
        if(/Brickfilm/.test(p.name))return 'phoenix-sculpture';
        if(/Young & Animated/.test(p.name))return 'phoenix-side';
        if(/Model a Monster/.test(p.name))return 'phoenix-sculpture';
        if(/Sketch A Skeleton/.test(p.name))return 'phoenix-front';
        return 'phoenix';
      }
      if(/Quayside Shanty|Custom House|Haven Banks/.test(p.name))return 'quay';
      if(/Powderham/.test(p.name))return 'powderham';
      if(/Pennywell/.test(p.name))return 'pennywell';
      if(/Crealy/.test(p.name))return 'crealy';
      if(/Canonteign Falls/.test(p.name))return 'canonteign';
      if(/A la Ronde/.test(p.name))return 'alaaronde';
      if(/Donkey Sanctuary/.test(p.name))return 'donkey-sanctuary';
      if(/Fingle Bridge/.test(p.name))return 'fingle-bridge';
      if(/Haldon Forest/.test(p.name))return 'haldon-forest';
      if(/Poltimore House/.test(p.name))return 'poltimore';
      if(/Bill Douglas/.test(p.name))return 'bill-douglas';
      if(/Northernhay Gardens/.test(p.name))return 'northernhay';
      if(/Darts Farm/.test(p.name))return 'darts-farm';
      if(/Devon Science/.test(p.name))return 'heavitree';
      if(/Junior Tennis – Exeter Tennis Centre/.test(p.name))return 'exeter-tennis';
      if(/Park Life Fun Day/.test(p.name))return 'heavitree';
      if(/Exeter City Council Skate Parks/.test(p.name))return 'flowerpot-skatepark';
      if(/Premier Education – St Luke's Campus/.test(p.name))return 'st-lukes';
    }
    if(p.region==='Nottingham'){
      if(/National Justice Museum/.test(p.name)){
        if(/Historical Trial/.test(p.name))return 'justice-courtroom';
        if(/Laundry with Matron/.test(p.name))return 'justice-door';
        return 'justice';
      }
      if(/Wollaton/.test(p.name))return /Autumn Festival/.test(p.name)?'wollaton-garden':'wollaton';
      if(/Dear Zoo/.test(p.name))return 'theatre-royal-classic';
      if(/Northern Ballet/.test(p.name))return 'theatre-royal-front';
      if(/How To Train Your Dragon/.test(p.name))return 'concert-hall-interior';
      if(/Princess Proms/.test(p.name))return 'concert-hall-exterior';
      if(/Nottingham Contemporary/.test(p.name))return 'nottingham-contemporary';
      if(/Tim Burton Inspired Crafts/.test(p.name))return 'lakeside-waterfront';
      if(/Tim Burton Inspired Selfies/.test(p.name))return 'lakeside-night';
      if(/Magical Garden/.test(p.name))return 'lakeside-day';
      if(/Nottingham High School/.test(p.name))return 'nottingham-high-school';
    }
    if(p.region==='Bristol'){
      if(/Play The Bluey Way|Great Bristol Ball Run/.test(p.name))return 'we-the-curious';
      if(/Docks Heritage Weekend|Bristol Harbour Railway/.test(p.name))return 'm-shed';
      if(/Aardman/.test(p.name))return 'bristol-museum';
      if(/Kings Weston Roman Villa|Visit the Villa/.test(p.name))return 'kings-weston';
    }
    return null;
  }
  function theme(p){
    const title=p.name.toLowerCase(),text=[p.name,p.category,p.description].join(' ').toLowerCase();
    if(/halloween|pumpkin|autumn|trick or treat/.test(title))return 'autumn';
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
