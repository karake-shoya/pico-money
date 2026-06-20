import Link from "next/link";
import { CategoryBadge } from "@/lib/category-icon";
import { getMonthlyReport, getWeeklyReport } from "@/lib/queries";
import {
  currentMonth,
  formatSignedYen,
  formatYen,
  monthLabel,
  normalizeMonth,
  shiftMonth,
  shiftWeek,
  startOfWeek,
  todayDate,
  weekLabel,
} from "@/lib/format";

type Period = "weekly" | "monthly";

// 月次・週次の振り返りレポート。?period=weekly|monthly（既定 monthly）で切替。
// monthly: ?month=YYYY-MM（既定は先月）, weekly: ?week=YYYY-MM-DD（既定は今週・月曜始まり）。
// 通知（月次）から /report?month=<対象月> で開く。MonthProvider には依存しない独立画面。
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; month?: string; week?: string }>;
}) {
  const { period: periodParam, month: monthParam, week: weekParam } = await searchParams;
  const period: Period = periodParam === "weekly" ? "weekly" : "monthly";

  // 期間キー（monthly=YYYY-MM / weekly=YYYY-MM-DD）と各種ラベル・遷移を期間種別で分岐。
  const thisMonth = currentMonth();
  const thisWeek = startOfWeek(todayDate());

  // monthly は先月、weekly は今週を既定にする。
  // 不正な値は既定へフォールバック（month は normalizeMonth、week は形式検証してから週頭へ丸める）。
  const monthKey = monthParam ? normalizeMonth(monthParam) : shiftMonth(thisMonth, -1);
  const weekKey =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? startOfWeek(weekParam)
      : thisWeek;

  const isWeekly = period === "weekly";
  const heading = isWeekly ? `${weekLabel(weekKey)} の振り返り` : `${monthLabel(monthKey)}の振り返り`;
  const deltaLabel = isWeekly ? "前週比" : "前月比";

  // 前/次への遷移先。次は「現在の期間以降」へは進めない。
  const prevHref = isWeekly
    ? `/report?period=weekly&week=${shiftWeek(weekKey, -1)}`
    : `/report?period=monthly&month=${shiftMonth(monthKey, -1)}`;
  const atLatest = isWeekly ? weekKey >= thisWeek : monthKey >= thisMonth;
  const nextHref = isWeekly
    ? `/report?period=weekly&week=${shiftWeek(weekKey, 1)}`
    : `/report?period=monthly&month=${shiftMonth(monthKey, 1)}`;

  const report = isWeekly ? await getWeeklyReport(weekKey) : await getMonthlyReport(monthKey);
  const { current, deltas, topExpenses, overBudget } = report;

  // 前期比の良し悪し色分け：収入・収支・貯蓄率は増加が良い、支出は減少が良い。
  const goodColor = "text-[var(--color-income)]";
  const badColor = "text-[var(--color-expense)]";
  const deltaClass = (value: number, higherIsBetter: boolean) => {
    if (value === 0) return "text-[var(--color-muted)]";
    return (higherIsBetter ? value > 0 : value < 0) ? goodColor : badColor;
  };

  return (
    <div className="space-y-4">
      {/* 週次 / 月次 タブ */}
      <div className="flex rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1 text-sm">
        <TabLink href="/report?period=weekly" active={isWeekly} label="週次" />
        <TabLink href="/report?period=monthly" active={!isWeekly} label="月次" />
      </div>

      {/* 期間ナビ（前/次。次は現在期間以降へは進めない） */}
      <div className="flex items-center justify-between">
        <Link
          href={prevHref}
          aria-label={isWeekly ? "前の週" : "前の月"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          ‹
        </Link>
        <h1 className="text-base font-bold">{heading}</h1>
        {atLatest ? (
          <span className="h-8 w-8" aria-hidden />
        ) : (
          <Link
            href={nextHref}
            aria-label={isWeekly ? "次の週" : "次の月"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
          >
            ›
          </Link>
        )}
      </div>

      {/* サマリー（収支＋前期比） */}
      <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm text-[var(--color-muted)]">収支</span>
          <div className="text-right">
            <div
              className={`text-2xl font-bold ${
                current.balance >= 0 ? goodColor : badColor
              }`}
            >
              {formatSignedYen(current.balance)}
            </div>
            <div className={`text-xs ${deltaClass(deltas.balance, true)}`}>
              {deltaLabel} {formatSignedYen(deltas.balance)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-line)] pt-3 text-center">
          <Metric
            label="収入"
            value={formatYen(current.income)}
            delta={`${deltaLabel} ${formatSignedYen(deltas.income)}`}
            deltaClassName={deltaClass(deltas.income, true)}
          />
          <Metric
            label="支出"
            value={formatYen(current.expense)}
            delta={`${deltaLabel} ${formatSignedYen(deltas.expense)}`}
            deltaClassName={deltaClass(deltas.expense, false)}
          />
          <Metric
            label="貯蓄率"
            value={`${current.savingsRate}%`}
            delta={`${deltaLabel} ${deltas.savingsRate >= 0 ? "+" : ""}${deltas.savingsRate}pt`}
            deltaClassName={deltaClass(deltas.savingsRate, true)}
          />
        </div>
      </section>

      {/* 予算超過カテゴリ（月次のみ。予算は月単位のため週次では扱わない） */}
      {!isWeekly && (
        <section className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <h2 className="text-sm font-bold">予算超過</h2>
          {overBudget.length === 0 ? (
            <p className="py-2 text-sm text-[var(--color-muted)]">
              予算超過したカテゴリはありませんでした。
            </p>
          ) : (
            <ul className="space-y-2">
              {overBudget.map((c) => (
                <li key={c.categoryId} className="flex items-center gap-3">
                  <CategoryBadge name={c.name} className="h-9 w-9" iconClassName="h-4 w-4" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      予算 {formatYen(c.budget)} ・ 実績 {formatYen(c.spent)}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${badColor}`}>
                    +{formatYen(c.over)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 支出トップ */}
      <section className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-bold">支出が多かったカテゴリ</h2>
        {topExpenses.length === 0 ? (
          <p className="py-2 text-sm text-[var(--color-muted)]">
            この{isWeekly ? "週" : "月"}の支出はありませんでした。
          </p>
        ) : (
          <ul className="space-y-2">
            {topExpenses.map((c) => (
              <li key={c.categoryId} className="flex items-center gap-3">
                <CategoryBadge name={c.name} className="h-9 w-9" iconClassName="h-4 w-4" />
                {isWeekly ? (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {c.name}
                  </span>
                ) : (
                  <Link
                    href={`/transactions?month=${monthKey}&cat=${c.categoryId}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium"
                  >
                    {c.name}
                  </Link>
                )}
                <span className="text-sm font-semibold">{formatYen(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// 週次/月次タブのリンク。
function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-full py-1.5 text-center font-medium transition ${
        active
          ? "bg-[var(--color-brand)] text-white"
          : "text-[var(--color-muted)]"
      }`}
    >
      {label}
    </Link>
  );
}

// サマリーの個別指標（値＋前期比）。
function Metric({
  label,
  value,
  delta,
  deltaClassName,
}: {
  label: string;
  value: string;
  delta: string;
  deltaClassName: string;
}) {
  return (
    <div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="text-base font-bold">{value}</div>
      <div className={`text-[10px] ${deltaClassName}`}>{delta}</div>
    </div>
  );
}
