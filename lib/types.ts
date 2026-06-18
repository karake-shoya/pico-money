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
  created_at: string;
};

// 明細表示用: 取引にカテゴリ情報を結合したもの
export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'type'> | null;
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
};
