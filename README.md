# Pico Money（ピコマネー）

「自分の収支だけをシンプルに把握する」ことに振り切った、ミニマルでモバイルファーストな家計簿 PWA です。

## 特徴

- 収支サマリー（収入・支出・差額・貯蓄率）と支出率ゲージ
- 月セレクタによる月切り替え（全画面で同じ月を共有）
- 明細リスト（日付降順 / タップで編集 / 左スワイプ・ボタンで削除）
- 明細の検索・絞り込み（メモ・カテゴリ名のテキスト検索 / カテゴリチップ絞り込みと併用 / カテゴリチップは支出・収入で行分け表示）
- 取引の横断検索（`/search`・全期間対象 / キーワード・種別・カテゴリ・期間・金額レンジで絞り込み / 月セレクタに非連動）
- FAB（＋・右下）からのボトムシートで取引を登録・編集（支出/収入はタブ切替）
- レシート読み取り（入力画面 左上のカメラ）：撮影画像を Claude（Sonnet 4.6）が解析し、金額・日付・カテゴリを取引フォームへ自動入力（メモには店名が読み取れた場合のみ反映。商品名は読み取らない。確認・編集してから保存。画像は保存しない）
- 金額入力は電卓パネル（数値＋四則演算、確定時に整数へ丸め）
- グラフ：カテゴリ別ドーナツ（収入・支出切替 / 横スワイプで月移動）
- 月次推移グラフ（直近6ヶ月の収入・支出を棒、収支を折れ線で表示 / 棒タップでその月へ移動）
- カテゴリ別の月予算（毎月共通）と消化率バー・全体予算ゲージ。当月は支出ペースから月末の着地額・予算超過の見込みを表示（日割り予測）
- 固定費の自動登録（家賃・サブスク等のテンプレートを登録→毎月アプリ起動時に自動生成）
- 目標貯金（`/goals`・ホームの「目標貯金」から）：目標（名前・目標額・任意の期限）を登録し、各目標の「貯金する」から**支出として貯金**（残高は減るが、支出総額・円グラフ・貯蓄率には含めない＝振替扱い）。進捗バー・達成率・残額を表示
- 振り返りレポート（`/report`・ホーム下部の「振り返りを見る」から）：収支・前期比（前月比/前週比）・支出トップ・予算超過カテゴリ（月次のみ）をまとめて表示。週次／月次をタブで切替（週次は今週・月次は先月が既定。前/次で期間移動）
- 月次レポートのプッシュ通知：毎月初めに先月の振り返りを Web Push で配信。Service Worker＋Supabase Edge Function（`send-monthly-report`）＋pg_cron。設定→「記録忘れリマインダー」内の「月次レポートを通知」で ON/OFF（記録忘れリマインダーとは独立。リマインダー有効時のみ操作可）
- 記録忘れリマインダー（Web Push）：毎日指定時刻に、その日まだ記録が無ければ通知。Service Worker＋Supabase Edge Function（`send-reminders`）＋pg_cron で配信（設定→「記録忘れリマインダー」で時刻設定・ON/OFF）
- CSV入出力（Money Forward互換フォーマット）：月別エクスポート・一括インポート対応
- カテゴリごとの固有色アイコン（明細・グラフ・登録フォームで一目で判別）
- ダークテーマ（既定）
- Supabase Auth によるメール＋パスワード認証、全データを RLS で保護
- PWA 対応（ホーム画面に追加可能）

## 技術スタック

- Next.js 16（App Router / Turbopack）+ TypeScript
- Tailwind CSS v4
- Supabase（Auth + Postgres + RLS）
- recharts（グラフ）
- Anthropic Claude（`@anthropic-ai/sdk` / Sonnet 4.6・レシート読み取り）
- デプロイ先: Vercel

## セットアップ

### 1. 依存パッケージ

```bash
npm install
```

### 2. Supabase プロジェクトの準備

1. [Supabase](https://supabase.com/) でプロジェクトを作成。
2. SQL Editor で `supabase/migrations/` 配下を番号順（`0001` → `0006`）に実行
   （テーブル・RLS・デフォルトカテゴリ seed が投入されます）。
3. Authentication → Providers で Email を有効化。
   - ローカル検証を手早く行いたい場合は「Confirm email」をオフにすると、
     サインアップ直後にそのままログイン状態になります。

### 3. 環境変数

`.env.local.example` を `.env.local` にコピーして値を設定します。
値は Supabase ダッシュボードの Project Settings → API から取得できます。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
# レシート読み取りに使用（サーバー専用・クライアントには露出しない）。未設定でも他機能は動作します。
ANTHROPIC_API_KEY=sk-ant-xxxx
# 記録忘れリマインダー（Web Push）の購読に使用する VAPID 公開鍵。
# `npx web-push generate-vapid-keys` で生成。未設定なら通知トグルは無効表示になります。
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BB...（公開鍵）
```

### 4. 開発サーバー

```bash
npm run dev
```

http://localhost:3000 を開きます。未ログインの場合は `/login` に誘導されます。

## デプロイ（Vercel）

1. リポジトリを Vercel にインポート。
2. 環境変数 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定。
3. デプロイ後、Supabase の Authentication → URL Configuration に本番 URL を登録。

## 記録忘れリマインダー（Web Push）のセットアップ

通知はバックグラウンドのプッシュで届くため、クライアント・サーバー双方の設定が必要です。

1. **VAPID 鍵を生成**：`npx web-push generate-vapid-keys`（公開鍵・秘密鍵のペア）。
2. **Next（Vercel）側**：`NEXT_PUBLIC_VAPID_PUBLIC_KEY` に公開鍵を設定。
3. **Supabase Edge Function をデプロイ**：`supabase functions deploy send-reminders`。
   secrets を設定：
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`（生成した鍵）
   - `VAPID_SUBJECT`（例 `mailto:you@example.com`）
   - `REMINDER_FUNCTION_SECRET`（任意のランダム文字列。cron からの呼び出し検証用）
4. **migration を適用**：`supabase/migrations/0007_push_subscriptions.sql`
   （`push_subscriptions` テーブル＋`pg_cron`/`pg_net` 拡張を作成）。
5. **pg_cron を登録**：30分毎に Edge Function を叩く。URL とシークレットは Vault に保存して参照する。
   ```sql
   -- Vault に保存（一度だけ）
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-reminders', 'reminder_function_url');
   select vault.create_secret('<REMINDER_FUNCTION_SECRET と同じ値>', 'reminder_function_secret');

   -- 30分毎に未記録ユーザーへ通知
   select cron.schedule('send-reminders', '*/30 * * * *', $$
     select net.http_post(
       url     := (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_function_url'),
       headers := jsonb_build_object(
         'content-type', 'application/json',
         'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_function_secret')
       ),
       body    := '{}'::jsonb
     );
   $$);
   ```

> iOS / iPadOS は 16.4 以上かつ「ホーム画面に追加」した PWA でのみ Web Push が動作します。
> 配信タイミングはプッシュサービスの都合で前後することがあります（OS のアラームほど厳密ではありません）。

## 月次レポート通知（Web Push）のセットアップ

記録忘れリマインダーと VAPID 鍵・secrets を共有します（追加の secrets は不要）。

1. **migration を適用**：`supabase/migrations/0008_monthly_report.sql`
   （`push_subscriptions` に `monthly_report_enabled` / `last_report_month` を追加）。
2. **Edge Function をデプロイ**：`supabase functions deploy send-monthly-report`。
3. **pg_cron を登録**：毎日 1 回叩けば十分（同月の重複送信は `last_report_month` が抑止）。
   URL を Vault に保存し、シークレットはリマインダーと共通のものを使う。
   ```sql
   -- Vault に保存（一度だけ）
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-monthly-report', 'monthly_report_function_url');

   -- 毎日 JST 08:00（UTC 23:00）に実行。先月の取引があり未送信のユーザーへ配信。
   select cron.schedule('send-monthly-report', '0 23 * * *', $$
     select net.http_post(
       url     := (select decrypted_secret from vault.decrypted_secrets where name = 'monthly_report_function_url'),
       headers := jsonb_build_object(
         'content-type', 'application/json',
         'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_function_secret')
       ),
       body    := '{}'::jsonb
     );
   $$);
   ```

> 週次レポートは画面（`/report` の「週次」タブ）でのみ確認でき、プッシュ通知は行いません。

## 村（poporu-village）への集計提供

家計の可視化のために、外部（ポポルの村）から**集計値だけ**を読み出す Edge Function `village-summary` を用意しています。

**返すのは合計額と件数だけです。** 取引明細・カテゴリ名・メモ・目標名・目標 id は返しません。シークレットが漏れても出るのは合計額で、いつ何を買ったかは出ません。

1. **Edge Function をデプロイ**：`supabase functions deploy village-summary`。
   （呼び出し元は Supabase のセッションを持たないため、JWT 検証は `supabase/config.toml` の
   `[functions.village-summary] verify_jwt = false` で無効にし、認証は下記のシークレットヘッダで行います）
2. **secrets を設定**：
   - `VILLAGE_FUNCTION_SECRET`：任意のランダム文字列。リマインダー用とは**別の値**にします。
   - `VILLAGE_USER_ID`：集計対象のユーザー ID。未設定なら 500 で停止します（service role は RLS を迂回するため、全ユーザーを合計する経路は作りません）。
     ```sql
     select id from auth.users where email = 'you@example.com';
     ```
3. **呼び出し**（GET のみ。他のメソッドは 405）：
   ```bash
   curl -H "x-village-secret: $VILLAGE_FUNCTION_SECRET" \
     https://<project-ref>.supabase.co/functions/v1/village-summary
   ```

返す内容：

| キー | 中身 |
|---|---|
| `record` | 記録した日数・月数、直近30日の記録日数、最終記録日 |
| `monthly` | 直近12ヶ月の収入・消費支出・貯金（古い順） |
| `budget` | 当月の予算合計と消費支出、予算内に収めた月数 / 判定できた月数 |
| `savings` | 貯蓄目標の件数・目標額合計・貯金済み合計 |

集計の判断は `supabase/functions/_shared/` の純粋関数に置き、`tests/village-summary.test.ts` と `tests/village-guard.test.ts` で固定しています（Deno 側の `index.ts` は取得と受け渡しだけを行います）。予算や目標が未設定なら分母は `0` を返し、達成率を偽装しません。

デプロイ後の動作確認：

```bash
npm run check:village
```

ガード（401 / 405）とレスポンスの契約を21項目検証します。**金額は表示せず、合否・日付・件数だけを出す**ので、出力をそのまま共有できます。シークレットは隠し入力で受け取り、エンドポイント以外へ送りません（`VILLAGE_FUNCTION_SECRET` を環境変数で渡すことも可能）。

## ディレクトリ構成

```
app/
  (main)/            認証済みアプリ（共有レイアウト：ヘッダー・FAB・下部ナビ）
    page.tsx         ホーム（収支サマリー）
    transactions/    明細リスト
    search/          取引の横断検索（全期間）
    goals/           目標貯金（進捗・貯金する導線）
    charts/          グラフ
    recurring/       固定費管理
    settings/        カテゴリ管理・記録忘れリマインダー設定
  login/             認証画面
  manifest.ts        PWA マニフェスト
components/          UI コンポーネント
lib/
  supabase/          Supabase クライアント（client / server / セッション更新）
  actions/           Server Actions（認証 / 取引 CRUD / レシート読み取り）
  queries.ts         サーバー側データ取得・集計
  csv.ts             CSV入出力（Money Forward互換）
  format.ts          表示・日付ユーティリティ
proxy.ts             セッション更新と未ログイン時リダイレクト（Next.js 16 の middleware 後継）
supabase/migrations/ DB スキーマ・RLS・seed（SQL）
supabase/functions/  Edge Function（send-reminders / send-monthly-report：Web Push 送信、village-summary：村への集計提供）
supabase/functions/_shared/ Edge Function 共通の純粋関数（vitest でテスト）
public/sw.js         Service Worker（Web Push 受信・通知表示）
scripts/gen-icons.mjs PWA アイコン生成（依存なし）
```

## データモデル

- `categories`：カテゴリマスタ。`user_id IS NULL` が全員共通デフォルト、値ありがユーザー定義。
- `transactions`：取引。1取引 = 1カテゴリ、金額は日本円・正の整数のみ。
- `budgets`：カテゴリ別の月予算（毎月共通）。1ユーザー × 1カテゴリ = 1件、金額は正の整数。
- `recurring_transactions`：固定費テンプレート。毎月の日付（1-31）・金額・カテゴリを登録。`enabled` で一時停止可能。
- `transactions.recurring_id`：自動生成された取引とテンプレートの紐付け。テンプレート削除時は SET NULL。
- `savings_goals`：貯金の目標（名前・目標額・任意の期限）。本人のみ読み書き可能。
- `transactions.goal_id`：目標への貯金（振替）の紐付け。専用「貯金」カテゴリ・`type='expense'` で記録する。目標削除時は SET NULL（取引は履歴として残る）。
- RLS により、取引・予算・固定費・目標は `auth.uid()` 本人のみ読み書き可能。カテゴリは「共通＋自分定義」が閲覧でき、編集は自分定義のみ。

### 貯金（目標）の集計方針

目標への貯金は「振替」として扱い、消費とは分離する。`goal_id` 付きの支出は、
**残高（使えるお金）からは差し引く**が、**支出総額・円グラフ・貯蓄率には含めない**
（貯蓄率は `(収入 − 消費支出) / 収入` で算出し、貯金しても下がらない）。
一方、入出金の明細リスト・検索は生の台帳としてそのまま表示する（貯金行も支出行として見える・編集/削除可）。

## MVP に含めないもの（将来対応）

銀行/カード連携、口座振替、レシート明細の複数行取り込み
（現状は合計1件の取り込み）。
