/** Invite-only registration; no client-side service key; no password logging. */
const url = Deno.env.get('SUPABASE_URL') || '';
function namedKey(variable: string): string {
  try {
    const keys = JSON.parse(Deno.env.get(variable) || '{}');
    return typeof keys.default === 'string' ? keys.default : '';
  } catch { return ''; }
}
const serviceKey = namedKey('SUPABASE_SECRET_KEYS')
  || Deno.env.get('SUPABASE_SECRET_KEY')
  || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  || '';
const inviteSecret = Deno.env.get('DIARY_INVITE_CODE') || '';
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://upneo.github.io';
const authDomain = Deno.env.get('AUTH_DOMAIN') || 'users.neo-fit.invalid';
const genericError = 'Не удалось зарегистрироваться. Проверь данные и код приглашения.';
const encoder = new TextEncoder();
async function sameSecret(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([left, right].map(async x => new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(x))
  )));
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
const attempts = new Map<string, { count: number; until: number }>();
// Additional best-effort instance limiter. The random invitation remains the
// authorization boundary. Do not treat this map as a global durable rate limiter.
function limited(key: string): boolean {
  const now = Date.now();
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  const record = attempts.get(key);
  if (!record || record.until <= now) { attempts.set(key, { count: 1, until: now + 600000 }); return false; }
  record.count++;
  return record.count > 10;
}
function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { apikey: serviceKey, 'Content-Type': 'application/json' };
  // Legacy service_role is a JWT and must also be sent as bearer. New
  // sb_secret keys must only be sent in the apikey header.
  if (!serviceKey.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + serviceKey;
  return headers;
}
async function acceptedInvite(candidate: string): Promise<boolean> {
  if (inviteSecret) return inviteSecret.length >= 24
    && inviteSecret !== 'REPLACE_WITH_NEW_RANDOM_INVITATION'
    && await sameSecret(candidate, inviteSecret);
  const result = await fetch(url + '/rest/v1/rpc/verify_diary_invite', {
    method: 'POST', headers: adminHeaders(), body: JSON.stringify({ p_candidate: candidate }),
    signal: AbortSignal.timeout(15000)
  });
  return result.ok && await result.json().catch(() => false) === true;
}
Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Vary': 'Origin' };
  const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers });
  if (!url || !serviceKey || !allowedOrigin || !/^[a-z0-9.-]+$/i.test(authDomain))
    return reply(503, { error: 'Регистрация ещё не настроена владельцем.' });
  if (origin !== allowedOrigin) return reply(403, { error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (limited(ip)) return reply(429, { error: 'Повтори попытку позднее.' });
  if (Number(req.headers.get('content-length') || '0') > 8192) return reply(413, { error: 'Too large' });
  try {
    // Read at most 8192 bytes even when Content-Length is absent or forged.
    const reader = req.body?.getReader();
    if (!reader) return reply(400, { error: genericError });
    const parts: Uint8Array[] = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 8192) { await reader.cancel(); return reply(413, { error: 'Too large' }); }
      parts.push(part.value);
    }
    const all = new Uint8Array(size); let offset = 0;
    for (const part of parts) { all.set(part, offset); offset += part.length; }
    const body = JSON.parse(new TextDecoder().decode(all));
    const username = String(body.username || '').toLowerCase().trim();
    const password = typeof body.password === 'string' ? body.password : '';
    const displayName = String(body.displayName || username).trim();
    const invite = typeof body.invite === 'string' ? body.invite : '';
    if (!/^[a-z0-9_.-]{3,24}$/.test(username) || password.length < 8 || password.length > 128
      || displayName.length < 1 || displayName.length > 100 || invite.length > 200
      || !(await acceptedInvite(invite))) return reply(400, { error: genericError });
    const headers = adminHeaders();
    const created = await fetch(url + '/auth/v1/admin/users', { method: 'POST', headers,
      body: JSON.stringify({ email: username + '@' + authDomain, password, email_confirm: true,
        user_metadata: { username, displayName } }), signal: AbortSignal.timeout(15000) });
    const account = await created.json().catch(() => ({}));
    if (!created.ok || !account.id) return reply(400, { error: genericError });
    let membershipOK = false;
    try {
      const member = await fetch(url + '/rest/v1/diary_members', { method: 'POST', headers,
        body: JSON.stringify({ user_id: account.id, username }), signal: AbortSignal.timeout(15000) });
      membershipOK = member.ok;
    } catch { /* Compensate below; never emit the upstream body or credentials. */ }
    if (!membershipOK) {
      await fetch(url + '/auth/v1/admin/users/' + encodeURIComponent(account.id),
        { method: 'DELETE', headers, signal: AbortSignal.timeout(15000) }).catch(() => {});
      return reply(503, { error: 'Регистрация временно недоступна. Обратись к владельцу.' });
    }
    return reply(201, { ok: true });
  } catch { return reply(400, { error: genericError }); }
});
