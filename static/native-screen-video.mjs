import {assetUrl} from './asset-url.mjs';
﻿// Browser-composited video aligned to the four projected display corners.
// This avoids copying decoded frames through the 3D worker or re-rendering the stand.
export function createNativeScreen(host,source){
 const layer=document.createElement('div');layer.className='native-screen-layer';layer.setAttribute('aria-hidden','true');
 const video=document.createElement('video');video.className='native-screen-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.src=assetUrl(source);video.width=720;video.height=1280;layer.append(video);host.append(layer);
 let wanted=false;
 const reveal=()=>{if(video.readyState>=2)video.style.opacity='1';};video.addEventListener('loadeddata',reveal);
 return {video,
  update(points,clip){if(!points||points.length!==4)return;const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
   const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,denominator=dx1*dy2-dx2*dy1;
   if(Math.abs(denominator)<1e-10)return;
   const g=(dx3*dy2-dx2*dy3)/denominator,h=(dx1*dy3-dx3*dy1)/denominator;
   const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
   video.style.transform='matrix3d('+[a/720,d/720,0,g/720,b/1280,e/1280,0,h/1280,0,0,1,0,x0,y0,0,1].map(n=>Number(n.toFixed(10))).join(',')+')';layer.style.clipPath=clip;
  },
  setPlaying(play){wanted=play;if(play){if(video.paused)video.play().then(()=>{if(wanted)reveal();else video.pause()}).catch(()=>{});else reveal();}else video.pause();},
  dispose(){wanted=false;video.pause();video.removeAttribute('src');video.load();layer.remove();}
 };
}
