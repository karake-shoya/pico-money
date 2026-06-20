-- push_subscriptions: Web Push の購読情報（記録忘れリマインダー用）
-- 1ブラウザ（endpoint）= 1行。同一ユーザーが複数端末を持てる。
-- 通知の実送信は Edge Function（send-reminders）が service role で行い RLS をバイパスする。

-- 定期実行（pg_cron）と Edge Function 呼び出し（pg_net）に使用
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  endpoint           text not null unique,                              -- Push サービスの宛先（ブラウザ毎に一意）
  p256dh             text not null,                                     -- 公開鍵（暗号化用）
  auth               text not null,                                     -- 認証シークレット
  reminder_time      time not null default '21:00',                     -- 通知したいローカル時刻（JST 解釈）
  enabled            boolean not null default true,
  last_notified_date date,                                             -- 当日重複送信の抑止
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- FK（user_id）のカバリングインデックス（DB linter: unindexed_foreign_keys 対応）
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- =============================================================
-- RLS（本人の行のみ読み書き可能）。Edge Function は service role で別途アクセス。
-- =============================================================
alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select
  using (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete
  using (user_id = (select auth.uid()));
