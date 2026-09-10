(function(){
  'use strict';
  const ID='G-YRRY654LS1',KEY='globee-analytics-choice',live=location.hostname==='globeeuk.github.io';
  let consent='unset',started=false;
  try{consent=localStorage.getItem(KEY)||'unset';}catch{}
  const banner=document.getElementById('analytics-choice');
  function start(){
    if(!live||started||consent!=='granted')return;
    started=true;window['ga-disable-'+ID]=false;window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments);};
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('consent','update',{analytics_storage:'granted'});
    gtag('js',new Date());
    // Do not send search queries, selected child ages or date ranges in page URLs.
    gtag('config',ID,{send_page_view:false,page_location:location.origin+location.pathname,page_referrer:document.referrer?new URL(document.referrer).origin:'',allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:location.hostname});
    gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title});
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(script);
  }
  function choose(value){
    consent=value;try{localStorage.setItem(KEY,value);}catch{}banner.hidden=true;
    if(value==='granted'){window['ga-disable-'+ID]=false;if(started)gtag('consent','update',{analytics_storage:'granted'});else start();}
    else{window['ga-disable-'+ID]=true;if(started)gtag('consent','update',{analytics_storage:'denied'});for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(/^_ga(?:_|$)/.test(name)){document.cookie=name+'=; Max-Age=0; Path=/';document.cookie=name+'=; Max-Age=0; Path=/; Domain='+location.hostname;}}}
  }
  document.querySelectorAll('[data-analytics-choice]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.analyticsChoice)));
  document.querySelectorAll('[data-cookie-settings]').forEach(b=>b.addEventListener('click',()=>{banner.hidden=false;banner.querySelector('button').focus();}));
  banner.hidden=['granted','denied'].includes(consent);start();
  window.globeeTrack=(name,params={})=>{if(!live||!started||consent!=='granted')return;const safe={};for(const k of ['region','view','page_number','collection','filter_name','provider_host'])if(k in params)safe[k]=params[k];gtag('event',name,safe);};
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    if(el.matches('#view-toggle'))globeeTrack('switch_view',{view:document.body.classList.contains('map-mode')?'map':'list'});
    if(el.dataset.collection)globeeTrack('open_edit',{collection:el.dataset.collection});
    if(el.dataset.resultsPage)globeeTrack('results_page',{page_number:Number(el.dataset.resultsPage)});
    if(el.matches('.detail-link'))globeeTrack('provider_visit',{provider_host:new URL(el.href).hostname});
  });
})();
