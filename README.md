# Pico Money（ピコマネー）

「自分の収支だけをシンプルに把握する」ことに振り切った、ミニマルでモバイルファーストな家計簿 PWA です。

## 特徴

- 収支サマリー（収入・支出・差額・貯蓄率）と支出率ゲージ
- 月セレクタによる月切り替え（全画面で同じ月を共有）
- 明細リスト（日付降順 / タップで編集 / 左スワイプ・ボタンで削除）
- FAB（＋・右下）からのボトムシートで取引を登録・編集（支出/収入はタブ切替）
- 金額入力は電卓パネル（数値＋四則演算、確定時に整数へ丸め）
- グラフ：カテゴリ別ドーナツ（収入・支出切替 / 横スワイプで月移動）
- カテゴリ別の月予算（毎月共通）と消化率バー・全体予算ゲージ
- 固定費の自動登録（家賃・サブスク等のテンプレートを登録→毎月アプリ起動時に自動生成）
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
- デプロイ先: Vercel

## セットアップ

### 1. 依存パッケージ

```bash
npm install
```

### 2. Supabase プロジェクトの準備

1. [Supabase](https://supabase.com/) でプロジェクトを作成。
2. SQL Editor で `supabase/migrations/0001_init.sql` を実行
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

## ディレクトリ構成

```
app/
  (main)/            認証済みアプリ（共有レイアウト：ヘッダー・FAB・下部ナビ）
    page.tsx         ホーム（収支サマリー）
    transactions/    明細リスト
    charts/          グラフ
    recurring/       固定費管理
  login/             認証画面
  manifest.ts        PWA マニフェスト
components/          UI コンポーネント
lib/
  supabase/          Supabase クライアント（client / server / セッション更新）
  actions/           Server Actions（認証 / 取引 CRUD）
  queries.ts         サーバー側データ取得・集計
  csv.ts             CSV入出力（Money Forward互換）
  format.ts          表示・日付ユーティリティ
proxy.ts             セッション更新と未ログイン時リダイレクト（Next.js 16 の middleware 後継）
supabase/migrations/ DB スキーマ・RLS・seed（SQL）
scripts/gen-icons.mjs PWA アイコン生成（依存なし）
```

## データモデル

- `categories`：カテゴリマスタ。`user_id IS NULL` が全員共通デフォルト、値ありがユーザー定義。
- `transactions`：取引。1取引 = 1カテゴリ、金額は日本円・正の整数のみ。
- `budgets`：カテゴリ別の月予算（毎月共通）。1ユーザー × 1カテゴリ = 1件、金額は正の整数。
- `recurring_transactions`：固定費テンプレート。毎月の日付（1-31）・金額・カテゴリを登録。`enabled` で一時停止可能。
- `transactions.recurring_id`：自動生成された取引とテンプレートの紐付け。テンプレート削除時は SET NULL。
- RLS により、取引・予算・固定費は `auth.uid()` 本人のみ読み書き可能。カテゴリは「共通＋自分定義」が閲覧でき、編集は自分定義のみ。

## MVP に含めないもの（将来対応）

目標設定、銀行/カード連携、口座振替、OCR、カテゴリ編集 UI
（カテゴリの DB 設計は拡張対応済み）。
