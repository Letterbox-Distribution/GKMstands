import * as THREE from './vendor/three/three.module.js';

// The wall and floor share the product camera, lighting and shadow coordinates.
export function createArchitecturalSetting(view){
 const group=new THREE.Group();group.name='Architectural setting';view.scene.add(group);
 const fade={value:0};
 const stone=(color,roughness=.85)=>{
  const material=new THREE.MeshStandardMaterial({color,roughness});
  material.onBeforeCompile=shader=>{
   shader.uniforms.settingFade=fade;
   shader.vertexShader='varying vec3 settingPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsettingPosition=position;');
   shader.fragmentShader='uniform float settingFade;varying vec3 settingPosition;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float grain=fract(sin(dot(floor(settingPosition.xy*1600.),vec2(12.9898,78.233)))*43758.5453);
    float strata=sin(settingPosition.y*125.+sin(settingPosition.x*4.)*.4);
    diffuseColor.rgb*=1.+((grain-.5)*.025+strata*.006)*(1.-settingFade);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,vec3(4.),settingFade);\n#include <opaque_fragment>');
  };return material;
 };
 const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const wall=stone('#dfd7c9');add(new THREE.PlaneGeometry(40,12),wall,0,5.99,-.34);
 const floor=add(new THREE.PlaneGeometry(40,20),stone('#d3ccbf',.72),0,-.009,9.66);floor.rotation.x=-Math.PI/2;
 // Restrained panel joints and a single walnut reveal frame the product.
 const joint=stone('#c2b8a8');for(const x of [-1.7,1.12])add(new THREE.PlaneGeometry(.007,12),joint,x,5.99,-.337);
 add(new THREE.BoxGeometry(.14,12,.035),stone('#6d5140',.48),1.2,5.99,-.323);
 add(new THREE.BoxGeometry(40,.018,.012),stone('#a89d8c'),0,0,-.327);
 const materials=new Set();group.traverse(object=>{if(object.material)materials.add(object.material);});
 const venueShadow=add(new THREE.PlaneGeometry(40,20),new THREE.ShadowMaterial({opacity:0,depthWrite:false}),0,-.008,9.66);venueShadow.rotation.x=-Math.PI/2;group.remove(venueShadow);view.scene.add(venueShadow);
 const opening=new THREE.Color('#faf8f4'),white=new THREE.Color('#ffffff');
 return {update(amount,opacity=1){fade.value=amount;venueShadow.material.opacity=(1-opacity)*(1-amount)*.22;venueShadow.visible=venueShadow.material.opacity>.001;for(const material of materials){const materialOpacity=opacity;const transparent=materialOpacity<.999;if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}material.opacity=materialOpacity;material.depthWrite=!transparent;}view.scene.background.copy(opening).lerp(white,amount);group.visible=amount<.999&&opacity>.001;}};
}
