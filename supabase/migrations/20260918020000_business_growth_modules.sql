create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sales_page_id uuid references public.sales_pages(id) on delete set null,
  name text not null,
  type text not null default 'infoproduto' check (type in ('infoproduto','afiliado','serviço','assinatura')),
  status text not null default 'ideia' check (status in ('ideia','criação','pronto','vendendo')),
  price numeric(12,2) not null default 0 check (price >= 0),
  margin numeric(5,2) not null default 0 check (margin >= 0 and margin <= 100),
  commission numeric(5,2) not null default 0 check (commission >= 0 and commission <= 100),
  channel text not null default '',
  revenue_generated numeric(12,2) not null default 0 check (revenue_generated >= 0),
  needs_audience text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.newsletter_leads(id) on delete set null,
  name text not null,
  type text not null default 'parceiro' check (type in ('afiliado','parceiro','colaborador')),
  contact text not null default '',
  commission numeric(5,2) not null default 0 check (commission >= 0 and commission <= 100),
  sales integer not null default 0 check (sales >= 0),
  value_to_pay numeric(12,2) not null default 0 check (value_to_pay >= 0),
  status text not null default 'Ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revenues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  partnership_id uuid references public.partnerships(id) on delete set null,
  lead_id uuid references public.newsletter_leads(id) on delete set null,
  source text not null default '',
  value numeric(12,2) not null default 0 check (value >= 0),
  occurred_on date not null default current_date,
  customer text not null default '',
  status text not null default 'pending' check (status in ('pending','received')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  product text not null default '',
  date_start date not null,
  date_end date not null,
  phase text not null default 'pré' check (phase in ('pré','lançamento','pós')),
  target_revenue numeric(12,2) not null default 0 check (target_revenue >= 0),
  real_result numeric(12,2) not null default 0 check (real_result >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_end >= date_start)
);

create table if not exists public.launch_content_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  launch_id uuid not null references public.launches(id) on delete cascade,
  content_type text not null check (content_type in ('post','newsletter')),
  post_id uuid references public.microblog_posts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (content_type = 'post' and post_id is not null and campaign_id is null)
    or
    (content_type = 'newsletter' and campaign_id is not null and post_id is null)
  ),
  unique (launch_id, content_type, post_id, campaign_id)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_macro text not null,
  key_result_1 text not null default '',
  key_result_2 text not null default '',
  key_result_3 text not null default '',
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  deadline date,
  weekly_review text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  module_name text not null check (module_name in (
    'Dashboard','Perfil','Links','Microblog','Newsletter','Leads','Analytics',
    'Posts','Rascunhos','Páginas de Venda','Ofertas','Receita','Centro de Comando',
    'GOAT','Parcerias','Lançamentos','Radar','Configurações'
  )),
  record_id uuid,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (goal_id, module_name, record_id)
);

create index if not exists offers_user_id_idx on public.offers(user_id);
create index if not exists offers_sales_page_id_idx on public.offers(sales_page_id);
create index if not exists partnerships_user_id_idx on public.partnerships(user_id);
create index if not exists partnerships_lead_id_idx on public.partnerships(lead_id);
create index if not exists revenues_user_id_idx on public.revenues(user_id);
create index if not exists revenues_offer_id_idx on public.revenues(offer_id);
create index if not exists revenues_partnership_id_idx on public.revenues(partnership_id);
create index if not exists revenues_lead_id_idx on public.revenues(lead_id);
create index if not exists revenues_occurred_on_idx on public.revenues(occurred_on);
create index if not exists launches_user_id_idx on public.launches(user_id);
create index if not exists launches_dates_idx on public.launches(date_start, date_end);
create index if not exists launch_content_links_user_id_idx on public.launch_content_links(user_id);
create index if not exists launch_content_links_launch_id_idx on public.launch_content_links(launch_id);
create index if not exists launch_content_links_post_id_idx on public.launch_content_links(post_id);
create index if not exists launch_content_links_campaign_id_idx on public.launch_content_links(campaign_id);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_deadline_idx on public.goals(deadline);
create index if not exists goal_links_user_id_idx on public.goal_links(user_id);
create index if not exists goal_links_goal_id_idx on public.goal_links(goal_id);

alter table public.offers enable row level security;
alter table public.partnerships enable row level security;
alter table public.revenues enable row level security;
alter table public.launches enable row level security;
alter table public.launch_content_links enable row level security;
alter table public.goals enable row level security;
alter table public.goal_links enable row level security;

drop policy if exists owner_all_offers on public.offers;
create policy owner_all_offers on public.offers for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_partnerships on public.partnerships;
create policy owner_all_partnerships on public.partnerships for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_revenues on public.revenues;
create policy owner_all_revenues on public.revenues for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_launches on public.launches;
create policy owner_all_launches on public.launches for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_launch_content_links on public.launch_content_links;
create policy owner_all_launch_content_links on public.launch_content_links for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_goals on public.goals;
create policy owner_all_goals on public.goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_goal_links on public.goal_links;
create policy owner_all_goal_links on public.goal_links for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on table public.offers, public.partnerships, public.revenues, public.launches, public.launch_content_links, public.goals, public.goal_links from anon;
grant select, insert, update, delete on table public.offers, public.partnerships, public.revenues, public.launches, public.launch_content_links, public.goals, public.goal_links to authenticated;
