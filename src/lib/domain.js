/** Domain rules; pure functions, no network or DOM. Schema v3 retains migration support for v2 snapshots. */
let templates;
export function configureTemplates(value) { templates = value; }
/* NEO FIT v3 — pure domain logic. No network calls or UI side effects in this section. */

    'use strict';
    const clone = x => JSON.parse(JSON.stringify(x));
    const uid = () => crypto.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    const normal = x => String(x || '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ');
    const num = x => typeof x === 'number' ? x : String(x).trim() && /^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(String(x).trim()) ? Number(String(x).replace(',', '.')) : NaN;
    const h = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safeJSON = x => JSON.stringify(x).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    const dateKey = (date = new Date(), zone) => {
        if (zone) {
            const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
            const o = Object.fromEntries(p.map(x => [x.type, x.value]));
            return `${o.year}-${o.month}-${o.day}`;
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const validDay = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(new Date(x + 'T12:00:00Z')) && new Date(x + 'T12:00:00Z').toISOString().slice(0, 10) === x;
    const addDays = (day, n) => { if (!validDay(day))
        throw Error('Некорректная дата'); const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const dow = day => new Date(day + 'T12:00:00Z').getUTCDay();
    const labels = { stack: 'Вес на тренажёре', single: 'Одна гантель', total: 'Общий вес снаряда', extra: 'Дополнительный вес', assist: 'Вес помощи', unspecified: 'Тип веса не уточнён' };
    const equipment = { machine: 'Тренажёры', cable: 'Блоки', dumbbell: 'Гантели', barbell: 'Штанга', bodyweight: 'Без оборудования', band: 'Резинки', kettlebell: 'Гири' };
    const groups = ['Спина', 'Грудь', 'Ноги', 'Ягодицы', 'Икры', 'Плечи', 'Бицепс', 'Трицепс', 'Пресс', 'Другое'];
    const library = () => templates.library;
    const starterCatalog = () => clone(templates.starters || []);
    const lookup = e => library().find(x => normal(x.name) === normal(e.name) || x.aliases.some(a => normal(a) === normal(e.name))) || library().find(x => x.catalogId === e.catalogId);
    const exerciseKey = e => [normal(e.name), normal(e.machine), e.weightMode, e.unilateral ? 'side' : 'both'].join('|');
    function normalizeExercise(e) {
        const l = lookup(e);
        const n = { ...clone(e) };
        n.catalogId = e.catalogId || l?.catalogId || '';
        n.pattern = e.pattern || l?.pattern || 'custom';
        n.equipment = e.equipment || l?.equipment || 'machine';
        n.technique = e.technique || l?.technique || '';
        n.aliases = Array.isArray(e.aliases) ? clone(e.aliases) : clone(l?.aliases || []);
        n.primaryMuscles = Array.isArray(e.primaryMuscles) && e.primaryMuscles.length ? clone(e.primaryMuscles) : clone(l?.primaryMuscles || [e.group || l?.group || 'Другое']);
        n.secondaryMuscles = Array.isArray(e.secondaryMuscles) ? clone(e.secondaryMuscles) : clone(l?.secondaryMuscles || []);
        n.difficulty = e.difficulty || l?.difficulty || 'intermediate';
        n.measurement = e.measurement || l?.measurement || 'reps';
        n.source = e.source || l?.source || 'NEO FIT: собственная краткая памятка; проверено 17.09.2026';
        n.targets = e.targets?.length ? clone(e.targets) : Array.from({ length: e.sets }, () => ({ reps: e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}–${e.repsMax}`, sourceWeight: null }));
        n.originalName = e.originalName || e.name;
        n.machine = e.machine || '';
        n.notes = e.notes || '';
        if (n.logs)
            n.logs = n.logs.map(x => ({ ...x, weight: String(x.weight ?? ''), reps: String(x.reps ?? ''), rir: String(x.rir ?? ''), measurement: x.measurement || n.measurement || 'reps', done: !!x.done }));
        return n;
    }
    function fromLibrary(catalogId) { const l = library().find(x => x.catalogId === catalogId); if (!l)
        throw Error('Упражнение не найдено'); return normalizeExercise({ ...clone(l), id: uid(), originalName: l.name, sets: 3, repsMin: 10, repsMax: 12, restSeconds: 120, rirMin: 2, rirMax: 3, notes: '', machine: '' }); }
    function defaultState(username = '', displayName = '', preset = 'empty') {
        const starter = templates.starters?.find(x => x.id === preset);
        const programs = preset === 'empty' ? [] : clone(starter?.programs || templates[preset] || []);
        const queue = preset === 'vika' && programs.length > 1 ? [programs[0].id, programs[1].id, programs[1].id] : programs.map(p => p.id);
        return { app: 'neo-fit', schemaVersion: 3, id: uid(), revision: 0, updatedAt: new Date().toISOString(), profile: { username, displayName: displayName || username, age: '', height: '', weight: '', sex: '', goal: 'maintain', experience: 'beginner', days: 3, duration: 60, equipment: ['machine', 'cable', 'dumbbell', 'bodyweight'], preferences: '', excluded: '', limitations: '', needsProfessional: false, specialNutrition: false, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', completed: false }, schedule: { mode: 'queue', weekdays: starter?.weekdays || (preset === 'vika' ? [2, 4, 0] : [2, 4, 6]), startDate: dateKey(), queue, nextIndex: 0 }, programs, archivedPrograms: [], history: [], draft: null, trackers: [], intakes: [], weights: [], inBody: [], nutrition: { activity: 1.4, adjustment: 0, adjustmentUnit: 'percent', proteinPerKg: 1.6, fatPerKg: 0.8, manualCalories: '', manualProtein: '', manualFat: '', manualCarbs: '' }, nutritionLog: [], importIds: [], migrationNotes: [], settings: { notifications: false, sound: false } };
    }
    function upgrade(input) {
        if (!input || input.app !== 'neo-fit' || ![2, 3].includes(input.schemaVersion)) return input;
        const s = clone(input);
        s.schemaVersion = 3;
        s.inBody = Array.isArray(s.inBody) ? s.inBody : [];
        s.settings = { notifications: false, sound: false, notificationPermission: 'default', ...(s.settings || {}) };
        s.importIds = Array.isArray(s.importIds) ? s.importIds : [];
        const old = s.schedule || {};
        if (old.mode !== 'queue' || !Array.isArray(old.queue)) {
            const ids = (s.programs || []).map(p => p.id);
            let queue = ids;
            if (old.mode === 'weekly' && ids.length) queue = (old.weekdays || []).map(day => ids[old.map?.[day] ?? 0]).filter(Boolean);
            s.schedule = { mode: 'queue', weekdays: old.weekdays?.length ? old.weekdays : [2, 4, 6], startDate: validDay(old.startDate) ? old.startDate : dateKey(), queue, nextIndex: Math.min(Math.max(0, Number(old.nextIndex) || 0), Math.max(0, queue.length - 1)) };
        }
        for (const t of s.trackers || []) {
            t.form ||= 'other'; t.unit ||= ''; t.perDose ||= t.amount || ''; t.substancePerUnit ||= ''; t.foodRelation ||= 'any'; t.doses ||= (t.times || []).map(time => ({ time, amount: t.perDose })); t.times = t.doses.map(d => d.time);
        }
        const allExercises = [...(s.programs || []).flatMap(p => p.exercises || []), ...(s.history || []).flatMap(x => x.exercises || []), ...(s.draft?.exercises || [])];
        for (const e of allExercises) Object.assign(e, normalizeExercise(e));
        return s;
    }
    function makeLogs(e) { const out = []; for (let n = 0; n < e.sets; n++)
        for (const side of (e.unilateral ? ['left', 'right'] : ['both']))
            out.push({ id: uid(), number: n + 1, side, weight: '', reps: '', rir: '', done: false, measurement: e.measurement || 'reps', target: e.targets?.[n]?.reps || `${e.repsMin}–${e.repsMax}` }); return out; }
    function validLog(l) { const seconds = l.measurement === 'seconds'; return (seconds ? String(l.weight).trim() === '' : Number.isFinite(num(l.weight)) && num(l.weight) >= 0 && num(l.weight) <= 3000) && Number.isInteger(num(l.reps)) && num(l.reps) >= 1 && num(l.reps) <= (seconds ? 3600 : 500) && (String(l.rir) === '' || (Number.isFinite(num(l.rir)) && num(l.rir) >= 0 && num(l.rir) <= 10)); }
    const entered = l => l.done || String(l.weight).trim() || String(l.reps).trim() || String(l.rir).trim();
    function totals(s) { return { done: s.exercises.reduce((n, e) => n + e.logs.filter(x => x.done).length, 0), all: s.exercises.reduce((n, e) => n + (e.skipped ? e.logs.filter(x => x.done).length : e.logs.length), 0) }; }
    function startWorkout(state, templateId, date) {
        if (state.draft)
            throw Error('Сначала заверши или отмени текущую тренировку.');
        if (!validDay(date))
            throw Error('Нужна дата занятия');
        const p = state.programs.find(x => x.id === templateId);
        if (!p)
            throw Error('Шаблон не найден');
        state.draft = { id: uid(), templateId: p.id, title: p.title, date, startedAt: new Date().toISOString(), finishedAt: null, note: '', timer: null, source: p.source || '', exercises: p.exercises.map(e => ({ ...clone(e), logs: makeLogs(e), skipped: false })) };
        return state.draft;
    }
    function finishWorkout(state) { if (!state.draft)
        throw Error('Нет начатой тренировки'); const s = state.draft; if (totals(s).done === 0)
        throw Error('Отметь хотя бы один выполненный подход.'); if (state.history.some(x => x.id === s.id))
        throw Error('Эта тренировка уже сохранена'); s.finishedAt = new Date().toISOString(); s.timer = null; state.history.unshift(clone(s)); const queue = state.schedule.queue || []; if (queue[state.schedule.nextIndex] === s.templateId) state.schedule.nextIndex = (state.schedule.nextIndex + 1) % Math.max(1, queue.length); state.draft = null; return s; }
    function replaceExercise(list, id, newExercise) { const i = list.findIndex(e => e.id === id); if (i < 0)
        throw Error('Упражнение не найдено'); const old = list[i]; if (old.logs?.some(entered))
        throw Error('Есть введённые результаты. Сохрани это упражнение и добавь новое рядом.'); list[i] = { ...clone(newExercise), id: old.id, originalName: old.originalName || old.name }; if (old.logs) {
        list[i].logs = makeLogs(list[i]);
        list[i].skipped = false;
    } return list[i]; }
    function alternatives(e, profile, mode = 'movement') { const allowed = profile.equipment || Object.keys(equipment), excluded = String(profile.excluded || '').split(/[\n;,]/).map(normal).filter(Boolean), muscles = e.primaryMuscles?.length ? e.primaryMuscles : [e.group]; return library().filter(x => (mode === 'muscle' ? (x.primaryMuscles || [x.group]).some(m => muscles.includes(m)) : x.pattern === e.pattern) && x.catalogId !== e.catalogId && normal(x.name) !== normal(e.name) && allowed.includes(x.equipment) && !excluded.some(word => normal(x.name).includes(word))).map(x => ({ ...x, matchReason: mode === 'muscle' ? 'Та же основная группа; движение и нагрузка могут отличаться' : 'Похожий тип движения', loadChange: x.equipment === e.equipment && x.weightMode === e.weightMode ? 'Учёт нагрузки похож' : 'Рабочий вес перенеси заново' })); }
    function nextWorkout(state, today) { if (!state.programs.length)
        return null; if (state.draft)
        return { date: state.draft.date, program: state.programs.find(x => x.id === state.draft.templateId), draft: true }; for (let i = 0; i < 28; i++) {
        const day = addDays(today, i);
        if (state.schedule.weekdays.includes(dow(day)) && !state.history.some(x => x.date === day)) {
            const templateId = state.schedule.queue?.[state.schedule.nextIndex];
            return { date: day, program: state.programs.find(p => p.id === templateId) || state.programs[0] };
        }
    } return null; }
    function schedulePreview(state, from = dateKey(), weeks = 4) { const out = []; const queue = state.schedule.queue || []; let cursor = state.schedule.nextIndex || 0; for (let i = 0; i < weeks * 7; i++) { const day = addDays(from, i); if (day >= state.schedule.startDate && state.schedule.weekdays.includes(dow(day)) && queue.length) { const id = queue[cursor % queue.length], program = state.programs.find(p => p.id === id); if (program) out.push({ date: day, templateId: id, title: program.title }); cursor = (cursor + 1) % queue.length; } } return out; }
    function skipQueue(state) { const queue = state.schedule.queue || []; if (!queue.length) throw Error('Очередь пуста'); state.schedule.nextIndex = (state.schedule.nextIndex + 1) % queue.length; }
    function generatePlan(profile) {
        if (!profile.completed || num(profile.age) < 18 || profile.needsProfessional || profile.limitations.trim())
            throw Error('Для автоматического черновика нужна заполненная анкета совершеннолетнего без указанных ограничений. При ограничениях настрой программу вручную с тренером.');
        const ex = String(profile.excluded || '').split(/[\n;,]/).map(normal).filter(Boolean);
        const pick = (patterns) => patterns.map(pattern => { const c = library().find(e => e.pattern === pattern && profile.equipment.includes(e.equipment) && !ex.some(x => normal(e.name).includes(x))); if (!c)
            throw Error('Нет подходящего упражнения для «' + pattern + '» с выбранным оборудованием. Добавь своё вручную.'); const e = fromLibrary(c.catalogId); e.sets = profile.experience === 'beginner' ? 2 : 3; e.targets = e.targets.slice(0, e.sets); return e; });
        const defs = (profile.split === 'upperlower' || (profile.split !== 'full' && Number(profile.days) === 4)) ? [
            ['Верх А', ['vertical-pull', 'horizontal-press', 'horizontal-pull', 'elbow-flexion', 'elbow-extension']], ['Низ А', ['knee-dominant', 'hip-extension', 'lateral-raise', 'trunk-flexion']], ['Верх Б', ['horizontal-pull', 'horizontal-press', 'vertical-pull', 'elbow-flexion', 'elbow-extension']], ['Низ Б', ['hip-extension', 'knee-dominant', 'lateral-raise', 'trunk-flexion']]
        ] : [
            ['Всё тело А', ['knee-dominant', 'horizontal-press', 'vertical-pull', 'hip-extension', 'trunk-flexion']], ['Всё тело Б', ['hip-extension', 'horizontal-pull', 'horizontal-press', 'knee-dominant', 'lateral-raise']]
        ];
        return defs.map(([title, patterns]) => ({ id: uid(), title, short: title, kind: 'full', source: 'Редактируемый черновик по фиксированным правилам. Не ИИ-диагностика и не индивидуальное назначение тренера. Цель и длительность учитываются при ручной доработке.', exercises: pick(Number(profile.duration) <= 45 ? patterns.slice(0, 4) : patterns).map(e => { if (profile.goal === 'strength') {
                e.repsMin = 6;
                e.repsMax = 10;
                e.restSeconds = 150;
                e.targets = Array.from({ length: e.sets }, () => ({ reps: '6–10', sourceWeight: null }));
            } return e; }) }));
    }
    function migrateV1(old, profile) {
        if (old?.app !== 'moi-trenirovki' || old.schemaVersion !== 1 || !Array.isArray(old.program) || !Array.isArray(old.history))
            throw Error('Неизвестный формат старого дневника');
        const s = defaultState(profile?.username || 'neo', profile?.displayName || 'Neo');
        if (profile)
            s.profile = clone(profile);
        s.programs = old.program.map(p => ({ ...clone(p), source: old.sourceContext || 'Импорт из HTML v1', exercises: p.exercises.map(normalizeExercise) }));
        s.schedule.weekdays = old.settings?.weekdays || [2, 4, 6];
        s.schedule.queue = s.programs.map(p => p.id);
        s.schedule.nextIndex = Math.min(old.nextIndex || 0, Math.max(0, s.schedule.queue.length - 1));
        const convert = (session) => ({ ...clone(session), timer: session.timer ? { ...clone(session.timer), name: session.timer.name || session.timer.exerciseName || '' } : null, exercises: session.exercises.map(normalizeExercise) });
        s.history = old.history.map(convert);
        s.draft = old.draft ? convert(old.draft) : null;
        s.importIds = [old.notebookId];
        for (const session of s.history) {
            const extra = /Panatta\s+для\s+пресса\s+(\d+)\s+подход[^\s]*\s+с\s+([\d.,]+)\s*кг\s+по\s+(\d+)\s*повт/i.exec(session.note || '');
            if (extra && Number(extra[1]) >= 1 && Number(extra[1]) <= 30 && num(extra[2]) >= 0 && num(extra[2]) <= 3000 && Number(extra[3]) >= 1 && Number(extra[3]) <= 500 && !session.exercises.some(e => e.importedFromNote)) {
                const e = fromLibrary('crunch-machine');
                e.name = 'Скручивание в тренажёре Panatta';
                e.originalName = e.name;
                e.machine = 'Panatta';
                e.sets = Number(extra[1]);
                e.repsMin = e.repsMax = Number(extra[3]);
                e.targets = Array.from({ length: e.sets }, () => ({ reps: String(e.repsMin), sourceWeight: null }));
                e.rirMin = e.rirMax = null;
                e.importedFromNote = true;
                e.notes = 'Перенесено из исходной заметки пользователя; заметка сохранена. Время отдельных подходов неизвестно.';
                e.logs = makeLogs(e).map(l => ({ ...l, weight: String(num(extra[2])), reps: String(e.repsMin), done: true }));
                e.skipped = false;
                session.exercises.push(e);
                s.migrationNotes.push('Пресс Panatta за ' + session.date + ' перенесён из заметки: ' + e.sets + ' × ' + e.repsMin + ' с ' + num(extra[2]) + ' кг.');
            }
            for (const e of session.exercises) {
                if (normal(e.name) === 'z гриф на бицепс' && e.weightMode === 'stack') {
                    e.reviewNote = 'В исходном HTML тип веса остался «тренажёр», хотя упражнение заменено на Z-гриф. Значения сохранены без исправления. Уточни: общий вес с грифом или только блины?';
                    s.migrationNotes.push('У Z-грифа сохранён исходный тип веса; требуется уточнение.');
                }
            }
        }
        return validate(s);
    }
    function parseJSON(text) { return JSON.parse(text, (key, value) => { if (['__proto__', 'prototype', 'constructor'].includes(key))
        throw Error('Недопустимый ключ в файле'); return value; }); }
    function validate(s) {
        s = upgrade(s);
        const fail = x => { throw Error('Файл не принят: ' + x); };
        const str = (x, max = 6000) => typeof x === 'string' && x.length <= max;
        const arr = (x, max) => Array.isArray(x) && x.length <= max;
        const id = x => str(x, 160) && /^[a-zA-Z0-9_-]+$/.test(x);
        const unique = a => new Set(a.map(x => x.id)).size === a.length;
        const integer = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
        if (new TextEncoder().encode(JSON.stringify(s)).length > 5000000)
            fail('больше 5 МБ');
        if (!s || s.app !== 'neo-fit' || s.schemaVersion !== 3 || !id(s.id) || !integer(s.revision, 0, Number.MAX_SAFE_INTEGER))
            fail('служебные данные');
        if (!s.profile || !str(s.profile.username, 40) || !str(s.profile.displayName, 100) || !arr(s.profile.equipment, 8) || !s.profile.equipment.every(x => Object.hasOwn(equipment, x)) || !str(s.profile.limitations) || !str(s.profile.excluded) || !str(s.profile.preferences) || !str(s.profile.timeZone, 100))
            fail('анкета');
        try {
            new Intl.DateTimeFormat('en', { timeZone: s.profile.timeZone });
        }
        catch {
            fail('часовой пояс');
        }
        if (!arr(s.programs, 30) || !unique(s.programs) || !arr(s.history, 3000) || !unique(s.history) || !arr(s.trackers, 500) || !unique(s.trackers) || !arr(s.intakes, 25000) || !arr(s.weights, 5000) || !arr(s.inBody, 500) || !arr(s.nutritionLog, 5000) || !arr(s.importIds, 100) || !arr(s.migrationNotes, 200) || !arr(s.archivedPrograms, 100))
            fail('списки');
        if (!s.schedule || s.schedule.mode !== 'queue' || !arr(s.schedule.weekdays, 7) || !s.schedule.weekdays.length || !s.schedule.weekdays.every(x => integer(x, 0, 6)) || new Set(s.schedule.weekdays).size !== s.schedule.weekdays.length || !validDay(s.schedule.startDate) || !arr(s.schedule.queue, 60) || !s.schedule.queue.every(id => s.programs.some(p => p.id === id)) || !integer(s.schedule.nextIndex, 0, Math.max(0, s.schedule.queue.length - 1)))
            fail('расписание');
        function exercise(e, session) {
            if (!e || !id(e.id) || !str(e.name, 240) || !e.name.trim() || !str(e.originalName, 240) || !groups.includes(e.group) || !Object.hasOwn(labels, e.weightMode) || !integer(e.sets, 1, 30) || !integer(e.repsMin, 1, 500) || !integer(e.repsMax, e.repsMin, 500) || !integer(e.restSeconds, 0, 1800) || !str(e.machine, 240) || !str(e.notes) || !str(e.technique) || !arr(e.targets, 30) || typeof e.unilateral !== 'boolean' || !['reps','seconds'].includes(e.measurement || 'reps') || !arr(e.primaryMuscles || [], 12) || !arr(e.secondaryMuscles || [], 12))
                fail('упражнение');
            if (![e.rirMin, e.rirMax].every(x => x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 10)) || (e.rirMin === null) !== (e.rirMax === null) || (e.rirMin !== null && e.rirMax < e.rirMin))
                fail('RIR');
            for (const target of e.targets)
                if (!target || !str(target.reps, 80) || (target.sourceWeight !== null && (!Number.isFinite(target.sourceWeight) || target.sourceWeight < 0 || target.sourceWeight > 3000)))
                    fail('план подхода');
            if (session) {
                if (!arr(e.logs, 150) || !unique(e.logs))
                    fail('подходы');
                for (const l of e.logs)
                    if (!id(l.id) || !integer(l.number, 1, 150) || !['both', 'left', 'right'].includes(l.side) || !str(l.weight, 24) || !str(l.reps, 24) || !str(l.rir, 24) || typeof l.done !== 'boolean' || (l.done && !validLog(l)))
                        fail('результаты');
            }
        }
        for (const p of s.programs) {
            if (!id(p.id) || !str(p.title, 160) || !arr(p.exercises, 60) || !unique(p.exercises))
                fail('шаблон');
            p.exercises.forEach(e => exercise(e, false));
        }
        for (const x of [...s.history, ...(s.draft ? [s.draft] : [])]) {
            if (!id(x.id) || !str(x.title, 160) || !validDay(x.date) || !str(x.note) || !arr(x.exercises, 60) || !unique(x.exercises))
                fail('занятие');
            x.exercises.forEach(e => exercise(e, true));
        }
        if (s.draft && s.history.some(x => x.id === s.draft.id))
            fail('дублированная тренировка');
        for (const t of s.trackers) {
            if (!id(t.id) || !['supplement', 'peptide'].includes(t.category) || !str(t.name, 140) || !t.name.trim() || !str(t.amount, 240) || !str(t.notes) || !validDay(t.start) || (t.end && !validDay(t.end)) || !arr(t.weekdays, 7) || !t.weekdays.every(x => integer(x, 0, 6)) || !t.weekdays.length || !arr(t.times, 6) || !t.times.length || !t.times.every(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)) || new Set(t.times).size !== t.times.length || !arr(t.doses || [], 6) || (t.doses || []).some(d => !d || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time) || !str(String(d.amount ?? ''), 80)) || !str(t.form || 'other', 40) || !str(t.unit || '', 40) || !str(t.substancePerUnit || '', 80) || !['any','with-food','after-food','before-food','empty'].includes(t.foodRelation || 'any'))
                fail('календарь приёма');
        }
        for (const ev of s.intakes) {
            if (!id(ev.id) || !str(ev.slot, 260) || !validDay(ev.date) || !['taken', 'skipped', 'unknown'].includes(ev.status) || !str(ev.note, 1000) || !str(ev.actualTime, 20) || !str(ev.recordedAt, 40) || !ev.snapshot || !str(ev.snapshot.name, 140) || !str(ev.snapshot.amount, 240))
                fail('отметка приёма');
        }
        if (!s.nutrition || !Number.isFinite(Number(s.nutrition.activity)))
            fail('питание');
        for (const w of s.weights)
            if (!id(w.id) || !validDay(w.date) || typeof w.value !== 'number' || !Number.isFinite(w.value) || w.value < 0 || w.value > 1000)
                fail('замер веса');
        for (const ev of s.intakes)
            if (!id(ev.trackerId) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(ev.scheduledTime) || !['supplement', 'peptide'].includes(ev.snapshot.category) || (ev.actualAmount !== undefined && !str(ev.actualAmount, 240)))
                fail('данные отметки');
        const bodyMetricKeys = new Set(['weight','skeletalMuscleMass','bodyFatMass','bodyFatPercent','bmi','visceralFatLevel','totalBodyWater','protein','minerals','waistHipRatio','basalMetabolicRate','inBodyScore','segmentalLean']);
        for (const body of s.inBody) {
            if (!id(body.id) || !validDay(body.measuredAt) || !str(body.source, 240) || !str(body.sourceHash, 128) || !str(body.importedAt, 40) || !body.metrics || typeof body.metrics !== 'object' || Array.isArray(body.metrics) || Object.keys(body.metrics).some(k => !bodyMetricKeys.has(k))) fail('InBody');
            for (const [key, value] of Object.entries(body.metrics)) {
                if (key === 'segmentalLean') { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(v => typeof v !== 'number' || !Number.isFinite(v))) fail('InBody'); }
                else if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000)) fail('InBody');
            }
        }
        return s;
    }
    function addInBody(state, record) {
        if (!record || !record.sourceHash) throw Error('Не удалось определить источник InBody');
        const existing = state.inBody.find(x => x.sourceHash === record.sourceHash);
        if (existing) return existing;
        const next = { id: record.id || uid(), measuredAt: record.measuredAt, importedAt: record.importedAt || new Date().toISOString(), source: record.source || 'Ручной ввод', sourceHash: record.sourceHash, metrics: clone(record.metrics || {}) };
        state.inBody.push(next); state.inBody.sort((a,b)=>b.measuredAt.localeCompare(a.measuredAt));
        const weight = next.metrics.weight;
        if (Number.isFinite(weight) && !state.weights.some(w => w.date === next.measuredAt && Math.abs(w.value - weight) < .001)) state.weights.push({ id: uid(), date: next.measuredAt, value: weight, source: 'InBody' });
        return next;
    }
    function mergeImported(target, incoming, { programs = false } = {}) { validate(incoming); if (programs && target.draft)
        throw Error('Сначала заверши черновик перед заменой программы'); let added = 0; for (const s of incoming.history)
        if (!target.history.some(x => x.id === s.id)) {
            target.history.push(clone(s));
            added++;
        } target.history.sort((a, b) => b.date.localeCompare(a.date)); if (programs) {
        if (target.draft)
            throw Error('Сначала заверши черновик перед заменой программы');
        target.archivedPrograms.push({ date: new Date().toISOString(), programs: clone(target.programs) });
        target.programs = clone(incoming.programs);
        target.schedule = clone(incoming.schedule);
    } if (incoming.draft && !target.draft && !target.history.some(x => x.id === incoming.draft.id))
        target.draft = clone(incoming.draft); target.migrationNotes = [...new Set([...target.migrationNotes, ...incoming.migrationNotes])]; return added; }
    function occurrences(s, day, category) {
        const out = [];
        for (const t of s.trackers) {
            if (t.cancelled || (category && t.category !== category))
                continue;
            if (day < t.start || (t.end && day > t.end) || !t.weekdays.includes(dow(day)))
                continue;
            for (const dose of (t.doses?.length ? t.doses : t.times.map(time => ({ time, amount: t.perDose || t.amount })))) {
                const time = dose.time, slot = `${t.id}|${day}|${time}`;
                const event = s.intakes.findLast(x => x.slot === slot);
                out.push({ slot, day, time, plannedAmount: String(dose.amount ?? t.perDose ?? t.amount ?? ''), tracker: t, event, status: event?.status || 'unknown' });
            }
        }
        // Keep recorded, versioned occurrences visible even if a schedule was retired or shortened.
        for (const ev of s.intakes) {
            if (ev.date !== day || (category && ev.snapshot.category !== category) || out.some(x => x.slot === ev.slot) || s.intakes.findLast(x => x.slot === ev.slot) !== ev)
                continue;
            out.push({ slot: ev.slot, day, time: ev.scheduledTime, tracker: { id: ev.trackerId, ...ev.snapshot }, event: ev, status: ev.status, legacy: true });
        }
        return out.sort((a, b) => a.time.localeCompare(b.time));
    }
    function recordIntake(s, o, status, note = '', actualTime = '', actualAmount = '') { if (!['taken', 'skipped', 'unknown'].includes(status))
        throw Error('Неизвестная отметка'); const prev = s.intakes.findLast(x => x.slot === o.slot); if (prev?.status === status && prev.note === note && prev.actualTime === actualTime && (prev.actualAmount || '') === actualAmount)
        return prev; const ev = { id: uid(), slot: o.slot, trackerId: o.tracker.id, date: o.day, scheduledTime: o.time, status, actualTime: status === 'taken' ? actualTime : '', actualAmount: status === 'taken' ? actualAmount : '', note, recordedAt: new Date().toISOString(), snapshot: { name: o.tracker.name, amount: o.plannedAmount || o.tracker.amount, category: o.tracker.category, form: o.tracker.form || 'other', unit: o.tracker.unit || '' }, supersedes: prev?.id || null }; s.intakes.push(ev); return ev; }
    function reviseTracker(s, id, patch, effective) { const old = s.trackers.find(x => x.id === id); if (!old)
        throw Error('План не найден'); if (!validDay(effective) || effective <= old.start)
        throw Error('Изменение должно начинаться после даты начала предыдущей версии'); const inheritedEnd = old.end; old.end = addDays(effective, -1); const next = { ...clone(old), ...patch, id: uid(), start: effective, end: patch.end ?? inheritedEnd, previousId: old.id }; s.trackers.push(next); return next; }
    function nutrition(p, n) {
        if (num(p.age) < 18 || p.specialNutrition)
            throw Error('Автоматический расчёт не предназначен для несовершеннолетних, беременности, лактации и состояний, требующих лечебного питания.');
        const w = num(p.weight), height = num(p.height), age = num(p.age);
        if (!(w >= 30 && w <= 300 && height >= 120 && height <= 230 && age >= 18 && age <= 100))
            throw Error('Заполни в анкете актуальные возраст, рост и вес.');
        if (!['m', 'f'].includes(p.sex))
            throw Error('Для формулы выбери коэффициент пола в анкете.');
        const act = num(n.activity);
        if (!(act >= 1.1 && act <= 2.5))
            throw Error('Проверь коэффициент активности (1,1–2,5).');
        const bmr = 10 * w + 6.25 * height - 5 * age + (p.sex === 'm' ? 5 : -161), maintenance = bmr * act;
        const adjustment = num(n.adjustment);
        if (!Number.isFinite(adjustment))
            throw Error('Укажи коррекцию калорий');
        const calculated = maintenance + (n.adjustmentUnit === 'percent' ? maintenance * adjustment / 100 : adjustment);
        const calories = n.manualCalories !== '' ? num(n.manualCalories) : calculated;
        if (!Number.isFinite(calories) || calories < 1000 || calories > 7000 || calories < maintenance * .8 || calories > maintenance * 1.4)
            throw Error('Проверь калории. Этот калькулятор не назначает большие дефициты или профициты; обсуди такие значения со специалистом.');
        if (calories < maintenance && w / ((height / 100) ** 2) < 18.5)
            throw Error('При низкой массе тела автоматический дефицит не рассчитывается.');
        const protein = n.manualProtein !== '' ? num(n.manualProtein) : w * num(n.proteinPerKg), fat = n.manualFat !== '' ? num(n.manualFat) : w * num(n.fatPerKg);
        const carbs = n.manualCarbs !== '' ? num(n.manualCarbs) : (calories - 4 * protein - 9 * fat) / 4;
        if (![protein, fat, carbs].every(x => Number.isFinite(x) && x >= 0) || protein > 500 || fat > 350 || carbs > 1200)
            throw Error('Проверь БЖУ: значения должны быть неотрицательными и согласованными с калориями.');
        const macroCalories = 4 * protein + 9 * fat + 4 * carbs;
        return { bmr: Math.round(bmr), maintenance: Math.round(maintenance), calories: Math.round(calories), protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs), macroCalories: Math.round(macroCalories), difference: Math.round(macroCalories - calories) };
    }
    function report(s) { return [`${s.title} · ${s.date}`, `Выполнено подходов: ${totals(s).done}/${totals(s).all}`, ...s.exercises.flatMap((e, i) => ['', `${i + 1}. ${e.name}${e.skipped ? ' [пропущено]' : ''}`, `Вес: ${labels[e.weightMode]}${e.machine ? ' / ' + e.machine : ''}`, e.logs.filter(entered).map(l => `${l.done ? '✓' : '○'} ${l.number}${l.side === 'left' ? 'Л' : l.side === 'right' ? 'П' : ''}: ${l.weight || '—'} кг × ${l.reps || '—'}${l.rir ? ' · RIR ' + l.rir : ''}`).join('\n'), e.notes || '', e.reviewNote || '']), s.note ? '\nЗаметка: ' + s.note : ''].filter(x => x !== undefined).join('\n'); }
    // ICS uses floating local time deliberately: most mobile calendars interpret it in their current zone.
    // The export UI explicitly warns that event times follow the calendar's zone when travelling.
    function calendarICS(state, category, start, days = 30) { const escape = x => String(x).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEO FIT//Diary//RU', 'CALSCALE:GREGORIAN']; for (let i = 0; i < days; i++) {
        for (const o of occurrences(state, addDays(start, i), category).filter(x => !x.legacy)) {
            const stamp = o.day.replaceAll('-', '') + 'T' + o.time.replace(':', '') + '00';
            lines.push('BEGIN:VEVENT', `UID:${o.tracker.id}-${o.day}-${o.time.replace(':', '')}@neo-fit.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART:${stamp}`, 'DURATION:PT5M', 'SUMMARY:Проверить личный календарь приёма', 'DESCRIPTION:' + escape('Открой NEO FIT и проверь свою запись. Названия и количества не вынесены в уведомление.'), 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Проверить личный календарь', 'END:VALARM', 'END:VEVENT');
        }
    } lines.push('END:VCALENDAR'); return lines.join('\r\n') + '\r\n'; }
    export const N = { clone, uid, normal, num, h, safeJSON, dateKey, validDay, addDays, dow, labels, equipment, groups, library, starterCatalog, lookup, exerciseKey, normalizeExercise, fromLibrary, defaultState, upgrade, makeLogs, validLog, entered, totals, startWorkout, finishWorkout, replaceExercise, alternatives, nextWorkout, schedulePreview, skipQueue, generatePlan, migrateV1, parseJSON, validate, mergeImported, occurrences, recordIntake, reviseTracker, addInBody, nutrition, report, calendarICS };
