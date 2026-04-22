// 会員番号の重複をチェック
import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("data/processed/members.json", "utf8"));

const byNumber = new Map();
for (const m of data) {
  if (m.member_no == null) continue;
  const arr = byNumber.get(m.member_no) || [];
  arr.push(m);
  byNumber.set(m.member_no, arr);
}

const dupes = [...byNumber.entries()]
  .filter(([, arr]) => arr.length > 1)
  .sort(([a], [b]) => Number(a) - Number(b));

console.log(`重複している会員番号: ${dupes.length}件\n`);

for (const [no, members] of dupes) {
  console.log(`■ 番号 ${no} (${members.length}件)`);
  for (const m of members) {
    const status = m.is_withdrawn ? "退会" : "現役";
    const src = m.source === "both" ? "両方" : m.source === "member_only" ? "名簿のみ" : "連絡先のみ";
    const start = m.start_month || "—";
    const sheet = m.import_sheet || "—";
    console.log(`  [${status}] ${m.name}${m.nickname ? ` (${m.nickname})` : ""} / スタート:${start} / 出典:${src} / シート:${sheet}`);
  }
  console.log();
}
