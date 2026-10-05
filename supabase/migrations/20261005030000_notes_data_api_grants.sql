-- Supabase Data API grants for the Notes feature.
-- RLS still controls which rows authenticated users may access.
grant select, insert, update, delete on table public.notes to authenticated;
grant select, insert, update, delete on table public.note_labels to authenticated;
grant select, insert, update, delete on table public.note_label_links to authenticated;
grant select, insert, update, delete on table public.note_checklist_items to authenticated;
grant select, insert, update, delete on table public.note_attachments to authenticated;
grant select, insert, update, delete on table public.note_reminders to authenticated;
grant select, insert, update, delete on table public.note_collaborators to authenticated;
grant select, insert, update, delete on table public.note_share_invites to authenticated;
