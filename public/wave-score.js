// Approved v2 stems: one clock and one continuous vocal. FFT observes the mix.
export class WaveScore {
 constructor({button,label,status,onPlay=()=>{},autoStart=false,gestureTarget=document}){
  Object.assign(this,{button,label,status,onPlay,autoStart,mix:0,playing:false,offset:0,loading:false,ready:false,userPaused:false,wanted:false});
  this.sources=[];this.energy={active:false,bass:0,mid:0,treble:0,rms:0,beat:0,bands:new Float32Array(12),position:0};this.lastBeat=-10;this.average=0;
  button.disabled=true;this.message('Музыка готовится');button.addEventListener('click',()=>this.toggle());
  this.gesture=e=>{if(!this.autoStart||this.userPaused||(this.playing&&this.ctx?.state==='running')||e.target?.closest?.('[data-audio-control]'))return;if(e.type==='keydown'&&!['Enter',' ','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;this.requestPlay(true)};
  for(const event of ['pointerdown','pointerup','keydown'])gestureTarget.addEventListener(event,this.gesture,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.playing){this.resumeVisible=true;this.pause(false)}else if(!document.hidden&&this.resumeVisible&&!this.userPaused){this.resumeVisible=false;this.requestPlay(false)}});
  this.prepare();
 }
 message(text){if(this.label)this.label.textContent=text;this.button.setAttribute('aria-label',text)}
 state(value){document.documentElement?.setAttribute('data-audio-state',value);if(this.status)this.status.textContent=value==='playing'?'Музыка звучит. Свет реагирует на звук.':value==='awaiting-gesture'?'Коснитесь шара, чтобы зазвучала Ваша волна.':value==='error'?'Не удалось загрузить музыку. Коснитесь значка звука, чтобы повторить.':''}
 async prepare(){try{
  const r=await fetch('/assets/music/wave-score.json',{cache:'no-store'});if(!r.ok)throw Error('manifest');this.manifest=await r.json();
  this.ready=!!this.manifest.ready&&['vocal','relax','impulse'].every(k=>typeof this.manifest.stems?.[k]==='string');
  if(this.ready){this.button.disabled=false;this.message('Включить звук');if(this.autoStart)this.requestPlay(false)}else this.state('error');
 }catch{this.button.disabled=false;this.message('Повторить загрузку музыки');this.state('error')}}
 context(){
  if(this.ctx)return this.ctx;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('В этом браузере звук недоступен.');
  try{this.ctx=new Audio({sampleRate:32000,latencyHint:'playback'})}catch{this.ctx=new Audio()}
  this.ctx.addEventListener?.('statechange',()=>{if(this.ctx.state==='running'&&this.wanted&&this.buffers&&!this.playing&&!document.hidden)this.start();else if(this.playing&&this.ctx.state==='suspended')this.state('awaiting-gesture')});return this.ctx;
 }
 async load(){
  if(this.buffers)return;if(this.loadPromise)return this.loadPromise;
  this.loadPromise=(async()=>{
   this.context();const keys=['vocal','relax','impulse'];
   const decoded=await Promise.all(keys.map(async k=>{const r=await fetch(this.manifest.stems[k]);if(!r.ok)throw Error('Не удалось загрузить музыку.');return this.ctx.decodeAudioData(await r.arrayBuffer())}));
   if(Math.max(...decoded.map(x=>x.duration))-Math.min(...decoded.map(x=>x.duration))>.01)throw Error('Музыкальная пара ещё не синхронизирована.');
   this.duration=Math.min(...decoded.map(x=>x.duration));this.buffers=decoded;
   this.master=this.ctx.createGain();this.master.gain.value=this.manifest.masterGain??1;
   if(this.ctx.createAnalyser){this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=.68;this.frequency=new Uint8Array(this.analyser.frequencyBinCount);this.waveform=new Uint8Array(this.analyser.fftSize);this.master.connect(this.analyser);this.analyser.connect(this.ctx.destination)}else this.master.connect(this.ctx.destination);
   this.gains=keys.map(()=>{const g=this.ctx.createGain();g.connect(this.master);return g});this.gains[0].gain.value=1;this.setMix(this.mix,true);
  })();try{return await this.loadPromise}catch(e){this.loadPromise=null;throw e}
 }
 setMix(value,immediate=false){
  const next=Math.max(0,Math.min(1,value)),changed=Math.abs(next-this.mix)>.00005;this.mix=next;if(!this.gains||(!changed&&!immediate))return;
  const a=Math.cos(next*Math.PI/2),b=Math.sin(next*Math.PI/2),rho=Math.max(0,Math.min(.99,this.manifest?.crossfadeCorrelation||0)),norm=Math.sqrt(1+2*rho*a*b);
  [a/norm,b/norm].forEach((v,i)=>{const g=this.gains[i+1].gain;if(immediate)g.value=v;else g.setTargetAtTime(v,this.ctx.currentTime,.07)});
 }
 async requestPlay(gesture=false){
  this.wanted=true;this.userPaused=false;
  // Resume synchronously inside the gesture, before any network await.
  try{const c=this.context();if(c.state!=='running')c.resume()?.catch(()=>{});if(!this.ready)return;
   this.loading=true;this.state('loading');await this.load();if(!this.wanted||document.hidden)return;
   if(this.ctx.state===undefined||this.ctx.state==='running'){if(!this.playing)this.start();else this.state('playing')}else{this.state('awaiting-gesture');this.message('Включить звук')}
  }catch(e){this.message('Повторить загрузку музыки');this.state('error');if(this.status)this.status.textContent=e.message}
  finally{this.loading=false;this.button.disabled=false}
 }
 async toggle(){if(!this.ready){this.prepare();return}if(this.playing||this.wanted&&this.loading){this.pause(true);return}return this.requestPlay(true)}
 start(){
  if(this.playing||!this.buffers||!this.wanted)return;this.stopSources();const when=this.ctx.currentTime+.07,offset=this.offset%this.duration;this.startedAt=when;
  this.sources=this.buffers.map((buffer,i)=>{const s=this.ctx.createBufferSource();s.buffer=buffer;s.loop=true;s.loopStart=0;s.loopEnd=this.duration;s.connect(this.gains[i]);s.start(when,offset);return s});
  this.playing=true;this.button.setAttribute('aria-pressed','true');this.message('Выключить звук');this.state('playing');this.onPlay();
 }
 pause(user=true){
  this.wanted=false;if(user)this.userPaused=true;if(this.playing)this.offset=(this.offset+Math.max(0,this.ctx.currentTime-this.startedAt))%this.duration;
  this.stopSources();this.playing=false;this.button.setAttribute('aria-pressed','false');this.message('Включить звук');this.state('paused');
 }
 sample(dt=.016){
  const e=this.energy,sounding=this.playing&&(this.ctx?.state===undefined||this.ctx?.state==='running')&&!document.hidden;let rms=0,bass=0,mid=0,treble=0;
  if(sounding&&this.analyser){
   this.analyser.getByteFrequencyData(this.frequency);this.analyser.getByteTimeDomainData(this.waveform);
   for(const s of this.waveform)rms+=((s-128)/128)**2;rms=Math.sqrt(rms/this.waveform.length);
   const hz=(this.ctx.sampleRate||32000)/this.analyser.fftSize;
   const band=(a,b)=>{let sum=0,n=0;for(let i=Math.max(1,Math.floor(a/hz));i<Math.min(this.frequency.length,Math.ceil(b/hz));i++){sum+=this.frequency[i]/255;n++}return n?Math.pow(sum/n,1.7):0};
   const edge=[35,65,105,170,270,430,680,1080,1720,2730,4350,6900,12000];
   for(let i=0;i<12;i++)e.bands[i]+=(band(edge[i],edge[i+1])-e.bands[i])*(1-Math.exp(-dt*14));
   bass=band(35,180);mid=band(180,2500);treble=band(2500,10000);this.average+=(rms-this.average)*(1-Math.exp(-dt*2.5));
   if(rms>this.average*1.15+.009&&bass>.12&&this.ctx.currentTime-this.lastBeat>.38){e.beat=1;this.lastBeat=this.ctx.currentTime}
  }else for(let i=0;i<12;i++)e.bands[i]*=Math.exp(-dt*7);
  e.beat*=Math.exp(-dt*7);e.active=sounding&&rms>.0025;
  const smooth=(key,v)=>{e[key]+=(v-e[key])*(1-Math.exp(-dt*12))};smooth('bass',bass);smooth('mid',mid);smooth('treble',treble);smooth('rms',Math.min(1,rms*4));
  e.position=this.playing?(this.offset+Math.max(0,this.ctx.currentTime-this.startedAt))%this.duration:this.offset;return e;
 }
 stopSources(){for(const s of this.sources){try{s.stop();s.disconnect()}catch{}}this.sources=[]}
}
