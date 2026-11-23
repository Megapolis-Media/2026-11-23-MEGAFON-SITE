import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneProgress,lightingFor} from '../public/wave-journey.js';
test('pinned journey spans exactly the section minus one viewport and reverses',()=>{
 const h=2448,v=844,span=h-v;
 assert.equal(sceneProgress(40,h,v),0);
 assert.equal(sceneProgress(-span*.5,h,v),.5);
 assert.equal(sceneProgress(-span,h,v),1);
 assert.equal(sceneProgress(-span-500,h,v),1);
 assert.equal(sceneProgress(-span*.25,h,v),.25);
});
test('selected studio zone has more than six times the inactive zone light',()=>{
 const chill=lightingFor(0,1),dance=lightingFor(1,1),radio=lightingFor(.5,0);
 assert.ok(chill.chill/chill.dance>6);assert.ok(dance.dance/dance.chill>6);
 assert.ok(chill.radio<.5);assert.ok(dance.radio<.5);
 assert.equal(radio.chill,radio.dance);assert.equal(radio.radio,1);
 for(let n=0;n<=100;n++){const l=lightingFor(n/100,1);assert.ok(Object.values(l).every(Number.isFinite));assert.ok(l.chill>0&&l.dance>0)}
});
