"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type TxFormState,
} from "@/lib/actions/transactions";
import { ChevronDown } from "lucide-react";
import { todayDate } from "@/lib/format";
import type { Category, TransactionWithCategory, TxType } from "@/lib/types";
import { Calculator } from "./Calculator";

type Props = {
  categories: Category[];
  initial?: TransactionWithCategory | null;
  onDone: () => void;
};

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

export function TransactionForm({ categories, initial, onDone }: Props) {
  const isEdit = !!initial;
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category_id ?? ""
  );
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  // 新規登録時は電卓を開いた状態で開始し、すぐに数値入力できるようにする。
  const [calcOpen, setCalcOpen] = useState(!initial);

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
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      {/* 入力欄（上部・スクロール領域。横はみ出しは抑止） */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 pb-3">
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

      {/* 金額（タップで電卓を開閉。電卓の入力がここに即時反映される） */}
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

      {/* カテゴリ（選択リスト） */}
      <div className="relative">
        <select
          name="category_id"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 pr-10 text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
        >
          <option value="" disabled>
            カテゴリを選択
          </option>
          {visible.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
      </div>

      {/* 日付 */}
      <input
        type="date"
        name="date"
        required
        defaultValue={initial?.date ?? todayDate()}
        max={todayDate()}
        className="block h-12 w-full min-w-0 appearance-none rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
      />

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
      </div>

      {/* 保存フッター（常時表示） */}
      <div className="shrink-0 space-y-2 border-t border-[var(--color-line)] px-5 py-3">
        <SaveButton />

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
      </div>

      {/* 電卓パネル（下部ドッキング） */}
      {calcOpen && (
        <Calculator
          value={amount}
          onChange={setAmount}
          onClose={() => setCalcOpen(false)}
        />
      )}
    </form>
  );
}
