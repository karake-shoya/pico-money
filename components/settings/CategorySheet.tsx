"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryFormState,
} from "@/lib/actions/categories";
import type { Category, TxType } from "@/lib/types";

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

export function CategorySheet({
  type,
  initial,
  onDone,
  onClose,
}: {
  type: TxType;
  initial: Category | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [isDeleting, startDelete] = useTransition();

  const action = isEdit
    ? updateCategory.bind(null, initial!.id)
    : createCategory;

  const [state, formAction] = useActionState<CategoryFormState, FormData>(
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

  function handleDelete() {
    if (!initial) return;
    if (!confirm("このカテゴリを削除しますか？")) return;
    startDelete(async () => {
      const result = await deleteCategory(initial.id);
      if (result.error) {
        alert(result.error);
        return;
      }
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

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative mx-auto flex w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
          <div className="relative flex h-8 items-center justify-center">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="このカテゴリを削除"
                className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-base font-bold">
              {isEdit ? "カテゴリを編集" : "カテゴリを追加"}
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

        <form action={formAction} className="space-y-3 px-5 pb-5 pt-1">
          <input type="hidden" name="type" value={isEdit ? initial!.type : type} />

          <input
            type="text"
            name="name"
            maxLength={20}
            defaultValue={initial?.name ?? ""}
            placeholder="カテゴリ名"
            autoFocus
            className="h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
          />

          {errorMsg && (
            <p className="rounded-lg bg-red-50/10 px-3 py-2 text-sm text-[var(--color-expense)]">
              {errorMsg}
            </p>
          )}

          <SaveButton />
        </form>
      </div>
    </div>
  );
}
