-- Revoke access invites after a transactional email send fails.
create or replace function public.revoke_member_access_invite(p_invite_id uuid)
returns boolean language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_signup_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  update public.member_access_invites
  set status='revoked'
  where id=p_invite_id and status='sent'
  returning waitlist_signup_id into v_signup_id;
  if not found then return false; end if;
  update public.waitlist_signups
  set status='approved'
  where id=v_signup_id and status='invited'
    and not exists(
      select 1 from public.member_access_invites i
      where i.waitlist_signup_id=v_signup_id and i.status='sent' and i.expires_at>now()
    );
  return true;
end; $$;
revoke all on function public.revoke_member_access_invite(uuid) from public,anon;
grant execute on function public.revoke_member_access_invite(uuid) to authenticated;
