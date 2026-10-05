-- Keep child-table policies from recursively evaluating public.notes RLS.
drop policy if exists note_label_links_select on public.note_label_links;
create policy note_label_links_select on public.note_label_links
for select to authenticated
using (
  private.note_owner_id(note_id) = auth.uid()
  or private.user_can_access_note(note_id, auth.uid())
);

drop policy if exists note_checklist_select on public.note_checklist_items;
create policy note_checklist_select on public.note_checklist_items
for select to authenticated
using (
  private.note_owner_id(note_id) = auth.uid()
  or private.user_can_access_note(note_id, auth.uid())
);

drop policy if exists note_checklist_insert on public.note_checklist_items;
create policy note_checklist_insert on public.note_checklist_items
for insert to authenticated
with check (
  private.note_owner_id(note_id) = auth.uid()
  or private.user_can_edit_note(note_id, auth.uid())
);

drop policy if exists note_checklist_update on public.note_checklist_items;
create policy note_checklist_update on public.note_checklist_items
for update to authenticated
using (
  private.note_owner_id(note_id) = auth.uid()
  or private.user_can_edit_note(note_id, auth.uid())
)
with check (
  private.note_owner_id(note_id) = auth.uid()
  or private.user_can_edit_note(note_id, auth.uid())
);

drop policy if exists note_attachments_select on public.note_attachments;
create policy note_attachments_select on public.note_attachments
for select to authenticated
using (
  private.note_owner_id(note_id) = auth.uid()
  or private.user_can_access_note(note_id, auth.uid())
);

drop policy if exists note_attachments_insert on public.note_attachments;
create policy note_attachments_insert on public.note_attachments
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    private.note_owner_id(note_id) = auth.uid()
    or private.user_can_edit_note(note_id, auth.uid())
  )
);

drop policy if exists note_label_links_delete on public.note_label_links;
create policy note_label_links_delete on public.note_label_links
for delete to authenticated
using (private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_attachments_delete on public.note_attachments;
create policy note_attachments_delete on public.note_attachments
for delete to authenticated
using (user_id = auth.uid());
