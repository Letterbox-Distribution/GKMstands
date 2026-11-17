const entry=document.getElementById('site-entry'),hero=document.getElementById('showcase');
if(entry&&hero&&document.documentElement.dataset.entrySkip==='true'){
 entry.remove();document.body.dataset.entryRevealReady='true';document.body.dataset.entryReady='true';document.body.dataset.entryRender='skipped';dispatchEvent(new Event('entry-reveal-complete'));dispatchEvent(new Event('entry-complete'));
}else if(entry&&hero){
 const previous=[...document.body.children].filter(el=>el!==entry&&el.tagName!=='SCRIPT').map(el=>[el,el.inert]);previous.forEach(([el])=>el.inert=true);entry.focus({preventScroll:true});
 const minimum=(async()=>{
  const logo=new Image();logo.src='/static/goldkey-select.png';
  await Promise.all([logo.decode().catch(()=>{}),document.fonts.load('300 60px Manrope').catch(()=>{})]);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const revealTime=Math.max(650,1680-performance.now());entry.style.setProperty('--entry-pace',revealTime/1250);
  entry.classList.add('is-animating');performance.mark('entry-reveal-start');
  await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion:reduce)').matches?0:revealTime));
  document.body.dataset.entryRevealReady='true';dispatchEvent(new Event('entry-reveal-complete'));
 })();
 const opening=hero.querySelector('.showcase-instant img');
 const openingReady=opening?.decode().catch(()=>{})??Promise.resolve();
 Promise.all([minimum,openingReady]).then(()=>{
  entry.setAttribute('aria-busy','false');entry.classList.add('is-complete');
  setTimeout(()=>{document.body.dataset.entryRender=hero.dataset.ready==='true'?'live':'cached-opening';performance.mark('entry-complete');document.documentElement.classList.remove('entry-loading');previous.forEach(([el,value])=>el.inert=value);entry.remove();try{sessionStorage.setItem('goldkey-entry-seen','true');}catch{}document.body.dataset.entryReady='true';dispatchEvent(new Event('entry-complete'));},matchMedia('(prefers-reduced-motion:reduce)').matches?170:330);
 });
}
