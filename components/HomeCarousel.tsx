"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import { useMonth } from "@/components/MonthProvider";
import {
  currentMonth,
  formatSignedYen,
  formatYen,
  monthLabel,
  shiftMonth,
} from "@/lib/format";
import type { MonthlySummary } from "@/lib/types";

const THRESHOLD = 50; // この距離(px)以上の横スワイプで月移動
const INTENT = 10; // 横方向の意図とみなす最小移動量
const EMPTY: MonthlySummary = { income: 0, expense: 0, balance: 0, savingsRate: 0 };

// 1ヶ月分の収支サマリーカード（差額・支出率ゲージ・収入/支出・貯蓄率）。
// off-screen の前後カードがドラッグ中に再描画されないよう memo 化する。
const SummaryCard = memo(function SummaryCard({
  summary,
}: {
  summary: MonthlySummary;
}) {
  const { income, expense, balance, savingsRate } = summary;
  const expenseRate =
    income > 0
      ? Math.min(Math.round((expense / income) * 100), 999)
      : expense > 0
        ? 100
        : 0;
  const gaugeWidth = Math.min(expenseRate, 100);
  const over = expense > income;

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <p className="text-sm text-[var(--color-muted)]">差額</p>
        <p
          className={`tabular mt-1 text-4xl font-bold ${
            balance >= 0
              ? "text-[var(--color-income)]"
              : "text-[var(--color-expense)]"
          }`}
        >
          {formatSignedYen(balance)}
        </p>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--color-muted)]">支出率</span>
            <span
              className={`tabular font-semibold ${
                over ? "text-[var(--color-expense)]" : "text-[var(--color-ink)]"
              }`}
            >
              {expenseRate}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
            <div
              className={`h-full rounded-full transition-all ${
                over ? "bg-[var(--color-expense)]" : "bg-[var(--color-brand)]"
              }`}
              style={{ width: `${gaugeWidth}%` }}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
            <ArrowDownLeft className="h-4 w-4 text-[var(--color-income)]" />
            収入
          </p>
          <p className="tabular mt-1.5 text-xl font-bold text-[var(--color-income)]">
            {formatYen(income)}
          </p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
            <ArrowUpRight className="h-4 w-4 text-[var(--color-expense)]" />
            支出
          </p>
          <p className="tabular mt-1.5 text-xl font-bold text-[var(--color-expense)]">
            {formatYen(expense)}
          </p>
        </section>
      </div>

      <section className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <PiggyBank className="h-4 w-4" />
          貯蓄率
        </p>
        <p
          className={`tabular text-xl font-bold ${
            savingsRate >= 0
              ? "text-[var(--color-income)]"
              : "text-[var(--color-expense)]"
          }`}
        >
          {savingsRate}%
        </p>
      </section>
    </div>
  );
});

// 月次サマリーを横スワイプ（カルーセル）で切り替える。
// 先読み済みの summaries から前/現/次の3枚を並べ、サーバー往復なしでスライドする。
export function HomeCarousel({
  summaries,
}: {
  summaries: Record<string, MonthlySummary>;
}) {
  const { month, setMonth } = useMonth();

  const [dx, setDx] = useState(0); // ドラッグ/スライド追従量(px)
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false); // 確定スライド中
  const [noTransition, setNoTransition] = useState(false); // 中央への瞬間リセット用
  const [mounted, setMounted] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);

  // delta(+1=翌月/-1=前月)方向へスライドアニメ開始。完了は handleTransitionEnd で処理。
  const commit = (delta: number) => {
    const w = areaRef.current?.offsetWidth ?? 0;
    if (w === 0) {
      setMonth(shiftMonth(month, delta), { navigate: false });
      return;
    }
    setAnimating(true);
    setDx(delta > 0 ? -w : w); // 翌月は左へ、前月は右へ
  };

  // スワイプの listener は一度だけ登録し（再バインド回避）、最新の commit / animating
  // を ref 経由で参照する。
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const animatingRef = useRef(animating);
  animatingRef.current = animating;

  const handleTransitionEnd = () => {
    if (!animating) return;
    const delta = dx < 0 ? 1 : -1; // 確定時の dx は commit が入れた符号付き目標値
    setNoTransition(true);
    setAnimating(false);
    setDx(0);
    setMonth(shiftMonth(month, delta), { navigate: false });
    // 次フレームでトランジションを戻す（中央への逆アニメを防ぐ）
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setNoTransition(false))
    );
  };

  // 当月判定はクライアントのローカル時刻に依存するためマウント後に行う
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const showToday = mounted && month !== currentMonth();

  const summaryFor = (m: string) => summaries[m] ?? EMPTY;
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  // スワイプ判定。ブラウザ/OS の横スワイプ（戻る/進む）に奪われないよう
  // 非パッシブの touchmove を直接登録し、横方向と判定した時点で preventDefault する。
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let active = false;
    let horizontal = false;
    let moved = 0;

    const begin = (x: number, y: number) => {
      if (animatingRef.current) return;
      startX = x;
      startY = y;
      active = true;
      horizontal = false;
      moved = 0;
      setDragging(true);
    };
    const move = (x: number, y: number, e: Event) => {
      if (!active) return;
      const ddx = x - startX;
      const ddy = y - startY;
      if (!horizontal && Math.abs(ddx) > Math.abs(ddy) && Math.abs(ddx) > INTENT) {
        horizontal = true;
      }
      if (horizontal) {
        if (e.cancelable) e.preventDefault();
        moved = ddx;
        setDx(ddx);
      }
    };
    const end = () => {
      if (!active) return;
      active = false;
      setDragging(false);
      const m = moved;
      moved = 0;
      if (Math.abs(m) > THRESHOLD) {
        commitRef.current(m < 0 ? 1 : -1); // 左スワイプ=翌月 / 右スワイプ=前月
      } else {
        setDx(0); // 閾値未満は中央へ戻す
      }
    };

    const onTouchStart = (e: TouchEvent) =>
      begin(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.touches[0].clientX, e.touches[0].clientY, e);
    const onMouseDown = (e: MouseEvent) => begin(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY, e);

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", end);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", end);
    };
  }, []);

  const transition =
    noTransition || dragging
      ? "none"
      : animating
        ? "transform 0.25s ease"
        : "transform 0.2s ease";

  return (
    <div>
      {/* 月ナビゲーション */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => commit(-1)}
          aria-label="前の月"
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold">{monthLabel(month)}</span>
          {showToday && (
            <button
              type="button"
              onClick={() => setMonth(currentMonth(), { navigate: false })}
              className="mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium text-[var(--color-brand)] active:bg-[var(--color-bg)]"
            >
              今月に戻る
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => commit(1)}
          aria-label="次の月"
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[var(--color-muted)] active:bg-[var(--color-bg)]"
        >
          ›
        </button>
      </div>

      {/* ビューポート（横はみ出しをクリップ）。-mx-4 px は各カード側で付与。 */}
      <div
        ref={areaRef}
        className="-mx-4 min-h-[70dvh] touch-pan-y overflow-hidden"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {/* 3枚（前/現/次）を横並びにし translateX でスライド。
            track 幅 = ビューポート幅なので -100% がちょうど1カード分。 */}
        <div
          className="flex"
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `translateX(calc(-100% + ${dx}px))`,
            transition,
          }}
        >
          <div className="w-full shrink-0 px-4">
            <SummaryCard summary={summaryFor(prev)} />
          </div>
          <div className="w-full shrink-0 px-4">
            <SummaryCard summary={summaryFor(month)} />
          </div>
          <div className="w-full shrink-0 px-4">
            <SummaryCard summary={summaryFor(next)} />
          </div>
        </div>
      </div>
    </div>
  );
}
