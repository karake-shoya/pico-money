import { describe, expect, it } from "vitest";
import {
  type CalcState,
  calcValue,
  initCalc,
  backspace,
  chooseOp,
  clearAll,
  equals,
  inputDigit,
} from "@/lib/calculator";

// 数字キー列を順に入力するヘルパー（"1","2","3"...）
function type(s: CalcState, keys: string): CalcState {
  return keys.split("").reduce((st, d) => inputDigit(st, d), s);
}

describe("calculator", () => {
  it("初期値: 正の値は表示、0以下は0", () => {
    expect(calcValue(initCalc(1200))).toBe(1200);
    expect(calcValue(initCalc(0))).toBe(0);
  });

  it("数字入力は先頭0を置き換えて連結する", () => {
    let s = initCalc(0);
    s = type(s, "100");
    expect(calcValue(s)).toBe(100);
  });

  it("00キーは末尾に2桁付与、先頭では0のまま", () => {
    let s = inputDigit(initCalc(0), "00");
    expect(calcValue(s)).toBe(0);
    s = inputDigit(initCalc(0), "5");
    s = inputDigit(s, "00");
    expect(calcValue(s)).toBe(500);
  });

  it("加算: 100 + 50 = 150", () => {
    let s = type(initCalc(0), "100");
    s = chooseOp(s, "+");
    s = type(s, "50");
    s = equals(s);
    expect(calcValue(s)).toBe(150);
  });

  it("回帰: 末尾が演算子のまま = を押しても二重計算しない（100 + 50 + → 150）", () => {
    let s = type(initCalc(0), "100");
    s = chooseOp(s, "+");
    s = type(s, "50");
    s = chooseOp(s, "+"); // ここで 150 に畳み込み（途中結果）
    expect(calcValue(s)).toBe(150);
    s = equals(s); // 二重適用されず 150 のまま
    expect(calcValue(s)).toBe(150);
  });

  it("連続演算: 100 + 50 + 25 = 175", () => {
    let s = type(initCalc(0), "100");
    s = chooseOp(s, "+");
    s = type(s, "50");
    s = chooseOp(s, "+");
    s = type(s, "25");
    s = equals(s);
    expect(calcValue(s)).toBe(175);
  });

  it("乗算・減算", () => {
    let s = chooseOp(type(initCalc(0), "12"), "×");
    s = equals(type(s, "3"));
    expect(calcValue(s)).toBe(36);

    s = chooseOp(type(initCalc(0), "100"), "-");
    s = equals(type(s, "30"));
    expect(calcValue(s)).toBe(70);
  });

  it("除算結果は整数へ丸める（10 ÷ 3 → 3）", () => {
    let s = chooseOp(type(initCalc(0), "10"), "÷");
    s = equals(type(s, "3"));
    expect(calcValue(s)).toBe(3);
  });

  it("ゼロ除算は0", () => {
    let s = chooseOp(type(initCalc(0), "10"), "÷");
    s = equals(type(s, "0"));
    expect(calcValue(s)).toBe(0);
  });

  it("マイナス結果は0に丸める（5 - 10 → 0）", () => {
    let s = chooseOp(type(initCalc(0), "5"), "-");
    s = equals(type(s, "10"));
    expect(calcValue(s)).toBe(0);
  });

  it("バックスペースで末尾削除、空なら0", () => {
    let s = type(initCalc(0), "123");
    s = backspace(s);
    expect(calcValue(s)).toBe(12);
    s = backspace(backspace(s));
    expect(calcValue(s)).toBe(0);
  });

  it("クリアで初期化", () => {
    let s = type(initCalc(0), "999");
    s = chooseOp(s, "+");
    s = clearAll(s);
    expect(calcValue(s)).toBe(0);
    expect(s.acc).toBeNull();
    expect(s.op).toBeNull();
  });

  it("= 後に数字を入力すると新しい値で置き換わる", () => {
    let s = chooseOp(type(initCalc(0), "100"), "+");
    s = equals(type(s, "50")); // 150
    s = type(s, "7");
    expect(calcValue(s)).toBe(7);
  });
});
