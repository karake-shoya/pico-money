"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { authenticate, type AuthState } from "@/lib/actions/auth";

type Mode = "login" | "signup";

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-[var(--color-brand)] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending
        ? "処理中…"
        : mode === "login"
          ? "ログイン"
          : "アカウントを作成"}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [state, formAction] = useActionState<AuthState, FormData>(
    authenticate,
    null
  );

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-sm">
      {/* ログイン / 新規登録 タブ */}
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-[var(--color-bg)] p-1 text-sm font-medium">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-9 rounded-lg transition ${
              mode === m
                ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-muted)]"
            }`}
          >
            {m === "login" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <label className="block">
          <span className="mb-1 block text-sm text-[var(--color-muted)]">
            メールアドレス
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-[var(--color-muted)]">
            パスワード
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="6文字以上"
            className="h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-brand)]"
          />
        </label>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-expense)]">
            {state.error}
          </p>
        )}

        <SubmitButton mode={mode} />
      </form>
    </div>
  );
}
