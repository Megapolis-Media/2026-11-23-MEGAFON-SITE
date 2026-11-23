import {WaveJourney} from './wave-journey.js';
import {WaveScore} from './wave-score.js';
import {MaterialKV} from './kv-material.js';
import {DiscoBall} from './disco-ball.js';
const $=s=>document.querySelector(s),section=$('.wave-journey'),slider=$('#mood'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let target=0;try{target=localStorage.getItem('wave-mood')==='1'?1:0}catch{}
let mix=target,dragging=false,paused=reduced.matches,lastFrame=0,lastMix=-1,mediaPlaying=false;
const score=new WaveScore({button:$('#sound'),status:$('#scoreStatus'),autoStart:true});
const material=new MaterialKV($('.art-stack'),$('.journey-sticky'),{interactive:false});
const disco=new DiscoBall($('#orbDance'));
const journey=new WaveJourney(section,value=>setMood(value));
const orb=$('#orbChill');
function setMood(value,persist=true){target=Math.max(0,Math.min(1,value));slider.value=String(Math.round(target*100));if(persist){document.body.classList.add('mood-touched');try{localStorage.setItem('wave-mood',String(target>=.5?1:0))}catch{}}}
function point(e){const b=slider.getBoundingClientRect(),size=$('.soft-orb').offsetWidth;setMood((e.clientX-b.left-size/2)/(b.width-size))}
slider.addEventListener('pointerdown',e=>{e.preventDefault();dragging=true;slider.focus({preventScroll:true});slider.setPointerCapture(e.pointerId);document.body.style.setProperty('--thumb-scale','.94');point(e)});
slider.addEventListener('pointermove',e=>{if(dragging)point(e)});
function release(e){if(!dragging)return;dragging=false;if(slider.hasPointerCapture(e.pointerId))slider.releasePointerCapture(e.pointerId);setMood(target>=.5?1:0);document.body.style.setProperty('--thumb-scale','1')}
slider.addEventListener('pointerup',release);slider.addEventListener('pointercancel',release);
slider.addEventListener('input',()=>{if(!dragging)setMood(+slider.value/100)});
slider.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowDown','Home','ArrowRight','ArrowUp','End'].includes(e.key)){e.preventDefault();setMood(['ArrowRight','ArrowUp','End'].includes(e.key)?1:0)}});
document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>setMood(+b.dataset.mood));
function pause(value){paused=value;document.body.classList.toggle('paused',paused);$('#motion').setAttribute('aria-pressed',String(paused));$('#motion').setAttribute('aria-label',paused?'Возобновить движение':'Приостановить движение');material.dirty=true;journey.dirty=true}
$('#motion').onclick=()=>pause(!paused);reduced.addEventListener('change',e=>pause(e.matches));
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(document.hidden){orb.pause();mediaPlaying=false}});
function frame(now){const dt=Math.min((now-lastFrame)/1000,.08)||.016;lastFrame=now;mix=paused?target:mix+(target-mix)*(1-Math.exp(-dt*(dragging?14:5.5)));if(Math.abs(mix-target)<.0003)mix=target;
 if(Math.abs(mix-lastMix)>.00005){lastMix=mix;document.body.style.setProperty('--mix',mix.toFixed(5));slider.setAttribute('aria-valuetext',mix<.5?'Chill':'Dance');document.querySelectorAll('[data-mood]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.mood===(mix>=.5?1:0))))}
 score.setMix(mix);const e=score.sample(dt);journey.paint(dt,mix,paused,e);material.visible=journey.progress<.4;material.paint(mix,dt,paused,e);disco.paint(dt,mix,paused,!document.hidden,e);
 const active=!paused&&!document.hidden&&mix<.99;if(active!==mediaPlaying){mediaPlaying=active;if(active)orb.play()?.catch(()=>{});else orb.pause()}orb.playbackRate=.7+e.bass*.7;
 const chapter=journey.progress<.35?0:journey.progress<.7?1:2;document.querySelectorAll('[data-chapter]').forEach(n=>n.classList.toggle('active',+n.dataset.chapter===chapter));$('.scroll-cue').style.opacity=journey.progress>.94?'0':'1';requestAnimationFrame(frame)
}
setMood(target,false);pause(paused);requestAnimationFrame(frame);
