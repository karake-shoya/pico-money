"use client";

import { useRef, useState, useTransition } from "react";
import { deleteRecurring, toggleRecurring } from "@/lib/actions/recurring";
import { CategoryBadge } from "@/lib/category-icon";
import { formatYen } from "@/lib/format";
import type { RecurringWithCategory } from "@/lib/types";

const REVEAL = 88;

export function RecurringItem({
  item,
  onEdit,
}: {
  item: RecurringWithCategory;
  onEdit: (item: RecurringWithCategory) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const startX = useRef(0);
  const curX = useRef(0);

  const isIncome = item.type === "income";

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

  function onDelete() {
    if (!confirm("この固定費を削除しますか？")) return;
    startTransition(async () => {
      await deleteRecurring(item.id);
    });
  }

  function onToggle(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await toggleRecurring(item.id, !item.enabled);
    });
  }

  function onRowClick() {
    if (offset !== 0) {
      setOffset(0);
      return;
    }
    onEdit(item);
  }

  return (
    <li className="relative overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        aria-label="削除"
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-[var(--color-expense)] text-sm font-semibold text-white"
      >
        {isPending ? "…" : "削除"}
      </button>

      <div
        onClick={onRowClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className={`relative flex cursor-pointer items-center gap-3 bg-[var(--color-surface)] px-4 py-3 ${
          !item.enabled ? "opacity-50" : ""
        }`}
      >
        <CategoryBadge name={item.category?.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {item.category?.name ?? "不明なカテゴリ"}
          </p>
          <p className="truncate text-xs text-[var(--color-muted)]">
            毎月{item.day}日
            {item.memo ? ` ・ ${item.memo}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`tabular font-semibold ${
              isIncome
                ? "text-[var(--color-income)]"
                : "text-[var(--color-expense)]"
            }`}
          >
            {formatYen(item.amount)}
          </span>
          <button
            type="button"
            onClick={onToggle}
            disabled={isPending}
            aria-label={item.enabled ? "一時停止" : "有効化"}
            className={`h-6 w-10 rounded-full transition ${
              item.enabled
                ? "bg-[var(--color-brand)]"
                : "bg-[var(--color-line)]"
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                item.enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </li>
  );
}
