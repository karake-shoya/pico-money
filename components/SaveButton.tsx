"use client";

import { useFormStatus } from "react-dom";

export function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-[var(--color-brand)] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "保存中…" : "保存"}
    </button>
  );
}
