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
        throw Error('Логин: 3–24 английские буквы, цифры, точка, дефис или подчёркивание.'); if (password.length < 8 || password.length > 128)
        throw Error(password.length < 8 ? 'Минимум 8 символов' : 'Максимум 128 символов'); return username.toLowerCase(); }
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
    async function importDeviceKey(value) {
        if (!value || !crypto?.subtle) throw Error('Не найден ключ этого устройства');
        return crypto.subtle.importKey('raw', unb64(value), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }
    class CloudStore {
        constructor(config) {
            this.config = config;
            this.mode = 'cloud';
            this.session = null;
            this.version = 0;
            this.pending = false;
            this.conflict = false;
            this.data = null;
            this.key = null;
            this.cache = null;
            this.persistence = true;
            this.refreshTask = null;
            this.remember = true;
            if (!config.publishableKey || !/^([a-z0-9-]+\.)?supabase\.co$/.test(new URL(config.supabaseUrl).hostname) || new URL(config.supabaseUrl).protocol !== 'https:')
                throw Error('Облачная база ещё не настроена');
            const project = new URL(config.supabaseUrl).hostname.split('.')[0];
            const appPath = globalThis.location?.pathname || '/';
            this.namespace = 'neo-fit:v4:' + project + ':' + appPath;
            this.authKey = this.namespace + ':auth';
            this.viewKey = this.namespace + ':view';
        }
        storage(kind) {
            try { return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage; }
            catch { return null; }
        }
        readAuth() {
            for (const kind of ['session', 'local']) {
                try {
                    const value = N.parseJSON(this.storage(kind)?.getItem(this.authKey) || 'null');
                    if (value?.session?.access_token && value?.session?.refresh_token && value?.session?.user?.id && value?.deviceKey)
                        return { ...value, kind };
                } catch { }
            }
            return null;
        }
        persistAuth() {
            if (!this.session || !this.deviceKey) return;
            const record = JSON.stringify({ version: 1, remember: this.remember, session: this.session, deviceKey: this.deviceKey, updatedAt: new Date().toISOString() });
            const target = this.storage(this.remember ? 'local' : 'session');
            const other = this.storage(this.remember ? 'session' : 'local');
            target?.setItem(this.authKey, record);
            other?.removeItem(this.authKey);
        }
        clearAuth() {
            this.storage('local')?.removeItem(this.authKey);
            this.storage('session')?.removeItem(this.authKey);
        }
        saveView(view) {
            try { this.storage(this.remember ? 'local' : 'session')?.setItem(this.viewKey, JSON.stringify(view)); } catch { }
        }
        restoreView() {
            try { return N.parseJSON((this.storage('session')?.getItem(this.viewKey) || this.storage('local')?.getItem(this.viewKey)) ?? 'null'); }
            catch { return null; }
        }
        async raw(path, body, method = 'POST', token = '') {
            const headers = { apikey: this.config.publishableKey, 'Content-Type': 'application/json' };
            if (token) headers.Authorization = 'Bearer ' + token;
            let res;
            try {
                res = await fetch(this.config.supabaseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000) });
            } catch (error) {
                const offline = !globalThis.navigator?.onLine || error?.name === 'TimeoutError' || error?.name === 'AbortError' || error instanceof TypeError;
                throw Error((offline ? 'OFFLINE: ' : '') + 'Не удалось связаться с облаком');
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message = data.error_description || data.msg || data.message || data.error || 'Ошибка сервера ' + res.status;
                const error = Error(message);
                error.status = res.status;
                error.code = data.code || '';
                throw error;
            }
            return data;
        }
        async request(path, body, method = 'POST', authorized = true) {
            if (authorized) await this.refresh();
            try {
                return await this.raw(path, body, method, authorized ? this.session.access_token : '');
            } catch (error) {
                if (error.code === 'PT409' || error.status === 409)
                    throw Error('CONFLICT: Конфликт версий — есть более новая версия в облаке');
                if (error.status === 401) {
                    this.clearAuth();
                    this.session = null;
                    throw Error('SESSION_EXPIRED: Сессия завершена. Войди снова.');
                }
                if (error.status === 403) throw Error('Нет доступа к этой записи.');
                if (error.status === 429) throw Error('Слишком много попыток. Подожди и попробуй позднее.');
                throw error;
            }
        }
        async refresh(force = false) {
            if (!this.session) throw Error('SESSION_EXPIRED: Сначала войди в аккаунт');
            if (!force && Date.now() < Number(this.session.expires_at) * 1000 - 60000) return;
            if (!this.refreshTask) {
                this.refreshTask = this.raw('/auth/v1/token?grant_type=refresh_token', { refresh_token: this.session.refresh_token })
                    .then(session => { this.session = session; this.persistAuth(); return session; })
                    .catch(error => {
                        if (!String(error.message).startsWith('OFFLINE:')) {
                            this.clearAuth();
                            this.session = null;
                            throw Error('SESSION_EXPIRED: Сессия завершена. Войди снова.');
                        }
                        throw error;
                    })
                    .finally(() => { this.refreshTask = null; });
            }
            await this.refreshTask;
        }
        async prepareIdentity(username, session, remember) {
            const prior = this.readAuth();
            this.session = session;
            this.username = username.toLowerCase();
            this.remember = !!remember;
            // A normal sign-in on the same browser retains the device key, so its encrypted offline copy remains readable.
            this.deviceKey = prior?.session?.user?.id === session.user.id && prior.deviceKey
                ? prior.deviceKey : b64(random(32));
            this.key = await importDeviceKey(this.deviceKey);
            this.cacheKey = this.namespace + ':cache:' + session.user.id;
            this.legacyCacheKey = 'nf:cloud:v3:' + this.config.supabaseUrl + ':' + session.user.id;
            this.persistAuth();
        }
        async readCache(password = '') {
            let saved = null;
            this.cacheProblem = '';
            try {
                const cache = N.parseJSON(this.storage('local')?.getItem(this.cacheKey) || 'null');
                if (cache) {
                    this.cache = cache;
                    saved = await unseal(cache, this.key);
                }
            } catch {
                // A damaged browser-only copy must never block a valid cloud login.
                this.cacheProblem = 'Локальная копия этого устройства не открылась; загружена версия из облака.';
            }
            if (!saved && password) {
                try {
                    const legacy = N.parseJSON(localStorage.getItem(this.legacyCacheKey) || 'null');
                    if (legacy) {
                        saved = await unseal(legacy, await derive(password, legacy.salt));
                        await this.saveCache(saved.document, !!saved.pending, saved.baseVersion);
                        localStorage.removeItem(this.legacyCacheKey);
                    }
                } catch {
                    this.cacheProblem = 'Старая локальная копия не открылась; она не удалена, облачные данные доступны.';
                }
            }
            return saved;
        }
        async loadDocument(password = '') {
            const saved = await this.readCache(password);
            let row = null, remoteError = null;
            try {
                const rows = await this.request('/rest/v1/diary_documents?select=document,version', undefined, 'GET');
                row = rows[0] || null;
            } catch (error) {
                remoteError = error;
                if (!saved) throw error;
            }
            this.version = row?.version || saved?.baseVersion || 0;
            this.data = row ? N.validate(row.document) : saved?.document ? N.validate(saved.document) : N.defaultState(this.username, this.session.user.user_metadata?.displayName || this.username);
            this.pending = !!saved?.pending;
            this.conflict = !!(saved?.pending && row && Number(saved.baseVersion) !== Number(row.version));
            if (saved?.pending) this.data = N.validate(saved.document);
            if (remoteError) this.offline = true;
            else this.offline = false;
            await this.saveCache(this.data, this.pending);
            return this.data;
        }
        async restore() {
            const record = this.readAuth();
            if (!record) return null;
            this.session = record.session;
            this.remember = record.kind === 'local' && record.remember !== false;
            this.deviceKey = record.deviceKey;
            this.key = await importDeviceKey(this.deviceKey);
            this.username = String(record.session.user.email || '').split('@')[0].toLowerCase();
            this.cacheKey = this.namespace + ':cache:' + record.session.user.id;
            this.legacyCacheKey = 'nf:cloud:v3:' + this.config.supabaseUrl + ':' + record.session.user.id;
            try { await this.refresh(); }
            catch (error) {
                if (!String(error.message).startsWith('OFFLINE:')) throw error;
            }
            return this.loadDocument();
        }
        async login(username, password, remember = true) {
            username = username.trim().toLowerCase();
            const email = username + '@' + this.config.authDomain;
            const session = await this.raw('/auth/v1/token?grant_type=password', { email, password });
            await this.prepareIdentity(username, session, remember);
            return this.loadDocument(password);
        }
        async register(username, password, displayName, invite, remember = true) {
            username = credentials(username, password);
            if (!invite || invite.length > 200) throw Error('Введи код приглашения владельца');
            await this.request('/functions/v1/' + this.config.registrationFunction, { username, password, displayName, invite }, 'POST', false);
            return this.login(username, password, remember);
        }
        async saveCache(document, pending, baseVersion = this.version) {
            try {
                if (!this.key) return;
                const packed = await seal({ document, baseVersion, pending }, this.key);
                this.cache = { ...packed, keyVersion: 2, updatedAt: new Date().toISOString() };
                localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
                this.persistence = true;
            } catch {
                this.persistence = false;
            }
        }
        async save(document) {
            document = N.validate(document);
            this.data = N.clone(document);
            this.pending = true;
            await this.saveCache(document, true);
            if (this.conflict) throw Error('CONFLICT: сначала сохрани свою копию и разреши конфликт');
            try {
                const result = await this.request('/rest/v1/rpc/save_diary', { p_expected: this.version, p_document: document });
                this.version = Number(result);
                this.pending = false;
                this.offline = false;
                await this.saveCache(document, false);
                return this.version;
            } catch (error) {
                if (String(error.message).startsWith('CONFLICT')) this.conflict = true;
                throw error;
            }
        }
        async reload() {
            const rows = await this.request('/rest/v1/diary_documents?select=document,version', undefined, 'GET');
            this.version = rows[0]?.version || 0;
            this.data = rows[0] ? N.validate(rows[0].document) : N.defaultState(this.username, this.username);
            this.pending = false;
            this.conflict = false;
            await this.saveCache(this.data, false);
            return this.data;
        }
        async changePassword(current, next) {
            credentials(this.username, next);
            await this.raw('/auth/v1/token?grant_type=password', { email: this.username + '@' + this.config.authDomain, password: current });
            await this.request('/auth/v1/user', { password: next }, 'PUT');
            await this.saveCache(this.data, this.pending);
        }
        async logout() {
            const cacheKey = this.cacheKey;
            if (this.session) await this.request('/auth/v1/logout', {}, 'POST').catch(() => {});
            this.clearAuth();
            this.storage('local')?.removeItem(this.viewKey);
            this.storage('session')?.removeItem(this.viewKey);
            if (cacheKey) localStorage.removeItem(cacheKey);
            this.session = null;
            this.key = null;
            this.data = null;
        }
    }
    export const S = { derive, seal, unseal, importDeviceKey, credentials, validateVault, LocalStore, CloudStore };
