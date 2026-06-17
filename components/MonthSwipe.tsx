"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { monthLabel, shiftMonth } from "@/lib/format";

const THRESHOLD = 50; // この距離(px)以上の横スワイプで月移動
const INTENT = 10; // 横方向の意図とみなす最小移動量

// 月次の収支を「‹ 2026年6月 ›」で前後に切り替えられるラッパー。
// スワイプ（左=翌月 / 右=前月）とタップ両対応。?month を更新し全画面で共有する。
//
// ブラウザ/OS の「横スワイプ＝戻る/進む」に奪われないよう、非パッシブの
// touchmove リスナを直接登録し、横方向と判定した時点で preventDefault する。
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
  const areaRef = useRef<HTMLDivElement>(null);

  // 月移動。最新の月/クエリを参照できるよう ref 経由で呼ぶ。
  // ref の更新はレンダー後（effect 内）に行う。
  const goRef = useRef<(delta: number) => void>(() => {});
  useEffect(() => {
    goRef.current = (delta: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("month", shiftMonth(month, delta));
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    };
  });

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let active = false;
    let horizontal = false;
    let moved = 0;

    const begin = (x: number, y: number) => {
      startX = x;
      startY = y;
      active = true;
      horizontal = false;
      moved = 0;
      setDragging(true);
    };
    const move = (x: number, y: number, e: Event) => {
      if (!active) return;
      const ddx = x - startX;
      const ddy = y - startY;
      if (
        !horizontal &&
        Math.abs(ddx) > Math.abs(ddy) &&
        Math.abs(ddx) > INTENT
      ) {
        horizontal = true;
      }
      if (horizontal) {
        // ブラウザの戻る/進む・縦スクロール乗っ取りを止める
        if (e.cancelable) e.preventDefault();
        moved = ddx;
        setDx(ddx);
      }
    };
    const end = () => {
      if (!active) return;
      active = false;
      setDragging(false);
      const m = moved;
      moved = 0;
      setDx(0);
      if (Math.abs(m) > THRESHOLD) goRef.current(m < 0 ? 1 : -1);
    };

    const onTouchStart = (e: TouchEvent) =>
      begin(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.touches[0].clientX, e.touches[0].clientY, e);
    const onMouseDown = (e: MouseEvent) => begin(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY, e);

    // touchmove は passive:false でないと preventDefault が効かない
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", end);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", end);
    };
  }, []);

  return (
    <div>
      {/* 月ナビゲーション */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goRef.current(-1)}
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
          onClick={() => goRef.current(1)}
          aria-label="次の月"
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          ›
        </button>
      </div>

      {/* スワイプ領域。-mx-4 px-4 で親(main)の左右パディングを相殺し、
          画面端から始まるスワイプもこのハンドラで受ける。 */}
      <div
        ref={areaRef}
        className="-mx-4 min-h-[70dvh] touch-pan-y px-4"
        style={{
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
