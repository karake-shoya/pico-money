// 金額入力電卓の逐次計算ロジック（純粋関数）。
// UI（Calculator.tsx）から分離し単体テスト可能にする。
// 携帯電卓と同様、保留中の演算子を1つだけ持つ方式。

export type CalcOp = "+" | "-" | "×" | "÷";

export type CalcState = {
  entry: string; // 入力中の数値（文字列）
  acc: number | null; // 累積値
  op: CalcOp | null; // 保留中の演算子
  fresh: boolean; // 次の数字入力で entry を置き換えるか
};

const MAX_DIGITS = 12;

export function initCalc(value: number): CalcState {
  return {
    entry: value > 0 ? String(value) : "0",
    acc: null,
    op: null,
    fresh: true,
  };
}

function apply(a: number, op: CalcOp, b: number): number {
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

// 親へ通知する金額。整数（円）へ丸め、マイナス・小数は 0 未満を 0 に。
export function calcValue(s: CalcState): number {
  return Math.max(0, Math.round(Number(s.entry)));
}

export function inputDigit(s: CalcState, d: string): CalcState {
  let entry: string;
  if (s.fresh) {
    entry = d === "00" ? "0" : d;
  } else if (s.entry === "0") {
    entry = d === "00" ? "0" : d;
  } else if (s.entry.replace("-", "").length >= MAX_DIGITS) {
    entry = s.entry; // 桁数上限
  } else {
    entry = s.entry + d;
  }
  return { ...s, entry, fresh: false };
}

export function backspace(s: CalcState): CalcState {
  if (s.fresh) return s;
  const sliced = s.entry.slice(0, -1);
  const entry = sliced === "" || sliced === "-" ? "0" : sliced;
  return { ...s, entry };
}

export function clearAll(s: CalcState): CalcState {
  return { ...s, entry: "0", acc: null, op: null, fresh: true };
}

export function chooseOp(s: CalcState, nextOp: CalcOp): CalcState {
  if (s.acc !== null && s.op && !s.fresh) {
    // 新しい被演算子が入力済み → 保留演算を確定して累積へ畳み込む
    const result = apply(s.acc, s.op, Number(s.entry));
    return { entry: String(result), acc: result, op: nextOp, fresh: true };
  }
  if (s.acc === null) {
    return { ...s, acc: Number(s.entry), op: nextOp, fresh: true };
  }
  // 直前も演算子（fresh）の場合は演算子だけ差し替える
  return { ...s, op: nextOp, fresh: true };
}

export function equals(s: CalcState): CalcState {
  // 直前が演算子（fresh=true）の場合、entry には累積結果が入っており acc と同値。
  // 再適用すると二重計算になるためスキップする。
  if (s.acc !== null && s.op && !s.fresh) {
    const result = apply(s.acc, s.op, Number(s.entry));
    return { entry: String(result), acc: null, op: null, fresh: true };
  }
  return { ...s, acc: null, op: null, fresh: true };
}
