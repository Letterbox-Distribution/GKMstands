export const cheapest = v => Math.min(...v.facings.map(s => s.weekly_pence));
export const money = p => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:p%100?2:0}).format(p/100);
export function evaluate(v, f) {
  const reasons=[];
  if(Array.isArray(f.cities) && !f.cities.includes(v.city)) reasons.push('City excluded from campaign');
  if(f.city && v.city!==f.city) reasons.push('Outside selected city');
  if(f.bounds && !(v.lat>=f.bounds.south && v.lat<=f.bounds.north && v.lng>=f.bounds.west && v.lng<=f.bounds.east)) reasons.push('Outside searched map area');
  if(f.audiences.length) {
    if(!v.audiences?.length) reasons.push('Audience data unavailable');
    else if(!f.audiences.some(a=>v.audiences.includes(a))) reasons.push('Audience does not match');
  }
  if(f.descriptor) {
    if(!v.descriptors?.length) reasons.push('Audience descriptor data unavailable');
    else if(!v.descriptors.includes(f.descriptor)) reasons.push('Audience descriptor does not match');
  }
  if(f.budget!==null && cheapest(v)*f.weeks>f.budget) reasons.push(`Above budget for ${f.weeks} ${f.weeks===1?'week':'weeks'}`);
  return {match:!reasons.length,reasons};
}
export const totalPence=(lines,weeks)=>lines.reduce((t,l)=>t+l.slot.weekly_pence*weeks,0);
export function addition(lines,v,slot,f) {
  if(lines.some(l=>l.venue.id===v.id && l.venue.stand_id===v.stand_id && l.slot.id===slot.id)) return {ok:false,reason:'This placement is already in your plan.'};
  const gap=totalPence(lines,f.weeks)+slot.weekly_pence*f.weeks-(f.budget??Infinity);
  return {ok:true,overBudget:Math.max(0,gap)};
}
