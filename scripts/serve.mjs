import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configuration } from './config.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),isDist=process.argv.includes('--dist');
const dir=path.join(root,isDist?'dist':'src'),pi=process.argv.indexOf('--port');
const port=Number(pi>=0?process.argv[pi+1]:process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
  if(name.split('/').some(x=>x==='..'||x.startsWith('.'))){res.writeHead(403);return res.end();}
  if(name==='config.json'&&!isDist){res.writeHead(200,{'Content-Type':types['.json'],'Cache-Control':'no-store'});return res.end(JSON.stringify(configuration(root)));}
  let file=path.join(dir,name);try{await fs.access(file);}catch{if(!isDist)file=path.join(root,'public',name);}
  const content=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Файл не найден');}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`NEO FIT: http://127.0.0.1:${port} (${isDist?'dist':'source'})`));
