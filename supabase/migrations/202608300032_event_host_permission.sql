-- ============================================================
-- 会を作れるのは 管理者 / 運営 / 部長 だけにする
-- ============================================================
-- 前提：202608050005_applications_and_events.sql
--       202608130019_owner_role.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 これまでは誰でも作れた
-- ------------------------------------------------------------
-- events_insert は `host_id = 自分` としか見ておらず、
-- 元のコメントにも「作成は誰でも（部活動を会員が主催するため）」と
-- 書いてある＝当時の意図的な決定。依頼主の判断で今回これを変える。
--
-- 🔴 画面のボタンを消しても塞がらない。anonキーで PostgREST を
--    直接叩けば INSERT できる。∴ 判定はDB側に置く。
--    画面とAPIの出し分けは「押せないようにする」ためのもので、
--    守っているのはこのポリシー。
--
-- 部長(manager)は、それまで肩書きだけで特権が無かった。
-- 主催者用のロールを新しく作らず、この枠に権限を与える。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 会を主催できるか
-- ------------------------------------------------------------
-- 判定を1本にする。ポリシー・関数の各所で role を並べ直すと、
-- ロールを足したときに直し漏れる場所が出る。
CREATE OR REPLACE FUNCTION public.can_host_event()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.members AS m
     WHERE m.id = public.current_member_id()
       AND m.is_withdrawn = FALSE
       AND m.role IN ('owner', 'admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.can_host_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_host_event() TO authenticated;

COMMENT ON FUNCTION public.can_host_event() IS
  '会（イベント）を作れるか。管理者・運営・部長のみ（2026-08-30〜）';

-- ------------------------------------------------------------
-- 2. 作成のポリシーを絞る
-- ------------------------------------------------------------
-- host_id = 自分 の条件は残す。外すと他人名義の会を作れてしまう。
DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    host_id = public.current_member_id()
    AND public.can_host_event()
  );

-- 編集・削除は今までどおり「主催者本人か運営」。
-- 権限を外された人が、自分が過去に作った会を直せなくなるのは行き過ぎ。

-- ------------------------------------------------------------
-- 3. すでに会を主催している一般会員を部長にする
-- ------------------------------------------------------------
-- 🔴 先に権限を絞ると、いま主催している人が次から作れなくなる。
--    実態に合わせてから閉じる。
--    谷廣望さん（会員番号170）＝「新大阪交流会」の主催者。
--    他の主催者は 川原さん(owner) と 荒木さん(admin) なので影響しない。
--
-- role を直接UPDATEできるのは、このトリガが
-- 「auth.uid() が無い＝migration/service_role」を対象外にしているため。
UPDATE public.members
   SET role = 'manager'
 WHERE member_no = 170
   AND role = 'user'
   AND is_withdrawn = FALSE;
