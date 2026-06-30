// 取引データの集計（純粋関数）。DB アクセスから分離し、単体テスト可能にする。
import type {
  CategorySlice,
  MonthlyReport,
  MonthlySummary,
  ReportOverBudget,
  TxType,
} from "@/lib/types";

// 集計入力の最小形（金額と種別）。
// isSavings=true の支出は「目標への貯金（振替）」として消費から分離する。
export type AmountRow = { type: TxType; amount: number; isSavings?: boolean };

// 月次サマリー（収入 / 消費支出 / 貯金 / 残高 / 貯蓄率）。
// 貯金（goal_id 付き支出）は消費 expense に含めず savings として別建てし、
// 残高 balance は貯金分も差し引く（使えるお金）。
// 貯蓄率は (income - expense) / income とし、貯金しても下がらないようにする。
export function summarize(rows: AmountRow[]): MonthlySummary {
  let income = 0;
  let expense = 0;
  let savings = 0;
  for (const r of rows) {
    if (r.type === "income") income += r.amount;
    else if (r.isSavings) savings += r.amount;
    else expense += r.amount;
  }
  const balance = income - expense - savings;
  const savingsRate =
    income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  return { income, expense, savings, balance, savingsRate };
}

// 日付付きの集計入力
export type DatedRow = {
  date: string;
  type: TxType;
  amount: number;
  isSavings?: boolean;
};

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
    if (bucket) bucket.push({ type: r.type, amount: r.amount, isSavings: r.isSavings });
  }
  const result: Record<string, MonthlySummary> = {};
  for (const m of months) result[m] = summarize(buckets.get(m)!);
  return result;
}

// カテゴリ別の集計入力
export type CategoryRow = {
  amount: number;
  category: { id: string; name: string; icon: string | null; sort_order: number } | null;
};

// カテゴリ別合計を sort_order 順で返す
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
        sortOrder: c?.sort_order ?? 999,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

// 予算ペース予測の結果
export type BudgetPaceProjection = {
  projectedExpense: number; // 月末着地見込み（円・四捨五入）
  projectedOver: number; // 予算超過見込み額（超過しないなら 0）
  willExceed: boolean; // 月末に予算を超える見込みか
};

// 日割りペースで月末の支出着地を線形予測する。
// projectedExpense = 現支出 / 経過日数 * 月の日数。
// 経過日数が不正（0以下）ならゼロ除算を避け、現支出を着地値として扱う。
export function projectMonthEndExpense(
  currentExpense: number,
  elapsedDays: number,
  daysInMonthCount: number,
  totalBudget: number
): BudgetPaceProjection {
  const projectedExpense =
    elapsedDays > 0 && daysInMonthCount > 0
      ? Math.round((currentExpense / elapsedDays) * daysInMonthCount)
      : currentExpense;
  const projectedOver = Math.max(0, projectedExpense - totalBudget);
  return {
    projectedExpense,
    projectedOver,
    willExceed: projectedExpense > totalBudget,
  };
}

// 月次振り返りレポートを組み立てる（純粋関数）。
// current/previous は月次サマリー、expenseByCategory は当月の支出カテゴリ内訳、
// budgetByCategory は categoryId → 予算額のマップ（0 や未設定は予算なし扱い）。
// topN は支出上位の表示件数（既定 3）。
export function buildMonthlyReport(
  current: MonthlySummary,
  previous: MonthlySummary,
  expenseByCategory: CategorySlice[],
  budgetByCategory: Record<string, number>,
  topN = 3
): MonthlyReport {
  // 支出上位（金額降順）。元配列は破壊しない。
  const topExpenses = [...expenseByCategory]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN);

  // 予算超過カテゴリ（予算が正の値で、実績が予算を超えたもの）。超過額の降順。
  const overBudget: ReportOverBudget[] = expenseByCategory
    .map((c) => {
      const budget = budgetByCategory[c.categoryId] ?? 0;
      return { c, budget, over: c.amount - budget };
    })
    .filter(({ budget, over }) => budget > 0 && over > 0)
    .map(({ c, budget, over }) => ({
      categoryId: c.categoryId,
      name: c.name,
      icon: c.icon,
      spent: c.amount,
      budget,
      over,
    }))
    .sort((a, b) => b.over - a.over);

  return {
    current,
    previous,
    deltas: {
      income: current.income - previous.income,
      expense: current.expense - previous.expense,
      savings: current.savings - previous.savings,
      balance: current.balance - previous.balance,
      savingsRate: current.savingsRate - previous.savingsRate,
    },
    topExpenses,
    overBudget,
  };
}
