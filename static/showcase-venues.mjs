import {assetUrl} from './asset-url.mjs';
import * as THREE from './vendor/three/three.module.js';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10)},range=(p,a,b)=>ease((p-a)/(b-a));

// One shared physical wall/floor; the room is a material blend, not a second scene.
export function createVenueSequence(view,architecture,invalidate){
 let loading=false,ready=false,readyAt=0;
 const openingKey=new THREE.Color('#fff8ee'),venueKey=new THREE.Color('#ffe5c6');
 const openingFill=new THREE.Color('#d5e8ff'),venueFill=new THREE.Color('#e7e3db');
 async function load(){
  if(loading)return;loading=true;
  try{
   const response=await fetch(assetUrl('/static/environments/hotel-wall-showcase.webp'));if(!response.ok)throw Error('Venue image unavailable');
   const image=await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
   const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
   architecture.setVenue(texture,image.width/image.height);view.renderer.initTexture(texture);
   readyAt=performance.now();ready=true;invalidate();
  }catch{loading=true;}
 }
 return {prepare:load,render(progress,width,height){
  if(progress>.015&&progress<.49&&!loading)load();
  const available=ready?range(performance.now(),readyAt,readyAt+450):0;
  const entry=range(progress,.09,.24),leaving=range(progress,.32,.49),presence=entry*available*(1-leaving);
  architecture.update(leaving,1,presence,entry*available);
  view.keyLight?.color.copy(openingKey).lerp(venueKey,presence*.45);
  view.fillLight?.color.copy(openingFill).lerp(venueFill,presence*.45);
  view.scene.environmentIntensity=.9-presence*.05;
  view.renderer.render(view.scene,view.camera);
  if(ready&&available<1&&progress>.08&&progress<.50)invalidate();
  return {visible:presence,travel:0,ready};
 }};
}
