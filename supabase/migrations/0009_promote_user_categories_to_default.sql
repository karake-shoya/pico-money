-- これまでユーザー定義（user_id 付き / is_default = false）として作られていた支出カテゴリを
-- 全員共通デフォルト（user_id IS NULL / is_default = true）へ昇格する。
--
-- 対象: 日用品 / 交際費 / 衣服・美容 / 健康・医療 / 教養・教育 / 特別な支出
--   （レシート取込などで個別に作成されていたもの）
--
-- 方針（0006 と同じ「名前ごとに絶対値を割り当てる」方式）:
--   1. 既存DB: 上記名のユーザー定義カテゴリを user_id = NULL / is_default = true に昇格する。
--   2. 新規インストール: 上記が存在しないため、共通デフォルトとして seed する。
--      categories_default_unique（type, name / user_id is null）により、
--      昇格済みのDBでは on conflict do nothing で重複しない。
--   3. 支出デフォルト全体の sort_order を絶対値で再設定し、統合後の並びを安定させる。
--
-- 注意: 1 はシングルユーザー運用を前提に name で対象を特定する。
--       同名のユーザー定義が複数ユーザーに存在する環境では unique 制約に抵触し得る。

-- 1. 既存のユーザー定義カテゴリを共通デフォルトへ昇格
update public.categories
set user_id = null, is_default = true
where user_id is not null
  and type = 'expense'
  and name in ('日用品', '交際費', '衣服・美容', '健康・医療', '教養・教育', '特別な支出');

-- 2. 新規インストール向け seed（昇格済みDBでは重複しない）
insert into public.categories (user_id, name, type, icon, sort_order, is_default) values
  (null, '日用品',     'expense', '🧴', 2,  true),
  (null, '交際費',     'expense', '🍻', 8,  true),
  (null, '衣服・美容', 'expense', '👕', 9,  true),
  (null, '健康・医療', 'expense', '🏥', 10, true),
  (null, '教養・教育', 'expense', '📚', 11, true),
  (null, '特別な支出', 'expense', '✨', 16, true)
on conflict do nothing;

-- 3. 支出デフォルトの並び（sort_order）を絶対値で再設定
--   食費 日用品 交通費 光熱費 住居費 通信費 娯楽 交際費 衣服・美容 健康・医療
--   教養・教育 副業経費 現金・カード 税金 保険 特別な支出 その他支出 未分類
update public.categories set sort_order = 1  where user_id is null and type = 'expense' and name = '食費';
update public.categories set sort_order = 2  where user_id is null and type = 'expense' and name = '日用品';
update public.categories set sort_order = 3  where user_id is null and type = 'expense' and name = '交通費';
update public.categories set sort_order = 4  where user_id is null and type = 'expense' and name = '光熱費';
update public.categories set sort_order = 5  where user_id is null and type = 'expense' and name = '住居費';
update public.categories set sort_order = 6  where user_id is null and type = 'expense' and name = '通信費';
update public.categories set sort_order = 7  where user_id is null and type = 'expense' and name = '娯楽';
update public.categories set sort_order = 8  where user_id is null and type = 'expense' and name = '交際費';
update public.categories set sort_order = 9  where user_id is null and type = 'expense' and name = '衣服・美容';
update public.categories set sort_order = 10 where user_id is null and type = 'expense' and name = '健康・医療';
update public.categories set sort_order = 11 where user_id is null and type = 'expense' and name = '教養・教育';
update public.categories set sort_order = 12 where user_id is null and type = 'expense' and name = '副業経費';
update public.categories set sort_order = 13 where user_id is null and type = 'expense' and name = '現金・カード';
update public.categories set sort_order = 14 where user_id is null and type = 'expense' and name = '税金';
update public.categories set sort_order = 15 where user_id is null and type = 'expense' and name = '保険';
update public.categories set sort_order = 16 where user_id is null and type = 'expense' and name = '特別な支出';
update public.categories set sort_order = 17 where user_id is null and type = 'expense' and name = 'その他支出';
update public.categories set sort_order = 18 where user_id is null and type = 'expense' and name = '未分類';
