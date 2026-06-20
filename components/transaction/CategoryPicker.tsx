"use client";

import { Check } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { CategoryBadge } from "@/lib/category-icon";
import type { Category } from "@/lib/types";

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
    <BottomSheet onClose={onClose} height="70dvh" title="カテゴリを選択" zIndex={50}>
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
    </BottomSheet>
  );
}
