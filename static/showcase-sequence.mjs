// Cached opening and fallback; warm the live renderer for continuous scrolling.
const clamp=n=>Math.max(0,Math.min(1,n));
export async function createSequenceRenderer(canvas,replaceCanvas,{preferLive=false}={}){
 const response=await fetch('/static/showcase-sequence/manifest.json');
 if(!response.ok)return null;
 const manifest=await response.json();
 if(manifest.version!==1||!manifest.variants?.desktop||!manifest.variants?.mobile)return null;
 for(const variant of Object.values(manifest.variants)){
  if(!Number.isInteger(variant.count)||variant.count<2||variant.frames?.length!==variant.count||!(variant.width>0&&variant.height>0)||typeof variant.base!=='string')return null;
 }
 return new SequenceRenderer(canvas,manifest,replaceCanvas,preferLive);
}

class SequenceRenderer{
 constructor(canvas,manifest,replaceCanvas,preferLive){
  // Keep the temporary frame player off the GPU command queue while WebGL warms.
  this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false,willReadFrequently:true});this.manifest=manifest;this.replaceCanvas=replaceCanvas;this.preferLive=preferLive&&!matchMedia('(prefers-reduced-motion:reduce)').matches;
  this.cache=new Map();this.loading=new Map();this.encoded=new Map();this.warming=new Map();this.warmFailed=new Set();this.failed=new Set();this.active=true;this.progress=0;this.target=0;this.frame=0;this.lastMotion=performance.now();this.bytes=0;this.maxBytes=72*1024*1024;this.liveQueue=[];
 }
 emit(data){this.onmessage?.({data});}
 postMessage(data){
  if(this.disposed){data.bitmap?.close();return;}
  if(this.live){this.live.postMessage(data,data.bitmap?[data.bitmap]:[]);return;}
  if(['select','pick','artwork'].includes(data.type)){this.activateLive(data);return;}
  if(data.type==='video-frame'){
   this.video?.close();this.video=data.bitmap;this.pendingVideo=true;this.schedule();return;
  }
  if(data.type==='init'||data.type==='state'){
   const previous=this.target;this.progress=clamp(data.progress||0);this.width=data.width;this.height=data.height;this.active=data.active!==false;
   const variant=this.manifest.variants[this.width<=760?'mobile':'desktop'];
   if(variant!==this.variant){this.clear();this.variant=variant;this.failed.clear();this.canvas.dataset.model='reference-premium-v3';this.canvas.dataset.plasticHolders='18';this.canvas.dataset.editableSlots='6';}
   this.target=Math.round(this.progress*(variant.count-1));if(this.preferLive&&!this.activating&&!this.live)this.activateLive();
   if(previous!==this.target){
    this.lastMotion=performance.now();
    this.direction=Math.sign(this.target-previous)||this.direction||1;
    for(const [key,controller] of this.loading){
     const index=Number(key.split(':')[1]);
     if(Math.abs(index-this.target)>12)controller.abort();
    }
   }
   const ratio=Math.min(devicePixelRatio||1,2);const w=Math.round(this.width*ratio),h=Math.round(this.height*ratio);
   if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
   if(data.type==='state'&&this.presented&&this.active&&!document.hidden){this.paint();this.pump();}
   else this.schedule();
   clearTimeout(this.settle);this.settle=setTimeout(()=>this.schedule(),140);
  }
 }
 schedule(){if(!this.frame&&!this.disposed&&this.active&&!document.hidden)this.frame=requestAnimationFrame(()=>{this.frame=0;this.paint();this.pump();});}
 async load(index,full){
  const variant=this.variant,key=(full?'full:':'seek:')+index;
  if(!full&&this.cache.has('full:'+index))return;
  if(this.cache.has(key)||this.loading.has(key)||this.failed.has(key)||this.loading.size>=4)return;
  const controller=new AbortController();this.loading.set(key,controller);
  try{
   let blob=!full?this.encoded.get(index):null;
   if(!blob){const file=variant.frames[index].file;const response=await fetch(variant.base+(full?'':'seek-')+file+'?v='+this.manifest.revision+(full?'':'-native-v1'),{signal:controller.signal,priority:index===this.target?'high':'low'});if(!response.ok)throw Error('Missing sequence frame');blob=await response.blob();}
   const bitmap=await createImageBitmap(blob);
   if(this.disposed||variant!==this.variant||controller.signal.aborted){bitmap.close();return;}
   if(bitmap.width!==variant.width*2||bitmap.height!==variant.height*2){bitmap.close();throw Error('Non-native frame rejected');}
   if(full){const motion=this.cache.get('seek:'+index);if(motion){motion.bitmap.close();this.bytes-=motion.size;this.cache.delete('seek:'+index);}}
   const size=bitmap.width*bitmap.height*4;
   this.cache.set(key,{bitmap,index,full,size,used:performance.now()});this.bytes+=size;this.trim();
  }catch(error){
   if(error.name!=='AbortError'){
    this.failed.add(key);
    if((this.failed.has('full:'+this.target)||this.failed.has('seek:'+this.target))&&!this.activating)this.activateLive({type:'state',progress:this.progress,width:this.width,height:this.height,active:this.active});
   }
  }
  finally{if(this.loading.get(key)===controller)this.loading.delete(key);this.schedule();}
 }
 pump(){
  if(!this.active||this.disposed||this.live)return;
  const exact=this.target,direction=this.direction||1;
  // Keep full resolution during motion too. Never replace a sharp frame with a thumbnail.
  const motion=!!this.variant.motionNative;
  if(!this.cache.has('full:'+exact))this.load(exact,!motion);
  if(this.preferLive&&this.activating)return;
  if(performance.now()-this.lastMotion>140)this.load(exact,true);
  const jobs=[exact+direction,exact+direction*2,exact+direction*3,exact-direction];
  for(const index of jobs)if(index>=0&&index<this.variant.count)this.load(index,!motion);
  if(motion)for(let offset=4;offset<=16;offset++){const index=exact+direction*offset;if(index>=0&&index<this.variant.count)this.warm(index);}
 }
 async warm(index){
  if(this.warming.size>=2||this.encoded.has(index)||this.warming.has(index)||this.warmFailed.has(index))return;
  const variant=this.variant,controller=new AbortController();this.warming.set(index,controller);
  try{
   const response=await fetch(variant.base+'seek-'+variant.frames[index].file+'?v='+this.manifest.revision+'-native-v1',{signal:controller.signal,priority:'low'});
   if(response.ok){const blob=await response.blob();if(!this.disposed&&variant===this.variant&&!controller.signal.aborted){this.encoded.set(index,blob);while(this.encoded.size>24||[...this.encoded.values()].reduce((sum,item)=>sum+item.size,0)>8*1024*1024)this.encoded.delete(this.encoded.keys().next().value);}}else this.warmFailed.add(index);
  }catch(error){if(error.name!=='AbortError')this.warmFailed.add(index);}
  finally{if(this.warming.get(index)===controller)this.warming.delete(index);if(!this.disposed&&this.active&&!this.live)this.pump();}
 }
 trim(){
  while(this.bytes>this.maxBytes&&this.cache.size>1){
   const candidates=[...this.cache].filter(([,v])=>v.index!==this.target).sort((a,b)=>a[1].used-b[1].used);
   if(!candidates.length)break;const [key,value]=candidates[0];value.bitmap.close();this.bytes-=value.size;this.cache.delete(key);
  }
 }
 paint(){
  if(!this.variant||this.live)return;
  let chosen=this.cache.get('full:'+this.target)||(this.variant.motionNative?this.cache.get('seek:'+this.target):null);
  if(!chosen){for(const value of this.cache.values())if(!chosen||Math.abs(value.index-this.target)<Math.abs(chosen.index-this.target))chosen=value;}
  if(!chosen)return;
  chosen.used=performance.now();const metadata=this.variant.frames[chosen.index],ctx=this.context;this.displayedProgress=metadata.progress;
  const mobile=this.width<=760,focus=Number(metadata.zoom),source=this.variant;
  const radius=(w,h)=>Math.max((mobile?7.8:Math.max(4.65,5.48/(w/h)))*(1-.55*focus),mobile?1.5/(2*Math.tan(35*Math.PI/360)*(w/h)):0);
  const scale=this.height/source.height*radius(source.width,source.height)/radius(this.width,this.height);
  const x=this.width*(mobile?.5:.71)-source.width*(mobile?.5:.71)*scale;
  const anchor=(mobile?.92:.86)*(1-focus)+(mobile?.82:.50)*focus;
  const y=this.height*anchor-source.height*anchor*scale;
  const dpr=this.canvas.width/this.width;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,this.width,this.height);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const clip=Number.parseFloat(metadata.clip.match(/inset\(([^p]+)/)?.[1]||'0');
  ctx.beginPath();ctx.rect(0,clip,source.width,source.height-clip);ctx.clip();
  ctx.drawImage(chosen.bitmap,0,0,source.width,source.height);
  if(this.video&&metadata.progress<.57)drawScreen(ctx,this.video,metadata.screenCorners);
  ctx.restore();
  if(this.pendingVideo){this.pendingVideo=false;this.emit({type:'video-consumed'});}
  this.presented=true;
  this.emit({type:'frame',pixelRatio:dpr,progress:metadata.progress,clip:'inset(0px 0 0)',screenCorners:null,points:null,attributes:{...this.canvas.dataset,sequenceFrame:String(chosen.index),sequenceQuality:chosen.full?'full':'motion-native',sequenceSourceWidth:String(chosen.bitmap.width),sequenceSourceHeight:String(chosen.bitmap.height),sequenceCacheBytes:String(this.bytes)},venue:{visible:0,travel:0,ready:true},studio:metadata.studio,camera:metadata.camera,zoom:metadata.zoom,leaflets:metadata.leaflets});
 }
 async activateLive(data){
  if(data&&data.type!=='state')this.liveQueue.push(data);if(this.activating)return;this.activating=true;document.querySelector('#showcase').dataset.liveWarmStarted=performance.now().toFixed(1);
  const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive GoldKey Edition stand');canvas.style.position='absolute';canvas.style.inset='0';canvas.style.opacity='0';this.canvas.parentElement.prepend(canvas);
  const worker=new Worker(new URL('./showcase-render.worker.mjs',import.meta.url),{type:'module',name:'GoldKey interactive renderer'});this.pendingLive=worker;
  worker.onerror=()=>this.liveFailure(canvas);
  worker.onmessage=({data:message})=>{
   if(message.type==='startup-metrics'){document.querySelector('#showcase').dataset.liveWarmMetrics=JSON.stringify(message.timing);}
   if(message.type==='frame'&&!document.querySelector('#showcase').dataset.liveWarmFirstFrame)document.querySelector('#showcase').dataset.liveWarmFirstFrame=performance.now().toFixed(1);
   if(message.type==='error'){this.liveFailure(canvas);return;}
   if(message.type==='ready'){
    worker.postMessage({type:'state',progress:this.displayedProgress??this.progress,width:this.width,height:this.height,active:this.active});return;
   }
   if(message.type==='frame'&&!this.live&&Math.abs(message.progress-(this.displayedProgress??this.progress))<.0001){
    this.live=worker;this.pendingLive=null;canvas.style.opacity='1';this.canvas.style.visibility='hidden';this.replaceCanvas(canvas,message.progress);this.clear();
    this.canvas.width=1;this.canvas.height=1;this.canvas.remove();this.video?.close();this.video=null;
    document.querySelector('#showcase').dataset.renderer='hybrid-live';document.querySelector('#showcase').dataset.liveWarmHandoff=performance.now().toFixed(1);for(const queued of this.liveQueue)worker.postMessage(queued,queued.bitmap?[queued.bitmap]:[]);this.liveQueue=[];
   }
   if(this.live)this.emit(message);else if(message.type==='frame')worker.postMessage({type:'state',progress:this.displayedProgress??this.progress,width:this.width,height:this.height,active:this.active});
  };
  const offscreen=canvas.transferControlToOffscreen();worker.postMessage({type:'init',canvas:offscreen,width:this.width,height:this.height,progress:this.progress,pixelRatio:Math.min(devicePixelRatio||1,2)},[offscreen]);
 }
 liveFailure(canvas){this.preferLive=false;this.pendingLive?.terminate();this.pendingLive=null;this.activating=false;this.liveQueue.forEach(data=>data.bitmap?.close());this.liveQueue=[];canvas.remove();document.querySelector('#showcase-art-status').textContent='Interactive preview unavailable. Please try again.';}
 clear(){this.warming.forEach(controller=>controller.abort());this.warming.clear();this.encoded.clear();this.warmFailed.clear();this.loading.forEach(controller=>controller.abort());this.loading.clear();this.cache.forEach(value=>value.bitmap.close());this.cache.clear();this.bytes=0;}
 terminate(){this.disposed=true;cancelAnimationFrame(this.frame);clearTimeout(this.settle);this.clear();this.video?.close();this.liveQueue.forEach(data=>data.bitmap?.close());this.live?.terminate();this.pendingLive?.terminate();}
}

// Project the advert into the same 2D surface as the stand. No independently moving overlay.
function drawScreen(ctx,image,points){
 if(!points?.length)return;
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
 if(Math.abs(den)<1e-9)return;
 const g=(dx3*dy2-dx2*dy3)/den,h=(dx1*dy3-dx3*dy1)/den;
 const project=(u,v)=>[(x0+(x1-x0+g*x1)*u+(x3-x0+h*x3)*v)/(1+g*u+h*v),(y0+(y1-y0+g*y1)*u+(y3-y0+h*y3)*v)/(1+g*u+h*v)];
 const w=image.width,hg=image.height;
 for(let row=0;row<8;row++){
  const a=row/8,b=(row+1)/8,A=project(0,a),B=project(1,a),C=project(1,b),D=project(0,b);
  // Frames are Y-flipped for the live WebGL texture; undo that for Canvas2D.
  triangle(ctx,image,[[0,(1-a)*hg],[w,(1-a)*hg],[w,(1-b)*hg]],[A,B,C]);triangle(ctx,image,[[0,(1-a)*hg],[w,(1-b)*hg],[0,(1-b)*hg]],[A,C,D]);
 }
}
function triangle(ctx,image,src,dst){
 const [[u0,v0],[u1,v1],[u2,v2]]=src,[[x0,y0],[x1,y1],[x2,y2]]=dst;
 const det=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(!det)return;
 const coeff=values=>[(values[0]*(v1-v2)+values[1]*(v2-v0)+values[2]*(v0-v1))/det,(values[0]*(u2-u1)+values[1]*(u0-u2)+values[2]*(u1-u0))/det,(values[0]*(u1*v2-u2*v1)+values[1]*(u2*v0-u0*v2)+values[2]*(u0*v1-u1*v0))/det];
 const [a,c,e]=coeff([x0,x1,x2]),[b,d,f]=coeff([y0,y1,y2]);ctx.save();ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
}
