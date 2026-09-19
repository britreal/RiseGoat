-- Escritor de Livros/Ebooks: workflow sem IA, capítulos, versões, revisão, exportação e progresso diário.
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  subtitle text not null default '',
  genre text not null check (genre in ('Ficção','Não-ficção','Autoajuda','Negócios','Filosofia','Poesia')),
  target_audience text not null default '',
  promise text not null default '',
  tone text not null default '',
  estimated_words integer not null default 10000 check (estimated_words > 0),
  language text not null default 'PT' check (language in ('PT','EN','ES','FR','DE','IT','JP','ZH')),
  platform text not null default 'Amazon KDP' check (platform in ('Amazon KDP','Gumroad','Hotmart','Kiwify','Etsy','Payhip','Creative Market','Apple Books','Google Play')),
  status text not null default 'Conceito' check (status in ('Conceito','Estrutura','Escrita','Revisão','Capa','Metadados','Pronto')),
  current_step integer not null default 1 check (current_step between 1 and 7),
  cover_image text not null default '',
  description text not null default '',
  keywords text[] not null default '{}',
  categories text[] not null default '{}',
  isbn text not null default '',
  price numeric(14,2) not null default 0 check (price >= 0),
  rights text not null default 'Todos os direitos reservados' check (rights in ('Todos os direitos reservados','Creative Commons','Domínio público')),
  introduction text not null default '',
  conclusion text not null default '',
  about_author text not null default '',
  daily_word_goal integer not null default 500 check (daily_word_goal > 0),
  author_name text not null default '',
  review_checklist jsonb not null default '{"grammar":false,"cohesion":false,"clarity":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  summary text not null default '',
  content text not null default '',
  word_count integer not null default 0,
  page_start integer not null default 1,
  page_end integer not null default 1,
  status text not null default 'Rascunho' check (status in ('Rascunho','Revisão','Finalizado')),
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.book_chapters(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.book_exports (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  format text not null check (format in ('EPUB','PDF','DOCX','MOBI','PNG')),
  file_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.book_comments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.book_chapters(id) on delete cascade,
  paragraph_index integer not null check (paragraph_index >= 0),
  comment text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_daily_progress (
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_date date not null default current_date,
  start_word_count integer not null default 0,
  current_word_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (book_id, progress_date)
);

create index if not exists books_user_status_idx on public.books(user_id,status,updated_at desc);
create index if not exists books_user_genre_idx on public.books(user_id,genre);
create index if not exists book_chapters_book_order_idx on public.book_chapters(book_id,"order");
create index if not exists book_versions_chapter_created_idx on public.book_versions(chapter_id,created_at desc);
create index if not exists book_exports_book_created_idx on public.book_exports(book_id,created_at desc);
create index if not exists book_comments_chapter_idx on public.book_comments(chapter_id,paragraph_index);
create index if not exists book_daily_progress_user_date_idx on public.book_daily_progress(user_id,progress_date desc);

alter table public.books enable row level security;
alter table public.book_chapters enable row level security;
alter table public.book_versions enable row level security;
alter table public.book_exports enable row level security;
alter table public.book_comments enable row level security;
alter table public.book_daily_progress enable row level security;

drop policy if exists books_owner_all on public.books;
create policy books_owner_all on public.books for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists book_chapters_owner_all on public.book_chapters;
create policy book_chapters_owner_all on public.book_chapters for all to authenticated
using ((select auth.uid())=(select user_id from public.books where id=book_id))
with check ((select auth.uid())=(select user_id from public.books where id=book_id));

drop policy if exists book_versions_owner_all on public.book_versions;
create policy book_versions_owner_all on public.book_versions for all to authenticated
using ((select auth.uid())=(select user_id from public.books where id=book_id))
with check ((select auth.uid())=(select user_id from public.books where id=book_id));

drop policy if exists book_exports_owner_all on public.book_exports;
create policy book_exports_owner_all on public.book_exports for all to authenticated
using ((select auth.uid())=(select user_id from public.books where id=book_id))
with check ((select auth.uid())=(select user_id from public.books where id=book_id));

drop policy if exists book_comments_owner_all on public.book_comments;
create policy book_comments_owner_all on public.book_comments for all to authenticated
using ((select auth.uid())=(select user_id from public.books where id=book_id))
with check ((select auth.uid())=(select user_id from public.books where id=book_id));

drop policy if exists book_daily_progress_owner_all on public.book_daily_progress;
create policy book_daily_progress_owner_all on public.book_daily_progress for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

create or replace function public.book_chapter_before_change()
returns trigger language plpgsql set search_path=public
as $$
begin
  new.word_count := case when trim(new.content)='' then 0 else array_length(regexp_split_to_array(trim(new.content), '\s+'),1) end;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.recalc_book_pages(p_book_id uuid)
returns void language plpgsql set search_path=public
as $$
declare r record; current_page integer:=1; pages integer;
begin
  for r in select id,word_count from public.book_chapters where book_id=p_book_id order by "order",created_at,id loop
    pages:=greatest(1,ceil(greatest(r.word_count,1)::numeric/250))::integer;
    update public.book_chapters set page_start=current_page,page_end=current_page+pages-1 where id=r.id;
    current_page:=current_page+pages;
  end loop;
end;
$$;

create or replace function public.book_chapter_after_change()
returns trigger language plpgsql set search_path=public
as $$
begin
  perform public.recalc_book_pages(coalesce(new.book_id,old.book_id));
  if tg_op='UPDATE' and new.book_id<>old.book_id then perform public.recalc_book_pages(old.book_id); end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists book_chapters_before_change on public.book_chapters;
create trigger book_chapters_before_change before insert or update of content,"order" on public.book_chapters
for each row execute function public.book_chapter_before_change();

drop trigger if exists book_chapters_after_change on public.book_chapters;
create trigger book_chapters_after_change after insert or update of content,"order" or delete on public.book_chapters
for each row execute function public.book_chapter_after_change();

create or replace function public.touch_book_updated_at()
returns trigger language plpgsql set search_path=public
as $$ begin new.updated_at=now(); return new; end; $$;

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at before update on public.books for each row execute function public.touch_book_updated_at();
