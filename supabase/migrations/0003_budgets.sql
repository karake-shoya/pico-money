-- budgets: カテゴリ別の月予算（毎月共通の繰り返し予算。月カラムは持たない）
-- 1ユーザー × 1カテゴリ = 1予算。amount は正の整数（円）。

create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount      integer not null check (amount > 0),                     -- 日本円・整数のみ
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1ユーザー × 1カテゴリにつき予算は1件
create unique index if not exists budgets_user_category_unique
  on public.budgets (user_id, category_id);

-- FK（user_id）のカバリングインデックス（DB linter: unindexed_foreign_keys 対応）
create index if not exists budgets_user_id_idx
  on public.budgets (user_id);

-- FK（category_id）のカバリングインデックス
create index if not exists budgets_category_id_idx
  on public.budgets (category_id);

-- =============================================================
-- RLS（本人の行のみ読み書き可能）
-- =============================================================
alter table public.budgets enable row level security;

drop policy if exists budgets_select on public.budgets;
create policy budgets_select on public.budgets
  for select
  using (user_id = (select auth.uid()));

drop policy if exists budgets_insert on public.budgets;
create policy budgets_insert on public.budgets
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists budgets_update on public.budgets;
create policy budgets_update on public.budgets
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists budgets_delete on public.budgets;
create policy budgets_delete on public.budgets
  for delete
  using (user_id = (select auth.uid()));
