-- Run only against a dedicated development project with pgTAP enabled.
-- Transaction is rolled back; users below are synthetic test fixtures.
begin;
set local search_path = public, extensions;
select plan(16);
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','testowner@users.neo-fit.invalid'),
 ('22222222-2222-4222-8222-222222222222','testother@users.neo-fit.invalid'),
 ('33333333-3333-4333-8333-333333333333','outsider@users.neo-fit.invalid');
insert into public.diary_members(user_id,username) values
 ('11111111-1111-4111-8111-111111111111','testowner'),
 ('22222222-2222-4222-8222-222222222222','testother');
select ok(not has_table_privilege('anon','public.diary_documents','select'),'anon cannot read documents');
select ok(not has_table_privilege('anon','public.diary_members','select'),'anon cannot enumerate members');
select ok(not has_function_privilege('anon','public.save_diary(bigint,jsonb)','execute'),'anon cannot call save');
select ok(not has_table_privilege('authenticated','public.diary_documents','insert'),'direct inserts denied');
select ok(not has_table_privilege('authenticated','public.diary_documents','update'),'direct updates denied');
select ok(not has_table_privilege('authenticated','public.diary_documents','delete'),'direct deletes denied');
select ok(not has_table_privilege('authenticated','public.diary_members','insert,update,delete'),'client cannot enroll members');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select is(public.save_diary(0,'{"app":"neo-fit","schemaVersion":2,"profile":{"username":"testowner"},"programs":[],"history":[],"trackers":[],"intakes":[]}'::jsonb),1::bigint,'owner creates own document');
select results_eq('select count(*) from public.diary_documents',array[1::bigint],'owner reads own row');
select throws_ok($$select public.save_diary(0,'{"app":"neo-fit","schemaVersion":2,"profile":{"username":"testowner"},"programs":[],"history":[],"trackers":[],"intakes":[]}'::jsonb)$$,'40001',null,'stale version rejected');
select is(public.save_diary(1,'{"app":"neo-fit","schemaVersion":3,"profile":{"username":"testowner"},"schedule":{"mode":"queue","queue":[]},"programs":[],"history":[],"trackers":[],"intakes":[],"inBody":[]}'::jsonb),2::bigint,'owner upgrades document to schema v3');
select throws_ok($$select public.save_diary(2,'{"app":"neo-fit","schemaVersion":2,"profile":{"username":"testowner"},"programs":[],"history":[],"trackers":[],"intakes":[]}'::jsonb)$$,'22023',null,'schema v3 cannot be downgraded');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select results_eq('select count(*) from public.diary_documents',array[0::bigint],'other account cannot read first owner');
select throws_ok($$select public.save_diary(0,'{"app":"neo-fit","schemaVersion":2,"profile":{"username":"testowner"},"programs":[],"history":[],"trackers":[],"intakes":[]}'::jsonb)$$,'22023',null,'forged profile identity rejected');
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
select throws_ok($$select public.save_diary(0,'{}'::jsonb)$$,'42501',null,'non-member cannot save');
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok($$select public.save_diary(0,'{}'::jsonb)$$,'42501',null,'no subject cannot save');
reset role;
select * from finish();
rollback;
