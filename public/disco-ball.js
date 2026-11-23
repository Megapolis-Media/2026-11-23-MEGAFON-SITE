// A small rotating 3D mirror sphere. The generated poster remains the fallback.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=255)=>Math.min(b,Math.max(a,v));
export class DiscoBall {
 constructor(host){
  this.host=host;this.clock=0;this.budget=0;this.drawn=false;
  this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-hidden','true');this.canvas.className='disco-canvas';host.append(this.canvas);this.ctx=this.canvas.getContext('2d');
  this.tiles=[];const rows=26,cols=48;
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){
   const t0=(r+.035)*Math.PI/rows,t1=(r+.965)*Math.PI/rows,p0=(col+.035)*TAU/cols,p1=(col+.965)*TAU/cols;
   const point=(t,p)=>[Math.sin(t)*Math.sin(p),Math.cos(t),Math.sin(t)*Math.cos(p)];
   this.tiles.push({points:[point(t0,p0),point(t0,p1),point(t1,p1),point(t1,p0)],normal:point((t0+t1)/2,(p0+p1)/2),seed:r*71+col*17});
  }
 }
 paint(dt,mix,paused,visible=true,audio={}){
  if(!this.ctx||!visible||mix<.002||!this.host.clientWidth)return;
  if(!paused)this.clock+=dt;
  this.budget+=dt;if(this.drawn&&(paused||this.budget<1/24))return;this.budget=0;
  const size=Math.round(this.host.clientWidth*Math.min(devicePixelRatio||1,2));
  if(this.canvas.width!==size){this.canvas.width=this.canvas.height=size;}
  const c=this.ctx,w=size,radius=w*.48,angle=this.clock*.35+.35;
  const cs=Math.cos(angle),sn=Math.sin(angle),tilt=-.15,ct=Math.cos(tilt),st=Math.sin(tilt);
  const rotate=([x,y,z])=>{const a=x*cs+z*sn,b=z*cs-x*sn;return[a*ct-y*st,a*st+y*ct,b]};
  const project=([x,y,z])=>[w/2+x*radius,w/2-y*radius];
  c.clearRect(0,0,w,w);c.fillStyle='#12151e';c.beginPath();c.arc(w/2,w/2,radius,0,TAU);c.fill();
  const front=this.tiles.map(tile=>({...tile,n:rotate(tile.normal)})).filter(tile=>tile.n[2]>0).sort((a,b)=>a.n[2]-b.n[2]);
  let glints=[];
  for(const tile of front){
   const [nx,ny,nz]=tile.n,rx=2*nz*nx,ry=2*nz*ny,rz=2*nz*nz-1;
   const box=Math.exp(-Math.pow((rx+.36)/.3,8)-Math.pow((ry-.35)/.52,8))*Math.max(0,(rz+.6));
   const strip=Math.exp(-Math.pow((rx-.72)/.095,2)-Math.pow((ry+.2)/.72,4));
   const violet=Math.exp(-Math.pow((rx-.22)/.24,2)-Math.pow((ry+.4)/.62,4));
   const rim=Math.pow(1-nz,2),variation=((tile.seed%11)-5)*1.1,base=45+nz*40+rim*30+variation+(paused?0:(audio.rms||0)*16);
   const color=[base+box*150+violet*58,base+box*162+strip*146,base+box*175+violet*102+strip*34];
   c.fillStyle=`rgb(${color.map(v=>Math.round(clamp(v*(this.host.exposure||1)))).join(',')})`;
   const corners=tile.points.map(p=>project(rotate(p)));c.beginPath();corners.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
   if(box>1.15&&tile.seed%43===0)glints.push(project(tile.n));
  }
  const rim=c.createRadialGradient(w*.35,w*.28,w*.18,w*.5,w*.5,radius);rim.addColorStop(0,'#ffffff00');rim.addColorStop(.8,'#ffffff00');rim.addColorStop(1,'#cde5e64a');c.fillStyle=rim;c.beginPath();c.arc(w/2,w/2,radius,0,TAU);c.fill();
  c.fillStyle='#fff';for(const[x,y]of glints.slice(0,2)){const s=w*.045;c.beginPath();c.moveTo(x-s,y);c.quadraticCurveTo(x,y,x,y-s);c.quadraticCurveTo(x,y,x+s,y);c.quadraticCurveTo(x,y,x,y+s);c.quadraticCurveTo(x,y,x-s,y);c.fill();}
  this.host.classList.add('disco-ready');this.drawn=true;
 }
}
