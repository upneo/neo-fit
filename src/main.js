import { N, configureTemplates } from './lib/domain.js';
import { S } from './lib/storage.js';
import { loadConfiguration, loadTemplates } from './lib/bootstrap.js';
import { parseInBodyText } from './lib/inbody.js';
import { getDocument, GlobalWorkerOptions } from './vendor/pdf.mjs';
GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;

const configuration = await loadConfiguration();
configureTemplates(await loadTemplates());
(async () => {
    'use strict';
    const { h, clone, uid, num } = N, $ = s => document.querySelector(s);
    const ICONS = { home: 'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8', program: 'M8 3h8v4H8zM8 5H5v16h14V5h-3M8 11h8M8 16h5', play: 'm8 4 12 8-12 8V4z', history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2', pill: 'm7 17 10-10M6 4a5 5 0 0 1 7 0l7 7a5 5 0 0 1-7 7l-7-7a5 5 0 0 1 0-7', peptide: 'm14 3 7 7M13 4l-9 9v7h7l9-9M4 20l-2 2M9 9l6 6M16 2l6 6', nutrition: 'M7 3v7M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-3 4-3 8 1 9V3h1v18', user: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3', edit: 'm15 4 5 5M4 14l11-11 5 5L9 19l-6 2 1-7', plus: 'M12 4v16M4 12h16', close: 'm6 6 12 12M6 18 18 6', arrow: 'M4 12h16m-6-6 6 6-6 6', download: 'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4', check: 'm5 12 4 4L19 6', info: 'M12 11v6M12 7v1M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0', chevron: 'm8 5 7 7-7 7', search: 'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14m5 12 6 6', swap: 'M3 7h17l-4-4M21 17H4l4 4', logout: 'M10 4H4v16h6M9 12h12l-4-4M21 12l-4 4', more: 'M5 12h1m5 0h1m5 0h1', clock: 'M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0', up: 'M12 20V4m-6 6 6-6 6 6', down: 'M12 4v16m-6-6 6 6 6-6', trash: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3', copy: 'M8 8h12v13H8zM16 8V3H3v13h5', dumbbell: 'M7 6v12M17 6v12M3 9v6M21 9v6M7 12h10', calendar: 'M5 5h14v16H5zM8 3v4M16 3v4M5 10h14', refresh: 'M20 11a8 8 0 0 0-14-5L3 9m0-5v5h5M4 13a8 8 0 0 0 14 5l3-3m0 5v-5h-5' };
    Object.assign(ICONS, { chart: 'M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7M20 16V4', eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12m7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0', eyeOff: 'm3 3 18 18M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M9.9 9.9a3 3 0 0 0 4.2 4.2' });
    const ic = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ICONS.info}"></path></svg>`;
    const navs = [['today', 'Сегодня', 'home'], ['program', 'Программа', 'program'], ['workout', 'Тренировка', 'play'], ['history', 'История', 'history'], ['inbody', 'InBody', 'chart'], ['supplements', 'Добавки', 'pill'], ['peptides', 'Пептиды', 'peptide'], ['nutrition', 'Питание', 'nutrition'], ['profile', 'Профиль', 'user']];
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], order = [1, 2, 3, 4, 5, 6, 0];
    const dateLabel = d => new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const minLabel = x => x < 60 ? x + ' с' : Math.floor(x / 60) + ' мин' + (x % 60 ? ' ' + x % 60 + ' с' : '');
    const field = (label, name, value, type = 'text', extra = '') => `<label>${h(label)}<input name="${name}" type="${type}" value="${h(value ?? '')}" ${extra}></label>`;
    const passwordField = (label, name, extra = '') => `<label>${h(label)}<span class="password-input"><input name="${name}" type="password" value="" ${extra}><button type="button" class="password-toggle" data-action="toggle-password" aria-label="Показать пароль">${ic('eye')}</button></span></label>`;
    const select = (label, name, value, options) => `<label>${h(label)}<select name="${name}">${Object.entries(options).map(([k, v]) => `<option value="${h(k)}" ${String(value) === k ? 'selected' : ''}>${h(v)}</option>`).join('')}</select></label>`;
    const check = (name, text, on) => `<label class="form-check"><input name="${name}" type="checkbox" ${on ? 'checked' : ''}>${h(text)}</label>`;
    const daySelect = (name, chosen) => `<div class="days-select">${order.map(x => `<label><input type="checkbox" name="${name}" value="${x}" ${chosen.includes(x) ? 'checked' : ''}><span>${days[x]}</span></label>`).join('')}</div>`;
    const empty = (title, text, button = '') => `<section class="panel empty"><div class="empty-symbol">${ic('program')}</div><h2>${h(title)}</h2><p>${h(text)}</p>${button}</section>`;
    const heading = (label, title, text, extra = '') => `<div class="heading"><div><div class="eyebrow">${h(label)}</div><h1>${h(title)}</h1><p class="sub">${h(text)}</p></div>${extra}</div>`;
    const brand = () => `<div class="brand"><div class="brand-mark">nf</div><div><div class="brand-name">NEO FIT</div><small>ТВОЙ ЛИЧНЫЙ РИТМ</small></div></div>`;
    const memoryStorage = { ephemeral: true, data: {}, getItem(k) { return this.data[k] || null; }, setItem(k, v) { this.data[k] = v; } };
    let browserStorage;
    try {
        browserStorage = localStorage;
    }
    catch {
        browserStorage = memoryStorage;
    }
    let initial;
    try {
        initial = { app: 'neo-fit-vault', version: 1, accounts: [] };
    }
    catch (e) {
        $('#root').textContent = 'Не удалось прочитать зашифрованную копию: ' + e.message;
        return;
    }
    const config = configuration;
    const local = new S.LocalStore(initial, browserStorage, 'neo-fit:profiles:v3:' + new URL('.', location.href).pathname);
    let store = local, state = null, saveTimer, saveQueue = Promise.resolve(), saveMessage = '', saveError = false, lastExportRevision = -1, lastSavedRevision = -1, activeSaves = 0, lastErrorText = '', remoteCheck = false;
    let ui = { tab: 'today', program: 0, mode: config.supabaseUrl && config.publishableKey ? 'cloud' : 'local', register: false, restoreMessage: '', date: N.dateKey(), month: N.dateKey().slice(0, 7), inBodyMetric: 'weight', inBodyRange: 'all', inBodyImport: null, editor: null, picker: null, historyEdit: null, search: '', group: '' };
    let modalSubmit = null, confirmAction = null, generated = null;
    const modal = $('#modal');
    function today() { return state ? N.dateKey(new Date(), state.profile.timeZone) : N.dateKey(); }
    function nextProgramIndex() { const id = state?.schedule?.queue?.[state.schedule.nextIndex]; return Math.max(0, state?.programs?.findIndex(p => p.id === id) ?? 0); }
    function toast(text, bad = false) { const el = document.createElement('div'); el.className = 'toast' + (bad ? ' error' : ''); el.textContent = text; while ($('#toasts').children.length >= 2)
        $('#toasts').firstElementChild.remove(); $('#toasts').append(el); setTimeout(() => el.remove(), 7500); }
    function setStatus(text, bad = false) { saveMessage = text; saveError = bad; const el = $('#save-status'); if (el) {
        el.textContent = text;
        el.classList.toggle('bad', bad);
    } }
    async function persistNow() {
 clearTimeout(saveTimer); saveTimer=null;if(!state)return;
 const snapshot=clone(state),owner=store;
 if(lastSavedRevision===snapshot.revision&&!owner.pending&&!saveError)return saveQueue;
 setStatus(owner.mode==='cloud'?'Сохраняем в облаке…':'Автосохранение…');
 activeSaves++;
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
   if(owner===store&&lastSavedRevision===snapshot.revision&&!owner.pending&&!saveError)return;
   await owner.save(snapshot);
   if(owner===store){lastSavedRevision=snapshot.revision;if(state?.revision===snapshot.revision)setStatus(owner.mode==='cloud'?'Сохранено в облаке':owner.persistence?'Сохранено на устройстве':'Хранилище недоступно',owner.mode==='local'&&!owner.persistence);}
 }).catch(e=>{
   if(owner===store){setStatus(e.message.startsWith('CONFLICT')?'Конфликт версий — открой профиль':owner.mode==='cloud'?'Ожидает синхронизации':'Ошибка автосохранения',true);if(lastErrorText!==e.message){toast(e.message,true);lastErrorText=e.message;}}
 }).finally(()=>{activeSaves--;});
 await saveQueue;
}
    function changed(){
 if(!state)return;state.revision++;state.updatedAt=new Date().toISOString();lastErrorText='';
 setStatus('Сохраняем изменения…');clearTimeout(saveTimer);saveTimer=setTimeout(persistNow,180);
}
    function showModal(title, body, footer = '') { if (modal.open)
        modal.close(); modal.innerHTML = `<div class="modal-head"><h2>${h(title)}</h2><button class="btn icon-only" data-action="close" aria-label="Закрыть">${ic('close')}</button></div>${body}${footer}`; modal.showModal(); }
    function formModal(title, body, callback, label = 'Сохранить') { modalSubmit = callback; showModal(title, `<form id="modal-form"><div class="modal-body">${body}<div class="form-error" id="modal-error" role="alert"></div></div><div class="modal-foot"><button type="button" class="btn outline" data-action="close">Отмена</button><button type="submit" class="btn primary">${h(label)}</button></div></form>`); }
    function confirm(title, text, callback, label = 'Подтвердить') { confirmAction = callback; showModal(title, `<div class="modal-body"><p style="white-space:pre-wrap;font-size:14px">${h(text)}</p></div>`, `<div class="modal-foot"><button class="btn outline" data-action="close">Отмена</button><button class="btn primary" data-action="confirm">${h(label)}</button></div>`); }
    function close() { modal.close(); modalSubmit = null; confirmAction = null; }
    function goto(tab) { if(!navs.some(n=>n[0]===tab))return; ui.tab=tab; if(store.mode==='cloud')store.saveView({tab,program:ui.program}); history.replaceState(null,'','#'+tab); render(); window.scrollTo(0,0); }
    function renderAuth() {
  state = null; $('#bottom-nav').hidden = true; $('#timer').hidden = true;
  const cloud = !!(config.supabaseUrl && config.publishableKey);
  const available = cloud || config.allowLocal;
  $('#root').innerHTML = `<div class="auth-shell">
    <section class="auth-hero">${brand()}<div class="auth-statement"><div class="eyebrow">ТРЕНИРОВКИ / ПИТАНИЕ / РИТМ</div>
    <h1>Твоя форма.<br>Твой темп.<br><em>Твои правила.</em></h1>
    <p>Место, где отдельные тренировки<br>становятся твоей историей.</p>
    <div class="auth-tags"><span>${ic('dumbbell')}Упражнения под тебя</span><span>${ic('check')}Автосохранение записей</span></div></div>
    <div class="auth-art" aria-hidden="true"><div class="art-track"></div><div class="art-track second"></div><div class="art-track third"></div><div class="art-badge">STAY<br><b>IN MOTION.</b></div></div>
    <div class="foot"><span>NEO FIT / 03</span><span>Твой дневник. Каждый день.</span></div></section>
    <section class="auth-main"><div class="auth-box"><span class="mode-chip ${ui.mode}">${ic(cloud&&ui.mode==='cloud'?'lock':'info')}${ui.mode==='cloud'?'Личный облачный аккаунт':'Локальный просмотр · без облака'}</span>
    <h2>${ui.register?'Начнём твою историю':'С возвращением.'}</h2><p class="sub">${ui.mode==='cloud'?'Войди, чтобы продолжить с последнего сохранённого результата.':'Пока база не подключена, данные автоматически сохраняются только в этом браузере.'}</p>
    ${available?`<div class="auth-switch"><button class="${!ui.register?'active':''}" data-action="auth-login">Войти</button><button class="${ui.register?'active':''}" data-action="auth-register">Создать профиль</button></div>
    ${ui.restoreMessage?`<div class="notice warn">${ic('info')}<div>${h(ui.restoreMessage)}</div></div>`:''}
    <form id="auth-form"><div class="auth-fields">
    ${field('Логин','username','','text','autocomplete="username" placeholder="Придумайте логин" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_.\\-]+"')}
    ${ui.register?field('Ваше имя','displayName','','text','required maxlength="100" placeholder="Ваше имя"'):''}
    ${passwordField('Пароль','password',`autocomplete="${ui.register?'new-password':'current-password'}" required ${ui.register?'minlength="8" data-password-min':''} maxlength="128" placeholder="Пароль или запоминающаяся фраза"`)}
    ${ui.register?passwordField('Повтор пароля','passwordAgain','required minlength="8" data-password-min maxlength="128" autocomplete="new-password"'):''}
    ${ui.register&&ui.mode==='cloud'?field('Код приглашения','invite','','password','required autocomplete="off" maxlength="200"'):''}
    ${ui.mode==='cloud'?check('remember','Запомнить вход на этом устройстве',true):''}
    <button type="submit" class="btn primary full" id="auth-submit">${ui.register?'Создать мой профиль':'Открыть дневник'}${ic('arrow')}</button>
    </div><p class="form-error" id="auth-error" role="alert"></p></form>`:`<div class="notice warn"><div><strong>Осталось подключить базу.</strong><p>Владелец сайта должен задать Supabase URL и публичный ключ. Облачный вход до этого недоступен.</p></div></div>`}
    ${!cloud?`<div class="auth-local-note">${ic('info')}<span><b>Облако не настроено.</b> Это не синхронизация с телефоном. Скачивать HTML больше не нужно; для переноса старых данных есть однократный импорт.</span></div>`:config.allowLocal?`<button class="btn ghost full" data-action="switch-mode">${ui.mode==='cloud'?'Открыть локальный режим':'Перейти к облачному входу'}</button>`:''}
    <div class="auth-bottom">${ui.register?'Минимум 8 символов. Подойдёт простая фраза из нескольких слов.':'Логин не зависит от регистра. Пароль — зависит.'}<br>${ui.mode==='cloud'?'Новые профили — по приглашению владельца.':'У каждого локального профиля своё зашифрованное хранилище.'}</div>
    </div></section></div>`;
}
    async function authenticate(form) { const f = new FormData(form), name = String(f.get('username')).trim(), password = String(f.get('password')), remember = f.has('remember'); if (ui.register && password.length < 8)
        throw Error('Минимум 8 символов'); if (ui.register && password !== f.get('passwordAgain'))
        throw Error('Пароли не совпадают'); if (ui.mode === 'local' && !config.allowLocal) throw Error('Локальный режим отключён владельцем.'); store = ui.mode === 'cloud' ? new S.CloudStore(config) : local; let doc; if (ui.register) {
        doc = ui.mode === 'cloud' ? await store.register(name, password, String(f.get('displayName')), String(f.get('invite')), remember) : await store.register(name, password, String(f.get('displayName')), 'empty');
        if (ui.mode === 'cloud' && f.get('preset') !== 'empty') {
            const template = N.defaultState(doc.profile.username, doc.profile.displayName, String(f.get('preset')));
            doc.programs = template.programs;
            doc.schedule = template.schedule;
            await store.save(doc);
        }
    }
    else
        doc = ui.mode === 'cloud' ? await store.login(name, password, remember) : await store.login(name, password); state = doc; lastSavedRevision = store.pending ? -1 : state.revision; if (!state.profile.completed && !state.trackers.length && !state.intakes.length)
        state.profile.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || state.profile.timeZone; ui.tab = ui.register ? 'profile' : (state.draft ? 'workout' : 'today'); ui.program = nextProgramIndex(); ui.date = today(); ui.month = ui.date.slice(0, 7); setStatus(store.mode === 'cloud' ? (store.conflict ? 'Конфликт версий — открой профиль' : store.pending ? 'Есть несинхронизированные изменения' : 'Загружено из облака') : 'Сохранено на устройстве', !!store.conflict); render(); if (store.mode === 'local' && browserStorage.ephemeral) {
        setStatus('Хранилище недоступно — резервная копия в профиле', true);
        toast('Браузерное хранилище недоступно. Не закрывай вкладку; создай резервную JSON-копию в профиле.', true);
    } if (store.pending && !store.conflict)
        await persistNow(); }
    function render() {
  if (!state) {renderAuth();return;}
  const p=state.profile,first=(p.displayName||p.username).slice(0,2).toUpperCase();
  $('#root').innerHTML=`<aside class="left">${brand()}<div class="nav-title">ЛИЧНОЕ ПРОСТРАНСТВО</div>
  <nav class="nav" aria-label="Основные разделы">${navs.map(([tab,title,icon],i)=>`${i===4?'<div class="nav-title second-title">ЕЖЕДНЕВНЫЙ РИТМ</div>':''}<button data-nav="${tab}" ${ui.tab===tab?'aria-current="page"':''}>${ic(icon)}<span>${title}</span>${tab==='workout'&&state.draft?'<span class="nav-live"></span>':''}</button>`).join('')}</nav>
  <div class="sidebar-note"><span class="tiny-orb"></span><span>Не идеальный план.<br><b>Твой постоянный ритм.</b></span></div>
  <div class="side-bottom"><div class="identity"><span class="avatar">${h(first)}</span><div class="grow"><strong>${h(p.displayName)}</strong><small>@${h(p.username)}</small></div><button class="btn icon-only ghost" data-action="logout" aria-label="Выйти из профиля">${ic('logout')}</button></div></div></aside>
  <div class="shell"><header class="topbar"><div class="breadcrumb">Твоё пространство <span>/</span> <strong>${h(navs.find(x=>x[0]===ui.tab)?.[1]||'Дневник')}</strong></div><div class="row"><span class="sync ${saveError?'bad':''}" id="save-status" role="status">${h(saveMessage)}</span><button class="btn icon-only outline" data-action="sync" title="Проверить сохранение и обновления" aria-label="Проверить синхронизацию">${ic('refresh')}</button><button class="avatar small-avatar" data-nav="profile" aria-label="Открыть профиль">${h(first)}</button></div></header>
  <main class="page page-${ui.tab}" id="view" tabindex="-1">
  ${store.mode==='local'?`<div class="local-strip">${ic('info')}<span><strong>Локальный режим.</strong> Автосохранение на этом устройстве. Облачная синхронизация не подключена.</span></div>`:''}
  ${saveError?`<div class="notice warn">${ic('info')}<div class="grow"><strong>Сохранение требует внимания.</strong> Изменения могут быть ещё не в облаке. Не закрывай вкладку до проверки.</div><button class="btn small" data-nav="profile">Проверить</button></div>`:''}
  ${({today:renderToday,program:renderProgram,workout:renderWorkout,history:renderHistory,supplements:()=>renderTrackers('supplement'),peptides:()=>renderTrackers('peptide'),nutrition:renderNutrition,inbody:renderInBody,profile:renderProfile}[ui.tab])()}
  <footer class="app-footer"><span>NEO FIT <b>03</b></span><span>${store.mode==='cloud'?'Закрытый профиль · автоматическое сохранение':'Локальное автосохранение · не облако'}</span></footer></main></div>`;
  $('#bottom-nav').hidden=false;
  $('#bottom-nav').innerHTML=[['today','Сегодня','home'],['program','Программа','program'],['workout','В зале','play'],['supplements','Приём','pill'],['more','Ещё','more']].map(([t,l,i])=>`<button ${t==='more'?'data-action="more"':'data-nav="'+t+'"'} ${ui.tab===t?'aria-current="page"':''}>${ic(i)}<span>${l}</span></button>`).join('');renderTimer();
}
    function renderToday(){
 const next=N.nextWorkout(state,today()),all=N.occurrences(state,today()),taken=all.filter(x=>x.status==='taken').length;
 const monday=N.addDays(today(),-((N.dow(today())+6)%7)),weekSessions=state.history.filter(s=>s.date>=monday&&s.date<=N.addDays(monday,6)),monthSessions=state.history.filter(s=>s.date.startsWith(today().slice(0,7)));
 let nutrition;try{nutrition=N.nutrition(state.profile,state.nutrition);}catch{}
 const title=state.draft?.title||next?.program?.title||'Начни с первого шага';
 const items=state.draft?.exercises||next?.program?.exercises||[];
 const last=state.history.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
 return heading('ТВОЙ ЛИЧНЫЙ РИТМ',`${state.profile.displayName}, всё начинается с тебя.`,dateLabel(today())+' · Маленькие действия. Настоящие результаты.',`<span class="pill date-pill">${ic('calendar')}${state.schedule.weekdays.length} дня в неделю</span>`)+`
 <div class="dashboard-top"><section class="hero">
 <div class="hero-content"><span class="hero-kicker"><span></span>${state.draft?'МОЖНО ПРОДОЛЖАТЬ':next?'ДАЛЬШЕ ПО ПЛАНУ · '+h(dateLabel(next.date)):'ТВОЯ НОВАЯ ГЛАВА'}</span>
 <h2>${h(title)}</h2><p>${items.length?items.length+' упражнений · '+items.reduce((a,e)=>a+e.sets,0)+' подходов в шаблоне':'Выбери основу или собери свою программу.'}</p>
 <button class="btn hero-button" ${state.draft?'data-nav="workout"':next?'data-action="start" data-id="'+h(next.program.id)+'"':'data-nav="program"'}>${ic('play')}${state.draft?'Продолжить тренировку':next?'Начать тренировку':'Выбрать программу'}${ic('arrow')}</button></div>
 <div class="hero-art" aria-hidden="true"><div class="track-ring one"></div><div class="track-ring two"></div><div class="track-ring three"></div><div class="lift-badge">${ic('dumbbell')}</div><span class="hero-art-label">YOUR PACE.<br>YOUR PROGRESS.</span></div>
 </section><section class="panel week-panel pad"><div class="section-title"><div><div class="eyebrow">ЭТА НЕДЕЛЯ</div><h2>Ритм в деталях</h2></div><button class="btn icon-only ghost" data-action="schedule" aria-label="Изменить расписание">${ic('edit')}</button></div>
 <div class="week">${Array.from({length:7},(_,i)=>{const d=N.addDays(monday,i),done=state.history.some(s=>s.date===d),planned=state.schedule.weekdays.includes(N.dow(d));return `<div class="week-day ${d===today()?'active':''} ${done?'done':''}" title="${h(dateLabel(d))}: ${done?'есть завершённая тренировка':planned?'по плану':'отдых'}"><small>${days[N.dow(d)]}</small><b>${Number(d.slice(8))}</b><span class="dot" style="visibility:${done||planned?'visible':'hidden'}"></span></div>`;}).join('')}</div>
 <div class="week-total"><strong>${weekSessions.length}<span> / ${state.schedule.weekdays.length}</span></strong><p>занятий выполнено<br>на этой неделе</p></div><div class="week-progress"><span style="width:${Math.min(100,100*weekSessions.length/state.schedule.weekdays.length)}%"></span></div>
 <p class="help">Очередь продолжается между неделями и двигается только после завершения занятия.</p></section></div>
 <div class="metrics"><section class="panel metric violet-card"><div class="metric-label">Тренировок в этом месяце <span>${ic('history')}</span></div><strong>${monthSessions.length}</strong><small>${state.history.length} завершено за всё время</small></section>
 <section class="panel metric blue-card"><div class="metric-label">Ежедневные отметки <span>${ic('check')}</span></div><strong>${taken}<span class="metric-denominator"> / ${all.length}</span></strong><small>${all.length?'отмечено сегодня по твоему расписанию':'Создай первое расписание приёма'}</small></section>
 <section class="panel metric peach-card"><div class="metric-label">Твой ориентир питания <span>${ic('nutrition')}</span></div><strong>${nutrition?nutrition.calories:'—'}<span class="metric-unit">${nutrition?'ккал':''}</span></strong><small>${nutrition?'Расчётная цель, которую можно изменить':'Добавь исходные данные в профиль'}</small></section></div>
 <div class="dashboard-bottom"><section class="panel pad next-list"><div class="section-title"><h2>${state.draft?'Сейчас в тренировке':'Твоя следующая тренировка'}</h2><button class="btn ghost small" data-nav="program">Программа ${ic('arrow')}</button></div>
 ${items.length?items.slice(0,4).map((e,i)=>`<div class="dashboard-ex"><span class="dashboard-ex-num">${String(i+1).padStart(2,'0')}</span><div class="grow"><h3>${h(e.name)}</h3><p>${h(e.group)} · ${e.sets} × ${e.repsMin===e.repsMax?e.repsMin:e.repsMin+'–'+e.repsMax}</p></div><span class="ex-mini-icon">${ic('dumbbell')}</span></div>`).join('')+(items.length>4?`<button class="btn ghost small" data-nav="program">Ещё ${items.length-4} упражнения ${ic('arrow')}</button>`:''):`<div class="calm-empty">${ic('program')}<h3>Здесь будет твоя программа</h3><p>Готовая основа, собственные упражнения или черновик по анкете.</p><button class="btn outline" data-nav="program">Настроить программу</button></div>`}
 </section><section class="panel pad daily-list"><div class="section-title"><h2>На сегодня</h2><button class="btn ghost small" data-nav="supplements">Календарь ${ic('arrow')}</button></div>
 ${all.length?all.slice(0,4).map(o=>`<div class="daily-item"><span class="daily-icon ${o.status}">${ic(o.status==='taken'?'check':o.tracker.category==='peptide'?'peptide':'pill')}</span><div class="grow"><h3>${h(o.tracker.name)}</h3><p class="help">${h(o.time)} · ${h(o.tracker.amount)||'Количество не указано'}</p><span class="mini-status ${o.status}">${o.status==='taken'?'Отмечено':o.status==='skipped'?'Пропущено':'Нет отметки'}</span></div><button class="btn icon-only ghost" data-nav="${o.tracker.category==='peptide'?'peptides':'supplements'}" aria-label="Открыть календарь ${h(o.tracker.name)}">${ic('chevron')}</button></div>`).join(''):`<div class="calm-empty"><span class="empty-circle">${ic('pill')}</span><h3>Пока без расписаний</h3><p>Добавь свои витамины или назначения<br>и отмечай фактический приём.</p><button class="btn soft" data-nav="supplements">${ic('plus')}Добавить расписание</button></div>`}
 </section></div>
 ${!state.profile.completed?`<div class="onboarding-banner"><span>${ic('user')}</span><div class="grow"><h3>Давай познакомимся чуть ближе</h3><p>Рост, вес, опыт и оборудование помогут настроить пространство под тебя.</p></div><button class="btn primary small" data-nav="profile">Заполнить анкету ${ic('arrow')}</button></div>`:''}
 ${last?`<section class="panel pad latest-workout"><div class="section-title"><h2>Последняя тренировка</h2><button class="btn ghost small" data-nav="history">Вся история ${ic('arrow')}</button></div><div class="row between"><div><h3>${h(last.title)}</h3><p class="help">${dateLabel(last.date)} · ${last.exercises.length} упражнений · ${N.totals(last).done} отмеченных подходов</p></div><button class="btn outline small" data-action="report" data-id="${h(last.id)}">${ic('copy')}Отчёт для тренера</button></div></section>`:''}`;
}
    function renderProgram() {
        const ps = state.programs;
        if (!ps.length)
            return heading('Твоя основа', 'Программа тренировок', 'Выбери основу, составь программу вручную или создай редактируемый черновик по анкете.') + empty('Пока без программы', 'Твоя история не зависит от текущего шаблона. Сменить основу можно позже.', `<div class="row" style="justify-content:center"><button class="btn primary" data-action="choose-preset">Выбрать основу</button><button class="btn outline" data-action="new-template">${ic('plus')}Свой шаблон</button><button class="btn" data-action="generate">По анкете</button></div>`);
        ui.program = Math.min(ui.program, ps.length - 1);
        const p = ps[ui.program];
        return heading('Редактируемая программа', 'Твой план. Твои упражнения.', 'Добавляй, меняй и переставляй упражнения. Правки шаблона не переписывают выполненные тренировки.', `<button class="btn outline small" data-action="new-template">${ic('plus')}Шаблон</button>`) + `<div class="program-tabs">${ps.map((p, i) => `<button class="program-tab ${ui.program === i ? 'selected' : ''}" data-action="program-select" data-index="${i}"><small>${String(i + 1).padStart(2, '0')} / ${state.schedule.queue[state.schedule.nextIndex] === p.id ? 'СЛЕДУЮЩИЙ' : 'ШАБЛОН'}</small><strong>${h(p.short || p.title)}</strong></button>`).join('')}</div><div class="program-layout"><section class="panel"><div class="panel-head"><div><h2>${h(p.title)}</h2><p class="help" style="margin-top:5px">${p.exercises.length} упражнений · ${p.exercises.reduce((a, e) => a + e.sets, 0)} подходов${p.exercises.some(e => e.unilateral) ? ' (на сторону)' : ''}</p></div><button class="btn primary" data-action="start" data-id="${h(p.id)}" ${p.exercises.length ? '' : 'disabled'}>${ic('play')}Начать</button></div><div class="ex-list">${p.exercises.map((e, i) => `<article class="exercise"><span class="ex-num">${String(i + 1).padStart(2, '0')}</span><div class="grow"><h3>${h(e.name)}</h3><div class="ex-meta"><b>${e.sets} × ${e.repsMin === e.repsMax ? e.repsMin : e.repsMin + '–' + e.repsMax}</b><span>· ${minLabel(e.restSeconds)}</span><span class="pill">${h(e.group)}</span></div>${e.targets.some(x => x.sourceWeight != null) ? `<p class="help" style="margin-top:7px;font-size:10px">Источник: ${e.targets.map(x => h(x.sourceWeight) + ' кг × ' + h(x.reps)).join(' / ')}<br>Пример из PDF, не результат и не назначение веса.</p>` : ''}${e.notes ? `<p class="exercise-note">${h(e.notes)}</p>` : ''}<div class="row" style="margin-top:9px;gap:4px"><button class="btn ghost small" data-action="technique" data-id="${h(e.id)}" data-kind="program">${ic('info')}Техника</button><button class="btn ghost small" data-action="replace" data-id="${h(e.id)}" data-kind="program">${ic('swap')}Замена</button></div></div><div class="ex-actions"><button class="btn outline icon-only" data-action="edit-ex" data-id="${h(e.id)}" data-kind="program" aria-label="Изменить ${h(e.name)}">${ic('edit')}</button></div></article>`).join('')}</div><div class="panel-foot"><div class="row between"><button class="btn" data-action="add-ex" data-kind="program">${ic('plus')}Добавить упражнение</button><button class="btn ghost small" data-action="rename-template">Настройки шаблона</button></div></div></section><aside class="program-aside"><section class="panel pad"><div class="section-title"><h3>Расписание</h3>${ic('calendar')}</div><p class="help">${state.schedule.weekdays.map(x => days[x]).join(' · ')} / непрерывная очередь</p><button class="btn outline full" style="margin-top:15px" data-action="schedule">Изменить дни</button><button class="btn ghost full" data-action="queue-skip">Пропустить следующий шаблон</button><p class="tip">Можешь начать нужный шаблон вручную. Перенос даты не стирает историю.</p></section><section class="panel pad"><h3>О программе</h3><p class="tip">${h(p.source || 'Собственная программа.')}</p><p class="tip"><b>RIR</b> — сколько повторений осталось бы с той же техникой. Записывать необязательно.</p><p class="tip">Разминочные подходы не считаются автоматически рабочими. В PDF тип подходов не обозначен.</p><div class="divider"></div><button class="btn ghost small" data-action="choose-preset">Сменить основу</button><button class="btn ghost small" data-action="generate">Черновик по анкете</button></section></aside></div>`;
    }
    function currentSession() { return ui.historyEdit ? state.history.find(s => s.id === ui.historyEdit) : state.draft; }
    function previousResult(e, sid) { return state.history.filter(x => x.id !== sid).sort((a, b) => b.date.localeCompare(a.date)).flatMap(s => s.exercises.filter(x => N.exerciseKey(x) === N.exerciseKey(e) && x.logs.some(l => l.done)).map(e => ({ s, e })))[0]; }
    function workoutCard(e, i, s) {
        const prev = previousResult(e, s.id), kind = ui.historyEdit ? 'history' : 'draft', timed = e.measurement === 'seconds', unit = timed ? 'сек.' : 'повт.';
        const planned = e.repsMin === e.repsMax ? e.repsMin : e.repsMin + '–' + e.repsMax;
        const previous = prev ? prev.e.logs.filter(l => l.done).map(l => timed ? h(l.reps) + ' сек.' : h(l.weight || '—') + ' кг × ' + h(l.reps)).join(' / ') : '';
        return `<section class="panel workout-card ${e.skipped ? 'skipped' : ''}" data-ex-card="${h(e.id)}"><div class="panel-head"><div class="grow"><div class="eyebrow" style="letter-spacing:1px;margin-bottom:5px">${String(i + 1).padStart(2, '0')} / ${h(e.group)}</div><h3>${h(e.name)}</h3><div class="ex-meta"><b>${e.sets} × ${planned} ${unit}</b><span>${minLabel(e.restSeconds)}</span>${e.rirMin != null ? `<span>RIR ${e.rirMin}–${e.rirMax}</span>` : ''}</div></div><button class="btn outline icon-only" data-action="edit-ex" data-kind="${kind}" data-id="${h(e.id)}" aria-label="Настройки ${h(e.name)}">${ic('edit')}</button></div><div class="workout-body"><div class="row between"><p class="help">${timed ? 'Время удержания' : h(N.labels[e.weightMode])}${e.machine ? ' · ' + h(e.machine) : ''}${e.unilateral ? ' · Л и П отдельно' : ''}</p><button class="btn ghost small" data-action="technique" data-kind="${kind}" data-id="${h(e.id)}">Техника ${ic('info')}</button></div>${e.reviewNote ? `<div class="notice warn" style="margin:10px 0">${h(e.reviewNote)}</div>` : ''}<div class="last-result">${prev ? `<strong>Прошлый раз · ${dateLabel(prev.s.date)}</strong><br>${previous}` : timed ? 'Прошлых результатов пока нет. Запиши фактическое время.' : 'Прошлых результатов этого варианта пока нет. Вес вводишь самостоятельно.'}</div>${e.skipped ? '<p class="help">Пропуск. Введённые ранее результаты не удалены.</p>' : `<div class="sets-grid sets-head"><span>№</span><span>План</span><span>${timed ? '—' : 'Кг'}</span><span>${timed ? 'Секунды' : 'Повторы'}</span><span>RIR</span><span>✓</span></div>${e.logs.map(l => `<div class="sets-grid set ${l.done ? 'done' : ''}" data-log-row="${h(l.id)}"><span class="count">${l.number}${l.side === 'left' ? 'Л' : l.side === 'right' ? 'П' : ''}</span><span class="target">${h(l.target || e.targets?.[l.number - 1]?.reps || '—')}</span><input data-field="weight" data-ex="${h(e.id)}" data-log="${h(l.id)}" value="${timed ? '' : h(l.weight)}" inputmode="decimal" maxlength="24" placeholder="—" aria-label="Вес ${l.number} ${h(e.name)}" ${timed ? 'disabled' : ''}><input data-field="reps" data-ex="${h(e.id)}" data-log="${h(l.id)}" value="${h(l.reps)}" inputmode="numeric" maxlength="24" placeholder="—" aria-label="${timed ? 'Секунды' : 'Повторы'} ${l.number} ${h(e.name)}"><input data-field="rir" data-ex="${h(e.id)}" data-log="${h(l.id)}" value="${h(l.rir)}" inputmode="decimal" maxlength="24" placeholder="—" aria-label="RIR ${l.number} ${h(e.name)}"><label class="done-box"><input type="checkbox" data-field="done" data-ex="${h(e.id)}" data-log="${h(l.id)}" ${l.done ? 'checked' : ''} aria-label="Выполнен ${l.number} ${h(e.name)}"></label></div>`).join('')}`}${e.notes ? `<p class="exercise-note">${h(e.notes)}</p>` : ''}<div class="row between" style="margin-top:13px"><div class="row" style="gap:4px"><button class="btn ghost small" data-action="add-set" data-id="${h(e.id)}" ${e.skipped ? 'disabled' : ''}>${ic('plus')}Подход</button><button class="btn ghost small" data-action="replace" data-id="${h(e.id)}" data-kind="${kind}">${ic('swap')}Замена</button>${!ui.historyEdit ? `<button class="btn ghost icon-only" data-action="rest" data-id="${h(e.id)}" aria-label="Таймер отдыха">${ic('clock')}</button>` : ''}</div><button class="btn ghost small" data-action="skip" data-id="${h(e.id)}">${e.skipped ? 'Вернуть' : 'Пропустить'}</button></div></div></section>`;
    }

    function renderWorkout() { const s = currentSession(); if (!s) {
        const n = N.nextWorkout(state, today());
        return heading('В зале', 'Тренировка', 'Начни занятие из своей программы. Добавить пресс или любое другое упражнение можно прямо по ходу.') + empty('Можно начинать', n ? 'Следующая: ' + n.program.title : 'Сначала создай или выбери программу.', n ? `<button class="btn primary" data-action="start" data-id="${h(n.program.id)}">${ic('play')}Начать тренировку</button>` : `<button class="btn primary" data-nav="program">К программе</button>`);
    } const t = N.totals(s); const manualBanner = s.addedManually ? '<div class="notice" style="margin:14px 0"><strong>Добавлено вручную</strong><br>' + (s.queueEligible ? '<button class="btn ghost small" data-action="toggle-past-queue">' + (s.queueIncluded ? '✓ Учитывается в очереди' : 'Не учитывать в очереди') + '</button><span class="help" style="margin-left:8px">' + (s.queueIncluded ? 'Следующей будет тренировка после этого шаблона.' : 'Запись останется только в истории.') + '</span>' : '<span class="help">' + h(s.queueReason || 'Очередь не изменится: последовательность неоднозначна.') + '</span>') + '</div>' : ''; return heading(ui.historyEdit ? 'Явная правка истории' : 'Сейчас в работе', s.title, ui.historyEdit ? 'Изменения относятся только к этому занятию. Исходная запись сохранена в журнале правок.' : 'Введи фактические вес и повторы, затем поставь галочку. Результаты не заполняются автоматически.', `<span class="pill">${ui.historyEdit ? 'Редактирование' : 'Черновик'}</span>`) + `<div class="workout-top"><label>Дата занятия<input type="date" id="session-date" value="${h(s.date)}" required></label><div class="progress-area"><div class="row between"><span class="muted">Выполнено подходов</span><b id="workout-count">${t.done} / ${t.all}</b></div><div class="progress"><span id="workout-progress" style="width:${t.all ? t.done / t.all * 100 : 0}%"></span></div></div></div>${manualBanner}${s.exercises.map((e, i) => workoutCard(e, i, s)).join('')}<button class="btn outline full" data-action="add-ex" data-kind="${ui.historyEdit ? 'history' : 'draft'}" style="margin-bottom:20px">${ic('plus')}Добавить упражнение в эту тренировку</button><section class="panel pad"><label>Самочувствие и заметки<textarea id="session-note" maxlength="6000" placeholder="Как прошло занятие, вопросы по технике…">${h(s.note)}</textarea></label><div class="form-actions"><button class="btn primary" data-action="${ui.historyEdit ? 'finish-history' : 'finish'}">${ic('check')}${ui.historyEdit ? 'Готово, вернуться в историю' : 'Завершить тренировку'}</button><button class="btn outline" data-action="report" data-id="${h(s.id)}">${ic('copy')}Отчёт</button>${ui.historyEdit ? '' : `<button class="btn ghost" data-action="discard">Отменить черновик</button>`}</div><p class="help" style="margin-top:14px">RIR можно оставить пустым. Для упражнения без дополнительного отягощения укажи вес 0. Веса разных тренажёров не сравниваются автоматически.</p></section>`; }
    function renderHistory() { return heading('Результаты', 'История тренировок', 'Программа — отдельно, выполненные занятия — отдельно. Здесь сохраняются и замены, и дополнительные упражнения.', `<button class="btn outline" data-action="add-past-workout">${ic('plus')}Добавить прошлую тренировку</button>`) + (state.history.length ? `<div class="stack">${state.history.slice().sort((a, b) => b.date.localeCompare(a.date)).map((s, i) => `<details class="panel" ${i === 0 ? 'open' : ''}><summary class="history-summary"><div class="date-badge"><strong>${Number(s.date.slice(8))}</strong><small>${new Date(s.date + 'T12:00:00').toLocaleDateString('ru-RU', { month: 'short' })}</small></div><div class="grow"><h3>${h(s.title)}${s.addedManually ? ' <span class="pill">Добавлено вручную</span>' : ''}</h3><p class="help">${h(s.date)} · ${s.exercises.length} упражнений · ${N.totals(s).done} подходов</p></div>${ic('down')}</summary><div class="history-body">${s.exercises.map(e => `<article class="history-ex"><h3>${h(e.name)}${e.importedFromNote ? ' <span class="pill">Из заметки</span>' : ''}${e.skipped ? ' <span class="pill amber">Пропуск</span>' : ''}</h3><p class="help">${h(N.labels[e.weightMode])}${e.machine ? ' · ' + h(e.machine) : ''}</p><div class="read-sets">${e.logs.filter(N.entered).map(l => `${l.done ? '✓' : '○'} ${l.number}${l.side === 'left' ? 'Л' : l.side === 'right' ? 'П' : ''}: ${h(l.weight) || '—'} кг × ${h(l.reps) || '—'}${l.rir ? ' · RIR ' + h(l.rir) : ''}`).join(' &nbsp; / &nbsp; ') || 'Нет записанных подходов'}</div>${e.reviewNote ? `<p class="help" style="color:#967536;margin-top:8px">${h(e.reviewNote)}</p>` : ''}</article>`).join('')}${s.note ? `<p class="note"><strong>Исходная заметка</strong><br>${h(s.note)}</p>` : ''}<div class="row" style="margin-top:18px"><button class="btn outline small" data-action="report" data-id="${h(s.id)}">${ic('copy')}Отчёт для тренера</button><button class="btn small" data-action="edit-history" data-id="${h(s.id)}">${ic('plus')}Дополнить / исправить</button></div></div></details>`).join('')}</div>` : empty('История пока пустая', 'После первого завершённого занятия здесь появятся твои записи.', `<button class="btn primary" data-nav="program">Выбрать тренировку</button>`)); }
    function renderTrackers(category) { const peptide = category === 'peptide', active = state.trackers.filter(t => t.category === category), occ = N.occurrences(state, ui.date, category), monthStart = ui.month + '-01', offset = (N.dow(monthStart) + 6) % 7, monthDays = new Date(Number(ui.month.slice(0, 4)), Number(ui.month.slice(5)), 0).getDate(); return heading(peptide ? 'Личный журнал назначений' : 'Ежедневные отметки', peptide ? 'Пептиды' : 'Добавки и витамины', peptide ? 'Только введённые тобой сведения: название, количество, даты и фактические отметки. Приложение не назначает курс.' : 'Создай своё расписание: один или несколько приёмов в день. Календарь отличает пропуск от отсутствия отметки.', `<button class="btn primary" data-action="new-tracker" data-category="${category}">${ic('plus')}Добавить</button>`) + `<div class="notice ${peptide ? 'warn' : ''}">${ic('info')}<div>${peptide ? 'Это журнал, а не медицинская рекомендация. Дозировки, способ введения и длительность определяет лечащий специалист. Приложение не рассчитывает разведение, не компенсирует пропуски и не рекомендует увеличивать дозу.' : 'Название и количество вводишь сам по своему назначению или инструкции. Приложение не проверяет совместимость и не назначает добавки.'} <strong>Нет отметки ≠ точно не принимал.</strong></div></div><div class="tracker-layout"><section class="panel calendar"><div class="cal-header"><button class="btn icon-only ghost" data-action="month-prev" aria-label="Предыдущий месяц">${ic('chevron').replace('<svg', '<svg style="transform:rotate(180deg)"')}</button><h3>${new Date(monthStart + 'T12:00:00').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h3><button class="btn icon-only ghost" data-action="month-next" aria-label="Следующий месяц">${ic('chevron')}</button></div><div class="cal-grid">${order.map(d => `<span class="cal-dayname">${days[d]}</span>`).join('')}${Array.from({ length: offset }, () => '<span></span>').join('')}${Array.from({ length: monthDays }, (_, i) => { const day = ui.month + '-' + String(i + 1).padStart(2, '0'), events = N.occurrences(state, day, category), done = events.filter(e => e.status === 'taken').length, skipped = events.filter(e => e.status === 'skipped').length, unknown = events.filter(e => e.status === 'unknown').length; return `<button class="cal-day ${events.length ? 'has-due' : ''} ${events.length && done === events.length ? 'complete' : skipped ? 'skipped-day' : day < today() && unknown ? 'overdue' : day > today() ? 'planned' : done ? 'partial' : ''} ${day === ui.date ? 'selected' : ''} ${day === today() ? 'today' : ''}" data-action="calendar-day" data-day="${day}" aria-label="${day}, принято ${done}, пропущено ${skipped}, без отметки ${unknown}">${i + 1}<small>${events.length ? done + '/' + events.length : '·'}</small></button>`; }).join('')}</div><div class="legend"><span><i></i>Все отмечены</span><span class="pending"><i></i>Часть отмечена</span><span class="overdue-key"><i></i>Прошло без отметки</span><span class="planned-key"><i></i>Запланировано</span><span>· Нет плана</span></div><div class="row between" style="margin-top:17px"><button class="btn ghost small" data-action="calendar-today">К сегодняшнему дню</button><button class="btn outline small" data-action="export-ics" data-category="${category}">${ic('calendar')}В календарь телефона</button></div><p class="help" style="font-size:10px;margin-top:13px">Плановое время: ${h(state.profile.timeZone)}. Уведомления при закрытом сайте не настроены. Для напоминаний можно импортировать файл .ics в календарь.</p></section><section class="panel pad"><div class="section-title"><h2>${dateLabel(ui.date)}</h2><span class="pill">${occ.filter(x => x.status === 'taken').length} / ${occ.length}</span></div>${occ.length ? occ.map(o => `<article class="intake"><div class="intake-time">${h(o.time)}${o.legacy ? ' · из предыдущей версии плана' : ''}</div><h3>${h(o.tracker.name)}</h3><p class="help">Плановая запись: ${h(o.plannedAmount) || 'Количество не указано'}</p><p class="intake-status">${o.status === 'taken' ? '✓ Отмечено: ' + h(o.event.actualAmount || o.event.snapshot.amount || 'приём') + (o.event.actualTime ? ' · ' + h(o.event.actualTime) : ' · время не указано') : o.status === 'skipped' ? 'Пропуск отмечен вручную' : ui.date > today() ? 'Запланировано' : ui.date < today() ? 'Нет отметки — день прошёл' : 'Нет отметки'}${o.event?.note ? ' · ' + h(o.event.note) : ''}</p><div class="row"><button class="btn ${o.status === 'taken' ? 'accent' : ''}" data-action="intake" data-slot="${h(o.slot)}" data-status="taken" ${ui.date > today() ? 'disabled' : ''}>${ic('check')}${peptide ? 'Внести факт' : 'Принял(а)'}</button><button class="btn outline" data-action="intake" data-slot="${h(o.slot)}" data-status="skipped" ${ui.date > today() ? 'disabled' : ''}>Пропустил(а)</button>${o.event && o.status !== 'unknown' ? `<button class="btn ghost" data-action="intake" data-slot="${h(o.slot)}" data-status="unknown">Снять отметку</button>` : ''}</div></article>`).join('') : `<p class="help">На этот день записей нет. Добавь план или выбери другую дату.</p><button class="btn" data-action="new-tracker" data-category="${category}" style="margin-top:20px">${ic('plus')}Создать план</button>`}</section></div><div class="section-title" style="margin-top:27px"><h2>Мои планы</h2><button class="btn small" data-action="new-tracker" data-category="${category}">${ic('plus')}Новый план</button></div>${active.length ? `<section class="panel">${active.slice().reverse().map(t => `<article class="tracker-plan"><div class="tracker-icon">${ic(peptide ? 'peptide' : 'pill')}</div><div class="grow"><h3>${h(t.name)} ${t.end && t.end < today() ? '<span class="pill outline">Архив</span>' : ''}</h3><p class="help">${h(t.perDose || t.amount) || 'Без количества'} · ${(t.doses?.length ? t.doses : t.times.map(time => ({time, amount:t.amount}))).map(dose => h(dose.time) + (dose.amount ? ' — ' + h(dose.amount) : '')).join(', ')}<br>${t.weekdays.map(d => days[d]).join(' · ')} / ${h(t.start)} → ${h(t.end) || 'без даты окончания'}</p>${t.notes ? `<p class="exercise-note">${h(t.notes)}</p>` : ''}<div class="row" style="margin-top:10px"><button class="btn outline small" data-action="edit-tracker" data-id="${h(t.id)}">${ic('edit')}Изменить будущий план</button>${!t.end || t.end > today() ? `<button class="btn ghost small" data-action="delete-tracker" data-id="${h(t.id)}">${ic('trash')}Удалить план</button>` : ''}</div></div></article>`).join('')}</section>` : empty('Планы пока не добавлены', 'Схемы и дозировки не подставляются автоматически. Введи только свои сведения.')}<p class="help" style="margin-top:17px">Изменение расписания создаёт новую версию с выбранной даты. Уже сделанные отметки сохраняются со старым названием и количеством. Повторные нажатия не создают второй приём.</p>`; }
    function renderNutrition() { let calc, error = ''; try {
        calc = N.nutrition(state.profile, state.nutrition);
    }
    catch (e) {
        error = e.message;
    } const n = state.nutrition; return heading('Расчёт и ручная настройка', 'Питание под твою цель', 'Калории и БЖУ — редактируемый ориентир. Формула не измеряет твой реальный расход энергии.') + `<div class="grid2"><section class="panel pad"><div class="section-title"><h2>Твоя настройка</h2><span class="pill">Миффлин — Сан Жеор</span></div><form id="nutrition-form"><div class="form-grid">${field('Коэффициент активности', 'activity', n.activity, 'number', 'min="1.1" max="2.5" step="0.01" required')}${select('Коррекция в', 'adjustmentUnit', n.adjustmentUnit, { percent: '% от поддержания', kcal: 'ккал к поддержанию' })}${field('Коррекция: + или −', 'adjustment', n.adjustment, 'number', 'step="1" required')}${field('Калории вручную (необязательно)', 'manualCalories', n.manualCalories, 'number', 'min="1000" max="7000" step="1" placeholder="По формуле"')}${field('Белок, г на кг', 'proteinPerKg', n.proteinPerKg, 'number', 'min="0.5" max="3" step="0.1" required')}${field('Жиры, г на кг', 'fatPerKg', n.fatPerKg, 'number', 'min="0.3" max="2" step="0.1" required')}<div class="form-full"><p class="help">Оставь поля ниже пустыми для расчёта по массе тела. Углеводы — остаток калорий после белка и жиров.</p></div><div class="form-three form-full">${field('Белок вручную, г', 'manualProtein', n.manualProtein, 'number', 'min="0" max="500" step="1"')}${field('Жиры вручную, г', 'manualFat', n.manualFat, 'number', 'min="0" max="350" step="1"')}${field('Углеводы вручную, г', 'manualCarbs', n.manualCarbs, 'number', 'min="0" max="1200" step="1"')}</div></div><div class="form-actions"><button class="btn primary" type="submit">Сохранить и рассчитать</button><button type="button" class="btn outline" data-nav="profile">Анкета</button></div><p class="form-error" id="nutrition-error"></p></form><div class="divider"></div><p class="help">Поправка +10% и +10 ккал — разные настройки. Цель в анкете не меняет калории без твоего действия. Коэффициент активности описывает весь день, а не только число тренировок.</p></section><div class="stack"><section class="panel pad">${calc ? `<div class="eyebrow">ТЕКУЩИЙ ОРИЕНТИР</div><div class="calories">${calc.calories}</div><p class="stat-label">ккал в сутки</p><div class="macro-grid"><div class="macro"><b>${calc.protein}</b><small>Белки, г</small></div><div class="macro"><b>${calc.fat}</b><small>Жиры, г</small></div><div class="macro"><b>${calc.carbs}</b><small>Углеводы, г</small></div></div><div class="divider"></div><p class="help">Расход в покое: ~${calc.bmr} ккал<br>Поддержание с выбранной активностью: ~${calc.maintenance} ккал<br>Энергия из БЖУ: ${calc.macroCalories} ккал</p>${Math.abs(calc.difference) > 10 ? `<div class="notice warn" style="margin:16px 0 0">Ручные БЖУ отличаются от цели на ${calc.difference} ккал. Проверь значения.</div>` : ''}` : `<div class="eyebrow">СНАЧАЛА ИСХОДНЫЕ ДАННЫЕ</div><h2>Нужна анкета</h2><p class="sub">${h(error)}</p><button class="btn primary" data-nav="profile" style="margin-top:20px">Перейти в профиль</button>`}</section><section class="panel pad"><h3>Как устроен расчёт</h3><p class="help" style="margin-top:13px">Расход в покое = 10 × вес (кг) + 6,25 × рост (см) − 5 × возраст + коэффициент пола: +5 или −161. Затем применяется выбранный коэффициент активности и твоя поправка.</p><p class="help" style="margin-top:11px">1,6 г/кг белка и 0,8 г/кг жиров — стартовые редактируемые параметры приложения, а не персональное назначение. Поддержание уточняется по фактической динамике веса. Автоматический расчёт ограничен взрослыми без специальных медицинских потребностей.</p><div class="source-list"><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">Исходная формула, Mifflin et al. (1990) ↗</a><br><a href="https://pubmed.ncbi.nlm.nih.gov/28698222/" target="_blank" rel="noopener noreferrer">Исследование белка и силовых тренировок ↗</a></div></section></div></div><section class="panel pad" style="margin-top:22px"><div class="section-title"><h2>Фактическое питание</h2><button class="btn" data-action="nutrition-log">${ic('plus')}Записать день</button></div><p class="help">Ручной итог за день, не база продуктов. Эти записи не меняют цель и не считаются автоматически из упражнений.</p>${state.nutritionLog.length ? state.nutritionLog.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(x => `<div class="mini-item"><div><h3>${h(x.date)}</h3><p class="help">Б ${h(x.protein)} / Ж ${h(x.fat)} / У ${h(x.carbs)} г${x.notes ? ' · ' + h(x.notes) : ''}</p></div><strong>${h(x.calories)} ккал</strong></div>`).join('') : ''}</section>`; }
    const inBodyMetrics = [
        ['weight', 'Вес', 'кг'], ['skeletalMuscleMass', 'Скелетная мышечная масса', 'кг'], ['bodyFatMass', 'Жировая масса', 'кг'], ['bodyFatPercent', 'Доля жира', '%'], ['inBodyScore', 'Оценка InBody', '/100'], ['bmi', 'ИМТ', ''],
        ['visceralFatLevel', 'Висцеральный жир', 'ур.'], ['fatFreeMass', 'Безжировая масса', 'кг'], ['totalBodyWater', 'Вода', 'л'], ['protein', 'Белок', 'кг'], ['minerals', 'Кости (название отчёта)', 'кг'], ['basalMetabolicRate', 'Обмен веществ (из отчёта)', 'ккал'],
        ['recommendedCalories', 'Суточная норма калорий (из отчёта)', 'ккал'], ['idealWeight', 'Идеальный вес (из отчёта)', 'кг'], ['weightControl', 'До идеального веса · вес', 'кг'], ['fatControl', 'До идеального веса · жир', 'кг'], ['muscleControl', 'До идеального веса · мышцы', 'кг']
    ];
    const inBodyRegions = [['leftArm', 'Левая рука'], ['rightArm', 'Правая рука'], ['trunk', 'Торс'], ['leftLeg', 'Левая нога'], ['rightLeg', 'Правая нога']];
    const metricText = (value, unit) => value == null ? '—' : String(value).replace('.', ',') + (unit ? ' ' + unit : '');
    async function sha256Hex(data) { const hash = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    function rangedInBody(records) {
        if (ui.inBodyRange === 'all') return records;
        const cutoff = new Date(today() + 'T12:00:00'); cutoff.setMonth(cutoff.getMonth() - Number(ui.inBodyRange));
        const day = cutoff.toISOString().slice(0, 10);
        return records.filter(record => record.measuredAt >= day);
    }
    function inBodyChart(records) {
        const def = inBodyMetrics.find(x => x[0] === ui.inBodyMetric) || inBodyMetrics[0], points = rangedInBody(records).slice().sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)).filter(x => Number.isFinite(x.metrics[def[0]]));
        if (!points.length) return '<p class="help">В выбранном периоде нет этого показателя.</p>';
        const values = points.map(x => x.metrics[def[0]]);
        if (points.length === 1) return `<svg class="inbody-chart" viewBox="0 0 600 155" role="img" aria-label="Один замер: ${h(def[1])}"><circle cx="300" cy="66" r="6"/><text x="300" y="148" text-anchor="middle">${h(points[0].measuredAt.slice(5))}</text></svg><p class="help">${h(def[1])}: ${metricText(values[0], def[2])}. Для динамики добавьте следующий замер.</p>`;
        const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
        const xy = values.map((v, i) => [20 + i * 560 / Math.max(1, values.length - 1), 125 - (v - min) * 95 / span]);
        const delta = Math.round((values.at(-1) - values[0]) * 100) / 100, deltaUnit = def[0] === 'bodyFatPercent' ? 'п.п.' : def[2];
        return `<svg class="inbody-chart" viewBox="0 0 600 155" role="img" aria-label="Динамика: ${h(def[1])}"><polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="5"/><text x="${p[0]}" y="148" text-anchor="middle">${h(points[i].measuredAt.slice(5))}</text>`).join('')}</svg><p class="help">${h(def[1])}: ${metricText(values.at(-1), def[2])}; изменение от первого показанного замера ${delta > 0 ? '+' : ''}${String(delta).replace('.', ',')} ${h(deltaUnit)}.</p>`;
    }
    function renderInBodySegments(record) {
        const groups = [['muscle', 'Содержание мышц'], ['fat', 'Содержание жира']];
        const sections = groups.map(([key, title]) => {
            const data = record.segments?.[key]; if (!data) return '';
            const rows = inBodyRegions.filter(([region]) => data[region]).map(([region, label]) => { const item = data[region]; return `<div class="mini-item"><div><strong>${h(label)}</strong><p class="help">${h(item.status || 'Без оценки источника')}</p></div><span>${metricText(item.value, item.unit || 'кг')} · ${metricText(item.percent, '%')}</span></div>`; }).join('');
            return rows ? `<section class="panel pad"><h3>${h(title)}</h3><div style="margin-top:12px">${rows}</div></section>` : '';
        }).join('');
        return sections ? `<div class="grid2" style="margin-top:20px">${sections}</div>` : '';
    }
    function renderInBodySource(record) {
        const ranges = record.sourceDetails?.ranges || {}, assessments = record.sourceDetails?.assessments || {};
        const rows = Object.entries(ranges).map(([key, range]) => { const def = inBodyMetrics.find(x => x[0] === key); if (!def || !range) return ''; const label = record.sourceDetails?.labels?.[key] || def[1], unit = record.sourceDetails?.units?.[key] || def[2]; return `<div class="mini-item"><span class="help">${h(label)} · диапазон источника${assessments[key] ? ' · ' + h(assessments[key]) : ''}</span><strong>${metricText(range.normalMin, unit)}–${metricText(range.normalMax, unit)}</strong></div>`; }).join('');
        return rows ? `<details class="panel pad profile-advanced" style="margin-top:20px"><summary><h3>Диапазоны и оценки источника</h3><span class="help">без переоценки приложением</span></summary><div style="margin-top:12px">${rows}</div></details>` : '';
    }
    function renderInBodyDetails(record) {
        if (!record) return '';
        const extras = inBodyMetrics.slice(6).filter(([key]) => record.metrics[key] != null).map(([key, label, unit]) => `<div class="mini-item"><span class="help">${h(label)}</span><strong>${metricText(record.metrics[key], unit)}</strong></div>`).join('');
        const context = record.context || {}, contextParts = [
            context.subjectName ? 'Имя в отчёте: ' + h(context.subjectName) : '',
            context.sex ? 'Пол: ' + h(context.sex) : '',
            Number.isFinite(context.ageAtMeasurement) ? 'Возраст на замер: ' + h(context.ageAtMeasurement) : '',
            Number.isFinite(context.heightAtMeasurement) ? 'Рост на замер: ' + h(context.heightAtMeasurement) + ' см' : ''
        ].filter(Boolean);
        return `${contextParts.length ? '<p class="help" style="margin-top:16px">' + contextParts.join(' · ') + '</p>' : ''}${extras ? '<section class="panel pad" style="margin-top:20px"><h3>Дополнительные показатели</h3><div style="margin-top:12px">' + extras + '</div></section>' : ''}${renderInBodySegments(record)}${renderInBodySource(record)}${record.conditions || record.comment ? '<section class="panel pad" style="margin-top:20px"><h3>Условия и комментарий</h3><p class="help">' + h(record.conditions || 'Условия не указаны') + (record.comment ? '<br>' + h(record.comment) : '') + '</p></section>' : ''}`;
    }
    function renderInBody() {
        const records = state.inBody.slice().sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)), latest = records[0], previous = records[1];
        const ranges = [['1', '1 мес'], ['3', '3 мес'], ['6', '6 мес'], ['12', '12 мес'], ['all', 'Всё']];
        return heading('Состав тела', 'InBody', 'Храни историю измерений, сравнивай изменения и импортируй поддерживаемый PDF. Это журнал показателей, не диагноз.', `<div class="row"><button class="btn outline" data-action="inbody-pdf">${ic('download')}Импорт PDF</button><button class="btn primary" data-action="inbody-new">${ic('plus')}Ввести вручную</button></div>`) +
        (latest ? `<div class="metrics inbody-metrics">${inBodyMetrics.slice(0, 6).map(([key, label, unit]) => { const value = latest.metrics[key], before = previous?.metrics[key], delta = Number.isFinite(value) && Number.isFinite(before) ? Math.round((value - before) * 100) / 100 : null, deltaUnit = key === 'bodyFatPercent' ? 'п.п.' : unit; return `<section class="panel metric"><div class="metric-label">${h(label)}</div><strong>${metricText(value, unit)}</strong><small>${delta == null ? 'Нет сопоставимого прошлого замера' : 'К прошлому: ' + (delta > 0 ? '+' : '') + String(delta).replace('.', ',') + (deltaUnit ? ' ' + deltaUnit : '')}</small></section>`; }).join('')}</div><section class="panel pad"><div class="section-title"><h2>Динамика</h2><div class="row">${inBodyMetrics.slice(0, 5).map(([key, label]) => `<button class="btn small ${ui.inBodyMetric === key ? 'accent' : 'ghost'}" data-action="inbody-metric" data-metric="${key}">${h(label)}</button>`).join('')}</div></div><div class="row" style="margin-bottom:12px">${ranges.map(([key, label]) => `<button class="btn small ${ui.inBodyRange === key ? 'accent' : 'ghost'}" data-action="inbody-range" data-range="${key}">${label}</button>`).join('')}</div>${inBodyChart(records)}</section>${renderInBodyDetails(latest)}` : empty('Замеров пока нет', 'Импортируй PDF InBody или внеси показатели вручную. Исходный PDF остаётся на устройстве.', '<button class="btn primary" data-action="inbody-pdf">Импортировать PDF</button>')) +
        `<section class="panel pad" style="margin-top:20px"><div class="section-title"><h2>История замеров</h2><span class="pill">${records.length}</span></div>${records.length ? records.map(x => `<article class="mini-item"><div><h3>${dateLabel(x.measuredAt)}</h3><p class="help">${h(x.source)} · импорт ${h((x.importedAt || '').slice(0, 10))}<br>Вес ${metricText(x.metrics.weight, 'кг')} · мышцы ${metricText(x.metrics.skeletalMuscleMass, 'кг')} · жир ${metricText(x.metrics.bodyFatPercent, '%')}${x.manualEdits?.length ? ' · ручных правок: ' + x.manualEdits.length : ''}</p></div><button class="btn outline small" data-action="inbody-edit" data-id="${h(x.id)}">${ic('edit')}Правка</button></article>`).join('') : '<p class="help">Пока пусто.</p>'}</section><div class="notice" style="margin-top:20px">Исходный PDF не загружается в публичные файлы или Storage: в профиль сохраняются только распознанные показатели, дата, источник и SHA-256 для защиты от дублей. Показатели InBody не меняют цели питания или анкету автоматически.</div>`;
    }
    function segmentEditorFields(segments = {}) {
        return [['muscle', 'Содержание мышц'], ['fat', 'Содержание жира']].map(([group, title]) => `<fieldset class="form-full"><legend>${h(title)}</legend><div class="form-grid">${inBodyRegions.map(([region, label]) => { const item = segments[group]?.[region] || {}; return field(label + ', кг', `segment-${group}-${region}-value`, item.value ?? '', 'number', 'min="0" max="100000" step="0.01"') + field(label + ', %', `segment-${group}-${region}-percent`, item.percent ?? '', 'number', 'min="0" max="100000" step="0.01"') + field(label + ' · оценка источника', `segment-${group}-${region}-status`, item.status || '', 'text', 'maxlength="120"'); }).join('')}</div></fieldset>`).join('');
    }
    function inBodyEditor(id) {
        const old = state.inBody.find(x => x.id === id), m = old?.metrics || {};
        formModal(old ? 'Исправить замер InBody' : 'Новый замер InBody', `<div class="notice">Правка влияет только на этот замер. Профиль, калории и программа не меняются.</div><div class="form-grid">${field('Дата измерения', 'measuredAt', old?.measuredAt || today(), 'date', 'required')}${inBodyMetrics.map(([key, label, unit]) => field(label + (unit ? ', ' + unit : ''), key, m[key] ?? '', 'number', `${['weightControl','fatControl','muscleControl'].includes(key) ? 'min="-100000"' : 'min="0"'} max="100000" step="0.01"`)).join('')}<label class="form-full">Условия замера<textarea name="conditions" maxlength="6000">${h(old?.conditions || '')}</textarea></label><label class="form-full">Комментарий<textarea name="comment" maxlength="6000">${h(old?.comment || '')}</textarea></label><label class="form-full">Источник<textarea name="source" maxlength="240">${h(old?.source || 'Ручной ввод')}</textarea></label><details class="form-full profile-advanced"><summary>Сегменты тела (необязательно)</summary><div style="margin-top:12px">${segmentEditorFields(old?.segments)}</div></details></div>`, async form => {
            const f = new FormData(form), measuredAt = String(f.get('measuredAt')), metrics = {};
            if (!N.validDay(measuredAt) || measuredAt > today()) throw Error('Проверь дату измерения');
            for (const [key] of inBodyMetrics) { const raw = String(f.get(key) || '').trim(); if (raw !== '') { const value = Number(raw.replace(',', '.')); if (!Number.isFinite(value) || (!['weightControl','fatControl','muscleControl'].includes(key) && value < 0)) throw Error('Проверь числовые показатели'); metrics[key] = value; } }
            if (!Object.keys(metrics).length) throw Error('Введи хотя бы один показатель');
            const segments = {};
            for (const group of ['muscle','fat']) for (const [region] of inBodyRegions) { const valueRaw = String(f.get(`segment-${group}-${region}-value`) || '').trim(), percentRaw = String(f.get(`segment-${group}-${region}-percent`) || '').trim(), status = String(f.get(`segment-${group}-${region}-status`) || '').trim(); if (valueRaw || percentRaw || status) { const value = valueRaw ? Number(valueRaw.replace(',', '.')) : null, percent = percentRaw ? Number(percentRaw.replace(',', '.')) : null; if ((valueRaw && (!Number.isFinite(value) || value < 0)) || (percentRaw && (!Number.isFinite(percent) || percent < 0))) throw Error('Проверь сегменты тела'); (segments[group] ||= {})[region] = { ...(valueRaw ? { value, unit: 'кг' } : {}), ...(percentRaw ? { percent } : {}), ...(status ? { status } : {}) }; } }
            const source = String(f.get('source') || 'Ручной ввод').trim() || 'Ручной ввод', conditions = String(f.get('conditions') || '').trim(), comment = String(f.get('comment') || '').trim();
            const manualEdits = old ? [...(old.manualEdits || []), { at: new Date().toISOString(), source: 'Ручная правка', changedFields: Object.keys(metrics).filter(key => metrics[key] !== old.metrics[key]) }] : [];
            const record = { id: old?.id || uid(), measuredAt, importedAt: old?.importedAt || new Date().toISOString(), source, sourceHash: old?.sourceHash || await sha256Hex(new TextEncoder().encode('manual|' + measuredAt + '|' + JSON.stringify(metrics) + '|' + Date.now())), metrics, ...(Object.keys(segments).length ? { segments } : {}), ...(old?.context ? { context: old.context } : {}), ...(old?.sourceDetails ? { sourceDetails: old.sourceDetails } : {}), ...(conditions ? { conditions } : {}), ...(comment ? { comment } : {}), ...(manualEdits.length ? { manualEdits } : {}) };
            if (old) state.inBody[state.inBody.indexOf(old)] = record; else N.addInBody(state, record);
            changed(); close(); render(); toast('Замер InBody сохранён. Анкета не изменялась.');
        });
    }
    async function parseInBodyPdf(file) {
        if (!file || file.size > 12000000 || file.type && file.type !== 'application/pdf') throw Error('Выбери PDF до 12 МБ');
        const data = await file.arrayBuffer(), sourceHash = await sha256Hex(data);
        if (state.inBody.some(x => x.sourceHash === sourceHash)) throw Error('Этот PDF уже импортирован — дубликат не создан.');
        const pdf = await getDocument({ data: new Uint8Array(data) }).promise; let text = ''; const items = [];
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) { const page = await pdf.getPage(pageNo), content = await page.getTextContent(); text += ' ' + content.items.map(x => x.str).join(' '); items.push(...content.items); }
        const parsed = parseInBodyText(text, items);
        return { ...parsed, id: uid(), importedAt: new Date().toISOString(), source: 'InBody PDF · локальный импорт', sourceHash };
    }
    async function previewInBodyPdf(file) {
        const record = await parseInBodyPdf(file); ui.inBodyImport = record;
        showModal('Проверь импорт InBody', `<div class="modal-body"><div class="notice">PDF обработан только в этом браузере. Оригинал не загружается и не сохраняется.</div><h3>Дата: ${h(record.measuredAt)}</h3><div class="grid2" style="margin-top:16px">${inBodyMetrics.filter(([key]) => record.metrics[key] != null).map(([key, label, unit]) => `<div class="mini-item"><span class="help">${h(label)}</span><strong>${metricText(record.metrics[key], unit)}</strong></div>`).join('')}</div>${renderInBodyDetails(record)}</div>`, '<div class="modal-foot"><button class="btn outline" data-action="close">Отмена</button><button class="btn primary" data-action="inbody-save-import">Сохранить без изменения профиля</button></div>');
    }

    function renderProfile() { const p = state.profile; return heading('Твоё пространство', 'Профиль и настройки', 'Анкета принадлежит только этому профилю. Рост, вес и другие сведения не копируются между пользователями.') + `<div class="profile-grid"><section class="panel pad"><div class="section-title"><h2>Мини-анкета</h2><span class="pill">@${h(p.username)}</span></div><form id="profile-form"><div class="form-grid">${field('Имя в приложении', 'displayName', p.displayName, 'text', 'required maxlength="100"')}${field('Возраст, лет', 'age', p.age, 'number', 'required min="14" max="100" step="1"')}${field('Рост, см', 'height', p.height, 'number', 'required min="120" max="230" step="0.1"')}${field('Актуальный вес, кг', 'weight', p.weight, 'number', 'required min="30" max="300" step="0.1"')}${select('Коэффициент пола для формулы', 'sex', p.sex, { '': 'Не выбран', m: 'Мужской (+5)', f: 'Женский (−161)' })}${select('Цель', 'goal', p.goal, { maintain: 'Поддержание / самочувствие', mass: 'Набор мышечной массы', fatloss: 'Снижение жировой массы', strength: 'Сила' })}${select('Опыт тренировок', 'experience', p.experience, { beginner: 'Начинающий', intermediate: 'Есть регулярный опыт', advanced: 'Продвинутый' })}${select('Занятий в неделю', 'days', p.days, { '2': '2 занятия', '3': '3 занятия', '4': '4 занятия' })}${field('Время на занятие, минут', 'duration', p.duration, 'number', 'required min="30" max="120" step="5"')}${select('Предпочитаемый сплит', 'split', p.split || 'auto', { auto: 'По частоте занятий', full: 'Всё тело', upperlower: 'Верх / низ' })}<div class="form-full"><div class="field-label">Доступное оборудование</div><div class="check-options">${Object.entries(N.equipment).map(([k, v]) => `<label class="form-check"><input type="checkbox" name="equipment" value="${k}" ${p.equipment.includes(k) ? 'checked' : ''}>${v}</label>`).join('')}</div></div><label class="form-full">Предпочтения для себя и тренера<textarea name="preferences" maxlength="3000" placeholder="Что нравится, что хотелось бы развивать…">${h(p.preferences)}</textarea></label><label class="form-full">Не предлагать эти упражнения<textarea name="excluded" maxlength="3000" placeholder="По одному названию или фрагменту в строке">${h(p.excluded)}</textarea></label><label class="form-full">Ограничения, дискомфорт, рекомендации специалиста<textarea name="limitations" maxlength="3000" placeholder="Необязательное поле; не диагноз">${h(p.limitations)}</textarea></label><div class="form-full">${check('needsProfessional', 'Есть ограничения: автоматическую программу не составлять', p.needsProfessional)}</div><div class="form-full">${check('specialNutrition', 'Беременность, лактация или состояние, требующее лечебного питания: отключить автоматический калораж', p.specialNutrition)}</div><div class="form-full">${field('Часовой пояс (IANA)', 'timeZone', p.timeZone, 'text', 'required maxlength="100" placeholder="Europe/Moscow"')}</div></div><p class="help" style="margin-top:16px">Название упражнения в исключениях фильтрует варианты. Свободный текст предпочтений не интерпретируется как медицинское ограничение — для этого используй отдельные поля.</p><div class="form-actions"><button class="btn primary" type="submit">Сохранить анкету</button><button class="btn outline" type="button" data-action="generate">Черновик программы</button></div><p class="form-error" id="profile-error" role="alert"></p></form></section><aside class="stack"><section class="panel pad"><h3>Вход и приватность</h3><p class="help" style="margin-top:13px">Логин: <strong>${h(p.username)}</strong><br>${store.mode === 'cloud' ? 'Проверка пароля — Supabase Auth. Доступ к записи ограничен учётной записью на сервере. Владелец облачной базы технически может читать данные; сквозного шифрования здесь нет.' : 'Пароль расшифровывает этот локальный профиль. Без облака записи не появятся на другом устройстве сами.'}</p><button class="btn outline full" data-action="password" style="margin-top:16px">${ic('lock')}Изменить пароль</button><button class="btn outline full" data-action="request-notifications">${ic('clock')}${state.settings.notifications ? 'Выключить уведомления таймера' : 'Включить уведомления таймера'}</button><button class="btn ghost full" data-action="logout">${ic('logout')}Выйти / другой профиль</button><p class="help" style="font-size:10px">Для друга: выйти → новый профиль${store.mode === 'cloud' ? ' → код приглашения владельца' : ''}. Восстановление забытого пароля через почту не настроено.</p></section><details class="panel pad profile-advanced"><summary><h3>Данные и синхронизация</h3><span class="help">резервные копии и восстановление</span></summary><p class="help" style="margin-top:12px">${h(saveMessage)}. ${store.mode === 'cloud' ? 'Запись с другого устройства не перезапишет текущую молча: конфликт остановит сохранение.' : 'Изменения сохраняются автоматически в этом браузере. Для другого устройства подключи облако. Резервный JSON — дополнительная страховка, не обязательный шаг после тренировки.'}</p><div class="stack" style="gap:8px;margin-top:17px"><button class="btn primary full" data-action="export-encrypted">${ic('download')}Резервная копия · JSON</button><button class="btn outline full" data-action="export-json">${ic('download')}Личный JSON для переноса</button><button class="btn outline full" data-action="import">${ic('plus')}Перенести старый дневник</button><button class="btn outline full" data-action="restore-full">Восстановить JSON целиком</button><button class="btn ghost full" data-action="reload">Загрузить сохранённую версию</button></div><p class="help" style="font-size:10px;margin-top:12px">JSON содержит данные открытым текстом. Не загружай его в публичный репозиторий. Импорт старого HTML читает только JSON-блок, не выполняя код файла.</p></details><section class="panel pad"><div class="section-title"><h3>Динамика веса</h3><button class="btn small" data-action="weight">${ic('plus')}Запись</button></div>${state.weights.length ? state.weights.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map(w => `<div class="mini-item"><span class="help">${h(w.date)}</span><strong>${h(w.value)} кг</strong></div>`).join('') : '<p class="help">Пока без замеров. Записи с датами появятся после заполнения анкеты или ручного добавления.</p>'}</section>${state.migrationNotes.length ? `<section class="panel pad"><h3>Что перенесено из файлов</h3>${state.migrationNotes.map(x => `<p class="tip">${h(x)}</p>`).join('')}</section>` : ''}<section class="panel pad"><h3>О приложении</h3><p class="help" style="margin-top:12px">Код сайта — отдельно от личных копий. NEO FIT 3.0. ${store.mode === 'local' ? 'Сейчас данные хранятся на этом устройстве; для синхронизации нужен отдельный Supabase-проект.' : 'Данные профиля отделены от публичных файлов сайта.'}</p></section></aside></div>`; }
    function listFor(c) { if (c.kind === 'program')
        return state.programs[c.program ?? ui.program]?.exercises; if (c.kind === 'history')
        return state.history.find(s => s.id === (c.session || ui.historyEdit))?.exercises; return state.draft?.exercises; }
    function exContext(kind, id) { return { kind, id, program: ui.program, session: ui.historyEdit }; }
    function showTechnique(kind, id) { const e = listFor(exContext(kind, id))?.find(x => x.id === id); if (!e) return; const q = encodeURIComponent(e.name + ' техника выполнения'); showModal('Техника: ' + e.name, `<div class="modal-body"><span class="pill">Краткая памятка</span><p style="margin:17px 0;font-size:14px;line-height:1.8">${h(e.technique || 'Для своего упражнения добавь памятку в редакторе. Проверяй настройку оборудования с тренером.')}</p><p class="help"><b>Основные мышцы:</b> ${h((e.primaryMuscles || [e.group]).join(', '))}<br><b>Дополнительные:</b> ${h((e.secondaryMuscles || []).join(', ') || 'не указаны')}<br><b>Сложность:</b> ${h(e.difficulty || 'не указана')}</p><div class="notice warn" style="margin-top:14px">Описание общее и не учитывает твою анатомию и модель тренажёра. При боли останови упражнение. Поисковые результаты не проходят проверку приложения.</div><div class="row"><a class="btn primary" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener noreferrer">${ic('play')}Найти на YouTube ↗</a><a class="btn outline" href="https://yandex.ru/search/?text=${q}" target="_blank" rel="noopener noreferrer">${ic('search')}Найти в Яндексе ↗</a></div><p class="help" style="margin-top:18px">${h(e.source || 'NEO FIT: общая памятка')}. Ссылки выше — поиск только по названию упражнения и технике.</p></div>`); }
    function openPicker(c, replacing = false, mode = '') {
        const old = listFor(c)?.find(e => e.id === c.id);
        if (replacing && !mode) {
            showModal('Как подобрать замену?', `<div class="modal-body"><p class="help">Для <strong>${h(old?.name || '')}</strong> можно сохранить тип движения или выбрать вариант только по основной мышечной группе. Второй вариант может ощущаться и нагружаться иначе.</p><button class="selection-card" data-action="replace-mode" data-kind="${h(c.kind)}" data-id="${h(c.id)}" data-mode="movement"><span class="grow"><strong>По типу движения</strong><small>Ближайший паттерн движения; приоритетный вариант.</small></span>${ic('arrow')}</button><button class="selection-card" data-action="replace-mode" data-kind="${h(c.kind)}" data-id="${h(c.id)}" data-mode="muscle"><span class="grow"><strong>По мышечной группе</strong><small>Шире выбор; биомеханика и рабочий вес могут отличаться.</small></span>${ic('arrow')}</button></div>`);
            return;
        }
        const preserveOld = !!(replacing && old?.logs?.some(N.entered));
        const context = preserveOld ? { ...c, id: undefined, oldId: c.id } : c;
        ui.picker = { ...context, replacing, mode, preserveOld };
        ui.search = '';
        const opts = replacing ? N.alternatives(old, state.profile, mode || 'movement') : N.library();
        ui.picker.options = opts;
        showModal(replacing ? 'Выбрать замену' : 'Добавить упражнение', `<div class="modal-body">${replacing ? `<div class="notice">${ic('swap')}<div>Вместо <strong>${h(old.name)}</strong>. ${mode === 'muscle' ? 'Совпадает основная мышечная группа; движение может отличаться.' : 'Сохранён тип движения, насколько позволяет оборудование.'} Рабочий вес не переносится.${preserveOld ? '<br><b>В старом упражнении есть данные: оно останется, а новое добавится рядом.</b>' : ''}</div></div>` : '<p class="help" style="margin-bottom:15px">Можно добавить упражнение из каталога или своё. По умолчанию во время занятия — только на сегодня.</p>'}<label>Поиск<input id="exercise-search" type="search" placeholder="Название, синоним или мышца" autocomplete="off"></label><div class="search-results" id="exercise-options">${pickerOptions(opts)}</div><div class="divider"></div><button class="btn outline full" data-action="custom-ex">${ic('plus')}Написать своё упражнение</button></div>`);
        $('#exercise-search').focus();
    }
    function pickerOptions(opts) { return opts.length ? opts.map(e => `<button class="selection-card" data-action="pick-ex" data-catalog="${h(e.catalogId)}"><span class="tracker-icon">${ic('dumbbell')}</span><span class="grow"><strong>${h(e.name)}</strong><small>${h(e.group)} · ${h(N.equipment[e.equipment])}</small>${e.matchReason ? `<small>${h(e.matchReason)} · ${h(e.loadChange)}</small>` : ''}</span>${ic('arrow')}</button>`).join('') : '<p class="help" style="padding:20px 0">Точного аналога для выбранного оборудования нет. Добавь своё упражнение, не считая любое движение на ту же мышцу равноценной заменой.</p>'; }

    function editExercise(c, newEx) { const list = listFor(c); if (!list)
        return; const existing = list.find(x => x.id === c.id), adding = !existing; let e = newEx ? clone(newEx) : existing ? clone(existing) : { ...N.fromLibrary('crunch-machine'), id: uid(), name: '', group: 'Другое', catalogId: '', pattern: 'custom', technique: '', originalName: '', weightMode: 'unspecified' }; const locked = !!existing?.logs?.some(N.entered); if (newEx && existing) {
        e.id = existing.id;
        e.originalName = existing.originalName || existing.name;
    } if (locked) {
        e = clone(existing);
    } ui.editor = { ...c, existingId: existing?.id, exercise: e, adding, locked, move: 0 }; formModal(adding ? 'Добавить упражнение' : 'Настройки упражнения', `${locked ? '<div class="notice warn">Есть результаты: название, число подходов и стороны заблокированы. Тип веса, технику и заметки можно уточнить явно; веса не пересчитываются.</div>' : ''}<div class="form-grid"><div class="form-full">${field('Название', 'name', e.name, 'text', `required maxlength="240" ${locked ? 'readonly' : ''}`)}</div>${select('Группа мышц', 'group', e.group, Object.fromEntries(N.groups.map(x => [x, x])))}${select('Как записывать вес', 'weightMode', e.weightMode, N.labels)}${select('Оборудование', 'equipment', e.equipment, N.equipment)}${select('Тип движения для поиска замен', 'pattern', e.pattern || 'custom', { custom: 'Своё / не определён', ...Object.fromEntries([...new Set(N.library().map(x => x.pattern))].map(p => [p, { 'vertical-pull': 'Вертикальная тяга', 'horizontal-pull': 'Горизонтальная тяга', 'incline-press': 'Наклонный жим', 'horizontal-press': 'Горизонтальный жим', 'chest-fly': 'Сведение на грудь', 'elbow-flexion': 'Сгибание локтя', 'neutral-curl': 'Молотковое сгибание', 'elbow-extension': 'Разгибание локтя', 'knee-dominant': 'Приседание / жим ногами', 'knee-flexion': 'Сгибание колена', 'knee-extension': 'Разгибание колена', 'hip-extension': 'Разгибание бедра', 'hip-abduction': 'Отведение бедра', 'calf-seated': 'Икры сидя', 'calf-standing': 'Икры стоя', 'rear-delt': 'Задняя дельта', 'lateral-raise': 'Отведение плеча', 'vertical-press': 'Жим вверх', 'trunk-flexion': 'Скручивание корпуса', 'trunk-stability': 'Стабилизация корпуса' }[p] || p])) })}<div class="form-three form-full">${field('Подходов', 'sets', e.sets, 'number', `required min="1" max="30" step="1" ${locked ? 'readonly' : ''}`)}${field('Повторы от', 'repsMin', e.repsMin, 'number', 'required min="1" max="500" step="1"')}${field('Повторы до', 'repsMax', e.repsMax, 'number', 'required min="1" max="500" step="1"')}</div><div class="form-full">${field('План по подходам (через запятую; можно очистить)', 'targets', e.targets.map(t => t.reps).join(', '), 'text', 'maxlength="500" placeholder="12, 10, 10, 10"')}<p class="help" style="margin-top:6px">При изменении числа подходов очисти строку для одинакового диапазона. Это план повторов, не выполненный результат.</p></div>${field('Отдых, секунд', 'restSeconds', e.restSeconds, 'number', 'required min="0" max="1800" step="1"')}${field('Тренажёр / вариант', 'machine', e.machine, 'text', 'maxlength="240" placeholder="Например, Panatta"')}<div class="form-full">${check('unilateral', 'Записывать левую и правую стороны отдельно', e.unilateral)}</div><label class="form-full">Памятка по технике<textarea name="technique" maxlength="4000">${h(e.technique)}</textarea></label><label class="form-full">Заметка<textarea name="notes" maxlength="4000">${h(e.notes)}</textarea></label>${c.kind === 'draft' ? `<div class="form-full">${check('alsoProgram', 'Также добавить / изменить в шаблоне на будущее', false)}</div>` : ''}</div>${c.kind === 'program' && !adding ? `<div class="divider"></div><div class="row between"><div class="row"><button type="button" class="btn small" data-action="move-ex" data-direction="-1">${ic('up')}Раньше</button><button type="button" class="btn small" data-action="move-ex" data-direction="1">${ic('down')}Позже</button></div><button type="button" class="btn danger small" data-action="delete-ex">${ic('trash')}Удалить</button></div>` : ''}`, saveExercise); }
    function saveExercise(form) { const c = ui.editor, list = listFor(c), f = new FormData(form); if (!list)
        throw Error('Не найдено занятие'); const old = list.find(x => x.id === c.existingId), e = { ...clone(c.exercise), name: String(f.get('name')).trim(), group: String(f.get('group')), equipment: String(f.get('equipment')), weightMode: String(f.get('weightMode')), pattern: String(f.get('pattern')), sets: Number(f.get('sets')), repsMin: Number(f.get('repsMin')), repsMax: Number(f.get('repsMax')), restSeconds: Number(f.get('restSeconds')), machine: String(f.get('machine')).trim(), notes: String(f.get('notes')), technique: String(f.get('technique')), unilateral: f.has('unilateral') }; if (!e.name || e.repsMax < e.repsMin)
        throw Error('Проверь название и диапазон повторов'); if (c.locked && (e.name !== old.name || e.sets !== old.sets || e.unilateral !== old.unilateral))
        throw Error('Нельзя менять структуру упражнения с результатами. Добавь упражнение отдельно.'); const targetText = String(f.get('targets')).trim(); const targets = targetText ? targetText.split(/[,;]/).map(x => x.trim()) : Array.from({ length: e.sets }, () => e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}–${e.repsMax}`); if (targets.length !== e.sets || !targets.every(x => /^\d{1,3}(?:[–-]\d{1,3})?$/.test(x) && x.split(/[–-]/).every(y => Number(y) > 0 && Number(y) <= 500)))
        throw Error('В строке плана нужно по одному числу или диапазону на каждый подход.'); e.targets = targets.map((r, i) => ({ reps: r, sourceWeight: c.exercise.targets?.[i]?.sourceWeight ?? null })); if (!e.originalName)
        e.originalName = e.name; if (e.name !== c.exercise.name) {
        const known = N.library().find(x => N.normal(x.name) === N.normal(e.name));
        e.catalogId = known?.catalogId || '';
    } if (c.kind !== 'program') {
        if (c.locked) {
            e.logs = clone(old.logs);
            e.skipped = old.skipped;
        }
        else {
            e.logs = N.makeLogs(e);
            e.skipped = false;
        }
        if (c.kind === 'history')
            e.addedAt = new Date().toISOString();
    } const index = list.findIndex(x => x.id === c.existingId); if (index < 0) {
        if (list.length >= 60)
            throw Error('Слишком много упражнений');
        list.push(e);
    }
    else
        list[index] = e; if (c.kind === 'program' && c.move) {
        const pos = list.findIndex(x => x.id === e.id), to = pos + c.move;
        if (to >= 0 && to < list.length)
            [list[pos], list[to]] = [list[to], list[pos]];
    } if (f.has('alsoProgram') && state.draft) {
        const p = state.programs.find(x => x.id === state.draft.templateId);
        if (p) {
            const plain = clone(e);
            delete plain.logs;
            delete plain.skipped;
            const i = p.exercises.findIndex(x => x.id === e.id);
            if (i < 0)
                p.exercises.push(plain);
            else
                p.exercises[i] = plain;
        }
    } changed(); close(); render(); toast(c.kind === 'program' ? 'Шаблон сохранён. История не изменена.' : 'Упражнение добавлено или изменено в занятии.'); }
    function editSchedule() {
        const preview = N.schedulePreview(state, state.schedule.startDate < today() ? today() : state.schedule.startDate, 4);
        const options = Object.fromEntries(state.programs.map(p => [p.id, p.title]));
        const currentId = state.schedule.queue[state.schedule.nextIndex] || state.programs[0]?.id || '';
        formModal('Расписание тренировок', `<div class="form-grid"><div class="form-full"><div class="field-label" style="margin-bottom:9px">Удобные дни</div>${daySelect('weekdays', state.schedule.weekdays)}</div>${field('Ближайшая дата / начало плана', 'startDate', state.schedule.startDate, 'date', 'required')}${state.programs.length ? select('С какой тренировки продолжить очередь', 'nextTemplateId', currentId, options) : ''}<div class="form-full"><details><summary>Порядок очереди</summary><p class="help" style="margin:9px 0">Повторы разрешены. Укажи названия по одному в строке; неизвестные названия не принимаются.</p><textarea name="queue" maxlength="2000">${h(state.schedule.queue.map(id => state.programs.find(p => p.id === id)?.title).filter(Boolean).join('\n'))}</textarea></details></div><div class="form-full"><h3>Превью на 4 недели</h3><div class="schedule-preview">${preview.map(x => `<span><b>${h(x.date)}</b> · ${h(x.title)}</span>`).join('') || '<span>Добавь шаблоны, чтобы увидеть план.</span>'}</div><p class="help">Пропуск даты не двигает очередь. Она меняется после завершения занятия или явного пропуска шаблона.</p></div></div>`, form => {
            const f = new FormData(form), chosen = f.getAll('weekdays').map(Number), startDate = String(f.get('startDate'));
            if (!chosen.length) throw Error('Выбери хотя бы один день');
            if (!N.validDay(startDate)) throw Error('Проверь дату начала');
            const names = String(f.get('queue')).split(/\n+/).map(x => x.trim()).filter(Boolean);
            const queue = names.map(name => state.programs.find(p => N.normal(p.title) === N.normal(name))?.id);
            if (state.programs.length && (!queue.length || queue.some(id => !id))) throw Error('В очереди есть неизвестное название');
            const nextId = String(f.get('nextTemplateId') || queue[0] || '');
            const nextIndex = Math.max(0, queue.indexOf(nextId));
            state.schedule = { mode: 'queue', weekdays: chosen, startDate, queue, nextIndex };
            changed(); close(); render();
        });
    }
    function choosePreset() { const cards = N.starterCatalog(); showModal('Общие основы программы', `<div class="modal-body"><p class="help">Нейтральные редактируемые основы появляются только после входа. Применение заменит текущие шаблоны, но сохранит историю и архивирует прежнюю программу.</p>${cards.map(x => `<button class="selection-card" data-action="apply-preset" data-preset="${h(x.id)}"><span class="grow"><strong>${h(x.title)}</strong><small>${h(x.description)} · ${x.programs.length} шабл.</small></span>${ic('arrow')}</button>`).join('')}<p class="help" style="margin-top:16px">Источники принципов: ACSM, NHS и Physical Activity Guidelines. Это адаптации NEO FIT, не официальные программы организаций и не персональное назначение.</p></div>`); }
    function applyPrograms(programs, schedule) { if (state.draft)
        throw Error('Заверши или отмени черновик перед сменой программы'); state.archivedPrograms.push({ date: new Date().toISOString(), programs: clone(state.programs) }); state.programs = clone(programs); state.schedule = N.upgrade({ ...clone(state), programs: state.programs, schedule: clone(schedule) }).schedule; ui.program = 0; changed(); goto('program'); }
    function generator() { generated = N.generatePlan(state.profile); showModal('Черновик по анкете', `<div class="modal-body"><div class="notice warn">Это подбор по фиксированным правилам: опыт, число дней, сплит, длительность и оборудование. Свободные предпочтения нужно учесть вручную. Готовый черновик не заменяет работу тренера.</div>${generated.map(p => `<h3 style="margin-top:17px">${h(p.title)}</h3><p class="help">${p.exercises.map(e => h(e.name) + ' — ' + e.sets + ' подхода').join('<br>')}</p>`).join('')}<p class="help" style="margin-top:18px">Веса не назначены. Применение не меняет историю.</p></div>`, `<div class="modal-foot"><button class="btn outline" data-action="close">Не применять</button><button class="btn primary" data-action="apply-generated">Применить черновик</button></div>`); }
    function pastWorkoutEditor() {
        const defaultId = state.schedule.queue?.[state.schedule.nextIndex] || state.programs[0]?.id || '';
        const suggestedDate = N.addDays(today(), -1), info = N.pastQueueInfo(state, defaultId, suggestedDate);
        const options = { ...Object.fromEntries(state.programs.map(p => [p.id, p.title])), own: 'Своя тренировка' };
        const body = '<div class="notice">Запиши только то, что действительно выполнил(а). Веса, повторы и RIR не подставляются. После выбора откроется форма упражнений.</div><div class="form-grid">' + field('Дата тренировки', 'date', suggestedDate, 'date', 'required max="' + today() + '"') + select('Шаблон', 'templateId', defaultId || 'own', options) + field('Название своей тренировки', 'title', '', 'text', 'maxlength="160" placeholder="Если выбран свой вариант"') + check('queueIncluded', 'Учитывать эту тренировку в очереди программы', info.eligible) + '<p class="form-full help">' + (info.eligible ? 'Для выбранного шаблона последовательность однозначна.' : h(info.reason || 'Очередь по умолчанию не изменится.')) + '</p></div>';
        formModal('Добавить прошлую тренировку', body, form => {
          const f = new FormData(form), date = String(f.get('date')), selected = String(f.get('templateId'));
          if (!N.validDay(date) || date > today()) throw Error('Для завершённой прошлой тренировки нельзя выбрать будущую дату');
          N.startPastWorkout(state, selected === 'own' ? null : selected, date, String(f.get('title')));
          state.draft.queueIncluded = state.draft.queueEligible && f.has('queueIncluded');
          changed(); close(); goto('workout');
        }, 'Продолжить к упражнениям');
    }
    function trackerEditor(category, id) {
        const existing = state.trackers.find(x => x.id === id), start = existing ? N.addDays(today(), 1) : today();
        const t = existing ? clone(existing) : { category, name: '', form: 'capsule', unit: 'капсула', perDose: '1', substancePerUnit: '', foodRelation: 'any', notes: '', start, end: '', weekdays: [1, 2, 3, 4, 5, 6, 0], doses: [{ time: '08:00', amount: '1', period: 'morning' }] };
        const knownUnits = { capsule: 'капсула', tablet: 'таблетка', portion: 'порция', ml: 'мл', mg: 'мг', g: 'г', piece: 'шт.' };
        const unitKey = Object.entries(knownUnits).find(([, value]) => value === t.unit)?.[0] || 'other';
        const savedDoses = t.doses?.length ? t.doses : (t.times || ['08:00']).map(time => ({ time, amount: t.perDose || t.amount || '', period: 'exact' }));
        const doseRows = Array.from({ length: 6 }, (_, i) => {
          const dose = savedDoses[i] || { time: '', amount: '', period: i === 0 ? 'morning' : 'exact' };
          const period = dose.period || (dose.time === '08:00' ? 'morning' : dose.time === '13:00' ? 'day' : dose.time === '20:00' ? 'evening' : 'exact');
          return `<fieldset class="dose-builder"><legend>Приём ${i + 1}${i ? ' · заполни при необходимости' : ''}</legend><div class="dose-amount"><label>Количество<span class="amount-stepper"><button type="button" class="btn icon-only outline" data-action="amount-step" data-step="-1" aria-label="Уменьшить количество">−</button><input name="doseAmount-${i}" type="number" inputmode="decimal" min="0" max="100000" step="0.01" value="${h(dose.amount)}" placeholder="1"><button type="button" class="btn icon-only outline" data-action="amount-step" data-step="1" aria-label="Увеличить количество">+</button></span></label></div><div class="field-label">Время приёма</div><div class="segmented time-choice"><label><input type="radio" name="doseMode-${i}" value="morning" ${period === 'morning' ? 'checked' : ''}>Утро</label><label><input type="radio" name="doseMode-${i}" value="day" ${period === 'day' ? 'checked' : ''}>День</label><label><input type="radio" name="doseMode-${i}" value="evening" ${period === 'evening' ? 'checked' : ''}>Вечер</label><label><input type="radio" name="doseMode-${i}" value="exact" ${period === 'exact' ? 'checked' : ''}>Точное время</label></div><label class="exact-time">Точное время<input name="doseExact-${i}" type="time" value="${h(period === 'exact' ? dose.time : '')}"></label></fieldset>`;
        }).join('');
        const suggestions = category === 'supplement' ? '<datalist id="supplement-names"><option value="Омега-3"><option value="Магний"><option value="Витамин D"><option value="Витамин C"><option value="Цинк"><option value="Креатин"><option value="Мультивитамины"></datalist>' : '';
        formModal(existing ? 'Изменить будущий план' : category === 'peptide' ? 'Добавить запись назначения' : 'Добавить план приёма',
          `<div class="notice ${category === 'peptide' ? 'warn' : ''}">${existing ? 'Прошлые фактические отметки сохранятся. Изменение начнёт действовать с указанной даты.' : 'Название, единицы и количество вводишь только по своей записи или упаковке. Готовые схемы не подставляются.'}</div>${suggestions}<div class="form-grid"><div class="form-full">${field('Название', 'name', t.name, 'text', 'required maxlength="140" list="supplement-names" placeholder="Свой вариант или название с упаковки"')}</div><div class="form-full"><div class="field-label">Форма / единица учёта</div><div class="segmented unit-choice">${Object.entries(knownUnits).map(([key, label]) => `<label><input type="radio" name="unitChoice" value="${key}" ${unitKey === key ? 'checked' : ''}>${label}</label>`).join('')}<label><input type="radio" name="unitChoice" value="other" ${unitKey === 'other' ? 'checked' : ''}>Другое</label></div>${field('Своя единица для «Другое»', 'unitOther', unitKey === 'other' ? t.unit : '', 'text', 'maxlength="40" placeholder="например, мерная ложка"')}</div>${field('Вещества в единице (необязательно)', 'substancePerUnit', t.substancePerUnit || '', 'text', 'maxlength="80" placeholder="например, 500 мг"')}${select('Связь с едой', 'foodRelation', t.foodRelation || 'any', { any: 'Не указано', 'with-food': 'Во время еды', 'after-food': 'После еды', 'before-food': 'До еды', empty: 'Натощак' })}${field(existing ? 'Изменить начиная с' : 'Дата начала', 'start', start, 'date', 'required')}${field('Дата окончания (необязательно)', 'end', t.end, 'date', '')}<div class="form-full"><div class="row between"><div class="field-label">Дни приёма</div><button type="button" class="btn ghost small" data-action="every-day">Каждый день</button></div>${daySelect('weekdays', t.weekdays)}</div><div class="form-full"><div class="field-label">Приёмы в течение дня</div><div class="dose-builders">${doseRows}</div><p class="help">Заполни один или несколько приёмов. Для «Точного времени» используй нативный выбор времени телефона.</p></div><label class="form-full">Заметка / источник назначения<textarea name="notes" maxlength="4000">${h(t.notes)}</textarea></label>${category === 'peptide' ? `<div class="form-full">${check('ack', 'Понимаю: это личный журнал, не подбор курса или дозы', false)}</div>` : ''}</div>`, form => {
            const f = new FormData(form), date = String(f.get('start')), end = String(f.get('end')), weekdays = f.getAll('weekdays').map(Number);
            const periodTimes = { morning: '08:00', day: '13:00', evening: '20:00' };
            const doses = Array.from({ length: 6 }, (_, i) => { const amount = String(f.get('doseAmount-' + i) || '').trim(), period = String(f.get('doseMode-' + i) || 'exact'), exact = String(f.get('doseExact-' + i) || ''); return amount ? { amount, period, time: period === 'exact' ? exact : periodTimes[period] } : null; }).filter(Boolean);
            if (!N.validDay(date) || (end && (!N.validDay(end) || end < date))) throw Error('Проверь начало и окончание');
            if (!weekdays.length) throw Error('Выбери дни приёма');
            if (doses.length < 1 || new Set(doses.map(d => d.time)).size !== doses.length || !doses.every(d => /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time))) throw Error('Для каждого приёма укажи количество и уникальное время.');
            if (category === 'peptide' && !f.has('ack')) throw Error('Подтверди, что это запись собственного назначения');
            const choice = String(f.get('unitChoice')), unit = choice === 'other' ? String(f.get('unitOther') || '').trim() : knownUnits[choice];
            if (!unit) throw Error('Укажи единицу учёта');
            const patch = { category, name: String(f.get('name')).trim(), form: choice, unit, perDose: doses[0].amount, substancePerUnit: String(f.get('substancePerUnit')).trim(), foodRelation: String(f.get('foodRelation')), amount: doses[0].amount, notes: String(f.get('notes')), end, weekdays, doses: doses.sort((x, y) => x.time.localeCompare(y.time)), times: doses.map(d => d.time).sort(), timeZone: state.profile.timeZone };
            if (!patch.name) throw Error('Нужно название');
            if (existing) { if (date <= today()) throw Error('Изменение уже действующего плана — не раньше завтра. Прошлое не переписываем.'); N.reviseTracker(state, existing.id, patch, date); } else state.trackers.push({ id: uid(), ...patch, start: date });
            changed(); close(); render(); toast('План записан. Приложение не назначало количества и дозировки.');
          });
    }

    function intakeEditor(slot, status) { const o = N.occurrences(state, ui.date).find(x => x.slot === slot); if (!o)
        return; if (ui.date > today())
        throw Error('Нельзя отмечать будущий день как выполненный'); if (status === 'unknown') {
        confirm('Снять отметку?', 'Отметка станет «Нет отметки». Предыдущая запись останется в журнале исправлений.', () => { N.recordIntake(state, o, 'unknown', 'Отметка снята пользователем'); changed(); render(); }, 'Снять отметку');
        return;
    } formModal(status === 'taken' ? 'Фактический приём' : 'Отметить пропуск', `<p class="help" style="margin-bottom:17px">${h(o.tracker.name)} · ${h(o.day)} · план ${h(o.time)}</p><div class="form-grid">${status === 'taken' ? `<div class="form-full"><label>Фактическое количество и единицы<span class="amount-stepper"><button type="button" class="btn icon-only outline" data-action="amount-step" data-step="-1" aria-label="Уменьшить количество">−</button><input name="actualAmount" value="${h(o.event?.actualAmount || o.plannedAmount || o.tracker.amount || '')}" maxlength="240" placeholder="Как было фактически"><button type="button" class="btn icon-only outline" data-action="amount-step" data-step="1" aria-label="Увеличить количество">+</button></span></label></div>${field('Фактическое время (необязательно)', 'actualTime', o.event?.actualTime || '', 'time', '')}<div><p class="help" style="margin-top:24px">Не помнишь точное время — оставь пустым. Плановое время не будет выдано за фактическое.</p></div>` : ''}<label class="form-full">Комментарий<textarea name="note" maxlength="1000">${h(o.event?.note || '')}</textarea></label></div>`, form => { const f = new FormData(form), actualAmount = String(f.get('actualAmount') || ''); const ev = N.recordIntake(state, o, status, String(f.get('note')), String(f.get('actualTime') || ''), actualAmount); changed(); close(); render(); }); }
    function nutritionLog() { formModal('Питание за день', `<div class="form-grid">${field('Дата', 'date', today(), 'date', 'required')}${field('Калории, ккал', 'calories', '', 'number', 'required min="0" max="15000" step="1"')}${field('Белки, г', 'protein', '', 'number', 'required min="0" max="800" step="0.1"')}${field('Жиры, г', 'fat', '', 'number', 'required min="0" max="800" step="0.1"')}${field('Углеводы, г', 'carbs', '', 'number', 'required min="0" max="2500" step="0.1"')}<label class="form-full">Заметка<textarea name="notes" maxlength="1500"></textarea></label></div>`, form => { const f = new FormData(form), d = String(f.get('date')); if (!N.validDay(d) || d > today())
        throw Error('Проверь дату'); const x = { id: uid(), date: d, calories: Number(f.get('calories')), protein: Number(f.get('protein')), fat: Number(f.get('fat')), carbs: Number(f.get('carbs')), notes: String(f.get('notes')) }; const i = state.nutritionLog.findIndex(x => x.date === d); if (i >= 0) {
        x.previous = clone(state.nutritionLog[i]);
        delete x.previous.previous;
        state.nutritionLog[i] = x;
    }
    else
        state.nutritionLog.push(x); changed(); close(); render(); }); }
    function weightEditor() { formModal('Записать вес', `<div class="form-grid">${field('Дата замера', 'date', today(), 'date', 'required')}${field('Вес, кг', 'weight', '', 'number', 'required min="30" max="300" step="0.1"')}</div><div style="margin-top:17px">${check('current', 'Использовать этот вес как актуальный в анкете', true)}</div>`, form => { const f = new FormData(form), date = String(f.get('date')), value = Number(f.get('weight')); if (!N.validDay(date) || date > today())
        throw Error('Проверь дату'); const i = state.weights.findIndex(x => x.date === date), entry = { id: i >= 0 ? state.weights[i].id : uid(), date, value }; if (i >= 0)
        state.weights[i] = entry;
    else
        state.weights.push(entry); if (f.has('current'))
        state.profile.weight = value; changed(); close(); render(); }); }
    function passwordEditor() { formModal('Изменить пароль', `<div class="stack">${passwordField('Текущий пароль', 'current', 'required autocomplete="current-password" maxlength="128"')}${passwordField('Новый пароль · Минимум 8 символов', 'next', 'required autocomplete="new-password" minlength="8" data-password-min maxlength="128"')}${passwordField('Повтори новый пароль', 'again', 'required autocomplete="new-password" minlength="8" data-password-min maxlength="128"')}</div><p class="help" style="margin-top:17px">Новый пароль сохраняется автоматически. Он не меняет пароль у старых резервных JSON-копий; при необходимости создай новую резервную копию в профиле.</p>`, async (form) => { const f = new FormData(form); if (String(f.get('next')).length < 8)
        throw Error('Минимум 8 символов'); if (f.get('next') !== f.get('again'))
        throw Error('Новые пароли не совпадают'); await persistNow(); if (saveError)
        throw Error('Сначала разреши ошибку сохранения'); await store.changePassword(String(f.get('current')), String(f.get('next'))); close(); toast('Пароль изменён и сохранён.'); }); }
    function download(text, type, name) { const u = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    function stamp() { return N.dateKey() + '_' + new Date().toTimeString().slice(0, 8).replaceAll(':', '-'); }
    async function exportEncryptedJSON(){
 await persistNow();if(!store.key||!state)throw Error('Сначала войди в профиль');
 const packed=await S.seal(state,store.key);
 const account={username:state.profile.username.toLowerCase(),salt:store.mode==='local'?store.account.salt:store.salt,iterations:600000,version:state.revision,...packed};
 download(JSON.stringify({app:'neo-fit-vault',version:1,accounts:[account]},null,2),'application/json;charset=utf-8',`NEO-FIT_PRIVATE_${state.profile.username}_${stamp()}.encrypted.json`);
 lastExportRevision=state.revision;toast('Необязательная резервная JSON-копия зашифрована паролем текущего профиля.');
}
    function exportJSON() { N.validate(state); download(JSON.stringify(state, null, 2), 'application/json;charset=utf-8', `NEO-FIT_PRIVATE_${state.profile.username}_${stamp()}.json`); lastExportRevision = state.revision; toast('Личный JSON подготовлен. Он не зашифрован — не публикуй его в GitHub.'); }
    async function copyReport(id) { const s = state.history.find(s => s.id === id) || state.draft; if (!s)
        return; const text = N.report(s); try {
        await navigator.clipboard.writeText(text);
        toast('Отчёт скопирован.');
    }
    catch {
        showModal('Отчёт для тренера', `<div class="modal-body"><p class="help">Выдели и скопируй текст.</p><textarea id="copy-report" readonly style="height:50vh;margin-top:15px">${h(text)}</textarea></div>`);
        $('#copy-report').select();
    } }
    let importMode = 'merge';
    async function importFile(file) { if (!file)
        return; if (file.size > 12000000)
        throw Error('Размер файла больше 12 МБ'); let text = (await file.text()).replace(/^\uFEFF/, '').trim(); if (text.startsWith('{')) {
        const data = N.parseJSON(text); if(data.app==='neo-fit-vault') {openEncryptedImport(data);return;} receiveImport(data);
        return;
    } const dom = new DOMParser().parseFromString(text, 'text/html'), old = dom.querySelector('script#embedded-data[type="application/json"]'), vaultEl = dom.querySelector('script#embedded-vault[type="application/json"]'); if (old) {
        receiveImport(N.parseJSON(old.textContent));
        return;
    } if (vaultEl) {
        const vault = S.validateVault(N.parseJSON(vaultEl.textContent));
        if (!vault.accounts.length)
            throw Error('В файле нет сохранённых профилей');
        formModal('Открыть зашифрованную копию', `<p class="help" style="margin-bottom:17px">Пароль нужен только для расшифровки файла в этом браузере; на сервер он не отправляется.</p><div class="stack">${select('Профиль в копии', 'username', vault.accounts[0].username, Object.fromEntries(vault.accounts.map(x => [x.username, x.username])))}${field('Пароль этой копии', 'password', '', 'password', 'required autocomplete="off" maxlength="128"')}</div>`, async (form) => { const f = new FormData(form), a = vault.accounts.find(x => x.username === f.get('username')); let d; try {
            d = await S.unseal(a, await S.derive(String(f.get('password')), a.salt));
        }
        catch {
            throw Error('Пароль неверен либо файл повреждён');
        } close(); receiveImport(d); }, 'Открыть и проверить');
        return;
    } throw Error('В HTML не найден поддерживаемый блок данных'); }
    function receiveImport(data) {
        const incoming = data.app === 'moi-trenirovki' ? N.migrateV1(data, state.profile) : N.validate(data);
        if (importMode === 'full') {
            formModal('Восстановить дневник целиком', `<div class="notice warn">Будут заменены программа, история, календарь, питание и анкета текущего профиля. Сначала скачается JSON текущего состояния. Логин и пароль не изменятся.</div><p class="help" style="margin-bottom:15px">В копии ${incoming.history.length} занятий и ${incoming.trackers.length} планов приёма. Убедись, что это твоя копия.</p>${field('Для подтверждения напиши ВОССТАНОВИТЬ', 'confirm', '', 'text', 'required')}`, form => { if (new FormData(form).get('confirm') !== 'ВОССТАНОВИТЬ')
                throw Error('Введи слово целиком'); exportJSON(); const next = clone(incoming); next.profile.username = state.profile.username; next.id = state.id; next.revision = state.revision; state = next; changed(); close(); ui.program = 0; ui.historyEdit = null; goto('today'); });
            return;
        }
        formModal('Импорт без потери истории', `<p style="margin-bottom:15px">В копии: ${incoming.history.length} завершённых занятий, ${incoming.programs.length} шаблонов${incoming.draft ? ', есть черновик' : ''}.</p><div class="notice">История объединится по ID: повторный импорт не дублирует занятие. Добавки, пептиды и питание в этом режиме не меняются; для них есть отдельное полное восстановление.</div>${check('programs', 'Также заменить текущие шаблоны и расписание из копии', state.programs.length === 0)}<p class="help" style="margin-top:13px">Сначала скачается резервный JSON. Исходный текст заметок не удаляется.</p>`, form => { const candidate = clone(state), count = N.mergeImported(candidate, incoming, { programs: new FormData(form).has('programs') }); N.validate(candidate); exportJSON(); state = candidate; changed(); close(); ui.program = nextProgramIndex(); goto('history'); toast(`Импортировано новых занятий: ${count}. Повторные записи не добавлены.`); }, 'Создать резерв и импортировать');
    }
    function begin(id) { if (state.draft) {
        goto('workout');
        return;
    } const index = state.programs.findIndex(p => p.id === id); if (index < 0)
        return; const go = () => { ui.historyEdit = null; N.startWorkout(state, id, today()); changed(); goto('workout'); }; if (state.schedule.queue[state.schedule.nextIndex] !== id)
        confirm('Начать вне очереди?', 'После завершения очередь продолжится с шаблона после выбранного. История и другие занятия не изменятся.', go, 'Начать');
    else
        go(); }
    async function notifyTimer(name) { if (!state?.settings?.notifications || !('Notification' in window) || Notification.permission !== 'granted') return; try { const reg = await navigator.serviceWorker?.ready; await reg?.showNotification('Отдых закончен', { body: name || 'Можно продолжать подходы', tag: 'neo-fit-rest', renotify: true, icon: './icon.svg' }); } catch {} }
    function renderTimer() { const t = state?.draft?.timer, el = $('#timer'); if (!state || !t || ui.historyEdit) {
        el.hidden = true;
        return;
    } el.hidden = false; let ms = t.paused ? t.remaining : Math.max(0, t.endsAt - Date.now()); if (ms === 0 && !t.paused) {
        t.paused = true;
        t.remaining = 0;
        t.endsAt = null;
        t.notifiedAt = new Date().toISOString();
        changed();
        toast('Время отдыха закончилось.');
        notifyTimer(t.name);
    } const seconds = Math.ceil(ms / 1000); el.innerHTML = `<div class="row"><strong>${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}</strong><div class="grow"><small>${seconds === 0 ? 'Отдых завершён' : t.paused ? 'Пауза' : 'Отдых между подходами'}</small><small style="max-width:210px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(t.name)}</small></div></div><div class="row"><button class="btn" data-action="timer-add">+30 с</button><button class="btn" data-action="timer-pause">${t.paused ? 'Продолжить' : 'Пауза'}</button><button class="btn" data-action="timer-close">Закрыть</button></div>`; }
    function startTimer(e) { if (!state.draft || !e.restSeconds || ui.historyEdit)
        return; state.draft.timer = { name: e.name, endsAt: Date.now() + e.restSeconds * 1000, remaining: e.restSeconds * 1000, paused: false, notifiedAt: null }; changed(); renderTimer(); }
    function updateProgress() { const s = currentSession(); if (!s)
        return; const t = N.totals(s); if ($('#workout-count'))
        $('#workout-count').textContent = t.done + ' / ' + t.all; if ($('#workout-progress'))
        $('#workout-progress').style.width = (t.all ? t.done / t.all * 100 : 0) + '%'; }
    async function actions(b) {
        const a = b.dataset.action, id = b.dataset.id, kind = b.dataset.kind;
        if (b.dataset.nav) {
            ui.historyEdit = null;
            goto(b.dataset.nav);
            return;
        }
        switch (a) {
            case 'auth-login':
                ui.register = false;
                renderAuth();
                break;
            case 'auth-register':
                ui.register = true;
                renderAuth();
                break;
            case 'switch-mode':
                ui.mode = ui.mode === 'cloud' ? 'local' : 'cloud';
                renderAuth();
                break;
            case 'close':
                close();
                break;
            case 'confirm': {
                const f = confirmAction;
                close();
                await f?.();
                break;
            }
            case 'more':
                showModal('Разделы', `<div class="modal-body"><div class="stack" style="gap:8px">${navs.map(([t, title, icon]) => `<button class="btn outline full" data-action="mobile-nav" data-tab="${t}" style="justify-content:flex-start">${ic(icon)}${title}</button>`).join('')}</div></div>`);
                break;
            case 'mobile-nav':
                close();
                ui.historyEdit = null;
                goto(b.dataset.tab);
                break;
            case 'program-select':
                ui.program = Number(b.dataset.index);
                render();
                break;
            case 'new-template':
                formModal('Новый шаблон', field('Название', 'title', '', 'text', 'required maxlength="160"'), form => { const name = String(new FormData(form).get('title')).trim(); if (!name)
                    throw Error('Введи название'); if (state.programs.length >= 30)
                    throw Error('Достигнут предел шаблонов'); state.programs.push({ id: uid(), title: name, short: name, kind: 'full', source: 'Собственный шаблон', exercises: [] }); ui.program = state.programs.length - 1; changed(); close(); goto('program'); });
                break;
            case 'rename-template': {
                const p = state.programs[ui.program];
                formModal('Название шаблона', field('Название', 'title', p.title, 'text', 'required maxlength="160"'), form => { const v = String(new FormData(form).get('title')).trim(); if (!v)
                    throw Error('Нужно название'); p.title = p.short = v; changed(); close(); render(); });
                break;
            }
            case 'add-ex':
                openPicker(exContext(kind), false);
                break;
            case 'replace':
                openPicker(exContext(kind, id), true);
                break;
            case 'replace-mode':
                close(); openPicker(exContext(kind, id), true, b.dataset.mode);
                break;
            case 'edit-ex':
                editExercise(exContext(kind, id));
                break;
            case 'pick-ex': {
                const p = ui.picker;
                editExercise(p, N.fromLibrary(b.dataset.catalog));
                break;
            }
            case 'custom-ex':
                editExercise(ui.picker, { ...N.fromLibrary('crunch-machine'), id: uid(), name: '', originalName: '', group: 'Другое', pattern: 'custom', catalogId: '', technique: '', weightMode: 'unspecified' });
                break;
            case 'technique':
                showTechnique(kind, id);
                break;
            case 'move-ex':
                ui.editor.move = Number(b.dataset.direction);
                $('#modal-form').requestSubmit();
                break;
            case 'delete-ex': {
                const c = clone(ui.editor);
                confirm('Удалить упражнение из шаблона?', 'Выполненные занятия и текущая тренировка не изменятся.', () => { const list = listFor(c), i = list.findIndex(e => e.id === c.existingId); if (i >= 0)
                    list.splice(i, 1); changed(); render(); }, 'Удалить');
                break;
            }
            case 'schedule':
                editSchedule();
                break;
            case 'queue-skip':
                confirm('Пропустить следующий шаблон?', 'Очередь перейдёт к следующему шаблону. История и сами шаблоны не изменятся.', () => { N.skipQueue(state); ui.program = nextProgramIndex(); changed(); render(); }, 'Пропустить');
                break;
            case 'choose-preset':
                choosePreset();
                break;
            case 'apply-preset': {
                const preset = b.dataset.preset;
                confirm('Применить эту основу?', 'Текущие шаблоны будут архивированы. История и личные отметки сохранятся.', () => { const s = N.defaultState('', '', preset); applyPrograms(s.programs, s.schedule); }, 'Применить');
                break;
            }
            case 'generate':
                generator();
                break;
            case 'apply-generated': {
                const ds = Number(state.profile.days) === 2 ? [2, 5] : Number(state.profile.days) === 4 ? [1, 2, 4, 6] : [2, 4, 6];
                close();
                applyPrograms(generated, { mode: 'queue', weekdays: ds, startDate: today(), queue: generated.map(p => p.id), nextIndex: 0 });
                break;
            }
            case 'start':
                begin(id);
                break;
            case 'add-set': {
                const e = currentSession()?.exercises.find(x => x.id === id);
                if (!e)
                    return;
                if (e.logs.length >= 148)
                    throw Error('Слишком много подходов');
                const n = Math.max(0, ...e.logs.map(l => l.number)) + 1;
                for (const side of e.unilateral ? ['left', 'right'] : ['both'])
                    e.logs.push({ id: uid(), number: n, side, weight: '', reps: '', rir: '', done: false, measurement: e.measurement || 'reps', target: e.repsMin + '–' + e.repsMax });
                changed();
                render();
                break;
            }
            case 'skip': {
                const e = currentSession()?.exercises.find(x => x.id === id);
                if (e) {
                    e.skipped = !e.skipped;
                    changed();
                    render();
                }
                break;
            }
            case 'finish': {
                const t = N.totals(state.draft);
                confirm('Завершить тренировку?', `Отмечено ${t.done} из ${t.all} подходов. Неотмеченные значения сохранятся, но не будут считаться выполненными.`, () => { N.finishWorkout(state); changed(); ui.program = nextProgramIndex(); goto('history'); toast('Тренировка сохранена в истории.'); }, 'Завершить');
                break;
            }
            case 'discard':
                confirm('Удалить черновик?', 'Только незавершённая тренировка будет удалена. Отменить удаление без резервной копии нельзя.', () => { state.draft = null; changed(); render(); }, 'Удалить черновик');
                break;
            case 'edit-history': {
                const s = state.history.find(x => x.id === id);
                const snapshot = clone(s);
                delete snapshot.corrections;
                s.corrections = s.corrections || [];
                s.corrections.push({ at: new Date().toISOString(), snapshot });
                ui.historyEdit = id;
                changed();
                goto('workout');
                break;
            }
            case 'finish-history':
                ui.historyEdit = null;
                await persistNow();
                goto('history');
                break;
            case 'report':
                await copyReport(id);
                break;
            case 'rest': {
                const e = state.draft?.exercises.find(x => x.id === id);
                if (e)
                    startTimer(e);
                break;
            }
            case 'timer-close':
                state.draft.timer = null;
                changed();
                renderTimer();
                break;
            case 'timer-add': {
                const t = state.draft?.timer;
                if (!t)
                    return;
                if (t.paused)
                    t.remaining = Math.min(3600000, t.remaining + 30000);
                else
                    t.endsAt = Math.min(Date.now() + 3600000, t.endsAt + 30000);
                changed();
                renderTimer();
                break;
            }
            case 'timer-pause': {
                const t = state.draft?.timer;
                if (!t)
                    return;
                if (t.paused) {
                    if (!t.remaining)
                        t.remaining = 30000;
                    t.endsAt = Date.now() + t.remaining;
                    t.paused = false;
                }
                else {
                    t.remaining = Math.max(0, t.endsAt - Date.now());
                    t.endsAt = null;
                    t.paused = true;
                }
                changed();
                renderTimer();
                break;
            }
            case 'month-next':
            case 'month-prev': {
                const d = new Date(ui.month + '-15T12:00:00');
                d.setMonth(d.getMonth() + (a === 'month-next' ? 1 : -1));
                ui.month = N.dateKey(d).slice(0, 7);
                render();
                break;
            }
            case 'calendar-day':
                ui.date = b.dataset.day;
                render();
                break;
            case 'calendar-today':
                ui.date = today();
                ui.month = ui.date.slice(0, 7);
                render();
                break;
            case 'add-past-workout':
                pastWorkoutEditor();
                break;
            case 'toggle-past-queue': {
                const draft = state.draft;
                if (!draft?.addedManually || !draft.queueEligible) break;
                draft.queueIncluded = !draft.queueIncluded; changed(); render();
                break;
            }
            case 'every-day':
                $('#modal-form input[name="weekdays"]').forEach(input => { input.checked = true; });
                break;
            case 'delete-tracker':
                confirm('Удалить план?', 'Активный план и будущие запланированные приёмы исчезнут. Уже записанные фактические отметки останутся в журнале.', () => { N.deleteTracker(state, id); changed(); render(); toast('План удалён; история фактических отметок сохранена.'); }, 'Удалить план');
                break;
            case 'new-tracker':
                trackerEditor(b.dataset.category);
                break;
            case 'edit-tracker': {
                const t = state.trackers.find(x => x.id === id);
                trackerEditor(t.category, id);
                break;
            }
            case 'archive-tracker':
                confirm('Завершить план в календаре?', 'Начиная с завтра новых отметок по этой версии не будет. Факты приёма сохранятся. Это изменение журнала, не медицинская рекомендация отменить назначение.', () => { const t = state.trackers.find(x => x.id === id); if (t.start > today())
                    t.cancelled = true;
                else
                    t.end = today(); changed(); render(); }, 'Завершить план');
                break;
            case 'intake':
                intakeEditor(b.dataset.slot, b.dataset.status);
                break;
            case 'amount-step': {
                const input = b.closest('.amount-stepper')?.querySelector('input'); if (!input) break;
                const match = /^\s*([\d.,]+)(.*)$/.exec(input.value); if (!match) { toast('Введи число, затем используй шаг.', true); break; }
                const value = Math.max(0, Number(match[1].replace(',', '.')) + Number(b.dataset.step)); input.value = String(Math.round(value * 100) / 100).replace('.', ',') + match[2];
                break;
            }
            case 'export-ics': {
                const category = b.dataset.category;
                confirm('Подготовить календарь на 30 дней?', 'Скачается .ics с напоминаниями. Его нужно самому импортировать в календарь телефона. Названия и дозировки не попадут в уведомление. Время привязано к локальному времени календаря — при поездках проверь часовой пояс. Файл не создаёт гарантированные медицинские напоминания.', () => download(N.calendarICS(state, category, today()), 'text/calendar;charset=utf-8', 'NEO-FIT-reminders.ics'), 'Скачать .ics');
                break;
            }
            case 'nutrition-log':
                nutritionLog();
                break;
            case 'weight':
                weightEditor();
                break;
            case 'inbody-new':
                inBodyEditor();
                break;
            case 'inbody-edit':
                inBodyEditor(id);
                break;
            case 'inbody-pdf':
                $('#inbody-file').click();
                break;
            case 'inbody-metric':
                ui.inBodyMetric = b.dataset.metric; render();
                break;
            case 'inbody-range':
                ui.inBodyRange = b.dataset.range || 'all'; render();
                break;
            case 'inbody-save-import':
                if (!ui.inBodyImport) throw Error('Нет подготовленного импорта');
                N.addInBody(state, ui.inBodyImport); ui.inBodyImport = null; changed(); close(); render(); toast('Замер импортирован без изменения анкеты.');
                break;
            case 'password':
                passwordEditor();
                break;
            case 'request-notifications': {
                if (state.settings.notifications) { state.settings.notifications = false; changed(); render(); toast('Уведомления NEO FIT выключены. Разрешение браузера можно оставить.'); break; }
                if (!('Notification' in window)) throw Error('Этот браузер не поддерживает уведомления');
                const permission = await Notification.requestPermission();
                state.settings.notifications = permission === 'granted'; state.settings.notificationPermission = permission; changed(); render();
                toast(permission === 'granted' ? 'Уведомления таймера включены.' : 'Разрешение на уведомления не выдано.', permission !== 'granted');
                break;
            }
            case 'toggle-password': {
                const input = b.closest('.password-input')?.querySelector('input');
                if (!input) break;
                const visible = input.type === 'password';
                input.type = visible ? 'text' : 'password';
                b.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
                b.innerHTML = ic(visible ? 'eyeOff' : 'eye');
                break;
            }
            case 'sync':
                await persistNow(); if(!saveError) await refreshRemote(true);
                break;
            case 'export-encrypted':
                await exportEncryptedJSON();
                break;
            case 'export-json':
                confirm('Экспорт личного JSON', 'Файл содержит записи открытым текстом. Его можно прислать тренеру, но нельзя выкладывать в публичный GitHub.', exportJSON, 'Скачать JSON');
                break;
            case 'import':
                importMode = 'merge';
                $('#import-file').click();
                break;
            case 'restore-full':
                importMode = 'full';
                $('#import-file').click();
                break;
            case 'reload':
                confirm('Загрузить сохранённую версию?', 'Сначала скачается JSON текущей версии. Затем будут загружены данные из ' + (store.mode === 'cloud' ? 'облака' : 'браузерной копии') + '. Новые изменения этой вкладки не будут автоматически объединены.', async () => { clearTimeout(saveTimer); await saveQueue; exportJSON(); state = await store.reload(); lastSavedRevision=state.revision; saveError = false; setStatus('Сохранённая версия загружена'); ui.historyEdit = null; ui.program = 0; render(); }, 'Создать резерв и загрузить');
                break;
            case 'logout':
                confirm('Выйти из профиля?', 'Будет выполнена попытка сохранения. В облачном режиме данные останутся в аккаунте. Локальные данные остаются в этом браузере.', async () => { await persistNow(); if (saveError)
                    throw Error('Есть несохранённые изменения. Сначала скачай копию и разреши ошибку.'); await store.logout(); state = null; ui.historyEdit = null; ui.register = false; renderAuth(); }, 'Выйти');
                break;
        }
    }
    document.addEventListener('click', event => { const b = event.target.closest('button'); if (!b || b.disabled || (b.type === 'submit' && b.form))
        return; Promise.resolve(actions(b)).catch(e => toast(e.message, true)); });
    document.addEventListener('invalid', event => { if (event.target.matches('[data-password-min]') && event.target.validity.tooShort) event.target.setCustomValidity('Минимум 8 символов'); }, true);
    document.addEventListener('input', event => { if (event.target.matches('[data-password-min]')) event.target.setCustomValidity(''); });
    document.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target, button = form.querySelector('[type=submit]');
        if (button?.disabled)
            return;
        if (button)
            button.disabled = true;
        try {
            if (form.id === 'auth-form') {
                await authenticate(form);
            }
            else if (form.id === 'modal-form') {
                if (modalSubmit)
                    await modalSubmit(form);
            }
            else if (form.id === 'profile-form') {
                const f = new FormData(form), p = { ...clone(state.profile) };
                for (const k of ['displayName', 'sex', 'goal', 'experience', 'split', 'preferences', 'excluded', 'limitations', 'timeZone'])
                    p[k] = String(f.get(k) || '').trim();
                for (const k of ['age', 'height', 'weight', 'days', 'duration'])
                    p[k] = Number(f.get(k));
                p.equipment = f.getAll('equipment').map(String);
                p.needsProfessional = f.has('needsProfessional');
                p.specialNutrition = f.has('specialNutrition');
                p.completed = true;
                try {
                    new Intl.DateTimeFormat('ru', { timeZone: p.timeZone });
                }
                catch {
                    throw Error('Неизвестный часовой пояс. Например: Europe/Moscow или Europe/Tallinn.');
                }
                if (!p.equipment.length)
                    throw Error('Выбери хотя бы один вариант оборудования');
                if (!p.displayName)
                    throw Error('Введи имя');
                const changedWeight = String(p.weight) !== String(state.profile.weight);
                state.profile = p;
                if (changedWeight) {
                    const date = today(), i = state.weights.findIndex(w => w.date === date), entry = { id: i >= 0 ? state.weights[i].id : uid(), date, value: p.weight };
                    if (i >= 0)
                        state.weights[i] = entry;
                    else
                        state.weights.push(entry);
                }
                changed();
                render();
                toast('Анкета сохранена. Программа и калории сами не изменялись.');
            }
            else if (form.id === 'nutrition-form') {
                const f = new FormData(form), n = { ...state.nutrition };
                for (const k of ['activity', 'adjustment', 'proteinPerKg', 'fatPerKg'])
                    n[k] = Number(f.get(k));
                for (const k of ['adjustmentUnit', 'manualCalories', 'manualProtein', 'manualFat', 'manualCarbs'])
                    n[k] = String(f.get(k) || '');
                N.nutrition(state.profile, n);
                state.nutrition = n;
                changed();
                render();
                toast('Настройка питания сохранена.');
            }
        }
        catch (e) {
            const target = form.querySelector('.form-error');
            if (target)
                target.textContent = e.message;
            else
                toast(e.message, true);
        }
        finally {
            if (button?.isConnected)
                button.disabled = false;
        }
    });
    document.addEventListener('input', event => {
        const el = event.target;
        if (el.id === 'exercise-search') {
            const q = N.normal(el.value);
            $('#exercise-options').innerHTML = pickerOptions(ui.picker.options.filter(x => N.normal([x.name, x.group, ...(x.aliases || []), ...(x.primaryMuscles || [])].join(' ')).includes(q)));
            return;
        }
        if (!state)
            return;
        if (el.dataset.field && el.type !== 'checkbox') {
            const e = currentSession()?.exercises.find(x => x.id === el.dataset.ex), l = e?.logs.find(x => x.id === el.dataset.log);
            if (!l)
                return;
            l[el.dataset.field] = el.value;
            if (l.done && !N.validLog(l)) {
                l.done = false;
                el.closest('.set').classList.remove('done');
                el.closest('.set').querySelector('[type=checkbox]').checked = false;
            }
            changed();
            updateProgress();
        }
        else if (el.id === 'session-note') {
            currentSession().note = el.value;
            changed();
        }
        else if (el.id === 'session-date' && N.validDay(el.value) && el.value <= today()) {
            currentSession().date = el.value;
            changed();
        }
    });
    document.addEventListener('change', event => { const el = event.target; if (el.id === 'inbody-file') { const f = el.files[0]; el.value = ''; previewInBodyPdf(f).catch(e => toast(e.message, true)); return; } if (el.id === 'import-file') {
        const f = el.files[0];
        el.value = '';
        importFile(f).catch(e => toast(e.message, true));
        return;
    } if (!state)
        return; if (el.dataset.field === 'done') {
        const e = currentSession()?.exercises.find(x => x.id === el.dataset.ex), l = e?.logs.find(x => x.id === el.dataset.log);
        if (!l)
            return;
        if (el.checked && !N.validLog(l)) {
            el.checked = false;
            toast('Нужны вес от 0 до 3000 кг и целые повторы 1–500. RIR — пусто или 0–10.', true);
            return;
        }
        l.done = el.checked;
        el.closest('.set').classList.toggle('done', l.done);
        changed();
        updateProgress();
        if (l.done && !ui.historyEdit)
            startTimer(e);
    } });
    document.addEventListener('focusout', event => { const el = event.target; if (el.id === 'session-date' && currentSession() && (!N.validDay(el.value) || el.value > today())) {
        el.value = currentSession().date;
        toast('Дата должна быть существующей и не в будущем.', true);
    } });
    window.addEventListener('beforeunload', event => { if (state && (saveTimer || saveError || store.pending || (activeSaves > 0))) {
        event.preventDefault();
        event.returnValue = '';
    } });
    window.addEventListener('online', () => { if (state && store.mode === 'cloud' && store.pending && !store.conflict)
        persistNow(); });
    window.addEventListener('storage', event => { if (state && store.mode === 'local' && event.key === store.storageKey) {
        try {
            const v = S.validateVault(N.parseJSON(event.newValue)), a = v.accounts.find(x => x.username === state.profile.username);
            if (a && a.version > store.account.version) {
                saveError = true;
                setStatus('Другая вкладка обновила профиль', true);
                toast('Есть изменения в другой вкладке. Сохрани свой JSON перед загрузкой той версии.', true);
            }
        }
        catch { }
    } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) {
        renderTimer(); refreshRemote().catch(() => {});
    }
    else if (state)
        persistNow(); });

 async function refreshRemote(manual=false){
   if(!state||store.mode!=='cloud'){if(manual&&!saveError)toast('Изменения сохранены на этом устройстве. Облако пока не подключено.');return;}
   if(remoteCheck||activeSaves||saveTimer||store.pending||saveError||store.conflict)return;
   if(!manual&&(document.hidden||modal.open||['profile','nutrition'].includes(ui.tab)||document.activeElement?.matches('input,textarea,select')))return;
   const owner=store,revision=state.revision;remoteCheck=true;
   try{const rows=await owner.request('/rest/v1/diary_documents?select=document,version',undefined,'GET'),row=rows[0];
     if(owner!==store||!state||state.revision!==revision||saveTimer||activeSaves)return;
     if(row&&Number(row.version)>owner.version){const incoming=N.validate(row.document);owner.version=Number(row.version);owner.data=clone(incoming);await owner.saveCache(incoming,false);state=incoming;lastSavedRevision=state.revision;ui.program=Math.min(ui.program,Math.max(0,state.programs.length-1));setStatus('Обновлено из облака');render();if(manual)toast('Загружены новые записи с другого устройства.');}
     else if(manual){setStatus('Сохранено в облаке');toast('Все изменения синхронизированы.');}
   }catch(e){if(manual)toast('Не удалось проверить облако: '+e.message,true);}
   finally{remoteCheck=false;}
 }
 function openEncryptedImport(data){
   const vault=S.validateVault(data);if(!vault.accounts.length)throw Error('В копии нет профилей');
   formModal('Открыть защищённую JSON-копию',`<p class="help">Расшифровка выполняется только в браузере.</p><div class="stack">${select('Профиль','username',vault.accounts[0].username,Object.fromEntries(vault.accounts.map(a=>[a.username,a.username])))}${field('Пароль копии','password','','password','required maxlength="128" autocomplete="off"')}</div>`,async form=>{
     const f=new FormData(form),a=vault.accounts.find(a=>a.username===f.get('username'));let doc;
     try{doc=await S.unseal(a,await S.derive(String(f.get('password')),a.salt));}catch{throw Error('Пароль неверен или копия повреждена');}
     close();receiveImport(doc);
   },'Проверить и импортировать');
 }

    setInterval(renderTimer, 1000);
    setInterval(() => refreshRemote().catch(() => {}), 30000);
    window.neoFitPrepareUpdate = async () => { if (state) await persistNow(); if (saveError || store.pending) throw Error('Сначала дождись сохранения данных'); };
    async function initialize() {
        if (ui.mode === 'cloud') {
            store = new S.CloudStore(config);
            try {
                const restored = await store.restore();
                if (restored) {
                    state = restored;
                    lastSavedRevision = store.pending ? -1 : state.revision;
                    const view = store.restoreView();
                    ui.tab = state.draft ? 'workout' : (navs.some(n => n[0] === view?.tab) ? view.tab : 'today');
                    ui.program = Math.min(Number(view?.program ?? nextProgramIndex()), Math.max(0, state.programs.length - 1));
                    ui.date = today(); ui.month = ui.date.slice(0, 7);
                    setStatus(store.conflict ? 'Конфликт версий — открой профиль' : store.pending ? 'Нет сети — ждёт отправки' : store.offline ? 'Нет сети — открыта сохранённая копия' : 'Сохранено');
                    render();
                    if (store.pending && !store.conflict && navigator.onLine) persistNow();
                    return;
                }
            } catch (error) {
                ui.restoreMessage = String(error.message).replace(/^[A-Z_]+:s*/, '');
            }
        }
        if(ui.mode==='local'&&!local.vault.accounts.length)ui.register=true;
        renderAuth();
    }
    await initialize();
})();
