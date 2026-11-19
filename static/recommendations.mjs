import {evaluate,cheapest,totalPence} from './core.mjs';

export const CAMPAIGN_TYPES={
 travel:{label:'Travel & experiences',audiences:['Travellers','Leisure visitors'],types:['Hotel lobby','Hotel lounge','Cultural venue']},
 lifestyle:{label:'Fashion & lifestyle',audiences:['Leisure visitors','Office professionals'],types:['Hotel lobby','Hotel lounge','Shared workspace','Office lobby']},
 services:{label:'Local & professional services',audiences:['Office professionals','Commuters'],types:['Office lobby','Shared workspace','Community venue','Community hub']},
 culture:{label:'Events & culture',audiences:['Leisure visitors','Students'],types:['Cultural venue','Community venue','Community hub','Student hub','Student space']},
 hospitality:{label:'Food & hospitality',audiences:['Travellers','Office professionals','Leisure visitors'],types:['Hotel lobby','Hotel lounge','Office lobby','Shared workspace']}
};
export function recommendation(venue,filters){
 const result=evaluate(venue,filters);
 const profiles=filters.profiles??[CAMPAIGN_TYPES[filters.media]].filter(Boolean);
 const profile=profiles.find(item=>item.types.includes(venue.type));
 const preferred=!profiles.length||Boolean(profile);
 const overlap=(filters.audiences||[]).filter(a=>venue.audiences?.includes(a));
 return {...result,preferred,score:(preferred?10:0)+overlap.length,reason:profile&&preferred?profile.label+' setting':overlap.length?overlap.join(' / '):'Fits your city and budget'};
}
export function suggestSlots(venues,filters){
 const ranked=venues.filter(v=>recommendation(v,filters).match).sort((a,b)=>recommendation(b,filters).score-recommendation(a,filters).score||cheapest(a)-cheapest(b));
 let available=filters.budget===null?Infinity:Math.max(0,filters.budget-totalPence(filters.lines||[],filters.weeks));
 const suggestions=[];
 for(const venue of ranked){
  if(suggestions.length===3)break;
  if((filters.lines||[]).some(line=>line.venue.id===venue.id))continue;
  const slot=venue.facings.reduce((best,item)=>item.weekly_pence<best.weekly_pence?item:best);
  const cost=slot.weekly_pence*filters.weeks;
  if(cost>available)continue;
  suggestions.push({venue,slot,cost,reason:recommendation(venue,filters).reason});available-=cost;
 }
 return suggestions;
}
