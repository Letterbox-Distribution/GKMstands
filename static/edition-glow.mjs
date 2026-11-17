import * as THREE from 'three';

// Project the selected leaflet's actual four corners; CSS supplies the quiet pulse.
export function createEditionGlow(host){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.classList.add('edition-glow');svg.setAttribute('aria-hidden','true');svg.setAttribute('hidden','');
 svg.innerHTML='<g class="edition-glow-pulse"><polygon class="edition-glow-edge"/></g>';
 host.append(svg);const polygons=svg.querySelectorAll('polygon'),corners=Array.from({length:4},()=>new THREE.Vector3());
 return {update(object,camera,opacity,width,height){
  const show=!!object&&object.visible&&opacity>.001;svg.toggleAttribute('hidden',!show);if(!show)return;
  const {width:w,height:h}=object.geometry.parameters;
  object.updateWorldMatrix(true,false);
  const coordinates=[[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]];
  const projected=corners.map((point,i)=>{point.set(...coordinates[i],.004).applyMatrix4(object.matrixWorld).project(camera);return [(point.x+1)*width/2,(1-point.y)*height/2];});
  const cx=projected.reduce((sum,p)=>sum+p[0],0)/4,cy=projected.reduce((sum,p)=>sum+p[1],0)/4;
  const points=projected.map(([x,y])=>[x+Math.sign(x-cx)*2,y+Math.sign(y-cy)*2].map(n=>n.toFixed(2)).join(',')).join(' ');
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.opacity=String(opacity);polygons.forEach(p=>p.setAttribute('points',points));
 }};
}
