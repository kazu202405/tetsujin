// ============================================================
// data/processed/members.json → Supabase members テーブルへ投入
// ============================================================
// 使い方:
//   node scripts/import-members-to-supabase.mjs            # ドライラン（既定・書き込まない）
//   node scripts/import-members-to-supabase.mjs --execute   # 実投入
//   node scripts/import-members-to-supabase.mjs --execute --wipe  # 全削除してから投入
//
// 必要な環境変数（.env.local に置く。git管理外）:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   ← service_role キー。RLS全拒否のため必須
//
// 🔴 このスクリプトは「運用開始前」専用。
//    build-members-db.mjs は毎回 id を randomUUID() で振り直すため、
//    会員が触ったデータがDBに入った後に再実行すると全ての紐付けが壊れる。
//    運用開始後は本アプリの admin CRUD が会員データの正となる（打合せ確定方針）。
// ============================================================
import { readFileSync, existsSync } from "fs";

const SRC = "data/processed/members.json";
const TABLE = "members";
const CHUNK_SIZE = 100;

// members テーブルに存在するカラムのみ送る（想定外キーがあれば投入前に検出する）
const COLUMNS = [
  "id", "member_no", "name", "name_normalized", "nickname",
  "referrer", "start_year", "start_month", "renewal_status", "renewal_fee",
  "price", "referral_fee", "job", "grip", "frequency",
  "email", "phone", "gender", "age_range", "membership_type",
  "payment_method", "contact_submitted_at", "is_withdrawn", "source", "import_sheet",
];

const RENEWAL_STATUSES = ["未更新", "退会", "更新済", "返事待ち", "入金待ち"];
const SOURCES = ["both", "member_only", "contact_only"];

// ============================================================
// .env.local を読む（依存パッケージなし）
// ============================================================
function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

// ============================================================
// 事前検証: スキーマの制約に反する行を投入前に洗い出す
// ============================================================
function validate(rows) {
  const errors = [];
  const seenId = new Set();
  const seenMemberNo = new Set();

  rows.forEach((row, i) => {
    const where = `[${i}] ${row.name ?? "(名前なし)"}`;

    const unknown = Object.keys(row).filter((k) => !COLUMNS.includes(k));
    if (unknown.length) errors.push(`${where}: 未知のカラム ${unknown.join(",")}`);

    if (!row.id) errors.push(`${where}: id なし`);
    else if (seenId.has(row.id)) errors.push(`${where}: id 重複 ${row.id}`);
    else seenId.add(row.id);

    if (!row.name) errors.push(`${where}: name が空（NOT NULL 違反）`);
    if (!row.name_normalized) errors.push(`${where}: name_normalized が空（NOT NULL 違反）`);

    if (row.member_no != null) {
      if (seenMemberNo.has(row.member_no)) errors.push(`${where}: member_no 重複 ${row.member_no}`);
      else seenMemberNo.add(row.member_no);
    }

    if (!RENEWAL_STATUSES.includes(row.renewal_status))
      errors.push(`${where}: renewal_status が不正 "${row.renewal_status}"`);
    if (!SOURCES.includes(row.source))
      errors.push(`${where}: source が不正 "${row.source}"`);

    if (row.start_month != null && !(row.start_month >= 1 && row.start_month <= 12))
      errors.push(`${where}: start_month が範囲外 ${row.start_month}`);
    if (row.start_year != null && !(row.start_year >= 2000 && row.start_year <= 2100))
      errors.push(`${where}: start_year が範囲外 ${row.start_year}`);
  });

  return errors;
}

// ============================================================
// Supabase REST（PostgREST）呼び出し
// ============================================================
function makeClient(url, key) {
  const base = url.replace(/\/$/, "");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  return {
    async count() {
      const res = await fetch(`${base}/rest/v1/${TABLE}?select=id`, {
        method: "HEAD",
        headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
      });
      if (!res.ok) throw new Error(`件数取得に失敗 (${res.status}): ${await res.text()}`);
      const range = res.headers.get("content-range") ?? "";
      return Number(range.split("/")[1] ?? 0);
    },

    async deleteAll() {
      // 全行削除（PostgREST は無条件 DELETE を許さないため常に真の条件を付ける）
      const res = await fetch(`${base}/rest/v1/${TABLE}?id=not.is.null`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`削除に失敗 (${res.status}): ${await res.text()}`);
    },

    async insert(chunk) {
      const res = await fetch(`${base}/rest/v1/${TABLE}`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) throw new Error(`投入に失敗 (${res.status}): ${await res.text()}`);
    },
  };
}

// ============================================================
// main
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const wipe = args.includes("--wipe");

  loadEnvLocal();

  if (!existsSync(SRC)) {
    console.error(`❌ ${SRC} がありません。先に \`npm run build:members-db\` を実行してください。`);
    process.exit(1);
  }

  const rows = JSON.parse(readFileSync(SRC, "utf8"));
  console.log(`📄 ${SRC} を読み込み: ${rows.length}件\n`);

  // --- 検証 ---
  const errors = validate(rows);
  if (errors.length) {
    console.error(`❌ 検証エラー ${errors.length}件（投入を中止します）`);
    errors.slice(0, 20).forEach((e) => console.error(`   ${e}`));
    if (errors.length > 20) console.error(`   ...他 ${errors.length - 20}件`);
    process.exit(1);
  }
  console.log("✅ 検証OK（カラム・NOT NULL・重複・CHECK制約すべて通過）");

  // --- サマリ ---
  const withdrawn = rows.filter((r) => r.is_withdrawn).length;
  const withNo = rows.filter((r) => r.member_no != null).length;
  const withContact = rows.filter((r) => r.email || r.phone).length;
  console.log(`   在籍 ${rows.length - withdrawn} / 退会 ${withdrawn}`);
  console.log(`   会員番号あり ${withNo} / なし ${rows.length - withNo}`);
  console.log(`   連絡先あり ${withContact} / なし ${rows.length - withContact}\n`);

  if (!execute) {
    console.log("🔍 ドライランです。DBには一切書き込んでいません。");
    console.log("   実行するには --execute を付けてください。");
    return;
  }

  // --- 接続情報 ---
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です（.env.local を確認）");
    process.exit(1);
  }

  const db = makeClient(url, key);
  const before = await db.count();
  console.log(`🔌 接続OK。現在の members: ${before}件`);

  if (before > 0 && !wipe) {
    console.error(`❌ 既に ${before}件入っています。重複投入を防ぐため中止しました。`);
    console.error("   全入れ替えするなら --wipe を付けてください（運用開始前のみ）。");
    process.exit(1);
  }

  if (wipe && before > 0) {
    console.log(`🗑️  既存 ${before}件を削除します...`);
    await db.deleteAll();
    console.log("   削除完了");
  }

  // --- 投入 ---
  const payload = rows.map((r) => Object.fromEntries(COLUMNS.map((c) => [c, r[c] ?? null])));
  let done = 0;
  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    await db.insert(chunk);
    done += chunk.length;
    console.log(`   投入 ${done}/${payload.length}`);
  }

  const after = await db.count();
  console.log(`\n✅ 完了。members: ${after}件`);
  if (after !== rows.length) {
    console.error(`⚠️  期待 ${rows.length}件と一致しません。確認してください。`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
