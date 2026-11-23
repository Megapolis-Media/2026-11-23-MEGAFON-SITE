// Live material rendering over the approved 3D artwork. No pre-rendered animation.
const damp=(a,b,dt,k)=>a+(b-a)*(1-Math.exp(-dt*k));
const silence={active:false,bass:0,mid:0,treble:0,rms:0,beat:0,bands:new Float32Array(12),position:0};
export class MaterialKV {
 constructor(container,hero,{centered=false,symbol=false,interactive=true}={}){
  Object.assign(this,{container,hero,centered,symbol,clock:0,energy:0,visible:true,dirty:true,previousMix:-1,previousPaused:false,pointer:[0,0],look:[0,0],intro:0,budget:0,glint:-10,audio:silence});
  this.canvas=document.createElement('canvas');this.canvas.className='material-canvas';this.canvas.setAttribute('aria-hidden','true');container.append(this.canvas);this.source=document.createElement('canvas');
  if(interactive){this.trigger=document.createElement('button');this.trigger.type='button';this.trigger.className='material-touch';this.trigger.setAttribute('aria-label',symbol?'Коснуться объёмного знака МегаФона':'Провести светом по объёмной надписи');container.removeAttribute('aria-hidden');container.append(this.trigger);this.trigger.addEventListener('click',()=>{if(!this.previousPaused)this.glint=this.clock})}
  hero.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const b=hero.getBoundingClientRect();this.pointer=[(e.clientX-b.left)/b.width-.5,(e.clientY-b.top)/b.height-.5]},{passive:true});hero.addEventListener('pointerleave',()=>{this.pointer=[0,0]});
  new IntersectionObserver(es=>{this.visible=es[0].isIntersecting;this.dirty=true},{threshold:.01}).observe(hero);new ResizeObserver(()=>{this.dirty=true}).observe(container);this.init();
 }
 async init(){try{
  this.ctx=this.canvas.getContext('2d');this.sourceCtx=this.source.getContext('2d');if(!this.ctx||!this.sourceCtx)throw Error('Canvas unavailable');
  this.images=[...this.container.querySelectorAll('img')].slice(0,2);await Promise.all(this.images.map(im=>im.decode()));
  const mask=document.createElement('canvas');mask.width=256;mask.height=Math.round(256*this.images[0].naturalHeight/this.images[0].naturalWidth);const m=mask.getContext('2d',{willReadFrequently:true});m.drawImage(this.images[0],0,0,mask.width,mask.height);const pixels=m.getImageData(0,0,mask.width,mask.height).data;
  this.fibres=[];this.facets=[];let seed=31;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<(this.symbol?5200:5600);i++){
   const x=rand(),y=rand(),px=Math.floor(x*mask.width),py=Math.floor(y*mask.height),k=(py*mask.width+px)*4;if(pixels[k+3]<180)continue;
   this.fibres.push({x,y,len:1.7+rand()*3.8,angle:Math.atan2(y-.5,x-.5)*.35-1.2,phase:rand()*6.28,color:[pixels[k],pixels[k+1],pixels[k+2]],band:Math.floor(x*11.99)});
  }
  for(let y=.08;y<.94;y+=.037)for(let x=.08;x<.94;x+=.037){const k=(Math.floor(y*mask.height)*mask.width+Math.floor(x*mask.width))*4;if(pixels[k+3]>210)this.facets.push({x,y,phase:(x*97+y*51)%6.28})}
  this.ready=true;this.dirty=true;this.canvas.dataset.renderer='audio-material';
 }catch(e){this.canvas.dataset.renderer='image-fallback';console.warn('Title artwork fallback:',e.message)}}
 resize(){const w=Math.max(1,Math.min(1500,Math.round(this.container.clientWidth*Math.min(devicePixelRatio||1,1.5)))),h=Math.max(1,Math.round(w*this.container.clientHeight/this.container.clientWidth));if(this.canvas.width!==w||this.canvas.height!==h){for(const c of [this.canvas,this.source]){c.width=w;c.height=h}this.composedMix=-1}this.dirty=false}
 compose(mix){if(Math.abs(mix-this.composedMix)<.0002)return;this.composedMix=mix;const c=this.sourceCtx,w=this.source.width,h=this.source.height;c.clearRect(0,0,w,h);c.globalAlpha=1-mix;c.drawImage(this.images[0],0,0,w,h);c.globalCompositeOperation='lighter';c.globalAlpha=mix;c.drawImage(this.images[1],0,0,w,h);c.globalAlpha=1;c.globalCompositeOperation='source-over'}
 render(mix,paused){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height,e=paused?silence:this.audio,t=this.clock,soft=1-mix,touch=paused?0:Math.max(0,1-(t-this.glint)/1.4);c.clearRect(0,0,w,h);
  // A continuous cloth wave, with each strip driven by its own live frequency band.
  const columns=100,sw=w/columns,amp=paused?0:soft*((e.active?1.1+e.bass*6+e.rms*4:.55)+touch*3)*Math.min(w/700,1.2);
  for(let i=0;i<columns;i++){const x=i/columns,band=e.bands[Math.min(11,Math.floor(x*12))]||0;const wave=Math.sin(x*8+t*1.35)*.55+Math.sin(x*17-t*1.8)*.3;const y=amp*wave*(.6+band);c.drawImage(this.source,i*sw,0,sw,h,i*sw,y,sw+.45,h)}
  // Fine fibres are individually bent, not a single uniformly scaling bitmap.
  if(soft>.01&&!paused){c.globalAlpha=soft*.40;c.lineWidth=Math.max(.42,w/(this.symbol?620:1700));
   for(const f of this.fibres){const band=e.bands[f.band]||0,wind=Math.sin(t*1.45+f.phase+f.x*5)*(.24+(e.active?band*1.8+e.treble*.8:.08)),len=f.len*Math.max(.5,w/(this.symbol?340:950))*(.7+band*.7);const x=f.x*w,y=f.y*h+amp*(Math.sin(f.x*8+t*1.35)*.55+Math.sin(f.x*17-t*1.8)*.3)*(.6+band),a=f.angle+wind;
    const col=f.color.map(v=>Math.min(255,Math.round(v*1.1+18)));c.strokeStyle=`rgb(${col.join(',')})`;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(a)*len*.45,y+Math.sin(a)*len*.45,x+Math.cos(a+wind*.65)*len,y+Math.sin(a+wind*.65)*len);c.stroke();
   }c.globalAlpha=1;
  }
  c.globalCompositeOperation='source-atop';
  const lights=[{x:.20+Math.sin(t*.31)*.16,y:.18,r:.72,color:[255,218,232],a:soft*(.10+e.mid*.10)},{x:.81+Math.sin(t*.23)*.1,y:.22,r:.6,color:[214,204,255],a:soft*.12},{x:.52+Math.sin(t*.46)*.35,y:.26+Math.cos(t*.33)*.1,r:.26,color:[255,255,255],a:mix*(.08+e.treble*.30+e.beat*.12)+touch*.24}];
  for(const l of lights){const g=c.createRadialGradient(l.x*w,l.y*h,0,l.x*w,l.y*h,w*l.r);g.addColorStop(0,`rgba(${l.color.join(',')},${l.a})`);g.addColorStop(1,`rgba(${l.color.join(',')},0)`);c.fillStyle=g;c.fillRect(0,0,w,h)}
  if(mix>.01){
   const sweep=(t*.11)%1,px=(-.3+sweep*1.6)*w,g=c.createLinearGradient(px-w*.09,0,px+w*.09,h*.3);g.addColorStop(0,'#ffffff00');g.addColorStop(.5,`rgba(255,255,255,${mix*(.13+e.treble*.25)})`);g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);
   const lx=Math.sin(t*.55)*.65,ly=Math.cos(t*.37)*.45;
   for(const f of this.facets){const nx=(f.x-.5)*1.8,ny=(.5-f.y)*1.8,nz=Math.sqrt(Math.max(.06,1-nx*nx-ny*ny)),highlight=Math.pow(Math.max(0,(nx*lx+ny*ly+nz)/Math.sqrt(lx*lx+ly*ly+1)),56);if(highlight<.1)continue;c.globalAlpha=highlight*mix*(.24+e.treble*.5);c.fillStyle='#fff8ff';const size=w*(this.symbol?.013:.004);c.fillRect(f.x*w,f.y*h,size,size)}c.globalAlpha=1;
  }
  c.globalCompositeOperation='source-over';this.container.classList.add('material-ready');
 }
 paint(mix,dt,paused,audio=silence){
  if(!this.visible||document.hidden||!this.container.clientWidth||!this.container.clientHeight)return;this.audio=audio;
  if(this.previousPaused!==paused){this.dirty=true;this.previousPaused=paused;this.trigger?.setAttribute('aria-disabled',String(paused))}
  const old=this.previousMix<0?mix:this.previousMix,changed=Math.abs(mix-old)>.00001;this.previousMix=mix;this.energy=damp(this.energy,Math.min(1,Math.abs(mix-old)/Math.max(dt,.01)*.7),dt,5);
  if(!paused){this.clock+=dt;this.intro=Math.min(1,this.intro+dt/1.5)}this.look=this.look.map((v,i)=>paused?0:damp(v,this.pointer[i],dt,3.5));
  const t=this.clock,e=paused?silence:audio,enter=paused?0:Math.pow(1-this.intro,3),float=paused?0:Math.sin(t*.72)*4+enter*14-e.bass*(this.symbol?6:3),pitch=paused?0:-this.look[1]*4+Math.sin(t*.53)*1.2,turn=paused?0:this.look[0]*6+Math.sin(t*.38)*(this.symbol?7:1.7),scale=paused?1:1.005+Math.sin(t*.62)*.004+(1-mix)*e.bass*.035+mix*e.beat*.008-enter*.035;
  this.container.style.transform=`${this.centered?'translateX(-50%) ':''}perspective(1150px) translateY(${float.toFixed(2)}px) rotateX(${pitch.toFixed(3)}deg) rotateY(${turn.toFixed(3)}deg) scale(${scale.toFixed(5)})`;
  if(!this.ready||(paused&&!changed&&!this.dirty))return;this.budget+=dt;if(!this.dirty&&!paused&&this.budget<1/30)return;this.budget%=1/30;if(this.dirty)this.resize();this.compose(mix);this.render(mix,paused);
  this.canvas.dataset.audioReactive=String(e.active);this.canvas.dataset.audioLevel=e.rms.toFixed(3);
 }
}
