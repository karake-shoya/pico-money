-- 支出カテゴリの追加（現金・カード / 税金 / 保険）
-- 共通デフォルト（user_id IS NULL / is_default = true）として追加する。
-- categories_default_unique により再実行しても重複しない。

insert into public.categories (user_id, name, type, icon, sort_order, is_default) values
  (null, '現金・カード', 'expense', '💳', 8,  true),
  (null, '税金',        'expense', '🏛️', 9,  true),
  (null, '保険',        'expense', '🛡️', 10, true)
on conflict do nothing;
