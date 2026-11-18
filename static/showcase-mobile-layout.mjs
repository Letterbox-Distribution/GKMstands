// Reuse the actual artwork controls in a separate mobile dock; no second renderer.
export function installMobileShowcase(root){
 if(!document.body.classList.contains('edition-home'))return ()=>{};
 const tools=root.querySelector('.showcase-tools');if(!tools)return ()=>{};
 const marker=document.createComment('Desktop artwork controls');tools.before(marker);
 const dock=document.createElement('div');dock.className='showcase-mobile-tools';
 root.querySelector('.showcase-stage').append(dock);
 const media=matchMedia('(max-width:760px)');
 const update=()=>{
  const inactive=!media.matches||root.dataset.step!=='3';
  if(dock.inert!==inactive)dock.inert=inactive;
  dock.setAttribute('aria-hidden',String(inactive));
 };
 const move=()=>{if(media.matches)dock.append(tools);else marker.after(tools);update();};
 const observer=new MutationObserver(update);observer.observe(root,{attributes:true,attributeFilter:['data-step']});
 media.addEventListener('change',move);move();
 return ()=>{observer.disconnect();media.removeEventListener('change',move);marker.after(tools);marker.remove();dock.remove();};
}
