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
  created_at: string;
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
  expense: number;
  balance: number; // income - expense
  savingsRate: number; // 貯蓄率（収入に対する収支の割合, %）。収入0なら0。
};

// カテゴリ別内訳（円グラフ用）
export type CategorySlice = {
  categoryId: string;
  name: string;
  icon: string | null;
  amount: number;
  sortOrder: number;
};
