import {COVER_TITLES,EDITABLE_SLOTS,validFacing,facingForSlot} from './stand-layout.mjs';
const $=s=>document.querySelector(s);
const shelfLabel=s=>s[0].toUpperCase()+s.slice(1);

export function setupStandStudio({venues,getArtwork,getArtworkName,onUpload,onRemove,onUseSample,beforeOpen=()=>{}}){
 let view,loading,venue=venues[0],selection={shelf:'top',holder:2};
 const section=$('#stand-studio');let inView=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 $('#studio-venue').replaceChildren(...venues.map(v=>{const o=document.createElement('option');o.value=v.id;o.textContent=v.name+' · '+v.city;return o;}));
 function renderControls(){
  $('#studio-venue').value=venue.id;
  if(!$('#studio-holders').children.length)$('#studio-holders').replaceChildren(...EDITABLE_SLOTS.map(slot=>{const b=document.createElement('button');b.type='button';b.textContent=shelfLabel(slot.shelf)+' '+(slot.holder===2?'left':'right');b.onclick=()=>choose(slot);return b;}));
  [...$('#studio-holders').children].forEach((b,i)=>{const slot=EDITABLE_SLOTS[i],active=slot.shelf===selection.shelf&&slot.holder===selection.holder;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#studio-selection').textContent=shelfLabel(selection.shelf)+' shelf · '+(selection.holder===2?'Left':'Right')+' A5 slot'+(getArtwork()?' · Artwork placed':' · Empty');
  $('#studio-art-name').textContent=getArtworkName()||'No artwork uploaded';$('#studio-remove-art').hidden=!getArtwork();
  $('.studio-sample p').textContent='Front cover · October 2026. Optional A5 sample.';
 }
 function choose(next){if(!validFacing(next))return;selection={...next};view?.select(selection);renderControls();}
 function updateSpin(){const spinning=!!view?.autoRotate;$('#stand-spin').textContent=spinning?'Pause spin':'Spin 360°';$('#stand-spin').setAttribute('aria-pressed',String(spinning));if(spinning)document.querySelectorAll('[data-stand-view]').forEach(b=>b.classList.remove('active'));}
 async function ensureView(){
  if(!loading)loading=import('./stand-3d.mjs').then(m=>m.StandView.create($('#stand-viewport'),{onSelect:choose})).then(v=>{view=v;$('#stand-viewport').addEventListener('stand-video',e=>{const button=$('#stand-video-toggle');button.textContent=e.detail.error?'Screen video unavailable':e.detail.playing?'Pause screen video':'Play screen video';button.disabled=e.detail.error;button.setAttribute('aria-pressed',String(e.detail.playing));});$('#stand-video-toggle').textContent=reduced?'Play screen video':'Pause screen video';$('#stand-video-toggle').setAttribute('aria-pressed',String(!reduced));$('#stand-loading').hidden=true;$('#stand-viewport').dataset.ready='true';$('#stand-viewport').addEventListener('stand-interaction',updateSpin);$('#stand-viewport').addEventListener('stand-angle',e=>$('#studio-angle').value=e.detail);return v;}).catch(()=>{$('#stand-loading').textContent='3D is unavailable in this browser. Your artwork and campaign plan are still usable.';$('#stand-viewport').dataset.ready='unavailable';return null;});
  return loading;
 }
 async function open(context={}){
  const disclosure=section.closest('details');if(disclosure)disclosure.open=true;
  beforeOpen();venue=venues.find(v=>v.id===context.venueId)||venue;
  selection=context.slot?facingForSlot(context.slot):selection;
  renderControls();section.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});section.focus({preventScroll:true});
  const renderer=await ensureView();if(!renderer)return;
  renderer.select(selection);renderer.setFinish($('#studio-finish').value);renderer.setWireframe($('#studio-wireframe').checked);await renderer.setArtwork(getArtwork());renderer.resize();if(inView&&!document.hidden)renderer.start();
 }
 async function refreshArtwork(){renderControls();if(view){try{await view.setArtwork(getArtwork());}catch{$('#studio-art-name').textContent='The 3D image could not be updated. Try uploading it again.';}}}
 $('#open-stand').onclick=()=>open();$('#close-stand').onclick=()=>{if(view){view.autoRotate=false;view.stop();updateSpin();}(document.querySelector('#match-results:not([hidden])')||$('#planner')).scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
 const observer=new IntersectionObserver(async entries=>{
  inView=entries[0].isIntersecting;section.dataset.visible=String(inView);
  if(!inView){view?.stop();return;}
  const renderer=await ensureView();if(!renderer)return;renderer.select(selection);await refreshArtwork();renderer.resize();if(inView&&!document.hidden)renderer.start();
 },{threshold:.02});observer.observe($('#stand-viewport'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)view?.stop();else if(inView)view?.start();});
 $('#studio-venue').onchange=e=>{venue=venues.find(v=>v.id===e.target.value);renderControls();};
 $('#studio-use-sample').onclick=onUseSample;
 $('#studio-magazines').replaceChildren(...COVER_TITLES.map(m=>{const a=document.createElement('a');a.href=m.source;a.target='_blank';a.rel='noopener noreferrer';const img=document.createElement('img');img.src=m.src;img.alt=m.title+' · '+m.issue;const text=document.createElement('span');text.textContent=m.title+' · '+m.issue;a.append(img,text);return a;}));
 $('#studio-artwork').onchange=onUpload;$('#studio-remove-art').onclick=onRemove;
 $('#studio-finish').onchange=e=>view?.setFinish(e.target.value);$('#studio-wireframe').onchange=e=>view?.setWireframe(e.target.checked);
 $('#studio-angle').oninput=e=>{if(!view)return;view.autoRotate=false;view.rotate(Number(e.target.value));updateSpin();document.querySelectorAll('[data-stand-view]').forEach(b=>b.classList.remove('active'));};
 document.querySelectorAll('[data-stand-environment]').forEach(button=>button.onclick=async()=>{const renderer=await ensureView();if(!renderer)return;renderer.setEnvironment(button.dataset.standEnvironment);document.querySelectorAll('[data-stand-environment]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#studio-setting-label').textContent=button.dataset.standEnvironment==='airport'?'In a premium airport lounge':'Studio view';});
 $('#stand-video-toggle').onclick=()=>{if(view)view.setScreenPlaying(!view.screenEnabled);};
 $('#stand-spin').onclick=()=>{if(!view)return;view.autoRotate=!view.autoRotate;updateSpin();};
 document.querySelectorAll('[data-stand-view]').forEach(b=>b.onclick=()=>{if(!view)return;view.autoRotate=false;view.preset(b.dataset.standView);document.querySelectorAll('[data-stand-view]').forEach(other=>other.classList.toggle('active',other===b));updateSpin();});
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-open-stand]');if(!trigger)return;const v=venues.find(v=>v.id===trigger.dataset.openStand);if(!v)return;open({venueId:v.id,slot:v.facings.find(s=>s.id===trigger.dataset.standSlot)});});
 renderControls();return {open,refreshArtwork};
}
