import {DiscoBall} from './disco-ball.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export function sceneProgress(top,height,viewport){return clamp(-top/Math.max(1,height-viewport))}
export function lightingFor(mix,focus){return {chill:lerp(.72,lerp(1.08,.16,mix),focus),dance:lerp(.72,lerp(.14,1.08,mix),focus),radio:lerp(1,.43,focus)}}
const quiet={active:false,bass:0,mid:0,treble:0,rms:0,beat:0,bands:[]};
export class WaveJourney{
 constructor(section,setMood){
  Object.assign(this,{demo:section.dataset.demo==='true',section,setMood,canvas:section.querySelector('.journey-canvas'),sticky:section.querySelector('.journey-sticky'),clock:0,danceClock:0,readClock:0,progress:0,focus:0,wide:false,radio:false,visible:true,loaded:false,budget:0,lastMode:-1,pointer:0,look:0});this.ctx=this.canvas.getContext('2d');
  this.title=section.querySelector('.journey-title');this.heading=section.querySelector('.journey-studio-heading');this.zones=section.querySelector('.journey-zones');this.copy=section.querySelector('.journey-scene-copy');this.next=section.querySelector('.journey-next');
  this.ball=new DiscoBall({clientWidth:420,exposure:1.32,append(){},classList:{add(){}}});
  new ResizeObserver(()=>this.resize()).observe(this.sticky);new IntersectionObserver(es=>this.visible=es[0].isIntersecting,{threshold:0}).observe(section);
  this.sticky.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const r=this.sticky.getBoundingClientRect();this.pointer=(e.clientX-r.left)/r.width-.5}},{passive:true});this.sticky.addEventListener('pointerleave',()=>this.pointer=0);
  if(this.next)this.next.onclick=()=>{if(this.progress<.68)this.jump(.88);else{this.radio=!this.radio;this.wide=this.radio}};
  section.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='radio'){this.radio=!this.radio;this.wide=this.radio}else{this.radio=false;this.wide=false;setMood(b.dataset.view==='dance'?1:0)}if(this.progress<.68)this.jump(.88)});
  section.querySelector('input[type=range]').addEventListener('pointerdown',()=>{this.radio=false;this.wide=false});
  this.resize();this.load();
 }
 jump(p){const r=this.section.getBoundingClientRect();window.scrollTo({top:scrollY+r.top+(this.section.offsetHeight-this.sticky.clientHeight)*p,behavior:document.body.classList.contains('paused')?'instant':'smooth'})}
 resize(){this.w=this.sticky.clientWidth;this.h=this.sticky.clientHeight;this.dpr=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.dirty=true}
 async load(){try{
  const paths={chair:'chair',feather:'feather',lamp:'lamp',radio:'radio-full',emptyRadio:'radio-empty',sofa:'sofa-empty',leraStill:'lera-still',arturStill:'artur-still'};this.images={};
  const read=async src=>{const im=new Image();im.src=src;await im.decode();return im};
  await Promise.all(Object.entries(paths).map(async([k,p])=>this.images[k]=await read('/assets/journey-v5/'+p+'.webp')));
  const res=await fetch('/assets/journey-v5/cast.json');if(!res.ok)throw Error('Animation manifest unavailable');this.sheets=await res.json();await Promise.all(Object.entries(this.sheets).map(async([name,s])=>{s.image=await read(s.url);if(name==='lera-chill')s.image=this.keyBackdrop(s)}));
  this.radioLayer=document.createElement('canvas');this.radioLayer.width=1774;this.radioLayer.height=887;this.radioCtx=this.radioLayer.getContext('2d');
  this.loaded=true;this.section.dataset.ready='true';this.dirty=true;
 }catch(e){this.section.dataset.ready='error';if(this.copy)this.copy.textContent='Сцена загружается не полностью. Обновите страницу.';console.warn('Wave journey:',e.message)}}
 keyBackdrop(s){
  // Key only the edge-connected studio backing. The actor, tablet and sofa remain one layer.
  const out=document.createElement('canvas');out.width=s.image.width;out.height=s.image.height;const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(s.image,0,0);const w=s.width,h=s.height,n=w*h,q=new Int32Array(n),seen=new Uint8Array(n);
  for(let f=0;f<s.frames;f++){const ox=f%s.columns*w,oy=Math.floor(f/s.columns)*h,im=c.getImageData(ox,oy,w,h),d=im.data;seen.fill(0);let head=0,tail=0;const add=i=>{if(i<0||i>=n||seen[i])return;seen[i]=1;const j=i*4;if(d[j]<56&&d[j+1]<47&&d[j+2]<64&&Math.abs(d[j]-d[j+1])<23){q[tail++]=i;d[j+3]=0}};for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}while(head<tail){const i=q[head++],x=i%w;add(i-w);add(i+w);if(x)add(i-1);if(x<w-1)add(i+1)}c.putImageData(im,ox,oy)}return out;
 }
 image(im,x,y,w,h,alpha=1,brightness=1){if(!im||alpha<.002)return;const c=this.ctx;c.save();c.globalAlpha*=alpha;if(brightness!==1)c.filter=`brightness(${brightness}) saturate(${brightness<.4?.55:1})`;c.drawImage(im,x,y,w,h);c.restore()}
 sprite(name,clock,x,y,w,h,alpha=1,brightness=1){const s=this.sheets[name];if(!s||alpha<.002)return;const fr=Math.floor(clock/s.duration)%s.frames,c=this.ctx;c.save();c.globalAlpha*=alpha;if(brightness!==1)c.filter=`brightness(${brightness})`;c.drawImage(s.image,fr%s.columns*s.width,Math.floor(fr/s.columns)*s.height,s.width,s.height,x,y,w,h);c.restore()}
 glow(x,y,rx,ry,color,opacity){if(opacity<.001)return;const c=this.ctx;c.save();c.translate(x,y);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,`rgba(${color},${opacity})`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore()}
 ellipse(x,y,rx,ry,fill){const c=this.ctx;c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
 beam(x0,y0,x,y,width,color,alpha){const c=this.ctx;c.save();c.globalCompositeOperation='screen';const g=c.createLinearGradient(x0,y0,x,y);g.addColorStop(0,`rgba(${color},${alpha*.28})`);g.addColorStop(.65,`rgba(${color},${alpha*.6})`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.beginPath();c.moveTo(x0-8,y0);c.lineTo(x-width,y);c.quadraticCurveTo(x,y+65,x+width,y);c.lineTo(x0+8,y0);c.fill();this.glow(x,y-50,width*1.4,100,color,alpha*.5);c.restore()}
 hero(mix,p,e,paused){
  const c=this.ctx,w=this.w,h=this.h,t=this.clock,exit=smooth(.08,.34,p),size=Math.min(w*(w<800?.76:.42),h*.37),x=w*.5+(this.look*20),y=h*(w<800?.28:.27)-exit*h*.12,scale=1-exit*.5,rot=paused?0:Math.sin(t*.35)*.045+this.look*.08;
  c.save();c.globalAlpha=1-exit;c.translate(x,y+(paused?0:Math.sin(t*.8)*9));c.rotate(rot);c.scale(scale,scale);
  const chairAlpha=1-smooth(.08,.72,mix),morph=smooth(.05,.8,mix),cw=size*(1-morph*.24),ch=size*(1-morph*.12),lift=paused?0:e.bass*5;
  if(chairAlpha>.001&&this.loaded){
   if(!this.chairLayer){this.chairLayer=document.createElement('canvas');this.chairLayer.width=this.chairLayer.height=760;this.chairCtx=this.chairLayer.getContext('2d')}
   const q=this.chairCtx,im=this.images.chair,ratio=700/size;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,760,760);q.translate(380,380);
   for(let i=0;i<70;i++){const sx=im.width*i/70,sw=im.width/70,phase=i/70,dy=Math.sin(phase*7+t*1.8)*(1-mix)*(paused?0:1.3+e.mid*4),dx=(phase-.5)*cw,pinch=1-morph*.32*Math.sin(phase*Math.PI);q.drawImage(im,sx,0,sw,im.height,dx*ratio,(-ch*.5+dy-lift)*ratio,cw/70*ratio+.6,ch*pinch*ratio)}
   c.save();c.globalAlpha*=chairAlpha;c.drawImage(this.chairLayer,-380/ratio,-380/ratio,760/ratio,760/ratio);c.restore()
  }
  const ba=smooth(.25,.93,mix);if(ba>.001&&this.ball.drawn){c.save();c.globalAlpha*=ba;c.drawImage(this.ball.canvas,-size*.47,-size*.47,size*.94,size*.94);c.restore()}
  c.restore();
  if(this.loaded){for(let i=0;i<12;i++){const a=i*2.399+t*(.09+(i%3)*.025),r=size*(.62+(i%4)*.12),fx=x+Math.cos(a)*r,fy=y+Math.sin(a*.83)*r*.7,fs=lerp(25,76,(i%5)/4)*(w<800?.65:1);c.save();c.translate(fx,fy);c.rotate(a*.8);this.image(this.images.feather,-fs/2,-fs/2,fs,fs,(1-exit)*(1-mix)*(.35+(i%4)*.13));c.restore()}}
  if(mix>.01){c.save();c.globalAlpha=(1-exit)*mix;c.globalCompositeOperation='screen';this.beam(w*.1,-20,x,y,size*.14,'239,220,255',.18+e.treble*.11);this.beam(w*.95,h*.03,x,y,size*.12,'206,236,255',.14);for(let i=0;i<32;i++){const a=t*.2+i*2.399,r=(.2+(i%7)*.1)*w,px=x+Math.cos(a)*r,py=y+Math.sin(a*.61)*r*.6;this.glow(px,py,4+i%4,3,'244,230,255',.15+e.treble*.3);c.fillStyle=`rgba(255,241,255,${.15+e.treble*.3})`;c.fillRect(px,py,3,2)}c.restore()}
 }
 screen(mix,build,light,e){const c=this.ctx,t=this.clock;c.save();c.translate(900,280);c.scale(1,Math.max(.001,build));c.globalAlpha=build;c.shadowColor=mix<.5?'#e9a8d24f':'#b56aff70';c.shadowBlur=25;
  c.fillStyle='#07080d';c.beginPath();c.roundRect(-385,-195,770,390,20);c.fill();c.shadowBlur=0;c.beginPath();c.roundRect(-375,-185,750,370,12);c.clip();
  const g=c.createLinearGradient(-375,-185,375,185);g.addColorStop(0,mix<.5?'#77485f':'#24103f');g.addColorStop(1,mix<.5?'#342333':'#0b3c32');c.fillStyle=g;c.fillRect(-380,-190,760,380);
  c.globalCompositeOperation='screen';for(let j=0;j<5;j++){c.strokeStyle=`rgba(${mix<.5?'249,199,218':'145,235,191'},${.13+j*.018})`;c.lineWidth=2+j*.8;c.beginPath();for(let x=-390;x<395;x+=6){const y=90+Math.sin(x*.009+t*(mix<.5?.45:1.6)+j*.7)*(20+e.mid*30)+j*9;x===-390?c.moveTo(x,y):c.lineTo(x,y)}c.stroke()}c.globalCompositeOperation='source-over';
  c.textAlign='center';c.fillStyle='#ffedf6';c.font='400 18px Graphik, Arial';if(!this.demo)c.fillText('МЕГАФОН · НОВЫЙ ГОД',0,-112);c.font='600 52px Graphik, Arial';c.fillText('НА СВОЕЙ ВОЛНЕ',0,-44);c.font='400 17px Graphik, Arial';c.fillStyle='#eed7e4';if(!this.demo)c.fillText(mix<.5?'ТЁПЛЫЕ СЛОВА. МЯГКАЯ ВОЛНА.':'ВАШИ СЛОВА. НАШ РИТМ.',0,3);
  const base=.45+.55*light;c.fillStyle=`rgba(5,3,11,${1-base})`;c.fillRect(-380,-190,760,380);c.restore()}
 radioImage(chill,dance){const c=this.radioCtx,w=1774,h=887;c.clearRect(0,0,w,h);c.drawImage(this.images.emptyRadio,0,0,w,h);c.save();c.beginPath();c.rect(w*.30,0,w*.43,h);c.rect(0,h*.55,w,h*.45);c.clip();c.drawImage(this.images.radio,0,0,w,h);c.restore();for(const[a,x,ww]of[[1-chill,0,w*.31],[1-dance,w*.72,w*.28]]){c.save();c.globalAlpha=a;c.beginPath();c.rect(x,0,ww,h*.56);c.clip();c.drawImage(this.images.radio,0,0,w,h);c.restore()}return this.radioLayer}
 candles(build,level){const c=this.ctx,t=this.clock;c.save();c.globalAlpha=build;for(let i=0;i<3;i++){const x=145+i*40,y=846-i%2*19,h=42+i*15;c.fillStyle=`rgba(235,215,201,${.18+level*.6})`;c.beginPath();c.roundRect(x,y-h,28,h,5);c.fill();const flick=.8+Math.sin(t*7+i*4)*.11+Math.sin(t*13+i)*.07;if(level>.2){this.glow(x+14,y-h-10,42,53,'255,170,75',level*.29*flick);c.fillStyle=`rgba(255,221,149,${level})`;c.beginPath();c.ellipse(x+14+Math.sin(t*5+i)*1.2,y-h-10,3*flick,9*flick,Math.sin(t*3+i)*.12,0,Math.PI*2);c.fill();c.fillStyle='#fff1d1';c.beginPath();c.ellipse(x+14,y-h-7,1.8,4,0,0,Math.PI*2);c.fill()}}c.restore()}
 studio(p,mix,e,paused,dt){
  if(!this.loaded)return;const c=this.ctx,w=this.w,h=this.h,t=this.clock,appear=smooth(.14,.3,p),bFloor=smooth(.14,.3,p),bScreen=smooth(.23,.43,p),bRadio=smooth(.30,.50,p),bZones=smooth(this.demo?.32:.42,this.demo?.45:.65,p),bPeople=smooth(.57,.72,p),focus=this.focus,lf=lightingFor(mix,focus),ch=focus*(1-mix),da=focus*mix;
  const stageH=Math.max(290,h-(this.demo?(w<800?280:220):(w<800?360:315))),fitWide=Math.min(w/(this.demo?2050:1900),stageH/920),fitClose=w<800?Math.min(w/900,stageH/900):fitWide*(this.demo?1.12:1),cameraProgress=this.demo?focus:smooth(.55,.72,p),goalFit=lerp(fitWide,fitClose,this.wide?0:cameraProgress),center=lerp(900,lerp(w<800?330:700,w<800?1430:1100,mix),!this.wide&&(this.demo||w<800)?cameraProgress:0);
  this.cameraCenter=paused?center:lerp(this.cameraCenter??center,center,1-Math.exp(-dt*4));const fit=goalFit,originX=w/2-this.cameraCenter*fit+(paused?0:this.look*8),originY=this.demo?lerp(h*(w<800?.16:.11)+(stageH-900*fitWide)*.35,(h-(w<800?240:190))-865*fit,cameraProgress):(w<800?h*.21:h*.19)+(stageH-900*fit)*.45;
  this.stageGeometry={fit,x:originX,y:originY};c.save();c.translate(originX,originY);c.scale(fit,fit);c.globalAlpha=appear;
  this.ellipse(900,854,920*bFloor,135*bFloor,'#221a2b');this.ellipse(900,848,890*bFloor,120*bFloor,'#1b1522');
  this.glow(360,810,440,120,'240,158,195',bZones*(.035+ch*.12));this.glow(1470,810,330,105,'126,102,255',bZones*(.03+da*.18));
  this.screen(mix,bScreen,1-focus*.25,e);
  this.ellipse(900,810,410*bRadio,58*bRadio,'#0b080e');
  const radio=this.radioImage(ch*bPeople,da*bPeople),rx=500,ry=420,rw=800,rh=400;
  // The desk lifts first. Four seating positions assemble one after another.
  c.save();c.globalAlpha=bRadio;c.translate(rx,ry+(1-bRadio)*280);c.filter=`brightness(${lf.radio})`;c.drawImage(radio,0,887*.55,1774,887*.45,0,rh*.55,rw,rh*.45);c.restore();
  for(let i=0;i<4;i++){const b=this.demo?smooth(.24+i*.028,.36+i*.028,p):smooth(.35+i*.035,.51+i*.035,p);c.save();c.globalAlpha=b;c.filter=`brightness(${lf.radio})`;c.translate(rx+i*rw/4,ry+(1-b)*150);c.drawImage(radio,i*1774/4,0,1774/4,887*.56,0,0,rw/4,rh*.56);c.restore()}
  c.save();c.translate(-75,415+(1-bZones)*240);c.globalAlpha=bZones;
  this.image(this.images.sofa,0,0,650,433,1-ch*bPeople,lf.chill);
  if(ch*bPeople>.001)this.sprite('lera-chill',this.readClock,0,0,650,433,ch*bPeople,lf.chill);
  c.restore();
  this.image(this.images.lamp,24,205+(1-bZones)*150,205,550,bZones,lf.chill);this.candles(bZones,lf.chill);
  this.glow(138,340,150,180,'255,185,110',ch*bZones*(.16+Math.sin(t*1.3)*.015));
  this.ellipse(1470,825,265*bZones,74*bZones,`rgba(111,78,170,${.12+da*.2})`);this.ellipse(1470,825,250*bZones,65*bZones,'#120c1b');
  this.image(this.ball.canvas,1365,70+(1-bZones)*190,245,245,bZones,lf.dance);
  if(da*bPeople>.001){this.ellipse(1480,817,85,15,'#09060dcc');this.sprite('artur-dance',this.danceClock,1300,295,350,525,da*bPeople,lf.dance)}
  c.save();c.globalCompositeOperation='screen';if(ch>.01)this.beam(300,-90,350,805,270,'255,201,180',ch*.32);if(da>.01){this.beam(1760,-120,1460,780,210,'221,191,255',da*(.30+e.mid*.12));this.beam(990,-80,1485,193,130,'255,246,255',da*.21);for(let i=0;i<65;i++){const a=t*.3+i*2.399,px=1455+Math.cos(a)*440,py=520+Math.sin(a*.77)*310,alpha=da*(.16+e.treble*.4)*(i%3?.6:1);c.save();c.translate(px,py);c.rotate(a);c.fillStyle=`rgba(239,223,255,${alpha})`;c.fillRect(-5,-2,10,4);c.restore();if(i%15===0){c.strokeStyle=`rgba(236,219,255,${alpha*.35})`;c.lineWidth=1;c.beginPath();c.moveTo(1487,192);c.lineTo(px,py);c.stroke()}}}c.restore();
  c.restore();this.section.dataset.lightChill=lf.chill.toFixed(2);this.section.dataset.lightDance=lf.dance.toFixed(2);this.section.dataset.castCount='4';
 }
 paint(dt,mix,paused,audio=quiet){
  if(!this.visible||document.hidden)return;const rect=this.section.getBoundingClientRect(),target=sceneProgress(rect.top,this.section.offsetHeight,this.sticky.clientHeight);this.progress=paused?target:lerp(this.progress,target,1-Math.exp(-dt*16));const p=this.progress,e=paused?quiet:audio;
  if(!paused){this.clock+=dt;this.danceClock+=dt*(.85+e.bass*.25);this.readClock+=dt*.65}
  this.look=paused?0:lerp(this.look,this.pointer,1-Math.exp(-dt*3));const mode=mix>=.5?1:0;if(this.lastMode!==-1&&mode!==this.lastMode){this.radio=false;this.wide=false}this.lastMode=mode;
  const goalFocus=this.radio?0:smooth(this.demo?.67:.62,this.demo?.85:.72,p);this.focus=paused?goalFocus:lerp(this.focus,goalFocus,1-Math.exp(-dt*3.5));
  const titleOpacity=1-smooth(.08,.31,p),headingOpacity=smooth(.40,.65,p);this.title.style.opacity=titleOpacity.toFixed(3);this.title.style.transform=`translateX(-50%) translateY(${-p*80}px) scale(${1-p*.12})`;this.title.style.pointerEvents=titleOpacity>.05?'auto':'none';if(this.heading)this.heading.style.opacity=headingOpacity.toFixed(3);if(this.zones){this.zones.style.opacity=smooth(.62,.72,p).toFixed(3);this.zones.style.pointerEvents=p>.7?'auto':'none'};
  this.section.style.setProperty('--journey-progress',p.toFixed(4));const state=p<.15?'mood':p<.7?'assembling':this.radio?'radio':mode?'dance':'chill';if(state!==this.state){this.state=state;this.section.dataset.scene=state;if(this.next)this.next.textContent=p<.68?'Собрать студию':this.radio?'Вернуться к волне':'Общий план';if(this.copy&&!this.demo)this.copy.innerHTML=state==='mood'?'Выберите настроение.<br>Остальное подстроится.':state==='assembling'?'Ваша волна<br>становится эфиром.':state==='radio'?'Двое ведущих. Двое гостей.<br>В центре общего эфира.':mode?'Артур Габидуллин.<br>Ваши приветы — в ритме Dance.':'Лера Сибгатуллина.<br>Тёплые слова на волне Chill.';this.zones?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(this.radio?'radio':mode?'dance':'chill'))))}
  this.section.dataset.progress=p.toFixed(3);this.section.dataset.audioReactive=String(e.active);this.section.dataset.lera=this.focus*(1-mix)>.5?'seated-reading':'radio';this.section.dataset.artur=this.focus*mix>.5?'dancing-rapping':'radio';
  this.budget+=dt;if(!this.dirty&&this.budget<1/30)return;const elapsed=this.budget;this.budget=0;this.dirty=false;this.ball.paint(elapsed,1,paused,true,e);
  const c=this.ctx,w=this.w,h=this.h;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);c.fillStyle='#17111d';c.fillRect(0,0,w,h);
  const heroA=1-smooth(.10,.40,p);this.glow(w*.42,h*.30,w*.55,h*.65,'183,109,143',heroA*(1-mix)*.30);this.glow(w*.64,h*.3,w*.53,h*.63,'80,56,133',heroA*mix*.20);
  this.studio(p,mix,e,paused,dt);this.hero(mix,p,e,paused);
 }
}
