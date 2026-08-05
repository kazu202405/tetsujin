-- ============================================================
-- プロフィールシート（名刺カード）
-- ============================================================
-- 前提：202608050003_board_and_avatars.sql 適用済み。
--
-- これまでシートは会員ごとの localStorage にあり、
--  ・別の端末で開くと消える
--  ・他の会員から見えない（＝名刺として機能しない）
-- 状態だった。DBに移して全員から見えるようにする。
--
-- 何をどこに置くか
--  - 会員番号・氏名   : members（台帳が正本。シートからは編集させない）
--  - ニックネーム・職業: members（メンバー一覧や掲示板でも使うので台帳側を更新する）
--  - それ以外のシート項目: profile_sheets（この表）
--  - 写真             : members.avatar_path（設定画面でアップロードしたもの）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_sheets (
  member_id         UUID        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  name_furigana     TEXT,
  genre             TEXT,
  industry          TEXT,
  location          TEXT,
  hobbies           TEXT,
  my_history        TEXT,
  tetsujin_benefit  TEXT,
  hitokoto          TEXT,
  -- [{id, platform, label?, url}] の配列
  sns_links         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  theme_color       TEXT        NOT NULL DEFAULT '#2a2a3e',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_sheets_sns_links_is_array CHECK (jsonb_typeof(sns_links) = 'array'),
  CONSTRAINT profile_sheets_theme_color_hex CHECK (theme_color ~ '^#[0-9A-Fa-f]{6}$')
);

DROP TRIGGER IF EXISTS trg_profile_sheets_set_updated_at ON public.profile_sheets;
CREATE TRIGGER trg_profile_sheets_set_updated_at
  BEFORE UPDATE ON public.profile_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profile_sheets ENABLE ROW LEVEL SECURITY;

-- 自分のシートは自分で作成・編集できる。閲覧は在籍会員なら全員。
DROP POLICY IF EXISTS profile_sheets_select ON public.profile_sheets;
CREATE POLICY profile_sheets_select ON public.profile_sheets
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS profile_sheets_write_own ON public.profile_sheets;
CREATE POLICY profile_sheets_write_own ON public.profile_sheets
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (member_id = public.current_member_id() OR public.is_admin());

-- ------------------------------------------------------------
-- 閲覧用（1人分）
-- ------------------------------------------------------------
-- members は RLS で他人の行が読めないため、シートと台帳の結合はここで行う。
-- 返すのは名刺に出してよい列だけ（email / phone / 金額 / admin_note は返さない）。
-- 退会者は名前と業種だけを返し、シート本体は返さない（既存の表示ルールに合わせる）。
DROP FUNCTION IF EXISTS public.profile_sheet_of(UUID);
CREATE FUNCTION public.profile_sheet_of(p_member_id UUID)
RETURNS TABLE (
  member_id        UUID,
  member_no        INTEGER,
  name             TEXT,
  nickname         TEXT,
  job              TEXT,
  membership_type  TEXT,
  role             TEXT,
  is_withdrawn     BOOLEAN,
  avatar_path      TEXT,
  name_furigana    TEXT,
  genre            TEXT,
  industry         TEXT,
  location         TEXT,
  hobbies          TEXT,
  my_history       TEXT,
  tetsujin_benefit TEXT,
  hitokoto         TEXT,
  sns_links        JSONB,
  theme_color      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.member_no,
    m.name,
    CASE WHEN m.is_withdrawn THEN NULL ELSE m.nickname END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE m.job END,
    m.membership_type,
    m.role,
    m.is_withdrawn,
    CASE WHEN m.is_withdrawn THEN NULL ELSE m.avatar_path END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.name_furigana END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.genre END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.industry END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.location END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.hobbies END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.my_history END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.tetsujin_benefit END,
    CASE WHEN m.is_withdrawn THEN NULL ELSE s.hitokoto END,
    CASE WHEN m.is_withdrawn THEN '[]'::jsonb ELSE COALESCE(s.sns_links, '[]'::jsonb) END,
    COALESCE(s.theme_color, '#2a2a3e')
  FROM public.members AS m
  LEFT JOIN public.profile_sheets AS s ON s.member_id = m.id
  WHERE public.is_active_member()
    AND m.id = p_member_id;
$$;

REVOKE ALL ON FUNCTION public.profile_sheet_of(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_sheet_of(UUID) TO authenticated;

COMMENT ON TABLE public.profile_sheets IS 'プロフィールシート（名刺カード）。会員番号・氏名・ニックネーム・職業は members が正本';
