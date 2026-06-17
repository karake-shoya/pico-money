import { Wallet } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

// 認証画面（ログイン / サインアップ）。proxy.ts によりログイン済みなら / へリダイレクトされる。
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-white shadow-lg shadow-[var(--color-brand)]/30">
          <Wallet className="h-8 w-8" strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Pico Money</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          自分の収支だけを、シンプルに。
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
