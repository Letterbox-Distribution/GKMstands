import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestSlots,recommendation} from '../static/recommendations.mjs';
const venue=(id,type,rate,audiences=['Travellers'])=>({id,city:'London',type,audiences,facings:[{id:'top',weekly_pence:rate}]});
test('suggestions favour campaign setting and stay inside the combined budget',()=>{
 const filters={media:'travel',audiences:['Travellers'],budget:30000,weeks:2,cities:['London'],lines:[]};
 const venues=[venue('office','Office lobby',5000),venue('hotel','Hotel lobby',10000),venue('other','Hotel lobby',9000)];
 const result=suggestSlots(venues,filters);
 assert.equal(result[0].venue.id,'other');assert.ok(result.reduce((sum,s)=>sum+s.cost,0)<=30000);
 assert.ok(!recommendation(venue('unknown','Hotel lobby',5000,null),filters).match);
});
test('existing selections consume budget and are never duplicated',()=>{
 const booked=venue('booked','Hotel lobby',10000),other=venue('other','Hotel lobby',8000);
 const filters={media:'travel',audiences:[],budget:30000,weeks:2,cities:['London'],lines:[{venue:booked,slot:booked.facings[0]}]};
 assert.deepEqual(suggestSlots([booked,other],filters),[]);
 filters.budget=40000;assert.deepEqual(suggestSlots([booked,other],filters).map(s=>s.venue.id),['other']);
});
