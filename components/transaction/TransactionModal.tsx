"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { TransactionForm } from "./TransactionForm";
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

      {/* FAB（下部固定の + ボタン）。下部ナビの上・中央に配置し片手操作しやすくする。 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex justify-center">
        <button
          type="button"
          onClick={openNew}
          aria-label="取引を登録"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] pb-1 text-3xl leading-none text-white shadow-lg transition active:scale-95"
        >
          +
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
          <div className="relative mx-auto max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
            <div className="sticky top-0 -mx-5 mb-2 bg-[var(--color-surface)] px-5 pb-3 pt-1">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editing ? "取引を編集" : "取引を登録"}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-[var(--color-muted)]"
                >
                  閉じる
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
