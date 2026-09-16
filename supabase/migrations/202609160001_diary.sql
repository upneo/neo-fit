-- NEO FIT: apply only to a NEW, dedicated Supabase project.
-- No credentials or personal records are seeded here.
begin;
create table if not exists public.diary_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.-]{3,24}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.diary_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document jsonb not null check (
    jsonb_typeof(document) = 'object'
    and document->>'app' = 'neo-fit'
    and document->>'schemaVersion' = '2'
    and octet_length(document::text) <= 5242880
  ),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
alter table public.diary_members enable row level security;
alter table public.diary_documents enable row level security;
revoke all on public.diary_members, public.diary_documents from anon, authenticated;
grant usage on schema public to authenticated, service_role;
grant select on public.diary_members, public.diary_documents to authenticated;
grant all on public.diary_members, public.diary_documents to service_role;
-- Writes are through the compare-and-swap function, not direct REST updates.
-- SECURITY DEFINER is intentional: it owns the two tables and enforces ownership below.
drop policy if exists member_own_read on public.diary_members;
create policy member_own_read on public.diary_members for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists document_own_read on public.diary_documents;
create policy document_own_read on public.diary_documents for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.diary_members m where m.user_id = (select auth.uid())
  ));
create or replace function public.save_diary(p_expected bigint, p_document jsonb)
returns bigint language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved_version bigint;
  actual_username text;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select username into actual_username from public.diary_members where user_id=actor;
  if actual_username is null then raise exception 'Membership required' using errcode='42501'; end if;
  if p_expected is null or p_expected < 0
    or p_document is null
    or jsonb_typeof(p_document) <> 'object'
    or p_document->>'app' is distinct from 'neo-fit'
    or p_document->>'schemaVersion' is distinct from '2'
    or lower(p_document#>>'{profile,username}') is distinct from actual_username
    or jsonb_typeof(p_document->'programs') is distinct from 'array'
    or jsonb_typeof(p_document->'history') is distinct from 'array'
    or jsonb_typeof(p_document->'trackers') is distinct from 'array'
    or jsonb_typeof(p_document->'intakes') is distinct from 'array'
    or octet_length(p_document::text) > 5242880
  then raise exception 'Invalid diary document' using errcode='22023'; end if;
  if p_expected=0 then
    insert into public.diary_documents(user_id,document,version)
      values(actor,p_document,1) on conflict (user_id) do nothing returning version into saved_version;
  else
    update public.diary_documents set document=p_document,version=version+1,updated_at=now()
      where user_id=actor and version=p_expected returning version into saved_version;
  end if;
  if saved_version is null then
    raise exception 'Diary version conflict' using errcode='40001';
  end if;
  return saved_version;
end;
$$;
revoke all on function public.save_diary(bigint,jsonb) from public, anon;
grant execute on function public.save_diary(bigint,jsonb) to authenticated;
comment on function public.save_diary(bigint,jsonb) is 'Owner-bound compare-and-swap; authenticated membership required. Never accepts a client-supplied owner ID.';
-- The invitation is generated separately in Supabase Vault. This helper is
-- deliberately callable only by the server-side service role used by the
-- registration Edge Function. Browser roles cannot read or verify secrets.
create or replace function public.verify_diary_invite(p_candidate text)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    length(p_candidate) between 24 and 200
    and p_candidate = (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'neo_fit_diary_invite'
      order by created_at desc
      limit 1
    ),
    false
  );
$$;
revoke all on function public.verify_diary_invite(text) from public, anon, authenticated;
grant execute on function public.verify_diary_invite(text) to service_role;
comment on function public.verify_diary_invite(text) is 'Server-only invitation verification; the invitation remains in Supabase Vault.';
commit;
