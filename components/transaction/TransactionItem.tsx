"use client";

import { useTransition } from "react";
import { useSwipeToReveal } from "@/components/useSwipeToReveal";
import { useTransactionModal } from "./TransactionModal";
import { deleteTransaction } from "@/lib/actions/transactions";
import { CategoryBadge } from "@/lib/category-icon";
import { dateLabel, formatSignedYen } from "@/lib/format";
import type { TransactionWithCategory } from "@/lib/types";

export function TransactionItem({ tx }: { tx: TransactionWithCategory }) {
  const { openEdit } = useTransactionModal();
  const { offset, dragging, revealed, handlers, reset } = useSwipeToReveal();
  const [isPending, startTransition] = useTransition();

  const isIncome = tx.type === "income";
  const signed = isIncome ? tx.amount : -tx.amount;

  function onDelete() {
    if (!confirm("この取引を削除しますか？")) return;
    startTransition(async () => {
      await deleteTransaction(tx.id);
    });
  }

  function onRowClick() {
    if (revealed) {
      reset();
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
        {...handlers}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className="relative flex cursor-pointer items-center gap-3 bg-[var(--color-surface)] px-4 py-3"
      >
        <CategoryBadge name={tx.category?.name} />
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
