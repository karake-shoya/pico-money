"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Wallet } from "lucide-react";
import { useMonth } from "@/components/MonthProvider";
import { useHorizontalSwipe } from "@/components/useHorizontalSwipe";
import { BudgetSheet } from "@/components/budget/BudgetSheet";
import { CategoryBadge, categoryColor } from "@/lib/category-icon";
import { formatYen, shiftMonth } from "@/lib/format";
import type { Category, CategorySlice, TxType } from "@/lib/types";

type Props = {
  expenseSlices: CategorySlice[];
  incomeSlices: CategorySlice[];
  expenseCategories: Category[]; // 予算編集シート用（支出カテゴリ）
  budgets: Record<string, number>; // categoryId -> 月予算
};

export function Charts({
  expenseSlices,
  incomeSlices,
  expenseCategories,
  budgets,
}: Props) {
  const { month, setMonth } = useMonth();
  const [pieType, setPieType] = useState<TxType>("expense");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);

  // 横スワイプで月移動（サーバー再取得）。左=翌月 / 右=前月。
  useHorizontalSwipe(swipeRef, {
    onEnd: (committed, dir) => {
      if (committed && dir) {
        setMonth(shiftMonth(month, dir), { navigate: true });
      }
    },
  });

  const slices = pieType === "expense" ? expenseSlices : incomeSlices;
  const total = slices.reduce((s, c) => s + c.amount, 0);
  const pieData = slices.map((c) => ({
    categoryId: c.categoryId,
    name: c.name,
    icon: c.icon,
    value: c.amount,
    percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
  }));

  // 予算は支出のみ対象。全体予算 = 各カテゴリ予算の合計。
  const isExpense = pieType === "expense";
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const budgetRate =
    totalBudget > 0 ? Math.round((total / totalBudget) * 100) : 0;
  const budgetOver = total > totalBudget;

  return (
    <div
      ref={swipeRef}
      className="touch-pan-y"
      style={{ overscrollBehaviorX: "contain" }}
    >
      {/* 月の予算（支出のみ）。全体予算 = 各カテゴリ予算の合計。 */}
      {isExpense && (
        <section className="mb-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-bold">
              <Wallet className="h-4 w-4 text-[var(--color-muted)]" />
              月の予算
            </h2>
            <button
              type="button"
              onClick={() => setBudgetOpen(true)}
              className="h-7 rounded-md bg-[var(--color-bg)] px-3 text-xs font-medium text-[var(--color-brand)] active:opacity-70"
            >
              設定
            </button>
          </div>
          {totalBudget > 0 ? (
            <>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="tabular font-semibold">
                  {formatYen(total)}
                  <span className="text-[var(--color-muted)]">
                    {" "}
                    / {formatYen(totalBudget)}
                  </span>
                </span>
                <span
                  className={`tabular text-xs font-semibold ${
                    budgetOver
                      ? "text-[var(--color-expense)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {budgetOver
                    ? `${formatYen(total - totalBudget)} 超過`
                    : `残り ${formatYen(totalBudget - total)}`}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetOver
                      ? "bg-[var(--color-expense)]"
                      : "bg-[var(--color-brand)]"
                  }`}
                  style={{ width: `${Math.min(budgetRate, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="py-2 text-sm text-[var(--color-muted)]">
              予算が未設定です。「設定」から登録できます。
            </p>
          )}
        </section>
      )}

      {/* カテゴリ別ドーナツ */}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">カテゴリ別</h2>
          {/* 収入/支出 切替 */}
          <div className="grid grid-cols-2 rounded-lg bg-[var(--color-bg)] p-0.5 text-xs font-medium">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPieType(t)}
                className={`h-7 rounded-md px-3 transition ${
                  pieType === t
                    ? "bg-[var(--color-surface)] shadow-sm"
                    : "text-[var(--color-muted)]"
                }`}
              >
                {t === "expense" ? "支出" : "収入"}
              </button>
            ))}
          </div>
        </div>

        {pieData.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            この月の{pieType === "expense" ? "支出" : "収入"}はありません。
          </p>
        ) : (
          <>
            {/* グラフはタップ無効（pointer-events-none）。タッチは下層のスワイプ領域へ通す。 */}
            <div className="pointer-events-none relative h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={categoryColor(d.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* 中央の合計表示 */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-[var(--color-muted)]">合計</span>
                <span className="tabular font-bold">{formatYen(total)}</span>
              </div>
            </div>

            {/* カテゴリ別ランキング（金額と割合）。行タップで入出金へドリルダウン。
                支出で予算が設定されたカテゴリは消化率バーを表示。 */}
            <ul className="mt-3 space-y-1">
              {pieData.map((d) => {
                const budget = isExpense ? budgets[d.categoryId] ?? 0 : 0;
                const over = budget > 0 && d.value > budget;
                return (
                  <li key={d.categoryId}>
                    <Link
                      href={`/transactions?month=${month}&cat=${d.categoryId}`}
                      className="block rounded-lg px-1 py-1.5 text-sm active:bg-[var(--color-bg)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <CategoryBadge
                          name={d.name}
                          className="h-7 w-7"
                          iconClassName="h-4 w-4"
                        />
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className="tabular text-[var(--color-muted)]">
                          {d.percent}%
                        </span>
                        <span className="tabular w-24 text-right font-medium">
                          {formatYen(d.value)}
                        </span>
                        <span className="text-[var(--color-muted)]">›</span>
                      </div>
                      {budget > 0 && (
                        <div className="mt-1 flex items-center gap-2 pl-[38px]">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                            <div
                              className={`h-full rounded-full ${
                                over
                                  ? "bg-[var(--color-expense)]"
                                  : "bg-[var(--color-brand)]"
                              }`}
                              style={{
                                width: `${Math.min(
                                  Math.round((d.value / budget) * 100),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`tabular shrink-0 text-[11px] ${
                              over
                                ? "text-[var(--color-expense)]"
                                : "text-[var(--color-muted)]"
                            }`}
                          >
                            {over
                              ? `${formatYen(d.value - budget)} 超過`
                              : `予算 ${formatYen(budget)}`}
                          </span>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* 予算編集シート */}
      {budgetOpen && (
        <BudgetSheet
          categories={expenseCategories}
          budgets={budgets}
          onClose={() => setBudgetOpen(false)}
        />
      )}
    </div>
  );
}
