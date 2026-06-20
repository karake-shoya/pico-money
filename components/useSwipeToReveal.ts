"use client";

import { useRef, useState } from "react";

const REVEAL = 88;

export function useSwipeToReveal() {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const curX = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    curX.current = offset;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current;
    const next = Math.max(-REVEAL, Math.min(0, curX.current + dx));
    setOffset(next);
  }

  function onTouchEnd() {
    setDragging(false);
    setOffset(offset < -REVEAL / 2 ? -REVEAL : 0);
  }

  function reset() {
    setOffset(0);
  }

  return {
    offset,
    dragging,
    revealed: offset !== 0,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    reset,
  };
}
