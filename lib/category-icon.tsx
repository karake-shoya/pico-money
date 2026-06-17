import { createElement } from "react";
// カテゴリ名 → lucide アイコンのマッピング。
// DB にはカテゴリ名が入っているため、名前で対応するライン系アイコンを返す。
// 未登録の名前（将来のユーザー定義カテゴリ等）は汎用アイコンにフォールバック。
import {
  Beer,
  BookOpen,
  Briefcase,
  Coins,
  CreditCard,
  Gamepad2,
  Gift,
  HeartPulse,
  Landmark,
  Laptop,
  Lightbulb,
  Receipt,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tag,
  TrainFront,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  // 収入
  給与: Briefcase,
  副業: Laptop,
  ボーナス: Gift,
  投資: TrendingUp,
  その他収入: Coins,
  // 支出（デフォルト）
  食費: Utensils,
  交通費: TrainFront,
  光熱費: Lightbulb,
  通信費: Smartphone,
  娯楽: Gamepad2,
  副業経費: Receipt,
  その他支出: Wallet,
  // 支出（取込で作成）
  日用品: ShoppingBasket,
  交際費: Beer,
  "衣服・美容": Shirt,
  特別な支出: Sparkles,
  "教養・教育": BookOpen,
  "健康・医療": HeartPulse,
  "現金・カード": CreditCard,
  税金: Landmark,
  保険: ShieldCheck,
};

// カテゴリ名 → 表示色（塗りつぶしバッジ／円グラフで共有）。
// マネーフォワードME のように、カテゴリごとに固有色を持たせて一目で判別できるようにする。
const COLOR_MAP: Record<string, string> = {
  // 収入（寒色〜緑系でまとめる）
  給与: "#10b981", // emerald
  副業: "#14b8a6", // teal
  ボーナス: "#22c55e", // green
  投資: "#0ea5e9", // sky
  その他収入: "#84cc16", // lime
  // 支出（暖色〜多色で判別性を優先）
  食費: "#ef4444", // red
  交通費: "#3b82f6", // blue
  光熱費: "#f97316", // orange
  通信費: "#06b6d4", // cyan
  娯楽: "#ec4899", // pink
  副業経費: "#64748b", // slate
  その他支出: "#9ca3af", // gray
  日用品: "#22c55e", // green
  交際費: "#8b5cf6", // violet
  "衣服・美容": "#f59e0b", // amber
  特別な支出: "#d946ef", // fuchsia
  "教養・教育": "#6366f1", // indigo
  "健康・医療": "#f43f5e", // rose
  "現金・カード": "#0891b2", // cyan-600
  税金: "#a16207", // amber-700
  保険: "#0d9488", // teal-600
};

// 未登録カテゴリ用のフォールバック・パレット（名前ハッシュで安定的に割り当てる）。
const FALLBACK_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export function categoryIcon(name: string | null | undefined): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Tag;
}

// カテゴリ名から表示色を返す。未登録名は名前ハッシュでパレットへ安定的に割り当てる。
export function categoryColor(name: string | null | undefined): string {
  if (name && COLOR_MAP[name]) return COLOR_MAP[name];
  if (!name) return FALLBACK_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

// カテゴリ名から対応アイコンを描画するラッパー。
// createElement 経由にして、描画中にコンポーネントを生成しているとlintに誤検知されるのを防ぐ。
export function CategoryIcon({
  name,
  className,
  strokeWidth = 1.8,
}: {
  name: string | null | undefined;
  className?: string;
  strokeWidth?: number;
}) {
  return createElement(categoryIcon(name), { className, strokeWidth });
}

// カテゴリ色で塗りつぶした円バッジ＋白アイコン（マネーフォワードME 風）。
// 一覧・明細でカテゴリを一目で判別できるようにするための共通パーツ。
export function CategoryBadge({
  name,
  className = "h-10 w-10",
  iconClassName = "h-5 w-5",
}: {
  name: string | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${className}`}
      style={{ background: categoryColor(name) }}
    >
      {createElement(categoryIcon(name), {
        className: iconClassName,
        strokeWidth: 2,
      })}
    </span>
  );
}
