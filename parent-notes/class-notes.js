/* Native navigation only: no tracking or storage. */
(function(){const area=document.querySelector('.notes-area');if(!area)return;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&area.open){area.open=false;area.querySelector('summary').focus();}});document.addEventListener('click',e=>{if(!area.contains(e.target))area.open=false;});})();
