"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveBudgets, type BudgetFormState } from "@/lib/actions/budgets";
import { BottomSheet } from "@/components/BottomSheet";
import { SaveButton } from "@/components/SaveButton";
import { CategoryBadge } from "@/lib/category-icon";
import type { Category } from "@/lib/types";

export function BudgetSheet({
  categories,
  budgets,
  onClose,
}: {
  categories: Category[];
  budgets: Record<string, number>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<BudgetFormState, FormData>(
    async (prev, formData) => {
      const result = await saveBudgets(prev, formData);
      if (result && "ok" in result) {
        router.refresh();
        onClose();
      }
      return result;
    },
    null
  );

  const errorMsg = state && "error" in state ? state.error : null;

  return (
    <BottomSheet onClose={onClose} height="85dvh" title="月の予算（カテゴリ別）" zIndex={50}>
      <form
        action={formAction}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-3">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-1.5">
              <CategoryBadge name={c.name} className="h-8 w-8" iconClassName="h-[18px] w-[18px]" />
              <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
              <div className="flex items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-2.5">
                <span className="mr-1 text-sm text-[var(--color-muted)]">¥</span>
                <input
                  type="text"
                  name={`budget_${c.id}`}
                  inputMode="numeric"
                  defaultValue={budgets[c.id] ? String(budgets[c.id]) : ""}
                  placeholder="0"
                  className="tabular h-10 w-24 bg-transparent text-right text-base outline-none"
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-line)] px-5 py-3">
          {errorMsg && (
            <p className="text-sm text-[var(--color-expense)]">{errorMsg}</p>
          )}
          <SaveButton />
        </div>
      </form>
    </BottomSheet>
  );
}
