import * as THREE from './vendor/three/three.module.js';

// Exact HDR reflection faces and prefiltered roughness levels, baked once.
export async function loadCachedLighting(){
 const response=await fetch('/static/render-cache/premium-lighting-70b41dd9d503.bin.gz');
 if(!response.ok)throw Error('Cached lighting unavailable');
 let buffer=await response.arrayBuffer();const magic=new Uint8Array(buffer,0,2);if(magic[0]===31&&magic[1]===139)buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 const headerLength=new DataView(buffer).getUint32(0,true),metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,headerLength)).trim());let offset=4+headerLength;
 const result={};
 for(const [name,{size,levels}]of Object.entries(metadata)){
  const faces=Array.from({length:6},()=>({width:size,height:size,mipmaps:Array.from({length:levels},(_,lod)=>{const width=size>>lod,length=width*width*4,data=new Uint16Array(buffer,offset,length);offset+=length*2;return {width,height:width,data};})}));
  const texture=new THREE.CompressedCubeTexture(faces,THREE.RGBAFormat,THREE.HalfFloatType);texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=name==='reflection';texture.colorSpace=THREE.LinearSRGBColorSpace;texture.isRenderTargetTexture=true;texture.isPMREMTexture=name==='environment';texture.needsUpdate=true;result[name]=texture;
 }
 return result;
}
export function applyCachedLighting(view,lighting){view.reflectionCube=lighting.reflection;view.scene.environment=lighting.environment;view.scene.environmentIntensity=.9;view.env={dispose:()=>lighting.environment.dispose()};}
