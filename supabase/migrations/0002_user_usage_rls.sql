alter table user_usage enable row level security;
create policy "own row only" on user_usage for select using (auth.uid() = user_id);
