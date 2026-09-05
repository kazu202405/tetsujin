#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TETSUJIN.xlsx に翌月ぶんの請求書シートを足す。

使い方:
    python tools/invoice/make_invoice.py          # 今月ぶんを作る
    python tools/invoice/make_invoice.py 2610     # 月を指定して作る
    python tools/invoice/make_invoice.py 2610 --dry-run

規則（依頼主決定 2026-09-06）:
    シート名   請求書<YYMM>
    請求番号   前月末日 YYMMDD + "-001"   例: 2610 → 260930-001
    発行日     当月 1日
    支払期限   当月 5日

--------------------------------------------------------------------
🔴 openpyxl を使わない理由
--------------------------------------------------------------------
このブックは各請求書シートの下端に「直線コネクタ」（図形）を持っており、
印刷設定(printerSettings*.bin)と外部参照(externalLink1.xml)もある。
openpyxl は読み書きすると図形を落とす。請求書は見た目が中身なので、
線が消えたことに気づかないまま相手に送ることになる。

∴ xlsx（実体は zip）を直接組み立てる。前月のシートXMLをそのまま複製し、
   3つのセルだけ差し替える。書式・図形・印刷設定は1バイトも触らない。

--------------------------------------------------------------------
⚠️ 金額は引き継ぐだけ
--------------------------------------------------------------------
明細（C17 品名 / K17 単価）は前月の値をそのまま複製する。
紹介手数料は月によって変わる（2606=13,637 / 2608,2609=25,000）ため、
機械では決められない。作成後に金額を確認すること。実行時にも警告を出す。
"""
import argparse
import datetime
import os
import re
import shutil
import sys
import zipfile

# 🔴 Windows のコンソールは cp932。絵文字を出そうとすると
#    UnicodeEncodeError で落ちる（ファイルは書けているのに失敗に見える）。
#    表示できない文字は「?」に落として、処理は止めない。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors="replace")
    except (AttributeError, ValueError):
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
BOOK = os.path.join(HERE, "TETSUJIN.xlsx")

WS_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
DRAW_TYPE = "application/vnd.openxmlformats-officedocument.drawing+xml"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# Excel の日付シリアル値の起点。1900年うるう年バグのぶん 12/30 が 0 日目になる。
EPOCH = datetime.date(1899, 12, 30)


def serial(d: datetime.date) -> int:
    return (d - EPOCH).days


def last_day_of_prev_month(d: datetime.date) -> datetime.date:
    return d.replace(day=1) - datetime.timedelta(days=1)


def parse_yymm(s: str) -> datetime.date:
    if not re.fullmatch(r"\d{4}", s):
        raise ValueError("月は YYMM の4桁で指定してください（例: 2610）")
    year, month = 2000 + int(s[:2]), int(s[2:])
    if not 1 <= month <= 12:
        raise ValueError("月が 1〜12 の範囲にありません: " + s)
    return datetime.date(year, month, 1)


def set_cell(xml: str, ref: str, inner: str, keep_type: str) -> str:
    """
    セル1つを差し替える。style 属性 (s=) は必ず引き継ぐ＝見た目を変えない。

    🔴 対象セルだけを確実に捉える。<c r="M2" ...>...</c> と自己終了型
       <c r="M2" .../> の両方があり得るので、どちらも受ける。
    """
    pattern = re.compile(r'<c r="%s"((?:\s+[a-zA-Z:]+="[^"]*")*)\s*(/>|>.*?</c>)' % ref, re.S)
    match = pattern.search(xml)
    if not match:
        raise RuntimeError("セル %s が見つかりません（テンプレートの形が変わった可能性）" % ref)

    attrs = match.group(1)
    style = re.search(r'\ss="(\d+)"', attrs)
    style_attr = ' s="%s"' % style.group(1) if style else ""
    replacement = '<c r="%s"%s%s>%s</c>' % (ref, style_attr, keep_type, inner)
    return xml[: match.start()] + replacement + xml[match.end():]


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build(target: datetime.date, dry_run: bool) -> None:
    yymm = "%02d%02d" % (target.year % 100, target.month)
    sheet_name = "請求書" + yymm

    if not os.path.exists(BOOK):
        sys.exit("TETSUJIN.xlsx が見つかりません: " + BOOK)

    with zipfile.ZipFile(BOOK) as z:
        parts = {n: z.read(n) for n in z.namelist()}

    workbook = parts["xl/workbook.xml"].decode("utf-8")
    wb_rels = parts["xl/_rels/workbook.xml.rels"].decode("utf-8")
    content_types = parts["[Content_Types].xml"].decode("utf-8")

    sheets = re.findall(r'<sheet name="([^"]+)" sheetId="(\d+)" r:id="(rId\d+)"/>', workbook)
    if not sheets:
        sys.exit("workbook.xml のシート定義を読めませんでした")

    if any(name == sheet_name for name, _, _ in sheets):
        sys.exit("「%s」はすでにあります。作り直すなら先にシートを消してください。" % sheet_name)

    # 元にするのは「いちばん新しい請求書シート」。見積書やSheet2は対象外。
    invoices = sorted(n for n, _, _ in sheets if re.fullmatch(r"請求書\d{4}", n))
    if not invoices:
        sys.exit("元にする請求書シートがありません")
    source_name = invoices[-1]
    source_rid = dict((n, r) for n, _, r in sheets)[source_name]
    source_target = re.search(
        r'<Relationship Id="%s"[^>]*Target="([^"]+)"' % source_rid, wb_rels
    ).group(1)
    source_path = "xl/" + source_target

    # ---- 新しく作る部品の番号を決める（既存と衝突しないもの） ----
    def next_index(prefix, suffix):
        used = [
            int(m.group(1))
            for n in parts
            for m in [re.fullmatch(re.escape(prefix) + r"(\d+)" + re.escape(suffix), n)]
            if m
        ]
        return max(used) + 1 if used else 1

    sheet_i = next_index("xl/worksheets/sheet", ".xml")
    draw_i = next_index("xl/drawings/drawing", ".xml")
    print_i = next_index("xl/printerSettings/printerSettings", ".bin")
    rid = "rId%d" % (max(int(m) for m in re.findall(r'Id="rId(\d+)"', wb_rels)) + 1)
    sheet_id = max(int(s) for _, s, _ in sheets) + 1

    # ---- 3つの値 ----
    invoice_no = "%s-001" % last_day_of_prev_month(target).strftime("%y%m%d")
    issued = target.replace(day=1)
    due = target.replace(day=5)
    due_text = "お支払期限：%d年%d月%d日" % (due.year, due.month, due.day)

    print("元にするシート : %s" % source_name)
    print("作るシート     : %s" % sheet_name)
    print("  請求番号 M2  : %s" % invoice_no)
    print("  発行日   M3  : %s (シリアル %d)" % (issued.isoformat(), serial(issued)))
    print("  支払期限 B12 : %s" % due_text)

    # ---- シートXMLを複製して3セルだけ差し替える ----
    sheet_xml = parts[source_path].decode("utf-8")
    sheet_xml = set_cell(sheet_xml, "M2", "<is><t>%s</t></is>" % esc(invoice_no), ' t="inlineStr"')
    sheet_xml = set_cell(sheet_xml, "M3", "<v>%d</v>" % serial(issued), "")
    sheet_xml = set_cell(sheet_xml, "B12", "<is><t>%s</t></is>" % esc(due_text), ' t="inlineStr"')

    if dry_run:
        print("\n--dry-run のため書き込みませんでした。")
        return

    new_parts = dict(parts)
    new_sheet_path = "xl/worksheets/sheet%d.xml" % sheet_i
    new_parts[new_sheet_path] = sheet_xml.encode("utf-8")

    # 図形と印刷設定は中身をそのまま複製する（参照を共有すると、あとで
    # 片方を編集したときにもう片方まで変わる）
    source_rels_path = "xl/worksheets/_rels/%s.rels" % os.path.basename(source_path)
    rels = parts[source_rels_path].decode("utf-8")
    old_draw = re.search(r'Target="\.\./drawings/(drawing\d+\.xml)"', rels)
    old_print = re.search(r'Target="\.\./printerSettings/(printerSettings\d+\.bin)"', rels)

    if old_draw:
        new_draw = "drawing%d.xml" % draw_i
        new_parts["xl/drawings/" + new_draw] = parts["xl/drawings/" + old_draw.group(1)]
        rels = rels.replace(old_draw.group(1), new_draw)
        content_types = content_types.replace(
            "</Types>",
            '<Override PartName="/xl/drawings/%s" ContentType="%s"/></Types>' % (new_draw, DRAW_TYPE),
        )
    if old_print:
        new_print = "printerSettings%d.bin" % print_i
        new_parts["xl/printerSettings/" + new_print] = parts[
            "xl/printerSettings/" + old_print.group(1)
        ]
        rels = rels.replace(old_print.group(1), new_print)

    new_parts["xl/worksheets/_rels/sheet%d.xml.rels" % sheet_i] = rels.encode("utf-8")

    # ---- ブックに登録する ----
    workbook = workbook.replace(
        "</sheets>",
        '<sheet name="%s" sheetId="%d" r:id="%s"/></sheets>' % (esc(sheet_name), sheet_id, rid),
    )
    wb_rels = wb_rels.replace(
        "</Relationships>",
        '<Relationship Id="%s" Type="%s/worksheet" Target="worksheets/sheet%d.xml"/></Relationships>'
        % (rid, REL_NS, sheet_i),
    )
    content_types = content_types.replace(
        "</Types>",
        '<Override PartName="/%s" ContentType="%s"/></Types>' % (new_sheet_path, WS_TYPE),
    )

    # 🔴 calcChain は「どのセルをどの順で計算するか」の控え。シートを足すと
    #    実態とずれ、Excel が「読み取れない内容」と言い出すことがある。
    #    消してよい部品で、開いたときに作り直される。
    for dead in ("xl/calcChain.xml",):
        new_parts.pop(dead, None)
    content_types = re.sub(r'<Override PartName="/xl/calcChain\.xml"[^>]*/>', "", content_types)
    wb_rels = re.sub(r'<Relationship Id="rId\d+"[^>]*calcChain\.xml"/>', "", wb_rels)

    new_parts["xl/workbook.xml"] = workbook.encode("utf-8")
    new_parts["xl/_rels/workbook.xml.rels"] = wb_rels.encode("utf-8")
    new_parts["[Content_Types].xml"] = content_types.encode("utf-8")

    # ---- 書き出し（元ファイルは必ず退避してから差し替える） ----
    backup = BOOK + ".bak"
    tmp = BOOK + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in new_parts.items():
            z.writestr(name, data)
    shutil.copy2(BOOK, backup)
    os.replace(tmp, BOOK)

    print("\n✅ 「%s」を追加しました。" % sheet_name)
    print("   元のファイルは %s に退避しています。" % os.path.basename(backup))
    print("\n⚠️ 金額は前月のまま複製しています。紹介手数料が変わる月は")
    print("   C17（品名）と K17（単価）を確認してください。")


def main():
    ap = argparse.ArgumentParser(description="TETSUJIN.xlsx に請求書シートを足す")
    ap.add_argument("month", nargs="?", help="YYMM（省略時は今月）")
    ap.add_argument("--dry-run", action="store_true", help="書き込まずに内容だけ出す")
    args = ap.parse_args()

    target = parse_yymm(args.month) if args.month else datetime.date.today().replace(day=1)
    build(target, args.dry_run)


if __name__ == "__main__":
    main()
