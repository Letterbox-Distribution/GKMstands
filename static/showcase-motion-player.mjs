// Decode the latest scroll pose directly; coalesce input while a seek is in flight.
export function createMotionPlayer(variant,revision,onFrame,onError){
 const video=document.createElement('video'),fps=variant.movie.fps,last=variant.count-1;
 video.muted=true;video.playsInline=true;video.preload='auto';
 video.width=variant.width*2;video.height=variant.height*2;
 let target=0,shown=-1,active=true,disposed=false,raf=0,warming=document.documentElement.classList.contains('entry-loading'),warmFrames=0,warmTimer;
 function schedule(){if(!raf&&!disposed&&active&&!document.hidden)raf=requestAnimationFrame(seek);}
 function seek(){
  raf=0;if(disposed||!active||document.hidden||video.readyState<2)return;
  if(warming){if(video.paused)video.play().catch(finishWarm);return;}
  if(video.seeking||shown===target)return;
  video.currentTime=(target+.05)/fps;
 }
 function finishWarm(){
  if(!warming||disposed)return;warming=false;video.pause();
  video.currentTime=(target+.05)/fps;
 }
 function observe(){
  if(disposed||!warming)return;
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(()=>{if(++warmFrames>=3||target>0)finishWarm();else observe();});
 }
 video.onloadeddata=()=>{
  if(video.videoWidth!==variant.width*2||video.videoHeight!==variant.height*2){onError();return;}
  if(!active||document.hidden){warming=false;return;}
  if(warming){video.play().catch(finishWarm);observe();if(!video.requestVideoFrameCallback)warmTimer=setTimeout(finishWarm,80);}
  else{if(target===0){shown=0;onFrame(video,0);}schedule();}
 };
 video.onseeked=()=>{
  if(disposed||warming)return;
  const index=Math.max(0,Math.min(last,Math.floor(video.currentTime*fps)));
  if((index-shown)*(target-shown)>=0&&Math.abs(index-shown)<=Math.abs(target-shown)+.5){shown=index;onFrame(video,index);}
  schedule();
 };
 video.onerror=()=>{if(!disposed)onError();};
 video.src=variant.base+variant.movie.file+'?v='+revision+'-'+variant.movie.version;video.load();
 return {
  setTarget(index,enabled=true){target=index;active=enabled;if(!active||document.hidden)video.pause();else schedule();},
  dispose(){disposed=true;cancelAnimationFrame(raf);clearTimeout(warmTimer);video.onloadeddata=video.onseeked=video.onerror=null;video.pause();video.removeAttribute('src');video.load();},
 };
}
