// ============================================================
// 重複した会員行の統合（2026-09-06・6組）
// ============================================================
// 使い方:
//   node scripts/merge-duplicate-members-20260906.mjs            … 確認だけ
//   node scripts/merge-duplicate-members-20260906.mjs --execute  … 実行
//
// ------------------------------------------------------------
// 何を統合するか
// ------------------------------------------------------------
// 2026-08-05 の取り込みで「名簿の行」と「問い合わせの行」が別々に入り、
// 名前の書き方が違ったせいで同一人物と判定されなかった6組。
// 202609060052 の name_search_key() で洗い出した。
//
//   中島仙蔵 / 三枝稚奈 / 大山みどり / 髙瀬将人 / 廣瀬和則 / 朝山理恵
//
// ------------------------------------------------------------
// 向きと手順
// ------------------------------------------------------------
// 🔴 残すのは **会員番号を持っている行**。運営も本人も番号で呼ぶので、
//    番号のある行を消すと台帳の連続性が切れる。
//    （中島さんだけ番号が問い合わせ側に付いている＝機械的に
//      「名簿側を残す」にすると番号を落とす。必ず番号で選ぶ）
// 🔴 12行とも他テーブルからの参照0件・ログイン紐づけ無しを確認済み。
//    それでも**消さずに退会扱いで残す**（戻せるように）。
// 🔴 残す行に入っている値は上書きしない。**空いているところだけ**埋める。
//    番号のある行には運営が手で直した値（更新状況・料金プラン）が入っている。
// 🔴 メールは先に旧行から外す。`enforce_member_email_unique` が
//    「他の行が同じメールを持っている」と例外を投げるため、順番が逆だと失敗する。
// 🔴 メールを入れると `link_member_auth_user` が走り、確認済みアカウントが
//    あればその場でログインが繋がる（＝これが本来あるべき状態）。
// ============================================================
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvLocal();

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が読めません（.env.local）");
  process.exit(1);
}
const EXECUTE = process.argv.includes("--execute");

async function rest(path, init = {}) {
  const res = await fetch(URL_BASE + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: "Bearer " + KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(res.status + " " + path + "\n" + text.slice(0, 800));
  return text ? JSON.parse(text) : null;
}

// 202609060052 の name_search_key() と同じ手順（こちらは確認用）
const FROM = "ニハカタエロトムヒミ髙𠮷濵邉邊澤嶋嶌廣惠瀨眞德齋齊";
const TO = "二八力夕工口卜厶匕彡高吉浜辺辺沢島島広恵瀬真徳斎斉";
const CHAR_MAP = new Map([...FROM].map((c, i) => [c, [...TO][i]]));
const searchKey = (s) =>
  [
    ...(s || "")
      .normalize("NFKC")
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/[\s　・.,]+/g, ""),
  ]
    .map((c) => CHAR_MAP.get(c) || c)
    .join("")
    .toLowerCase();

// 残す行に空きがあれば旧行から移す項目
const FILLABLE = [
  "email", "phone", "gender", "age_range", "payment_method", "contact_submitted_at",
  "job", "referrer", "price", "referral_fee", "start_year", "start_month",
  "renewal_status", "renewal_fee", "renewal_note", "membership_type", "grip",
  "frequency", "billing_plan_code", "billing_starts_on", "import_sheet", "nickname",
];

const ALL = "*";
const members = await rest("members?select=" + ALL + "&limit=2000");
const active = members.filter((r) => !r.is_withdrawn);
console.log("会員 " + members.length + "件（在籍 " + active.length + "）");
console.log(EXECUTE ? "モード: 実行\n" : "モード: 確認のみ（--execute で実行）\n");

if (EXECUTE) {
  mkdirSync("backups", { recursive: true });
  const path = "backups/members-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  writeFileSync(path, JSON.stringify(members, null, 1), "utf8");
  console.log("変更前の全行を " + path + " に保存しました\n");
}

// 照合キーが同じ在籍者を組にする
const groups = new Map();
for (const r of active) {
  const k = searchKey(r.name);
  groups.set(k, [...(groups.get(k) || []), r]);
}
const pairs = [...groups.entries()].filter(([, v]) => v.length > 1);
console.log("同一人物とみられる組: " + pairs.length + "\n");

let done = 0;
let skipped = 0;

for (const [k, rows] of pairs) {
  const withNo = rows.filter((r) => r.member_no != null);
  const withoutNo = rows.filter((r) => r.member_no == null);

  // 3行以上・番号が2つ以上・番号がどれにも無い、は機械で決めない
  if (rows.length !== 2 || withNo.length !== 1 || withoutNo.length !== 1) {
    console.log("⚠️ " + k + ": 番号の付き方が想定と違うので触りません（" +
      rows.map((r) => `${r.name}[no=${r.member_no ?? "なし"}]`).join(" / ") + "）");
    skipped++;
    continue;
  }
  const keep = withNo[0];
  const drop = withoutNo[0];

  if (drop.auth_user_id) {
    console.log("⚠️ " + k + ": 消す側にログインが紐づいています。手当てが要るので触りません");
    skipped++;
    continue;
  }

  console.log(`■ ${keep.name}（会員番号${keep.member_no}）← ${drop.name}`);

  // 残す行の空き項目に、旧行の値を移す
  const patch = { source: "both" };
  const moved = [];
  for (const f of FILLABLE) {
    const empty = keep[f] == null || keep[f] === "";
    const has = drop[f] != null && drop[f] !== "";
    if (empty && has) {
      patch[f] = drop[f];
      moved.push(`${f}=${drop[f]}`);
    }
  }
  patch.admin_note =
    "2026-09-06 重複していた行(" + drop.id + "・" + drop.name + ")を統合しました。";
  console.log("   移す: " + (moved.join(" / ") || "なし（すべて埋まっている）"));

  if (!EXECUTE) {
    console.log("   [確認] 旧行を退会扱いにし、上の項目を移します\n");
    continue;
  }

  // ① 先に旧行からメールを外す（重複チェックに引っかかるため）
  const dropped = await rest("members?id=eq." + drop.id + "&is_withdrawn=is.false", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      email: null,
      is_withdrawn: true,
      withdrawn_at: new Date().toISOString(),
      withdrawal_reason: "重複行の統合",
      admin_note:
        "2026-09-06 重複していたため、内容を会員番号" + keep.member_no +
        "（" + keep.name + " / " + keep.id + "）へ移しました。この行は記録として残しています。" +
        (drop.email ? " 元のメール: " + drop.email : ""),
    }),
  });
  if (!dropped || dropped.length === 0) {
    console.log("   ⚠️ 旧行が変わっていました。この組は飛ばします\n");
    skipped++;
    continue;
  }

  // ② 残す行へ移す
  const kept = await rest("members?id=eq." + keep.id + "&member_no=eq." + keep.member_no, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!kept || kept.length === 0) {
    console.log("   ⚠️ 残す行が変わっていました。旧行は退会扱いのままです（要確認）\n");
    skipped++;
    continue;
  }
  console.log(
    "   ✅ 統合しました" +
      (kept[0].auth_user_id && !keep.auth_user_id ? "（メールから本人のログインも繋がりました）" : "") +
      "\n"
  );
  done++;
}

console.log(`結果: 統合 ${done}組 / 触らなかった ${skipped}組`);
