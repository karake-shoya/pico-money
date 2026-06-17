// 取引データの集計（純粋関数）。DB アクセスから分離し、単体テスト可能にする。
import type {
  CategorySlice,
  MonthlyBar,
  MonthlySummary,
  TxType,
} from "@/lib/types";

// 集計入力の最小形（金額と種別）
export type AmountRow = { type: TxType; amount: number };

// 月次サマリー（収入 / 支出 / 収支 / 貯蓄率）
export function summarize(rows: AmountRow[]): MonthlySummary {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  }
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  return { income, expense, balance, savingsRate };
}

// 日付付きの集計入力
export type DatedRow = { date: string; type: TxType; amount: number };

// 指定月リスト（古い順）の月別収支。範囲外の行は無視。
export function aggregateMonthlyBars(
  rows: DatedRow[],
  months: string[]
): MonthlyBar[] {
  const map = new Map<string, MonthlyBar>();
  for (const m of months) map.set(m, { month: m, income: 0, expense: 0 });
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    const bar = map.get(key);
    if (!bar) continue;
    if (r.type === "income") bar.income += r.amount;
    else bar.expense += r.amount;
  }
  return months.map((m) => map.get(m)!);
}

// 指定月リストそれぞれの月次サマリーを算出（範囲外の行は無視）。
// カルーセルの先読み用：複数月をまとめてクライアントへ渡す。
export function aggregateMonthlySummaries(
  rows: DatedRow[],
  months: string[]
): Record<string, MonthlySummary> {
  const buckets = new Map<string, AmountRow[]>();
  for (const m of months) buckets.set(m, []);
  for (const r of rows) {
    const bucket = buckets.get(r.date.slice(0, 7));
    if (bucket) bucket.push({ type: r.type, amount: r.amount });
  }
  const result: Record<string, MonthlySummary> = {};
  for (const m of months) result[m] = summarize(buckets.get(m)!);
  return result;
}

// カテゴリ別の集計入力
export type CategoryRow = {
  amount: number;
  category: { id: string; name: string; icon: string | null } | null;
};

// カテゴリ別合計を金額降順で返す
export function aggregateCategoryBreakdown(
  rows: CategoryRow[]
): CategorySlice[] {
  const map = new Map<string, CategorySlice>();
  for (const r of rows) {
    const c = r.category;
    const id = c?.id ?? "unknown";
    const existing = map.get(id);
    if (existing) {
      existing.amount += r.amount;
    } else {
      map.set(id, {
        categoryId: id,
        name: c?.name ?? "不明",
        icon: c?.icon ?? null,
        amount: r.amount,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}
