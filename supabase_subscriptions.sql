create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'inactive',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

-- 自分のサブスク状態だけ読める
create policy "read own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- サービスロールキー（バックエンド）だけ書き込める
create policy "service role write" on subscriptions
  for all using (auth.role() = 'service_role');
