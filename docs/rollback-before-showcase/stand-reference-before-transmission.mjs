import * as THREE from 'three';
import {RoundedBoxGeometry} from './vendor/three/RoundedBoxGeometry.js';
import {A4,A5,COLUMN_WIDTHS,columnX} from './stand-layout.mjs';

// Image-derived concept dimensions. Paper remains true A4/A5; not fabrication CAD.
export const REFERENCE_STAND={width:1.34,height:1.86,baseDepth:.38,rackWidth:1.26,screenWidth:.48,screenHeight:.75,shelfHeights:{top:.87,middle:.55,bottom:.23},shelfTilt:.18};
export function installReferenceStand(view){
 view.config={...view.config,...REFERENCE_STAND};
 const contactCanvas=document.createElement('canvas');contactCanvas.width=256;contactCanvas.height=128;const contactContext=contactCanvas.getContext('2d');contactContext.filter='blur(5px)';contactContext.fillStyle='rgba(24,20,16,.42)';contactContext.fillRect(11,15,234,98);view.contactTexture.dispose();view.contactTexture=new THREE.CanvasTexture(contactCanvas);view.contactShadow.material.map=view.contactTexture;view.contactShadow.material.needsUpdate=true;view.contactShadow.geometry.dispose();view.contactShadow.geometry=new THREE.PlaneGeometry(1.46,.50);view.contactShadow.position.set(0,.0001,0);

 view.build=function(){
  if(this.group){this.scene.remove(this.group);const materials=new Set();this.group.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[])){materials.add(m);if(m.map&&!m.userData.sharedArtwork)m.map.dispose();}});materials.forEach(m=>m.dispose());}
  const c=this.config,group=new THREE.Group();this.group=group;this.scene.add(group);this.pickables=[];
  const metal=new THREE.MeshPhysicalMaterial({color:'#b6bcc0',metalness:.96,roughness:.14,envMapIntensity:1.65,clearcoat:.38,clearcoatRoughness:.12,anisotropy:.5});
  const baseMetal=new THREE.MeshPhysicalMaterial({color:'#b0b7bb',metalness:.94,roughness:.18,envMapIntensity:1.4,clearcoat:.18,clearcoatRoughness:.2});
  const edge=new THREE.MeshStandardMaterial({color:'#d8dfe2',metalness:.9,roughness:.21});
  const dark=new THREE.MeshStandardMaterial({color:'#272a29',metalness:.35,roughness:.29});
  const acrylic=new THREE.MeshPhysicalMaterial({polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,color:'#f7fcfb',roughness:.055,metalness:0,transparent:true,opacity:.045,ior:1.49,specularIntensity:1,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.8,side:THREE.DoubleSide,depthWrite:false});
  const glassEdge=new THREE.MeshPhysicalMaterial({color:'#c7d4d1',roughness:.10,metalness:.12,transparent:true,opacity:.45,clearcoat:1,envMapIntensity:1.6,depthWrite:false});
  for(const material of [metal,baseMetal,edge,dark,acrylic,glassEdge])material.userData.referenceFinish=true;
  const box=(w,h,d,x,y,z,material,parent=group,rounded=false)=>{const mesh=new THREE.Mesh(rounded?new RoundedBoxGeometry(w,h,d,3,Math.min(.006,Math.min(w,h,d)/3)):new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  box(c.width,.055,c.baseDepth,0,.042,0,baseMetal,group,true);
  box(c.width-.038,.009,c.baseDepth-.026,0,.0728,-.005,edge,group,true);
  box(c.width-.02,.007,.012,0,.028,c.baseDepth/2+.001,dark);
  for(const x of [-.54,.54])for(const z of [-.14,.14]){box(.043,.016,.043,x,.008,z,dark);const footShadowMaterial=new THREE.MeshBasicMaterial({map:this.contactTexture,transparent:true,opacity:.65,depthWrite:false});footShadowMaterial.userData.sharedArtwork=true;const footShadow=new THREE.Mesh(new THREE.PlaneGeometry(.12,.085),footShadowMaterial);footShadow.rotation.x=-Math.PI/2;footShadow.position.set(x,.0003,z);group.add(footShadow);}
  for(const x of [-.617,.617])box(.026,.97,.032,x,.565,-.095,metal);
  box(1.26,.026,.032,0,1.063,-.095,metal);box(1.26,.022,.032,0,.095,-.095,metal);
  for(const x of [-.145,.145])box(.024,1.29,.033,x,.715,-.133,metal);
  box(.36,.026,.028,0,1.20,-.133,metal);
  for(const x of [-.605,.605])for(const y of [.15,1.02]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.002,10),edge);screw.rotation.x=Math.PI/2;screw.position.set(x,y,-.077);group.add(screw);}
  const screenY=c.height-c.screenHeight/2;
  box(c.screenWidth+.018,c.screenHeight+.018,.045,0,screenY,-.107,metal,group,true);
  box(c.screenWidth,c.screenHeight,.009,0,screenY,-.080,dark,group,true);
  const screenMap=this.screenVideo?.readyState>=2?this.screenVideoTexture:this.screenPoster;
  const screenMaterial=new THREE.MeshBasicMaterial({map:screenMap,toneMapped:false});screenMaterial.userData.sharedArtwork=true;this.screenMaterial=screenMaterial;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(c.screenWidth-.022,c.screenHeight-.024),screenMaterial);screen.position.set(0,screenY,-.074);group.add(screen);
  for(const [row,y] of Object.entries(c.shelfHeights)){
   const shelf=new THREE.Group();shelf.position.set(0,y,.028);shelf.rotation.x=-c.shelfTilt;group.add(shelf);
   box(1.26,.022,.105,0,-.145,.038,metal,shelf,true);box(1.255,.004,.005,0,-.132,.093,edge,shelf,true);
   box(1.255,.043,.003,0,-.114,.090,acrylic,shelf);
   for(const x of [-.63,.63])box(.004,.13,.10,x,-.071,.04,acrylic,shelf);
   for(let holder=0;holder<6;holder++){
    const editable=holder===2||holder===3,x=columnX(holder),selected=this.selection.shelf===row&&this.selection.holder===holder;
    const magazine=this.magazines.find(m=>m.shelf===row&&m.holder===holder),leafletIndex=['top','middle','bottom'].indexOf(row)*2+holder-2;
    const texture=magazine?.texture||(selected&&this.artwork?this.artwork:editable?this.leafletTextures?.[leafletIndex]:null),paper=editable?A5:A4;
    // Individual folded acrylic pockets: full-height back, sides, retaining lip and fine polished rim.
    const holderWidth=paper.width+.008,holderHeight=paper.height+.008,holderY=-.139+paper.height/2;
    box(holderWidth,holderHeight,.0022,x,holderY,-.008,acrylic,shelf);
    box(holderWidth,.060,.0022,x,-.109,.048,acrylic,shelf);
    for(const side of [-1,1]){
     box(.0022,holderHeight,.045,x+side*holderWidth/2,holderY,.014,acrylic,shelf);
     box(.0017,holderHeight,.0017,x+side*holderWidth/2,holderY,.037,glassEdge,shelf,true);
    }
    box(holderWidth,.0017,.0017,x,-.079,.050,glassEdge,shelf,true);
    box(holderWidth,.0016,.0016,x,holderY+holderHeight/2,-.007,glassEdge,shelf,true);
    const rim=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(holderWidth,holderHeight)),new THREE.LineBasicMaterial({color:'#a9b9b5',transparent:true,opacity:.38}));rim.position.set(x,holderY,-.004);rim.material.depthWrite=false;rim.material.polygonOffset=true;rim.material.polygonOffsetFactor=-1;rim.material.polygonOffsetUnits=-1;rim.userData.holderRim=true;shelf.add(rim);

    if(texture){const back=new THREE.MeshStandardMaterial({color:'#f7f5ef',roughness:.94});for(let i=0;i<3;i++)box(paper.width,paper.height,.0014,x,-.139+paper.height/2,.002+i*.0015,back,shelf);const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});m.userData.sharedArtwork=true;const print=new THREE.Mesh(new THREE.PlaneGeometry(paper.width,paper.height),m);print.position.set(x,-.139+paper.height/2,.010);shelf.add(print);}
    if(editable){
     const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(A5.width+.008,A5.height+.008,.004)),new THREE.LineBasicMaterial({color:'#8a654a',transparent:true,opacity:.2}));line.position.set(x,-.139+A5.height/2,.019);shelf.add(line);
     const hit=new THREE.Mesh(new THREE.PlaneGeometry(A5.width+.008,A5.height+.008),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));hit.position.copy(line.position);hit.position.z=.022;hit.userData.facing={shelf:row,holder};shelf.add(hit);this.pickables.push(hit);
    }
    if(holder<5)box(.003,.11,.084,x+COLUMN_WIDTHS[holder]/2+.006,-.084,.035,acrylic,shelf);
   }
  }
  Object.assign(this.renderer.domElement.dataset,{model:'reference-premium-v3',plasticHolders:'18',magazines:'12',editableSlots:'6',selectedSlot:this.selection.shelf+'-'+this.selection.holder,artworkSlot:this.artwork?this.selection.shelf+'-'+this.selection.holder:''});
  this.render();
 };
}
export function installPremiumReflections(view,photograph){
 const room=new THREE.Scene();room.background=new THREE.Color('#777c7a');
 const card=(w,h,x,y,z,color,power=1,map=null)=>{const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(power),map,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);mesh.lookAt(0,1,0);room.add(mesh);};
 card(7,4,0,1,-4,'#ffffff',1,photograph);
 card(3,5,-3.5,2,1,'#edf4fa',3.0);
 card(.24,5,2.8,2,1,'#ffffff',3.2);
 card(2.7,5,3.7,2,0,'#e2ded5',.7);
 card(7,5,0,2,4,'#c7cfcd',1.1);
 card(.32,4,-1.5,2,3.8,'#303634',.8);
 card(.26,4,1.5,2,3.8,'#ffffff',2.8);
 card(5,4,0,5,0,'#ffffff',2.0);
 const generator=new THREE.PMREMGenerator(view.renderer);const environment=generator.fromScene(room,.025,.1,30);generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});view.env?.dispose();view.env=environment;view.scene.environment=environment.texture;view.scene.environmentIntensity=.9;
}
