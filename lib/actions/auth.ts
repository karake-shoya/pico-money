'use server';

// 認証系 Server Actions（ログイン / サインアップ / ログアウト）
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error: string } | null;

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  return { email, password };
}

// Supabase の生エラー文言を露出させず、日本語の固定文言にマッピングする。
function signupErrorMessage(error: { message?: string; code?: string }): string {
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (text.includes('already') || text.includes('registered')) {
    return 'このメールアドレスは既に登録されています。';
  }
  if (text.includes('weak') || text.includes('password')) {
    return 'パスワードが安全ではありません。別のパスワードをお試しください。';
  }
  if (text.includes('email') && text.includes('invalid')) {
    return 'メールアドレスの形式が正しくありません。';
  }
  return 'アカウントの作成に失敗しました。時間をおいて再度お試しください。';
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません。' };
  }
  redirect('/');
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }
  if (password.length < 6) {
    return { error: 'パスワードは6文字以上で設定してください。' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: signupErrorMessage(error) };
  }
  // メール確認が無効ならセッションが発行されそのままログイン状態になる。
  if (data.session) {
    redirect('/');
  }
  return {
    error:
      '確認メールを送信しました。メール内のリンクを開いてから、ログインしてください。',
  };
}

// フォームの mode により login / signup を振り分ける（クライアントのタブ切替用）
export async function authenticate(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const mode = String(formData.get("mode") ?? "login");
  return mode === "signup"
    ? signup(_prev, formData)
    : login(_prev, formData);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
