-- Allow members to leave a circle and let admins manage circle structure without granting access to note content.
drop policy if exists circles_update_owner on public.circles;
create policy circles_update_owner on public.circles for update to authenticated
using(owner_user_id=auth.uid() or public.is_admin())
with check(owner_user_id=auth.uid() or public.is_admin());

drop policy if exists circles_delete_owner on public.circles;
create policy circles_delete_owner on public.circles for delete to authenticated
using(owner_user_id=auth.uid() or public.is_admin());

drop policy if exists circle_members_delete_owner on public.circle_members;
create policy circle_members_delete_owner on public.circle_members for delete to authenticated
using(user_id=auth.uid() or private.is_circle_owner(circle_id,auth.uid()) or public.is_admin());

drop policy if exists circle_members_admin_update on public.circle_members;
create policy circle_members_admin_update on public.circle_members for update to authenticated
using(public.is_admin()) with check(public.is_admin());
