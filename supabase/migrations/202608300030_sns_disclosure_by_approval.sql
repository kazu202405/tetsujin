-- ============================================================
-- SNSの公開範囲を「本人が承認したか」だけで決める
-- ============================================================
-- 前提：202608050007_connections_and_social_links.sql
--       202608200028_connection_requests.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 なぜ直すか（2026-08-30 依頼主指摘）
-- ------------------------------------------------------------
-- 「つながり申請」は本来「あなたとSNSでつながりたい。連絡先を教えて
-- もらえますか」という意味で、教えるかどうかは持ち主が決める。
-- ところが実装は、その手前に「アプリ内でつながっているか」という
-- 別の関係を置き、それを鍵にしていた。
--
-- その鍵の正体は connections テーブル＝**出会い記録**で、これは
--   ・自分だけが見える個人的なメモ（RLSで本人のみ）
--   ・相手の同意も通知もなく、誰でも任意の会員について作れる
--   ・are_connected() は片側にあるだけで true
-- ∴ 出会い記録を1件足すだけで、相手が「つながり済みのみ」にした
--   SNSのURLが本人の承認なしに見えていた。
--
-- 本番の member_social_links は2行（両方とも public）で、
-- 'connections' を選んでいるリンクは1件も無いため実害は出ていない。
-- データ移行が要らない今のうちに構造を直す。
--
-- ------------------------------------------------------------
-- 直したあとの形
-- ------------------------------------------------------------
--   公開範囲 = public（全員）/ approved（承認した人だけ）/ private（自分だけ）
--   鍵の判定 = 持ち主が承認したか、それだけ
--   出会い記録 = 自分のメモに戻す（SNSの見え方には一切関与しない）
--   申請 = 人ごとに1本（connection_requests）。承認するときに
--          「どれを教えるか」を持ち主が選ぶ。リンクごとの申請は廃止。
--
-- 🔴 開示は一方向にする。承認した人が「自分のこれを見せる」だけで、
--    申請した側のSNSが自動で相手に渡ることはない。
--    自分の連絡先を渡すかどうかは、常にその持ち主だけが決める。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 公開範囲の値の名前を実態に合わせる（connections → approved）
-- ------------------------------------------------------------
-- 「つながり」という概念を鍵から外す以上、値の名前が connections の
-- ままだと読む人が古い意味で受け取る。対象0行の今しか安く直せない。
ALTER TABLE public.member_social_links
  ALTER COLUMN visibility DROP DEFAULT;

-- 🔴 制約名を決め打ちで DROP IF EXISTS しない。
--    名前が違っていても「無かった」として素通りし、古い制約が残ったまま
--    新しい制約が足される。すると 'approved' は古い制約に弾かれて
--    保存できないのに、マイグレーション自体は成功したように見える。
--    ∴ visibility に掛かっている CHECK を実際に探して落とす。
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint AS con
      JOIN pg_class      AS rel ON rel.oid = con.conrelid
      JOIN pg_namespace  AS nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'member_social_links'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%visibility%'
  LOOP
    EXECUTE format('ALTER TABLE public.member_social_links DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

UPDATE public.member_social_links
   SET visibility = 'approved'
 WHERE visibility = 'connections';

ALTER TABLE public.member_social_links
  ADD CONSTRAINT member_social_links_visibility_check
  CHECK (visibility IN ('public','approved','private'));

ALTER TABLE public.member_social_links
  ALTER COLUMN visibility SET DEFAULT 'approved';

COMMENT ON COLUMN public.member_social_links.visibility IS
  'public=全員に見える / approved=つながり申請を承認した相手だけ / private=自分だけ';

-- ------------------------------------------------------------
-- 2. 出会い記録をSNSの鍵から外す
-- ------------------------------------------------------------
-- are_connected() は他に使っている場所が無いので関数ごと落とす。
-- 残しておくと「つながっているか」を判定する物がまだ在ると読めてしまう。
DROP FUNCTION IF EXISTS public.social_links_for(UUID);
DROP FUNCTION IF EXISTS public.are_connected(UUID, UUID);

CREATE FUNCTION public.social_links_for(p_owner_id UUID)
RETURNS TABLE (
  id                UUID,
  platform          TEXT,
  label             TEXT,
  url               TEXT,
  visibility        TEXT,
  is_owner          BOOLEAN,
  visible           BOOLEAN,
  disclosure_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH viewer AS (SELECT public.current_member_id() AS id),
  base AS (
    SELECT
      l.id,
      l.platform,
      l.label,
      l.url,
      l.visibility,
      (v.id = p_owner_id) AS is_owner,
      (SELECT d.status FROM public.disclosure_requests d
        WHERE d.link_id = l.id AND d.from_member_id = v.id) AS disclosure_status
    FROM public.member_social_links AS l
    CROSS JOIN viewer AS v
    WHERE v.id IS NOT NULL
      AND l.member_id = p_owner_id
  )
  SELECT
    b.id,
    b.platform,
    b.label,
    -- 見える条件を満たさないときは URL 自体を返さない
    CASE
      WHEN b.is_owner THEN b.url
      WHEN b.visibility = 'public' THEN b.url
      WHEN b.visibility = 'approved' AND b.disclosure_status = 'approved' THEN b.url
      ELSE NULL
    END,
    b.visibility,
    b.is_owner,
    (
      b.is_owner
      OR b.visibility = 'public'
      OR (b.visibility = 'approved' AND b.disclosure_status = 'approved')
    ),
    b.disclosure_status
  FROM base AS b
  -- 非公開は持ち主以外には存在ごと見せない
  WHERE b.is_owner OR b.visibility <> 'private'
  ORDER BY b.platform;
$$;

REVOKE ALL ON FUNCTION public.social_links_for(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.social_links_for(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. 開示は「承認の結果」としてしか作れないようにする
-- ------------------------------------------------------------
-- 🔴 画面からボタンを消すだけでは塞がらない。anonキーで REST を
--    直接叩けるので、書き込みの権利そのものをDB側で落とす。
--    開示行を作れるのは SECURITY DEFINER の関数だけになる。
DROP POLICY IF EXISTS disclosure_insert_own ON public.disclosure_requests;
DROP POLICY IF EXISTS disclosure_update_to  ON public.disclosure_requests;
DROP POLICY IF EXISTS disclosure_delete_from ON public.disclosure_requests;
-- SELECT（自分に関係する行だけ見える）は残す。

COMMENT ON TABLE public.disclosure_requests IS
  '誰の・どのリンクを・誰に見せているかの記録。書けるのは respond_connection_request() だけ';

-- ------------------------------------------------------------
-- 4. 通知を実態に合わせる
-- ------------------------------------------------------------
-- 🔴 これまでの INSERT トリガは status を見ずに
--    「◯◯さんが開示を申請しました」を送っていた。
--    承認と同時に approved 行を作る今の作りでは、承認した本人に
--    「申請が来ました」が届く（届く先も逆）。status で分ける。
CREATE OR REPLACE FUNCTION public.notify_disclosure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_platform TEXT;
  v_to_name  TEXT;
  v_label    TEXT;
BEGIN
  -- 開示が成立したときだけ、見られるようになった側へ知らせる
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'approved')
    OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT platform INTO v_platform FROM public.member_social_links WHERE id = NEW.link_id;
  v_label := CASE v_platform
    WHEN 'line' THEN 'LINE'
    WHEN 'instagram' THEN 'Instagram'
    WHEN 'x' THEN 'X'
    WHEN 'facebook' THEN 'Facebook'
    WHEN 'website' THEN 'ウェブサイト'
    ELSE 'リンク'
  END;

  SELECT name INTO v_to_name FROM public.members WHERE id = NEW.to_member_id;

  PERFORM public.push_notification(
    NEW.from_member_id, NEW.to_member_id, 'disclosure_approved',
    COALESCE(v_to_name, 'メンバー') || 'さんが' || v_label || 'を教えてくれました',
    'プロフィールから確認できます。',
    '/app/profile/' || NEW.to_member_id
  );

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 5. 承認するときに「どれを教えるか」を選べるようにする
-- ------------------------------------------------------------
-- 🔴 引数が増えるので CREATE OR REPLACE ではなく旧シグネチャを落とす。
--    残すと4引数版と5引数版が併存し、どちらが呼ばれるか分からなくなる
--    （4引数で呼ばれた瞬間、開示は昔の両方向の挙動に戻る）。
DROP FUNCTION IF EXISTS public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT);

CREATE FUNCTION public.respond_connection_request(
  p_id       UUID,
  p_accept   BOOLEAN,
  p_reason   TEXT   DEFAULT NULL,
  p_message  TEXT   DEFAULT NULL,
  p_link_ids UUID[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me   UUID := public.current_member_id();
  v_req  public.connection_requests%ROWTYPE;
  v_name TEXT;
BEGIN
  SELECT * INTO v_req FROM public.connection_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '申請が見つかりません' USING ERRCODE = 'P0002';
  END IF;
  IF v_req.to_member_id <> v_me THEN
    RAISE EXCEPTION 'この申請には返答できません' USING ERRCODE = '42501';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'この申請はすでに返答済みです' USING ERRCODE = '23505';
  END IF;
  -- 期限切れに返答させない（申請した側にはもう見えていないため）
  IF v_req.expires_at <= NOW() THEN
    RAISE EXCEPTION 'この申請は期限が過ぎています' USING ERRCODE = '22023';
  END IF;

  UPDATE public.connection_requests
     SET status         = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         decline_reason = CASE WHEN p_accept THEN NULL ELSE COALESCE(p_reason, 'other') END,
         reply_message  = NULLIF(TRIM(COALESCE(p_message, '')), ''),
         responded_at   = NOW()
   WHERE id = p_id;

  -- ------------------------------------------------------------
  -- 承諾＝選んだ連絡先だけを、申請してきた相手に見せる
  -- ------------------------------------------------------------
  -- 🔴 対象を必ず「自分のリンク」「visibility='approved'」に絞る。
  --    ここを絞らないと、他人のリンクIDを混ぜて送れば
  --    その人の連絡先を勝手に開けられる（引数は会員が送ってくる値）。
  --    'public' はもともと見えており、'private' は誰にも見せないと
  --    決めたものなので、どちらもここでは触らない。
  --
  -- 相手のリンクには一切触らない＝開示は一方向。
  -- 申請した側の連絡先を渡すかどうかは、その人が自分で決める。
  IF p_accept AND COALESCE(array_length(p_link_ids, 1), 0) > 0 THEN
    INSERT INTO public.disclosure_requests (from_member_id, to_member_id, link_id, status, responded_at)
    SELECT v_req.from_member_id, v_me, l.id, 'approved', NOW()
      FROM public.member_social_links AS l
     WHERE l.member_id = v_me
       AND l.visibility = 'approved'
       AND l.id = ANY (p_link_ids)
    ON CONFLICT (from_member_id, link_id) DO UPDATE
      SET status = 'approved', responded_at = NOW();
  END IF;

  SELECT name INTO v_name FROM public.members WHERE id = v_me;

  -- 🔴 断ったことは申請者に伝えるが、通知の文面では理由を出さない。
  --    「今は必要ない」がそのまま届くと角が立つ。画面で本人が開いたときだけ見せる。
  INSERT INTO public.notifications (recipient_id, actor_id, type, title, message, href)
  VALUES (
    v_req.from_member_id, v_me,
    CASE WHEN p_accept THEN 'connection_accepted' ELSE 'connection_declined' END,
    CASE WHEN p_accept
      THEN v_name || 'さんとつながりました'
      ELSE v_name || 'さんからお返事が届きました'
    END,
    CASE WHEN p_accept
      THEN '教えてもらった連絡先は、相手のプロフィールから確認できます。'
      ELSE NULL
    END,
    '/app/requests'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_connection_request(UUID, BOOLEAN, TEXT, TEXT, UUID[]) TO authenticated;
