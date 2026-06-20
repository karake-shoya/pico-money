import { Charts } from "@/components/charts/Charts";
import { MonthlyTrend, type TrendPoint } from "@/components/charts/MonthlyTrend";
import { MonthNav } from "@/components/MonthNav";
import {
  getBudgets,
  getCategories,
  getCategoryBreakdown,
  getMonthlySummaries,
} from "@/lib/queries";
import { lastNMonths, monthLabel, normalizeMonth } from "@/lib/format";

// 月次推移グラフで表示する月数（選択月を末尾に含む）。
const TREND_MONTHS = 6;

// グラフ画面。カテゴリ別ドーナツ（横スワイプで月移動）＋カテゴリ別予算。
export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = normalizeMonth(monthParam);

  // 月次推移は選択月を末尾とした直近 TREND_MONTHS ヶ月。
  const trendMonths = lastNMonths(month, TREND_MONTHS);

  // 収入/支出の切替はクライアント側で行うため、両方を取得して渡す。
  const [expenseSlices, incomeSlices, categories, budgetRows, summaries] =
    await Promise.all([
      getCategoryBreakdown(month, "expense"),
      getCategoryBreakdown(month, "income"),
      getCategories(),
      getBudgets(),
      getMonthlySummaries(trendMonths),
    ]);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const budgets = Object.fromEntries(
    budgetRows.map((b) => [b.category_id, b.amount])
  );

  // 月リスト順（古い→新しい）にトレンド用データへ整形。
  const trendData: TrendPoint[] = trendMonths.map((m) => ({
    month: m,
    label: monthLabel(m),
    shortLabel: `${Number(m.slice(5, 7))}月`,
    ...summaries[m],
  }));

  return (
    <div className="space-y-3">
      <MonthNav />
      <MonthlyTrend data={trendData} />
      <Charts
        expenseSlices={expenseSlices}
        incomeSlices={incomeSlices}
        expenseCategories={expenseCategories}
        budgets={budgets}
      />
    </div>
  );
}
