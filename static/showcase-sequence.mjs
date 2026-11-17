// Scroll-driven pre-rendered showcase. Falls back to live WebGL if frames are absent.
export async function startSequenceShowcase(fallback) {
 const root=document.querySelector('#showcase');
 if(!root)return fallback();
 let manifest;
 try {
  const response=await fetch('/static/showcase-sequence/manifest.json',{cache:'no-cache'});
  if(!response.ok)throw Error('No frame manifest');
  manifest=await response.json();
  if(!Number.isInteger(manifest.frames)||manifest.frames<2||manifest.format!=='webp')throw Error('Invalid sequence');
 } catch { return fallback(); }
 const host=document.querySelector('#showcase-viewport'),stage=root.querySelector('.showcase-stage');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return fallback();
 canvas.className='showcase-sequence-canvas';
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Scroll-controlled GoldKey stand animation');
 const count=manifest.frames,cache=new Map(),pending=new Map(),maxCached=18;
 const frameUrl=i=>'/static/showcase-sequence/'+String(i).padStart(4,'0')+'.webp';
 let raf=0,current=-1,desired=0,disposed=false,active=true;
 function load(i) {
  if(i<0||i>=count||pending.has(i)||cache.has(i))return;
  const promise=new Promise((resolve,reject)=>{
   const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=reject;img.src=frameUrl(i);
  }).then(img=>{
   pending.delete(i);if(disposed)return;
   cache.set(i,img);
   while(cache.size>maxCached){const oldest=cache.keys().next().value;if(oldest===current||oldest===desired){cache.delete(oldest);cache.set(oldest,img);break;}cache.delete(oldest);}
   if(i===desired)requestDraw();
  }).catch(()=>{pending.delete(i);});
  pending.set(i,promise);
 }
 function draw(){
  raf=0;if(disposed||!active)return;
  const image=cache.get(desired);
  if(!image){load(desired);return;}
  if(canvas.width!==host.clientWidth||canvas.height!==host.clientHeight){
   canvas.width=Math.max(1,host.clientWidth);canvas.height=Math.max(1,host.clientHeight);
  }
  const scale=Math.max(canvas.width/image.width,canvas.height/image.height);
  const w=image.width*scale,h=image.height*scale;
  ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  current=desired;
  for(const offset of [1,-1,2,-2,3,-3])load(desired+offset);
 }
 function requestDraw(){if(!raf)raf=requestAnimationFrame(draw);}
 function onScroll(){
  if(disposed||!active)return;
  const distance=Math.max(1,root.offsetHeight-stage.offsetHeight);
  const progress=Math.max(0,Math.min(1,-root.getBoundingClientRect().top/distance));
  desired=Math.round(progress*(count-1));
  if(desired!==current)requestDraw();
  root.dataset.progress=progress.toFixed(4);
 }
 // Do not replace the current renderer until the first image actually loads.
 try{
  const first=new Image();first.decoding='async';
  await new Promise((resolve,reject)=>{first.onload=resolve;first.onerror=reject;first.src=frameUrl(0);});
  cache.set(0,first);
 }catch{return fallback();}
 host.prepend(canvas);
 root.dataset.renderer='sequence';
 root.dataset.ready='true';
 const observer=new IntersectionObserver(entries=>{active=entries[0].isIntersecting&&!document.hidden;if(active)onScroll();},{rootMargin:'200px'});
 observer.observe(root);
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('resize',requestDraw,{passive:true});
 document.addEventListener('visibilitychange',()=>{active=!document.hidden;if(active)onScroll();});
 onScroll();requestDraw();
 // Interactive artwork and selection require live 3D. Switch on explicit request.
 const switchToLive=()=>{
  if(disposed)return;disposed=true;observer.disconnect();removeEventListener('scroll',onScroll);removeEventListener('resize',requestDraw);
  cancelAnimationFrame(raf);canvas.remove();root.dataset.ready='';fallback();
 };
 root.querySelector('#showcase-artwork')?.addEventListener('click',switchToLive,{once:true,capture:true});
 root.querySelectorAll('[data-pocket]').forEach(el=>el.addEventListener('click',switchToLive,{once:true,capture:true}));
 addEventListener('showcase-open',switchToLive,{once:true});
 addEventListener('showcase-artwork',switchToLive,{once:true});
}
