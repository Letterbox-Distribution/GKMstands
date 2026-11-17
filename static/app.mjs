import {venuePhotoMarkup} from './venue-photos.mjs';
import {CAMPAIGN_TYPES,recommendation,suggestSlots} from './recommendations.mjs';
import {MAGAZINES,facingForSlot} from './stand-layout.mjs';
import {createDemoLocations} from './demo-locations.mjs';
import {locationProfileMarkup} from './location-profile.mjs';
import {setupStandStudio} from './stand-studio.mjs';
import {cheapest,money,evaluate,totalPence,addition} from './core.mjs';
const $=s=>document.querySelector(s);
const {venues,osKey}=JSON.parse($('#initial-data').textContent);
const audiences=['Office professionals','Commuters','Travellers','Students','Leisure visitors'];
const cities={'London':[51.52,-.12],'Birmingham':[52.478,-1.907],'Manchester':[53.477,-2.242]};
const demoLocations=createDemoLocations(cities);
const state={media:'',audiences:[],descriptor:'',budget:null,weeks:1,city:'',cities:Object.keys(cities),bounds:null,start:'',lines:[],focused:null,slot:null,art:null,rotation:-18};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// One top-layer menu at a time, aligned to its trigger and viewport.
const menus=[...document.querySelectorAll('.audience-menu,.advanced')];
function closeMenus(restoreFocus=false){
 for(const menu of menus){
  if(!menu.open)continue;
  const panel=menu.querySelector('.audience-field,.advanced-fields');
  if(panel.matches(':popover-open'))panel.hidePopover();
  menu.open=false;
  if(restoreFocus)menu.querySelector('summary').focus({preventScroll:true});
 }
}
function positionMenu(menu){
 if(!menu.open)return;
 const panel=menu.querySelector('.audience-field,.advanced-fields');
 const anchor=menu.querySelector('summary').getBoundingClientRect();
 if(anchor.bottom<0||anchor.top>innerHeight){closeMenus();return;}
 const gutter=12,gap=9,width=Math.min(menu.classList.contains('audience-menu')?290:330,innerWidth-gutter*2);
 panel.style.width=width+'px';
 const dock=$('.summary').getBoundingClientRect();
 const bottomEdge=Math.min(innerHeight-gutter,dock.top-gap);
 const below=bottomEdge-anchor.bottom-gap,above=anchor.top-gap-gutter;
 const limit=Math.max(120,Math.min(460,Math.max(below,above)));
 panel.style.maxHeight=limit+'px';
 const height=Math.min(panel.scrollHeight,limit);
 const top=below>=height||below>=above?anchor.bottom+gap:anchor.top-height-gap;
 panel.style.left=Math.max(gutter,Math.min(anchor.left,innerWidth-width-gutter))+'px';
 panel.style.top=Math.max(gutter,Math.min(top,bottomEdge-height))+'px';
}
for(const menu of menus){
 const panel=menu.querySelector('.audience-field,.advanced-fields');
 panel.setAttribute('popover','manual');panel.classList.add('menu-popover');
 const actions=document.createElement('div');actions.className='menu-actions';
 const hint=document.createElement('span');hint.textContent=menu.classList.contains('audience-menu')?'Choose any that apply':'Changes apply as you go';
 const done=document.createElement('button');done.type='button';done.className='menu-done';done.textContent='Done';done.onclick=()=>closeMenus(true);
 actions.append(hint,done);panel.append(actions);
 menu.addEventListener('toggle',()=>{
  if(menu.open){
   for(const other of menus)if(other!==menu&&other.open){other.querySelector('.menu-popover').hidePopover();other.open=false;}
   panel.showPopover();positionMenu(menu);
  }else if(panel.matches(':popover-open'))panel.hidePopover();
 });
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.audience-menu,.advanced,.menu-popover'))closeMenus();},true);
document.addEventListener('focusin',e=>{if(!e.target.closest('.audience-menu,.advanced,.menu-popover'))closeMenus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menus.some(m=>m.open)){e.preventDefault();closeMenus(true);}});
window.addEventListener('resize',()=>closeMenus());
window.addEventListener('scroll',()=>menus.forEach(positionMenu),{passive:true});
const plural=(n,s)=>`${n} ${s}${n===1?'':s==='match'?'es':'s'}`;
let map,markers=[],tiles,noticeTimer,artToken=0,mapProfile=null,activeLocationTooltip;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function mapPadding(){return matchMedia('(max-width: 760px)').matches?{paddingTopLeft:[35,85],paddingBottomRight:[35,180]}:{paddingTopLeft:[65,90],paddingBottomRight:[385,75]};}
const mobileLayout=matchMedia('(max-width: 760px)');
function setResults(open){
 $('.results').classList.toggle('is-open',open);
 $('.results').classList.toggle('is-collapsed',!open);
 $('#toggle-results').textContent=open?'Hide venues':'Show venues';
 $('#toggle-results').setAttribute('aria-expanded',String(open));
}
setResults(!mobileLayout.matches);
mobileLayout.addEventListener('change',()=>setResults(!mobileLayout.matches));
$('#toggle-results').onclick=()=>setResults($('#toggle-results').getAttribute('aria-expanded')!=='true');
$('#toggle-campaign').onclick=()=>{closeMenus();
 const open=$('.campaign-controls').classList.toggle('is-open');
 $('#toggle-campaign').setAttribute('aria-expanded',String(open));
 $('#toggle-campaign').textContent=open?'Done':'Edit brief';
};


function notify(s){
 const close=document.createElement('button');close.type='button';close.className='notice-close';close.setAttribute('aria-label','Dismiss notification');close.textContent='\u00d7';close.onclick=()=>$('#notice').style.display='none';
 const message=document.createElement('span');message.textContent=s;
 $('#notice').replaceChildren(message,close);$('#notice').style.display='flex';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').style.display='none',6000);
}
$('#notice').addEventListener('focusin',()=>clearTimeout(noticeTimer));
$('#notice').addEventListener('pointerenter',()=>clearTimeout(noticeTimer));
$('#audience-options').innerHTML=audiences.map(a=>`<label class="chip"><input type="checkbox" value="${a}"><span>${a}</span></label>`).join('');
$('#city-tabs').innerHTML=`<button type="button" data-city="" class="active">All cities <span>${demoLocations.length}</span></button>`+Object.keys(cities).map(c=>`<button type="button" data-city="${c}">${c} <span>50</span><b aria-hidden="true">&#10003;</b></button>`).join('');
function inArea(v){return state.cities.includes(v.city)&&(!state.city||v.city===state.city)&&(!state.bounds||(v.lat>=state.bounds.south&&v.lat<=state.bounds.north&&v.lng>=state.bounds.west&&v.lng<=state.bounds.east));}
function locationNumber(location,example=false){return example?venues.length+demoLocations.findIndex(v=>v.id===location.id)+1:venues.findIndex(v=>v.id===location.id)+1;}
function chosen(v){return state.lines.filter(l=>l.venue.id===v.id);}
function reason(v){const e=evaluate(v,state);return e.match?`${state.audiences.length?v.audiences.filter(a=>state.audiences.includes(a)).join(' · '):'Matches current filters'} · from ${money(cheapest(v))}/week`:e.reasons.join(' · ');}
function render(){syncGuide();renderSuggestions();renderResults();renderMarkers();renderSummary();if(mapProfile)renderMapProfile();if(state.focused)renderDetail();renderOrder();void studio.refreshArtwork();}
function renderMapProfile(){
 if(!mapProfile)return;
 const location=(mapProfile.example?demoLocations:venues).find(v=>v.id===mapProfile.id);if(!location)return;
 const panel=$('#map-location-profile');panel.hidden=false;$('.results').classList.add('is-inspecting');
 panel.innerHTML=locationProfileMarkup(location,{example:mapProfile.example,price:mapProfile.example?'':money(cheapest(location)),included:state.cities.includes(location.city),number:locationNumber(location,mapProfile.example)});
 panel.querySelector('[data-profile-back]').onclick=()=>closeMapProfile(true);
 const browse=panel.querySelector('[data-profile-browse]');if(browse)browse.onclick=()=>{closeMapProfile();switchCity(location.city);setResults(true);};
}
function openMapProfile(location,example=false){
 closeMenus();mapProfile={id:location.id,example};setResults(true);renderMapProfile();renderMarkers();
 $('#map-location-announcement').textContent=location.name+' selected. '+location.type+'. '+(example?'Illustrative profile, not bookable.':'Planning venue profile.');
 $('#map-location-profile').querySelector('[data-profile-back]').focus({preventScroll:true});
 if(map){if(map.getZoom()<10)map.flyTo([location.lat,location.lng],12,{animate:!reduced,duration:.7});else map.panInside([location.lat,location.lng],mapPadding());}
}
function closeMapProfile(restoreFocus=false){
 const previous=mapProfile;mapProfile=null;$('#map-location-profile').hidden=true;$('.results').classList.remove('is-inspecting');renderMarkers();
 if(restoreFocus&&previous)document.querySelector('[data-location-id="'+CSS.escape(previous.id)+'"]')?.focus({preventScroll:true});
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&mapProfile){e.preventDefault();closeMapProfile(true);}});
function setFlowStep(step){document.querySelectorAll('[data-flow-step]').forEach(item=>{if(Number(item.dataset.flowStep)===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});}
function focusCampaign(){(document.querySelector('[data-campaign-choice][aria-pressed="true"]')||document.querySelector('[data-campaign-choice]')||$('#campaign-type')).focus({preventScroll:true});}
function syncGuide(){
 document.querySelectorAll('[data-campaign-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.campaignChoice===state.media)));
 const ready=!!state.media;$('.campaign-controls').classList.toggle('has-campaign',ready);$('#show-matches').disabled=!ready||!state.cities.length;
 $('#brief-next-hint').textContent=!ready?'Choose what you are promoting to begin. Not sure? Choose the last option.':!state.cities.length?'Choose at least one city to continue.':'We suggested an audience. Adjust it, set an optional budget, then see your locations.';
 $('#nav-review').hidden=!state.lines.length;
 if(!ready){$('#match-results').hidden=true;$('#show-matches').setAttribute('aria-expanded','false');setFlowStep(1);}
}
let mapLibrary;
function loadMapLibrary(){if(window.L)return Promise.resolve();if(!mapLibrary)mapLibrary=new Promise(resolve=>{for(const name of ['leaflet.css','os-api-branding.css']){const link=document.createElement('link');link.rel='stylesheet';link.href='/static/vendor/'+name;document.head.append(link);}const script=document.createElement('script');script.src='/static/vendor/leaflet.js';script.onload=resolve;script.onerror=resolve;document.head.append(script);});return mapLibrary;}
async function showMatches(){
 if(!state.media){focusCampaign();return;}if(!state.cities.length){document.querySelector('.brief-cities button').focus();return;}
 closeMenus();$('#match-results').hidden=false;$('#show-matches').setAttribute('aria-expanded','true');render();setFlowStep(2);
 if(!map){await loadMapLibrary();initMap();}else{map.invalidateSize();map.fitBounds(venues.filter(v=>state.cities.includes(v.city)).map(v=>[v.lat,v.lng]).length?venues.filter(v=>state.cities.includes(v.city)).map(v=>[v.lat,v.lng]):venues.map(v=>[v.lat,v.lng]),{...mapPadding(),animate:false});}
 $('#match-results').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});$('#match-results').focus({preventScroll:true});
}
document.querySelectorAll('[data-start-guide]').forEach(link=>link.onclick=e=>{e.preventDefault();$('#planner').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});focusCampaign();});
document.querySelectorAll('a[href="#stand-studio"]').forEach(link=>link.onclick=e=>{e.preventDefault();void studio.open();});
function renderSuggestions(){
 const suggestions=suggestSlots(venues,state),total=suggestions.reduce((sum,s)=>sum+s.cost,0),guided=!!state.media||state.audiences.length||state.budget!==null;
 const target=$('#suggested-plan');
 target.innerHTML=guided?`<div class="suggestion-heading"><div><span>YOUR SUGGESTED STARTING PLAN</span><h3>${suggestions.length?plural(suggestions.length,'slot')+' for '+money(total):state.lines.length?'Your starting plan is selected.':'Let’s adjust your brief.'}</h3><p>${suggestions.length?'For '+plural(state.weeks,'week')+'. Based on setting, audience tags and remaining budget.':state.lines.length?'Your selected placements are saved in this plan. Review your slots, or adjust your brief to explore more options.':'No priced placements fit this brief. Try a broader audience, another city or a different budget.'}</p></div>${suggestions.length?'<button type="button" id="add-suggested">Add these slots &rarr;</button>':''}</div>${suggestions.length?'<ul>'+suggestions.map(item=>'<li><strong>'+esc(item.venue.name)+'</strong><span>'+esc(item.venue.city)+' &middot; '+esc(item.reason)+'</span><b>'+money(item.cost)+'</b></li>').join('')+'</ul>':''}`:'<div class="suggestion-intro"><strong>A few details. A more considered placement.</strong><span>1. Choose your campaign &nbsp; 2. Refine your audience and spend &nbsp; 3. Add suggested slots</span></div>';
 const button=$('#add-suggested');if(button)button.onclick=()=>{for(const suggestion of suggestions)addPlacement(suggestion.venue,suggestion.slot);openOrder();};
}

function renderResults(){
 let list=venues.filter(inArea);const mode=$('#sort').value;
 list.sort((a,b)=>Number(evaluate(b,state).match)-Number(evaluate(a,state).match)||(mode==='match'?recommendation(b,state).score-recommendation(a,state).score:0)||(mode==='footfall'?(b.weekly_footfall??-1)-(a.weekly_footfall??-1):cheapest(a)-cheapest(b)));
 const matches=list.filter(v=>evaluate(v,state).match).length;
 $('#result-count').textContent=`${plural(matches,'match')} · ${plural(list.length,'venue')} in this area`;
 $('#venue-list').innerHTML=list.length?list.map(v=>`<article class="venue-row ${chosen(v).length?'is-selected ':''}${state.focused===v.id?'focused':''}" id="row-${v.id}">${chosen(v).length?`<div class="venue-status"><span class="venue-selection-badge"><span class="venue-selected-tick" aria-hidden="true">&#10003;</span>${chosen(v).length} selected</span></div>`:''}${venuePhotoMarkup(v.type,true)}<div class="row-main"><button class="venue-focus" data-focus="${v.id}" aria-label="View ${esc(v.name)} details"><strong><span class="venue-number">${locationNumber(v)}</span> ${esc(v.name)}</strong><span>${esc(v.area)}, ${v.city} · ${v.type}</span></button><div class="venue-price">From <strong>${money(cheapest(v))}</strong><br>/ week</div></div><p class="venue-meta">${v.weekly_footfall?`${v.weekly_footfall.toLocaleString('en-GB')} weekly venue visits · illustrative · ${v.footfall_date}`:'Weekly footfall unavailable'}</p><div class="row-bottom"><p class="match-reason ${evaluate(v,state).match?'':'no-match'}">${evaluate(v,state).match?'● Match · ':'○ Not a match · '}${esc(evaluate(v,state).match ? (state.audiences.length ? v.audiences.filter(a=>state.audiences.includes(a)).join(' / ') : 'Fits your brief') : reason(v))}</p><button class="select-button" data-select="${v.id}">Select position</button></div></article>`).join(''):'<p class="empty">No venues in this map area. Clear the map area or change city to explore the demo inventory.</p>';
 if(list.length&&!matches)$('#venue-list').insertAdjacentHTML('afterbegin','<p class="empty">No matches for this brief. Other venues remain available below so you can inspect the reasons.</p>');
 $('#area-note').textContent=state.bounds?'Results within searched map area':state.cities.length===3?`All cities included · ${venues.length} demo venues`:state.cities.length?`${state.cities.join(' + ')} included · ${venues.filter(inArea).length} demo venues`:'No cities included · choose a city above';
 $('#reset-area').hidden=!state.bounds;
 document.querySelectorAll('[data-city]').forEach(b=>{const active=b.dataset.city?state.cities.includes(b.dataset.city):state.cities.length===3;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.title=b.dataset.city?`${active?'Exclude':'Include'} ${b.dataset.city}: ${venues.filter(v=>v.city===b.dataset.city).length} demo venues`:'Include all cities';});
}
function focusVenue(id,select=false,pan=true){if(mapProfile)closeMapProfile();setResults(true);state.focused=id;const v=venues.find(v=>v.id===id);state.slot=v.facings.reduce((a,b)=>a.weekly_pence<b.weekly_pence?a:b).id;render();if(map&&pan){map.setView([v.lat,v.lng],14,{animate:!reduced});}if(select){$('#detail').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});$('#slot').focus({preventScroll:true});}else {document.getElementById('row-'+id)?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'});}}
function stand(v,slot,small=false){
 const facing=facingForSlot(slot);
 return `<div class="stand-scene ${small?'small':''}" role="img" aria-label="Stand preview with 12 fixed A4 magazines and six central A5 slots"><div class="stand-model" style="--rotation:${state.rotation}deg"><div class="stand-base"></div><div class="stand-back"></div><div class="stand-screen">PORTRAIT<br>SCREEN</div>${['top','middle','bottom'].map(shelf=>`<div class="stand-shelf ${shelf}">${[0,1,2,3,4,5].map(holder=>{const magazine=MAGAZINES.find(m=>m.shelf===shelf&&m.holder===holder),active=shelf===facing.shelf&&holder===facing.holder;return `<div class="holder ${active?'active':''} ${magazine?'fixed-magazine':'a5-pocket'}" data-facing="${shelf}-${holder}">${magazine?`<img src="/static/magazines/preview/${magazine.file}.webp" loading="lazy" alt="${esc(magazine.title)} cover">`:active&&state.art?`<img src="${state.art}" alt="Campaign artwork" draggable="false">`:''}</div>`;}).join('')}</div>`).join('')}</div></div>`;
}
function renderDetail(){
 const v=venues.find(v=>v.id===state.focused);if(!v)return;
 const slot=v.facings.find(s=>s.id===state.slot)||v.facings[0];state.slot=slot.id;
 $('#detail').hidden=false;
 $('#detail').innerHTML=`<div><span class="demo-label">Placement detail · illustrative venue</span><h2>${esc(v.name)}</h2><p>${v.city} / ${v.area} · ${v.type}</p><p class="${evaluate(v,state).match?'':'muted'}">${esc(reason(v))}</p><p>Audience: ${esc(v.audiences?.join(', ')||'Audience data unavailable')}<br>Descriptors: ${esc(v.descriptors?.join(', ')||'Audience descriptor data unavailable')}</p><p>${esc(v.audience_source)}. ${esc(v.provenance)}.</p><div class="detail-slots"><label>Offered position<select id="slot">${v.facings.map(s=>`<option value="${s.id}" ${s.id===slot.id?'selected':''}>${s.label} — ${money(s.weekly_pence)}/week</option>`).join('')}</select></label><button class="button primary" id="add-placement">Add placement</button></div><p>${money(slot.weekly_pence*state.weeks)} for ${plural(state.weeks,'week')} · Stand ${esc(v.stand_id)}</p><div id="detail-selected">${chosen(v).map(l=>`<p>✓ ${esc(l.slot.label)} <button class="text-button" data-remove="${l.key}">Remove</button></p>`).join('')}</div></div><div class="location-detail-photo">${venuePhotoMarkup(v.type)}</div>`;
 $('#slot').onchange=e=>{state.slot=e.target.value;renderDetail();$('#slot').focus();};

 $('#add-placement').onclick=()=>addPlacement(v,slot);
}
function addPlacement(v,slot){
 const check=addition(state.lines,v,slot,state);if(!check.ok){notify(check.reason);return;}
 state.lines.push({key:`${v.id}__${v.stand_id}__${slot.id}`,venue:v,slot});render();
 notify(`${v.name} added to your plan.${check.overBudget?` Your plan is ${money(check.overBudget)} over budget.`:''}`);
}
function removeLine(key){state.lines=state.lines.filter(l=>l.key!==key);render();}
function renderSummary(){
 syncSummaryVisibility();
 $('#audience-summary').textContent=state.audiences.length===0?'All audiences':state.audiences.length===1?state.audiences[0]:`${state.audiences.length} audiences selected`;
 $('.stepper>span').textContent=state.weeks===1?'week':'weeks';
 const total=totalPence(state.lines,state.weeks);$('#item-count').textContent=`${plural(state.lines.length,'placement')} selected`;$('#nav-count').textContent=state.lines.length;$('#duration-summary').textContent=plural(state.weeks,'week');$('#total').textContent=money(total);
 const remaining=state.budget===null?null:state.budget-total;
 $('#remaining').textContent=remaining===null?'Placement estimate - no other charges':remaining>=0?`${money(remaining)} budget remaining`:`${money(-remaining)} over budget`;
 $('#remaining').classList.toggle('over-budget',remaining!==null&&remaining<0);$('.summary').classList.toggle('is-over-budget',remaining!==null&&remaining<0);
}
function dateText(){if(!state.start)return `${plural(state.weeks,'week')} · Proposed start not set`;const [y,m,d]=state.start.split('-').map(Number);const start=new Date(y,m-1,d);const end=new Date(y,m-1,d+state.weeks*7-1);const fmt=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});return `${fmt(start)} – ${fmt(end)} · ${plural(state.weeks,'week')} · Proposed dates only`;}
function renderOrder(){
 $('#order-dates').textContent=dateText();$('#art-name').textContent=state.art?state.artName:'No artwork uploaded';$('#remove-art').hidden=!state.art;
 $('#order-lines').innerHTML=state.lines.length?state.lines.map(l=>`<article class="order-line" data-line-key="${esc(l.key)}"><div><h3>${esc(l.venue.name)}</h3><p>${l.venue.city} · ${l.venue.area}</p>${document.body.classList.contains("showcase-enabled")?`<p>Position: <strong>${l.slot.label}</strong></p>`:`<p><strong>${l.slot.label}</strong> · ${esc(l.venue.stand_id)}</p>`}<p>${money(l.slot.weekly_pence)}/week × ${plural(state.weeks,'week')}</p><p class="stand-caption">${l.venue.stand_model} · Shared stand visualisation</p></div>${stand(l.venue,l.slot,true)}<div class="line-price"><strong>${money(l.slot.weekly_pence*state.weeks)}</strong><button class="text-button" data-remove="${l.key}" aria-label="Remove ${esc(l.venue.name)} ${l.slot.label}">Remove placement</button></div></article>`).join(''):'<p class="empty">Your plan is empty. Return to the map and choose a venue position to start your campaign.</p>';
 const total=totalPence(state.lines,state.weeks);$('#order-total').textContent=money(total);const remaining=state.budget===null?null:state.budget-total;
 $('#order-budget').textContent=remaining===null?'No campaign budget set.':remaining>=0?`${money(remaining)} remaining from your ${money(state.budget)} budget.`:`${money(-remaining)} over budget. You can keep these placements or adjust your plan.`;
 $('#order-budget').classList.toggle('over-budget',remaining!==null&&remaining<0);
 void refreshOrderRenders();
}
let orderRenderVersion=0,detailRenderVersion=0,renderQueue=Promise.resolve(),cachedArt,standImages=new Map();
async function standImageFor(slot,artwork){
 if(cachedArt!==artwork){standImages.clear();cachedArt=artwork;}
 const key=slot.shelf+'_'+slot.side+'_'+(artwork||'none');
 if(!standImages.has(key)){
  const render=renderQueue.catch(()=>{}).then(async()=>{const module=await import('./stand-3d.mjs');return module.renderStandImage(slot,artwork);});renderQueue=render;standImages.set(key,render);
 }
 return standImages.get(key);
}
async function refreshDetailRender(v,slot){
 if(document.body.classList.contains('showcase-enabled'))return;
 const version=++detailRenderVersion,artwork=state.art;
 try{
  const src=await standImageFor(slot,artwork);
  if(version!==detailRenderVersion||state.focused!==v.id||state.slot!==slot.id||state.art!==artwork)return;
  const image=new Image();image.src=src;image.className='stand-render';image.alt=v.name+' stand, '+slot.label;image.dataset.facing=slot.id;
  $('#detail .stand-scene')?.replaceChildren(image);
 }catch{}
}
async function refreshOrderRenders(){
 if(document.body.classList.contains('showcase-enabled'))return;
 const version=++orderRenderVersion,artwork=state.art,lines=[...state.lines];
 if(cachedArt!==artwork){standImages.clear();cachedArt=artwork;}
 try{
  for(const line of lines){
   if(version!==orderRenderVersion||$('#order').dataset.visible!=='true')return;

   const url=await standImageFor(line.slot,artwork);
   if(version!==orderRenderVersion||$('#order').dataset.visible!=='true')return;
   const row=[...$('#order-lines').children].find(el=>el.dataset.lineKey===line.key);if(!row)continue;
   const image=new Image();image.src=url;image.className='stand-render';image.alt=line.venue.name+' stand, '+line.slot.label+(artwork?', with your artwork':'');image.dataset.facing=line.slot.id;image.dataset.artwork=String(!!artwork);
   row.querySelector('.stand-scene').replaceChildren(image);
  }
 }catch{/* The existing CAD preview remains usable when WebGL is unavailable. */}
}
function openOrder(){if(!state.lines.length){$('#planner').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});focusCampaign();return;}$('#order').hidden=false;setFlowStep(3);closeMenus();$('#notice').style.display='none';renderOrder();$('#order').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});$('#order').focus({preventScroll:true});}
$('#review').onclick=openOrder;$('#nav-review').onclick=openOrder;$('#close-order').onclick=()=>{$('#order').hidden=true;const target=$('#match-results').hidden?$('#planner'):$('#match-results');setFlowStep($('#match-results').hidden?1:2);target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
if($('#journey-review'))$('#journey-review').onclick=openOrder;
document.querySelectorAll('[data-weeks]').forEach(button=>button.addEventListener('click',()=>{
 const input=$('#weeks');input.value=Math.max(1,Math.min(52,(Number(input.value)||1)+Number(button.dataset.weeks)));readFilters();
}));
document.addEventListener('click',e=>{const b=e.target.closest('[data-focus],[data-select],[data-remove],[data-city]');if(!b)return;if(b.hasAttribute('data-focus'))openMapProfile(venues.find(v=>v.id===b.dataset.focus));if(b.hasAttribute('data-select'))focusVenue(b.dataset.select,true);if(b.hasAttribute('data-remove'))removeLine(b.dataset.remove);if(b.hasAttribute('data-city'))toggleCity(b.dataset.city);});
function readFilters(){
 state.media=$('#campaign-type').value;
 state.audiences=[...document.querySelectorAll('.chip input:checked')].map(i=>i.value);state.descriptor=$('#descriptor').value;
 const budget=$('#budget');state.budget=budget.value===''?null:Math.round(Math.max(0,Number(budget.value)||0)*100);
 const weeks=Number($('#weeks').value);if(!Number.isInteger(weeks)||weeks<1||weeks>52){$('#weeks').setCustomValidity('Enter a whole number from 1 to 52.');return;}$('#weeks').setCustomValidity('');state.weeks=weeks;state.start=$('#start').value;render();
}
$('#campaign-type').onchange=e=>{const profile=CAMPAIGN_TYPES[e.target.value];if(profile)document.querySelectorAll('.chip input').forEach(input=>input.checked=profile.audiences.includes(input.value));readFilters();};
$('#filters').onsubmit=e=>{e.preventDefault();showMatches();};$('#filters').addEventListener('input',e=>{if(e.target.id!=='city')readFilters();});$('#city').onchange=e=>switchCity(e.target.value);$('#sort').onchange=renderResults;
function switchCity(city){if(mapProfile)closeMapProfile();state.cities=city?[city]:Object.keys(cities);state.city=city;state.bounds=null;$('#city').value=city;render();if(map&&!$('#match-results').hidden){if(city)map.flyTo(cities[city],13,{animate:!reduced,duration:.6});else map.fitBounds(venues.map(v=>[v.lat,v.lng]),{...mapPadding(),animate:!reduced});}$('#search-area').disabled=true;}
function toggleCity(city){
 if(mapProfile)closeMapProfile();
 state.city='';$('#city').value='';state.bounds=null;
 state.cities=city?(state.cities.includes(city)?state.cities.filter(c=>c!==city):[...state.cities,city]):Object.keys(cities);
 render();
 const included=venues.filter(v=>state.cities.includes(v.city));
 if(map&&!$('#match-results').hidden&&included.length)map.flyToBounds(included.map(v=>[v.lat,v.lng]),{...mapPadding(),maxZoom:state.cities.length===1?12:9,animate:!reduced,duration:.8});
 $('#search-area').disabled=true;
}
$('#clear').onclick=()=>{$('#filters').reset();state.media='';state.audiences=[];state.descriptor='';state.budget=null;state.weeks=1;state.start='';switchCity('');};
$('#reset-area').onclick=()=>{state.bounds=null;render();};
$('#search-area').onclick=()=>{if(!map)return;const b=map.getBounds();state.bounds={south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()};render();$('#search-area').disabled=true;};
function artworkError(message){if($('#studio-art-name'))$('#studio-art-name').textContent=message;$('#art-name').textContent=message;}
const uploadArtwork=async e=>{
 const file=e.target.files[0];const token=++artToken;if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){artworkError('Choose a JPG, PNG or WebP image up to 10 MB.');e.target.value='';return;}
 const url=URL.createObjectURL(file);const img=new Image();img.src=url;
 try{await img.decode();if(token!==artToken){URL.revokeObjectURL(url);return;}if(state.art)URL.revokeObjectURL(state.art);state.art=url;state.artName=file.name;render();}catch{URL.revokeObjectURL(url);artworkError('That image could not be read. Choose another file.');}e.target.value='';
};
$('#artwork').onchange=uploadArtwork;
const removeArtwork=()=>{artToken++;if(state.art)URL.revokeObjectURL(state.art);state.art=null;state.artName='';render();};
$('#remove-art').onclick=removeArtwork;
const studio=$('#stand-studio')?setupStandStudio({venues,getArtwork:()=>state.art,getArtworkName:()=>state.artName,onUpload:uploadArtwork,onRemove:removeArtwork,onUseSample:()=>{artToken++;if(state.art?.startsWith('blob:'))URL.revokeObjectURL(state.art);state.art='/static/artwork/lidl-bromley-cross-front.png';state.artName='Lidl Bromley Cross — sample';render();},beforeOpen:()=>{closeMenus();$('#notice').style.display='none';}}):heroStudio();
function heroStudio(){let previous=null;const open=(context={})=>{closeMenus();dispatchEvent(new CustomEvent('showcase-open',{detail:{...context,artwork:state.art,artworkName:state.artName}}));};$('#open-stand').onclick=()=>open();document.addEventListener('click',e=>{const trigger=e.target.closest('[data-open-stand]');if(!trigger)return;const v=venues.find(v=>v.id===trigger.dataset.openStand);if(v)open({venueId:v.id,slot:v.facings.find(s=>s.id===trigger.dataset.standSlot)});});return {open,async refreshArtwork(){if(previous!==state.art){previous=state.art;dispatchEvent(new CustomEvent('showcase-artwork',{detail:{src:state.art,name:state.artName}}));}}};}
function renderMarkers(){
 if(!map)return;markers.forEach(m=>{m.closeTooltip?.();m.remove();});markers=[];activeLocationTooltip?.remove();activeLocationTooltip=null;
 const includedLocations=demoLocations.filter(location=>state.cities.includes(location.city)).length;
 $('#demo-location-count').textContent=includedLocations+' of 150 example locations included';
 for(const [i,location] of demoLocations.entries()){
  const included=state.cities.includes(location.city),active=mapProfile?.example&&mapProfile.id===location.id,profile=CAMPAIGN_TYPES[state.media],audienceFit=!state.audiences.length||state.audiences.some(a=>location.audiences.includes(a)),strong=included&&audienceFit&&(!profile||profile.types.includes(location.type))&&state.budget===null;
  const dot=L.circleMarker([location.lat,location.lng],{radius:map.getZoom()<10?3.3:5,color:included?'#ffffff':'#b8c6c4',weight:1.3,opacity:included?.9:.22,fillColor:strong?'#75543e':'#a49180',fillOpacity:strong?.95:included?.28:.15,interactive:false,className:'demo-location-dot map-point'+(strong?' is-brief-match':'')+(included?'':' excluded-location-dot')+(active?' is-active':'')}).addTo(map);markers.push(dot);
  const target=L.circleMarker([location.lat,location.lng],{radius:11,weight:0,opacity:0,fillOpacity:0,className:'location-hit-target'}).addTo(map);
  const element=target.getElement();element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',location.name+' - '+location.type+' - illustrative profile');element.dataset.locationId=location.id;if(active)element.setAttribute('aria-current','location');
  element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMapProfile(location,true);}});
  target.on('click',()=>openMapProfile(location,true)).on('mouseover',()=>dot.getElement()?.classList.add('is-hovered')).on('mouseout',()=>dot.getElement()?.classList.remove('is-hovered'));
  if(!active)target.bindTooltip(location.name+'<br>'+location.type+' / Example profile',{direction:'top',className:'map-point-tooltip'});markers.push(target);
  if(map.getZoom()>=12){const number=L.marker([location.lat,location.lng],{icon:icon(false,false,String(locationNumber(location,true)),'example'),interactive:false,keyboard:false,opacity:included?.9:.3}).addTo(map);if(active){number.getElement().classList.add('is-viewing');number.setZIndexOffset(1200);}markers.push(number);}
  if(active){const beacon=L.circleMarker([location.lat,location.lng],{radius:15,color:'#75543e',weight:2,fillColor:'#b99b82',interactive:false,className:'selection-beacon'}).addTo(map);markers.push(beacon);}
 }
 for(const [city,coords] of Object.entries(cities)){
  const included=state.cities.includes(city);
  const halo=L.circle(coords,{radius:city==='London'?11000:8000,color:included?'#75543e':'#a49180',weight:1,opacity:included?.17:.1,fillColor:included?'#b99b82':'#c9bbae',fillOpacity:included?.025:.015,interactive:false}).addTo(map);markers.push(halo);
 }
 if(map.getZoom()<10){
  for(const [city,coords] of Object.entries(cities)){
   const vs=venues.filter(v=>v.city===city),included=state.cities.includes(city),sel=vs.some(v=>chosen(v).length),fits=vs.some(v=>recommendation(v,state).match);
   const label=city+': 50 example locations, '+vs.length+' planning venues'+(included?'':', excluded')+'. Zoom in to explore.';
   const m=L.marker(coords,{icon:icon(included&&fits,sel,'50'),opacity:included?1:.3,title:label,alt:label,keyboard:true}).addTo(map).on('click',()=>map.flyTo(coords,12,{animate:!reduced}));if(included&&fits)m.getElement().classList.add('city-glow-marker');
   m.bindTooltip('<span>'+city+'</span><b>50</b>'+(included?'':'<em>Excluded</em>'),{direction:city==='London'?'left':'right',permanent:true,className:'city-map-label'+(included?'':' excluded-city-label'),offset:[city==='London'?-14:14,-12]});markers.push(m);
  }return;
 }
 for(const [i,v] of venues.entries()){
  const label=v.name+': '+(evaluate(v,state).match?'matches':'not a match')+'. '+reason(v)+(chosen(v).length?'. Selected':'');
  const m=L.marker([v.lat,v.lng],{icon:icon(evaluate(v,state).match,chosen(v).length>0,String(i+1)),opacity:state.cities.includes(v.city)?1:.3,title:label,alt:label,keyboard:true}).addTo(map).on('click',()=>openMapProfile(v,false));const viewing=mapProfile&&!mapProfile.example&&mapProfile.id===v.id;if(!viewing)m.bindTooltip(locationNumber(v)+'. '+esc(v.name));m.getElement().dataset.locationId=v.id;if(viewing){m.getElement().classList.add('is-viewing');m.getElement().setAttribute('aria-current','location');m.setZIndexOffset(1200);}if(recommendation(v,state).match&&recommendation(v,state).preferred)m.getElement().classList.add('planning-marker-recommended');markers.push(m);
  if(mapProfile&&!mapProfile.example&&mapProfile.id===v.id){const beacon=L.circleMarker([v.lat,v.lng],{radius:22,color:'#75543e',weight:2,fillColor:'#c2a68d',interactive:false,className:'selection-beacon'}).addTo(map);markers.push(beacon);}
 }
 const current=mapProfile&&(mapProfile.example?demoLocations:venues).find(v=>v.id===mapProfile.id);
 if(current&&map.getZoom()>=(mapProfile.example?12:10)){
  activeLocationTooltip=L.tooltip({permanent:true,direction:'top',offset:[0,-33],className:'active-location-label'}).setLatLng([current.lat,current.lng]).setContent('Location '+locationNumber(current,mapProfile.example)+' - '+esc(current.name));
  activeLocationTooltip.addTo(map);
 }
}
function icon(match,selected,label,kind='planning'){return L.divIcon({className:'pin-icon '+kind+'-pin',iconSize:[27,27],iconAnchor:[13,27],html:`<div class="pin ${match?'match':''} ${selected?'selected':''}"><b>${label}</b></div>`});}
function initMap(){
 if(!window.L){$('#map-status').textContent='Map unavailable. Venue results and your plan remain usable.';return;}
 map=L.map('map',{minZoom:osKey?7:6,maxZoom:19,scrollWheelZoom:false}).fitBounds(venues.map(v=>[v.lat,v.lng]),mapPadding());
 L.control.scale({imperial:false,position:'bottomright'}).addTo(map);
 const preview=()=>{
  $('#map-status').textContent=osKey?'OS tiles unavailable · preview map. Results and selections remain usable.':'Preview basemap · OS key not configured';
  $('#map').classList.add('preview-map');
  tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);
  tiles.once('tileerror',()=>{$('#map-status').textContent='Map tiles unavailable · coordinate-grid preview. Results and selections remain usable.';});
 };
 if(osKey){tiles=L.tileLayer(`https://api.os.uk/maps/raster/v1/zxy/Light_3857/{z}/{x}/{y}.png?key=${encodeURIComponent(osKey)}`,{minZoom:7,maxZoom:19}).addTo(map);$('#map-status').textContent='Ordnance Survey · Light';let failed=false;tiles.on('tileerror',()=>{if(failed)return;failed=true;map.removeLayer(tiles);document.querySelectorAll('.os-api-branding').forEach(e=>e.remove());preview();});const script=document.createElement('script');script.src='/static/vendor/os-api-branding.js';script.onload=()=>{if(failed)document.querySelectorAll('.os-api-branding').forEach(e=>e.remove());};document.head.append(script);
 }else preview();
 map.on('moveend',()=>{$('#search-area').disabled=false;renderMarkers();});map.on('zoomend',renderMarkers);map.on('movestart',()=>closeMenus());renderMarkers();
}
const orderObserver=new IntersectionObserver(entries=>{const visible=entries[0].isIntersecting;$('#order').dataset.visible=String(visible);if(visible)renderOrder();},{rootMargin:'100px',threshold:.01});orderObserver.observe($('#order'));
const summarySections=new Set();
function syncSummaryVisibility(){$('.summary').dataset.concealed=String(!state.lines.length&&!summarySections.has('order'));}
const summaryObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)summarySections.add(entry.target.id);else summarySections.delete(entry.target.id);}syncSummaryVisibility();},{rootMargin:'-25% 0px -25% 0px',threshold:.01});
['planner','order'].forEach(id=>summaryObserver.observe(document.getElementById(id)));
render();
