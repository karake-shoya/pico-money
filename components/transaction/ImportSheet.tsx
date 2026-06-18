"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
  parseCsvRows,
  parseMfCsvRows,
  mapMfRowsToPreview,
  type ImportPreviewRow,
  type ImportTxInput,
} from "@/lib/csv";
import { importTransactions, type ImportFormState } from "@/lib/actions/csv";
import { CategoryBadge } from "@/lib/category-icon";
import { formatYen, dateLabel } from "@/lib/format";
import type { Category } from "@/lib/types";

function ImportButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="h-12 w-full rounded-xl bg-[var(--color-brand)] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "インポート中…" : "インポート"}
    </button>
  );
}

export function ImportSheet({
  csvText,
  categories,
  onClose,
}: {
  csvText: string;
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const { parseResult, skippedTransfers } = useMemo(() => {
    const rows = parseCsvRows(csvText);
    const parsed = parseMfCsvRows(rows);
    if (!parsed.ok) return { parseResult: parsed, skippedTransfers: 0 };
    const skipped = parsed.rows.filter((r) => r.transfer === "1").length;
    const mapped = mapMfRowsToPreview(parsed.rows, categories);
    return { parseResult: mapped, skippedTransfers: skipped };
  }, [csvText, categories]);

  const [overrides, setOverrides] = useState<Record<number, string>>({});

  function setCategoryOverride(rowIndex: number, categoryId: string) {
    setOverrides((prev) => ({ ...prev, [rowIndex]: categoryId }));
  }

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const resolvedRows: (ImportPreviewRow & { resolvedCategoryId: string | null })[] =
    useMemo(() => {
      if (!parseResult.ok) return [];
      return parseResult.rows.map((row) => ({
        ...row,
        resolvedCategoryId: overrides[row.rowIndex] ?? row.categoryId,
      }));
    }, [parseResult, overrides]);

  const allResolved = resolvedRows.every((r) => r.resolvedCategoryId !== null);

  const [state, formAction] = useActionState<ImportFormState, FormData>(
    async (prev, formData) => {
      const result = await importTransactions(prev, formData);
      if (result && "ok" in result) {
        router.refresh();
        onClose();
      }
      return result;
    },
    null,
  );

  const errorMsg = state && "error" in state ? state.error : null;

  const importDataJson = useMemo(() => {
    const data: ImportTxInput[] = resolvedRows
      .filter((r) => r.resolvedCategoryId !== null)
      .map((r) => ({
        date: r.date,
        type: r.type,
        category_id: r.resolvedCategoryId!,
        amount: r.amount,
        memo: r.memo,
      }));
    return JSON.stringify(data);
  }, [resolvedRows]);

  if (!parseResult.ok) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="absolute inset-0 bg-black/40"
        />
        <div className="relative mx-auto flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
          <div className="shrink-0 px-5 pb-2 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
            <h2 className="text-center text-base font-bold">CSVインポート</h2>
          </div>
          <div className="px-5 py-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[var(--color-expense)]" />
            <p className="text-sm text-[var(--color-expense)]">{parseResult.error}</p>
          </div>
          <div className="shrink-0 border-t border-[var(--color-line)] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="h-12 w-full rounded-xl border border-[var(--color-line)] font-semibold transition active:scale-[0.99]"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <form
        action={formAction}
        className="relative mx-auto flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
      >
        <input type="hidden" name="csv_data" value={importDataJson} />

        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
          <h2 className="text-center text-base font-bold">CSVインポート</h2>
          <p className="mt-1 text-center text-xs text-[var(--color-muted)]">
            {resolvedRows.length}件をインポート
            {skippedTransfers > 0 && `（振替${skippedTransfers}件はスキップ）`}
          </p>
        </div>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-3">
          {resolvedRows.map((row) => {
            const isOverridden = row.rowIndex in overrides;
            const matched = row.resolvedCategoryId !== null;
            const matchedCat = matched
              ? categoryMap.get(row.resolvedCategoryId!)
              : null;

            return (
              <li
                key={row.rowIndex}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2"
              >
                {matched && matchedCat ? (
                  <CategoryBadge
                    name={matchedCat.name}
                    className="h-8 w-8 shrink-0"
                    iconClassName="h-[18px] w-[18px]"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-expense)]/20">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-expense)]" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {matchedCat?.name ?? row.categoryName}
                    </span>
                    <span
                      className={`tabular shrink-0 text-sm font-semibold ${
                        row.type === "income"
                          ? "text-[var(--color-income)]"
                          : "text-[var(--color-expense)]"
                      }`}
                    >
                      {row.type === "income" ? "+" : "-"}
                      {formatYen(row.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span>{dateLabel(row.date)}</span>
                    {row.memo && <span className="truncate">・ {row.memo}</span>}
                  </div>

                  {(isOverridden || !matched) && (
                    <select
                      value={overrides[row.rowIndex] ?? ""}
                      onChange={(e) =>
                        setCategoryOverride(row.rowIndex, e.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--color-expense)]/40 bg-[var(--color-surface)] px-2 py-1 text-xs outline-none"
                    >
                      <option value="" disabled>
                        カテゴリを選択…
                      </option>
                      {categories
                        .filter((c) => c.type === row.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {matched && !isOverridden && (
                  <CheckCircle className="h-4 w-4 shrink-0 text-[var(--color-income)]" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-line)] px-5 py-3">
          {errorMsg && (
            <p className="text-sm text-[var(--color-expense)]">{errorMsg}</p>
          )}
          {!allResolved && (
            <p className="text-center text-xs text-[var(--color-expense)]">
              すべての行にカテゴリを割り当ててください
            </p>
          )}
          <ImportButton disabled={!allResolved} />
        </div>
      </form>
    </div>
  );
}
