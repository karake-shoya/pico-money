// アプリ全体で共有するドメイン型

export type TxType = 'income' | 'expense';

// categories テーブル
export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  type: TxType;
  icon: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
};

// transactions テーブル
export type Transaction = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: TxType;
  category_id: string;
  amount: number; // 整数（円）
  memo: string | null;
  recurring_id: string | null;
  goal_id: string | null; // NULL = 通常の取引 / 値あり = 目標への貯金（振替）
  created_at: string;
};

// savings_goals テーブル（貯金の目標）
export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number; // 整数（円）・正
  deadline: string | null; // YYYY-MM-DD・任意
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// 進捗付きの目標（貯金済み額を結合したもの）
export type SavingsGoalWithProgress = SavingsGoal & {
  saved: number; // これまでの貯金合計（円）
  remaining: number; // 残り（target - saved、最低0）
  percent: number; // 達成率（0-100、四捨五入）
};

// recurring_transactions テーブル（固定費テンプレート）
export type RecurringTransaction = {
  id: string;
  user_id: string;
  type: TxType;
  category_id: string;
  amount: number;
  memo: string | null;
  day: number; // 1-31
  enabled: boolean;
  last_generated_month: string | null; // YYYY-MM
  created_at: string;
  updated_at: string;
};

// 固定費一覧表示用: テンプレートにカテゴリ情報を結合したもの
export type RecurringWithCategory = RecurringTransaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'type' | 'sort_order'> | null;
};

// 明細表示用: 取引にカテゴリ情報を結合したもの
export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'type' | 'sort_order'> | null;
};

// 取引の横断検索フィルタ（月に縛られない全期間検索）。
// すべて任意。指定されたものだけを AND 条件で適用する。
export type TransactionSearchFilters = {
  keyword?: string; // memo を部分一致（大文字小文字無視）
  type?: TxType; // income / expense
  categoryId?: string;
  dateFrom?: string; // YYYY-MM-DD（その日を含む）
  dateTo?: string; // YYYY-MM-DD（その日を含む）
  amountMin?: number; // 円・整数
  amountMax?: number; // 円・整数
};

// push_subscriptions テーブル（Web Push の購読・記録忘れリマインダー用）
export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  reminder_time: string; // 'HH:MM:SS'（JST 解釈）
  enabled: boolean;
  last_notified_date: string | null;
  monthly_report_enabled: boolean; // 月次振り返りレポートを通知するか
  last_report_month: string | null; // 最後に月次レポートを送った対象月 'YYYY-MM'
  created_at: string;
  updated_at: string;
};

// budgets テーブル（カテゴリ別の月予算・毎月共通）
export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number; // 整数（円）
  created_at: string;
  updated_at: string;
};

// 月次サマリー
export type MonthlySummary = {
  income: number;
  expense: number; // 消費支出のみ（目標への貯金=goal_id 付きは含まない）
  savings: number; // 目標への貯金（振替）合計
  balance: number; // 残高（使えるお金）= income - expense - savings
  savingsRate: number; // 貯蓄率 = (income - expense) / income（貯金しても下がらない）。収入0なら0。
};

// カテゴリ別内訳（円グラフ用）
export type CategorySlice = {
  categoryId: string;
  name: string;
  icon: string | null;
  amount: number;
  sortOrder: number;
};

// 月次振り返りレポートの予算超過カテゴリ
export type ReportOverBudget = {
  categoryId: string;
  name: string;
  icon: string | null;
  spent: number; // 当月の支出実績
  budget: number; // 設定予算
  over: number; // 超過額（spent - budget）
};

// 月次振り返りレポート（先月の実績まとめ）
export type MonthlyReport = {
  current: MonthlySummary;
  previous: MonthlySummary;
  // 前月比の増減（当月 - 前月）。各項目の符号がそのまま増減を表す。
  deltas: {
    income: number;
    expense: number;
    savings: number;
    balance: number;
    savingsRate: number;
  };
  topExpenses: CategorySlice[]; // 支出の多いカテゴリ上位（金額降順）
  overBudget: ReportOverBudget[]; // 予算超過カテゴリ（超過額の降順）
};

// Server Action の共通戻り値型
export type ActionState = { error: string } | { ok: true } | null;

// デフォルトカテゴリ（支出・食費）の ID を返す。見つからなければ空文字。
export function defaultCategoryId(categories: Category[]): string {
  return (
    categories.find((c) => c.type === "expense" && c.name === "食費")?.id ?? ""
  );
}
