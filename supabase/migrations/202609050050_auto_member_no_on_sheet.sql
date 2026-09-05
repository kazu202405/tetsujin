-- ============================================================
-- プロフィールシートが全部埋まったら会員番号を自動で振る
-- ============================================================
-- 前提：202608050001_members.sql（members・protect_member_admin_fields）
--       202608050004_profile_sheets.sql 適用済み。
--
-- 依頼主の決定（2026-09-05）：
--   まだ番号を持っていない会員が、プロフィールシートを全部埋めた時点で
--   会員番号を受け取る。
--
-- 🔴 有効化のタイミングに注意。運営が手で採番している最中にこれを入れると、
--    同じ番号を取り合う。運営の採番が一段落してから流すこと。
--
-- ------------------------------------------------------------
-- なぜ members の BEFORE トリガなのか
-- ------------------------------------------------------------
-- protect_member_admin_fields が「一般会員の UPDATE では member_no を
-- 元に戻す」ため、profile_sheets 側から members を UPDATE しても
-- 番号は消される（本人が自分のシートを保存する＝一般会員の操作）。
--
-- ∴ members の BEFORE UPDATE で NEW.member_no に直接入れる。
--    トリガ名を zzz で始めて、protect より後に走らせる
--    （BEFORE トリガは名前順。protect は trg_members_protect_... なので
--      p < z で先に走り、そのあとここが最終的な値を決める）。
--
-- シートの保存は必ず
--   ① profile_sheets を upsert
--   ② members の nickname / job を更新
-- の順で来る（app/api/me/profile-sheet/route.ts）。∴ ②の時点では
-- ①が済んでおり、シート側の項目はテーブルから読める。
-- nickname / job だけは②で書き込まれる値そのもの＝NEW から見る。
-- ============================================================

-- ------------------------------------------------------------
-- シートが埋まっているか
-- ------------------------------------------------------------
-- 画面（/app/mypage/profile-sheet）の入力欄10個すべてを見る。
--   profile_sheets … ふりがな / ジャンル / 業種 / 地域 / 趣味 /
--                    マイヒストリー / テツジン会員特典 / ひとこと
--   members        … ニックネーム / 職業（シートから書き戻される）
--
-- テーマカラーとSNSリンクは数えない。前者は既定値が必ず入っており
-- 「埋めた」の判断に使えず、後者は別テーブル（公開範囲と申請を持つ側）で
-- 管理していて、シートの入力欄ではないため。
CREATE OR REPLACE FUNCTION public.profile_sheet_is_complete(
  p_member_id UUID,
  p_nickname  TEXT,
  p_job       TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(TRIM(p_nickname), '') <> ''
     AND COALESCE(TRIM(p_job), '')      <> ''
     AND EXISTS (
       SELECT 1
         FROM public.profile_sheets AS s
        WHERE s.member_id = p_member_id
          AND COALESCE(TRIM(s.name_furigana), '')    <> ''
          AND COALESCE(TRIM(s.genre), '')            <> ''
          AND COALESCE(TRIM(s.industry), '')         <> ''
          AND COALESCE(TRIM(s.location), '')         <> ''
          AND COALESCE(TRIM(s.hobbies), '')          <> ''
          AND COALESCE(TRIM(s.my_history), '')       <> ''
          AND COALESCE(TRIM(s.tetsujin_benefit), '') <> ''
          AND COALESCE(TRIM(s.hitokoto), '')         <> ''
     );
$$;

REVOKE ALL ON FUNCTION public.profile_sheet_is_complete(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_sheet_is_complete(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 採番
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_member_no_on_sheet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  -- すでに番号がある人・退会した人は対象外
  IF NEW.member_no IS NOT NULL OR NEW.is_withdrawn THEN
    RETURN NEW;
  END IF;

  IF NOT public.profile_sheet_is_complete(NEW.id, NEW.nickname, NEW.job) THEN
    RETURN NEW;
  END IF;

  -- 🔴 同時に2人が埋め終えると MAX が同じ値を返し、UNIQUE で片方が落ちる。
  --    落ちるとシートの保存ごと失敗し、本人には「保存できません」としか
  --    出ない。∴ 採番のあいだだけ直列化する。
  PERFORM pg_advisory_xact_lock(hashtext('members.member_no'));

  SELECT COALESCE(MAX(member_no), 0) + 1 INTO v_next FROM public.members;
  NEW.member_no := v_next;

  RETURN NEW;
END;
$$;

-- 🔴 トリガ名は zzz で始める。BEFORE トリガは名前順に走るので、
--    protect_member_admin_fields（一般会員の UPDATE では
--    NEW.member_no := OLD.member_no で書き換えを戻す）より後に
--    走らせないと、ここで入れた番号がその場で消される。
DROP TRIGGER IF EXISTS trg_members_zzz_assign_member_no ON public.members;
CREATE TRIGGER trg_members_zzz_assign_member_no
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.assign_member_no_on_sheet();

COMMENT ON FUNCTION public.assign_member_no_on_sheet() IS
  'プロフィールシートを全部埋めた未採番の在籍会員に、MAX+1 で会員番号を振る';
