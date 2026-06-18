-- recurring_transactions に last_generated_month を追加。
-- 取引削除後の再生成を防ぐため、transactions テーブルではなくテンプレート側で生成済み月を追跡する。
alter table public.recurring_transactions
  add column if not exists last_generated_month text;
