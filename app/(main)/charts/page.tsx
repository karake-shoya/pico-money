import { Charts } from "@/components/charts/Charts";
import {
  getCategoryBreakdown,
  getMonthlyBars,
} from "@/lib/queries";
import { monthLabel, normalizeMonth } from "@/lib/format";

// グラフ画面。月別収支（過去6ヶ月）とカテゴリ別ドーナツ。
export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = normalizeMonth(monthParam);

  // 収入/支出の切替はクライアント側で行うため、両方を取得して渡す。
  const [bars, expenseSlices, incomeSlices] = await Promise.all([
    getMonthlyBars(month, 6),
    getCategoryBreakdown(month, "expense"),
    getCategoryBreakdown(month, "income"),
  ]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        {monthLabel(month)}の家計簿
      </p>
      <Charts
        month={month}
        bars={bars}
        expenseSlices={expenseSlices}
        incomeSlices={incomeSlices}
      />
    </div>
  );
}
