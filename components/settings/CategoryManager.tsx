"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { CategoryBadge } from "@/lib/category-icon";
import { CategorySheet } from "./CategorySheet";
import type { Category, TxType } from "@/lib/types";

export function CategoryManager({
  categories,
}: {
  categories: Category[];
}) {
  const [type, setType] = useState<TxType>("expense");
  const [editing, setEditing] = useState<Category | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const visible = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(cat: Category) {
    setEditing(cat);
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">カテゴリ管理</h2>
        <button
          type="button"
          onClick={openNew}
          className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-4 text-sm font-semibold text-white transition active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          追加
        </button>
      </div>

      {/* 支出/収入タブ */}
      <div className="grid grid-cols-2 border-b border-[var(--color-line)]">
        {(["expense", "income"] as const).map((t) => {
          const active = type === t;
          const activeColor =
            t === "expense" ? "var(--color-expense)" : "var(--color-income)";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="relative h-12 text-sm font-semibold transition"
              style={{
                color: active ? activeColor : "var(--color-muted)",
              }}
            >
              {t === "expense" ? "支出" : "収入"}
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                style={{ background: active ? activeColor : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {/* カテゴリ一覧 */}
      {visible.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center">
          <p className="text-[var(--color-muted)]">
            カテゴリがありません
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const isDefault = c.is_default;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => !isDefault && openEdit(c)}
                  disabled={isDefault}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-3 text-left transition ${
                    isDefault
                      ? "cursor-default"
                      : "active:bg-[var(--color-bg)]"
                  }`}
                >
                  <CategoryBadge
                    name={c.name}
                    className="h-9 w-9"
                    iconClassName="h-5 w-5"
                  />
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  {isDefault ? (
                    <span className="shrink-0 text-xs text-[var(--color-muted)]">
                      デフォルト
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* 追加/編集シート */}
      {sheetOpen && (
        <CategorySheet
          type={type}
          initial={editing}
          onDone={closeSheet}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
