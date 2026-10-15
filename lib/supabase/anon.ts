// cookie / セッションに依存しない匿名 Supabase クライアント。
// unstable_cache のキャッシュ関数内では cookies() を呼べないため、
// 共通データ（全ユーザー共通・RLS で user_id IS NULL が誰でも読める）の
// キャッシュ取得にはこの匿名クライアントを使う。
// ⚠ anon のテーブル権限は 0012 で外し、categories の SELECT だけを 0013 で戻している。
//    他のテーブルをこのクライアントで読むと permission denied（42501）になる。
import { createClient } from '@supabase/supabase-js';

export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
