(function(){
  'use strict';
  const ID='G-YRRY654LS1',OPT_OUT_KEY='globee-analytics-opt-out',OLD_KEY='globee-analytics-choice',live=location.hostname==='globeeuk.github.io';
  let optedOut=false,started=false;
  try{
    const legacyRefusal=localStorage.getItem(OLD_KEY)==='denied';
    optedOut=localStorage.getItem(OPT_OUT_KEY)==='true'||legacyRefusal;
    if(legacyRefusal)localStorage.setItem(OPT_OUT_KEY,'true');
    localStorage.removeItem(OLD_KEY);
  }catch{}
  function clearAnalyticsCookies(){
    for(const cookie of document.cookie.split(';')){
      const name=cookie.split('=')[0].trim();
      if(/^_ga(?:_|$)/.test(name)){
        document.cookie=name+'=; Max-Age=0; Path=/';
        document.cookie=name+'=; Max-Age=0; Path=/; Domain='+location.hostname;
      }
    }
  }
  function updateControls(){
    document.querySelectorAll('[data-analytics-toggle]').forEach(button=>{
      button.textContent=optedOut?'Resume site analytics':'Stop site analytics';
      button.setAttribute('aria-pressed',String(optedOut));
    });
    document.querySelectorAll('[data-analytics-status]').forEach(status=>{
      status.textContent=optedOut?'Site analytics are stopped on this browser.':live?'Cookieless site analytics are active on this browser.':'Local preview: site analytics are not sent.';
    });
  }
  function start(){
    if(!live||started||optedOut)return;
    started=true;window['ga-disable-'+ID]=false;clearAnalyticsCookies();window.dataLayer=window.dataLayer||[];
    // Statistical-purpose measurement only: no analytics or advertising storage.
    window.gtag=function(){dataLayer.push(arguments);};
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('set','ads_data_redaction',true);
    gtag('set','url_passthrough',false);
    gtag('js',new Date());
    // Search text, child ages, date ranges and other query parameters are excluded.
    gtag('config',ID,{send_page_view:false,page_location:location.origin+location.pathname,page_referrer:document.referrer?new URL(document.referrer).origin:'',allow_google_signals:false,allow_ad_personalization_signals:false});
    gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title});
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(script);
  }
  function toggle(){
    optedOut=!optedOut;try{if(optedOut)localStorage.setItem(OPT_OUT_KEY,'true');else localStorage.removeItem(OPT_OUT_KEY);}catch{}
    window['ga-disable-'+ID]=optedOut;
    if(optedOut){clearAnalyticsCookies();if(started)gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}
    else start();
    updateControls();
  }
  document.querySelectorAll('[data-analytics-toggle]').forEach(button=>button.addEventListener('click',toggle));
  updateControls();start();
  window.globeeTrack=(name,params={})=>{
    if(!live||!started||optedOut)return;
    const safe={};for(const k of ['region','view','page_number','collection','filter_name','provider_host','social_platform'])if(k in params)safe[k]=params[k];
    gtag('event',name,safe);
  };
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    if(el.matches('#view-toggle'))globeeTrack('switch_view',{view:document.body.classList.contains('map-mode')?'map':'list'});
    if(el.dataset.collection)globeeTrack('open_edit',{collection:el.dataset.collection});
    if(el.dataset.resultsPage)globeeTrack('results_page',{page_number:Number(el.dataset.resultsPage)});
    if(el.matches('.detail-link'))globeeTrack('provider_visit',{provider_host:new URL(el.href).hostname});
    if(el.dataset.socialPlatform)globeeTrack('social_visit',{social_platform:el.dataset.socialPlatform,region:new URLSearchParams(location.search).get('region')||''});
  });
})();
