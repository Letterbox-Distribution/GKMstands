import {money,cheapest,totalPence} from './core.mjs';
import {CAMPAIGN_TYPES,recommendation,suggestSlots} from './recommendations.mjs';
import {venuePhoto} from './venue-photos.mjs';

const $=selector=>document.querySelector(selector);
const {venues,osKey}=JSON.parse($('#booking-data').textContent);
const cityNames=['London','Birmingham','Manchester'];
const campaignLabels={...Object.fromEntries(Object.entries(CAMPAIGN_TYPES).map(([key,value])=>[key,value.label])),general:'Help me choose'};
const draftKey='goldkey-edition-campaign-v1',receiptKey='goldkey-edition-receipt-v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fresh=()=>({campaign:'',cities:[...cityNames],budget:null,weeks:1,start:'',placements:[],requestKey:crypto.randomUUID?.()||[...crypto.getRandomValues(new Uint8Array(16))].map(value=>value.toString(16).padStart(2,'0')).join('')});
let state=fresh(),step=1,cityFilter='',search='',expandedVenue='',focusedVenue='',noticeTimer,map,mapPromise,markers=[],artwork,artworkUrl,receipt,submitting=false;
try{
 const saved=JSON.parse(sessionStorage.getItem(draftKey));
 if(saved&&campaignLabels[saved.campaign]){
  state={...state,campaign:saved.campaign,cities:cityNames.filter(city=>saved.cities?.includes(city)),weeks:Math.max(1,Math.min(52,Number(saved.weeks)||1)),start:/^\d{4}-\d{2}-\d{2}$/.test(saved.start)?saved.start:'',budget:Number.isInteger(saved.budget)&&saved.budget>=0?saved.budget:null};
  state.placements=(saved.placements||[]).filter((line,index,all)=>venues.some(venue=>venue.id===line.venue_id&&venue.facings.some(slot=>slot.id===line.slot_id))&&all.findIndex(other=>other.venue_id===line.venue_id&&other.slot_id===line.slot_id)===index);
  if(typeof saved.requestKey==='string'&&/^[a-zA-Z0-9-]{16,64}$/.test(saved.requestKey))state.requestKey=saved.requestKey;
 }
}catch{/* A private/restricted browser still supports the complete booking flow. */}
const today=new Date(),localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
$('#booking-start').min=localDate;if(state.start&&state.start<localDate)state.start='';
$('#booking-budget').value=state.budget===null?'':state.budget/100;
if(![...$('#booking-weeks').options].some(option=>Number(option.value)===state.weeks))$('#booking-weeks').add(new Option(state.weeks+' weeks',state.weeks));
$('#booking-weeks').value=state.weeks;$('#booking-start').value=state.start;

function lines(){return state.placements.map(item=>{const venue=venues.find(venue=>venue.id===item.venue_id);return {key:item.venue_id+':'+item.slot_id,venue,slot:venue.facings.find(slot=>slot.id===item.slot_id)};});}
function filters(){return {media:state.campaign,cities:state.cities,city:'',audiences:CAMPAIGN_TYPES[state.campaign]?.audiences||[],descriptor:'',budget:state.budget,weeks:state.weeks,lines:lines()};}
function total(){return totalPence(lines(),state.weeks);}
function selectedAt(venue){return state.placements.filter(item=>item.venue_id===venue.id);}
function save(){try{sessionStorage.setItem(draftKey,JSON.stringify(state));}catch{}}
function notify(message){const notice=$('#booking-notice');notice.textContent=message;notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.hidden=true,4500);}
function budgetMessage(){const over=state.budget===null?0:total()-state.budget;return over>0?money(over)+' over your budget. You can keep these spaces or edit your plan.':'';}

function sync(){
 document.querySelectorAll('[data-campaign]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.campaign===state.campaign)));
 document.querySelectorAll('[data-booking-city]').forEach(button=>button.setAttribute('aria-pressed',String(state.cities.includes(button.dataset.bookingCity))));
 const count=state.placements.length,locations=new Set(state.placements.map(item=>item.venue_id)).size;
 $('#booking-summary-cities').textContent=state.cities.length+' '+(state.cities.length===1?'city':'cities');
 $('#booking-summary-weeks').textContent=state.weeks+' '+(state.weeks===1?'week':'weeks');$('#booking-summary-start-row').hidden=!state.start;$('#booking-summary-start').textContent=state.start?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(state.start+'T12:00:00')):'';
 $('#booking-summary-count').textContent=count?count+' '+(count===1?'space':'spaces')+' in '+locations+' '+(locations===1?'location':'locations'):'No locations selected yet';
 $('.booking-summary-total').hidden=!count;$('#booking-summary-total').textContent=money(total());
 for(const id of ['booking-summary-budget','booking-review-budget']){$('#'+id).textContent=budgetMessage();$('#'+id).hidden=!budgetMessage();}
 $('.booking-basket').hidden=!count||step!==2;
 $('#basket-count').textContent=count+' '+(count===1?'space':'spaces')+' · '+locations+' '+(locations===1?'location':'locations');
 $('#basket-total').textContent=money(total());$('#basket-budget').textContent=state.budget!==null&&total()>state.budget?money(total()-state.budget)+' over budget':'';$('#basket-budget').hidden=!$('#basket-budget').textContent;
 document.querySelectorAll('[data-step-nav]').forEach(button=>{const next=Number(button.dataset.stepNav);button.disabled=next===2?!(state.campaign&&state.cities.length):next===3?!count:false;button.toggleAttribute('aria-current',next===step);if(next===step)button.setAttribute('aria-current','step');});
 save();
}

async function go(next,{history=true,focus=true}={}){
 if(next===2&&(!state.campaign||!state.cities.length))next=1;
 if(next===3&&!state.placements.length)next=state.campaign?2:1;
 step=next;document.body.dataset.step=String(next);clearTimeout(noticeTimer);$('#booking-notice').hidden=true;
 document.querySelectorAll('[data-booking-step]').forEach(section=>section.hidden=Number(section.dataset.bookingStep)!==step);
 $('#booking-confirmation').hidden=true;
 if(next===2)renderDiscovery(true);
 if(next===3)renderReview();
 sync();
 const hash=['','#campaign','#locations','#review'][next];
 if(history&&location.hash!==hash)window.history.pushState({step:next},'',hash);
 if(focus){const target=$('[data-booking-step="'+next+'"]');target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});target.focus({preventScroll:true});}
 if(next===2&&(!matchMedia('(max-width:760px)').matches||$('#booking-map-panel').classList.contains('is-open'))){await ensureMap();map?.invalidateSize();}
}

document.querySelectorAll('[data-step-nav]').forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.stepNav))));
document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.back))));
document.querySelectorAll('[data-campaign]').forEach(button=>button.addEventListener('click',()=>{state.campaign=button.dataset.campaign;$('#brief-error').hidden=true;sync();}));
document.querySelectorAll('[data-booking-city]').forEach(button=>button.addEventListener('click',()=>{
 const city=button.dataset.bookingCity;
 state.cities=state.cities.includes(city)?state.cities.filter(item=>item!==city):cityNames.filter(item=>item===city||state.cities.includes(item));
 const previous=state.placements.length;state.placements=state.placements.filter(item=>state.cities.includes(venues.find(venue=>venue.id===item.venue_id).city));
 if(previous!==state.placements.length)notify('Spaces in '+city+' were removed from your plan.');
 sync();
}));
for(const id of ['booking-budget','booking-weeks','booking-start'])$('#'+id).addEventListener('change',()=>{
 state.budget=$('#booking-budget').value===''?null:Math.round(Number($('#booking-budget').value)*100);
 state.weeks=Math.max(1,Math.min(52,Number($('#booking-weeks').value)||1));state.start=$('#booking-start').value;sync();
});
$('#booking-brief').addEventListener('submit',event=>{
 event.preventDefault();const message=!state.campaign?'Choose what you are promoting to continue.':!state.cities.length?'Choose at least one city to continue.':'';
 $('#brief-error').textContent=message;$('#brief-error').hidden=!message;
 if(message){(!state.campaign?$('[data-campaign]'):$('[data-booking-city]')).focus();return;}
 cityFilter='';go(2);
});

function visibleVenues(){return venues.filter(venue=>state.cities.includes(venue.city)&&(!cityFilter||venue.city===cityFilter)&&(!search||[venue.name,venue.city,venue.area,venue.type].join(' ').toLowerCase().includes(search))).sort((a,b)=>recommendation(b,filters()).score-recommendation(a,filters()).score||cheapest(a)-cheapest(b));}
function renderDiscovery(refit=false){
 const available=visibleVenues();
 $('#booking-city-filters').innerHTML=['',...state.cities].map(city=>'<button type="button" data-filter-city="'+esc(city)+'" aria-pressed="'+(cityFilter===city)+'">'+esc(city||'All cities')+'</button>').join('');
 $('#booking-results-note').textContent=available.length+' '+(available.length===1?'location':'locations')+' · numbered to match the map';
 const suggestion=suggestSlots(venues,filters());$('#booking-suggestion').hidden=!!state.placements.length||!suggestion.length;
 if(suggestion.length)$('#booking-suggestion').innerHTML='<div><strong>A considered starting point</strong><p>'+suggestion.length+' locations · '+money(suggestion.reduce((sum,item)=>sum+item.cost,0))+' estimated for '+state.weeks+' '+(state.weeks===1?'week':'weeks')+'</p></div><button type="button" class="edition-text-button" data-suggested>Use suggested plan →</button>';
 $('#booking-venues').innerHTML=available.length?available.map(venue=>{
  const photo=venuePhoto(venue.type),chosen=selectedAt(venue),number=venues.indexOf(venue)+1;
  return '<article class="booking-venue'+(chosen.length?' is-selected':'')+(focusedVenue===venue.id?' is-focused':'')+'" id="venue-'+venue.id+'"><div class="booking-venue-image"><img src="'+photo.src+'" alt="Representative '+photo.kind+' setting, not the actual venue" width="640" height="360" loading="lazy" decoding="async">'+(chosen.length?'<span class="booking-selected-badge"><b>✓</b>'+chosen.length+' selected</span>':'')+'</div><div class="booking-venue-copy"><div class="booking-venue-title"><span class="booking-location-number">'+number+'</span><h3>'+esc(venue.name)+'</h3></div><p>'+esc(venue.city+' · '+venue.area)+'<br>'+esc(venue.type)+'</p><div class="booking-venue-bottom"><span class="booking-venue-price">From <strong>'+money(cheapest(venue))+'</strong> / week</span><button type="button" class="edition-text-button" data-open-venue="'+venue.id+'" aria-expanded="'+(expandedVenue===venue.id)+'" aria-controls="spaces-'+venue.id+'">'+(chosen.length?'Edit spaces':'Choose space')+' '+(expandedVenue===venue.id?'−':'↗')+'</button></div></div><div class="booking-spaces" id="spaces-'+venue.id+'"'+(expandedVenue===venue.id?'':' hidden')+'><strong>Choose your A5 space</strong><div class="booking-space-grid">'+venue.facings.map((slot,index)=>{
   const selected=chosen.some(item=>item.slot_id===slot.id),label=slot.label.replace(' - ',' ');
   return '<button type="button" data-select-venue="'+venue.id+'" data-select-space="'+slot.id+'" aria-pressed="'+selected+'" aria-label="'+esc(label+' at '+venue.name+', '+money(slot.weekly_pence)+' per week')+'"><span>'+ (selected?'✓':index+1)+'</span><span>'+esc(label)+'<small>'+money(slot.weekly_pence)+' / week</small></span></button>';
  }).join('')+'</div></div></article>';
 }).join(''):'<p class="booking-empty">No locations match that search. Try another name or city.</p>';
 updateMap(refit);
}
$('#locations-step').addEventListener('click',event=>{
 const city=event.target.closest('[data-filter-city]');if(city){cityFilter=city.dataset.filterCity;renderDiscovery(true);return;}
 const open=event.target.closest('[data-open-venue]');if(open){expandedVenue=expandedVenue===open.dataset.openVenue?'':open.dataset.openVenue;if(expandedVenue)focusedVenue=expandedVenue;renderDiscovery();if(expandedVenue)focusVenueOnMap(expandedVenue);document.querySelector('[data-open-venue="'+open.dataset.openVenue+'"]').focus({preventScroll:true});return;}
 const choice=event.target.closest('[data-select-space]');if(choice){
  const {selectVenue:venue_id,selectSpace:slot_id}=choice.dataset,index=state.placements.findIndex(item=>item.venue_id===venue_id&&item.slot_id===slot_id);
  if(index>=0)state.placements.splice(index,1);else state.placements.push({venue_id,slot_id});
  sync();renderDiscovery();document.querySelector('[data-select-venue="'+venue_id+'"][data-select-space="'+slot_id+'"]').focus({preventScroll:true});
  return;
 }
 const card=event.target.closest('.booking-venue');
 if(card&&!event.target.closest('.booking-spaces,a,button,input,select,textarea,label')){const trigger=card.querySelector('[data-open-venue]');trigger.click();return;}
 if(event.target.closest('[data-suggested]')){
  for(const item of suggestSlots(venues,filters()))state.placements.push({venue_id:item.venue.id,slot_id:item.slot.id});
  sync();renderDiscovery();
 }
});
$('#booking-search').addEventListener('input',event=>{search=event.target.value.trim().toLowerCase();renderDiscovery(true);});
$('#booking-review').addEventListener('click',()=>go(3));

function reviewMarkup(items,weeks,removable=true){return items.map(item=>{
 const venue=venues.find(venue=>venue.id===item.venue_id),slot=venue.facings.find(slot=>slot.id===item.slot_id),photo=venuePhoto(venue.type);
 return '<article class="booking-review-line"><img src="'+photo.src+'" alt="Representative '+photo.kind+' setting" width="94" height="76" loading="lazy"><div><h3>'+esc(venue.name)+'</h3><p>'+esc(venue.city+' · '+slot.label.replace(' - ',' '))+'<br>'+money(slot.weekly_pence)+' / week × '+weeks+' '+(weeks===1?'week':'weeks')+'</p></div><div><strong>'+money(slot.weekly_pence*weeks)+'</strong>'+(removable?'<button type="button" class="edition-text-button" data-remove-venue="'+venue.id+'" data-remove-space="'+slot.id+'">Remove</button>':'')+'</div></article>';
}).join('');}
function renderReview(){$('#booking-review-lines').innerHTML=reviewMarkup(state.placements,state.weeks);}
$('#booking-review-lines').addEventListener('click',event=>{const button=event.target.closest('[data-remove-space]');if(!button)return;state.placements=state.placements.filter(item=>!(item.venue_id===button.dataset.removeVenue&&item.slot_id===button.dataset.removeSpace));if(!state.placements.length)go(2);else{renderReview();sync();}});

async function ensureMap(){
 if(map)return;if(!mapPromise)mapPromise=(async()=>{
  if(!window.L){
   const style=document.createElement('link');style.rel='stylesheet';style.href='/static/vendor/leaflet.css';document.head.append(style);
   await new Promise(resolve=>{const script=document.createElement('script');script.src='/static/vendor/leaflet.js';script.onload=resolve;script.onerror=resolve;document.head.append(script);});
  }
  if(!window.L){$('#booking-map').textContent='The map is unavailable. All locations are listed alongside.';return;}
  map=L.map('booking-map',{scrollWheelZoom:false,minZoom:6,maxZoom:18}).setView([52.7,-1.7],7);map.on('zoomend',()=>requestAnimationFrame(()=>updateMap()));
  const preview=()=>L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  if(osKey){const tiles=L.tileLayer('https://api.os.uk/maps/raster/v1/zxy/Light_3857/{z}/{x}/{y}.png?key='+encodeURIComponent(osKey),{attribution:'© Ordnance Survey',minZoom:7,maxZoom:18}).addTo(map);tiles.once('tileerror',()=>{map.removeLayer(tiles);preview();});}else preview();
  L.control.scale({imperial:false}).addTo(map);updateMap(true);
 })();return mapPromise;
}
async function focusVenueOnMap(id){
 const venue=venues.find(item=>item.id===id);if(!venue)return;
 if(matchMedia('(max-width:760px)').matches&&!$('#booking-map-panel').classList.contains('is-open'))return;
 await ensureMap();if(!map||focusedVenue!==id)return;
 map.invalidateSize();map.stop();map.setView([venue.lat,venue.lng],15,{animate:!reduced,duration:.5});
 $('#booking-map').setAttribute('aria-label','Map centred on '+venue.name);
 updateMap();
}
function updateMap(refit=false){
 if(!map)return;markers.forEach(marker=>marker.remove());markers=[];const available=visibleVenues();
 if(map.getZoom()<10&&new Set(available.map(venue=>venue.city)).size>1){
  for(const city of [...new Set(available.map(venue=>venue.city))]){
   const group=available.filter(venue=>venue.city===city),lat=group.reduce((n,venue)=>n+venue.lat,0)/group.length,lng=group.reduce((n,venue)=>n+venue.lng,0)/group.length;
   const marker=L.marker([lat,lng],{title:city+': '+group.length+' locations. Click to explore.',icon:L.divIcon({className:'booking-map-cluster',iconSize:[112,34],iconAnchor:[56,17],html:'<span>'+esc(city)+' <b>'+group.length+'</b></span>'})}).addTo(map);
   marker.on('click',()=>{cityFilter=city;renderDiscovery(true);});markers.push(marker);
  }
 }else for(const venue of available){
  const number=venues.indexOf(venue)+1,selected=selectedAt(venue).length;
  const marker=L.marker([venue.lat,venue.lng],{title:'Location '+number+': '+venue.name,keyboard:true,icon:L.divIcon({className:'booking-map-pin'+(selected?' is-selected':'')+(focusedVenue===venue.id?' is-focused':''),iconSize:[30,34],iconAnchor:[15,32],html:'<span><b>'+number+'</b></span>'})}).addTo(map);
  marker.bindTooltip('Location '+number+' · '+esc(venue.name),{direction:'top',offset:[0,-26]});
  marker.on('click',()=>{expandedVenue=venue.id;focusedVenue=venue.id;renderDiscovery();const card=$('#venue-'+venue.id);card.scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'});card.querySelector('[data-open-venue]').focus({preventScroll:true});});markers.push(marker);
 }
 if(refit&&available.length)map.fitBounds(available.map(venue=>[venue.lat,venue.lng]),{padding:[35,35],maxZoom:13,animate:false});
}
$('#booking-map-toggle').addEventListener('click',async()=>{const panel=$('#booking-map-panel'),open=panel.classList.toggle('is-open');$('#booking-map-toggle').textContent=open?'Hide map':'Show map';$('#booking-map-toggle').setAttribute('aria-expanded',String(open));if(open){await ensureMap();map?.invalidateSize();if(focusedVenue)await focusVenueOnMap(focusedVenue);else updateMap(true);}});

$('#booking-artwork').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){notify('Choose a JPG, PNG or WebP up to 10 MB.');event.target.value='';return;}
 const url=URL.createObjectURL(file),image=new Image();image.src=url;
 try{await image.decode();if(image.naturalWidth*image.naturalHeight>40000000)throw Error('large');if(artworkUrl)URL.revokeObjectURL(artworkUrl);artwork=file;artworkUrl=url;$('#booking-artwork-preview').hidden=false;$('#booking-artwork-preview').innerHTML='<img src="'+url+'" alt="Your artwork preview"><span>'+esc(file.name)+'</span><button type="button" class="edition-text-button" id="booking-remove-art">Remove</button>';}
 catch{URL.revokeObjectURL(url);notify('This artwork could not be opened. Choose an image up to 40 megapixels.');event.target.value='';}
});
$('#booking-artwork-preview').addEventListener('click',event=>{if(!event.target.closest('#booking-remove-art'))return;if(artworkUrl)URL.revokeObjectURL(artworkUrl);artwork=null;artworkUrl=null;$('#booking-artwork').value='';$('#booking-artwork-preview').hidden=true;$('#booking-artwork-preview').replaceChildren();});

$('#booking-request-form').addEventListener('submit',async event=>{
 event.preventDefault();if(submitting)return;if(!state.placements.length){go(2);return;}
 const form=event.currentTarget;if(!form.reportValidity())return;
 const fields=new FormData(form),payload={request_key:state.requestKey,campaign:state.campaign,weeks:state.weeks,start:state.start,budget_pence:state.budget,placements:state.placements,name:fields.get('name'),email:fields.get('email'),company:fields.get('company'),phone:fields.get('phone'),notes:fields.get('notes'),consent:fields.get('consent')==='on',website:fields.get('website')};
 const body=new FormData();body.set('request',JSON.stringify(payload));if(artwork)body.set('artwork',artwork);
 submitting=true;$('#booking-send').disabled=true;$('#booking-send').textContent='Saving your request…';$('#booking-submit-error').hidden=true;
 try{
  const response=await fetch('/api/booking-requests',{method:'POST',headers:{'X-Booking-Token':$('meta[name="booking-token"]').content},body});
  const result=await response.json().catch(()=>({error:'Your request could not be saved. Please try again.'}));if(!response.ok)throw Error(result.error||'Your request could not be saved. Please try again.');
  receipt={reference:result.reference,total:result.total_pence,campaign:state.campaign,weeks:state.weeks,start:state.start,placements:state.placements.map(item=>({...item}))};
  try{sessionStorage.setItem(receiptKey,JSON.stringify(receipt));sessionStorage.removeItem(draftKey);}catch{}
  showReceipt();
 }catch(error){$('#booking-submit-error').textContent=error.message;$('#booking-submit-error').hidden=false;$('#booking-submit-error').scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'});}
 finally{submitting=false;$('#booking-send').disabled=false;$('#booking-send').innerHTML='Request booking <span aria-hidden="true">→</span>';}
});
function showReceipt({history=true}={}){
 step=4;document.body.dataset.step='4';clearTimeout(noticeTimer);$('#booking-notice').hidden=true;$('.booking-basket').hidden=true;$('#booking-confirmation').hidden=false;$('#booking-reference').textContent=receipt.reference;
 $('#booking-confirmation-summary').innerHTML='<p class="booking-receipt-brief"><strong>'+esc(campaignLabels[receipt.campaign])+'</strong><span>'+receipt.weeks+' '+(receipt.weeks===1?'week':'weeks')+(receipt.start?' - Preferred start '+esc(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(receipt.start+'T12:00:00'))):' - Start date to confirm')+'</span></p>'+reviewMarkup(receipt.placements,receipt.weeks,false)+'<div class="booking-review-line booking-receipt-total"><div></div><div><h3>Estimated total</h3><p>Subject to team confirmation</p></div><strong>'+money(receipt.total)+'</strong></div>';
 if(history)window.history.pushState({step:4},'','#received');window.scrollTo({top:0,behavior:'instant'});$('#booking-confirmation').focus({preventScroll:true});
}
$('#booking-print').addEventListener('click',()=>window.print());
$('#booking-new').addEventListener('click',()=>{state=fresh();receipt=null;try{sessionStorage.removeItem(receiptKey);sessionStorage.removeItem(draftKey);}catch{}$('#booking-brief').reset();$('#booking-request-form').reset();$('#booking-artwork-preview').hidden=true;if(artworkUrl)URL.revokeObjectURL(artworkUrl);artwork=null;artworkUrl=null;cityFilter='';search='';expandedVenue='';go(1);});
addEventListener('popstate',()=>{if(location.hash==='#received'&&receipt)showReceipt({history:false});else go(location.hash==='#review'?3:location.hash==='#locations'?2:1,{history:false});});
try{if(location.hash==='#received')receipt=JSON.parse(sessionStorage.getItem(receiptKey));}catch{}
if(receipt?.reference&&receipt.placements?.every(item=>venues.some(venue=>venue.id===item.venue_id&&venue.facings.some(slot=>slot.id===item.slot_id))))showReceipt({history:false});
else go(location.hash==='#review'?3:location.hash==='#locations'?2:1,{history:false,focus:false});
document.body.dataset.bookingReady='true';
