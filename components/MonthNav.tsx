"use client";

import { usePathname } from "next/navigation";
import { useMonth } from "@/components/MonthProvider";
import { monthLabel, shiftMonth } from "@/lib/format";

const HOME_PATH = "/"; // ホームはカルーセルが先読み表示するため再取得不要

// 前月/次月の矢印で共有の月(MonthContext)を切り替えるコンパクトなナビ。
// ホーム以外(Server Component)は月変更でデータ再取得が必要なため navigate:true。
export function MonthNav() {
  const pathname = usePathname();
  const { month, setMonth } = useMonth();

  const go = (delta: number) =>
    setMonth(shiftMonth(month, delta), { navigate: pathname !== HOME_PATH });

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="前の月"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
      >
        ‹
      </button>
      <span className="text-sm font-medium text-[var(--color-ink)]">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="次の月"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
      >
        ›
      </button>
    </div>
  );
}
