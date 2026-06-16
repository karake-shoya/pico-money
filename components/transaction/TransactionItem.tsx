"use client";

import { useRef, useState, useTransition } from "react";
import { useTransactionModal } from "./TransactionModal";
import { deleteTransaction } from "@/lib/actions/transactions";
import { dateLabel, formatSignedYen } from "@/lib/format";
import type { TransactionWithCategory } from "@/lib/types";

const REVEAL = 88; // 削除ボタン表示幅(px)

export function TransactionItem({ tx }: { tx: TransactionWithCategory }) {
  const { openEdit } = useTransactionModal();
  const [offset, setOffset] = useState(0); // 0 or -REVEAL
  const [dragging, setDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const startX = useRef(0);
  const curX = useRef(0);

  const isIncome = tx.type === "income";
  const signed = isIncome ? tx.amount : -tx.amount;

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
    if (!confirm("この取引を削除しますか？")) return;
    startTransition(async () => {
      await deleteTransaction(tx.id);
    });
  }

  function onRowClick() {
    // スワイプ表示中はタップで閉じるだけ。通常時は編集を開く。
    if (offset !== 0) {
      setOffset(0);
      return;
    }
    openEdit(tx);
  }

  return (
    <li className="relative overflow-hidden rounded-xl">
      {/* 背面の削除ボタン */}
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        aria-label="削除"
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-[var(--color-expense)] text-sm font-semibold text-white"
      >
        {isPending ? "…" : "削除"}
      </button>

      {/* 行本体 */}
      <div
        onClick={onRowClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className="relative flex cursor-pointer items-center gap-3 bg-[var(--color-surface)] px-4 py-3"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-xl">
          {tx.category?.icon ?? "❓"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {tx.category?.name ?? "不明なカテゴリ"}
          </p>
          <p className="truncate text-xs text-[var(--color-muted)]">
            {dateLabel(tx.date)}
            {tx.memo ? ` ・ ${tx.memo}` : ""}
          </p>
        </div>
        <span
          className={`tabular shrink-0 font-semibold ${
            isIncome
              ? "text-[var(--color-income)]"
              : "text-[var(--color-expense)]"
          }`}
        >
          {formatSignedYen(signed)}
        </span>
      </div>
    </li>
  );
}
