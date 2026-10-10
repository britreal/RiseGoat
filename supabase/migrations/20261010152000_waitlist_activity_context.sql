-- Add professional context to the curated waitlist without changing the public signup rule.
alter table public.waitlist_signups
  add column if not exists activity_context text not null default '';
alter table public.waitlist_signups
  drop constraint if exists waitlist_activity_context_length;
alter table public.waitlist_signups
  add constraint waitlist_activity_context_length check (char_length(activity_context)<=240);

drop function if exists public.request_membership(text,text,text);
create function public.request_membership(
  p_name text,
  p_email text,
  p_referral_code text,
  p_activity_context text
)
returns uuid
language plpgsql security definer set search_path='pg_catalog','public','extensions'
as $$
declare
  v_name text:=trim(coalesce(p_name,''));
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_activity text:=left(trim(coalesce(p_activity_context,'')),240);
  v_code public.member_referral_codes%rowtype;
  v_signup uuid;
begin
  if length(v_name)<1 or length(v_name)>120 then raise exception 'Informe um nome válido.'; end if;
  if length(v_email)<3 or length(v_email)>320 or v_email !~ '^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$' then
    raise exception 'Informe um e-mail válido.';
  end if;
  if exists(select 1 from public.waitlist_signups w where lower(w.email)=v_email and w.status in ('pending','approved','invited','joined')) then
    raise exception 'Este e-mail já possui uma solicitação registrada.';
  end if;

  if nullif(trim(coalesce(p_referral_code,'')),'') is not null then
    select * into v_code from public.member_referral_codes c
    where c.code_hash=encode(extensions.digest(upper(trim(p_referral_code)),'sha256'),'hex')
      and c.status='available' and c.expires_at>now()
    for update;
    if not found then raise exception 'Código de indicação inválido, expirado ou já usado.'; end if;
  end if;

  insert into public.waitlist_signups(name,email,source,status,referral_inviter_id,referral_code_id,activity_context)
  values(v_name,v_email,'auth_page','pending',v_code.inviter_id,v_code.id,v_activity)
  returning id into v_signup;
  if v_code.id is not null then
    update public.member_referral_codes
    set status='redeemed',redeemed_at=now(),redeemed_by_signup_id=v_signup
    where id=v_code.id;
  end if;
  return v_signup;
end; $$;
revoke all on function public.request_membership(text,text,text,text) from public;
grant execute on function public.request_membership(text,text,text,text) to anon,authenticated;
