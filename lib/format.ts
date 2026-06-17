// 表示用フォーマット・日付ユーティリティ（すべてローカル時刻基準）

// 円表記（整数）。符号は呼び出し側で付与する。
export function formatYen(amount: number): string {
  return '¥' + Math.abs(amount).toLocaleString('ja-JP');
}

// 符号付き円表記（収入 +、支出 -）
export function formatSignedYen(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return sign + formatYen(amount);
}

// 現在の月（YYYY-MM）
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 今日の日付（YYYY-MM-DD, ローカル）
export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// YYYY-MM が妥当か検証し、不正なら当月を返す
export function normalizeMonth(month: string | undefined | null): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  return currentMonth();
}

// 指定月の [開始日, 翌月開始日)（YYYY-MM-DD）。SQL の範囲フィルタに使う。
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
  return { start, end };
}

// 指定月を delta ヶ月ずらした YYYY-MM を返す（負値で過去方向）。
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 直近 n ヶ月分の YYYY-MM 配列（古い順）。基準月を含む。
export function lastNMonths(baseMonth: string, n: number): string[] {
  const [y, m] = baseMonth.split('-').map(Number);
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  }
  return result;
}

// YYYY-MM の表示ラベル（例: 2026年6月）
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}年${m}月`;
}

// YYYY-MM-DD の表示ラベル（例: 6/17(火)）
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
export function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return `${m}/${d}(${WEEKDAYS[wd]})`;
}
