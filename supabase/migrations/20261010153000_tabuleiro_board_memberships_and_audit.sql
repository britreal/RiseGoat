-- Vetted board memberships provide a source-backed basis for automatic interlock edges.
create table if not exists public.magnate_empresa_conselheiros (
  id uuid primary key default gen_random_uuid(),
  empresa_nome text not null,
  empresa_slug text not null,
  magnate_id uuid not null references public.magnates(id) on delete cascade,
  cargo text not null default 'conselheiro',
  fonte_url text not null,
  data_inicio date,
  data_fim date,
  curadoria_status text not null default 'sugerido' check(curadoria_status in ('sugerido','verificado','rejeitado')),
  revisado_por uuid references auth.users(id) on delete set null,
  revisado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint board_company_name_length check(char_length(trim(empresa_nome)) between 1 and 180),
  constraint board_company_slug_length check(char_length(trim(empresa_slug)) between 1 and 180),
  constraint board_source_url_http check(fonte_url ~* '^https?://'),
  constraint board_date_range check(data_inicio is null or data_fim is null or data_fim>=data_inicio),
  unique(empresa_slug,magnate_id,cargo)
);
alter table public.magnate_empresa_conselheiros enable row level security;
alter table public.magnate_empresa_conselheiros force row level security;
create index if not exists magnate_board_company_status_idx on public.magnate_empresa_conselheiros(empresa_slug,curadoria_status);
create index if not exists magnate_board_person_idx on public.magnate_empresa_conselheiros(magnate_id);

drop policy if exists board_membership_public_verified_select on public.magnate_empresa_conselheiros;
create policy board_membership_public_verified_select on public.magnate_empresa_conselheiros
for select to anon
using(curadoria_status='verificado' and exists(select 1 from public.magnates m where m.id=magnate_id and m.visivel_publico=true));

drop policy if exists board_membership_auth_select on public.magnate_empresa_conselheiros;
create policy board_membership_auth_select on public.magnate_empresa_conselheiros
for select to authenticated using(true);

drop policy if exists board_membership_admin_insert on public.magnate_empresa_conselheiros;
create policy board_membership_admin_insert on public.magnate_empresa_conselheiros
for insert to authenticated
with check(exists(select 1 from public.app_admins a where a.user_id=auth.uid()));

drop policy if exists board_membership_admin_update on public.magnate_empresa_conselheiros;
create policy board_membership_admin_update on public.magnate_empresa_conselheiros
for update to authenticated
using(exists(select 1 from public.app_admins a where a.user_id=auth.uid()))
with check(exists(select 1 from public.app_admins a where a.user_id=auth.uid()));

drop policy if exists board_membership_admin_delete on public.magnate_empresa_conselheiros;
create policy board_membership_admin_delete on public.magnate_empresa_conselheiros
for delete to authenticated
using(exists(select 1 from public.app_admins a where a.user_id=auth.uid()));

grant select on public.magnate_empresa_conselheiros to anon,authenticated;
grant insert,update,delete on public.magnate_empresa_conselheiros to authenticated;

create or replace function public.audit_magnate_admin_change()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_action text; v_meta jsonb;
begin
  if tg_op='INSERT' then v_id:=new.id;v_action:='tabuleiro_magnate_created';v_meta:=jsonb_build_object('visivel_publico',new.visivel_publico,'setor',new.setor);
  elsif tg_op='UPDATE' then v_id:=new.id;v_action:='tabuleiro_magnate_updated';v_meta:=jsonb_build_object('visivel_publico_before',old.visivel_publico,'visivel_publico_after',new.visivel_publico,'setor_before',old.setor,'setor_after',new.setor);
  else v_id:=old.id;v_action:='tabuleiro_magnate_deleted';v_meta:=jsonb_build_object('visivel_publico',old.visivel_publico,'setor',old.setor);
  end if;
  if public.is_admin() then
    insert into public.admin_audit_log(actor_id,action_key,entity_type,entity_id,metadata)
    values(v_actor,v_action,'magnate',v_id,v_meta);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists audit_tabuleiro_magnate_changes on public.magnates;
create trigger audit_tabuleiro_magnate_changes
after insert or update or delete on public.magnates
for each row execute function public.audit_magnate_admin_change();
revoke all on function public.audit_magnate_admin_change() from public,anon,authenticated;
