import {assetUrl} from './asset-url.mjs';

// Native decoding stays independent of WebGL; use HD only when efficient.
export function createNativeScreen(host,source,hdSource,onFrame){
 const layer=document.createElement('div');layer.className='native-screen-layer';layer.setAttribute('aria-hidden','true');
 const video=document.createElement('video');video.className='native-screen-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.width=720;video.height=1280;layer.append(video);host.append(layer);
 let wanted=false,disposed=false,surfaceWidth=720,surfaceHeight=1280,lastPoints,lastClip,attemptedFallback=false;
 // In the worker renderer, decoded frames become part of the stand's own texture.
 // Keep a single frame in flight so fast scrolling cannot build a video queue.
 let framePending=false;
 if(onFrame){
  layer.style.display='none';
  const capture=async()=>{
   if(disposed)return;
   if(wanted&&!framePending&&video.readyState>=2){
    framePending=true;
    try{const bitmap=await createImageBitmap(video,{imageOrientation:'flipY'});if(disposed){bitmap.close();framePending=false;}else onFrame(bitmap,()=>{framePending=false;});}catch{framePending=false;}
   }
   if(!disposed){if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(capture);else setTimeout(capture,40);}
  };
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(capture);else setTimeout(capture,40);
 }
 const reveal=()=>{if(video.readyState>=2)video.style.opacity='1';};video.addEventListener('loadeddata',reveal);
 const begin=selected=>{if(disposed)return;video.style.opacity='0';video.src=assetUrl(selected);video.dataset.quality=selected===hdSource?'1080p':'720p';if(wanted)video.play().catch(()=>{});};
 (async()=>{
  const connection=navigator.connection;
  if(!hdSource||connection?.saveData||(connection?.downlink&&connection.downlink<5)||['slow-2g','2g','3g'].includes(connection?.effectiveType)||!navigator.mediaCapabilities?.decodingInfo){begin(source);return;}
  try{
   const capabilities=await Promise.race([
    navigator.mediaCapabilities.decodingInfo({type:'file',video:{contentType:'video/mp4; codecs="avc1.640028"',width:1080,height:1920,bitrate:2200000,framerate:30}}),
    new Promise(resolve=>setTimeout(()=>resolve(null),120)),
   ]);
   begin(capabilities?.supported&&capabilities.smooth&&capabilities.powerEfficient?hdSource:source);
  }catch{begin(source);}
 })();
 video.addEventListener('error',()=>{if(!attemptedFallback&&video.dataset.quality==='1080p'){attemptedFallback=true;begin(source);}});
 video.addEventListener('loadedmetadata',()=>{
  surfaceWidth=video.videoWidth||720;surfaceHeight=video.videoHeight||1280;video.width=surfaceWidth;video.height=surfaceHeight;video.style.width=surfaceWidth+'px';video.style.height=surfaceHeight+'px';
  if(lastPoints)update(lastPoints,lastClip);
 });
 function update(points,clip){
  lastPoints=points;lastClip=clip;if(!points||points.length!==4)return;const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,denominator=dx1*dy2-dx2*dy1;
  if(Math.abs(denominator)<1e-10)return;
  const g=(dx3*dy2-dx2*dy3)/denominator,h=(dx1*dy3-dx3*dy1)/denominator;
  const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
  video.style.transform='matrix3d('+[a/surfaceWidth,d/surfaceWidth,0,g/surfaceWidth,b/surfaceHeight,e/surfaceHeight,0,h/surfaceHeight,0,0,1,0,x0,y0,0,1].map(n=>Number(n.toFixed(10))).join(',')+')';layer.style.clipPath=clip;
 }
 return {video,update,
  setPlaying(play){wanted=play;if(play){if(video.paused)video.play().then(()=>{if(wanted)reveal();else video.pause()}).catch(()=>{});else reveal();}else video.pause();},
  dispose(){disposed=true;wanted=false;video.pause();video.removeAttribute('src');video.load();layer.remove();},
 };
}
