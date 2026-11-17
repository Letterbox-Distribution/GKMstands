// Stable pseudo-random examples, not venue inventory. Refreshing keeps the map steady.
export function createDemoLocations(cities){
 const profiles=[
  {type:'Hotel lounge',audiences:['Travellers','Leisure visitors'],about:'A welcoming guest lounge where visitors could browse local experiences and find inspiration for their stay.'},
  {type:'Shared workspace',audiences:['Office professionals','Commuters'],about:'A shared reception and breakout setting where a campaign could reach people during their working day.'},
  {type:'Cultural venue',audiences:['Leisure visitors'],about:'A cultural welcome area suited to discovering events, exhibitions and nearby experiences.'},
  {type:'Community hub',audiences:['Leisure visitors','Students'],about:'A neighbourhood gathering place where useful local services, activities and events could be discovered.'},
  {type:'Airport lounge',audiences:['Travellers','Office professionals'],about:'An illustrative airport welcome setting for travellers discovering services and experiences.'},
  {type:'Library',audiences:['Students','Leisure visitors'],about:'An illustrative library welcome space for discovering local services, culture and events.'},
  {type:'Student space',audiences:['Students'],about:'A shared campus-style setting where people could find useful services and things to do between activities.'}
 ];
 let seed=1502026;
 const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 return Object.entries(cities).flatMap(([city,[lat,lng]])=>Array.from({length:50},(_,i)=>{
  const angle=random()*Math.PI*2,radius=Math.sqrt(random())*(city==='London'?11:8);
  const profile=profiles[i%profiles.length];
  return {id:city+'-'+(i+1),city,...profile,name:city+' '+profile.type+' '+String(i+1).padStart(2,'0'),weekly_footfall:Math.round((3000+(i*791)%17000)/100)*100,lat:lat+Math.sin(angle)*radius/111.32,lng:lng+Math.cos(angle)*radius/(111.32*Math.cos(lat*Math.PI/180))};
 }));
}
