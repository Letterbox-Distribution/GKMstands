const stand=document.getElementById('open-stand');
stand?.addEventListener('click',()=>dispatchEvent(new CustomEvent('showcase-open',{detail:{}})));
const clients=document.getElementById('editorial-setting');
if(clients){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();import('./client-logos.mjs');}},{rootMargin:'500px'});observer.observe(clients);}
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
 document.documentElement.classList.add('has-reveals');
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.12,rootMargin:'0px 0px -30px 0px'});
 document.querySelectorAll('[data-reveal]').forEach(element=>observer.observe(element));
}
