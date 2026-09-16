import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { configuration } from './config.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root,'dist');
const config = configuration(root, process.argv.includes('--production') || process.env.REQUIRE_CLOUD === 'true');
await fs.rm(dist,{recursive:true,force:true}); await fs.mkdir(dist,{recursive:true});
await fs.cp(path.join(root,'src'),dist,{recursive:true});
await fs.cp(path.join(root,'public'),dist,{recursive:true});
await fs.writeFile(path.join(dist,'config.json'),JSON.stringify(config,null,2));
await fs.writeFile(path.join(dist,'.nojekyll'),'');
const files=[];
async function walk(dir, prefix=''){for(const item of await fs.readdir(dir,{withFileTypes:true})){const rel=prefix+item.name;if(item.isDirectory())await walk(path.join(dir,item.name),rel+'/');else files.push(rel);}}
await walk(dist);
const digest=createHash('sha256');for(const file of files.sort())digest.update(await fs.readFile(path.join(dist,file)));
const version=digest.digest('hex').slice(0,12);
// Only the application's public shell is cached. Never cache Auth/REST or personal documents.
const sw=`const FILES=${JSON.stringify(files.filter(f=>!f.startsWith('.')))};
const PREFIX='neo-fit-shell:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+'${version}';
const URLS=FILES.map(f=>new URL(f,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url);
 if(u.origin!==location.origin)return;
 const home=new URL(self.registration.scope);
 let url=u.href;if(u.pathname===home.pathname)url=new URL('index.html',home).href;
 if(!URLS.includes(url))return;
 if(u.pathname.endsWith('/config.json')){event.respondWith(fetch(event.request).then(async res=>{if(res.ok){const c=await caches.open(CACHE);await c.put(url,res.clone());}return res;}).catch(()=>caches.match(url)));return;}
 event.respondWith(caches.open(CACHE).then(async c=>(await c.match(url))||fetch(event.request)));
});\n`;
await fs.writeFile(path.join(dist,'sw.js'),sw);
console.log(`NEO FIT 3.0: ${files.length+1} public files → dist/ (${version}).`);
console.log(config.supabaseUrl?'Cloud configuration included. Remote deployment has NOT been performed.':'Local preview only: cloud is not configured.');
