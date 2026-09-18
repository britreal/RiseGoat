-- Add covering indexes for foreign keys used by RiseGoat flows.
create index if not exists idx_authority_contents_property_id on public.authority_contents(property_id);
create index if not exists idx_authority_defense_actions_threat_id on public.authority_defense_actions(threat_id);
create index if not exists idx_campaign_sends_user_id on public.campaign_sends(user_id);
create index if not exists idx_commissions_user_id on public.commissions(user_id);
create index if not exists idx_contact_dossiers_user_id on public.contact_dossiers(user_id);
create index if not exists idx_contact_negotiations_user_id on public.contact_negotiations(user_id);
create index if not exists idx_cross_influence_user_id on public.cross_influence(user_id);
create index if not exists idx_goat_habit_logs_habit_id on public.goat_habit_logs(habit_id);
create index if not exists idx_hidden_connections_user_id on public.hidden_connections(user_id);
create index if not exists idx_link_clicks_link_id on public.link_clicks(link_id);
create index if not exists idx_reciprocity_ledger_contact_id on public.reciprocity_ledger(contact_id);
create index if not exists idx_sales_blocks_user_id on public.sales_blocks(user_id);