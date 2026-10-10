
-- Trigger-only SECURITY DEFINER functions must not be callable as public RPCs.
revoke all on function public.enforce_circle_size() from public,anon,authenticated;
revoke all on function public.enforce_network_room_note_moderation() from public,anon,authenticated;
revoke all on function public.notify_note_share_invite() from public,anon,authenticated;
revoke all on function public.seed_member_profile() from public,anon,authenticated;
revoke all on function public.track_member_note_metadata() from public,anon,authenticated;
revoke all on function public.track_optin_checklist_completion() from public,anon,authenticated;
revoke all on function public.block_new_signups() from public,anon,authenticated;

create index if not exists circles_owner_user_id_idx on public.circles(owner_user_id);
create index if not exists circle_members_invited_by_idx on public.circle_members(invited_by);
create index if not exists circle_notes_created_by_idx on public.circle_notes(created_by);
create index if not exists member_access_invites_waitlist_signup_id_idx on public.member_access_invites(waitlist_signup_id);
create index if not exists member_access_invites_accepted_by_idx on public.member_access_invites(accepted_by);
create index if not exists member_referral_codes_redeemed_by_signup_id_idx on public.member_referral_codes(redeemed_by_signup_id);
create index if not exists network_rooms_created_by_idx on public.network_rooms(created_by);
create index if not exists network_room_members_user_id_idx on public.network_room_members(user_id);
create index if not exists network_room_notes_created_by_idx on public.network_room_notes(created_by);
create index if not exists introduction_requests_requester_id_idx on public.introduction_requests(requester_id);
create index if not exists introduction_requests_target_user_id_idx on public.introduction_requests(target_user_id);
create index if not exists introduction_requests_reviewed_by_idx on public.introduction_requests(reviewed_by);
create index if not exists onboarding_requests_user_id_idx on public.onboarding_requests(user_id);
create index if not exists onboarding_requests_reviewed_by_idx on public.onboarding_requests(reviewed_by);
create index if not exists waitlist_signups_reviewed_by_idx on public.waitlist_signups(reviewed_by);
create index if not exists waitlist_signups_referral_inviter_id_idx on public.waitlist_signups(referral_inviter_id);
create index if not exists waitlist_signups_referral_code_id_idx on public.waitlist_signups(referral_code_id);
