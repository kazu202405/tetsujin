// xlsxファイルの構造を確認するスクリプト
// 使い方: node scripts/inspect-xlsx.mjs
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { join } from "path";

const RAW_DIR = "data/raw";
const FILES = ["入会者名簿.xlsx", "連絡先情報（回答）.xlsx"];

for (const filename of FILES) {
  const path = join(RAW_DIR, filename);
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📄 ${filename}`);
  console.log("=".repeat(70));

  const buf = readFileSync(path);
  const wb = XLSX.read(buf, { type: "buffer" });

  console.log(`シート一覧: ${wb.SheetNames.join(", ")}`);

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    console.log(`\n--- シート: "${sheetName}" (${rows.length}行) ---`);

    const preview = rows.slice(0, 5);
    preview.forEach((row, i) => {
      console.log(`行${i}:`, JSON.stringify(row).slice(0, 300));
    });

    if (rows.length > 0) {
      const headers = rows[0];
      console.log(`\nカラム数: ${headers?.length ?? 0}`);
      console.log("ヘッダー一覧:");
      headers?.forEach((h, i) => console.log(`  [${i}] ${h}`));
    }
  }
}
