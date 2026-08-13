-- ============================================================
-- 運営の上に「管理者（全権限）」を作る
-- ============================================================
-- 前提：202608050001_members.sql / 202608050002_member_directory_roles.sql /
--       202608070014_member_editable_contact_and_link.sql /
--       202608070015_role_before_signup.sql が適用済み。
--       （この migration は上記の関数を最終形で上書きする）
--
-- これまで members.role は admin(運営) / manager(部長) / user の3段で、
-- DB側の権限判定はすべて is_admin() 1本に集約されていた。
-- つまり運営は事実上すでに全権限であり、「運営の上」を作るということは
-- 運営から何かを取り上げるということになる。
--
-- 取り上げるのは「権限（ロール）の付与」だけ：
--   管理者(owner) = 運営にできること全部 ＋ ロールの変更
--   運営(admin)   = 今まで通りの運営業務。ただしロールは触れない
--
-- 【設計の要 1】is_admin() を owner でも TRUE にする。
-- 既存の権限ゲート（RLS・イベント管理・台帳保護・掲示板のチャンネル管理など）は
-- 全部この1つの関数を通っている。ここを直すだけで管理者は自動的に運営の全権限を持つ。
-- 逆にここを直し忘れると「管理者に上げたら管理画面に入れなくなった」になる。
--
-- 【設計の要 2】RPC を管理者限定にするだけでは足りない。
-- members には運営向けの FOR ALL ポリシー(members_admin_all)があり、
-- protect_member_admin_fields() も運営なら素通ししていた。
-- つまり運営は PostgREST へ直接 PATCH /members {"role":"owner"} を打てば
-- 自分を管理者に上げられてしまう。画面とRPCだけ塞いでも横から入れるので、
-- トリガ側でも role の変更を止める。
-- ============================================================

-- ------------------------------------------------------------
-- 1. role に owner を許可する
-- ------------------------------------------------------------
-- 元の CHECK は CREATE TABLE のインライン指定なので自動命名されている。
-- 名前を決め打ちせず、role を縛っている CHECK を拾って落とす
-- （落とし損ねると次の UPDATE が通らず、原因の分かりにくい失敗になる）。
DO $$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT c.conname
      FROM pg_constraint AS c
     WHERE c.conrelid = 'public.members'::regclass
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) ILIKE '%manager%'
  LOOP
    EXECUTE format('ALTER TABLE public.members DROP CONSTRAINT %I', v_name);
  END LOOP;
END;
$$;

ALTER TABLE public.members
  ADD CONSTRAINT members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'user'));

-- ------------------------------------------------------------
-- 2. 今いる運営をそのまま管理者に上げる
-- ------------------------------------------------------------
-- 管理者は管理者しか任命できない設計にするため、最初の1人はここで作る必要がある。
-- 全員上げるのは、移行の瞬間に誰も権限を失わない＝事故が起きないため。
-- 不要な人は移行後に管理画面から運営へ落とす運用にする。
--
-- 既に owner が居る場合は何もしない（再実行しても、あとから足した運営を
-- 勝手に管理者へ引き上げないようにする）。
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.members WHERE role = 'owner') THEN
    UPDATE public.members
       SET role = 'owner'
     WHERE role = 'admin';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 3. 管理者は運営の全権限を持つ
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.members
     WHERE auth_user_id = auth.uid()
       AND role IN ('owner', 'admin')
       AND is_withdrawn = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS
  'ログイン中ユーザーが運営以上か判定（管理者owner を含む）。RLS再帰回避のため SECURITY DEFINER';

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.members
     WHERE auth_user_id = auth.uid()
       AND role = 'owner'
       AND is_withdrawn = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

COMMENT ON FUNCTION public.is_owner() IS
  'ログイン中ユーザーが管理者（全権限）か判定。ロール変更を許すのはこの人だけ';

-- ------------------------------------------------------------
-- 4. 運営が直接 UPDATE してロールを書き換えるのを止める
-- ------------------------------------------------------------
-- 0014 の内容に「role は管理者だけ」を足したもの。
-- 運営が自分を管理者へ上げられると、上下関係そのものが無くなる。
CREATE OR REPLACE FUNCTION public.protect_member_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- migration や service_role（サーバー側の仕込み）は対象外
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ロールを変えられるのは管理者だけ。
  -- set_member_role() も最終的にこの UPDATE を通るので、判定はここが最後の砦になる。
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_owner() THEN
    NEW.role := OLD.role;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 権限・在籍・お金まわり
  NEW.role               := OLD.role;
  NEW.member_no          := OLD.member_no;
  NEW.auth_user_id       := OLD.auth_user_id;
  NEW.is_withdrawn       := OLD.is_withdrawn;
  NEW.withdrawn_at       := OLD.withdrawn_at;
  NEW.withdrawal_reason  := OLD.withdrawal_reason;
  NEW.admin_note         := OLD.admin_note;
  NEW.price              := OLD.price;
  NEW.renewal_status     := OLD.renewal_status;
  NEW.renewal_fee        := OLD.renewal_fee;
  NEW.renewal_note       := OLD.renewal_note;
  NEW.referral_fee       := OLD.referral_fee;
  NEW.referrer_member_id := OLD.referrer_member_id;

  -- 契約の事実（運営が台帳として管理する）
  NEW.membership_type    := OLD.membership_type;
  NEW.start_year         := OLD.start_year;
  NEW.start_month        := OLD.start_month;
  NEW.referrer           := OLD.referrer;
  NEW.source             := OLD.source;
  NEW.import_sheet       := OLD.import_sheet;

  -- ここには name / name_normalized / email / phone を入れない。
  -- nickname / job / grip / avatar_path と同じく本人が変更できる。

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 5. ロール変更を管理者だけに絞る
-- ------------------------------------------------------------
-- 0015 の内容に管理者の概念を足したもの。守るのは次の3つ：
--   ① 変更できるのは管理者だけ（運営は自分も他人も上げ下げできない）
--   ② ログインできる最後の管理者は降格できない（誰も権限を触れなくなるため）
--   ③ ログインしていない会員には先に権限を付けておける（0015の趣旨を維持）
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_member_id UUID,
  p_role TEXT
)
RETURNS TABLE (id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_role             TEXT;
  v_is_linked            BOOLEAN;
  v_active_linked_owners INTEGER;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION '管理者権限が必要です' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('owner', 'admin', 'manager', 'user') THEN
    RAISE EXCEPTION '不正なロールです' USING ERRCODE = '22023';
  END IF;

  SELECT m.role, m.auth_user_id IS NOT NULL
    INTO v_old_role, v_is_linked
    FROM public.members AS m
   WHERE m.id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '会員が見つかりません' USING ERRCODE = 'P0002';
  END IF;

  -- ログイン可能な最後の管理者を降格させると、以後だれもロールを変更できなくなる。
  -- ログインしていない管理者は誰も締め出さないので、この判定の対象外。
  IF v_is_linked AND v_old_role = 'owner' AND p_role <> 'owner' THEN
    SELECT COUNT(*)
      INTO v_active_linked_owners
      FROM public.members AS m
     WHERE m.role = 'owner'
       AND m.is_withdrawn = FALSE
       AND m.auth_user_id IS NOT NULL;

    IF v_active_linked_owners <= 1 THEN
      RAISE EXCEPTION '最後の管理者アカウントは降格できません' USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.members AS m
     SET role = p_role
   WHERE m.id = p_member_id;

  RETURN QUERY
  SELECT m.id, m.role
    FROM public.members AS m
   WHERE m.id = p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_member_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 6. 通知の宛先から管理者が漏れないようにする
-- ------------------------------------------------------------
-- 入会申請の通知だけは is_admin() を通さず role = 'admin' を直接見ていた。
-- 今いる運営を全員 owner へ上げるため、直さないと
-- 「入会申請が届いても誰にも通知が飛ばない」状態になる（エラーも出ないので気づけない）。
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin UUID;
BEGIN
  FOR v_admin IN
    SELECT id FROM public.members
     WHERE role IN ('owner', 'admin')
       AND is_withdrawn = FALSE
       AND auth_user_id IS NOT NULL
  LOOP
    PERFORM public.push_notification(
      v_admin, NULL, 'connection_new',
      '入会申請が届きました',
      NEW.name || 'さん（' || COALESCE(NEW.job, '職業未記入') || '）',
      '/app/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$;
