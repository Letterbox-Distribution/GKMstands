import {venuePhotoMarkup} from './venue-photos.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function locationProfileMarkup(location,{example=false,price='',included=true,number=null}={}){
 const descriptions={'Office lobby':'A workplace reception setting where visitors and office professionals could discover relevant services and local experiences.','Hotel lobby':'A guest arrival setting where travel inspiration, attractions and local recommendations could be discovered.','Cultural venue':'A cultural welcome area where visitors could find exhibitions, events and nearby experiences.','Shared workspace':'A shared workplace setting where campaigns could reach people during their working day.'};
 const description=location.about||descriptions[location.type]||'A shared welcome space where visitors could browse campaign leaflets and discover something relevant to their day.';
 const visits=location.weekly_footfall?location.weekly_footfall.toLocaleString('en-GB'):'Unknown';
 return `<button class="profile-back" type="button" data-profile-back><span aria-hidden="true">&larr;</span> Back to planning venues</button>
 ${number?`<p class="profile-viewing">Viewing location <strong>${number}</strong></p>`:''}
 <p class="profile-classification">${example?'Illustrative location · Not bookable':'Planning venue · Illustrative inventory'}</p>
 <h2 id="location-profile-title">${number?`<span class="venue-number">${number}</span> `:''}${escape(location.name)}</h2>
 <p class="profile-place">${escape(location.type)} &middot; ${escape(location.city)}${location.area?' / '+escape(location.area):''}${included?'':'<br>City excluded from your brief'}</p>
 ${venuePhotoMarkup(location.type)}
 <p class="profile-about">${escape(description)}</p>
 <dl class="profile-stats"><div><dt>${example?'Example weekly visits':'Weekly venue visits'}</dt><dd>${visits}</dd></div><div><dt>${example?'Leaflet preview format':'Placement from'}</dt><dd>${example?'A5':escape(price)}${example?'':'<span> / week</span>'}</dd></div></dl>
 <h3 class="profile-audience-title">${example?'Example audience':'Audience tags'}</h3><div class="profile-audiences">${(location.audiences||['Data unavailable']).map(a=>`<span>${escape(a)}</span>`).join('')}</div>
 <p class="profile-data-note">${example?'Generated example profile and visits, not verified venue data. This random point cannot be booked.':'Illustrative visits and audience tags, not verified measurements. Venue visits do not represent stand impressions or leaflet pickups.'}</p>
 <button class="profile-action" type="button" ${example?'data-profile-browse':'data-select="'+escape(location.id)+'"'}>${example?'Explore planning venues in '+escape(location.city):'Choose a placement'} <span aria-hidden="true">&rarr;</span></button>
 <p class="profile-coordinates">${example?'Illustrative coordinate':'Planning coordinate'} &middot; ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</p>`;
}
