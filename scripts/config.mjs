import fs from 'node:fs';
import path from 'node:path';
export function configuration(root, required = false) {
  const base = JSON.parse(fs.readFileSync(path.join(root, 'src/config.json'), 'utf8'));
  let values = {};
  if (fs.existsSync(path.join(root, '.env'))) {
    for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/); if (!m) continue;
      values[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  values = { ...values, ...process.env };
  const result = {
    ...base,
    supabaseUrl: (values.SUPABASE_URL ?? base.supabaseUrl).replace(/\/$/, ''),
    publishableKey: values.SUPABASE_PUBLISHABLE_KEY ?? base.publishableKey,
    authDomain: values.AUTH_DOMAIN ?? base.authDomain,
    allowLocal: (values.ALLOW_LOCAL ?? String(base.allowLocal)) === 'true'
  };
  if (required && (!result.supabaseUrl || !result.publishableKey)) throw new Error('Облачный выпуск: задайте SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY в Variables репозитория.');
  if (result.supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(result.supabaseUrl)) throw new Error('SUPABASE_URL должен быть HTTPS-адресом отдельного проекта Supabase.');
  const key = result.publishableKey;
  if (key.startsWith('sb_secret_')) throw new Error('Нельзя публиковать secret key. Нужен publishable key.');
  if (key && !key.startsWith('sb_publishable_')) {
    try { if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon') throw 0; }
    catch { throw new Error('Ожидается publishable key или legacy anon. service_role запрещён.'); }
  }
  if (required) result.allowLocal = false;
  return result;
}
