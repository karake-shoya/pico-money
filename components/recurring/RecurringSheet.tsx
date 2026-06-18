"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createRecurring,
  updateRecurring,
  type RecurringFormState,
} from "@/lib/actions/recurring";
import { ChevronDown, Trash2, X } from "lucide-react";
import { CategoryBadge } from "@/lib/category-icon";
import { deleteRecurring } from "@/lib/actions/recurring";
import type { Category, RecurringWithCategory, TxType } from "@/lib/types";
import { Calculator } from "@/components/transaction/Calculator";
import { CategoryPicker } from "@/components/transaction/CategoryPicker";

function defaultCategoryId(categories: Category[]): string {
  return (
    categories.find((c) => c.type === "expense" && c.name === "食費")?.id ?? ""
  );
}

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

export function RecurringSheet({
  categories,
  initial,
  onDone,
  onClose,
}: {
  categories: Category[];
  initial: RecurringWithCategory | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(
    () => initial?.category_id ?? defaultCategoryId(categories),
  );
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [day, setDay] = useState<number>(initial?.day ?? 1);
  const [calcOpen, setCalcOpen] = useState(!initial);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const visible = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const action = isEdit
    ? updateRecurring.bind(null, initial!.id)
    : createRecurring;

  const [state, formAction] = useActionState<RecurringFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result && "ok" in result) {
        router.refresh();
        onDone();
      }
      return result;
    },
    null,
  );

  function changeType(next: TxType) {
    setType(next);
    const stillValid = categories.some(
      (c) => c.id === categoryId && c.type === next,
    );
    if (!stillValid) setCategoryId("");
  }

  function handleDelete() {
    if (!initial) return;
    if (!confirm("この固定費を削除しますか？")) return;
    startDelete(async () => {
      await deleteRecurring(initial.id);
      router.refresh();
      onDone();
    });
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const errorMsg = state && "error" in state ? state.error : null;
  const selectedCat = categories.find((c) => c.id === categoryId) ?? null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative mx-auto flex h-[94dvh] max-h-[94dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
          <div className="relative flex h-8 items-center justify-center">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="この固定費を削除"
                className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-base font-bold">
              {isEdit ? "固定費を編集" : "固定費を追加"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-bg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form action={formAction} className="relative flex min-h-0 flex-1 flex-col">
          <div
            className={`min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 pt-1 ${
              calcOpen ? "pb-[320px]" : "pb-5"
            }`}
          >
            {/* 収入/支出タブ */}
            <input type="hidden" name="type" value={type} />
            <div className="-mx-5 -mt-1 grid grid-cols-2 border-b border-[var(--color-line)]">
              {(["expense", "income"] as const).map((t) => {
                const active = type === t;
                const activeColor =
                  t === "expense" ? "var(--color-expense)" : "var(--color-income)";
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(t)}
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

            {/* 金額 */}
            <input type="hidden" name="amount" value={amount > 0 ? amount : ""} />
            <button
              type="button"
              onClick={() => setCalcOpen((v) => !v)}
              className={`flex h-14 w-full items-center rounded-xl border bg-[var(--color-bg)] px-4 text-left transition active:scale-[0.99] ${
                calcOpen ? "border-[var(--color-brand)]" : "border-[var(--color-line)]"
              }`}
            >
              <span className="mr-1 text-xl text-[var(--color-muted)]">¥</span>
              <span
                className={`tabular w-full text-right text-3xl font-bold ${
                  amount > 0 ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"
                }`}
              >
                {amount > 0 ? amount.toLocaleString("ja-JP") : "0"}
              </span>
            </button>

            {/* カテゴリ */}
            <input type="hidden" name="category_id" value={categoryId} />
            <button
              type="button"
              onClick={() => setCatPickerOpen(true)}
              className="flex h-12 w-full items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-left transition active:scale-[0.99] focus:border-[var(--color-brand)]"
            >
              {selectedCat ? (
                <>
                  <CategoryBadge
                    name={selectedCat.name}
                    className="h-8 w-8"
                    iconClassName="h-[18px] w-[18px]"
                  />
                  <span className="flex-1 truncate font-medium">
                    {selectedCat.name}
                  </span>
                </>
              ) : (
                <span className="flex-1 text-[var(--color-muted)]">
                  カテゴリを選択
                </span>
              )}
              <ChevronDown className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />
            </button>

            {/* 毎月の日付 */}
            <input type="hidden" name="day" value={day} />
            <div className="flex h-12 items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4">
              <span className="flex-1 text-sm text-[var(--color-muted)]">毎月</span>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="h-full bg-transparent text-right text-base font-medium outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}日
                  </option>
                ))}
              </select>
            </div>

            {/* メモ */}
            <input
              type="text"
              name="memo"
              maxLength={100}
              defaultValue={initial?.memo ?? ""}
              placeholder="メモ（任意）"
              className="h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
            />

            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-expense)]">
                {errorMsg}
              </p>
            )}

            <SaveButton />
          </div>

          {calcOpen && (
            <div className="absolute inset-x-0 bottom-0 z-10 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
              <Calculator
                value={amount}
                onChange={setAmount}
                onClose={() => setCalcOpen(false)}
              />
            </div>
          )}

          {catPickerOpen && (
            <CategoryPicker
              categories={visible}
              selectedId={categoryId}
              onSelect={setCategoryId}
              onClose={() => setCatPickerOpen(false)}
            />
          )}
        </form>
      </div>
    </div>
  );
}
