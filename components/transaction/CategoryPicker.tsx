"use client";

import { Check } from "lucide-react";
import { CategoryBadge } from "@/lib/category-icon";
import type { Category } from "@/lib/types";

// カテゴリ選択シート（モーダル上のボトムシート）。
// 色付きアイコンバッジ付きで一覧表示し、タップで選択する。
export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onClose,
}: {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative mx-auto flex max-h-[70dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
          <h2 className="text-center text-base font-bold">カテゴリを選択</h2>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {categories.map((c) => {
            const selected = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(c.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition active:bg-[var(--color-bg)] ${
                    selected ? "bg-[var(--color-bg)]" : ""
                  }`}
                >
                  <CategoryBadge name={c.name} className="h-9 w-9" iconClassName="h-5 w-5" />
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  {selected && (
                    <Check className="h-5 w-5 shrink-0 text-[var(--color-brand)]" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
