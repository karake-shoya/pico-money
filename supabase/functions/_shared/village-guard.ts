// 村向けエンドポイントの入口判定（純粋関数）。
//
// 🔴 ここが今回の変更でいちばん壊れると痛い箇所なので、Deno の index.ts に直書きせず
//    テストの下に置く（tests/village-guard.test.ts）。
//
// 🔴 フェイルクローズ：サーバ側にシークレットが設定されていなければ、
//    ヘッダが何であれ拒否する。未設定と不一致は呼び出し元から区別できない 401 にする
//    （認証を通っていない相手に設定状態を教えない）。

export type GuardResult =
  | { ok: true }
  | { ok: false; status: number; body: string };

export function guardRequest(params: {
  method: string;
  secretHeader: string | null;
  configuredSecret: string | undefined;
  userId: string | undefined;
}): GuardResult {
  const { method, secretHeader, configuredSecret, userId } = params;

  // ① 認証。未設定なら誰も通さない
  if (!configuredSecret || secretHeader !== configuredSecret) {
    return { ok: false, status: 401, body: "unauthorized" };
  }

  // ② 読み取り専用（シークレットが正しくても書き込みメソッドは通さない）
  if (method !== "GET") {
    return { ok: false, status: 405, body: "method not allowed" };
  }

  // ③ 対象ユーザーは明示必須。service role は RLS を迂回するので、
  //    未設定時に黙って全ユーザーを合計する経路を作らない。
  if (!userId) {
    return { ok: false, status: 500, body: "VILLAGE_USER_ID is not configured" };
  }

  return { ok: true };
}
