"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useMonth } from "@/components/MonthProvider";
import { formatYen } from "@/lib/format";

export type TrendPoint = {
  month: string; // YYYY-MM
  label: string; // 例: 2026年6月
  shortLabel: string; // 例: 6月
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
};

// 直近数ヶ月の収支推移（収入・支出の棒＋収支の折れ線）。
// 棒タップでその月へ移動する。
export function MonthlyTrend({ data }: { data: TrendPoint[] }) {
  const { month, setMonth } = useMonth();

  // 全期間で取引が無い場合は空状態を出す。
  const hasData = data.some((d) => d.income !== 0 || d.expense !== 0);

  return (
    <section className="mb-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <h2 className="mb-3 flex items-center gap-1.5 font-bold">
        <TrendingUp className="h-4 w-4 text-[var(--color-muted)]" />
        収支の推移
      </h2>

      {!hasData ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">
          直近の取引がありません。
        </p>
      ) : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 4, bottom: 0, left: -8 }}
                onClick={(state) => {
                  // 棒・軸どこをタップしても、その位置の月へ移動する。
                  const idx = state?.activeTooltipIndex;
                  if (typeof idx !== "number") return;
                  const point = data[idx];
                  if (point && point.month !== month) {
                    setMonth(point.month, { navigate: true });
                  }
                }}
              >
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => yAxisLabel(v)}
                />
                <Tooltip
                  content={TrendTooltip}
                  cursor={{ fill: "var(--color-bg)" }}
                />
                <Bar
                  dataKey="income"
                  name="収入"
                  fill="var(--color-income)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="expense"
                  name="支出"
                  fill="var(--color-expense)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="収支"
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-brand)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 凡例 */}
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[var(--color-muted)]">
            <LegendItem color="var(--color-income)" label="収入" />
            <LegendItem color="var(--color-expense)" label="支出" />
            <LegendItem color="var(--color-brand)" label="収支" line />
          </div>
        </>
      )}
    </section>
  );
}

// Y軸の目盛りは万円単位で簡潔に（例: 5万）。万未満は ¥ 付きでそのまま。
function yAxisLabel(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) return `${Math.round(v / 10000)}万`;
  return `${v}`;
}

function LegendItem({
  color,
  label,
  line,
}: {
  color: string;
  label: string;
  line?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      <span
        className={line ? "h-0.5 w-3 rounded-full" : "h-2.5 w-2.5 rounded-sm"}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

// recharts のツールチップ。収入・支出・収支を日本語ラベルで表示。
function TrendTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{point.label}</p>
      <Row label="収入" value={point.income} color="var(--color-income)" />
      <Row label="支出" value={point.expense} color="var(--color-expense)" />
      <Row
        label="収支"
        value={point.balance}
        color="var(--color-brand)"
        signed
      />
      <p className="mt-0.5 text-[var(--color-muted)]">
        貯蓄率 {point.savingsRate}%
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  color,
  signed,
}: {
  label: string;
  value: number;
  color: string;
  signed?: boolean;
}) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1" style={{ color }}>
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="tabular font-medium">
        {signed && value >= 0 ? "+" : signed ? "-" : ""}
        {formatYen(signed ? Math.abs(value) : value)}
      </span>
    </p>
  );
}
