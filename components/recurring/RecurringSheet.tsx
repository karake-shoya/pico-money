"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurring,
  updateRecurring,
  deleteRecurring,
  type RecurringFormState,
} from "@/lib/actions/recurring";
import { ChevronDown, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { SaveButton } from "@/components/SaveButton";
import { TypeTabs } from "@/components/TypeTabs";
import { CategoryBadge } from "@/lib/category-icon";
import {
  defaultCategoryId,
  type Category,
  type RecurringWithCategory,
  type TxType,
} from "@/lib/types";
import { Calculator } from "@/components/transaction/Calculator";
import { CategoryPicker } from "@/components/transaction/CategoryPicker";

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

  const errorMsg = state && "error" in state ? state.error : null;
  const selectedCat = categories.find((c) => c.id === categoryId) ?? null;

  return (
    <BottomSheet
      onClose={onClose}
      height="94dvh"
      fixedHeight
      title={isEdit ? "固定費を編集" : "固定費を追加"}
      headerLeft={
        isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="この固定費を削除"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        ) : undefined
      }
    >
      <form action={formAction} className="relative flex min-h-0 flex-1 flex-col">
        <div
          className={`min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 pt-1 ${
            calcOpen ? "pb-[320px]" : "pb-5"
          }`}
        >
          {/* 収入/支出タブ */}
          <input type="hidden" name="type" value={type} />
          <TypeTabs value={type} onChange={changeType} bordered />

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
    </BottomSheet>
  );
}
