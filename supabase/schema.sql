-- ============================================================
-- TETSUJIN会 会員データベース スキーマ v2
-- ============================================================
-- 対象: Supabase (PostgreSQL) / 無料枠
-- 作成: 2026-04-22
-- 改訂: 2026-07-21  データ整形（2026-05-22）後の列構成に追従
--
-- 元データ:
--   - 入会者名簿.xlsx（会員番号付き、退会者含む）
--   - 連絡先情報（回答）.xlsx（Googleフォーム回答）
--   → scripts/build-members-db.mjs が統合し data/processed/members.json を生成
--
-- v1 からの変更点:
--   - start_month TEXT      → start_year(SMALLINT) + start_month(SMALLINT 1-12) に分割
--   - first_renewal TEXT    → renewal_status + renewal_fee に分解
--   - price/referral_fee    → NUMERIC(10,2) から INTEGER へ（実データは全て整数）
--   - 退会メタ・運営メモ・ロールの各カラムを追加（実装済みUIの受け皿）
--
-- 運用方針（打合せ確定）:
--   - 運用開始時に最新Excelへ差し替え、以後は本アプリが会員管理のマスター
--     （Excel併用しない／一元管理）
--   - 退会者も削除せず残す（is_withdrawn = TRUE）
--   - member_no は「プロフィールシートが全項目埋まった時点で自動採番」方式。
--     ∴ 現時点で番号なし166件があるのは正常。主キーには使わない。
--   - 紹介者(referrer)はテキスト名のまま保持。会員へのFK紐づけは投入後にUIで後付け。
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS members (
  -- 主キー。member_no は null 166件・同姓同名2組があり自然キーにならないため UUID を採用
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 会員番号（入会者名簿.№ 由来。プロフィールシート完成で自動採番する仕様のため nullable）
  member_no             INTEGER         UNIQUE,

  -- 氏名
  name                  TEXT            NOT NULL,
  name_normalized       TEXT            NOT NULL,   -- マッチング用（空白除去+小文字化）
  nickname              TEXT,                       -- 呼び名

  -- 入会情報（入会者名簿由来）
  referrer              TEXT,                       -- 紹介者（テキスト名。FKではない）
  start_year            SMALLINT        CHECK (start_year BETWEEN 2000 AND 2100),
  start_month           SMALLINT        CHECK (start_month BETWEEN 1 AND 12),
  renewal_status        TEXT            NOT NULL
                        CHECK (renewal_status IN ('未更新', '退会', '更新済', '返事待ち', '入金待ち')),
  renewal_fee           INTEGER,                    -- 更新時の金額（renewal_status='更新済' のみ）
  renewal_note          TEXT,                       -- 更新欄の自由記述原文（例: 再開検討など）
  price                 INTEGER,                    -- 入会時の金額
  referral_fee          INTEGER,                    -- 紹介料
  job                   TEXT,                       -- 職業
  grip                  TEXT,                       -- グリップ
  frequency             TEXT,                       -- 参加頻度

  -- 連絡先（連絡先情報フォーム由来）
  email                 TEXT,
  phone                 TEXT,
  gender                TEXT,                       -- 性別（カンマ区切り複数値あり）
  age_range             TEXT,                       -- 年代
  membership_type       TEXT,                       -- 法人・個人枠
  payment_method        TEXT,                       -- 支払方法（カンマ区切り複数値あり）
  contact_submitted_at  TIMESTAMPTZ,                -- フォーム送信日時

  -- 退会管理（運営のみが操作。Q1確定＝退会の主導権は運営）
  is_withdrawn          BOOLEAN         NOT NULL DEFAULT FALSE,
  withdrawn_at          TIMESTAMPTZ,                -- 退会日
  withdrawal_reason     TEXT,                       -- 退会理由（運営入力）

  -- 認証（Supabase Auth との紐づけ）
  -- 既存会員はアカウント未作成のため NULL。ログインできるようになった会員だけ埋まる。
  -- ∴ members.id を auth.users.id と同一にはできず、別カラムで 1:1 に紐づける。
  auth_user_id          UUID            UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 運営用
  role                  TEXT            NOT NULL DEFAULT 'user'
                        CHECK (role IN ('owner', 'admin', 'manager', 'user')),  -- 管理者/運営/部長/ユーザー
  admin_note            TEXT,                       -- 会員ごとの運営メモ（会員には非表示）

  -- メタ情報
  source                TEXT            NOT NULL
                        CHECK (source IN ('both', 'member_only', 'contact_only')),
  import_sheet          TEXT,                       -- 名簿上のシート名（参考用）

  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_name_normalized ON members(name_normalized);
CREATE INDEX IF NOT EXISTS idx_members_email           ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone           ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_source          ON members(source);
CREATE INDEX IF NOT EXISTS idx_members_is_withdrawn    ON members(is_withdrawn);
CREATE INDEX IF NOT EXISTS idx_members_member_no       ON members(member_no);
CREATE INDEX IF NOT EXISTS idx_members_renewal_status  ON members(renewal_status);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id    ON members(auth_user_id);

-- ============================================================
-- 更新日時の自動更新トリガ
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_members_set_updated_at ON members;
CREATE TRIGGER trg_members_set_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS（行レベルセキュリティ）
-- ============================================================
-- 🔴 重要: members は実在会員の個人情報（email/phone）を含む。
-- メール＋パスワード認証を前提とし、許可は policies.sql で明示する。
--
-- RLS を有効化する。この時点ではポリシーが1つもない＝全拒否。
--   → anon キー / authenticated キーからは全行アクセス不可（0件が返る）
--   → service_role キー（サーバー側のみ）だけが読み書きできる
--
-- ∴ NEXT_PUBLIC_ の付いた公開キーで会員名簿が引ける事故が構造的に起きない。
--
-- 🔴 実際のアクセス許可（本人は自分の行／運営は全行 等）は supabase/policies.sql で定義する。
--    schema.sql → policies.sql の順に実行すること。
-- ============================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- コメント
-- ============================================================
COMMENT ON TABLE  members                   IS 'TETSUJIN会 会員マスタ（入会者名簿＋連絡先情報 統合テーブル）';
COMMENT ON COLUMN members.id                IS '主キー。member_no は欠番・同姓同名があり自然キーに使えないため UUID';
COMMENT ON COLUMN members.member_no         IS '会員番号（プロフィールシート完成時に自動採番する仕様。nullable）';
COMMENT ON COLUMN members.name_normalized   IS 'マッチング用正規化氏名（空白除去・小文字化）';
COMMENT ON COLUMN members.referrer          IS '紹介者名のテキスト。会員へのFKではない（名寄せは投入後にUIで後付け）';
COMMENT ON COLUMN members.start_year        IS 'スタート年。月のみ記載で年不明の会員は NULL';
COMMENT ON COLUMN members.start_month       IS 'スタート月（1-12）';
COMMENT ON COLUMN members.renewal_status    IS '1年経過時の更新状況。空欄=未更新（1年未到来）、退会=更新をやめた';
COMMENT ON COLUMN members.renewal_fee       IS '更新時の金額。renewal_status=更新済 のときのみ入る';
COMMENT ON COLUMN members.renewal_note      IS '更新欄の自由記述を失わないための原文メモ';
COMMENT ON COLUMN members.price             IS '入会時の金額';
COMMENT ON COLUMN members.role              IS 'admin=運営 / manager=部長 / user=一般。当面は肩書き表示のみで特権なし';
COMMENT ON COLUMN members.admin_note        IS '運営メモ。会員には非表示';
COMMENT ON COLUMN members.source            IS 'both=両ファイルでマッチ / member_only=名簿のみ / contact_only=連絡先のみ';
COMMENT ON COLUMN members.import_sheet      IS '入会者名簿.xlsx 内の元シート名（デバッグ・参考用）';
