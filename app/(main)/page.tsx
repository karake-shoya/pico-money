import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import { MonthSwipe } from "@/components/MonthSwipe";
import { getMonthlySummary } from "@/lib/queries";
import { formatSignedYen, formatYen, normalizeMonth } from "@/lib/format";

// ホーム（収支サマリー）。Next.js 16 では searchParams は Promise。
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = normalizeMonth(monthParam);
  const { income, expense, balance, savingsRate } =
    await getMonthlySummary(month);

  // 支出率（収入に対する支出の割合）。収入が0なら支出があれば100%扱い。
  const expenseRate =
    income > 0 ? Math.min(Math.round((expense / income) * 100), 999) : expense > 0 ? 100 : 0;
  const gaugeWidth = Math.min(expenseRate, 100);
  const over = expense > income; // 支出超過

  return (
    <MonthSwipe month={month}>
      <div className="space-y-4">
        {/* 収支バランス（大きく表示） */}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <p className="text-sm text-[var(--color-muted)]">差額</p>
        <p
          className={`tabular mt-1 text-4xl font-bold ${
            balance >= 0
              ? "text-[var(--color-income)]"
              : "text-[var(--color-expense)]"
          }`}
        >
          {formatSignedYen(balance)}
        </p>

        {/* 支出率ゲージ */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--color-muted)]">支出率</span>
            <span
              className={`tabular font-semibold ${
                over ? "text-[var(--color-expense)]" : "text-[var(--color-ink)]"
              }`}
            >
              {expenseRate}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
            <div
              className={`h-full rounded-full transition-all ${
                over ? "bg-[var(--color-expense)]" : "bg-[var(--color-brand)]"
              }`}
              style={{ width: `${gaugeWidth}%` }}
            />
          </div>
        </div>
      </section>

      {/* 収入 / 支出 */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
            <ArrowDownLeft className="h-4 w-4 text-[var(--color-income)]" />
            収入
          </p>
          <p className="tabular mt-1.5 text-xl font-bold text-[var(--color-income)]">
            {formatYen(income)}
          </p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
            <ArrowUpRight className="h-4 w-4 text-[var(--color-expense)]" />
            支出
          </p>
          <p className="tabular mt-1.5 text-xl font-bold text-[var(--color-expense)]">
            {formatYen(expense)}
          </p>
        </section>
      </div>

      {/* 貯蓄率 */}
      <section className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <PiggyBank className="h-4 w-4" />
          貯蓄率
        </p>
        <p
          className={`tabular text-xl font-bold ${
            savingsRate >= 0
              ? "text-[var(--color-income)]"
              : "text-[var(--color-expense)]"
          }`}
        >
          {savingsRate}%
        </p>
      </section>
      </div>
    </MonthSwipe>
  );
}
