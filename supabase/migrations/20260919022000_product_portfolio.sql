-- Product Portfolio: product catalog, sales, aggregate metrics, alerts and integration links.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null,
  description text not null default '',
  type text not null check (type in ('PDF','E-book','Audiobook','Curso','Template','Planilha','Software')),
  language text not null check (language in ('PT','EN','ES','FR','DE','IT','JP','ZH')),
  platform text not null check (platform in ('Amazon KDP','Gumroad','Hotmart','Kiwify','Etsy','Payhip','Creative Market','Apple Books','Google Play')),
  price numeric(14,2) not null check (price > 0),
  currency text not null check (currency in ('BRL','USD','EUR','GBP')),
  cost numeric(14,2) not null default 0 check (cost >= 0),
  total_views integer not null default 0 check (total_views >= 0),
  status text not null check (status in ('Ideia','Em produção','Publicado','Vendendo','Pausado','Descontinuado')),
  url text not null default '',
  cover_image text not null default '',
  tags text[] not null default '{}',
  content_base_id uuid,
  parent_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(user_id, slug)
);

create table if not exists public.product_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null default current_date,
  quantity integer not null check (quantity > 0),
  revenue numeric(14,2) not null check (revenue >= 0),
  platform_fee numeric(14,2) not null default 0 check (platform_fee >= 0 and platform_fee <= revenue),
  net_revenue numeric(14,2) generated always as (revenue - platform_fee) stored,
  currency text not null check (currency in ('BRL','USD','EUR','GBP')),
  customer_country text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.product_metrics (
  product_id uuid primary key references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_views integer not null default 0,
  total_sales integer not null default 0,
  total_revenue numeric(14,2) not null default 0,
  total_net_revenue numeric(14,2) not null default 0,
  conversion_rate numeric(12,4) not null default 0,
  avg_daily_sales numeric(14,4) not null default 0,
  last_sale_date date,
  days_without_sale integer not null default 9999,
  roi numeric(14,4) not null default 0,
  score numeric(14,4) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alert_type text not null check (alert_type in ('produto_morto','produto_campeao','roi_negativo','sem_traducao','sem_capa','preco_fora_faixa')),
  title text not null,
  message text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, alert_type)
);

create table if not exists public.product_launches (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  launch_id uuid not null references public.launches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, launch_id)
);

create table if not exists public.product_partnerships (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, partnership_id)
);

alter table public.offers add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.revenues add column if not exists product_sale_id uuid references public.product_sales(id) on delete set null;
alter table public.revenues add column if not exists currency text check (currency in ('BRL','USD','EUR','GBP'));

create index if not exists products_user_status_idx on public.products(user_id, status);
create index if not exists products_user_language_idx on public.products(user_id, language);
create index if not exists products_user_platform_idx on public.products(user_id, platform);
create index if not exists products_parent_idx on public.products(parent_id);
create index if not exists products_tags_gin_idx on public.products using gin(tags);
create index if not exists product_sales_product_date_idx on public.product_sales(product_id, date desc);
create index if not exists product_sales_user_date_idx on public.product_sales(user_id, date desc);
create index if not exists product_metrics_user_score_idx on public.product_metrics(user_id, score desc);
create index if not exists product_alerts_user_active_idx on public.product_alerts(user_id, is_active, updated_at desc);
create index if not exists product_launches_user_product_idx on public.product_launches(user_id, product_id);
create index if not exists product_partnerships_user_product_idx on public.product_partnerships(user_id, product_id);
create index if not exists offers_product_id_idx on public.offers(product_id);
create unique index if not exists revenues_product_sale_id_uidx on public.revenues(product_sale_id) where product_sale_id is not null;

alter table public.products enable row level security;
alter table public.product_sales enable row level security;
alter table public.product_metrics enable row level security;
alter table public.product_alerts enable row level security;
alter table public.product_launches enable row level security;
alter table public.product_partnerships enable row level security;

drop policy if exists products_owner_all on public.products;
create policy products_owner_all on public.products for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists product_sales_owner_all on public.product_sales;
create policy product_sales_owner_all on public.product_sales for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists product_metrics_owner_all on public.product_metrics;
create policy product_metrics_owner_all on public.product_metrics for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists product_alerts_owner_all on public.product_alerts;
create policy product_alerts_owner_all on public.product_alerts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists product_launches_owner_all on public.product_launches;
create policy product_launches_owner_all on public.product_launches for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists product_partnerships_owner_all on public.product_partnerships;
create policy product_partnerships_owner_all on public.product_partnerships for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.refresh_product_metrics(p_product_id uuid)
returns void language plpgsql set search_path = public
as $$
declare
  p public.products%rowtype;
  sales_count integer;
  total_rev numeric := 0;
  total_net numeric := 0;
  last_sale date;
  first_sale date;
  active_days integer;
  conv numeric := 0;
  avg_sales numeric := 0;
  roi_value numeric := 0;
  score_value numeric := 0;
  top_language text;
  root_id uuid;
begin
  select * into p from public.products where id = p_product_id;
  if not found then return; end if;

  select
    coalesce(sum(quantity),0)::integer,
    coalesce(sum(revenue),0),
    coalesce(sum(net_revenue),0),
    max(date),
    min(date)
  into sales_count, total_rev, total_net, last_sale, first_sale
  from public.product_sales
  where product_id = p_product_id and user_id = p.user_id;

  if p.total_views > 0 then conv := (sales_count::numeric / p.total_views::numeric) * 100; end if;
  active_days := greatest(1, coalesce(current_date - first_sale + 1, 1));
  avg_sales := sales_count::numeric / active_days::numeric;
  if p.cost > 0 then roi_value := ((total_net - p.cost) / p.cost) * 100; end if;

  score_value :=
      (least(100, sales_count::numeric) * 0.4)
    + (least(100, conv) * 0.3)
    + (greatest(0, 100 * (1 - least(coalesce(current_date - last_sale, 90), 90) / 90.0)) * 0.2)
    + (greatest(0, least(100, (roi_value + 100) / 2)) * 0.1);

  insert into public.product_metrics (
    product_id,user_id,total_views,total_sales,total_revenue,total_net_revenue,
    conversion_rate,avg_daily_sales,last_sale_date,days_without_sale,roi,score,updated_at
  ) values (
    p.id,p.user_id,p.total_views,sales_count,total_rev,total_net,conv,avg_sales,last_sale,
    coalesce(current_date-last_sale,9999),roi_value,score_value,now()
  )
  on conflict (product_id) do update set
    user_id=excluded.user_id,total_views=excluded.total_views,total_sales=excluded.total_sales,
    total_revenue=excluded.total_revenue,total_net_revenue=excluded.total_net_revenue,
    conversion_rate=excluded.conversion_rate,avg_daily_sales=excluded.avg_daily_sales,
    last_sale_date=excluded.last_sale_date,days_without_sale=excluded.days_without_sale,
    roi=excluded.roi,score=excluded.score,updated_at=now();

  update public.product_alerts
    set is_active=false, updated_at=now()
    where product_id=p.id and user_id=p.user_id;

  if (p.status='Vendendo' and (last_sale is null or current_date-last_sale>30)) then
    insert into public.product_alerts (user_id,product_id,alert_type,title,message,severity,is_active,updated_at)
    values (p.user_id,p.id,'produto_morto','Produto sem vendas recentes','O produto está marcado como Vendendo e está há mais de 30 dias sem venda.','warning',true,now())
    on conflict (product_id,alert_type) do update set
      title=excluded.title,message=excluded.message,severity=excluded.severity,is_active=true,updated_at=now();
  end if;

  if sales_count>100 and conv>1 then
    insert into public.product_alerts (user_id,product_id,alert_type,title,message,severity,is_active,updated_at)
    values (p.user_id,p.id,'produto_campeao','Produto campeão','Mais de 100 vendas e conversão acima de 1%. Considere criar traduções e variações.','info',true,now())
    on conflict (product_id,alert_type) do update set
      title=excluded.title,message=excluded.message,severity=excluded.severity,is_active=true,updated_at=now();
  end if;

  if roi_value<0 then
    insert into public.product_alerts (user_id,product_id,alert_type,title,message,severity,is_active,updated_at)
    values (p.user_id,p.id,'roi_negativo','ROI negativo','O retorno líquido acumulado está abaixo do custo registrado do produto.','critical',true,now())
    on conflict (product_id,alert_type) do update set
      title=excluded.title,message=excluded.message,severity=excluded.severity,is_active=true,updated_at=now();
  end if;

  if nullif(trim(p.cover_image),'') is null then
    insert into public.product_alerts (user_id,product_id,alert_type,title,message,severity,is_active,updated_at)
    values (p.user_id,p.id,'sem_capa','Produto sem capa','Adicione uma capa para completar a apresentação do produto.','warning',true,now())
    on conflict (product_id,alert_type) do update set
      title=excluded.title,message=excluded.message,severity=excluded.severity,is_active=true,updated_at=now();
  end if;

  if p.price<5 or p.price>200 then
    insert into public.product_alerts (user_id,product_id,alert_type,title,message,severity,is_active,updated_at)
    values (p.user_id,p.id,'preco_fora_faixa','Preço fora da faixa','O preço está abaixo de 5 ou acima de 200 na moeda cadastrada.','warning',true,now())
    on conflict (product_id,alert_type) do update set
      title=excluded.title,message=excluded.message,severity=excluded.severity,is_active=true,updated_at=now();
  end if;

  if sales_count>100 and conv>1 then
    root_id := coalesce(p.parent_id,p.id);
    select p2.language into top_language
    from public.products p2
    left join public.product_metrics m2 on m2.product_id=p2.id
    where p2.user_id=p.user_id
    group by p2.language
    order by coalesce(sum(m2.total_sales),0) desc
    limit 1;

    if top_language is not null and top_language<>p.language
       and not exists (
         select 1 from public.products sibling
         where sibling.user_id=p.user_id
           and coalesce(sibling.parent_id,sibling.id)=root_id
           and sibling.language=top_language
       ) then
      insert into public.product_alerts (user_id,product_id,alert_type,title,message,severity,is_active,updated_at)
      values (p.user_id,p.id,'sem_traducao','Sem tradução para idioma líder','Este produto campeão ainda não possui uma versão no idioma com maior volume de vendas do seu portfólio.','info',true,now())
      on conflict (product_id,alert_type) do update set
        title=excluded.title,message=excluded.message,severity=excluded.severity,is_active=true,updated_at=now();
    end if;
  end if;
end;
$$;

create or replace function public.products_after_change()
returns trigger language plpgsql set search_path=public
as $$
begin
  perform public.refresh_product_metrics(new.id);
  return new;
end;
$$;

drop trigger if exists products_metrics_after_insert_update on public.products;
create trigger products_metrics_after_insert_update
after insert or update on public.products
for each row execute function public.products_after_change();

create or replace function public.validate_product_sale_currency()
returns trigger language plpgsql set search_path=public
as $$
declare expected_currency text;
begin
  select currency into expected_currency
  from public.products
  where id=new.product_id and user_id=new.user_id;
  if expected_currency is null then raise exception 'Produto não encontrado para esta conta.'; end if;
  if new.currency<>expected_currency then
    raise exception 'A moeda da venda deve ser igual à moeda do produto (%).', expected_currency;
  end if;
  return new;
end;
$$;

drop trigger if exists product_sales_validate_currency on public.product_sales;
create trigger product_sales_validate_currency
before insert or update on public.product_sales
for each row execute function public.validate_product_sale_currency();

create or replace function public.product_sales_after_change()
returns trigger language plpgsql set search_path=public
as $$
begin
  if tg_op='DELETE' then
    delete from public.revenues where product_sale_id=old.id;
    perform public.refresh_product_metrics(old.product_id);
    return old;
  end if;

  if tg_op='UPDATE' then
    delete from public.revenues where product_sale_id=new.id;
    perform public.refresh_product_metrics(old.product_id);
  end if;

  insert into public.revenues (
    user_id,offer_id,source,value,occurred_on,customer,status,product_sale_id,currency,updated_at
  )
  select p.user_id,o.id,'Portfólio de Produtos',new.net_revenue,new.date,new.customer_country,'recebido',new.id,new.currency,now()
  from public.products p
  left join public.offers o on o.product_id=p.id and o.user_id=p.user_id
  where p.id=new.product_id and p.user_id=new.user_id
  on conflict (product_sale_id) do update set
    offer_id=excluded.offer_id,source=excluded.source,value=excluded.value,occurred_on=excluded.occurred_on,
    customer=excluded.customer,status=excluded.status,currency=excluded.currency,updated_at=now();

  perform public.refresh_product_metrics(new.product_id);
  return new;
end;
$$;

drop trigger if exists product_sales_revenue_and_metrics on public.product_sales;
create trigger product_sales_revenue_and_metrics
after insert or update or delete on public.product_sales
for each row execute function public.product_sales_after_change();

create or replace function public.get_product_portfolio_summary()
returns jsonb language sql stable set search_path=public
as $$
select jsonb_build_object(
  'products_total',(select count(*) from public.products where user_id=(select auth.uid())),
  'by_status',coalesce((
    select jsonb_agg(jsonb_build_object('label',status,'count',cnt) order by cnt desc)
    from (select status,count(*)::integer cnt from public.products where user_id=(select auth.uid()) group by status) s
  ),'[]'::jsonb),
  'by_language',coalesce((
    select jsonb_agg(jsonb_build_object('label',language,'count',cnt) order by cnt desc)
    from (select language,count(*)::integer cnt from public.products where user_id=(select auth.uid()) group by language) s
  ),'[]'::jsonb),
  'by_platform',coalesce((
    select jsonb_agg(jsonb_build_object('label',platform,'count',cnt) order by cnt desc)
    from (select platform,count(*)::integer cnt from public.products where user_id=(select auth.uid()) group by platform) s
  ),'[]'::jsonb),
  'current_month_revenue',coalesce((
    select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
    from (
      select currency,coalesce(sum(net_revenue),0)::numeric value
      from public.product_sales
      where user_id=(select auth.uid()) and date>=date_trunc('month',current_date)::date
      group by currency
    ) s
  ),'[]'::jsonb),
  'projected_annual',coalesce((
    select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
    from (
      select p.currency,coalesce(sum(m.avg_daily_sales*30*p.price*12),0)::numeric value
      from public.products p join public.product_metrics m on m.product_id=p.id
      where p.user_id=(select auth.uid())
      group by p.currency
    ) s
  ),'[]'::jsonb),
  'top_revenue',coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select p.id,p.title,p.currency,m.total_net_revenue,m.total_sales,m.conversion_rate,m.score
      from public.products p join public.product_metrics m on m.product_id=p.id
      where p.user_id=(select auth.uid())
      order by m.total_net_revenue desc limit 10
    ) t
  ),'[]'::jsonb),
  'top_conversion',coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select p.id,p.title,p.currency,m.conversion_rate,m.total_sales,m.total_net_revenue,m.score
      from public.products p join public.product_metrics m on m.product_id=p.id
      where p.user_id=(select auth.uid())
      order by m.conversion_rate desc,m.total_sales desc limit 10
    ) t
  ),'[]'::jsonb),
  'active_alerts_count',(select count(*) from public.product_alerts where user_id=(select auth.uid()) and is_active),
  'active_alerts',coalesce((
    select jsonb_agg(to_jsonb(a)) from (
      select a.id,a.product_id,a.alert_type,a.title,a.message,a.severity,a.updated_at
      from public.product_alerts a
      where a.user_id=(select auth.uid()) and a.is_active
      order by case a.severity when 'critical' then 1 when 'warning' then 2 else 3 end,a.updated_at desc limit 20
    ) a
  ),'[]'::jsonb)
);
$$;

grant execute on function public.get_product_portfolio_summary() to authenticated;

drop view if exists public.product_catalog;
create view public.product_catalog with (security_invoker=true) as
select
  p.id,p.user_id,p.title,p.slug,p.description,p.type,p.language,p.platform,p.price,p.currency,p.cost,
  p.total_views,p.status,p.url,p.cover_image,p.tags,p.content_base_id,p.parent_id,p.created_at,p.published_at,
  ((p.price-p.cost)/nullif(p.price,0)*100)::numeric(14,4) as margin,
  m.total_sales,m.total_revenue,m.total_net_revenue,m.conversion_rate,m.avg_daily_sales,
  m.last_sale_date,m.days_without_sale,m.roi,m.score
from public.products p
left join public.product_metrics m on m.product_id=p.id;

grant select on public.product_catalog to authenticated;
