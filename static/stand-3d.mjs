import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.js';
import {RoundedBoxGeometry} from './vendor/three/RoundedBoxGeometry.js';
import {loadAirportBackdrop,fitBackdrop} from './stand-environment.mjs';

const modelPromise=fetch('/static/stand-models.json').then(r=>{if(!r.ok)throw Error('Stand configuration unavailable');return r.json();});
import {A4,A5,MAGAZINES,COLUMN_WIDTHS,columnX,validFacing,facingForSlot} from './stand-layout.mjs';
export {facingForSlot};
const magazineImageLoads=new Map();
function loadMagazineImages(optimized=false){const key=String(optimized);if(!magazineImageLoads.has(key))magazineImageLoads.set(key,Promise.all(MAGAZINES.map(async magazine=>{const image=new Image();image.src=optimized?'/static/magazines/preview/'+magazine.file+'.webp':magazine.src;await image.decode();return {...magazine,image};})));return magazineImageLoads.get(key);}
const screenPosterPromise=(async()=>{const image=new Image();image.src='/static/video/goldkey-advert-luxury-poster.webp';await image.decode();return image;})();
function paperTexture(image,size){
 const canvas=document.createElement('canvas');canvas.width=Math.min(2048,Math.max(1000,image.width));canvas.height=Math.round(canvas.width*size.height/size.width);
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 const scale=Math.min(canvas.width/image.width,canvas.height/image.height),w=image.width*scale,h=image.height*scale;
 ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function disposeGroup(group){
 const materials=new Set(),textures=new Set();group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material)){materials.add(m);if(m.map&&!m.userData.sharedArtwork)textures.add(m.map);}});
 materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}

export class StandView{
 static async create(container,options={}){const [config,magazineImages,screenPoster,airportBackdrop]=await Promise.all([modelPromise,loadMagazineImages(options.optimizedAssets),screenPosterPromise,options.interactive===false?null:loadAirportBackdrop()]);return new StandView(container,config,{...options,magazineImages,screenPoster,airportBackdrop});}
 constructor(container,config,{interactive=true,onSelect=()=>{},background='#f4f7f6',magazineImages=[],screenPoster,airportBackdrop=null,deferBuild=false}={}){
  this.container=container;this.config=config;this.interactive=interactive;this.onSelect=onSelect;this.selection={shelf:'top',holder:2};this.finish='silver';this.wireframe=false;this.artwork=null;this.source=null;this.pickables=[];this.running=false;this.autoRotate=false;this.loadVersion=0;
  this.magazines=magazineImages.map(m=>({...m,texture:paperTexture(m.image,A4)}));
  this.screenPoster=new THREE.Texture(screenPoster);this.screenPoster.colorSpace=THREE.SRGBColorSpace;this.screenPoster.needsUpdate=true;
  this.screenEnabled=interactive&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(interactive){
   const video=document.createElement('video');this.screenVideo=video;video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.src='/static/video/goldkey-advert-luxury.mp4';video.setAttribute('aria-hidden','true');video.hidden=true;container.append(video);
   this.screenVideoTexture=new THREE.VideoTexture(video);this.screenVideoTexture.colorSpace=THREE.SRGBColorSpace;
   const showVideo=()=>{if(this.screenMaterial&&(!video.paused||video.currentTime>.1)){this.screenMaterial.map=this.screenVideoTexture;this.screenMaterial.needsUpdate=true;}this.render();};
   video.addEventListener('loadeddata',showVideo);video.addEventListener('play',showVideo);
   for(const event of ['play','pause','error'])video.addEventListener(event,()=>this.screenStatus());
  }
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Rotatable 3D Totem stand');this.renderer.domElement.setAttribute('role','img');
  this.scene=new THREE.Scene();this.airportBackdrop=airportBackdrop;this.studioBackground=background;this.scene.background=new THREE.Color(background);
  this.camera=new THREE.PerspectiveCamera(35,1,.05,30);
  if(!deferBuild){const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.04);this.scene.environment=this.env.texture;room.dispose();pmrem.dispose();}
  this.hemisphere=new THREE.HemisphereLight('#ffffff','#b2beb6',1.3);this.scene.add(this.hemisphere);
  const key=new THREE.DirectionalLight('#fff8ee',2.8);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-2;key.shadow.normalBias=.025;key.shadow.bias=-.0004;key.shadow.radius=3;this.scene.add(key);this.keyLight=key;
  const fill=new THREE.DirectionalLight('#d5e8ff',1.3);fill.position.set(3,3,-3);this.scene.add(fill);this.fillLight=fill;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({color:'#6b7c72',opacity:.17}));ground.rotation.x=-Math.PI/2;ground.position.y=-.008;ground.receiveShadow=true;this.scene.add(ground);this.studioGround=ground;
  const contactCanvas=document.createElement('canvas');contactCanvas.width=256;contactCanvas.height=128;const contactContext=contactCanvas.getContext('2d');const fade=contactContext.createRadialGradient(128,64,12,128,64,120);fade.addColorStop(0,'#20160d50');fade.addColorStop(.55,'#20160d24');fade.addColorStop(1,'#20160d00');contactContext.fillStyle=fade;contactContext.fillRect(0,0,256,128);
  this.contactTexture=new THREE.CanvasTexture(contactCanvas);this.contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.85),new THREE.MeshBasicMaterial({map:this.contactTexture,transparent:true,depthWrite:false,opacity:.7}));this.contactShadow.rotation.x=-Math.PI/2;this.contactShadow.position.y=-.006;this.scene.add(this.contactShadow);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.12,0);this.controls.enablePan=false;this.controls.rotateSpeed=.65;this.controls.enableDamping=interactive;this.controls.dampingFactor=.08;this.controls.minDistance=2.3;this.controls.maxDistance=7;this.controls.minPolarAngle=Math.PI*.43;this.controls.maxPolarAngle=Math.PI*.49;this.controls.autoRotateSpeed=1.1;
  if(!interactive)this.controls.enabled=false;
  this.controls.addEventListener('start',()=>{this.autoRotate=false;this.controls.autoRotate=false;this.container.dispatchEvent(new Event('stand-interaction'));});
  this.controls.addEventListener('change',()=>this.container.dispatchEvent(new CustomEvent('stand-angle',{detail:Math.round(Math.atan2(this.camera.position.x,this.camera.position.z)*180/Math.PI)})));
  this.setEnvironment(interactive?'airport':'studio');
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.preset('angle');if(!deferBuild)this.build();this.resize();
  if(interactive){let down;this.renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);this.renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=this.renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(pointer,this.camera);const hit=ray.intersectObjects(this.pickables)[0];if(hit)this.onSelect(hit.object.userData.facing);});}
 }
 resize(){const w=Math.max(1,this.container.clientWidth),h=Math.max(1,this.container.clientHeight);this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.environment==='airport')fitBackdrop(this.airportBackdrop,w,h);this.render();}
 preset(name){this.controls?.target.set(0,1.12,0);const positions=this.environment==='airport'?{front:[0,1.6,5.1],angle:[1.8,1.7,4.8],side:[4.8,1.6,.9]}:{front:[0,1.45,4.5],angle:[2.4,1.65,4.2],side:[4.5,1.5,.8]};this.camera.position.set(...(positions[name]||positions.angle));this.controls?.update();this.render();}
 setEnvironment(value){
  if(!['airport','studio'].includes(value))return;
  this.environment=value;this.studioGround.visible=true;
  this.studioGround.material.opacity=value==='airport'?.11:.17;
  this.studioGround.material.color.set(value==='airport'?'#443020':'#6b7c72');this.contactShadow.visible=value==='airport';
  this.scene.background=value==='airport'&&this.airportBackdrop?this.airportBackdrop:new THREE.Color(this.studioBackground);
  this.scene.fog=null;
  this.scene.environmentIntensity=value==='airport'?.7:1;
  this.keyLight.intensity=value==='airport'?1.8:2.8;this.fillLight.intensity=value==='airport'?.75:1.3;this.hemisphere.intensity=value==='airport'?.85:1.3;
  if(value==='airport')fitBackdrop(this.airportBackdrop,this.container.clientWidth||1,this.container.clientHeight||1);
  this.renderer.domElement.dataset.environment=value;this.renderer.domElement.setAttribute('aria-label',value==='airport'?'Rotatable animated Totem stand in a concept airport lounge':'Rotatable animated Totem stand in a studio');
  this.render();
 }
 rotate(degrees){const a=degrees*Math.PI/180,r=4.7;this.camera.position.set(Math.sin(a)*r,1.6,Math.cos(a)*r);this.controls.update();this.render();}
 async setArtwork(src){
  if(src===this.source)return;const version=++this.loadVersion;
  if(!src){this.artwork?.dispose();this.artwork=null;this.source=null;this.build();return;}
  const image=new Image();image.src=src;try{await image.decode();}catch(error){if(version!==this.loadVersion)return;throw error;}if(version!==this.loadVersion)return;
  const texture=paperTexture(image,A5);texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.artwork?.dispose();this.artwork=texture;this.source=src;this.build();
 }
 select(facing){if(!validFacing(facing))return;this.selection={...facing};this.build();}
 setFinish(value){this.finish=value;this.build();}
 setWireframe(value){this.wireframe=value;this.build();}
 build(){
  if(this.group){this.scene.remove(this.group);disposeGroup(this.group);}const group=new THREE.Group();this.group=group;this.pickables=[];this.scene.add(group);const c=this.config;
  const metal=new THREE.MeshStandardMaterial({color:this.finish==='graphite'?'#414a50':'#afb6ba',metalness:.82,roughness:.29,wireframe:this.wireframe});
  const plinth=new THREE.MeshStandardMaterial({color:this.finish==='graphite'?'#3a4247':'#aab3b8',metalness:.6,roughness:.39,wireframe:this.wireframe});
  const black=new THREE.MeshPhysicalMaterial({color:'#151b20',metalness:.25,roughness:.24,clearcoat:.7,wireframe:this.wireframe});
  const rubber=new THREE.MeshStandardMaterial({color:'#242a2b',roughness:.9});
  const glass=new THREE.MeshPhysicalMaterial({color:'#edf7fa',metalness:0,roughness:.1,transparent:true,opacity:.18,transmission:0,thickness:.004,ior:1.49,depthWrite:false,side:THREE.DoubleSide,wireframe:this.wireframe});
  const box=(w,h,d,x,y,z,material,parent=group,rounded=false)=>{const geometry=rounded?new RoundedBoxGeometry(w,h,d,3,Math.min(.008,d/3)):new THREE.BoxGeometry(w,h,d);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  box(c.width,.065,c.baseDepth,0,.048,0,plinth,group,true);box(c.width-.08,.015,.40,0,.087,0,metal,group,true);
  for(const x of [-(c.width/2-.06),c.width/2-.06])for(const z of [-.18,.18])box(.055,.025,.055,x,.013,z,rubber,group,true);
  // Open aluminium rack and rear screen support, interpreted from the photo.
  for(const x of [-(c.rackWidth/2-.016),c.rackWidth/2-.016])box(.032,1.23,.038,x,.70,-.055,metal);
  box(c.rackWidth,.032,.038,0,1.30,-.055,metal);box(c.rackWidth,.032,.038,0,.13,.15,metal);
  for(const x of [-.17,.17])box(.032,1.97,.045,x,1.06,-.16,metal);
  box(.47,.045,.04,0,1.62,-.16,metal);
  const frameY=c.height-c.screenHeight/2;
  box(c.screenWidth,c.screenHeight,.065,0,frameY,-.12,black,group,true);
  const screenTex=this.screenVideo?.readyState>=2&&(this.screenEnabled||this.screenVideo.currentTime>.1)?this.screenVideoTexture:this.screenPoster,screenMat=new THREE.MeshBasicMaterial({map:screenTex,toneMapped:false});screenMat.userData.sharedArtwork=true;this.screenMaterial=screenMat;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(c.screenWidth-.055,c.screenHeight-.065),screenMat);screen.position.set(0,frameY,-.086);group.add(screen);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.0025,8,8),new THREE.MeshBasicMaterial({color:'#88bddd'}));led.position.set(c.screenWidth/2-.026,frameY-c.screenHeight/2+.019,-.085);group.add(led);
  let row=0;
  for(const [shelf,y] of Object.entries(c.shelfHeights)){
   const tray=new THREE.Group();tray.position.set(0,y,.085);tray.rotation.x=-c.shelfTilt;group.add(tray);
   box(c.rackWidth-.04,.016,.13,0,-.15,.055,metal,tray);
   box(c.rackWidth-.04,.31,.005,0,0,-.009,glass,tray);
   box(c.rackWidth-.04,.045,.005,0,-.113,.09,glass,tray);
   for(const x of [-(c.rackWidth/2-.02),c.rackWidth/2-.02])box(.005,.17,.10,x,-.062,.04,glass,tray);
   for(let holder=0;holder<c.holdersPerShelf;holder++){
    const x=columnX(holder),active=this.selection.shelf===shelf&&this.selection.holder===holder;
    const magazine=this.magazines.find(m=>m.shelf===shelf&&m.holder===holder),editable=holder===2||holder===3;
    const leafletIndex=['top','middle','bottom'].indexOf(shelf)*2+holder-2;
    const texture=magazine?.texture||(active&&this.artwork?this.artwork:(editable?this.leafletTextures?.[leafletIndex]:null)),size=magazine?A4:A5;
    if(texture){
     const {width:w,height:h}=size;
     const paper=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide});paper.userData.sharedArtwork=true;
     const backing=new THREE.MeshStandardMaterial({color:'#f7f5ef',roughness:.95});
     for(let layer=0;layer<3;layer++)box(w,h,.0018,x+.0008*layer,-.142+h/2,.004+layer*.002,backing,tray);
     const print=new THREE.Mesh(new THREE.PlaneGeometry(w,h),paper);print.position.set(x,-.142+h/2,.014);print.castShadow=true;tray.add(print);
    }
    if(editable){
     const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(A5.width+.012,A5.height+.012,.006)),new THREE.LineBasicMaterial({color:active?'#78ac97':'#c2d3ce',transparent:true,opacity:active?.95:.35}));outline.position.set(x,-.142+A5.height/2,.021);tray.add(outline);
     const pick=new THREE.Mesh(new THREE.PlaneGeometry(A5.width+.012,.295),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));pick.position.set(x,0,.025);pick.userData.facing={shelf,holder};tray.add(pick);this.pickables.push(pick);
    }
    if(holder<5)box(.003,.075,.08,x+COLUMN_WIDTHS[holder]/2+.006,-.11,.05,glass,tray);
   }row++;
  }
  Object.assign(this.renderer.domElement.dataset,{magazines:String(this.magazines.length),editableSlots:'6',artworkSlot:this.artwork?this.selection.shelf+'-'+this.selection.holder:'',selectedSlot:this.selection.shelf+'-'+this.selection.holder});
  this.render();
 }
 render(){if(this.renderer&&this.scene&&this.camera){if(this.controls)this.renderer.domElement.dataset.tiltDegrees=String(90-this.controls.getPolarAngle()*180/Math.PI);this.renderer.render(this.scene,this.camera);}}
 screenStatus(){this.container.dispatchEvent(new CustomEvent('stand-video',{detail:{playing:!!this.screenVideo&&!this.screenVideo.paused,error:!!this.screenVideo?.error}}));}
 setScreenPlaying(enabled){this.screenEnabled=enabled;if(enabled&&this.running)this.screenVideo?.play().catch(()=>this.screenStatus());else this.screenVideo?.pause();this.screenStatus();}
 start(){if(this.running)return;this.running=true;if(this.screenEnabled)this.screenVideo?.play().catch(()=>this.screenStatus());const tick=()=>{if(!this.running)return;this.controls.autoRotate=this.autoRotate;this.controls.update();this.render();this.frame=requestAnimationFrame(tick);};tick();}
 stop(){this.running=false;cancelAnimationFrame(this.frame);this.screenVideo?.pause();}
 snapshot(){this.controls.autoRotate=false;this.controls.update();this.render();return this.renderer.domElement.toDataURL('image/png');}
 dispose(){this.stop();if(this.screenVideo){this.screenVideo.removeAttribute('src');this.screenVideo.load();this.screenVideo.remove();}this.screenVideoTexture?.dispose();this.screenPoster.dispose();this.resizeObserver.disconnect();this.controls.dispose();if(this.group)disposeGroup(this.group);this.contactTexture.dispose();this.contactShadow.geometry.dispose();this.contactShadow.material.dispose();this.studioGround.geometry.dispose();this.studioGround.material.dispose();this.artwork?.dispose();this.magazines.forEach(m=>m.texture.dispose());this.env.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}

let thumbnailViewPromise;
export async function renderStandImage(slot,artwork){
 if(!thumbnailViewPromise){const host=document.createElement('div');host.className='stand-thumbnail-renderer';Object.assign(host.style,{position:'fixed',left:'-10000px',top:'0',width:'240px',height:'340px',pointerEvents:'none'});document.body.append(host);thumbnailViewPromise=StandView.create(host,{interactive:false,background:'#ffffff'});}
 const view=await thumbnailViewPromise;view.select(facingForSlot(slot));await view.setArtwork(artwork);view.preset('angle');return view.snapshot();
}
