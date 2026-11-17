import * as THREE from './vendor/three/three.module.js';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10)},range=(p,a,b)=>ease((p-a)/(b-a));

// A single architectural studio: no photograph, download or second scene.
export function createVenueSequence(view,architecture){
 const openingKey=new THREE.Color('#fff8ee'),warmKey=new THREE.Color('#ffe7ce');
 const openingFill=new THREE.Color('#d5e8ff'),warmFill=new THREE.Color('#efe8dd');
 return {prepare:()=>Promise.resolve(),render(progress){
  const reveal=range(progress,.02,.20),leaving=range(progress,.32,.49);
  const warmth=reveal*(1-leaving);
  architecture.update(leaving,1,0,reveal,progress);
  view.keyLight?.color.copy(openingKey).lerp(warmKey,warmth*.32);
  view.fillLight?.color.copy(openingFill).lerp(warmFill,warmth*.35);
  view.scene.environmentIntensity=.9+warmth*.07;
  view.renderer.render(view.scene,view.camera);
  return {visible:0,travel:0,ready:true,studio:true};
 }};
}
