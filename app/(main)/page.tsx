import Link from "next/link";
import { ChevronRight, LineChart, PiggyBank } from "lucide-react";
import { HomeCarousel } from "@/components/HomeCarousel";
import { getMonthlySummaries } from "@/lib/queries";
import { currentMonth, lastNMonths, shiftMonth } from "@/lib/format";

// ホーム（収支サマリー）。当月中心の固定範囲を先読みし、クライアントのカルーセルへ渡す。
// 月切替はカルーセル側がこの先読みデータで即時スライドするため、?month が変わっても
// このサーバーコンポーネントは再取得されない（history 同期のみ）。
// カルーセルの先読み範囲。当月中心に過去・未来をこの幅だけ取得する。
// この範囲外へスワイプするとデータが無く0表示になるため、実用上十分広く取る。
const PAST_MONTHS = 24;
const FUTURE_MONTHS = 6;

export default async function HomePage() {
  const base = currentMonth();
  const months = [
    ...lastNMonths(base, PAST_MONTHS + 1), // 過去＋当月（古い順）
    ...Array.from({ length: FUTURE_MONTHS }, (_, i) => shiftMonth(base, i + 1)),
  ];
  const summaries = await getMonthlySummaries(months);

  return (
    <div className="space-y-4">
      <HomeCarousel summaries={summaries} />

      {/* 振り返りレポートへの常設導線（週次・月次） */}
      <Link
        href="/report"
        className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 active:bg-[var(--color-bg)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
          <LineChart className="h-5 w-5 text-[var(--color-brand)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">振り返りを見る</div>
          <div className="text-xs text-[var(--color-muted)]">
            週次・月次の収支、前期比、予算超過をまとめて確認
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      </Link>

      {/* 目標貯金への常設導線 */}
      <Link
        href="/goals"
        className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 active:bg-[var(--color-bg)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
          <PiggyBank className="h-5 w-5 text-[var(--color-brand)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">目標貯金</div>
          <div className="text-xs text-[var(--color-muted)]">
            目標を決めて、支出として貯金。進捗をチェック
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      </Link>
    </div>
  );
}
