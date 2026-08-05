# Supabase反映手順

## 1. 最新Excelを統合

個人情報を含む元ファイルと生成JSONはGit管理しない。

```powershell
npm run build:members-db -- --members "C:\path\to\入会者名簿.xlsx" --contacts "C:\path\to\連絡先情報（回答）.xlsx"
```

既存の `data/processed/members.json` があれば、会員番号・メール・電話・氏名の順で照合し、既存UUIDを維持する。最新版側の空欄だけ旧統合データで補完する。

## 2. DB migration

Supabase CLIで `supabase/migrations/` を適用する。DashboardのSQL Editorへ貼り付ける場合も、migrationファイルを正本とする。

認証を使う前に、Supabase Authのメール確認を必ず有効にする。既存会員との自動紐づけがメール所有確認を前提にしているため。

## 3. 取込前検証

```powershell
npm run import:members
```

既定はドライランで、DBへ書き込まない。

## 4. 初回投入

`.env.local` に `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を設定してから実行する。

```powershell
npm run import:members -- --execute
```

既存行がある場合は中止する。`--wipe` は運用開始前の全入れ替え専用で、運用開始後は使用しない。

## 5. アプリ接続

`.env.local` / デプロイ先に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` も設定し、設定後に再ビルドする。管理画面の会員DBは、接続済み環境では認証・RLS付きの `/api/admin/members` から取得する。
