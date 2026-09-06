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
-- お披露目の投稿
-- ------------------------------------------------------------
-- 新しい方が入ったことを一般会員に知らせる手段が無かった
-- （「入会申請が届きました」は運営宛てだけ）。
--
-- 依頼主の決定（2026-09-06）：
--   ・知らせるのは「シートが埋まった時点」＝どんな方か分かる状態でお披露目する
--     （承認した瞬間だと、写真も自己紹介も無い状態で紹介することになる）
--   ・全員への個別通知ではなく掲示板へ自動投稿する
--     個別通知にすると入会が続いた月は通知欄が新規入会だらけになる。
--     掲示板なら他の話題と同じ流れに並び、あとから見返せる。
--     未読バッジは通常どおり全員に立つ。
--
-- 投稿先は「新規ご入会挨拶」(slug=welcome)。テストデータのまま未運用で
-- 廃止方針だったチャンネルだが、まさにこの用途のために作られており、
-- 中身が入れば役目を果たす。
--
-- 🔴 投稿者は本人にする。運営名義だと運営のアイコンが並び、
--    返信先も運営になってしまう。本人名義なら、そのまま
--    「はじめまして」のやりとりが始まる。
--    本人は自分の投稿を編集できるので、文面は後から直せる。
CREATE OR REPLACE FUNCTION public.post_member_introduction(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_channel UUID;
  v_name    TEXT;
  v_job     TEXT;
  v_lines   TEXT;
  v_sheet   RECORD;
BEGIN
  SELECT id INTO v_channel
    FROM public.board_channels
   WHERE slug = 'welcome' AND is_archived = FALSE
   LIMIT 1;

  -- チャンネルが無い／閉じられているなら黙って何もしない。
  -- 採番そのものを巻き込んで失敗させる理由がない。
  IF v_channel IS NULL THEN
    RETURN;
  END IF;

  SELECT name, job INTO v_name, v_job FROM public.members WHERE id = p_member_id;
  SELECT hitokoto, location, industry INTO v_sheet
    FROM public.profile_sheets WHERE member_id = p_member_id;

  -- 空の項目で行を空けない（「はじめまして、〇〇です。」の下が
  -- 空行だらけになると、書きかけに見える）
  v_lines := 'はじめまして、' || COALESCE(v_name, 'メンバー') || 'です。';
  IF COALESCE(TRIM(v_job), '') <> '' THEN
    v_lines := v_lines || E'\n' || TRIM(v_job);
  END IF;
  IF COALESCE(TRIM(v_sheet.location), '') <> '' THEN
    v_lines := v_lines || E'\n' || TRIM(v_sheet.location);
  END IF;
  IF COALESCE(TRIM(v_sheet.hitokoto), '') <> '' THEN
    v_lines := v_lines || E'\n\n' || TRIM(v_sheet.hitokoto);
  END IF;
  v_lines := v_lines || E'\n\nよろしくお願いします！';

  INSERT INTO public.posts (channel_id, author_id, content)
  VALUES (v_channel, p_member_id, LEFT(v_lines, 5000));

  -- 🔴 本人に必ず伝える。黙って自分名義の投稿が立つと、
  --    「勝手に書かれた」と受け取られる。直せることも一緒に伝える。
  PERFORM public.push_notification(
    p_member_id, NULL, 'announcement',
    '掲示板に自己紹介を投稿しました',
    'プロフィールシートの内容から作りました。ご自分で書き直せます。',
    '/app/board'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.post_member_introduction(UUID) FROM PUBLIC, anon, authenticated;

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

  -- 🔴 お披露目はここでしか行わない。「member_no が入ったら投稿する」に
  --    すると、運営が未採番142名を手で振っている最中に142件が一気に
  --    掲示板へ流れる。投稿するのは「シートを埋めて自動採番された人」だけ。
  PERFORM public.post_member_introduction(NEW.id);

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
