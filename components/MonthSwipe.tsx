"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { monthLabel, shiftMonth } from "@/lib/format";

const THRESHOLD = 50; // この距離(px)以上の横スワイプで月移動

// 月次の収支を「‹ 2026年6月 ›」で前後に切り替えられるラッパー。
// スワイプ（左=翌月 / 右=前月）とタップ両対応。?month を更新し全画面で共有する。
// Pointer Events を使い、タッチ・マウスドラッグの両方に対応する。
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

  const [dx, setDx] = useState(0); // 表示追従用
  const [dragging, setDragging] = useState(false);

  const down = useRef(false);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0); // 終了判定はこちらを参照（state の取りこぼし防止）
  const horizontal = useRef(false);

  function go(delta: number) {
    const params = new URLSearchParams(searchParams);
    params.set("month", shiftMonth(month, delta));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    down.current = true;
    startPt.current = { x: e.clientX, y: e.clientY };
    horizontal.current = false;
    dxRef.current = 0;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!down.current || !startPt.current) return;
    const ddx = e.clientX - startPt.current.x;
    const ddy = e.clientY - startPt.current.y;
    // 横方向の意図が明確になったら、その時点でポインタを捕捉して追従開始
    // （縦スクロールは touch-action: pan-y がブラウザ側で処理する）
    if (
      !horizontal.current &&
      Math.abs(ddx) > Math.abs(ddy) &&
      Math.abs(ddx) > 8
    ) {
      horizontal.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // 捕捉非対応でも処理続行
      }
    }
    if (horizontal.current) {
      dxRef.current = ddx;
      setDx(ddx);
    }
  }

  function onPointerEnd() {
    if (!down.current) return;
    down.current = false;
    setDragging(false);
    const moved = dxRef.current;
    startPt.current = null;
    horizontal.current = false;
    dxRef.current = 0;
    setDx(0);
    if (Math.abs(moved) > THRESHOLD) {
      go(moved < 0 ? 1 : -1); // 左スワイプ=翌月, 右スワイプ=前月
    }
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

      {/* スワイプ領域。-mx-4 px-4 で親(main)の左右パディングを相殺し、
          画面端から始まるスワイプもこのハンドラで受ける（＝ブラウザの戻る操作を奪われない）。 */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="-mx-4 px-4"
        style={{
          touchAction: "pan-y",
          overscrollBehaviorX: "contain",
          transform: `translateX(${dx * 0.4}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
