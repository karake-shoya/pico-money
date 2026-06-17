"use client";

import { useState } from "react";
import { ChevronDown, Delete } from "lucide-react";
import {
  type CalcOp,
  type CalcState,
  calcValue,
  initCalc,
  backspace as reduceBackspace,
  chooseOp as reduceChooseOp,
  clearAll as reduceClearAll,
  equals as reduceEquals,
  inputDigit as reduceInputDigit,
} from "@/lib/calculator";

// 金額入力用の電卓パネル（モーダル下部にドッキング）。
// 計算ロジックは lib/calculator の純粋関数に委譲し、ここでは状態保持と描画のみ行う。
// 入力のたびに onChange で親へ値を反映し、上部の金額欄がリアルタイムに更新される。
export function Calculator({
  value,
  onChange,
  onClose,
}: {
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<CalcState>(() => initCalc(value));
  const { acc, op } = state;

  // 状態遷移を適用し、新しい金額を親へ通知する。
  function dispatch(next: CalcState) {
    setState(next);
    onChange(calcValue(next));
  }

  const inputDigit = (d: string) => dispatch(reduceInputDigit(state, d));
  const backspace = () => dispatch(reduceBackspace(state));
  const clearAll = () => dispatch(reduceClearAll(state));
  const chooseOp = (nextOp: CalcOp) => dispatch(reduceChooseOp(state, nextOp));
  const equals = () => dispatch(reduceEquals(state));

  // h-11 は数字/演算子キー用。row-span-2 の「=」は keyBase に含めず縦2マスへ伸ばす。
  const keyBase =
    "flex items-center justify-center rounded-lg text-lg font-semibold transition active:scale-95";
  const stdKey = `${keyBase} h-11`;
  const numKey = `${stdKey} bg-[var(--color-bg)] text-[var(--color-ink)]`;
  const opKey = `${stdKey} bg-[var(--color-brand-soft)] text-[var(--color-brand)]`;

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
          className={`${stdKey} bg-[var(--color-bg)] text-[var(--color-expense)]`}
        >
          C
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="一文字削除"
          className={`${stdKey} bg-[var(--color-bg)] text-[var(--color-muted)]`}
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
          className={`${keyBase} row-span-2 bg-[var(--color-brand)] text-white`}
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
