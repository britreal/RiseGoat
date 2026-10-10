-- Let only server-side service-role code check whether an email already has an Auth identity.
create or replace function public.auth_email_exists(p_email text)
returns boolean language sql stable security definer set search_path='pg_catalog','auth'
as $$
  select exists(select 1 from auth.users where lower(email)=lower(trim(coalesce(p_email,''))));
$$;
revoke all on function public.auth_email_exists(text) from public,anon,authenticated;
grant execute on function public.auth_email_exists(text) to service_role;
