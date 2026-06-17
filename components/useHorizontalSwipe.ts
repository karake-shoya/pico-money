"use client";

import { useEffect, useRef, type RefObject } from "react";

const THRESHOLD = 50; // この距離(px)以上の横スワイプで確定
const INTENT = 10; // 横方向の意図とみなす最小移動量

type SwipeHandlers = {
  onStart?: () => void;
  onMove?: (dx: number) => void;
  // committed=true のとき dir(1=翌/-1=前)。閾値未満は committed=false。
  onEnd?: (committed: boolean, dir?: 1 | -1) => void;
  enabled?: () => boolean; // false を返す間はスワイプ開始しない
};

// 横スワイプ検出。ブラウザ/OS の横スワイプ（戻る/進む）に奪われないよう
// 非パッシブの touchmove を直接登録し、横方向と判定した時点で preventDefault する。
// ハンドラは最新の値を参照するため毎回 ref から読む。
export function useHorizontalSwipe(
  ref: RefObject<HTMLElement | null>,
  handlers: SwipeHandlers
) {
  // 最新ハンドラを常に参照（依存配列を ref のみにして listener は1回だけ登録する）
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let active = false;
    let horizontal = false;
    let moved = 0;

    const begin = (x: number, y: number) => {
      if (handlersRef.current.enabled && !handlersRef.current.enabled()) return;
      startX = x;
      startY = y;
      active = true;
      horizontal = false;
      moved = 0;
      handlersRef.current.onStart?.();
    };
    const move = (x: number, y: number, e: Event) => {
      if (!active) return;
      const ddx = x - startX;
      const ddy = y - startY;
      if (!horizontal && Math.abs(ddx) > Math.abs(ddy) && Math.abs(ddx) > INTENT) {
        horizontal = true;
      }
      if (horizontal) {
        if (e.cancelable) e.preventDefault();
        moved = ddx;
        handlersRef.current.onMove?.(ddx);
      }
    };
    const end = () => {
      if (!active) return;
      active = false;
      const m = moved;
      moved = 0;
      if (Math.abs(m) > THRESHOLD) {
        handlersRef.current.onEnd?.(true, m < 0 ? 1 : -1);
      } else {
        handlersRef.current.onEnd?.(false);
      }
    };

    const onTouchStart = (e: TouchEvent) =>
      begin(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.touches[0].clientX, e.touches[0].clientY, e);
    const onMouseDown = (e: MouseEvent) => begin(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY, e);

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
    // ref は安定。ハンドラは handlersRef 経由で最新を読むため依存に含めない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
