"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { categoryIcon } from "@/lib/category-icon";
import { formatYen, shortMonthLabel } from "@/lib/format";
import type { CategorySlice, MonthlyBar, TxType } from "@/lib/types";

const INCOME = "#059669";
const EXPENSE = "#e11d48";

// 円グラフ用のカラーパレット
const PIE_COLORS = [
  "#4f46e5",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

type Props = {
  month: string;
  bars: MonthlyBar[];
  expenseSlices: CategorySlice[];
  incomeSlices: CategorySlice[];
};

export function Charts({ month, bars, expenseSlices, incomeSlices }: Props) {
  const [pieType, setPieType] = useState<TxType>("expense");

  const barData = bars.map((b) => ({
    name: shortMonthLabel(b.month),
    収入: b.income,
    支出: b.expense,
  }));

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
    <div className="space-y-4">
      {/* 月別収支棒グラフ（過去6ヶ月） */}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-1 font-bold">月別収支</h2>
        <p className="mb-3 text-xs text-[var(--color-muted)]">過去6ヶ月</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="#8b9099"
              />
              <Tooltip
                formatter={(v) => formatYen(Number(v))}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #eceef1",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="収入" fill={INCOME} radius={[4, 4, 0, 0]} />
              <Bar dataKey="支出" fill={EXPENSE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-4 text-xs text-[var(--color-muted)]">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} />
            収入
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE }} />
            支出
          </span>
        </div>
      </section>

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
            <div className="relative h-52 w-full">
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
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatYen(Number(v))} />
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
              {pieData.map((d, i) => {
                const Icon = categoryIcon(d.name);
                return (
                <li key={d.categoryId}>
                  <Link
                    href={`/transactions?month=${month}&cat=${d.categoryId}`}
                    className="flex items-center gap-2.5 rounded-lg py-1.5 text-sm active:bg-[var(--color-bg)]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <Icon
                      className="h-4 w-4 shrink-0 text-[var(--color-muted)]"
                      strokeWidth={1.8}
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
