-- Circle-note content is only readable by accepted circle members, not by admins globally.
-- Administrative dashboards remain metadata-only; administrators must join a circle to read its shared notes.
drop policy if exists circle_notes_select_member on public.circle_notes;
create policy circle_notes_select_member on public.circle_notes
for select to authenticated
using (private.is_circle_member(circle_id,auth.uid()));
