import { describe, expect, it } from "vitest";
import { guardRequest } from "../supabase/functions/_shared/village-guard";

const OK = {
  method: "GET",
  secretHeader: "s3cret",
  configuredSecret: "s3cret",
  userId: "11111111-1111-1111-1111-111111111111",
};

describe("guardRequest", () => {
  it("シークレット一致・GET・ユーザー設定済みなら通す", () => {
    expect(guardRequest(OK)).toEqual({ ok: true });
  });

  it("シークレットが一致しなければ 401", () => {
    expect(guardRequest({ ...OK, secretHeader: "wrong" })).toEqual({
      ok: false,
      status: 401,
      body: "unauthorized",
    });
  });

  it("ヘッダが無ければ 401", () => {
    expect(guardRequest({ ...OK, secretHeader: null }).ok).toBe(false);
  });

  it("サーバ側のシークレットが未設定なら、ヘッダが何であれ 401（フェイルクローズ）", () => {
    // 未設定を素通しにすると、環境変数を入れ忘れたまま公開された瞬間に家計が読める。
    for (const secretHeader of [null, "", "何か", "undefined"]) {
      expect(
        guardRequest({ ...OK, configuredSecret: undefined, secretHeader })
      ).toEqual({ ok: false, status: 401, body: "unauthorized" });
    }
    expect(
      guardRequest({ ...OK, configuredSecret: "", secretHeader: "" })
    ).toEqual({ ok: false, status: 401, body: "unauthorized" });
  });

  it("シークレットが正しくても GET 以外は 405", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(guardRequest({ ...OK, method })).toEqual({
        ok: false,
        status: 405,
        body: "method not allowed",
      });
    }
  });

  it("認証を通っていない相手にはメソッドの可否を教えない（401 が先）", () => {
    expect(guardRequest({ ...OK, method: "POST", secretHeader: "wrong" })).toEqual(
      { ok: false, status: 401, body: "unauthorized" }
    );
  });

  it("VILLAGE_USER_ID 未設定なら 500 で落ちる（黙って全ユーザーを合計しない）", () => {
    expect(guardRequest({ ...OK, userId: undefined })).toEqual({
      ok: false,
      status: 500,
      body: "VILLAGE_USER_ID is not configured",
    });
  });
});
