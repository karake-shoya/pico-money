// ページ遷移時の即時フィードバック用スケルトン。
// page.js のデータ取得が完了するまで表示され、完了後に実コンテンツへ差し替わる。
export default function Loading() {
  return (
    <div className="space-y-4" aria-hidden>
      {/* 大きなサマリーカード相当 */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-bg)]" />
        <div className="mt-3 h-9 w-40 animate-pulse rounded bg-[var(--color-bg)]" />
        <div className="mt-5 h-3 w-full animate-pulse rounded-full bg-[var(--color-bg)]" />
      </div>

      {/* 2カラムカード相当 */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          >
            <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-bg)]" />
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-[var(--color-bg)]" />
          </div>
        ))}
      </div>

      {/* リスト行相当 */}
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          >
            <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-bg)]" />
            <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-bg)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
