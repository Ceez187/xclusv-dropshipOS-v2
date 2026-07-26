alter table user_usage enable row level security;
drop policy if exists "own row only" on user_usage;
create policy "own row only" on user_usage for select using (auth.uid() = user_id);
