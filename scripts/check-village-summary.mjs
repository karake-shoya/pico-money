// village-summary エンドポイントが契約を満たすか検証する（依存なし）。
//
// ⚠ 金額は一切表示しない。出すのは合否・日付・件数だけなので、出力をそのまま貼っても
//    家計の数値は漏れない。シークレットは隠し入力で受け取り、エンドポイント以外へ送らない。
//
// 使い方:
//   node scripts/check-village-summary.mjs          # シークレットを対話で入力
//   VILLAGE_FUNCTION_SECRET=... node scripts/check-village-summary.mjs
//
// URL は NEXT_PUBLIC_SUPABASE_URL（環境変数、無ければ .env.local）から組み立てる。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Supabase の URL を環境変数 → .env.local の順で探す
function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    const line = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
    if (line) return line[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // .env.local が無い場合は下でエラーにする
  }
  return null;
}

// 端末に表示せずに1行読む
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("対話入力できません。VILLAGE_FUNCTION_SECRET を環境変数で渡してください。"));
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\n" || ch === "\r") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl-C
          stdin.setRawMode(false);
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

let pass = 0;
let fail = 0;
function check(label, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? `  … ${detail}` : ""}`);
  }
}

async function call(url, secret, method = "GET") {
  const headers = secret === null ? {} : { "x-village-secret": secret };
  const res = await fetch(url, { method, headers });
  return { status: res.status, text: await res.text() };
}

async function main() {
  const base = resolveBaseUrl();
  if (!base) {
    console.error("NEXT_PUBLIC_SUPABASE_URL が見つかりません（環境変数か .env.local に必要）。");
    return 1;
  }
  const url = `${base.replace(/\/$/, "")}/functions/v1/village-summary`;
  const secret =
    process.env.VILLAGE_FUNCTION_SECRET ??
    (await promptHidden("VILLAGE_FUNCTION_SECRET（入力は表示されません）: "));

  console.log("\n【1】ガード");
  check("ヘッダ無し → 401", (await call(url, null)).status === 401);
  check("シークレット不一致 → 401", (await call(url, `${secret}x`)).status === 401);
  check("POST → 405", (await call(url, secret, "POST")).status === 405);

  console.log("\n【2】本体");
  const res = await call(url, secret);
  check("正しい鍵で GET → 200", res.status === 200, `実際は ${res.status}`);
  if (res.status !== 200) {
    console.log(`\n  応答: ${res.text.slice(0, 200)}`);
    return 1;
  }

  const d = JSON.parse(res.text);
  const today = d.today ?? "";
  const month = today.slice(0, 7);
  const keys = (o) => Object.keys(o ?? {}).sort().join(",");

  check("最上位のキーが揃う",
    keys(d) === "budget,generatedAt,monthly,record,savings,today", `実際は ${keys(d)}`);

  const r = d.record ?? {};
  check("record のキーが揃う", keys(r) === "last30Days,lastDate,totalDays,totalMonths");
  check("record の件数が整数",
    ["totalDays", "totalMonths", "last30Days"].every((k) => Number.isInteger(r[k])));
  check("最終記録日が未来でない", r.lastDate === null || r.lastDate <= today,
    `lastDate=${r.lastDate} / today=${today}`);
  check("記録月数 <= 記録日数", r.totalMonths <= r.totalDays);
  check("直近30日 <= 記録日数", r.last30Days <= r.totalDays);

  const m = d.monthly ?? [];
  check("monthly が12ヶ月", m.length === 12, `実際は ${m.length}`);
  check("monthly が古い順",
    JSON.stringify(m.map((x) => x.month)) === JSON.stringify([...m.map((x) => x.month)].sort()));
  check("monthly の末尾が当月", m.length > 0 && m[m.length - 1].month === month);

  const b = d.budget ?? {};
  check("budget のキーが揃う",
    keys(b) === "month,monthsMeasured,monthsWithinBudget,spent,total");
  check("budget.month が当月", b.month === month);
  check("達成月 <= 判定月", b.monthsWithinBudget <= b.monthsMeasured);
  check("判定月が11以下（当月を分母から除いている）", b.monthsMeasured <= 11,
    `実際は ${b.monthsMeasured}`);
  check("予算未設定なら分母ゼロ", b.total > 0 || b.monthsMeasured === 0);

  const s = d.savings ?? {};
  check("savings のキーが揃う", keys(s) === "goalCount,saved,target");
  check("目標ゼロ件なら分母ゼロ", s.goalCount > 0 || s.target === 0);

  // 自由文の混入チェック：文字列は日付・時刻の形しか許さない
  const strings = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
    else if (typeof v === "string") strings.push(v);
  };
  walk(d);
  const bad = strings.filter((x) => !/^[0-9T:.\-]+Z?$/.test(x));
  check("自由文が混ざっていない（文字列は日付・時刻だけ）", bad.length === 0,
    `日付以外の文字列 ${bad.length} 件`);

  console.log("\n【3】金額以外の実測値");
  console.log(`  today               : ${today}`);
  console.log(`  最終記録日          : ${r.lastDate}`);
  console.log(`  記録日数 / 月数     : ${r.totalDays} / ${r.totalMonths}`);
  console.log(`  直近30日の記録日数  : ${r.last30Days}`);
  console.log(`  予算の達成月 / 判定月: ${b.monthsWithinBudget} / ${b.monthsMeasured}`);
  console.log(`  貯蓄目標の件数      : ${s.goalCount}`);
  console.log(`  予算が設定済みか    : ${b.total > 0 ? "はい" : "いいえ"}`);

  console.log(`\n合計: PASS ${pass} / FAIL ${fail}`);
  return fail === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e.message);
    process.exit(1);
  }
);
