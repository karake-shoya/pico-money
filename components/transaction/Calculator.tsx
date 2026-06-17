"use client";

import { useState } from "react";
import { Check, Delete, X } from "lucide-react";

type Op = "+" | "-" | "×" | "÷";

function calc(a: number, op: Op, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? 0 : a / b;
  }
}

// 表示用フォーマット。整数は桁区切り、小数（割り算の結果など）は最大2桁まで。
function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n)
    ? n.toLocaleString("ja-JP")
    : n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

// 金額入力用の電卓。数値と四則演算を入力でき、確定時に整数（円）へ丸めて返す。
// 携帯電卓と同様、保留中の演算子を1つ持つ逐次計算方式。
export function Calculator({
  initial,
  onConfirm,
  onClose,
}: {
  initial: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}) {
  // 入力中の数値（文字列）
  const [entry, setEntry] = useState<string>(
    initial > 0 ? String(initial) : "0"
  );
  const [acc, setAcc] = useState<number | null>(null); // 累積値
  const [op, setOp] = useState<Op | null>(null); // 保留中の演算子
  const [fresh, setFresh] = useState(true); // 次の数字入力で entry を置き換えるか

  function inputDigit(d: string) {
    if (fresh) {
      setEntry(d === "00" ? "0" : d);
      setFresh(false);
      return;
    }
    setEntry((prev) => {
      if (prev === "0") return d === "00" ? "0" : d;
      if (prev.replace("-", "").length >= 12) return prev; // 桁数上限
      return prev + d;
    });
  }

  function backspace() {
    if (fresh) return;
    setEntry((prev) => {
      const next = prev.slice(0, -1);
      return next === "" || next === "-" ? "0" : next;
    });
  }

  function clearAll() {
    setEntry("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  function chooseOp(nextOp: Op) {
    const current = Number(entry);
    if (acc !== null && op && !fresh) {
      const result = calc(acc, op, current);
      setAcc(result);
      setEntry(String(result));
    } else if (acc === null) {
      setAcc(current);
    }
    setOp(nextOp);
    setFresh(true);
  }

  // 保留中の演算を確定して結果値を返す（= や 確定 で使用）
  function evaluate(): number {
    const current = Number(entry);
    if (acc !== null && op) {
      const result = calc(acc, op, current);
      setEntry(String(result));
      setAcc(null);
      setOp(null);
      setFresh(true);
      return result;
    }
    return current;
  }

  function confirm() {
    const value = evaluate();
    // 金額は正の整数（円）。マイナスや小数は丸めて 0 未満は 0 に。
    onConfirm(Math.max(0, Math.round(value)));
  }

  const keyBase =
    "flex h-14 items-center justify-center rounded-xl text-xl font-semibold transition active:scale-95";
  const numKey = `${keyBase} bg-[var(--color-bg)] text-[var(--color-ink)]`;
  const opKey = `${keyBase} bg-[var(--color-brand-soft)] text-[var(--color-brand)]`;

  const OPS: Op[] = ["÷", "×", "-", "+"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--color-surface)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />

        {/* 表示部 */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
          <span className="text-sm text-[var(--color-muted)]">
            {acc !== null && op ? `${fmt(acc)} ${op}` : "金額"}
          </span>
          <span className="tabular truncate text-2xl font-bold">
            ¥{fmt(Number(entry))}
          </span>
        </div>

        {/* キーパッド：左3列が数字、右1列が演算子 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-3 grid grid-cols-3 gap-2">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => inputDigit(d)}
                className={numKey}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className={`${keyBase} bg-[var(--color-bg)] text-[var(--color-expense)]`}
            >
              C
            </button>
            <button
              type="button"
              onClick={() => inputDigit("0")}
              className={numKey}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => inputDigit("00")}
              className={numKey}
            >
              00
            </button>
          </div>

          <div className="grid grid-rows-5 gap-2">
            <button
              type="button"
              onClick={backspace}
              aria-label="一文字削除"
              className={`${keyBase} bg-[var(--color-bg)] text-[var(--color-muted)]`}
            >
              <Delete className="h-5 w-5" />
            </button>
            {OPS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => chooseOp(o)}
                className={`${opKey} ${op === o ? "ring-2 ring-[var(--color-brand)]" : ""}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* アクション */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-bg)] font-semibold text-[var(--color-muted)] transition active:scale-[0.99]"
          >
            <X className="h-5 w-5" />
            キャンセル
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand)] font-semibold text-white transition active:scale-[0.99]"
          >
            <Check className="h-5 w-5" />
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
