-- anon に categories の SELECT だけを戻す。
--
-- 背景:
--   0012 で anon から全テーブルの権限を外したところ、本番のホームが 500 になった（2026-10-15 に発覚）。
--   lib/queries.ts の getCommonCategories は、共通カテゴリ（user_id is null）を unstable_cache に乗せるため、
--   cookie に依存しない匿名クライアント（lib/supabase/anon.ts）で読む。
--   このクライアントは anon で問い合わせるので、0012 のあと「permission denied for table categories」（42501）で落ちていた。
--   0012 の「影響」節は、ログイン後の画面にもこの anon の経路があることを見落としていた。
--
-- 方針:
--   - anon へ戻すのは categories の SELECT だけ。書き込みと他のテーブルは 0012 のまま外しておく。
--   - どの行を読めるかは categories_select ポリシー（0001）が決める＝user_id is null の共通カテゴリだけ。
--     anon は auth.uid() が null なので、ユーザー定義のカテゴリは読めない。
--   - 2026-10-15 に本番で実測した＝公開キーで categories の共通行 24件が HTTP 200、
--     ユーザー定義の行は 0件、transactions は 42501（HTTP 401）。
--
-- 冪等性: GRANT は同じ権限を重ねても増えないので、既に SQL Editor で当てた本番へ流しても影響しない。

grant select on public.categories to anon;
