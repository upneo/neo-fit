-- A diary version mismatch is an expected application-level conflict, not a
-- database serialization failure. SQLSTATE 40001 makes PostgREST retry the
-- transaction and can create an unbounded load loop.
begin;

create or replace function public.save_diary(p_expected bigint, p_document jsonb)
returns bigint language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved_version bigint;
  actual_username text;
  incoming_schema integer;
  stored_schema integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select username into actual_username from public.diary_members where user_id=actor;
  if actual_username is null then raise exception 'Membership required' using errcode='42501'; end if;

  incoming_schema := case when p_document->>'schemaVersion' ~ '^[0-9]+$'
    then (p_document->>'schemaVersion')::integer else null end;
  if p_expected is null or p_expected < 0
    or p_document is null
    or jsonb_typeof(p_document) <> 'object'
    or p_document->>'app' is distinct from 'neo-fit'
    or incoming_schema not in (2, 3)
    or lower(p_document#>>'{profile,username}') is distinct from actual_username
    or jsonb_typeof(p_document->'programs') is distinct from 'array'
    or jsonb_typeof(p_document->'history') is distinct from 'array'
    or jsonb_typeof(p_document->'trackers') is distinct from 'array'
    or jsonb_typeof(p_document->'intakes') is distinct from 'array'
    or (incoming_schema = 3 and (
      jsonb_typeof(p_document->'inBody') is distinct from 'array'
      or p_document#>>'{schedule,mode}' is distinct from 'queue'
      or jsonb_typeof(p_document#>'{schedule,queue}') is distinct from 'array'
    ))
    or octet_length(p_document::text) > 5242880
  then raise exception 'Invalid diary document' using errcode='22023'; end if;

  if p_expected = 0 then
    insert into public.diary_documents(user_id, document, version)
      values(actor, p_document, 1)
      on conflict (user_id) do nothing
      returning version into saved_version;
  else
    select case when document->>'schemaVersion' ~ '^[0-9]+$'
      then (document->>'schemaVersion')::integer else null end
      into stored_schema
      from public.diary_documents where user_id = actor;
    if stored_schema = 3 and incoming_schema < 3 then
      raise exception 'Diary schema downgrade rejected' using errcode='22023';
    end if;
    update public.diary_documents
      set document = p_document, version = version + 1, updated_at = now()
      where user_id = actor and version = p_expected
      returning version into saved_version;
  end if;

  if saved_version is null then
    raise sqlstate 'PT409' using
      message = 'Diary version conflict',
      detail = 'A newer diary version exists in the cloud.',
      hint = 'Reload the current cloud version before saving again.';
  end if;
  return saved_version;
end;
$$;

revoke all on function public.save_diary(bigint,jsonb) from public, anon;
grant execute on function public.save_diary(bigint,jsonb) to authenticated;
comment on function public.save_diary(bigint,jsonb) is
  'Owner-bound CAS for NEO FIT v2/v3. Version conflicts return HTTP 409 PT409 and are never retried by PostgREST.';

commit;
