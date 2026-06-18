"use client";

import { useMemo, useState } from "react";
import { RecurringItem } from "./RecurringItem";
import { RecurringSheet } from "./RecurringSheet";
import { formatYen } from "@/lib/format";
import type { Category, RecurringWithCategory } from "@/lib/types";
import { Plus } from "lucide-react";

export function RecurringList({
  items,
  categories,
}: {
  items: RecurringWithCategory[];
  categories: Category[];
}) {
  const [editing, setEditing] = useState<RecurringWithCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalExpense = useMemo(
    () =>
      items
        .filter((i) => i.enabled && i.type === "expense")
        .reduce((sum, i) => sum + i.amount, 0),
    [items],
  );
  const totalIncome = useMemo(
    () =>
      items
        .filter((i) => i.enabled && i.type === "income")
        .reduce((sum, i) => sum + i.amount, 0),
    [items],
  );

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(item: RecurringWithCategory) {
    setEditing(item);
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--color-muted)]">
            {items.length}件の固定費
          </p>
          <div className="flex gap-3 text-sm">
            {totalExpense > 0 && (
              <span className="text-[var(--color-expense)]">
                支出 {formatYen(totalExpense)}
              </span>
            )}
            {totalIncome > 0 && (
              <span className="text-[var(--color-income)]">
                収入 {formatYen(totalIncome)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-4 text-sm font-semibold text-white transition active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          追加
        </button>
      </div>

      {/* 一覧 */}
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center">
          <p className="text-[var(--color-muted)]">
            固定費を登録すると毎月自動で入力されます
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <RecurringItem key={item.id} item={item} onEdit={openEdit} />
          ))}
        </ul>
      )}

      {/* 追加/編集シート */}
      {sheetOpen && (
        <RecurringSheet
          categories={categories}
          initial={editing}
          onDone={closeSheet}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
