"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { generateMfCsv } from "@/lib/csv";
import { ImportSheet } from "./ImportSheet";
import type { Category, TransactionWithCategory } from "@/lib/types";

export function CsvButtons({
  transactions,
  month,
  categories,
}: {
  transactions: TransactionWithCategory[];
  month: string;
  categories: Category[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState<string | null>(null);

  function handleExport() {
    const csv = generateMfCsv(transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pico-money_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        aria-label="CSVエクスポート"
      >
        <Download className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        aria-label="CSVインポート"
      >
        <Upload className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {csvText !== null && (
        <ImportSheet
          csvText={csvText}
          categories={categories}
          onClose={() => setCsvText(null)}
        />
      )}
    </>
  );
}
