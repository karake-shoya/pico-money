-- テーブル権限（GRANT）の明示。
--
-- 背景:
--   0001〜0010 は GRANT を1つも宣言せず、Supabase の既定の権限付与に依存していた。
--   新しい Supabase ではその既定が変わり、anon / authenticated / service_role に
--   SELECT・INSERT・UPDATE・DELETE が付かない（既定は Dxtm = TRUNCATE/REFERENCES/TRIGGER/MAINTAIN のみ）。
--   結果、この migration を新規プロジェクトや新しいローカルスタックへ当てると、
--   RLS 以前に「permission denied for table ...」で全テーブルが読めない。
--
-- 方針:
--   - authenticated : 画面からの読み書き。どの行を触れるかは RLS が決める。
--   - service_role  : Edge Function 3本（send-reminders / send-monthly-report / village-summary）。
--   - anon          : 付与しない。ログイン前に public のテーブルを読む経路が無い。
--                     ⚠ categories の select ポリシーは user_id is null を許すため、
--                       anon へ付けると未ログインでも共通カテゴリ一覧が読める。
--
-- 冪等性: GRANT は同じ権限を重ねても増えないので、既存の本番へ当てても影響しない。
--
-- ⚠ 今後テーブルを足したら、その migration にも GRANT を書く。
--    ALTER DEFAULT PRIVILEGES は「どのロールが作ったか」に依存して効いたり効かなかったりするので使わない。

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.categories            to authenticated, service_role;
grant select, insert, update, delete on public.transactions          to authenticated, service_role;
grant select, insert, update, delete on public.budgets               to authenticated, service_role;
grant select, insert, update, delete on public.recurring_transactions to authenticated, service_role;
grant select, insert, update, delete on public.push_subscriptions    to authenticated, service_role;
grant select, insert, update, delete on public.savings_goals         to authenticated, service_role;
