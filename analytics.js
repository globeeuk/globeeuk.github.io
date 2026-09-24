(function(){
  'use strict';
  const ID='G-YRRY654LS1',KEY='globee-analytics-consent-v2',OPT_OUT_KEY='globee-analytics-opt-out',OLD_KEY='globee-analytics-choice';
  const live=location.hostname==='globeeuk.github.io';
  let choice='unset',started=false;
  try{
    const saved=localStorage.getItem(KEY);
    if(localStorage.getItem(OPT_OUT_KEY)==='true'||localStorage.getItem(OLD_KEY)==='denied')choice='denied';
    else if(saved==='granted'||saved==='denied')choice=saved;
    // An opt-out being absent is not consent to analytics cookies.
  }catch{}
  const panel=document.createElement('section');
  panel.className='analytics-choice content-width';
  panel.id='analytics-choice';
  panel.setAttribute('aria-label','Optional analytics cookies');
  panel.innerHTML='<p><strong>Help improve Globee?</strong> Allow optional Google Analytics cookies so we can understand visits and improve the directory. No advertising cookies. You can change your choice below at any time.</p><div class="analytics-actions"><button type="button" data-analytics-choice="granted">Allow analytics</button><button type="button" data-analytics-choice="denied">No thanks</button><a href="/privacy.html">Privacy details</a></div>';
  const main=document.querySelector('main');
  if(main)main.prepend(panel);else document.body.appendChild(panel);
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
    panel.hidden=choice!=='unset';
    document.querySelectorAll('[data-analytics-toggle]').forEach(button=>{
      button.textContent='Analytics settings';
      button.setAttribute('aria-controls','analytics-choice');
      button.setAttribute('aria-expanded',String(!panel.hidden));
    });
    document.querySelectorAll('[data-analytics-status]').forEach(status=>{
      status.textContent=!live?'Local preview: analytics are not sent.':choice==='granted'?'Analytics cookies are allowed on this browser.':choice==='denied'?'Google Analytics cookies are off on this browser.':'Google Analytics is off until you choose Allow analytics.';
    });
  }
  function pageView(){gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title});}
  function start(){
    if(!live||choice!=='granted')return;
    window['ga-disable-'+ID]=false;
    if(started){gtag('consent','update',{analytics_storage:'granted'});pageView();return;}
    started=true;window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments);};
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('consent','update',{analytics_storage:'granted'});
    gtag('set','ads_data_redaction',true);
    gtag('set','url_passthrough',false);
    gtag('set',{page_location:location.origin+location.pathname,page_referrer:document.referrer?new URL(document.referrer).origin:''});
    gtag('js',new Date());
    gtag('config',ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:location.hostname});
    pageView();
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(script);
  }
  function choose(value){
    const previous=choice;choice=value;
    try{
      localStorage.setItem(KEY,value);
      if(value==='denied')localStorage.setItem(OPT_OUT_KEY,'true');else localStorage.removeItem(OPT_OUT_KEY);
      localStorage.removeItem(OLD_KEY);
    }catch{}
    if(value==='granted'){if(previous!=='granted')start();}
    else{
      window['ga-disable-'+ID]=true;
      if(started)gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      clearAnalyticsCookies();
    }
    updateControls();
  }
  panel.querySelectorAll('[data-analytics-choice]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.analyticsChoice)));
  document.querySelectorAll('[data-analytics-toggle]').forEach(button=>button.addEventListener('click',()=>{
    panel.hidden=false;button.setAttribute('aria-expanded','true');
    panel.scrollIntoView({block:'center'});panel.querySelector('button').focus();
  }));
  if(choice!=='granted'){window['ga-disable-'+ID]=true;clearAnalyticsCookies();}
  updateControls();start();
  window.globeeTrack=(name,params={})=>{
    if(!live||!started||choice!=='granted')return;
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
