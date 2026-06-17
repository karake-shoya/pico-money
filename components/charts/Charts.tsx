"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useMonth } from "@/components/MonthProvider";
import { useHorizontalSwipe } from "@/components/useHorizontalSwipe";
import { CategoryBadge, categoryColor } from "@/lib/category-icon";
import { formatYen, shiftMonth } from "@/lib/format";
import type { CategorySlice, TxType } from "@/lib/types";

type Props = {
  expenseSlices: CategorySlice[];
  incomeSlices: CategorySlice[];
};

export function Charts({ expenseSlices, incomeSlices }: Props) {
  const { month, setMonth } = useMonth();
  const [pieType, setPieType] = useState<TxType>("expense");
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

  return (
    <div
      ref={swipeRef}
      className="touch-pan-y"
      style={{ overscrollBehaviorX: "contain" }}
    >
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

            {/* カテゴリ別ランキング（金額と割合）。行タップで入出金へドリルダウン。 */}
            <ul className="mt-3 space-y-1">
              {pieData.map((d) => {
                return (
                  <li key={d.categoryId}>
                    <Link
                      href={`/transactions?month=${month}&cat=${d.categoryId}`}
                      className="flex items-center gap-2.5 rounded-lg py-1.5 text-sm active:bg-[var(--color-bg)]"
                    >
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
