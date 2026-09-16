/** Run only on the OWNER's computer with GitHub CLI authenticated via gh auth login. */
import {spawnSync} from 'node:child_process';import {createInterface} from 'node:readline/promises';import {stdin,stdout} from 'node:process';import {fileURLToPath} from 'node:url';import {configuration} from './config.mjs';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
function cmd(bin,args,check=true){const r=spawnSync(bin,args,{encoding:'utf8',stdio:['inherit','pipe','pipe'],shell:false});if(check&&(r.error||r.status))throw Error((r.stderr||r.error?.message||'Command failed').trim());return r;}
try{
 cmd('git',['--version']);cmd('gh',['--version']);cmd('gh',['auth','status']);
 const owner=cmd('gh',['api','user','--jq','.login']).stdout.trim();
 const rl=createInterface({input:stdin,output:stdout});
 const name=(await rl.question('Название НОВОГО репозитория [neo-fit]: ')).trim()||'neo-fit';
 if(!/^[a-zA-Z0-9._-]{1,80}$/.test(name))throw Error('Некорректное название.');
 const remote=cmd('git',['remote','get-url','origin'],false);
 if(remote.status===0)throw Error('В папке уже задан origin. Скрипт не меняет существующие репозитории.');
 if(cmd('gh',['repo','view',`${owner}/${name}`],false).status===0)throw Error('Репозиторий уже существует. Скрипт создаёт только новый, ничего не перезаписывает.');
 const yes=await rl.question(`Будет создан ПУБЛИЧНЫЙ репозиторий ${owner}/${name}, только с кодом приложения. Продолжить? Напиши ДА: `);rl.close();if(yes!=='ДА')process.exit(0);
 cmd(process.execPath,['scripts/check.mjs']);cmd('git',['init','-b','main']);
 // An allowlist is safer than git add .: the owner's backups and .env stay off GitHub.
 cmd('git',['add','src','public','scripts','tests','supabase','.github','.gitignore','.env.example','package.json','package-lock.json','README.md','START-WINDOWS.cmd','docs']);
 cmd('git',['commit','-m','Build NEO FIT 3: modular app and automatic persistence']);
 cmd('gh',['repo','create',`${owner}/${name}`,'--public','--source=.','--remote=origin','--description','Private fitness journal app. Personal data stays outside the repository.']);
 const c=configuration(process.cwd());
 if(c.supabaseUrl&&c.publishableKey){cmd('gh',['variable','set','SUPABASE_URL','--repo',`${owner}/${name}`,'--body',c.supabaseUrl]);cmd('gh',['variable','set','SUPABASE_PUBLISHABLE_KEY','--repo',`${owner}/${name}`,'--body',c.publishableKey]);}
 cmd('git',['push','-u','origin','main']);
 const pages=cmd('gh',['api',`repos/${owner}/${name}/pages`,'--method','POST','-f','build_type=workflow'],false);
 console.log(`Код загружен: https://github.com/${owner}/${name}`);
 console.log(pages.status===0?'GitHub Pages включён. Дождись успешного workflow.':'Открой Settings → Pages и выбери GitHub Actions.');
 if(!c.supabaseUrl)console.log('База пока не подключена: публикация остановится на проверке настроек. См. README.');
}catch(e){console.error('Публикация остановлена:',e.message,'\nПароли и токены в чат отправлять не нужно.');process.exitCode=1;}
