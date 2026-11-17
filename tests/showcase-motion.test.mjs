import test from 'node:test';
import assert from 'node:assert/strict';
import {showcaseMotion} from '../static/showcase-motion.mjs';

test('camera keeps moving through every chapter and the final close-up',()=>{
 let previous=showcaseMotion(0);
 for(let index=1;index<=1000;index++){
  const next=showcaseMotion(index/1000);
  assert(next.angle-next.turn>previous.angle-previous.turn,'orbit paused or reversed');
  assert(next.focus>=previous.focus-1e-12,'zoom reversed');
  previous=next;
 }
 assert(showcaseMotion(.95).angle!==showcaseMotion(.8).angle);
});

test('zoom approaches the approved cap smoothly without exceeding it',()=>{
 const final=showcaseMotion(1);
 assert(Math.abs(final.angle-.25)<1e-12);
 assert(Math.abs(final.turn+.15)<1e-12);
 assert(final.focus>.9&&final.focus<.91);
 assert.equal(showcaseMotion(.78).focus,final.focus);
 const delta=showcaseMotion(.78).focus-showcaseMotion(.7799).focus;
 assert(delta<1e-8,'zoom ends with an abrupt velocity change');
 assert.deepEqual(showcaseMotion(-1),showcaseMotion(0));
 assert.deepEqual(showcaseMotion(2),showcaseMotion(1));
});
