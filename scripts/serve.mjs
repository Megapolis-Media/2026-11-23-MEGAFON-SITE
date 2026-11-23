import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.argv[2]||'public'),dev=root===resolve('public'),port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let path=resolve(root,'.'+pathname);if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return}
 if(['/','/index.html','/experience','/experience/'].includes(pathname))path=dev?resolve('index.html'):resolve(root,'index.html');
 const file=await stat(path);if(!file.isFile()){res.writeHead(404);res.end();return}
 const headers={'Content-Type':mime[extname(path)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
 let start=0,end=file.size-1,status=200;
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${file.size}`});res.end();return}
  if(!match[1])start=Math.max(0,file.size-Number(match[2]));else start=Number(match[1]);if(match[1]&&match[2])end=Math.min(end,Number(match[2]));
  if(start>end||start>=file.size){res.writeHead(416,{'Content-Range':`bytes */${file.size}`});res.end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${file.size}`;
 }
 headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD')res.end();else createReadStream(path,{start,end}).on('error',()=>res.destroy()).pipe(res);
}catch{res.writeHead(404);res.end('Not found')}}).listen(port,'127.0.0.1',()=>console.log(`Demo: http://localhost:${port}`));
