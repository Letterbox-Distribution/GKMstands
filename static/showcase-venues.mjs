import {assetUrl} from './asset-url.mjs';
import * as THREE from './vendor/three/three.module.js';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10)},range=(p,a,b)=>ease((p-a)/(b-a));

// Photographic venue context is loaded only as its scroll chapter approaches.
// The live stand, contact shadows and digital advert stay in the same camera.
export function createVenueSequence(view,architecture,invalidate){
 let loading=false,ready=false,readyAt=0,material,scene,camera;
 async function load(){
  if(loading)return;loading=true;
  try{
   const response=await fetch(assetUrl('/static/environments/hotel-wall-showcase.webp'));if(!response.ok)throw Error('Venue image unavailable');
   const image=await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
   const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
   material=new THREE.ShaderMaterial({toneMapped:false,depthTest:false,depthWrite:false,uniforms:{hotel:{value:texture},hotelAspect:{value:image.width/image.height},slide:{value:0},presence:{value:0},cameraWorld:{value:new THREE.Matrix4()},inverseProjection:{value:new THREE.Matrix4()}},vertexShader:'varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
    uniform sampler2D hotel;uniform float hotelAspect,slide,presence;uniform mat4 cameraWorld,inverseProjection;varying vec2 screenUv;
    vec2 venueUv(){
     vec4 eye=inverseProjection*vec4(screenUv*2.-1.,1.,1.);
     vec3 direction=normalize(mat3(cameraWorld)*(eye.xyz/eye.w));
     vec3 origin=cameraWorld[3].xyz;
     float wallDistance=(-.34-origin.z)/direction.z;
     vec3 point=origin+direction*wallDistance;
     bool ground=point.y<0.;
     if(ground){float floorDistance=(-.009-origin.y)/direction.y;point=origin+direction*floorDistance;}
     // The venue uses the opening scene's actual wall and floor coordinates.
     // The seam therefore follows the product camera rather than a photo horizon.
     float span=4.7,verticalSpan=span/hotelAspect;
     float depth=ground?point.z+.34:0.;
     float perspective=max(.15,1.-depth/6.);
     float x=(point.x-slide)/(span*perspective);
     float y=((point.y-1.3)/perspective+1.3)/verticalSpan;
     vec2 uv=vec2(.50+x,1.-.787+y);
     return uv;
    }
    void main(){
     vec2 uv=venueUv();
     float edge=max(max(smoothstep(.94,1.04,uv.y),smoothstep(.97,1.02,uv.x)),1.-smoothstep(-.02,.06,uv.x));
     vec3 room=mix(texture2D(hotel,clamp(uv,vec2(.001),vec2(.999))).rgb,vec3(1.),edge);
     gl_FragColor=vec4(mix(vec3(1.),room,presence),1.);
     #include <colorspace_fragment>
    }`});
   scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
   await view.renderer.compileAsync(scene,camera);readyAt=performance.now();ready=true;invalidate();
  }catch{loading=true;}
 }
 return {prepare:load,render(progress,width,height){
  if(progress>.015&&progress<.49&&!loading)load();
  const available=ready?range(performance.now(),readyAt,readyAt+450):0;
  const entry=range(progress,.09,.24),entering=entry*available,leaving=range(progress,.32,.49),studio=range(progress,.32,.49);
  const architectureOpacity=(1-entering)*(1-leaving);
  architecture.update(studio,architectureOpacity);
  if(ready&&progress>.08&&progress<.50){
   material.uniforms.cameraWorld.value.copy(view.camera.matrixWorld);material.uniforms.inverseProjection.value.copy(view.camera.projectionMatrixInverse);
   material.uniforms.slide.value=-.24*(1-entry)+.24*leaving;material.uniforms.presence.value=available*(1-leaving);
   const background=view.scene.background,autoClear=view.renderer.autoClear;view.scene.background=null;view.renderer.autoClear=false;
   view.renderer.setClearColor('#ffffff',1);view.renderer.clear();view.renderer.render(scene,camera);view.renderer.clearDepth();view.renderer.render(view.scene,view.camera);
   view.scene.background=background;view.renderer.autoClear=autoClear;
  }else view.renderer.render(view.scene,view.camera);
  if(ready&&available<1&&progress>.08&&progress<.50)invalidate();
  return {visible:entering*(1-leaving),travel:0,ready};
 }};
}
