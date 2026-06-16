-- Pico Money 初期スキーマ
-- categories（カテゴリマスタ）/ transactions（取引）/ RLS / デフォルトカテゴリseed
-- 全データは auth.uid() に紐付け、自分のデータのみ読み書き可能とする。

-- =============================================================
-- categories: カテゴリマスタ
--   user_id IS NULL = 全員共通デフォルト, 値あり = ユーザー定義
-- =============================================================
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,        -- NULL = 共通デフォルト
  name       text not null,
  type       text not null check (type in ('income', 'expense')),
  icon       text,                                                     -- 絵文字想定
  sort_order int  not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 共通デフォルトカテゴリ（user_id IS NULL）の重複seedを防ぐ
create unique index if not exists categories_default_unique
  on public.categories (type, name)
  where user_id is null;

-- =============================================================
-- transactions: 取引（1取引 = 1カテゴリ）
-- =============================================================
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  type        text not null check (type in ('income', 'expense')),
  category_id uuid not null references public.categories (id),
  amount      integer not null check (amount > 0),                     -- 日本円・整数のみ
  memo        text,
  created_at  timestamptz not null default now()
);

-- 月フィルタ・日付降順表示を高速化
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- =============================================================
-- RLS（Row Level Security）
-- =============================================================
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

-- categories: SELECT は共通＋自分定義が見える
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select
  using (user_id is null or user_id = auth.uid());

-- categories: INSERT/UPDATE/DELETE は自分定義のみ（デフォルトは編集不可）
drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert
  with check (user_id = auth.uid());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete
  using (user_id = auth.uid());

-- transactions: SELECT/INSERT/UPDATE/DELETE すべて自分のデータのみ
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select
  using (user_id = auth.uid());

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
  for insert
  with check (user_id = auth.uid());

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
  for delete
  using (user_id = auth.uid());

-- =============================================================
-- デフォルトカテゴリ seed（user_id = NULL / is_default = true）
--   将来のユーザー定義カテゴリは user_id 付きで INSERT する想定。
-- =============================================================
insert into public.categories (user_id, name, type, icon, sort_order, is_default) values
  -- 収入
  (null, '給与',     'income',  '💼', 1, true),
  (null, '副業',     'income',  '💻', 2, true),
  (null, 'ボーナス', 'income',  '🎁', 3, true),
  (null, '投資',     'income',  '📈', 4, true),
  (null, 'その他収入', 'income', '💰', 5, true),
  -- 支出
  (null, '食費',     'expense', '🍜', 1, true),
  (null, '交通費',   'expense', '🚃', 2, true),
  (null, '光熱費',   'expense', '💡', 3, true),
  (null, '通信費',   'expense', '📱', 4, true),
  (null, '娯楽',     'expense', '🎮', 5, true),
  (null, '副業経費', 'expense', '🧾', 6, true),
  (null, 'その他支出', 'expense', '💸', 7, true)
on conflict do nothing;
