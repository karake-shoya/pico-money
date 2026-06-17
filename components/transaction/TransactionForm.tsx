"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type TxFormState,
} from "@/lib/actions/transactions";
import { categoryIcon } from "@/lib/category-icon";
import { todayDate } from "@/lib/format";
import type { Category, TransactionWithCategory, TxType } from "@/lib/types";

type Props = {
  categories: Category[];
  initial?: TransactionWithCategory | null;
  onDone: () => void;
};

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-[var(--color-brand)] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "保存中…" : isEdit ? "更新する" : "登録する"}
    </button>
  );
}

export function TransactionForm({ categories, initial, onDone }: Props) {
  const isEdit = !!initial;
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category_id ?? ""
  );

  // 選択中の type に応じてカテゴリを絞り込み
  const visible = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  const action = isEdit
    ? updateTransaction.bind(null, initial!.id)
    : createTransaction;

  const [state, formAction] = useActionState<TxFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result && "ok" in result) onDone();
      return result;
    },
    null
  );

  // 削除（編集時のみ）。スワイプに依存しないボタン導線。
  const [isDeleting, startDelete] = useTransition();
  function handleDelete() {
    if (!initial) return;
    if (!confirm("この取引を削除しますか？")) return;
    startDelete(async () => {
      await deleteTransaction(initial.id);
      onDone();
    });
  }

  // type 切替時、選択中カテゴリが新 type に無ければクリア
  function changeType(next: TxType) {
    setType(next);
    const stillValid = categories.some(
      (c) => c.id === categoryId && c.type === next
    );
    if (!stillValid) setCategoryId("");
  }

  const errorMsg =
    state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="space-y-5">
      {/* 収入/支出トグル */}
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg)] p-1">
        <button
          type="button"
          onClick={() => changeType("expense")}
          className={`h-11 rounded-lg text-sm font-semibold transition ${
            type === "expense"
              ? "bg-[var(--color-expense)] text-white"
              : "text-[var(--color-muted)]"
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => changeType("income")}
          className={`h-11 rounded-lg text-sm font-semibold transition ${
            type === "income"
              ? "bg-[var(--color-income)] text-white"
              : "text-[var(--color-muted)]"
          }`}
        >
          収入
        </button>
      </div>

      {/* 金額 */}
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--color-muted)]">
          金額（円）
        </span>
        <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4">
          <span className="mr-1 text-lg text-[var(--color-muted)]">¥</span>
          <input
            type="number"
            name="amount"
            required
            min={1}
            step={1}
            inputMode="numeric"
            defaultValue={initial?.amount ?? ""}
            placeholder="0"
            className="tabular h-12 w-full bg-transparent text-right text-xl font-semibold outline-none"
          />
        </div>
      </label>

      {/* 日付 */}
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--color-muted)]">
          日付
        </span>
        <input
          type="date"
          name="date"
          required
          defaultValue={initial?.date ?? todayDate()}
          max={todayDate()}
          className="h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
        />
      </label>

      {/* カテゴリ */}
      <div>
        <span className="mb-1 block text-sm text-[var(--color-muted)]">
          カテゴリ
        </span>
        <input type="hidden" name="category_id" value={categoryId} />
        <div className="grid grid-cols-4 gap-2">
          {visible.map((c) => {
            const Icon = categoryIcon(c.name);
            const selected = categoryId === c.id;
            return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-xs transition ${
                selected
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <span className="leading-tight">{c.name}</span>
            </button>
            );
          })}
        </div>
      </div>

      {/* メモ */}
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--color-muted)]">
          メモ（任意）
        </span>
        <input
          type="text"
          name="memo"
          maxLength={100}
          defaultValue={initial?.memo ?? ""}
          placeholder="例: ランチ"
          className="h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
        />
      </label>

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-expense)]">
          {errorMsg}
        </p>
      )}

      <SaveButton isEdit={isEdit} />

      {isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-11 w-full rounded-xl text-sm font-semibold text-[var(--color-expense)] transition active:scale-[0.99] disabled:opacity-60"
        >
          {isDeleting ? "削除中…" : "この取引を削除"}
        </button>
      )}
    </form>
  );
}
