import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {N,configureTemplates} from '../src/lib/domain.js';
import {S} from '../src/lib/storage.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
configureTemplates({library:read('../src/data/library.json'),neo:read('../src/data/programs/neo.json'),vika:read('../src/data/programs/vika.json'),starters:read('../src/data/programs/general.json')});
const base=()=>N.defaultState('tester','Тест','neo');
const memory=()=>({data:{},getItem(k){return this.data[k]||null},setItem(k,v){this.data[k]=v},removeItem(k){delete this.data[k]}});
const vault=()=>({app:'neo-fit-vault',version:1,accounts:[]});
function session(s){N.startWorkout(s,s.programs[0].id,'2026-01-06');return s.draft;}
function tracker(s){const t={id:N.uid(),category:'supplement',name:'Тестовый пункт',amount:'Количество пользователя',notes:'',start:'2026-01-01',end:'',weekdays:[0,1,2,3,4,5,6],times:['08:00','20:00']};s.trackers.push(t);return t;}
test('empty and two templates validate',()=>{for(const p of ['empty','neo','vika'])assert.equal(N.validate(N.defaultState('tester','Имя',p)).schemaVersion,3)});
test('PDF keeps five lateral-raise rows and blanks actual weights',()=>{const s=N.defaultState('tester','Имя','vika');assert.deepEqual(s.programs.map(p=>p.exercises.map(e=>e.sets)),[[4,4,4,4,4],[4,4,4,5,4]]);N.startWorkout(s,s.programs[1].id,'2026-01-08');assert(s.draft.exercises.every(e=>e.logs.every(l=>l.weight===''&&!l.done)));assert.equal(s.history.length,0)});
test('real calendar dates and timezone day boundary',()=>{assert.equal(N.validDay('2026-02-30'),false);assert.equal(N.addDays('2026-12-31',1),'2027-01-01');assert.equal(N.dateKey(new Date('2026-01-01T22:00:00Z'),'Europe/Moscow'),'2026-01-02')});
test('comma decimal weights; blank and fractional repeats rejected',()=>{assert(N.validLog({weight:'17,5',reps:'12',rir:''}));for(const weight of ['',-1,'NaN'])assert(!N.validLog({weight,reps:'12',rir:''}));assert(!N.validLog({weight:'10',reps:'2.5',rir:''}))});
test('adding a live exercise leaves template unchanged',()=>{const s=base(),d=session(s),before=s.programs[0].exercises.length,e=N.fromLibrary('crunch-floor');d.exercises.push({...e,logs:N.makeLogs(e),skipped:false});assert.equal(s.programs[0].exercises.length,before);assert.equal(d.exercises.length,before+1);N.validate(s)});
test('snapshot not aliased to template',()=>{const s=base(),d=session(s),old=d.exercises[0].name;s.programs[0].exercises[0].name='Новое название';assert.equal(d.exercises[0].name,old)});
test('finished workout is idempotently guarded',()=>{const s=base(),d=session(s);Object.assign(d.exercises[0].logs[0],{weight:'1',reps:'10',done:true});N.finishWorkout(s);assert.equal(s.history.length,1);assert.equal(s.schedule.nextIndex,1);assert.throws(()=>N.finishWorkout(s));assert.equal(s.history.length,1)});
test('zero completed sets cannot finish',()=>{const s=base();session(s);assert.throws(()=>N.finishWorkout(s))});
test('cannot replace entered results; can replace blank slots',()=>{const s=base(),d=session(s);d.exercises[0].logs[0].weight='1';assert.throws(()=>N.replaceExercise(d.exercises,d.exercises[0].id,N.fromLibrary('crunch-floor')));d.exercises[0].logs[0].weight='';N.replaceExercise(d.exercises,d.exercises[0].id,N.fromLibrary('crunch-floor'));assert.equal(d.exercises[0].catalogId,'crunch-floor')});
test('replacement list matches pattern, equipment and exclusions',()=>{const s=base(),e=s.programs[0].exercises[0],r=N.alternatives(e,s.profile);assert(r.length>0);assert(r.every(x=>x.pattern===e.pattern&&s.profile.equipment.includes(x.equipment)));s.profile.excluded=r[0].name;assert(!N.alternatives(e,s.profile).some(x=>x.name===r[0].name))});
test('rotation does not skip after elapsed weeks',()=>{const s=base();s.schedule.nextIndex=2;assert.equal(N.nextWorkout(s,'2026-05-01').program.id,s.programs[2].id)});
test('continuous queue keeps repeated templates across week boundaries',()=>{const s=N.defaultState('tester','Имя','vika');assert.deepEqual(s.schedule.queue,[s.programs[0].id,s.programs[1].id,s.programs[1].id]);assert.equal(N.nextWorkout(s,'2026-01-08').program.id,s.programs[0].id);s.schedule.nextIndex=1;assert.equal(N.nextWorkout(s,'2026-01-11').program.id,s.programs[1].id);N.skipQueue(s);assert.equal(N.nextWorkout(s,'2026-01-13').program.id,s.programs[1].id)});
test('JSON prototype keys rejected, HTML strings escaped',()=>{assert.throws(()=>N.parseJSON('{"__proto__":{"x":1}}'));assert(!N.h('<script>"').includes('<'));assert(!N.safeJSON({name:'</script>'}).includes('</script>'))});
test('unknown is not skipped and twice-daily creates two slots',()=>{const s=base();tracker(s);const os=N.occurrences(s,'2026-01-06','supplement');assert.equal(os.length,2);assert(os.every(o=>o.status==='unknown'));assert.equal(N.occurrences(s,'2025-12-31').length,0)});
test('intake dedup and audited correction preserve prior event',()=>{const s=base();tracker(s);const o=N.occurrences(s,'2026-01-06')[0];N.recordIntake(s,o,'taken','запись','09:00','факт');N.recordIntake(s,o,'taken','запись','09:00','факт');assert.equal(s.intakes.length,1);N.recordIntake(s,o,'skipped','исправлено');assert.equal(s.intakes.length,2);assert.equal(N.occurrences(s,o.day)[0].status,'skipped');assert.equal(s.intakes[1].supersedes,s.intakes[0].id)});
test('versioned regimen does not rewrite prior dates',()=>{const s=base(),t=tracker(s);const o=N.occurrences(s,'2026-01-06')[0];N.recordIntake(s,o,'taken');N.reviseTracker(s,t.id,{times:['10:00'],amount:'другое'},'2026-01-07');assert.equal(N.occurrences(s,'2026-01-06').length,2);assert.equal(N.occurrences(s,'2026-01-07').length,1);assert.equal(s.intakes[0].snapshot.amount,'Количество пользователя')});
test('cancelled future regimens produce no future slots',()=>{const s=base(),t=tracker(s);t.cancelled=true;assert.equal(N.occurrences(s,'2026-01-06').length,0)});
test('ICS never exposes item name or amount',()=>{const s=base();tracker(s);const text=N.calendarICS(s,'supplement','2026-01-06',2);assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,4);assert(!text.includes('Тестовый пункт'));assert(!text.includes('Количество пользователя'))});
test('nutrition formula, percent and kcal remain distinct',()=>{const s=base(),p={...s.profile,age:30,height:180,weight:80,sex:'m'};const a=N.nutrition(p,{...s.nutrition,activity:1.5});assert.equal(a.bmr,1780);assert.equal(a.maintenance,2670);const pct=N.nutrition(p,{...s.nutrition,activity:1.5,adjustment:10});const kcal=N.nutrition(p,{...s.nutrition,activity:1.5,adjustment:10,adjustmentUnit:'kcal'});assert.equal(pct.calories,2937);assert.equal(kcal.calories,2680)});
test('nutrition refuses missing profile and restricted categories',()=>{const s=base();assert.throws(()=>N.nutrition(s.profile,s.nutrition));assert.throws(()=>N.nutrition({...s.profile,age:17,height:180,weight:70,sex:'m'},s.nutrition));assert.throws(()=>N.nutrition({...s.profile,age:30,height:180,weight:80,sex:'m',specialNutrition:true},s.nutrition))});
test('macro over-allocation rejected rather than negative carbs',()=>{const s=base();assert.throws(()=>N.nutrition({...s.profile,age:30,height:180,weight:80,sex:'m'},{...s.nutrition,manualProtein:'500',manualFat:'350'}))});
test('starter generation checks questionnaire and limitations',()=>{const s=base();assert.throws(()=>N.generatePlan(s.profile));const p={...s.profile,completed:true,age:30,split:'full'};assert.equal(N.generatePlan(p).length,2);p.limitations='Боль';assert.throws(()=>N.generatePlan(p))});
test('same import not duplicated and unfinished target blocks program replacement',()=>{const s=base(),incoming=base(),d=session(incoming);Object.assign(d.exercises[0].logs[0],{weight:'1',reps:'1',done:true});N.finishWorkout(incoming);assert.equal(N.mergeImported(s,incoming),1);assert.equal(N.mergeImported(s,incoming),0);session(s);assert.throws(()=>N.mergeImported(s,incoming,{programs:true}));assert.equal(s.history.length,1)});
test('AES-GCM round trip and wrong password rejection',async()=>{const salt=Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64'),key=await S.derive('Test-Phrase-123',salt),doc=base(),encrypted=await S.seal(doc,key);assert(!encrypted.ciphertext.includes('tester'));assert.deepEqual(await S.unseal(encrypted,key),doc);const wrong=await S.derive('Wrong-Phrase-123',salt);await assert.rejects(S.unseal(encrypted,wrong))});
test('password rule accepts eight characters and rejects seven',()=>{assert.equal(S.credentials('tester','12345678'),'tester');assert.throws(()=>S.credentials('tester','1234567'),/Минимум 8 символов/)});
test('local profiles isolate data, password changes, old password denied',async()=>{const storage=memory(),a=new S.LocalStore(vault(),storage,'unit');await a.register('Tester','Test-Phrase-123','A','neo');a.data.profile.displayName='OnlyA';await a.save(a.data);const b=new S.LocalStore(vault(),storage,'unit');await b.register('Second','Other-Phrase-123','B','vika');assert.equal(b.data.history.length,0);assert.equal(b.data.programs.length,2);await a.changePassword('Test-Phrase-123','Changed-Phrase-123');const c=new S.LocalStore(vault(),storage,'unit');await assert.rejects(c.login('tester','Test-Phrase-123'));const d=await c.login('TESTER','Changed-Phrase-123');assert.equal(d.profile.displayName,'OnlyA');assert.equal(d.programs.length,4);assert.equal(storage.data.unit.includes('Test-Phrase'),false)});
test('two-tab conflict does not overwrite newer account',async()=>{const storage=memory(),a=new S.LocalStore(vault(),storage,'unit2');await a.register('Tester','Test-Phrase-123','A','neo');const b=new S.LocalStore(vault(),storage,'unit2');await b.login('tester','Test-Phrase-123');a.data.profile.displayName='new';await a.save(a.data);b.data.profile.displayName='old';await assert.rejects(b.save(b.data),/CONFLICT/);const c=new S.LocalStore(vault(),storage,'unit2');assert.equal((await c.login('tester','Test-Phrase-123')).profile.displayName,'new')});
test('v1 migration extracts explicit note once, preserving source note and originals',()=>{const s=base(),d=session(s);Object.assign(d.exercises[0].logs[0],{weight:'1',reps:'10',done:true});d.note='Panatta для пресса 2 подхода с 5кг по 8 повт';N.finishWorkout(s);const old={app:'moi-trenirovki',schemaVersion:1,program:s.programs,history:s.history,draft:null,notebookId:'synthetic-notebook',settings:{weekdays:[2,4,6]},nextIndex:1,sourceContext:'Synthetic test only'};const migrated=N.migrateV1(old);assert.equal(migrated.history[0].note,d.note);assert.equal(migrated.history[0].exercises.at(-1).logs[0].weight,'5');assert.equal(migrated.history[0].exercises.at(-1).logs.length,2);assert.equal(migrated.history[0].exercises.at(-1).rirMin,null);const target=base();assert.equal(N.mergeImported(target,migrated),1);assert.equal(N.mergeImported(target,N.migrateV1(old)),0);assert.equal(target.history[0].exercises.length,7)});
test('cloud adapter authenticates with user JWT, queues encrypted local copy and detects CAS conflict',async()=>{const nativeFetch=global.fetch,nativeStorage=global.localStorage;const mem=memory();global.localStorage=mem;const requests=[];let stored=null,version=0;const expires=Math.floor(Date.now()/1000)+3600;global.fetch=async (url,opts)=>{requests.push({url,opts});if(url.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'synthetic-user-token',refresh_token:'synthetic-refresh',expires_at:expires,user:{id:'synthetic-user',user_metadata:{displayName:'Tester'}}}),{status:200});if(url.includes('/diary_documents?'))return new Response(JSON.stringify(stored?[{document:stored,version}]:[]),{status:200});if(url.includes('/rpc/save_diary')){const body=JSON.parse(opts.body);if(body.p_expected!==version)return new Response(JSON.stringify({code:'40001'}),{status:409});version++;stored=body.p_document;return new Response(JSON.stringify(version),{status:200})}throw Error('Unexpected mock request');};try{const c=new S.CloudStore({supabaseUrl:'https://test-project.supabase.co',publishableKey:'synthetic-public-key',authDomain:'users.neo-fit.invalid'});await c.login('tester','Test-Phrase-123');await c.save(c.data);assert.equal(c.version,1);assert.equal(c.pending,false);assert(requests.filter(x=>x.url.includes('/rest/v1/')).every(x=>x.opts.headers.Authorization==='Bearer synthetic-user-token'));const cacheText=Object.entries(mem.data).filter(([k])=>k.includes(':cache:')).map(([,v])=>v).join('');const authText=Object.entries(mem.data).filter(([k])=>k.endsWith(':auth')).map(([,v])=>v).join('');assert(!cacheText.includes('synthetic-user-token'));assert(authText.includes('synthetic-user-token'));assert(!JSON.stringify(mem.data).includes('Test-Phrase-123'));assert(!cacheText.includes('schemaVersion'));version=2;await assert.rejects(c.save(c.data),/CONFLICT/);assert.equal(c.conflict,true);assert.equal(c.pending,true);await c.reload();assert.equal(c.version,2);assert.equal(c.conflict,false)}finally{global.fetch=nativeFetch;global.localStorage=nativeStorage}});
test('volatile storage is never reported as durable',async()=>{const mem=memory();mem.ephemeral=true;const s=new S.LocalStore(vault(),mem,'volatile');await s.register('tester','Test-Phrase-123','Tester','empty');assert.equal(s.persistence,false)});
test('import rejects numeric-field markup and malformed scheduled time',()=>{const s=base();s.programs[0].exercises[0].rirMin='<img src=x onerror=alert(1)>';assert.throws(()=>N.validate(s),/RIR/);const t=base();tracker(t);N.recordIntake(t,N.occurrences(t,'2026-01-06')[0],'taken');t.intakes[0].scheduledTime='<b>bad</b>';assert.throws(()=>N.validate(t),/отметки/)});

test('a reused local adapter reads the latest profile on login',async()=>{
 const mem=memory(),a=new S.LocalStore(vault(),mem,'fresh');await a.register('tester','Test-Phrase-123','Before','neo');
 const b=new S.LocalStore(vault(),mem,'fresh');await b.login('tester','Test-Phrase-123');
 b.data.profile.displayName='After';await b.save(b.data);a.logout();
 assert.equal((await a.login('tester','Test-Phrase-123')).profile.displayName,'After');
});
test('quota failure never commits a changed password',async()=>{
 const mem=memory(),s=new S.LocalStore(vault(),mem,'quota');await s.register('tester','Test-Phrase-123','Tester','empty');
 const good=mem.setItem;mem.setItem=()=>{throw Error('quota')};await assert.rejects(s.changePassword('Test-Phrase-123','Changed-Phrase-123'));
 mem.setItem=good;const after=new S.LocalStore(vault(),mem,'quota');assert.equal((await after.login('tester','Test-Phrase-123')).profile.username,'tester');
 s.data.profile.displayName='Still works';await s.save(s.data);assert.equal((await after.login('tester','Test-Phrase-123')).profile.displayName,'Still works');
});
test('failed local write remains a retry, not a saved revision',async()=>{
 const mem=memory(),s=new S.LocalStore(vault(),mem,'retry');await s.register('tester','Test-Phrase-123','Tester','empty');
 const before=s.account.version,good=mem.setItem;mem.setItem=()=>{throw Error('quota')};s.data.profile.displayName='Retry value';
 await assert.rejects(s.save(s.data));assert.equal(s.persistence,false);assert.equal(s.account.version,before);
 mem.setItem=good;await s.save(s.data);assert.equal(s.account.version,before+1);assert.equal(s.persistence,true);
});
test('cloud network outage retains an encrypted pending snapshot',async()=>{
 const original=global.localStorage;global.localStorage=memory();try{
  const c=new S.CloudStore({supabaseUrl:'https://test-project.supabase.co',publishableKey:'test',authDomain:'users.neo-fit.invalid'});
  c.version=4;c.username='tester';c.cacheKey='offline';c.salt=Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');c.key=await S.derive('Test-Phrase-123',c.salt);c.request=async()=>{throw Error('offline')};
  await assert.rejects(c.save(base()),/offline/);assert.equal(c.pending,true);assert.equal(c.version,4);assert.equal(c.conflict,false);
  const packed=JSON.parse(localStorage.getItem('offline'));const pending=await S.unseal(packed,c.key);assert.equal(pending.baseVersion,4);assert.equal(pending.pending,true);assert.equal(pending.document.profile.username,'tester');
  c.request=async()=>5;await c.save(pending.document);assert.equal(c.pending,false);assert.equal(c.version,5);
 }finally{global.localStorage=original;}
});
test('unilateral work allocates each side separately',()=>{
 const s=base(),e=s.programs.flatMap(p=>p.exercises).find(e=>e.unilateral);const logs=N.makeLogs(e);
 assert.equal(logs.length,e.sets*2);assert.equal(logs[0].side,'left');assert.equal(logs[1].side,'right');assert.notEqual(logs[0].id,logs[1].id);
});
test('editing a program after completion does not edit results',()=>{
 const s=base(),d=session(s);Object.assign(d.exercises[0].logs[0],{weight:'12',reps:'8',done:true});N.finishWorkout(s);
 const before=JSON.stringify(s.history);s.programs[0].exercises.splice(0,1,N.fromLibrary('crunch-floor'));assert.equal(JSON.stringify(s.history),before);N.validate(s);
});
test('public data contains no completed workouts or authentication secrets',()=>{
 for(const p of ['../src/data/programs/neo.json','../src/data/programs/vika.json']){const text=fs.readFileSync(new URL(p,import.meta.url),'utf8');assert(!/"password"|"access_token"|"refresh_token"|"finishedAt"|"done"\s*:\s*true/.test(text));}
 const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert(!source.includes('data-action="export-html"'));assert(!source.includes('function exportHTML('));
});

test('catalog and neutral starters cover the expanded public library',()=>{
 assert(N.library().length>=80);assert.equal(N.starterCatalog().length,4);
 for(const item of N.library()){assert(item.catalogId&&item.name&&item.aliases&&item.primaryMuscles.length&&item.difficulty&&item.measurement&&item.source);}
 for(const starter of N.starterCatalog()){const state=N.defaultState('tester','Имя',starter.id);assert(state.programs.length>=2);assert.deepEqual(state.schedule.queue,state.programs.map(p=>p.id));N.validate(state);}
});
test('structured supplement doses can differ by time and preserve snapshots',()=>{
 const s=base(),t={id:N.uid(),category:'supplement',name:'Пункт',form:'capsule',unit:'капс.',perDose:'1',substancePerUnit:'500 мг',foodRelation:'after-food',amount:'1',notes:'',start:'2026-01-01',end:'',weekdays:[0,1,2,3,4,5,6],times:['08:00','20:00'],doses:[{time:'08:00',amount:'1'},{time:'20:00',amount:'2'}]};
 s.trackers.push(t);N.validate(s);const os=N.occurrences(s,'2026-01-06');assert.deepEqual(os.map(x=>x.plannedAmount),['1','2']);N.recordIntake(s,os[1],'taken','','20:05','2');assert.equal(s.intakes[0].snapshot.amount,'2');
});
test('InBody import is idempotent and does not change profile weight',()=>{
 const s=base(),before=s.profile.weight,record={id:N.uid(),measuredAt:'2026-02-02',importedAt:'2026-02-03T00:00:00.000Z',source:'Synthetic test',sourceHash:'a'.repeat(64),metrics:{weight:72.3,skeletalMuscleMass:31.2,bodyFatPercent:21.4}};
 N.addInBody(s,record);N.addInBody(s,{...record,id:N.uid()});assert.equal(s.inBody.length,1);assert.equal(s.weights.filter(x=>x.date==='2026-02-02').length,1);assert.equal(s.profile.weight,before);N.validate(s);
});
test('cloud remembered session restores without password and keeps encrypted cache separate',async()=>{
 const oldFetch=global.fetch,oldLocal=global.localStorage,oldSession=global.sessionStorage;const local=memory(),session=memory();global.localStorage=local;global.sessionStorage=session;
 const expires=Math.floor(Date.now()/1000)+3600,auth={access_token:'restore-access',refresh_token:'restore-refresh',expires_at:expires,user:{id:'restore-user',email:'tester@users.neo-fit.invalid',user_metadata:{displayName:'Tester'}}};const document=base();
 global.fetch=async url=>{if(url.includes('/auth/v1/token'))return new Response(JSON.stringify(auth),{status:200});if(url.includes('/diary_documents?'))return new Response(JSON.stringify([{document,version:3}]),{status:200});throw Error('unexpected')};
 try{const config={supabaseUrl:'https://test-project.supabase.co',publishableKey:'public',authDomain:'users.neo-fit.invalid'};const first=new S.CloudStore(config);await first.login('tester','12345678',true);const second=new S.CloudStore(config);const restored=await second.restore();assert.equal(restored.profile.username,'tester');assert.equal(second.version,3);assert.equal(second.restoreView(),null);}
 finally{global.fetch=oldFetch;global.localStorage=oldLocal;global.sessionStorage=oldSession;}
});


test('InBody text parser recognizes a supported export without names',async()=>{
 const {parseInBodyText}=await import('../src/lib/inbody.js');
 const parsed=parseInBodyText('Дата 01.02.26 Вес Норма 75,4 кг Мышцы Норма 35.2 кг Жир Норма 18,1 % Оценка InBody 80 /100 Вода 45.5 л Белок 12.1 кг Кости 4.1 кг Висцеральный жир Ниже нормы 6 Индекс массы тела 22.4 Содержание Жира 13.6 кг Обмен веществ 1710 ккал');
 assert.equal(parsed.measuredAt,'2026-02-01');assert.equal(parsed.metrics.weight,75.4);assert.equal(parsed.metrics.skeletalMuscleMass,35.2);assert.equal(parsed.metrics.bodyFatPercent,18.1);assert.equal(parsed.metrics.bodyFatMass,13.6);
});
