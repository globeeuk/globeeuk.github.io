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
  notice.className='basic-analytics-notice content-width';
  notice.setAttribute('aria-label','Basic site statistics');
  notice.style.cssText='font-size:12px;line-height:1.6;padding:8px 0;color:#595959';
  const text=document.createElement('span');
  text.textContent=!live?'Local preview: basic statistics are not sent. ':enabled?'We use cookie-free visit counts to improve Globee. ':'Cookie-free visit counts are off on this browser. ';
  const toggle=document.createElement('button');
  toggle.type='button';toggle.dataset.basicAnalyticsToggle='';
  toggle.textContent=enabled?'Stop basic statistics':'Enable basic statistics';
  toggle.style.cssText='font:inherit;color:inherit;background:none;border:0;text-decoration:underline;cursor:pointer;padding:4px';
  if(navigator.globalPrivacyControl===true){toggle.disabled=true;toggle.textContent='Disabled by your browser privacy signal';}
  toggle.addEventListener('click',()=>{
    try{localStorage.setItem(KEY,enabled?'off':'on');}catch{text.textContent='Your browser cannot save this setting. Basic statistics remain off. ';return;}
    // Reload so the third-party beacon and its listeners are removed completely.
    location.reload();
  });
  const details=document.createElement('a');details.href='/privacy.html';details.textContent='Privacy details';details.style.marginLeft='8px';
  notice.append(text,toggle,details);
  const main=document.querySelector('main');if(main)main.prepend(notice);else document.body.appendChild(notice);
  if(!live||!enabled)return;
  const script=document.createElement('script');script.type='module';
  script.src='https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon',JSON.stringify({token:'c6205392d37e42398ba17db361152656',spa:false}));
  document.head.appendChild(script);
})();
