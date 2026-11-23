import assert from 'node:assert/strict';
import {WaveScore} from '../public/wave-score.js';
const starts=[],allSources=[];
const param=()=>({value:0,setTargetAtTime(v,t,c){this.value=v}});
class Audio{constructor(){this.currentTime=10;this.destination={}}async resume(){}async decodeAudioData(){return{duration:120}}createGain(){return{gain:param(),connect(){}}}createBufferSource(){const s={connect(){},start(t,o){starts.push([t,o])},stop(){this.stopped=true},disconnect(){}};allSources.push(s);return s}}
globalThis.window={AudioContext:Audio};globalThis.document={addEventListener(){},hidden:false};globalThis.fetch=async url=>({ok:true,json:async()=>({ready:true,stems:{vocal:'vocal.wav',relax:'relax.wav',impulse:'impulse.wav'}}),arrayBuffer:async()=>new ArrayBuffer(0)});
const button={disabled:false,attrs:{},addEventListener(){},setAttribute(k,v){this.attrs[k]=v}};const label={},status={};const s=new WaveScore({button,label,status});await new Promise(r=>setImmediate(r));assert.equal(s.ready,true);s.setMix(.5);await s.toggle();assert.equal(starts.length,3);assert.deepEqual(starts[0],starts[1]);assert.deepEqual(starts[1],starts[2]);assert.equal(s.gains[0].gain.value,1);assert.ok(Math.abs(s.gains[1].gain.value-Math.SQRT1_2)<1e-10);
for(let i=0;i<=100;i++)s.setMix(i/100);assert.equal(allSources.length,3,'No sources restart while sliding');assert.equal(s.gains[0].gain.value,1,'The common vocal never crossfades');assert.ok(s.gains[1].gain.value<1e-10);assert.equal(s.gains[2].gain.value,1);
s.ctx.currentTime=25.07;s.pause();assert.ok(Math.abs(s.offset-15)<1e-9);await s.toggle();assert.equal(starts.length,6);assert.equal(starts[3][1],starts[4][1]);assert.equal(starts[4][1],starts[5][1]);assert.ok(Math.abs(starts[3][1]-15)<1e-9);
console.log('PASS: simultaneous start, constant vocal, equal-power gains, continuous slider without seek/restart, shared pause/resume position.');
