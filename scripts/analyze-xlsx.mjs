// xlsxの実データ分析スクリプト
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { join } from "path";

const RAW_DIR = "data/raw";

// ------- 入会者名簿の全レコード抽出 -------
const nameBook = XLSX.read(readFileSync(join(RAW_DIR, "入会者名簿.xlsx")), { type: "buffer" });
const memberRecords = [];
const sheetsToProcess = nameBook.SheetNames.filter((n) => n !== "原本");

for (const sheetName of sheetsToProcess) {
  const sheet = nameBook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // ヘッダー行を探す（「名前」列を含む最初の行）
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
    const name = r[col.name];
    if (!name || String(name).trim() === "") continue;
    memberRecords.push({
      sheet: sheetName,
      no: r[col.no],
      name: String(name).trim(),
      nick: col.nick >= 0 ? r[col.nick] : null,
      referrer: col.referrer >= 0 ? r[col.referrer] : null,
      startDate: col.startDate >= 0 ? r[col.startDate] : null,
      firstRenewal: col.firstRenewal >= 0 ? r[col.firstRenewal] : null,
      price: col.price >= 0 ? r[col.price] : null,
      referralFee: col.referralFee >= 0 ? r[col.referralFee] : null,
      job: col.job >= 0 ? r[col.job] : null,
      grip: col.grip >= 0 ? r[col.grip] : null,
      frequency: col.frequency >= 0 ? r[col.frequency] : null,
    });
  }
}

console.log(`\n=== 入会者名簿: ${memberRecords.length}件 ===`);

// 退会者のパターン
const withdrawn = memberRecords.filter((r) => r.firstRenewal === "退会");
console.log(`退会者: ${withdrawn.length}件`);

// 会員番号の有無
const withNo = memberRecords.filter((r) => r.no != null && r.no !== "");
console.log(`会員番号あり: ${withNo.length}件 / なし: ${memberRecords.length - withNo.length}件`);

// 名前重複チェック
const nameCount = new Map();
memberRecords.forEach((r) => {
  const n = normalizeName(r.name);
  nameCount.set(n, (nameCount.get(n) || 0) + 1);
});
const dupes = [...nameCount.entries()].filter(([, c]) => c > 1);
console.log(`名簿内の名前重複: ${dupes.length}件`);
if (dupes.length > 0) {
  console.log("  →", dupes.slice(0, 10).map(([n, c]) => `${n}(${c})`).join(", "));
}

// startDateのバリエーション
const startDateTypes = new Set(memberRecords.map((r) => typeof r.startDate));
console.log("startDate型:", [...startDateTypes].join(", "));
console.log("startDate例:", memberRecords.slice(0, 10).map((r) => `${r.name}:${r.startDate}(${typeof r.startDate})`).join(" / "));

// ------- 連絡先情報の全レコード抽出 -------
const contactBook = XLSX.read(readFileSync(join(RAW_DIR, "連絡先情報（回答）.xlsx")), { type: "buffer" });
const contactSheet = contactBook.Sheets["フォームの回答 1"];
const contactRows = XLSX.utils.sheet_to_json(contactSheet, { header: 1, defval: null });

const contactHeaderIdx = contactRows.findIndex((r) => Array.isArray(r) && r.includes("名前"));
const contactHeaders = contactRows[contactHeaderIdx].map((h) => (h == null ? "" : String(h).trim()));
console.log(`\n連絡先ヘッダー行: ${contactHeaderIdx}`);

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
  agreement: findIdx("規約"),
  payment: -1,
  gender: -1,
};
// 支払方法・性別はヘッダー名が微妙なので、値から推測する前にヘッダーを確認
console.log("連絡先ヘッダー一覧:");
contactHeaders.forEach((h, i) => console.log(`  [${i}] ${(h || "").slice(0, 50)}`));

const contactRecords = [];
for (let i = contactHeaderIdx + 1; i < contactRows.length; i++) {
  const r = contactRows[i];
  if (!Array.isArray(r)) continue;
  const name = r[cc.name];
  if (!name || String(name).trim() === "") continue;
  contactRecords.push({
    timestamp: r[cc.timestamp],
    memberNo: cc.memberNo >= 0 ? r[cc.memberNo] : null,
    name: String(name).trim(),
    job: cc.job >= 0 ? r[cc.job] : null,
    referrer: cc.referrer >= 0 ? r[cc.referrer] : null,
    startMonth: cc.startMonth >= 0 ? r[cc.startMonth] : null,
    kind: cc.kind >= 0 ? r[cc.kind] : null,
    discount: cc.discount >= 0 ? r[cc.discount] : null,
    email: cc.email >= 0 ? r[cc.email] : null,
    phone: cc.phone >= 0 ? r[cc.phone] : null,
    // 全カラムも保持して後で確認
    _raw: r,
  });
}
console.log(`\n=== 連絡先情報: ${contactRecords.length}件 ===`);

// 名前重複チェック
const contactNameCount = new Map();
contactRecords.forEach((r) => {
  const n = normalizeName(r.name);
  contactNameCount.set(n, (contactNameCount.get(n) || 0) + 1);
});
const contactDupes = [...contactNameCount.entries()].filter(([, c]) => c > 1);
console.log(`連絡先内の名前重複: ${contactDupes.length}件`);
if (contactDupes.length > 0) {
  console.log("  →", contactDupes.slice(0, 15).map(([n, c]) => `${n}(${c})`).join(", "));
}

// メール/電話の充足度
const withEmail = contactRecords.filter((r) => r.email && String(r.email).includes("@"));
const withPhone = contactRecords.filter((r) => r.phone && String(r.phone).trim() !== "");
console.log(`メールあり: ${withEmail.length} / 電話あり: ${withPhone.length}`);

// ------- マッチング検証 -------
function normalizeName(n) {
  return String(n)
    .replace(/\s+/g, "")
    .replace(/　/g, "")
    .replace(/[　\s]/g, "")
    .toLowerCase();
}

const memberNameSet = new Set(memberRecords.map((r) => normalizeName(r.name)));
const contactNameSet = new Set(contactRecords.map((r) => normalizeName(r.name)));

const onlyInMember = [...memberNameSet].filter((n) => !contactNameSet.has(n));
const onlyInContact = [...contactNameSet].filter((n) => !memberNameSet.has(n));
const matched = [...memberNameSet].filter((n) => contactNameSet.has(n));

console.log(`\n=== マッチング（氏名ベース / スペース正規化後） ===`);
console.log(`両方に存在: ${matched.length}`);
console.log(`名簿のみ（連絡先なし）: ${onlyInMember.length}`);
console.log(`連絡先のみ（名簿なし）: ${onlyInContact.length}`);
console.log(`\n名簿のみ サンプル:`);
memberRecords.filter((r) => !contactNameSet.has(normalizeName(r.name))).slice(0, 15).forEach((r) => {
  console.log(`  №${r.no} ${r.name}`);
});
console.log(`\n連絡先のみ サンプル:`);
contactRecords.filter((r) => !memberNameSet.has(normalizeName(r.name))).slice(0, 15).forEach((r) => {
  console.log(`  ${r.name} (${r.email})`);
});
