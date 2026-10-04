-- anon（未ログイン）からテーブル権限を外す。
--
-- 背景:
--   0011 は「anon には付与しない」方針だが、既存の本番には Supabase の既定の権限付与が残り、
--   anon が6テーブル全てに SELECT・INSERT・UPDATE・DELETE・TRUNCATE・REFERENCES・TRIGGER を持っていた。
--   行は RLS が守っているが、守りが RLS の一枚だけになる。
--   ⚠ TRUNCATE には RLS が効かない。anon が TRUNCATE を発行できる経路は今は無いが、権限ごと外す。
--
-- 影響:
--   未ログインで開けるのは /login だけで、そこはテーブルを読まない（lib/supabase/middleware.ts）。
--   画面は authenticated、Edge Function は service_role で動くので、この revoke の影響を受けない。
--   未ログインで共通カテゴリ（user_id is null）が読めていた状態は、これで無くなる。
--
-- 冪等性: 付いていない権限を revoke してもエラーにならないので、新しいプロジェクトへ当てても安全。
--
-- ⚠ 本番の既定権限（pg_default_acl）では、postgres が public に作ったテーブルへ anon の全権限が自動で付く。
--    今後テーブルを足したら、その migration にも anon からの revoke を書く。
--    ALTER DEFAULT PRIVILEGES を使わない理由は 0011 と同じ。

revoke all on public.categories             from anon;
revoke all on public.transactions           from anon;
revoke all on public.budgets                from anon;
revoke all on public.recurring_transactions from anon;
revoke all on public.push_subscriptions     from anon;
revoke all on public.savings_goals          from anon;
