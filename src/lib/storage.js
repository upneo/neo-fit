import { N } from "./domain.js";
/* Passwords remain in memory only. Cloud Auth/REST is called with the user's JWT. */

    'use strict';
    const ITERATIONS = 600000, enc = new TextEncoder(), dec = new TextDecoder();
    const b64 = bytes => { let text = ''; for (let i = 0; i < bytes.length; i += 0x8000)
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(text); };
    const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const random = n => crypto.getRandomValues(new Uint8Array(n));
    async function derive(password, salt) { if (!crypto?.subtle)
        throw Error('Браузер не поддерживает защищённое хранилище. Используй Chrome/Edge через HTTPS или localhost.'); const p = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: unb64(salt) }, p, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
    async function seal(doc, key) { const iv = random(12), ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(doc))); return { iv: b64(iv), ciphertext: b64(new Uint8Array(ciphertext)) }; }
    async function unseal(record, key) { return N.parseJSON(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(record.iv) }, key, unb64(record.ciphertext)))); }
    function credentials(username, password) { if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username))
        throw Error('Логин: 3–24 английские буквы, цифры, точка, дефис или подчёркивание.'); if (password.length < 12 || password.length > 128)
        throw Error('Пароль: от 12 до 128 символов. Подойдёт простая фраза из нескольких слов.'); return username.toLowerCase(); }
    function validateVault(v) { if (!v || v.app !== 'neo-fit-vault' || v.version !== 1 || !Array.isArray(v.accounts) || v.accounts.length > 50)
        throw Error('Некорректный файл профилей'); const seen = new Set(); for (const a of v.accounts) {
        if (!/^[a-z0-9_.-]{3,24}$/.test(a.username) || seen.has(a.username) || typeof a.salt !== 'string' || typeof a.iv !== 'string' || typeof a.ciphertext !== 'string' || a.ciphertext.length > 8000000 || a.iterations !== ITERATIONS || !Number.isInteger(a.version) || a.version < 0)
            throw Error('Повреждён зашифрованный профиль');
        seen.add(a.username);
    } return v; }
    class LocalStore {
        constructor(initial, storage = globalThis.localStorage, key = 'nf:vault:v3:' + globalThis.location?.pathname) { this.storage = storage; this.storageKey = key; this.vault = validateVault(initial || { app: 'neo-fit-vault', version: 1, accounts: [] }); this.account = null; this.key = null; this.data = null; this.mode = 'local'; this.persistence = !storage.ephemeral; try {
            const raw = storage.getItem(key);
            if (raw) {
                const v = validateVault(N.parseJSON(raw));
                for (const a of v.accounts) {
                    const i = this.vault.accounts.findIndex(x => x.username === a.username);
                    if (i < 0)
                        this.vault.accounts.push(a);
                    else if (a.version > this.vault.accounts[i].version)
                        this.vault.accounts[i] = a;
                }
            }
        }
        catch {
            this.persistence = false;
        } }
        latest() { try {
            return validateVault(N.parseJSON(this.storage.getItem(this.storageKey) || JSON.stringify(this.vault)));
        }
        catch {
            return N.clone(this.vault);
        } }
        async login(username, password) { this.vault = this.latest(); const name = username.toLowerCase().trim(); const a = this.vault.accounts.find(x => x.username === name); if (!a)
            throw Error('Неверный логин или пароль'); try {
            this.key = await derive(password, a.salt);
            this.data = N.validate(await unseal(a, this.key));
            this.account = N.clone(a);
            return this.data;
        }
        catch {
            this.key = null;
            this.account = null; this.data = null;
            throw Error('Неверный логин или пароль либо повреждена копия.');
        } }
        async register(username, password, displayName, preset = 'empty') { this.vault = this.latest(); username = credentials(username, password); if (this.vault.accounts.some(x => x.username === username))
            throw Error('Такой локальный логин уже существует'); const salt = b64(random(16)); this.key = await derive(password, salt); this.account = { username, salt, iterations: ITERATIONS, version: 0 }; this.data = N.defaultState(username, displayName, preset); await this.save(this.data, true); return this.data; }
        async save(doc, newAccount = false) { N.validate(doc); const a = this.account; if (!a || !this.key)
            throw Error('Сначала войди в профиль'); const packed = await seal(doc, this.key); const latest = this.latest(); const previous = latest.accounts.find(x => x.username === a.username); if (previous && previous.version > a.version)
            throw Error('CONFLICT: профиль изменён в другой вкладке. Сохрани JSON-копию перед загрузкой другой версии.'); if (newAccount && previous)
            throw Error('Такой профиль уже создан в другой вкладке'); const next = { ...a, ...packed, version: a.version + 1, updatedAt: new Date().toISOString() }; const ix = latest.accounts.findIndex(x => x.username === a.username); if (ix < 0)
            latest.accounts.push(next);
        else
            latest.accounts[ix] = next; this.data = N.clone(doc); try {
            this.storage.setItem(this.storageKey, JSON.stringify(latest));
            this.vault = latest; this.account = next;
            this.persistence = !this.storage.ephemeral;
        }
        catch {
            this.persistence = false;
            throw Error('Копия остаётся в памяти: браузер не разрешил сохранение. Не закрывай вкладку. Скачай резервную JSON-копию из профиля.');
        } return next.version; }
        async changePassword(current, next) { credentials(this.account.username, next); const oldKey = await derive(current, this.account.salt); try {
            await unseal(this.account, oldKey);
        }
        catch {
            throw Error('Текущий пароль неверен');
        } const latest = this.latest().accounts.find(a => a.username === this.account.username); if (latest && latest.version > this.account.version)
            throw Error('Сначала разреши конфликт другой вкладки'); const oldAccount = N.clone(this.account), previousKey = this.key; const salt = b64(random(16)); this.key = await derive(next, salt); this.account = { ...this.account, salt }; try { await this.save(this.data); } catch (error) { this.key = previousKey; this.account = oldAccount; throw error; } }
        async reload() { const a = this.latest().accounts.find(x => x.username === this.account.username); if (!a)
            throw Error('Профиль не найден'); let d; try {
            d = N.validate(await unseal(a, this.key));
        }
        catch {
            throw Error('Пароль изменён в другой вкладке. Выйди и войди снова.');
        } this.account = a; this.data = d; this.vault = this.latest(); return d; }
        logout() { this.key = null; this.data = null; this.account = null; }
        exportVault() { return N.clone(this.vault); }
    }
    class CloudStore {
        constructor(config) { this.config = config; this.mode = 'cloud'; this.session = null; this.version = 0; this.pending = false; this.conflict = false; this.data = null; this.key = null; this.cache = null; this.persistence = true; if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl) || !config.publishableKey)
            throw Error('Облачная база ещё не настроена'); }
        async request(path, body, method = 'POST', authorized = true) { if (authorized)
            await this.refresh(); const headers = { 'apikey': this.config.publishableKey, 'Content-Type': 'application/json' }; if (authorized)
            headers.Authorization = 'Bearer ' + this.session.access_token; const res = await fetch(this.config.supabaseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000) }); const data = await res.json().catch(() => ({})); if (!res.ok) {
            if (data.code === '40001')
                throw Error('CONFLICT: более новая версия есть на сервере');
            if (res.status === 401 || res.status === 403)
                throw Error('Нет доступа. Проверь вход и настройку базы.');
            if (res.status === 429)
                throw Error('Слишком много попыток. Подожди и попробуй позднее.');
            throw Error(data.error_description || data.msg || data.message || data.error || 'Ошибка сервера ' + res.status);
        } return data; }
        async refresh() { if (!this.session)
            throw Error('Сначала войди в аккаунт'); if (Date.now() < this.session.expires_at * 1000 - 60000)
            return; if (!this.refreshTask)
            this.refreshTask = this.request('/auth/v1/token?grant_type=refresh_token', { refresh_token: this.session.refresh_token }, 'POST', false).then(s => { this.session = s; }).finally(() => { this.refreshTask = null; }); await this.refreshTask; }
        async login(username, password) {
            const email = username.trim().toLowerCase() + '@' + this.config.authDomain;
            this.session = await this.request('/auth/v1/token?grant_type=password', { email, password }, 'POST', false);
            this.username = username.toLowerCase();
            this.cacheKey = 'nf:cloud:v3:' + this.config.supabaseUrl + ':' + this.session.user.id;
            let cache;
            try {
                cache = N.parseJSON(localStorage.getItem(this.cacheKey) || 'null');
            }
            catch { }
            const salt = cache?.salt || b64(random(16));
            this.key = await derive(password, salt);
            this.salt = salt;
            let saved;
            try {
                if (cache)
                    saved = await unseal(cache, this.key);
            }
            catch {
                throw Error('Локальная облачная копия не расшифровалась. Возможно, пароль был изменён на другом устройстве. Не очищай данные браузера: сначала сохрани проблемную копию или открой дневник в другом браузере.');
            }
            this.pending = false;
            const rows = await this.request('/rest/v1/diary_documents?select=document,version', undefined, 'GET');
            const row = rows[0];
            this.version = row?.version || 0;
            this.data = row ? N.validate(row.document) : N.defaultState(this.username, this.session.user.user_metadata?.displayName || username);
            this.conflict = false;
            if (saved?.pending) {
                this.data = N.validate(saved.document);
                this.pending = true;
                if (saved.baseVersion !== this.version)
                    this.conflict = true;
            }
            return this.data;
        }
        async register(username, password, displayName, invite) { username = credentials(username, password); if (!invite || invite.length > 200)
            throw Error('Введи код приглашения владельца'); await this.request('/functions/v1/' + this.config.registrationFunction, { username, password, displayName, invite }, 'POST', false); return this.login(username, password); }
        async saveCache(document, pending) { try {
            const packed = await seal({ document, baseVersion: this.version, pending }, this.key);
            this.cache = { ...packed, salt: this.salt, iterations: ITERATIONS };
            localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
            this.persistence = true;
        }
        catch {
            this.persistence = false;
        } }
        async save(document) { N.validate(document); this.data = N.clone(document); this.pending = true; await this.saveCache(document, true); if (this.conflict)
            throw Error('CONFLICT: сначала сохрани свою копию и разреши конфликт'); try {
            const result = await this.request('/rest/v1/rpc/save_diary', { p_expected: this.version, p_document: document });
            this.version = Number(result);
            this.pending = false;
            await this.saveCache(document, false);
            return this.version;
        }
        catch (e) {
            if (e.message.startsWith('CONFLICT'))
                this.conflict = true;
            throw e;
        } }
        async reload() { const rows = await this.request('/rest/v1/diary_documents?select=document,version', undefined, 'GET'); this.version = rows[0]?.version || 0; this.data = rows[0] ? N.validate(rows[0].document) : N.defaultState(this.username, this.username); this.pending = false; this.conflict = false; await this.saveCache(this.data, false); return this.data; }
        async changePassword(current, next) { credentials(this.username, next); await this.request('/auth/v1/token?grant_type=password', { email: this.username + '@' + this.config.authDomain, password: current }, 'POST', false); await this.request('/auth/v1/user', { password: next }, 'PUT'); this.salt = b64(random(16)); this.key = await derive(next, this.salt); await this.saveCache(this.data, this.pending); }
        async logout() { if (this.session)
            await this.request('/auth/v1/logout', {}, 'POST').catch(() => { }); this.session = null; this.key = null; this.data = null; }
    }
    export const S = { derive, seal, unseal, credentials, validateVault, LocalStore, CloudStore };
