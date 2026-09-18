-- Create profiles automatically when a Supabase Auth user is created.
-- This keeps signup working when email confirmation is enabled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
begin
  desired_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  if desired_username = '' then
    desired_username := 'user_' || replace(substr(new.id::text, 1, 8), '-', '');
  end if;

  begin
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      desired_username,
      coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), desired_username)
    )
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      'user_' || replace(substr(new.id::text, 1, 12), '-', ''),
      coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), desired_username)
    )
    on conflict (id) do nothing;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;