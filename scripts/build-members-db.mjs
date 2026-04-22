// ============================================================
// 入会者名簿.xlsx + 連絡先情報（回答）.xlsx
//   → data/processed/members.csv + members.json を生成
// ============================================================
// 使い方: node scripts/build-members-db.mjs
//
// 重複排除ルール:
//   1. 会員番号が異なる → 別レコード
//   2. 氏名一致 + メール&電話 両方違う → 別レコード
//   3. 氏名一致 + メール or 電話 一致 + 会員番号衝突なし → 新しい方に統合（タイムスタンプ優先）
// ============================================================
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const RAW_DIR = "data/raw";
const OUT_DIR = "data/processed";
mkdirSync(OUT_DIR, { recursive: true });

// ============================================================
// ユーティリティ
// ============================================================
function normalizeName(n) {
  if (n == null) return "";
  return String(n)
    .replace(/[\s　]+/g, "")
    .toLowerCase();
}

function normalizePhone(p) {
  if (p == null) return "";
  return String(p).replace(/[-\s　()（）]/g, "");
}

function normalizeEmail(e) {
  if (e == null) return "";
  return String(e).trim().toLowerCase();
}

// Excel日付シリアル値 → ISO文字列
function excelSerialToISO(v) {
  if (v == null) return null;
  if (typeof v !== "number") return null;
  // 1900年1月1日基点（Excel仕様、1900年うるう年バグ考慮）
  const ms = Math.round((v - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// スタート月の文字列正規化（"2026.1" 数値 → "2026.1" 文字列, Excelシリアル → "YYYY.M"）
function normalizeStartMonth(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // 数値には2パターンある:
    //   (a) 2026.1 のようなYYYY.M表記 → そのまま
    //   (b) 45555 のようなExcelシリアル値（>=40000） → 日付に変換
    if (v >= 40000) {
      const iso = excelSerialToISO(v);
      if (iso) return iso.slice(0, 7).replace("-", "."); // "YYYY-MM" → "YYYY.M"
    }
    return String(v);
  }
  return String(v).trim();
}

function stringOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function numberOrNull(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,円]/g, ""));
  return isNaN(n) ? null : n;
}

// ============================================================
// 1. 入会者名簿を読む
// ============================================================
console.log("📖 入会者名簿.xlsx を読み込み中...");
const nameBook = XLSX.read(readFileSync(join(RAW_DIR, "入会者名簿.xlsx")), { type: "buffer" });

const memberRecords = [];
const sheetsToProcess = nameBook.SheetNames.filter((n) => n !== "原本");

for (const sheetName of sheetsToProcess) {
  const sheet = nameBook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const headerRowIdx = rows.findIndex((r) => Array.isArray(r) && r.includes("名前"));
  if (headerRowIdx < 0) continue;
  const headers = rows[headerRowIdx].map((h) => (h == null ? "" : String(h).trim()));

  const idxOf = (...aliases) => {
    for (const a of aliases) {
      const i = headers.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };

  const col = {
    no: idxOf("№", "No", "waq", "「"),
    name: idxOf("名前"),
    nick: idxOf("呼び名"),
    referrer: idxOf("紹介者"),
    startDate: idxOf("スタート月", "スタート日", "更新日"),
    firstRenewal: idxOf("１回目更新"),
    price: idxOf("料金"),
    referralFee: idxOf("紹介料"),
    job: idxOf("職業"),
    grip: idxOf("グリップ"),
    frequency: idxOf("参加頻度"),
  };

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    const name = stringOrNull(r[col.name]);
    if (!name) continue;

    const firstRenewalVal = r[col.firstRenewal];
    const isWithdrawn = typeof firstRenewalVal === "string" && firstRenewalVal.trim() === "退会";

    memberRecords.push({
      source: "member",
      sheet: sheetName,
      member_no: col.no >= 0 && typeof r[col.no] === "number" ? r[col.no] : null,
      name,
      name_normalized: normalizeName(name),
      nickname: col.nick >= 0 ? stringOrNull(r[col.nick]) : null,
      referrer: col.referrer >= 0 ? stringOrNull(r[col.referrer]) : null,
      start_month: col.startDate >= 0 ? normalizeStartMonth(r[col.startDate]) : null,
      first_renewal: col.firstRenewal >= 0
        ? (typeof firstRenewalVal === "string" ? firstRenewalVal.trim() : firstRenewalVal != null ? String(firstRenewalVal) : null)
        : null,
      price: col.price >= 0 ? numberOrNull(r[col.price]) : null,
      referral_fee: col.referralFee >= 0 ? numberOrNull(r[col.referralFee]) : null,
      job: col.job >= 0 ? stringOrNull(r[col.job]) : null,
      grip: col.grip >= 0 ? stringOrNull(r[col.grip]) : null,
      frequency: col.frequency >= 0 ? stringOrNull(r[col.frequency]) : null,
      is_withdrawn: isWithdrawn,
    });
  }
}
console.log(`  → ${memberRecords.length}件 抽出`);

// ============================================================
// 2. 連絡先情報を読む
// ============================================================
console.log("📖 連絡先情報（回答）.xlsx を読み込み中...");
const contactBook = XLSX.read(readFileSync(join(RAW_DIR, "連絡先情報（回答）.xlsx")), { type: "buffer" });
const contactSheet = contactBook.Sheets["フォームの回答 1"];
const contactRows = XLSX.utils.sheet_to_json(contactSheet, { header: 1, defval: null });

const contactHeaderIdx = contactRows.findIndex((r) => Array.isArray(r) && r.includes("名前"));
const contactHeaders = contactRows[contactHeaderIdx].map((h) => (h == null ? "" : String(h).trim()));

const findIdx = (keyword) => contactHeaders.findIndex((h) => h && h.includes(keyword));
const cc = {
  timestamp: findIdx("タイムスタンプ"),
  memberNo: findIdx("TESUJIN"),
  name: findIdx("名前"),
  job: findIdx("職業"),
  referrer: findIdx("紹介者"),
  startMonth: findIdx("スタート月"),
  kind: findIdx("法人"),
  discount: findIdx("割引"),
  email: findIdx("メール"),
  phone: findIdx("電話"),
  payment: findIdx("支払方法"),
  gender: findIdx("性別"),
  ageRange: findIdx("年代"),
};

const contactRecords = [];
for (let i = contactHeaderIdx + 1; i < contactRows.length; i++) {
  const r = contactRows[i];
  if (!Array.isArray(r)) continue;
  const name = stringOrNull(r[cc.name]);
  if (!name) continue;

  contactRecords.push({
    source: "contact",
    contact_submitted_at: cc.timestamp >= 0 ? excelSerialToISO(r[cc.timestamp]) : null,
    member_no: cc.memberNo >= 0 && typeof r[cc.memberNo] === "number" ? r[cc.memberNo] : null,
    name,
    name_normalized: normalizeName(name),
    job: cc.job >= 0 ? stringOrNull(r[cc.job]) : null,
    referrer: cc.referrer >= 0 ? stringOrNull(r[cc.referrer]) : null,
    start_month: cc.startMonth >= 0 ? normalizeStartMonth(r[cc.startMonth]) : null,
    membership_type: cc.kind >= 0 ? stringOrNull(r[cc.kind]) : null,
    email: cc.email >= 0 ? normalizeEmail(r[cc.email]) || null : null,
    phone: cc.phone >= 0 ? normalizePhone(r[cc.phone]) || null : null,
    payment_method: cc.payment >= 0 ? stringOrNull(r[cc.payment]) : null,
    gender: cc.gender >= 0 ? stringOrNull(r[cc.gender]) : null,
    age_range: cc.ageRange >= 0 ? stringOrNull(r[cc.ageRange]) : null,
  });
}
console.log(`  → ${contactRecords.length}件 抽出`);

// ============================================================
// 3. マッチング＆統合
// ============================================================
console.log("🔗 マッチング・統合中...");

// 連絡先側を氏名でインデックス化（同名複数あり得るので配列）
const contactByName = new Map();
for (const c of contactRecords) {
  const arr = contactByName.get(c.name_normalized) || [];
  arr.push(c);
  contactByName.set(c.name_normalized, arr);
}

// 新しい方基準: タイムスタンプがある側を採用、なければ元の方
function pickNewer(a, b) {
  const ta = a.contact_submitted_at ? new Date(a.contact_submitted_at).getTime() : 0;
  const tb = b.contact_submitted_at ? new Date(b.contact_submitted_at).getTime() : 0;
  return tb > ta ? b : a;
}

// 統合後レコード（member_no 別 / email別 / phone別で別人判定）
const merged = [];
const usedContactIndices = new Set();

// 3-1. 名簿側を起点にマッチ
for (const m of memberRecords) {
  const candidates = contactByName.get(m.name_normalized) || [];
  // 会員番号衝突しない & 未使用 & 氏名一致 のもの
  const matches = candidates.filter((c, idx) => {
    const globalIdx = contactRecords.indexOf(c);
    if (usedContactIndices.has(globalIdx)) return false;
    // 会員番号は基本的に名簿側にしかないので衝突チェックは名簿側同士のみ
    return true;
  });

  let matched = null;
  if (matches.length === 1) {
    matched = matches[0];
  } else if (matches.length > 1) {
    // 複数候補 → タイムスタンプが最新のものを採用
    matched = matches.reduce((acc, cur) => pickNewer(acc, cur));
  }

  if (matched) {
    usedContactIndices.add(contactRecords.indexOf(matched));
    merged.push({
      id: randomUUID(),
      member_no: m.member_no,
      name: m.name,
      name_normalized: m.name_normalized,
      nickname: m.nickname,
      referrer: m.referrer || matched.referrer,
      start_month: m.start_month || matched.start_month,
      first_renewal: m.first_renewal,
      price: m.price,
      referral_fee: m.referral_fee,
      job: m.job || matched.job,
      grip: m.grip,
      frequency: m.frequency,
      email: matched.email,
      phone: matched.phone,
      gender: matched.gender,
      age_range: matched.age_range,
      membership_type: matched.membership_type,
      payment_method: matched.payment_method,
      contact_submitted_at: matched.contact_submitted_at,
      source: "both",
      is_withdrawn: m.is_withdrawn,
      import_sheet: m.sheet,
    });
  } else {
    // 連絡先側にマッチなし
    merged.push({
      id: randomUUID(),
      member_no: m.member_no,
      name: m.name,
      name_normalized: m.name_normalized,
      nickname: m.nickname,
      referrer: m.referrer,
      start_month: m.start_month,
      first_renewal: m.first_renewal,
      price: m.price,
      referral_fee: m.referral_fee,
      job: m.job,
      grip: m.grip,
      frequency: m.frequency,
      email: null,
      phone: null,
      gender: null,
      age_range: null,
      membership_type: null,
      payment_method: null,
      contact_submitted_at: null,
      source: "member_only",
      is_withdrawn: m.is_withdrawn,
      import_sheet: m.sheet,
    });
  }
}

// 3-2. 連絡先側で使われなかったものを追加（connect_only）
for (let idx = 0; idx < contactRecords.length; idx++) {
  if (usedContactIndices.has(idx)) continue;
  const c = contactRecords[idx];
  merged.push({
    id: randomUUID(),
    member_no: c.member_no,
    name: c.name,
    name_normalized: c.name_normalized,
    nickname: null,
    referrer: c.referrer,
    start_month: c.start_month,
    first_renewal: null,
    price: null,
    referral_fee: null,
    job: c.job,
    grip: null,
    frequency: null,
    email: c.email,
    phone: c.phone,
    gender: c.gender,
    age_range: c.age_range,
    membership_type: c.membership_type,
    payment_method: c.payment_method,
    contact_submitted_at: c.contact_submitted_at,
    source: "contact_only",
    is_withdrawn: false,
    import_sheet: null,
  });
}

// ============================================================
// 3-3. 二次重複排除: 氏名＋メール or 電話 一致で member_no 衝突なし なら統合
// ============================================================
console.log("🔄 二次重複排除中（メール/電話一致）...");
const beforeDedup = merged.length;

function canMerge(a, b) {
  if (a.name_normalized !== b.name_normalized) return false;
  // 会員番号が両方埋まってて異なる → 別人
  if (a.member_no != null && b.member_no != null && a.member_no !== b.member_no) return false;
  // メールかフォンのどちらかが一致（かつ空でない）
  const emailMatch = a.email && b.email && normalizeEmail(a.email) === normalizeEmail(b.email);
  const phoneMatch = a.phone && b.phone && normalizePhone(a.phone) === normalizePhone(b.phone);
  return emailMatch || phoneMatch;
}

function mergeTwo(newer, older) {
  // 新しい方をベースに、古い方で空欄を埋める
  const out = { ...newer };
  for (const k of Object.keys(older)) {
    if (out[k] == null && older[k] != null) out[k] = older[k];
  }
  // source更新: どちらかがbothならboth、それ以外は新しい方のsource
  if (newer.source === "both" || older.source === "both") out.source = "both";
  else if (newer.source !== older.source) out.source = "both";
  return out;
}

function isNewer(a, b) {
  const ta = a.contact_submitted_at ? new Date(a.contact_submitted_at).getTime() : 0;
  const tb = b.contact_submitted_at ? new Date(b.contact_submitted_at).getTime() : 0;
  if (ta !== tb) return ta > tb;
  // タイムスタンプ同じ or 両方null → 会員番号が大きい方
  return (a.member_no || 0) > (b.member_no || 0);
}

let dedupPass = 0;
let changed = true;
while (changed && dedupPass < 5) {
  changed = false;
  dedupPass++;
  outer: for (let i = 0; i < merged.length; i++) {
    for (let j = i + 1; j < merged.length; j++) {
      if (canMerge(merged[i], merged[j])) {
        const [newer, older] = isNewer(merged[i], merged[j]) ? [merged[i], merged[j]] : [merged[j], merged[i]];
        const combined = mergeTwo(newer, older);
        // j を削除、i を置換
        const iIdx = merged.indexOf(merged[i]);
        const jIdx = merged.indexOf(merged[j]);
        const [a, b] = [Math.max(iIdx, jIdx), Math.min(iIdx, jIdx)];
        merged.splice(a, 1);
        merged[b] = combined;
        changed = true;
        break outer;
      }
    }
  }
}
console.log(`  → ${beforeDedup} → ${merged.length}件（${beforeDedup - merged.length}件を統合）`);

// ============================================================
// 4. 件数サマリ
// ============================================================
const counts = merged.reduce((acc, r) => {
  acc[r.source] = (acc[r.source] || 0) + 1;
  if (r.is_withdrawn) acc.withdrawn = (acc.withdrawn || 0) + 1;
  return acc;
}, {});
console.log("\n📊 統合後の内訳:");
console.log(`  合計: ${merged.length}件`);
console.log(`  - both        : ${counts.both || 0}件`);
console.log(`  - member_only : ${counts.member_only || 0}件`);
console.log(`  - contact_only: ${counts.contact_only || 0}件`);
console.log(`  - うち退会者  : ${counts.withdrawn || 0}件`);

// ============================================================
// 5. CSV / JSON 書き出し
// ============================================================
const csvColumns = [
  "id", "member_no", "name", "name_normalized", "nickname",
  "referrer", "start_month", "first_renewal", "price", "referral_fee",
  "job", "grip", "frequency",
  "email", "phone", "gender", "age_range", "membership_type",
  "payment_method", "contact_submitted_at",
  "source", "is_withdrawn", "import_sheet",
];

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const csv = [
  csvColumns.join(","),
  ...merged.map((r) => csvColumns.map((c) => csvCell(r[c])).join(",")),
].join("\n");

writeFileSync(join(OUT_DIR, "members.csv"), "﻿" + csv, "utf8"); // BOM付き（Excel互換）
writeFileSync(join(OUT_DIR, "members.json"), JSON.stringify(merged, null, 2), "utf8");

// Next.jsから読み込むために public 配下にも配置（gitignore済み → Vercelには上がらない）
mkdirSync("public", { recursive: true });
writeFileSync(join("public", "members-db.json"), JSON.stringify(merged), "utf8");

console.log(`\n✅ 出力完了:`);
console.log(`   ${join(OUT_DIR, "members.csv")}`);
console.log(`   ${join(OUT_DIR, "members.json")}`);
console.log(`   public/members-db.json (アプリ読み込み用)`);
