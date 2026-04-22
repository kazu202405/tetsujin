-- ============================================================
-- TETSUJIN会 会員データベース スキーマ
-- ============================================================
-- 対象: Supabase (PostgreSQL)
-- 作成: 2026-04-22
--
-- 元データ:
--   - 入会者名簿.xlsx（会員番号付き、468件、退会者103件含む）
--   - 連絡先情報（回答）.xlsx（Googleフォーム回答、376件）
--
-- 運用方針:
--   - 両ファイルを氏名 + メール or 電話で突き合わせ・統合
--   - 会員番号が異なる場合は別レコード
--   - 退会者も削除せず残す（is_withdrawn = TRUE）
--   - ムリに統合できないデータは片方のみ入れて他フィールドはNULL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS members (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 会員番号（入会者名簿.№ 由来、プロフィールシート入力で発行される仕様）
  member_no             INTEGER         UNIQUE,

  -- 氏名
  name                  TEXT            NOT NULL,
  name_normalized       TEXT            NOT NULL,                  -- マッチング用（空白除去+小文字化）
  nickname              TEXT,                                       -- 呼び名

  -- 入会情報（入会者名簿由来）
  referrer              TEXT,                                       -- 紹介者
  start_month           TEXT,                                       -- スタート月（形式混在のため文字列）
  first_renewal         TEXT,                                       -- １回目更新（"退会"or金額or未更新）
  price                 NUMERIC(10, 2),                             -- 料金
  referral_fee          NUMERIC(10, 2),                             -- 紹介料
  job                   TEXT,                                       -- 職業
  grip                  TEXT,                                       -- グリップ
  frequency             TEXT,                                       -- 参加頻度

  -- 連絡先（連絡先情報フォーム由来）
  email                 TEXT,
  phone                 TEXT,
  gender                TEXT,                                       -- 性別
  age_range             TEXT,                                       -- 年代
  membership_type       TEXT,                                       -- 法人・個人枠
  payment_method        TEXT,                                       -- 支払方法
  contact_submitted_at  TIMESTAMPTZ,                                -- フォーム送信日時

  -- メタ情報
  source                TEXT            NOT NULL                   -- データ出典
                        CHECK (source IN ('both', 'member_only', 'contact_only')),
  is_withdrawn          BOOLEAN         NOT NULL DEFAULT FALSE,    -- 退会フラグ
  import_sheet          TEXT,                                       -- 名簿上のシート名（参考用）

  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_name_normalized ON members(name_normalized);
CREATE INDEX IF NOT EXISTS idx_members_email          ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone          ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_source         ON members(source);
CREATE INDEX IF NOT EXISTS idx_members_is_withdrawn   ON members(is_withdrawn);
CREATE INDEX IF NOT EXISTS idx_members_member_no      ON members(member_no);

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
-- コメント
-- ============================================================
COMMENT ON TABLE  members                      IS 'TETSUJIN会 会員マスタ（入会者名簿＋連絡先情報 統合テーブル）';
COMMENT ON COLUMN members.member_no            IS '会員番号（profile-sheet入力で発行。nullable）';
COMMENT ON COLUMN members.name_normalized      IS 'マッチング用正規化氏名（空白除去・小文字化）';
COMMENT ON COLUMN members.start_month          IS 'スタート月（"2026.1", "2025.10.", "運営"等、形式混在のため文字列）';
COMMENT ON COLUMN members.first_renewal        IS '１回目更新。"退会"の場合はis_withdrawn=TRUE';
COMMENT ON COLUMN members.source               IS 'both=両ファイルでマッチ / member_only=名簿のみ / contact_only=連絡先のみ';
COMMENT ON COLUMN members.import_sheet         IS '入会者名簿.xlsx 内の元シート名（デバッグ・参考用）';
