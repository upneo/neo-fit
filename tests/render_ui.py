# Optional DOM integration/rendering test. Does not contact a real server.
# Requires Python Playwright and a local Chromium executable.
# Auth/crypto/storage are tested in the separate Node suite; this harness mounts
# the UI with synthetic data and an in-memory adapter, not a fake deployed login.
import json,re,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]; out=root/'test-results'; out.mkdir(exist_ok=True)
html=(root/'src/index.html').read_text()
html=re.sub(r'<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>','',html)
html=re.sub(r'<link[^>]*>','',html)
html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
css=(root/'src/style.css').read_text()+'\n'+(root/'src/ui/studio.css').read_text()
html=html.replace('</head>','<style>'+css+'</style></head>')
domain=(root/'src/lib/domain.js').read_text().replace('export function ','function ').replace('export const ','const ')
storage=(root/'src/lib/storage.js').read_text().replace('import { N } from "./domain.js";','').replace('export const ','const ')
main=(root/'src/main.js').read_text()
main=re.sub(r'^import .*?;\s*','',main,flags=re.M)
main=main.replace('const configuration = await loadConfiguration();\nconfigureTemplates(await loadTemplates());','')
# Renderer test uses an in-memory adapter. The real storage adapters are tested separately in Node.
main=main.replace("new URL('.', location.href).pathname","'/'")
hook='''
window.__uiTest={
 mount(preset='neo'){
  state=N.defaultState('neo','Neo',preset);state.profile.timeZone='Europe/Moscow';
  store={mode:'local',persistence:true,pending:false,conflict:false,account:{version:1},async save(doc){window.__lastSaved=clone(doc);this.account.version++;return this.account.version;},async logout(){}};
  lastSavedRevision=state.revision;saveError=false;setStatus('Сохранено на устройстве');ui.tab='today';ui.program=0;ui.historyEdit=null;ui.date=today();ui.month=ui.date.slice(0,7);render();
 },
 goto(tab){goto(tab)},snapshot(){return clone(state)},finishSave(){return persistNow()},
 seedTracker(){state.trackers.push({id:N.uid(),category:'supplement',name:'Моя добавка',amount:'По моей записи',notes:'',start:today(),end:'',weekdays:[0,1,2,3,4,5,6],times:['08:00','20:00']});render();}
};
'''
main=main.replace('    renderAuth();\n})();',hook+'    renderAuth();\n})();')
templates={k:json.loads((root/p).read_text()) for k,p in [('library','src/data/library.json'),('neo','src/data/programs/neo.json'),('vika','src/data/programs/vika.json')]}
config=json.loads((root/'src/config.json').read_text())
script='(()=>{'+domain+'\n'+storage+'\nconst configuration='+json.dumps(config)+';configureTemplates('+json.dumps(templates)+');\n'+main+'\n})();'
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('chrome'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.evaluate(script)
 page.screenshot(path=str(out/'auth-desktop.png'),full_page=True)
 page.evaluate("__uiTest.mount()")
 page.screenshot(path=str(out/'desktop.png'),full_page=True)
 checks.append({'scenario':'dashboard desktop','overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})
 for width in [390,320]:
  page.set_viewport_size({'width':width,'height':844})
  for tab in ['today','program','workout','history','supplements','peptides','nutrition','profile']:
   page.evaluate('(t)=>__uiTest.goto(t)',tab)
   checks.append({'scenario':f'{tab} {width}px','overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})
   if width==390 and tab in ['today','program']:
    page.screenshot(path=str(out/f'mobile-{tab}.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 page.evaluate("__uiTest.goto('program')")

 page.locator('[data-action="start"]').first.click()
 page.wait_for_timeout(200)
 if page.locator('#modal[open] [data-action="confirm"]').count():page.locator('#modal [data-action="confirm"]').click()
 page.locator('input[data-field="weight"]').first.fill('20')
 page.locator('input[data-field="reps"]').first.fill('10')
 page.locator('input[data-field="done"]').first.check()
 page.wait_for_timeout(350)
 checks.append({'scenario':'autosave edited completed set','passed':page.evaluate("__lastSaved.draft.exercises[0].logs[0].done && __lastSaved.draft.exercises[0].logs[0].weight==='20'")})
 page.screenshot(path=str(out/'mobile-workout.png'),full_page=True)
 page.locator('[data-action="add-ex"][data-kind="draft"]').click()
 page.screenshot(path=str(out/'mobile-picker.png'),full_page=True)
 page.locator('[data-catalog="crunch-machine"]').click()
 page.locator('#modal-form input[name="machine"]').fill('Мой тренажёр')
 page.locator('#modal-form button[type="submit"]').click()
 page.wait_for_timeout(350)
 checks.append({'scenario':'add abs during session only','passed':page.evaluate('__uiTest.snapshot().draft.exercises.length===7 && __uiTest.snapshot().programs[0].exercises.length===6')})
 page.locator('[data-action="finish"]').click()
 page.locator('#modal [data-action="confirm"]').click()
 page.wait_for_timeout(350)
 checks.append({'scenario':'finish snapshot autosaved once','passed':page.evaluate('__lastSaved.history.length===1 && __lastSaved.draft===null && __lastSaved.history[0].exercises.length===7')})
 page.evaluate("__uiTest.goto('supplements')")
 page.locator('[data-action="new-tracker"]').first.click()
 page.locator('#modal-form input[name="name"]').fill('Моя запись')
 page.locator('#modal-form input[name="amount"]').fill('По личной инструкции')
 page.locator('#modal-form input[name="times"]').fill('08:00, 20:00')
 page.locator('#modal-form button[type="submit"]').click()
 page.locator('[data-action="intake"][data-status="taken"]').first.click()
 page.locator('#modal-form input[name="actualTime"]').fill('09:05')
 page.locator('#modal-form button[type="submit"]').click()
 page.wait_for_timeout(350)
 checks.append({'scenario':'twice daily + actual intake time autosaved','passed':page.evaluate("__lastSaved.trackers[0].times.length===2 && __lastSaved.intakes[0].actualTime==='09:05' && __lastSaved.intakes[0].status==='taken'")})
 page.screenshot(path=str(out/'mobile-calendar.png'),full_page=True)
 for width in [390,320]:
  page.set_viewport_size({'width':width,'height':844})
  page.evaluate("__uiTest.goto('program')")
  page.locator('[data-action="start"]').first.click()
  if page.locator('#modal[open] [data-action="confirm"]').count():page.locator('#modal [data-action="confirm"]').click()
  checks.append({'scenario':f'active workout {width}px','overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})

 print('errors',errors)
 print('checks',json.dumps(checks,ensure_ascii=False))
 (out/'ui-report.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2))
 assert not errors, errors
 assert all(not c.get('overflow',False) and c.get('passed',True) for c in checks), checks
 browser.close()
