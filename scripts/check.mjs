import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));let count=0;
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(/\.(js|mjs)$/.test(p)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status)throw Error(r.stderr);count++;}else if(p.endsWith('.json'))JSON.parse(await fs.readFile(p,'utf8'));}}
await walk(path.join(root,'src'));await walk(path.join(root,'scripts'));
const main=await fs.readFile(path.join(root,'src/main.js'),'utf8');
if(/data-action="export-html"|function exportHTML\(/.test(main))throw Error('Obsolete HTML export found');
const html=await fs.readFile(path.join(root,'src/index.html'),'utf8');
if(/embedded-vault|embedded-data/.test(html))throw Error('Public HTML must not contain user snapshots');
console.log(`${count} JS modules checked; JSON syntax and public shell checks passed.`);
