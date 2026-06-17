"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type TxFormState,
} from "@/lib/actions/transactions";
import { categoryColor, categoryIcon } from "@/lib/category-icon";
import { todayDate } from "@/lib/format";
import type { Category, TransactionWithCategory, TxType } from "@/lib/types";
import { Calculator } from "./Calculator";

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
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [calcOpen, setCalcOpen] = useState(false);

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
      {/* 収入/支出タブ（タップで切替） */}
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
              {/* アクティブ下線インジケータ */}
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                style={{ background: active ? activeColor : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {/* 金額（タップで電卓を表示） */}
      <div>
        <span className="mb-1 block text-sm text-[var(--color-muted)]">
          金額（円）
        </span>
        <input type="hidden" name="amount" value={amount > 0 ? amount : ""} />
        <button
          type="button"
          onClick={() => setCalcOpen(true)}
          className="flex h-12 w-full items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 text-left transition active:scale-[0.99]"
        >
          <span className="mr-1 text-lg text-[var(--color-muted)]">¥</span>
          <span
            className={`tabular w-full text-right text-xl font-semibold ${
              amount > 0 ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"
            }`}
          >
            {amount > 0 ? amount.toLocaleString("ja-JP") : "0"}
          </span>
        </button>
      </div>

      {calcOpen && (
        <Calculator
          initial={amount}
          onConfirm={(value) => {
            setAmount(value);
            setCalcOpen(false);
          }}
          onClose={() => setCalcOpen(false)}
        />
      )}

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
              <Icon
                className="h-5 w-5"
                strokeWidth={1.8}
                style={selected ? undefined : { color: categoryColor(c.name) }}
              />
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
