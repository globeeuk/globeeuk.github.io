(function(){
  'use strict';
  const KEY='globee-basic-analytics-v1';
  const live=location.hostname==='globeeuk.github.io';
  let enabled=false;
  try{
    const saved=localStorage.getItem(KEY);
    // Preserve earlier whole-site refusals when introducing the separate service.
    enabled=saved==='on'||(saved===null&&localStorage.getItem('globee-analytics-opt-out')!=='true'&&localStorage.getItem('globee-analytics-choice')!=='denied'&&localStorage.getItem('globee-analytics-consent-v2')!=='denied');
    if(saved===null)localStorage.setItem(KEY,enabled?'on':'off');
  }catch{enabled=false;/* Without persistent preferences, leave measurement off. */}
  if(navigator.globalPrivacyControl===true)enabled=false;
  const notice=document.createElement('aside');
  notice.className='basic-analytics-notice';
  notice.setAttribute('aria-label','Basic site statistics');
  notice.style.cssText='display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 18px;width:100%;flex-basis:100%;margin-top:4px;padding-top:16px;border-top:1px solid #e6e4df;font-size:11px;line-height:1.6;color:#66665f';
  const text=document.createElement('span');
  text.textContent=!live?'Local preview: basic statistics are not sent. ':enabled?'We use cookie-free visit counts to improve Globee. ':'Cookie-free visit counts are off on this browser. ';
  const actions=document.createElement('span');
  actions.style.cssText='display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 12px';
  const toggle=document.createElement('button');
  toggle.type='button';toggle.dataset.basicAnalyticsToggle='';
  toggle.textContent=enabled?'Stop basic statistics':'Enable basic statistics';
  toggle.style.cssText='font:inherit;color:inherit;background:none;border:0;text-decoration:underline;cursor:pointer;padding:4px 0';
  if(navigator.globalPrivacyControl===true){toggle.disabled=true;toggle.textContent='Disabled by your browser privacy signal';}
  toggle.addEventListener('click',()=>{
    try{localStorage.setItem(KEY,enabled?'off':'on');}catch{text.textContent='Your browser cannot save this setting. Basic statistics remain off. ';return;}
    // Reload so the third-party beacon and its listeners are removed completely.
    location.reload();
  });
  const details=document.createElement('a');details.href='/privacy.html';details.textContent='Privacy details';details.style.color='inherit';
  actions.append(toggle,details);notice.append(text,actions);
  const footer=document.querySelector('footer');
  if(footer){footer.style.flexWrap='wrap';footer.appendChild(notice);}
  else{
    const main=document.querySelector('main');
    const container=main||document.body;
    if(!container.classList.contains('content-width'))notice.classList.add('content-width');
    container.appendChild(notice);
  }
  if(!live||!enabled)return;
  const script=document.createElement('script');script.type='module';
  script.src='https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon',JSON.stringify({token:'c6205392d37e42398ba17db361152656',spa:false}));
  document.head.appendChild(script);

  // Public site ID on the owner's free Umami Hobby account (EU region).
  // An empty ID leaves Cloudflare running without sending anything to Umami.
  const UMAMI_WEBSITE_ID='eddd6cd3-f82e-4b15-9354-fb3929460053';
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(UMAMI_WEBSITE_ID))return;
  window.globeeUmamiBeforeSend=(type,payload)=>{
    if(type!=='event'||payload.name)return false;
    try{
      if(localStorage.getItem(KEY)!=='on'||navigator.globalPrivacyControl===true)return false;
    }catch{return false;}
    let referrer='';
    try{
      const source=new URL(document.referrer);
      if(source.protocol==='https:'||source.protocol==='http:')referrer=source.origin;
    }catch{/* No referrer is normal for direct and privacy-protected visits. */}
    // Allow only pageview fields. Never forward search text, age filters,
    // custom event data, explicit user IDs or a full referring URL.
    return {
      website:UMAMI_WEBSITE_ID,hostname:location.hostname,url:location.pathname,
      title:document.title,referrer,
      language:payload.language,screen:payload.screen
    };
  };
  const umamiScript=document.createElement('script');
  umamiScript.src='https://cloud.umami.is/script.js';
  umamiScript.defer=true;umamiScript.referrerPolicy='origin';
  umamiScript.setAttribute('data-website-id',UMAMI_WEBSITE_ID);
  umamiScript.setAttribute('data-domains','globeeuk.github.io');
  umamiScript.setAttribute('data-auto-track','false');
  umamiScript.setAttribute('data-exclude-search','true');
  umamiScript.setAttribute('data-exclude-hash','true');
  umamiScript.setAttribute('data-before-send','globeeUmamiBeforeSend');
  // One pageview per document, matching the existing non-SPA basic counter.
  umamiScript.addEventListener('load',()=>{if(window.umami)window.umami.track();});
  document.head.appendChild(umamiScript);
})();
