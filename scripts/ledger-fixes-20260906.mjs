// ============================================================
// 台帳の一括修正（2026-09-06 依頼分）
// ============================================================
// 使い方:
//   node scripts/ledger-fixes-20260906.mjs            … 確認だけ（何も書かない）
//   node scripts/ledger-fixes-20260906.mjs --execute  … 実行
//
// 必要な環境変数（.env.local）: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//
// ------------------------------------------------------------
// 何をするか
// ------------------------------------------------------------
// ① 課金開始日を「入会月の翌月」に寄せる
//    202608080018_billing.sql が next_renewal_date() で入れた値は
//    「次に来る入会月の1日」＝入会月と同じ月。依頼主の運用はその翌月で、
//    川原さんは一部の会員に手で翌月を入れている
//    （米山司・関口勝・萩原清孝・原田義行）。
//    ∴ 自動で入った分だけを1か月ずらして揃える。
//
//    🔴 対象は「月が入会月と一致する行」だけ。すでに翌月になっている行は
//       二度ずらさない。∴ 何度流しても結果が変わらない。
//    🔴 退会者は請求しないので触らない。
//
// ② 会員種別が空の在籍者を「個人」にする
//    2026-08-25 の川原さん判断（法人は少ないので空欄は一旦すべて個人）を
//    billing_plan_code だけでなく membership_type にも適用する。
//    退会者は触らない（請求もフィルタも関係がなく、当時の実態も分からない）。
//
// ③ 重複した会員行の統合（林 佑二 / 大山重行）
//    運営が「既存の会員に紐づける」を選ばずに承認したため、
//    台帳の行とは別に、本人がログインする行ができている。
//
//    🔴 統合の向きは「活動のある行を残し、台帳の情報をそちらへ移す」。
//       members への外部キーは大半が ON DELETE CASCADE で、行を消すと
//       投稿・つながり・通知が警告なしに道連れになる
//       （2026-08-13 荒木さんの統合と同じ向き）。
//    🔴 台帳側の行は消さずに退会扱いで残す（可逆）。member_no は UNIQUE
//       なので、先に台帳側を空けてから移す。
//    🔴 メール・電話・auth_user_id・権限・写真は残す行のものを触らない。
//       ログインの鍵なので、書き換えると本人が入れなくなる。
//
// ④ 会員番号4を 岩本良平さんへ付け替える
//    4番の川上さん（退会済み・他テーブルからの参照0件）から番号を外し、
//    岩本さんに付ける。川上さんの行自体は消さない（あとから戻せるように）。
// ============================================================
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";

// ------------------------------------------------------------
// 準備
// ------------------------------------------------------------
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

/**
 * 1行だけを、いま入っている値を確かめてから書き換える。
 *
 * 🔴 運営が同じ画面を開いて直している最中に流す可能性がある。
 *    条件に「今こうなっているはず」を入れておくと、途中で変わった行は
 *    0件返って書き換わらない＝黙って上書きしない。
 */
async function patchOne(id, guard, patch, label) {
  if (!EXECUTE) {
    console.log("  [確認] " + label);
    return "dry";
  }
  const rows = await rest("members?id=eq." + id + guard, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!rows || rows.length === 0) {
    console.log("  ⚠️ 変わっていました（書き換えていません）: " + label);
    return "conflict";
  }
  console.log("  ✅ " + label);
  return "ok";
}

const normalize = (name) => name.replace(/[\s　]+/g, "").toLowerCase();

/** 'YYYY-MM-01' を1か月進める */
function nextMonthFirst(iso) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return ny + "-" + String(nm).padStart(2, "0") + "-01";
}

const ALL_COLUMNS =
  "id,member_no,name,name_normalized,nickname,referrer,start_year,start_month,renewal_status," +
  "renewal_fee,renewal_note,price,referral_fee,job,grip,frequency,email,phone,gender,age_range," +
  "membership_type,payment_method,contact_submitted_at,is_withdrawn,withdrawn_at,withdrawal_reason," +
  "auth_user_id,role,admin_note,source,import_sheet,avatar_path,billing_plan_code,billing_starts_on," +
  "billing_exempt,stripe_customer_id";

const members = await rest("members?select=" + ALL_COLUMNS + "&limit=2000");
console.log("会員 " + members.length + "件（在籍 " + members.filter((r) => !r.is_withdrawn).length + "）");
console.log(EXECUTE ? "モード: 実行\n" : "モード: 確認のみ（--execute で実行）\n");

if (EXECUTE) {
  // 🔴 バックアップは backups/（.gitignore 済み）へ。氏名・メール・電話が入るので
  //    リポジトリに残す場所に書かない。
  mkdirSync("backups", { recursive: true });
  const path = "backups/members-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  writeFileSync(path, JSON.stringify(members, null, 1), "utf8");
  console.log("変更前の全行を " + path + " に保存しました\n");
}

const byId = new Map(members.map((r) => [r.id, r]));
const counts = { ok: 0, conflict: 0, dry: 0 };
const tally = (r) => {
  counts[r] = (counts[r] || 0) + 1;
};

// ------------------------------------------------------------
// ① 課金開始日を入会月の翌月へ
// ------------------------------------------------------------
console.log("① 課金開始日を「入会月の翌月」に揃える");
const shiftTargets = members.filter(
  (r) =>
    !r.is_withdrawn &&
    r.billing_starts_on &&
    r.start_month != null &&
    r.billing_starts_on.endsWith("-01") &&
    Number(r.billing_starts_on.slice(5, 7)) === r.start_month
);
console.log("  対象 " + shiftTargets.length + "件（すでに翌月の行・退会者は対象外）");
for (const r of shiftTargets) {
  const next = nextMonthFirst(r.billing_starts_on);
  tally(
    await patchOne(
      r.id,
      "&billing_starts_on=eq." + r.billing_starts_on,
      { billing_starts_on: next },
      (r.member_no ?? "番号なし") + " " + r.name + ": " + r.billing_starts_on + " → " + next
    )
  );
}

// ------------------------------------------------------------
// ② 会員種別が空の在籍者を「個人」に
// ------------------------------------------------------------
console.log("\n② 会員種別が空の在籍者を「個人」にする");
const typeTargets = members.filter(
  (r) => !r.is_withdrawn && (r.membership_type == null || r.membership_type.trim() === "")
);
const withdrawnBlank = members.filter((r) => r.is_withdrawn && !r.membership_type).length;
console.log("  対象 " + typeTargets.length + "件（退会者 " + withdrawnBlank + "件は触らない）");
for (const r of typeTargets) {
  tally(
    await patchOne(
      r.id,
      "&or=(membership_type.is.null,membership_type.eq.)",
      { membership_type: "個人" },
      (r.member_no ?? "番号なし") + " " + r.name + " → 個人"
    )
  );
}

// ------------------------------------------------------------
// ③ 重複行の統合
// ------------------------------------------------------------
// 台帳が正（上書き）  … 会員番号・入会・更新・金額・紹介者・職業・取込シート
// 空のときだけ入れる  … 呼び名・種別・性別・年代・支払方法・プラン・課金開始日
// 触らない            … メール・電話・auth_user_id・権限・写真・免除・Stripe顧客ID
const MERGES = [
  {
    label: "林 佑二",
    ledgerId: "b22e46f2-82e9-4c4e-9665-d2eacc665fe4", // 会員番号167（ログイン紐づけなし・参照0件）
    keepId: "b12082bf-636e-43c2-8949-15126990aa17", // 本人がログインしている行（申請・掲示板既読あり）
    expectNo: 167,
    // 残す行は「林　佑ニ」＝カタカナのニ。台帳の表記に寄せる
    name: "林佑二",
  },
  {
    label: "大山重行",
    ledgerId: "dc5fb435-0f94-48b7-af49-3fb6f0882211", // 会員番号338
    keepId: "26ab82ed-69bf-4921-bfab-e8a3965ff88f", // 本人の行（投稿1件・通知・部長）
    expectNo: 338,
    // 残す行の名前は「大山重行(カピバラ)」。台帳の表記に戻し、呼び名へ移す
    name: "大山重行",
    nickname: "カピバラ",
  },
];

console.log("\n③ 重複した会員行の統合");
for (const m of MERGES) {
  const ledger = byId.get(m.ledgerId);
  const keep = byId.get(m.keepId);
  if (!ledger || !keep) {
    console.log("  ⚠️ " + m.label + ": 行が見つかりません（すでに統合済み？）");
    continue;
  }
  if (ledger.member_no !== m.expectNo) {
    console.log("  ⚠️ " + m.label + ": 台帳側の会員番号が " + ledger.member_no + "（" + m.expectNo + "のはず）。触りません");
    continue;
  }
  console.log("  " + m.label + ": 番号" + m.expectNo + "「" + ledger.name + "」→ ログイン中の行「" + keep.name + "」へ寄せる");

  // 先に台帳側から番号を外す（member_no は UNIQUE）
  tally(
    await patchOne(
      ledger.id,
      "&member_no=eq." + m.expectNo,
      {
        member_no: null,
        is_withdrawn: true,
        withdrawn_at: new Date().toISOString(),
        withdrawal_reason: "重複行の統合",
        admin_note:
          "2026-09-06 重複していたため、会員番号" + m.expectNo +
          "と台帳の内容を本人のログイン行(" + keep.id + ")へ移しました。この行は記録として残しています。",
      },
      "台帳側 " + ledger.name + ": 番号を外して退会扱いに"
    )
  );

  const patch = {
    member_no: m.expectNo,
    start_year: ledger.start_year,
    start_month: ledger.start_month,
    renewal_status: ledger.renewal_status,
    renewal_fee: ledger.renewal_fee,
    renewal_note: ledger.renewal_note,
    price: ledger.price,
    referral_fee: ledger.referral_fee,
    referrer: ledger.referrer,
    job: ledger.job,
    import_sheet: ledger.import_sheet,
    source: "both",
    admin_note: "2026-09-06 会員番号" + m.expectNo + "の台帳行(" + ledger.id + ")を統合しました。",
  };
  if (m.name) {
    patch.name = m.name;
    patch.name_normalized = normalize(m.name);
  }
  if (!keep.nickname) patch.nickname = m.nickname || ledger.nickname || null;
  for (const f of [
    "membership_type", "grip", "frequency", "gender", "age_range",
    "payment_method", "billing_plan_code", "billing_starts_on",
  ]) {
    if ((keep[f] == null || keep[f] === "") && ledger[f] != null && ledger[f] !== "") patch[f] = ledger[f];
  }
  // 課金開始日を台帳から入れる場合は①と同じ「翌月」にしてから入れる
  if (
    patch.billing_starts_on &&
    ledger.start_month != null &&
    Number(patch.billing_starts_on.slice(5, 7)) === ledger.start_month
  ) {
    patch.billing_starts_on = nextMonthFirst(patch.billing_starts_on);
  }
  if (keep.billing_starts_on && ledger.billing_starts_on && keep.billing_starts_on !== ledger.billing_starts_on) {
    console.log(
      "     ⚠️ 課金開始日が2つの行で違います。残す行の " + keep.billing_starts_on +
      " をそのままにしました（台帳側は " + ledger.billing_starts_on + "）"
    );
  }
  tally(await patchOne(keep.id, "", patch, "残す行 " + keep.name + ": 番号" + m.expectNo + "と台帳の内容を反映"));
}

// ------------------------------------------------------------
// ④ 会員番号4を 岩本良平さんへ
// ------------------------------------------------------------
console.log("\n④ 会員番号4の付け替え");
const OLD4 = "db96076f-9981-4df7-8bf1-9b0d8f5082a0"; // 川上さん（退会済み・参照0件）
const IWAMOTO = "155712ff-a7d7-4ca9-a6e7-8aae7949f5dd"; // 岩本良平さん（管理者・番号なし）
const old4 = byId.get(OLD4);
const iwamoto = byId.get(IWAMOTO);
if (!old4 || old4.member_no !== 4) {
  console.log("  ⚠️ 会員番号4の行が想定と違います（" + (old4 ? old4.member_no : "行なし") + "）。触りません");
} else if (!iwamoto) {
  console.log("  ⚠️ 岩本良平さんの行が見つかりません。触りません");
} else if (iwamoto.member_no != null) {
  console.log("  ⚠️ 岩本良平さんにはすでに番号 " + iwamoto.member_no + " が付いています。触りません");
} else {
  tally(
    await patchOne(
      OLD4,
      "&member_no=eq.4",
      {
        member_no: null,
        admin_note:
          "2026-09-06 会員番号4を岩本良平さんへ付け替えました（この行は退会済みのため、番号だけ外しています）。",
      },
      old4.name + "さん(退会済み): 番号4を外す"
    )
  );
  tally(await patchOne(IWAMOTO, "&member_no=is.null", { member_no: 4 }, "岩本良平さん: 会員番号4"));
}

console.log(
  "\n結果: 成功 " + (counts.ok || 0) + " / 競合 " + (counts.conflict || 0) + " / 確認のみ " + (counts.dry || 0)
);
if (counts.conflict) {
  console.log("⚠️ 競合した行は、いまの値が想定と違ったので書き換えていません。もう一度流すと拾えます。");
}
