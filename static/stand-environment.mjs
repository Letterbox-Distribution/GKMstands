import * as THREE from 'three';
let airportBackdropPromise;
export function loadAirportBackdrop(){
 if(!airportBackdropPromise)airportBackdropPromise=new THREE.TextureLoader().loadAsync('/static/environments/airport-lounge-photo.png').then(texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;return texture;
 });
 return airportBackdropPromise;
}
// Crop to fill without stretching the photographic concept setting.
export function fitBackdrop(texture,width,height){
 if(!texture?.image)return;
 const imageAspect=texture.image.width/texture.image.height,viewAspect=width/height;
 texture.repeat.set(viewAspect<imageAspect?viewAspect/imageAspect:1,viewAspect>imageAspect?imageAspect/viewAspect:1);
 texture.offset.set((1-texture.repeat.x)/2,(1-texture.repeat.y)/2);texture.updateMatrix();
}
