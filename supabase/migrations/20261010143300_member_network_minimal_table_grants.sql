-- Grant only the SQL operations required by the member-network UI; RLS remains the row-level boundary.
grant select, insert, update on public.member_profiles to authenticated;
grant select on public.member_referral_codes to authenticated;
grant select on public.member_access_invites to authenticated;
grant select, update on public.member_notifications to authenticated;

grant select, insert, update, delete on public.circles to authenticated;
grant select, insert, update, delete on public.circle_members to authenticated;
grant select, insert, update, delete on public.circle_notes to authenticated;

grant select on public.network_rooms to authenticated;
grant select, insert, update, delete on public.network_room_members to authenticated;
grant select, insert, update, delete on public.network_room_notes to authenticated;

grant select, insert, update on public.introduction_requests to authenticated;
grant select, insert, update on public.onboarding_requests to authenticated;
grant select on public.member_activity_events to authenticated;

-- Admin data is read-only through the API. Writes occur in guarded SECURITY DEFINER functions/triggers.
revoke insert, update, delete on public.admin_users from authenticated;
revoke insert, update, delete on public.admin_audit_log from authenticated;
