"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Category, TransactionSearchFilters, TxType } from "@/lib/types";

type TypeFilter = TxType | "all";

// 取引の横断検索フォーム。submit 時に /search?... へ遷移し、サーバー側で再取得する。
// 既存の絞り込み値は searchParams から復元する（initial）。
export function SearchControls({
  categories,
  initial,
}: {
  categories: Category[];
  initial: TransactionSearchFilters;
}) {
  const router = useRouter();
  const [type, setType] = useState<TypeFilter>(initial.type ?? "all");
  const [categoryId, setCategoryId] = useState<string>(initial.categoryId ?? "");

  // 種別を切り替えたら、その種別に合わないカテゴリ選択は解除する。
  function onChangeType(next: TypeFilter) {
    setType(next);
    if (next !== "all") {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat && cat.type !== next) setCategoryId("");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const set = (key: string, value: string) => {
      const v = value.trim();
      if (v) params.set(key, v);
    };
    set("q", String(form.get("q") ?? ""));
    if (type !== "all") params.set("type", type);
    if (categoryId) params.set("cat", categoryId);
    set("from", String(form.get("from") ?? ""));
    set("to", String(form.get("to") ?? ""));
    set("min", String(form.get("min") ?? ""));
    set("max", String(form.get("max") ?? ""));
    router.replace(params.size > 0 ? `/search?${params}` : "/search");
  }

  function onClear() {
    setType("all");
    setCategoryId("");
    router.replace("/search");
  }

  // 種別フィルタに合わせて選択肢を出し分ける（全ては支出→収入の順）。
  const catOptions = categories.filter((c) =>
    type === "all" ? true : c.type === type,
  );

  const inputClass =
    "h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-base outline-none focus:border-[var(--color-brand)]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4"
    >
      {/* キーワード（メモ） */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="search"
          name="q"
          defaultValue={initial.keyword ?? ""}
          placeholder="メモで検索"
          className={`${inputClass} pl-9`}
        />
      </div>

      {/* 種別（全て / 支出 / 収入） */}
      <div className="grid grid-cols-3 gap-2">
        {(["all", "expense", "income"] as const).map((t) => {
          const active = type === t;
          const label = t === "all" ? "全て" : t === "expense" ? "支出" : "収入";
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChangeType(t)}
              className={`h-10 rounded-xl border text-sm font-semibold transition ${
                active
                  ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                  : "border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* カテゴリ */}
      <select
        name="cat"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className={inputClass}
      >
        <option value="">すべてのカテゴリ</option>
        {catOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.type === "income" ? "収入" : "支出"}・{c.name}
          </option>
        ))}
      </select>

      {/* 期間 */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          name="from"
          defaultValue={initial.dateFrom ?? ""}
          aria-label="開始日"
          className={`${inputClass} tabular`}
        />
        <span className="shrink-0 text-[var(--color-muted)]">〜</span>
        <input
          type="date"
          name="to"
          defaultValue={initial.dateTo ?? ""}
          aria-label="終了日"
          className={`${inputClass} tabular`}
        />
      </div>

      {/* 金額レンジ */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="min"
          inputMode="numeric"
          min={0}
          defaultValue={initial.amountMin ?? ""}
          placeholder="最小金額"
          aria-label="最小金額"
          className={`${inputClass} tabular`}
        />
        <span className="shrink-0 text-[var(--color-muted)]">〜</span>
        <input
          type="number"
          name="max"
          inputMode="numeric"
          min={0}
          defaultValue={initial.amountMax ?? ""}
          placeholder="最大金額"
          aria-label="最大金額"
          className={`${inputClass} tabular`}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClear}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-muted)] transition active:scale-95"
        >
          <X className="h-4 w-4" />
          クリア
        </button>
        <button
          type="submit"
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white transition active:scale-95"
        >
          <Search className="h-4 w-4" strokeWidth={2.4} />
          検索
        </button>
      </div>
    </form>
  );
}
