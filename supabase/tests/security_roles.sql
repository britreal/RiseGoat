-- Execute with an elevated database connection in staging or production.
-- Each test transaction is rolled back; fixture magnates are never persisted.
-- The member test uses a non-existent synthetic subject because the audited project currently has
-- only an administrator account. It validates the non-admin authenticated policy path, not a real member session.

begin;
insert into public.magnates(name,slug,setor,visivel_publico)
values
  ('RLS test public fixture','__rls_test_public__','test',true),
  ('RLS test private fixture','__rls_test_private__','test',false)
on conflict(slug) do update set visivel_publico=excluded.visivel_publico;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$
declare visible_rows integer;
begin
  select count(*) into visible_rows from public.magnates where slug like '\_\_rls_test\_%' escape '\';
  if visible_rows<>1 then raise exception 'Anon RLS failure: expected one public fixture, found %',visible_rows; end if;
  if has_table_privilege(current_user,'public.notes','select') then
    raise exception 'Anon has direct SELECT privilege on private notes.';
  end if;
end $$;
rollback;
select 'PASS: anon can see only public Tabuleiro fixtures and cannot SELECT private notes' as test_result;

begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}',true);
do $$
declare notes_seen integer; circle_notes_seen integer; profiles_seen integer; audit_seen integer;
begin
  if public.is_admin() then raise exception 'Synthetic non-admin subject was incorrectly recognized as admin.'; end if;
  select count(*) into notes_seen from public.notes;
  select count(*) into circle_notes_seen from public.circle_notes;
  select count(*) into profiles_seen from public.member_profiles;
  select count(*) into audit_seen from public.admin_audit_log;
  if notes_seen<>0 or circle_notes_seen<>0 or profiles_seen<>0 or audit_seen<>0 then
    raise exception 'Non-admin isolation failed: notes %, circle notes %, profiles %, audit %',
      notes_seen,circle_notes_seen,profiles_seen,audit_seen;
  end if;
  if has_table_privilege(current_user,'public.circle_notes','select') is false then
    raise exception 'Authenticated circle UI does not have required SELECT privilege.';
  end if;
  if has_table_privilege(current_user,'public.admin_audit_log','insert') then
    raise exception 'Authenticated role can insert forged admin audit entries.';
  end if;
end $$;
rollback;
select 'PASS: simulated non-admin JWT cannot see private rows or read admin audit' as test_result;

begin;
select set_config('test.security_admin_id',(select user_id::text from public.admin_users order by created_at limit 1),true);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub',current_setting('test.security_admin_id'),'role','authenticated')::text,
  true
);
do $$
declare admin_count integer; audit_before integer; audit_after integer;
begin
  if not public.is_admin() then raise exception 'Configured administrator was not recognized.'; end if;
  select count(*) into admin_count from public.admin_users;
  if admin_count<1 then raise exception 'Administrator table is not readable by its members.'; end if;
  select count(*) into audit_before from public.admin_audit_log;
  perform public.log_admin_access('network_dashboard');
  select count(*) into audit_after from public.admin_audit_log;
  if audit_after<=audit_before then raise exception 'Admin access did not create an audit event.'; end if;
end $$;
rollback;
select 'PASS: admin access is recognized and dashboard access logging writes an audit event' as test_result;
