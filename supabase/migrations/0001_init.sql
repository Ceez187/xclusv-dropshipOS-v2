create table if not exists user_usage (
  user_id uuid references auth.users(id) primary key,
  tier text default 'limited',
  actions_used int default 0,
  actions_limit int default 50,
  rapidapi_calls_used int default 0,
  rapidapi_calls_limit int default 30,
  period_start date default current_date,
  updated_at timestamp default now()
);

create table if not exists vendors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text,
  contact_method text, -- whatsapp, wechat, facebook, email
  contact_value text,
  notes text,
  created_at timestamp default now()
);

create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  vendor_id uuid references vendors(id),
  product_name text,
  status text default 'sourcing', -- sourcing, ordered, basetao_received, shipped, delivered, cancelled
  source_cost numeric,
  sell_price numeric,
  customer_name text,
  tracking_notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text,
  email text,
  total_orders int default 0,
  ltv numeric default 0,
  is_repeat boolean default false,
  notes text,
  created_at timestamp default now()
);

create table if not exists saved_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  kind text, -- 'listing', 'pricing_profile', 'sourcing_history'
  data jsonb,
  created_at timestamp default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_usage (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table vendors enable row level security;
alter table orders enable row level security;
alter table customers enable row level security;
alter table saved_items enable row level security;

drop policy if exists "own rows only" on vendors;
create policy "own rows only" on vendors for all using (auth.uid() = user_id);

drop policy if exists "own rows only" on orders;
create policy "own rows only" on orders for all using (auth.uid() = user_id);

drop policy if exists "own rows only" on customers;
create policy "own rows only" on customers for all using (auth.uid() = user_id);

drop policy if exists "own rows only" on saved_items;
create policy "own rows only" on saved_items for all using (auth.uid() = user_id);
