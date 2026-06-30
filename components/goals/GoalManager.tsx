"use client";

import { useState } from "react";
import { Plus, PiggyBank } from "lucide-react";
import { useTransactionModal } from "@/components/transaction/TransactionModal";
import { GoalSheet } from "./GoalSheet";
import { formatYen } from "@/lib/format";
import type { SavingsGoal, SavingsGoalWithProgress } from "@/lib/types";

export function GoalManager({ goals }: { goals: SavingsGoalWithProgress[] }) {
  const { openContribute } = useTransactionModal();
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">目標貯金</h1>
        <button
          type="button"
          onClick={openNew}
          className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-4 text-sm font-semibold text-white transition active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          追加
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-12 text-center text-sm text-[var(--color-muted)]">
          目標がまだありません。
          <br />
          「追加」から貯金の目標を作りましょう。
        </div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const achieved = g.saved >= g.target_amount;
            return (
              <li
                key={g.id}
                className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                    <PiggyBank className="h-5 w-5 text-[var(--color-brand)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="truncate text-left font-bold"
                    >
                      {g.name}
                    </button>
                    {g.deadline && (
                      <div className="text-xs text-[var(--color-muted)]">
                        期限 {g.deadline}
                      </div>
                    )}
                  </div>
                  <span className="tabular shrink-0 text-sm font-semibold">
                    {g.percent}%
                  </span>
                </div>

                {/* 進捗バー */}
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${g.percent}%`,
                      background: achieved
                        ? "var(--color-income)"
                        : "var(--color-brand)",
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tabular text-[var(--color-muted)]">
                    {formatYen(g.saved)} / {formatYen(g.target_amount)}
                  </span>
                  <span className="tabular text-[var(--color-muted)]">
                    {achieved ? "達成！" : `残り ${formatYen(g.remaining)}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openContribute({ id: g.id, name: g.name })}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white transition active:scale-[0.99]"
                >
                  <PiggyBank className="h-4 w-4" strokeWidth={2.2} />
                  貯金する
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="px-1 text-center text-xs text-[var(--color-muted)]">
        「貯金する」は支出として記録され、残高が減ります。
        <br />
        支出総額・グラフ・貯蓄率には含まれません。
      </p>

      {sheetOpen && (
        <GoalSheet
          initial={editing}
          onDone={() => setSheetOpen(false)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
