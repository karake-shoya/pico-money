"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { TransactionForm } from "./TransactionForm";
import { deleteTransaction } from "@/lib/actions/transactions";
import type { Category, TransactionWithCategory } from "@/lib/types";

type ModalContextValue = {
  // 新規登録モーダルを開く
  openNew: () => void;
  // 編集モーダルを開く
  openEdit: (tx: TransactionWithCategory) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useTransactionModal() {
  const ctx = useContext(ModalContext);
  if (!ctx)
    throw new Error("useTransactionModal は Provider 内で使用してください");
  return ctx;
}

// アプリ全体に取引モーダルと FAB を提供する。
export function TransactionModalProvider({
  categories,
  children,
}: {
  categories: Category[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null);

  const openNew = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);
  const openEdit = useCallback((tx: TransactionWithCategory) => {
    setEditing(tx);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  // 削除（編集時のみ）。ヘッダー左上のゴミ箱から実行する。
  const [isDeleting, startDelete] = useTransition();
  function handleDelete() {
    if (!editing) return;
    if (!confirm("この取引を削除しますか？")) return;
    startDelete(async () => {
      await deleteTransaction(editing.id);
      handleDone();
    });
  }

  // モーダル表示中は背面スクロールを止める
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleDone() {
    setOpen(false);
    router.refresh(); // サーバーデータを再取得
  }

  return (
    <ModalContext.Provider value={{ openNew, openEdit }}>
      {children}

      {/* FAB（下部固定の + ボタン）。下部ナビの上・右端に配置し片手操作しやすくする。 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[480px] justify-end px-4">
        <button
          type="button"
          onClick={openNew}
          aria-label="取引を登録"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-lg shadow-[var(--color-brand)]/30 transition active:scale-95"
        >
          <Plus className="h-7 w-7" strokeWidth={2.4} />
        </button>
      </div>

      {/* ボトムシート モーダル */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative mx-auto flex h-[94dvh] max-h-[94dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
            <div className="shrink-0 px-5 pb-2 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
              {/* タイトルを中央に、削除（編集時）を左端・閉じるを右端に配置 */}
              <div className="relative flex h-8 items-center justify-center">
                {editing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    aria-label="この取引を削除"
                    className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-base font-bold">
                  {editing ? "編集" : "入力"}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="閉じる"
                  className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-bg)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <TransactionForm
              key={editing?.id ?? "new"}
              categories={categories}
              initial={editing}
              onDone={handleDone}
            />
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
