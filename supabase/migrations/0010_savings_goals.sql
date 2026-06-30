-- 目標貯金（セービングゴール）。
-- 「貯金」は通常の消費支出ではなく『振替』として扱う:
--   貯金は type='expense' / 専用カテゴリ「貯金」/ goal_id 付きの取引として記録する。
--   集計側（lib/summary.ts ほか）では goal_id 付きの支出を消費から分離し、
--   残高は減らすが支出総額・貯蓄率・円グラフには含めない。

-- =============================================================
-- savings_goals: 貯金の目標（本人ごと）
-- =============================================================
create table if not exists public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  target_amount integer not null check (target_amount > 0),              -- 日本円・整数のみ
  deadline      date,                                                    -- 任意（期限）
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- FK（user_id）のカバリングインデックス（DB linter: unindexed_foreign_keys 対応）
create index if not exists savings_goals_user_id_idx
  on public.savings_goals (user_id);

-- =============================================================
-- transactions.goal_id: 貯金取引が紐づく目標（NULL = 通常の取引）
--   FK は on delete set null（取りこぼし時の安全弁）だが、
--   アプリの deleteGoal では紐づく貯金取引も明示的に削除する
--   （goal_id だけ外れて過去の貯金が消費支出に再分類されるのを防ぐため）。
-- =============================================================
alter table public.transactions
  add column if not exists goal_id uuid references public.savings_goals (id) on delete set null;

create index if not exists transactions_goal_id_idx
  on public.transactions (goal_id);

-- =============================================================
-- RLS（本人の行のみ読み書き可能。budgets と同型）
-- =============================================================
alter table public.savings_goals enable row level security;

drop policy if exists savings_goals_select on public.savings_goals;
create policy savings_goals_select on public.savings_goals
  for select
  using (user_id = (select auth.uid()));

drop policy if exists savings_goals_insert on public.savings_goals;
create policy savings_goals_insert on public.savings_goals
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists savings_goals_update on public.savings_goals;
create policy savings_goals_update on public.savings_goals
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists savings_goals_delete on public.savings_goals;
create policy savings_goals_delete on public.savings_goals
  for delete
  using (user_id = (select auth.uid()));

-- =============================================================
-- 共通デフォルト支出カテゴリ「貯金」💰 を追加（goal 貯金の受け皿）。
-- categories_default_unique（type, name / user_id is null）により再実行しても重複しない。
-- sort_order は末尾付近（「未分類」=18 の手前=17.5 ではなく 19 とし末尾へ）。
-- =============================================================
insert into public.categories (user_id, name, type, icon, sort_order, is_default) values
  (null, '貯金', 'expense', '🐖', 19, true)
on conflict do nothing;
