"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  type GoalFormState,
} from "@/lib/actions/goals";
import { BottomSheet } from "@/components/BottomSheet";
import { SaveButton } from "@/components/SaveButton";
import type { SavingsGoal } from "@/lib/types";

export function GoalSheet({
  initial,
  onDone,
  onClose,
}: {
  initial: SavingsGoal | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [isDeleting, startDelete] = useTransition();

  const action = isEdit ? updateGoal.bind(null, initial!.id) : createGoal;

  const [state, formAction] = useActionState<GoalFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result && "ok" in result) {
        router.refresh();
        onDone();
      }
      return result;
    },
    null
  );

  function handleDelete() {
    if (!initial) return;
    if (
      !confirm(
        "この目標を削除しますか？この目標への貯金（取引）も削除され、その分の残高は戻ります。"
      )
    )
      return;
    startDelete(async () => {
      const result = await deleteGoal(initial.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  const errorMsg = state && "error" in state ? state.error : null;

  const inputClass =
    "h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]";

  return (
    <BottomSheet
      onClose={onClose}
      title={isEdit ? "目標を編集" : "目標を追加"}
      headerLeft={
        isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="この目標を削除"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-expense)] transition active:bg-[var(--color-bg)] disabled:opacity-60"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        ) : undefined
      }
    >
      <form action={formAction} className="space-y-3 px-5 pb-5 pt-1">
        <label className="block text-sm font-medium text-[var(--color-muted)]">
          目標名
          <input
            type="text"
            name="name"
            maxLength={20}
            defaultValue={initial?.name ?? ""}
            placeholder="例：旅行、新しいPC"
            autoFocus
            className={`mt-1 ${inputClass}`}
          />
        </label>

        <label className="block text-sm font-medium text-[var(--color-muted)]">
          目標額（円）
          <input
            type="number"
            name="target_amount"
            inputMode="numeric"
            min={1}
            defaultValue={initial?.target_amount ?? ""}
            placeholder="300000"
            className={`tabular mt-1 ${inputClass}`}
          />
        </label>

        <label className="block text-sm font-medium text-[var(--color-muted)]">
          期限（任意）
          <input
            type="date"
            name="deadline"
            defaultValue={initial?.deadline ?? ""}
            className={`date-field tabular mt-1 ${inputClass}`}
          />
        </label>

        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-expense)]">
            {errorMsg}
          </p>
        )}

        <SaveButton />
      </form>
    </BottomSheet>
  );
}
