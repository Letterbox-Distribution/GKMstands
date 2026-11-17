// The high-resolution hero and its renderer are the initial priority.
let planner,loaded=false;
function loadPlanner(){if(!planner)planner=import('./app.mjs').then(()=>import('./planner-polish.mjs')).then(()=>{loaded=true;document.getElementById('filters').inert=false;document.getElementById('filters').removeAttribute('aria-busy');document.body.dataset.plannerReady='true'});return planner;}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadPlanner();}},{rootMargin:'450px'});observer.observe(document.getElementById('planner'));
document.addEventListener('click',e=>{const trigger=e.target.closest('[data-start-guide],a[href="#planner"]');if(!trigger||loaded)return;e.preventDefault();e.stopImmediatePropagation();loadPlanner().then(()=>trigger.click());},true);
// The header stand link uses the existing hero instead of another 3D studio.
document.getElementById('open-stand').addEventListener('click',()=>{if(!loaded)dispatchEvent(new CustomEvent('showcase-open',{detail:{}}));});
const clients=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){clients.disconnect();import('./client-logos.mjs');}},{rootMargin:'500px'});clients.observe(document.getElementById('editorial-setting'));
