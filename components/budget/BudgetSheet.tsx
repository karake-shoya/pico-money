"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveBudgets, type BudgetFormState } from "@/lib/actions/budgets";
import { CategoryBadge } from "@/lib/category-icon";
import type { Category } from "@/lib/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-[var(--color-brand)] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "保存中…" : "保存"}
    </button>
  );
}

// カテゴリ別月予算の編集シート（ボトムシート）。
// 支出カテゴリを一覧し、各行に金額を入力。0/空は予算なし。まとめて保存する。
export function BudgetSheet({
  categories,
  budgets,
  onClose,
}: {
  categories: Category[]; // 支出カテゴリ
  budgets: Record<string, number>; // categoryId -> 予算額
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <form
        action={formAction}
        className="relative mx-auto flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
          <h2 className="text-center text-base font-bold">月の予算（カテゴリ別）</h2>
        </div>

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
    </div>
  );
}
