"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useScrollLock } from "@/components/useScrollLock";

export function BottomSheet({
  onClose,
  height,
  fixedHeight = false,
  children,
  title,
  headerLeft,
  zIndex = 40,
}: {
  onClose: () => void;
  height?: string;
  fixedHeight?: boolean;
  children: ReactNode;
  title?: string;
  headerLeft?: ReactNode;
  zIndex?: number;
}) {
  useScrollLock();

  const heightStyle = height
    ? fixedHeight
      ? { height, maxHeight: height }
      : { maxHeight: height }
    : {};

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex }}
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
        style={heightStyle}
      >
        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
          {title && (
            <div className="relative flex h-8 items-center justify-center">
              {headerLeft && (
                <div className="absolute left-0">{headerLeft}</div>
              )}
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-bg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
