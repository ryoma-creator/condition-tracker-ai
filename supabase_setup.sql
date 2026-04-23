-- 既存のentriesテーブルは触らない。新しいテーブルを作る。
create table condition_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),

  -- 日付（過去の日付も入力可）
  date date not null default current_date,

  -- 睡眠
  bed_time text,
  wake_time text,
  sleep_hours numeric,
  sleep_quality int check (sleep_quality between 1 and 5),

  -- コンディション
  fatigue int check (fatigue between 1 and 5),
  focus int check (focus between 1 and 5),
  cold_shower boolean default false,

  -- 運動（種類ごとに時間を記録）
  -- 例: [{"type": "筋トレ", "minutes": 45}, {"type": "ウォーキング", "minutes": 30}]
  exercise_logs jsonb default '[]',

  -- 食事（朝・昼・夜）
  -- 例: {"breakfast": "良い", "lunch": "普通", "dinner": "悪い"}
  meals jsonb default '{}',

  -- サプリ・薬
  -- 例: ["プロテイン", "マグネシウム", "SleepWell"]
  supplements text[] default '{}',

  memo text
);

-- 自分のデータしか見れないようにする
alter table condition_logs enable row level security;

create policy "own data only" on condition_logs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
