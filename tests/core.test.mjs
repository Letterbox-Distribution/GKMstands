import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluate,addition,totalPence,cheapest} from '../static/core.mjs';
const venues=JSON.parse(fs.readFileSync(new URL('../data/venues.json',import.meta.url),'utf8'));
const f={audiences:[],descriptor:'',budget:null,weeks:1,city:'',bounds:null};
test('each filled group must pass; unknown requested data never matches',()=>{
 assert.equal(evaluate(venues[0],{...f,audiences:['Office professionals'],descriptor:'Business visitors',budget:20000}).match,true);
 assert.equal(evaluate(venues[0],{...f,audiences:['Students']}).match,false);
 assert.match(evaluate(venues[1],{...f,descriptor:'Business visitors'}).reasons.join(),/unavailable/);
 assert.match(evaluate(venues[8],{...f,audiences:['Students']}).reasons.join(),/unavailable/);
 assert.equal(evaluate(venues[0],{...f,budget:20000,weeks:2}).match,false);
});
test('area, city and empty groups',()=>{
 assert.ok(venues.every(v=>evaluate(v,f).match));
 assert.equal(evaluate(venues[0],{...f,city:'Manchester'}).match,false);
 assert.equal(evaluate(venues[0],{...f,bounds:{south:53,north:54,west:-3,east:-2}}).match,false);
 assert.equal(evaluate(venues[0],{...f,cities:['London','Manchester']}).match,true);
 assert.match(evaluate(venues[3],{...f,cities:['London','Manchester']}).reasons.join(),/City excluded/);
 assert.ok(venues.every(v=>!evaluate(v,{...f,cities:[]}).match));
});
test('integer pence arithmetic, duplicate prevention, exact budget and shortfall',()=>{
 const v=venues[0],w=venues[3],a=v.facings.find(s=>s.weekly_pence===cheapest(v)),b=w.facings.find(s=>s.weekly_pence===cheapest(w));
 const lines=[{venue:v,slot:a}];
 assert.equal(totalPence([...lines,{venue:w,slot:b}],2),64000);
 assert.equal(addition(lines,w,b,{...f,budget:32000}).ok,true);
 assert.deepEqual(addition(lines,w,b,{...f,budget:30000}),{ok:true,overBudget:2000});
 assert.equal(addition(lines,w,b,{...f,budget:0}).ok,true);
 assert.equal(addition(lines,v,a,f).ok,false);
 assert.equal(totalPence(lines,2),40000);
});
