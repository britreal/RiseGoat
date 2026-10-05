do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notes') then alter publication supabase_realtime add table public.notes; end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='note_checklist_items') then alter publication supabase_realtime add table public.note_checklist_items; end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='note_attachments') then alter publication supabase_realtime add table public.note_attachments; end if;
  end if;
end $$;