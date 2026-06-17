"use client";

import { useState } from "react";
import { ChevronDown, Delete } from "lucide-react";

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

// 金額入力用の電卓パネル（モーダル下部にドッキング）。
// 入力のたびに onChange で親へ値を反映し、上部の金額欄がリアルタイムに更新される。
// 携帯電卓と同様、保留中の演算子を1つ持つ逐次計算方式。金額は整数（円）へ丸める。
export function Calculator({
  value,
  onChange,
  onClose,
}: {
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState<string>(value > 0 ? String(value) : "0");
  const [acc, setAcc] = useState<number | null>(null); // 累積値
  const [op, setOp] = useState<Op | null>(null); // 保留中の演算子
  const [fresh, setFresh] = useState(true); // 次の数字入力で entry を置き換えるか

  // 親へ整数（円）で通知。マイナス・小数は丸めて 0 未満は 0 に。
  const report = (v: number) => onChange(Math.max(0, Math.round(v)));

  function inputDigit(d: string) {
    let next: string;
    if (fresh) {
      next = d === "00" ? "0" : d;
      setFresh(false);
    } else if (entry === "0") {
      next = d === "00" ? "0" : d;
    } else if (entry.replace("-", "").length >= 12) {
      next = entry; // 桁数上限
    } else {
      next = entry + d;
    }
    setEntry(next);
    report(Number(next));
  }

  function backspace() {
    if (fresh) return;
    const sliced = entry.slice(0, -1);
    const next = sliced === "" || sliced === "-" ? "0" : sliced;
    setEntry(next);
    report(Number(next));
  }

  function clearAll() {
    setEntry("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
    report(0);
  }

  function chooseOp(nextOp: Op) {
    const current = Number(entry);
    if (acc !== null && op && !fresh) {
      const result = calc(acc, op, current);
      setAcc(result);
      setEntry(String(result));
      report(result);
    } else if (acc === null) {
      setAcc(current);
    }
    setOp(nextOp);
    setFresh(true);
  }

  function equals() {
    const current = Number(entry);
    if (acc !== null && op) {
      const result = calc(acc, op, current);
      setEntry(String(result));
      report(result);
    }
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  const keyBase =
    "flex h-11 items-center justify-center rounded-lg text-lg font-semibold transition active:scale-95";
  const numKey = `${keyBase} bg-[var(--color-bg)] text-[var(--color-ink)]`;
  const opKey = `${keyBase} bg-[var(--color-brand-soft)] text-[var(--color-brand)]`;

  return (
    <div className="shrink-0 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 pb-2 pt-1.5">
      {/* 上部バー：保留中の式ヒント＋折りたたみ */}
      <div className="mb-1.5 flex h-6 items-center justify-between">
        <span className="tabular text-xs text-[var(--color-muted)]">
          {acc !== null && op ? `${acc.toLocaleString("ja-JP")} ${op}` : ""}
        </span>
        <button
          type="button"
          onClick={() => {
            equals();
            onClose();
          }}
          aria-label="電卓を閉じる"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* キーパッド：auto-flow で 0 を横長・= を縦長に配置 */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={clearAll}
          className={`${keyBase} bg-[var(--color-bg)] text-[var(--color-expense)]`}
        >
          C
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="一文字削除"
          className={`${keyBase} bg-[var(--color-bg)] text-[var(--color-muted)]`}
        >
          <Delete className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => chooseOp("÷")} className={opKey}>
          ÷
        </button>
        <button type="button" onClick={() => chooseOp("×")} className={opKey}>
          ×
        </button>

        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={numKey}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => chooseOp("-")} className={opKey}>
          −
        </button>

        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={numKey}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => chooseOp("+")} className={opKey}>
          +
        </button>

        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={numKey}>
            {d}
          </button>
        ))}
        {/* = は縦2マス分 */}
        <button
          type="button"
          onClick={equals}
          className={`${keyBase} row-span-2 h-auto bg-[var(--color-brand)] text-white`}
        >
          =
        </button>

        <button
          type="button"
          onClick={() => inputDigit("0")}
          className={`${numKey} col-span-2`}
        >
          0
        </button>
        <button type="button" onClick={() => inputDigit("00")} className={numKey}>
          00
        </button>
      </div>
    </div>
  );
}
