-- 支出カテゴリの並び替えと「住居費」「未分類」の追加。
-- 共通デフォルト（user_id IS NULL / is_default = true）が対象。
--
-- 既存DBでは過去の編集により sort_order が連番でない・順序がずれている場合があるため、
-- 相対更新ではなく「名前ごとに絶対値を割り当てる」方式にする。
-- これにより現行DBの値に依存せず、新規インストール（0001→0006）でも同じ最終順序になる。
--
-- 最終的な支出の並び:
--   食費 交通費 光熱費 住居費 通信費 娯楽 副業経費 現金・カード 税金 保険 その他支出 未分類

-- 既存デフォルト（支出）の sort_order を絶対値で再設定する。
update public.categories set sort_order = 1  where user_id is null and type = 'expense' and name = '食費';
update public.categories set sort_order = 2  where user_id is null and type = 'expense' and name = '交通費';
update public.categories set sort_order = 3  where user_id is null and type = 'expense' and name = '光熱費';
update public.categories set sort_order = 5  where user_id is null and type = 'expense' and name = '通信費';
update public.categories set sort_order = 6  where user_id is null and type = 'expense' and name = '娯楽';
update public.categories set sort_order = 7  where user_id is null and type = 'expense' and name = '副業経費';
update public.categories set sort_order = 8  where user_id is null and type = 'expense' and name = '現金・カード';
update public.categories set sort_order = 9  where user_id is null and type = 'expense' and name = '税金';
update public.categories set sort_order = 10 where user_id is null and type = 'expense' and name = '保険';
update public.categories set sort_order = 11 where user_id is null and type = 'expense' and name = 'その他支出';

-- 追加（共通デフォルト）。住居費は家賃・住宅ローン用（sort_order=4）、
-- 未分類はレシート読み取りの受け皿（支出末尾 sort_order=12）。
-- categories_default_unique により再実行しても重複しない。
insert into public.categories (user_id, name, type, icon, sort_order, is_default) values
  (null, '住居費', 'expense', '🏠', 4,  true),
  (null, '未分類', 'expense', '❓', 12, true)
on conflict do nothing;
