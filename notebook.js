/* Shared notebook chrome; no new analytics, cookies or remote dependencies. */
(function(){
 'use strict';
 const body=document.body;
 if(!body.classList.contains('notebook-page'))return;
 const sections=['days','classes','holidays','notes'];
 const labels={days:'Days out',classes:'Classes & lessons',holidays:'Holiday clubs',notes:'Parent notes'};
 const classRegion=document.querySelector('[data-notebook-class-region]');
 if(classRegion&&!classRegion.closest('.region-switcher')){
  const wrapper=document.createElement('label');wrapper.className='region-switcher';
  const caption=document.createElement('span');caption.className='region-switch-label';caption.textContent='Change area';
  const arrow=document.createElement('span');arrow.className='region-switch-arrow';arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  classRegion.before(wrapper);wrapper.append(caption,classRegion,arrow);
 }
 function url(section,region){
  const key=region==='Exeter'?'Devon':region;
  if(section==='classes')return region==='Bristol'?'/bristol/classes/':region==='Nottingham'?'/nottingham/classes/':'/classes.html';
  return '/?'+new URLSearchParams({region:key,...(section!=='days'?{section}: {})});
 }
 function sync(state={}){
  const region=state.region||body.dataset.notebookRegion||'Exeter';
  const section=state.notebookSection||body.dataset.notebookSection||'days';
  body.dataset.notebookActive=section;
  const regionButton=document.querySelector('.region-control[data-menu="region"]');
  if(regionButton)regionButton.setAttribute('aria-label','Change area. Current area: '+(region==='Exeter'||region==='Devon'?'Exeter and Devon':region));
  const brand=document.querySelector('.site-header .brand');if(brand)brand.href=url('days',region);
  document.querySelectorAll('a[data-notebook-section]').forEach(a=>{
   const active=a.dataset.notebookSection===section;a.href=url(a.dataset.notebookSection,region);
   if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  const heading=document.querySelector('.entry-intro h1'),intro=document.querySelector('.entry-intro>p'),kicker=document.querySelector('.entry-intro .notebook-kicker');
  const copy={days:['OUT & ABOUT','Find what they’ll love next.','Local places, little adventures and days together.'],holidays:['WHEN SCHOOL’S OUT','A plan for the school break.','Holiday clubs, new experiences and practical details.'],notes:['THE GLOBEE NOTEBOOK','Things I wanted to know.','Notes on the questions that come with family life.']};
  if(heading&&copy[section]){kicker.textContent=copy[section][0];heading.textContent=copy[section][1];intro.textContent=copy[section][2];}
  const notes=section==='notes';
  ['.entry-cards','.home-secondary-links','.notebook-browse-row','.notebook-home .result-section','.notebook-home .notebook-search-row'].forEach(selector=>{const el=document.querySelector(selector);if(el)el.hidden=notes;});
  const pending=document.getElementById('parent-notes-pending');if(pending)pending.hidden=!notes;
  const localRegion=region==='Devon'?'Exeter':region;let localNotes=0;
  document.querySelectorAll('[data-notes-region]').forEach(card=>{card.hidden=!card.dataset.notesRegion.split(' ').includes(localRegion);if(!card.hidden)localNotes++;});
  const notesEmpty=document.querySelector('[data-notes-empty]');if(notesEmpty)notesEmpty.hidden=localNotes>0;
  const filters=document.getElementById('notebook-filter-controls');if(notes&&filters){filters.hidden=true;document.querySelector('[data-notebook-filter-toggle]')?.setAttribute('aria-expanded','false');}
  const browse=document.querySelector('[data-notebook-browse]');if(browse)browse.textContent=section==='holidays'?'All holiday clubs ↓':'Explore all ↓';
  const notesLink=document.querySelector('[data-notebook-notes-link]');if(notesLink)notesLink.href=url('notes',region);
  const input=document.querySelector('#notebook-home-query');if(input&&input.value!==state.query)input.value=state.query||'';
  const options={days:[['classes','Something new to try?'],['notes','A question to figure out?']],classes:[['days','A day to spend together?'],['holidays','Planning the school break?']],holidays:[['days','A day out together?'],['notes','A few practical notes?']],notes:[['days','Ready to head out?'],['classes','Follow a little interest?']]};
  document.querySelectorAll('.notebook-continue a').forEach((a,i)=>{const [key,prompt]=options[section][i];a.href=url(key,region);a.querySelector('span').textContent=prompt;a.querySelector('strong').textContent=labels[key]+' →';});
 }
 window.GlobeeNotebook={sync};
 document.querySelector('[data-notebook-filter-toggle]')?.addEventListener('click',event=>{
  const controls=document.getElementById('notebook-filter-controls');controls.hidden=!controls.hidden;event.currentTarget.setAttribute('aria-expanded',String(!controls.hidden));
 });
 document.getElementById('notebook-home-search')?.addEventListener('submit',event=>{event.preventDefault();window.GlobeeNotebookSearch?.(document.getElementById('notebook-home-query').value.trim());});
 let searchTimer;document.getElementById('notebook-home-query')?.addEventListener('input',event=>{clearTimeout(searchTimer);const value=event.currentTarget.value;searchTimer=setTimeout(()=>window.GlobeeNotebookSearch?.(value),220);});
 sync();
 if(!body.classList.contains('notebook-classes'))return;
 const cards=[...document.querySelectorAll('.card[data-category]')],input=document.getElementById('notebook-class-query');
 const tennis=cards.find(card=>card.querySelector('h3')?.textContent==='University of Exeter Youth Tennis');
 if(tennis){const figure=document.createElement('figure');figure.className='catalogue-photo';figure.innerHTML='<img src="/assets/images/exeter-tennis.webp" alt="Exeter Tennis Centre venue photograph, not a current lesson" width="640" height="426" loading="lazy"><figcaption>Venue photo · Pierre Terre / Wikimedia Commons · CC BY-SA 2.0 · <a href="/image-credits.html">Credits</a></figcaption>';tennis.prepend(figure);}
 document.querySelector('[data-notebook-class-region]')?.addEventListener('change',event=>{window.location.href=url('classes',event.currentTarget.value);});
 const title=document.querySelector('.topline h1');if(title&&!body.classList.contains('class-cost-catalogue'))title.textContent='A little interest. A new beginning.';
 if(!document.querySelector('.notebook-classes .notebook-kicker')){const kicker=document.createElement('span');kicker.className='notebook-kicker';kicker.textContent='TRY SOMETHING NEW';document.querySelector('.topline').before(kicker);}
 let filter='all';
 function apply(){
  const words=(input?.value||'').trim().toLocaleLowerCase('en-GB').split(/\s+/).filter(Boolean);let shown=0;
  cards.forEach(card=>{const text=card.textContent.toLocaleLowerCase('en-GB');card.hidden=(filter!=='all'&&card.dataset.category!==filter)||!words.every(word=>text.includes(word));if(!card.hidden)shown++;});
  const count=document.getElementById('count');count.textContent=shown+' '+(shown===1?'option':'options');count.setAttribute('aria-live','polite');
  document.getElementById('notebook-class-empty').hidden=shown>0;
 }
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));apply();}));
 input?.addEventListener('input',apply);
 document.getElementById('notebook-class-search')?.addEventListener('submit',event=>{event.preventDefault();document.getElementById('lessons').scrollIntoView({block:'start'});});
 apply();
})();
