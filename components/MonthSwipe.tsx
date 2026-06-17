"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { monthLabel, shiftMonth } from "@/lib/format";

const THRESHOLD = 60; // この距離(px)以上の横スワイプで月移動

// 月次の収支を「◀ 2026年6月 ▶」で前後に切り替えられるラッパー。
// スワイプ（左=翌月 / 右=前月）とタップ両対応。?month を更新し全画面で共有する。
export function MonthSwipe({
  month,
  children,
}: {
  month: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);

  function go(delta: number) {
    const params = new URLSearchParams(searchParams);
    params.set("month", shiftMonth(month, delta));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function onTouchStart(e: React.TouchEvent) {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    horizontal.current = false;
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return;
    const ddx = e.touches[0].clientX - start.current.x;
    const ddy = e.touches[0].clientY - start.current.y;
    // 横方向の意図が明確なときだけ追従（縦スクロールを妨げない）
    if (!horizontal.current && Math.abs(ddx) > Math.abs(ddy) && Math.abs(ddx) > 10) {
      horizontal.current = true;
    }
    if (horizontal.current) setDx(ddx);
  }
  function onTouchEnd() {
    setDragging(false);
    if (horizontal.current && Math.abs(dx) > THRESHOLD) {
      go(dx < 0 ? 1 : -1); // 左スワイプ=翌月, 右スワイプ=前月
    }
    setDx(0);
    start.current = null;
  }

  return (
    <div>
      {/* 月ナビゲーション */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="前の月"
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          ‹
        </button>
        <span className={`text-lg font-bold ${isPending ? "opacity-50" : ""}`}>
          {monthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="次の月"
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          ›
        </button>
      </div>

      {/* スワイプ領域 */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${dx * 0.4}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
