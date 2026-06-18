-- recurring_transactions: 固定費テンプレート（毎月自動生成する取引の雛形）
-- 1ユーザーが複数の固定費を登録可能。enabled=false で一時停止。

create table if not exists public.recurring_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  category_id uuid not null references public.categories (id),
  amount      integer not null check (amount > 0),
  memo        text,
  day         integer not null check (day between 1 and 31),
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists recurring_transactions_user_id_idx
  on public.recurring_transactions (user_id);

create index if not exists recurring_transactions_category_id_idx
  on public.recurring_transactions (category_id);

-- transactions に recurring_id を追加（自動生成された取引とテンプレートの紐付け）
alter table public.transactions
  add column if not exists recurring_id uuid references public.recurring_transactions (id) on delete set null;

create index if not exists transactions_recurring_id_idx
  on public.transactions (recurring_id);

-- =============================================================
-- RLS（本人の行のみ読み書き可能）
-- =============================================================
alter table public.recurring_transactions enable row level security;

drop policy if exists recurring_transactions_select on public.recurring_transactions;
create policy recurring_transactions_select on public.recurring_transactions
  for select
  using (user_id = (select auth.uid()));

drop policy if exists recurring_transactions_insert on public.recurring_transactions;
create policy recurring_transactions_insert on public.recurring_transactions
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists recurring_transactions_update on public.recurring_transactions;
create policy recurring_transactions_update on public.recurring_transactions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists recurring_transactions_delete on public.recurring_transactions;
create policy recurring_transactions_delete on public.recurring_transactions
  for delete
  using (user_id = (select auth.uid()));
