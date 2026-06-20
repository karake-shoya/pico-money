-- 月次振り返りレポート（Web Push）用のカラムを push_subscriptions に追加。
-- 記録忘れリマインダーとは独立に ON/OFF できるトグル＋月次重複配信の抑止。

alter table public.push_subscriptions
  -- 月初の振り返りレポートを通知するか（リマインダーとは独立）
  add column if not exists monthly_report_enabled boolean not null default true,
  -- 月次レポートを最後に送った対象月（'YYYY-MM'）。同月の重複配信を防ぐ。
  add column if not exists last_report_month text;
