# データフォルダ

## 概要
会員データの統合作業用フォルダ。個人情報を含むため `raw/` `processed/` は **gitに上げない**。

## フォルダ構成

```
data/
├── raw/          # 元のxlsxファイル（gitignore）
├── processed/    # 整形後のCSV（gitignore）
└── README.md     # このファイル（git管理）
```

## 使い方

### 1. 元ファイルの配置
以下のファイルを `data/raw/` に置く:
- `入会者名簿.xlsx`
- `連絡先情報（回答）.xlsx`

### 2. 統合CSVの生成
```bash
npm run build:members-db
```
→ `data/processed/members.csv` が生成される。

### 3. 画面で確認
```bash
npm run dev
```
→ `/admin` の会員DBタブで閲覧可能。

## データの扱いに関する注意

- **編集は行わない** — Supabase移行後、管理画面から編集する運用
- **gitに絶対にコミットしない** — `.gitignore` 済み
- **共有する場合** — 直接ファイル渡し or 暗号化ストレージ経由
