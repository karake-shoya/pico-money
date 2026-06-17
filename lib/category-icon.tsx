import { createElement } from "react";
// カテゴリ名 → lucide アイコンのマッピング。
// DB にはカテゴリ名が入っているため、名前で対応するライン系アイコンを返す。
// 未登録の名前（将来のユーザー定義カテゴリ等）は汎用アイコンにフォールバック。
import {
  Beer,
  BookOpen,
  Briefcase,
  Coins,
  Gamepad2,
  Gift,
  HeartPulse,
  Laptop,
  Lightbulb,
  Receipt,
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
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Tag;
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
