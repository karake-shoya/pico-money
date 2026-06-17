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

  return <HomeCarousel summaries={summaries} />;
}
