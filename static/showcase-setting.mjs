import * as THREE from './vendor/three/three.module.js';

// The wall and floor share the product camera, lighting and shadow coordinates.
export function createArchitecturalSetting(view){
 const group=new THREE.Group();group.name='Architectural setting';view.scene.add(group);
 const fade={value:0},venueTexture={value:null},venueAspect={value:1},venueMix={value:0};
 const stone=(color,roughness=.85,surface=false)=>{
  const material=new THREE.MeshStandardMaterial({color,roughness});
  material.onBeforeCompile=shader=>{
   shader.uniforms.settingFade=fade;Object.assign(shader.uniforms,{venueTexture,venueAspect,venueMix,venueSurface:{value:surface?1:0}});
   shader.vertexShader='varying vec3 settingPosition;varying vec3 settingWorldPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsettingPosition=position;settingWorldPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='uniform float settingFade,venueAspect,venueMix,venueSurface;uniform sampler2D venueTexture;varying vec3 settingPosition;varying vec3 settingWorldPosition;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float grain=fract(sin(dot(floor(settingPosition.xy*1600.),vec2(12.9898,78.233)))*43758.5453);
    float strata=sin(settingPosition.y*125.+sin(settingPosition.x*4.)*.4);
    diffuseColor.rgb*=1.+((grain-.5)*.025+strata*.006)*(1.-settingFade);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,vec3(4.),settingFade);\n#include <opaque_fragment>');
   shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>');
   shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
    if(venueMix>.0001&&venueSurface>.5){
     bool ground=settingWorldPosition.y<.001;
     float depth=ground?settingWorldPosition.z+.34:0.;
     float perspective=max(.15,1.-depth/6.);
     vec2 uv=vec2(.50+settingWorldPosition.x/(4.7*perspective),1.-.787+((settingWorldPosition.y-1.3)/perspective+1.3)/(4.7/venueAspect));
     float edge=max(max(smoothstep(.94,1.04,uv.y),smoothstep(.97,1.02,uv.x)),max(1.-smoothstep(-.02,.06,uv.x),1.-smoothstep(-.03,.045,uv.y)));
     vec3 room=mix(texture2D(venueTexture,clamp(uv,vec2(.001),vec2(.999))).rgb,vec3(1.),edge);
     room*=mix(.86,1.,getShadowMask());
     gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(room,1.)).rgb,venueMix);
    }`);
  };material.userData.venueSurface=surface;return material;
 };
 const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const wall=stone('#dfd7c9',.85,true);add(new THREE.PlaneGeometry(40,12),wall,0,5.99,-.34);
 const floor=add(new THREE.PlaneGeometry(40,20),stone('#d3ccbf',.72,true),0,-.009,9.66);floor.rotation.x=-Math.PI/2;
 // Restrained panel joints and a single walnut reveal frame the product.
 const joint=stone('#c2b8a8');for(const x of [-1.7,1.12])add(new THREE.PlaneGeometry(.007,12),joint,x,5.99,-.337);
 add(new THREE.BoxGeometry(.14,12,.035),stone('#6d5140',.48),1.2,5.99,-.323);
 add(new THREE.BoxGeometry(40,.018,.012),stone('#a89d8c'),0,0,-.327);
 const materials=new Set();group.traverse(object=>{if(object.material)materials.add(object.material);});
 const opening=new THREE.Color('#faf8f4'),white=new THREE.Color('#ffffff');
 const ease=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n)};
 return {setVenue(texture,aspect){venueTexture.value=texture;venueAspect.value=aspect;},update(amount,opacity=1,photoMix=0,entry=0){fade.value=amount;venueMix.value=photoMix;
  for(const material of materials){const materialOpacity=material.userData.venueSurface?1:opacity*(1-ease(entry*2));const transparent=materialOpacity<.999;if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}material.opacity=materialOpacity;material.depthWrite=!transparent;}
  view.scene.background.copy(opening).lerp(white,amount);group.visible=amount<.999;
 }};
}
