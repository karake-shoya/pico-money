"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createTransaction,
  updateTransaction,
  type TxFormState,
} from "@/lib/actions/transactions";
import { ChevronDown } from "lucide-react";
import { SaveButton } from "@/components/SaveButton";
import { TypeTabs } from "@/components/TypeTabs";
import { CategoryBadge } from "@/lib/category-icon";
import { todayDate } from "@/lib/format";
import {
  defaultCategoryId,
  type Category,
  type TransactionWithCategory,
  type TxType,
} from "@/lib/types";
import { Calculator } from "./Calculator";
import { CategoryPicker } from "./CategoryPicker";

type Props = {
  categories: Category[];
  initial?: TransactionWithCategory | null;
  onDone: () => void;
};

export function TransactionForm({ categories, initial, onDone }: Props) {
  const isEdit = !!initial;
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string>(
    () => initial?.category_id ?? defaultCategoryId(categories)
  );
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  // 新規登録時は電卓を開いた状態で開始し、すぐに数値入力できるようにする。
  const [calcOpen, setCalcOpen] = useState(!initial);
  const [catPickerOpen, setCatPickerOpen] = useState(false);

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

  const selectedCat = categories.find((c) => c.id === categoryId) ?? null;

  return (
    <form action={formAction} className="relative flex min-h-0 flex-1 flex-col">
      {/* 入力欄（スクロール領域。横はみ出しは抑止）。
          電卓表示中は下部の余白を広げ、保存ボタンが電卓の上までスクロールできるようにする。 */}
      <div
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 pt-1 ${
          calcOpen ? "pb-[320px]" : "pb-5"
        }`}
      >
      {/* 収入/支出タブ（タップで切替） */}
      <input type="hidden" name="type" value={type} />
      <TypeTabs value={type} onChange={changeType} bordered />

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

      {/* カテゴリ（アイコン付きのピッカーで選択） */}
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

      {/* 日付 */}
      <input
        type="date"
        name="date"
        required
        defaultValue={initial?.date ?? todayDate()}
        max={todayDate()}
        className="date-field h-12 w-full min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 text-base outline-none focus:border-[var(--color-brand)]"
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

      {/* 保存ボタン（メモの下）。削除はヘッダー左上のゴミ箱から行う。 */}
      <SaveButton />
      </div>

      {/* 電卓パネル（下部にオーバーレイで重ねる） */}
      {calcOpen && (
        <div className="absolute inset-x-0 bottom-0 z-10 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
          <Calculator
            value={amount}
            onChange={setAmount}
            onClose={() => setCalcOpen(false)}
          />
        </div>
      )}

      {/* カテゴリ選択シート */}
      {catPickerOpen && (
        <CategoryPicker
          categories={visible}
          selectedId={categoryId}
          onSelect={setCategoryId}
          onClose={() => setCatPickerOpen(false)}
        />
      )}
    </form>
  );
}
