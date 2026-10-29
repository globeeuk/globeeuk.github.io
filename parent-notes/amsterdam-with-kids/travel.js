// Display-only watermark and casual-saving deterrents, not access control.
// Web-sized JPEGs remain retrievable; never publish original HEIC/MOV files.
document.querySelectorAll('figure img[data-trip-photo]').forEach(img=>{
  img.draggable=false;
  img.addEventListener('dragstart',event=>event.preventDefault());
  const frame=document.createElement('div');
  frame.className='photo-frame';
  img.before(frame);
  frame.append(img);
  const credit=document.createElement('span');
  credit.className='photo-watermark';
  credit.setAttribute('aria-hidden','true');
  credit.textContent='© Globee';
  frame.append(credit);
});
document.addEventListener('contextmenu',event=>{
  if(event.target.closest('.photo-frame'))event.preventDefault();
});
