import * as THREE from 'three';
import {RoundedBoxGeometry} from './vendor/three/RoundedBoxGeometry.js';
import {A4,A5,COLUMN_WIDTHS,columnX} from './stand-layout.mjs';

// Image-derived concept dimensions. Paper remains true A4/A5; not fabrication CAD.
export const REFERENCE_STAND={width:1.34,height:1.86,baseDepth:.38,rackWidth:1.26,screenWidth:.48,screenHeight:.75,shelfHeights:{top:.87,middle:.55,bottom:.23},shelfTilt:.18};
export function installReferenceStand(view){
 view.config={...view.config,...REFERENCE_STAND};
 view.build=function(){
  if(this.group){this.scene.remove(this.group);const materials=new Set();this.group.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[])){materials.add(m);if(m.map&&!m.userData.sharedArtwork)m.map.dispose();}});materials.forEach(m=>m.dispose());}
  const c=this.config,group=new THREE.Group();this.group=group;this.scene.add(group);this.pickables=[];
  const metal=new THREE.MeshStandardMaterial({color:'#9d9e99',metalness:.88,roughness:.25,envMapIntensity:1.35});
  const baseMetal=new THREE.MeshStandardMaterial({color:'#a1a29e',metalness:.82,roughness:.3});
  const edge=new THREE.MeshStandardMaterial({color:'#c2c1b9',metalness:.9,roughness:.21});
  const dark=new THREE.MeshStandardMaterial({color:'#272a29',metalness:.35,roughness:.29});
  const acrylic=new THREE.MeshPhysicalMaterial({color:'#edf3f0',roughness:.09,metalness:0,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false});
  const box=(w,h,d,x,y,z,material,parent=group,rounded=false)=>{const mesh=new THREE.Mesh(rounded?new RoundedBoxGeometry(w,h,d,3,Math.min(.006,d/3)):new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  box(c.width,.055,c.baseDepth,0,.042,0,baseMetal,group,true);
  box(c.width-.038,.009,c.baseDepth-.026,0,.074,-.005,edge,group,true);
  box(c.width-.02,.007,.012,0,.028,c.baseDepth/2+.001,dark);
  for(const x of [-.54,.54])for(const z of [-.14,.14])box(.043,.015,.043,x,.006,z,dark);
  for(const x of [-.617,.617])box(.026,.97,.032,x,.565,-.095,metal);
  box(1.26,.026,.032,0,1.063,-.095,metal);box(1.26,.022,.032,0,.095,-.095,metal);
  for(const x of [-.145,.145])box(.024,1.29,.033,x,.715,-.133,metal);
  box(.36,.026,.028,0,1.20,-.133,metal);
  const screenY=c.height-c.screenHeight/2;
  box(c.screenWidth+.018,c.screenHeight+.018,.045,0,screenY,-.107,metal,group,true);
  box(c.screenWidth,c.screenHeight,.009,0,screenY,-.080,dark,group,true);
  const screenMap=this.screenVideo?.readyState>=2?this.screenVideoTexture:this.screenPoster;
  const screenMaterial=new THREE.MeshBasicMaterial({map:screenMap,toneMapped:false});screenMaterial.userData.sharedArtwork=true;this.screenMaterial=screenMaterial;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(c.screenWidth-.022,c.screenHeight-.024),screenMaterial);screen.position.set(0,screenY,-.074);group.add(screen);
  for(const [row,y] of Object.entries(c.shelfHeights)){
   const shelf=new THREE.Group();shelf.position.set(0,y,.028);shelf.rotation.x=-c.shelfTilt;group.add(shelf);
   box(1.26,.022,.105,0,-.145,.038,metal,shelf);box(1.255,.006,.008,0,-.132,.093,edge,shelf);
   box(1.255,.305,.004,0,.006,-.012,acrylic,shelf);box(1.255,.043,.004,0,-.114,.090,acrylic,shelf);
   for(const x of [-.63,.63])box(.004,.13,.10,x,-.071,.04,acrylic,shelf);
   for(let holder=0;holder<6;holder++){
    const editable=holder===2||holder===3,x=columnX(holder),selected=this.selection.shelf===row&&this.selection.holder===holder;
    const magazine=this.magazines.find(m=>m.shelf===row&&m.holder===holder),leafletIndex=['top','middle','bottom'].indexOf(row)*2+holder-2;
    const texture=magazine?.texture||(selected&&this.artwork?this.artwork:editable?this.leafletTextures?.[leafletIndex]:null),paper=editable?A5:A4;
    if(texture){const back=new THREE.MeshStandardMaterial({color:'#f7f5ef',roughness:.94});for(let i=0;i<3;i++)box(paper.width,paper.height,.0014,x,-.139+paper.height/2,.002+i*.0015,back,shelf);const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});m.userData.sharedArtwork=true;const print=new THREE.Mesh(new THREE.PlaneGeometry(paper.width,paper.height),m);print.position.set(x,-.139+paper.height/2,.010);shelf.add(print);}
    if(editable){
     const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(A5.width+.008,A5.height+.008,.004)),new THREE.LineBasicMaterial({color:'#a5b84f',transparent:true,opacity:.2}));line.position.set(x,-.139+A5.height/2,.019);shelf.add(line);
     const hit=new THREE.Mesh(new THREE.PlaneGeometry(A5.width+.008,A5.height+.008),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));hit.position.copy(line.position);hit.position.z=.022;hit.userData.facing={shelf:row,holder};shelf.add(hit);this.pickables.push(hit);
    }
    if(holder<5)box(.003,.11,.084,x+COLUMN_WIDTHS[holder]/2+.006,-.084,.035,acrylic,shelf);
   }
  }
  Object.assign(this.renderer.domElement.dataset,{model:'reference-concept-v2',magazines:'12',editableSlots:'6',selectedSlot:this.selection.shelf+'-'+this.selection.holder,artworkSlot:this.artwork?this.selection.shelf+'-'+this.selection.holder:''});
  this.render();
 };
}
