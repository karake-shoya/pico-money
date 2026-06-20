"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryFormState,
} from "@/lib/actions/categories";
import { BottomSheet } from "@/components/BottomSheet";
import { SaveButton } from "@/components/SaveButton";
import type { Category, TxType } from "@/lib/types";

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

  const errorMsg = state && "error" in state ? state.error : null;

  return (
    <BottomSheet
      onClose={onClose}
      title={isEdit ? "カテゴリを編集" : "カテゴリを追加"}
      headerLeft={
        isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="このカテゴリを削除"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        ) : undefined
      }
    >
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
    </BottomSheet>
  );
}
