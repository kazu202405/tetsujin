-- ============================================================
-- TETSUJIN会 認証・RLSポリシー
-- ============================================================
-- 作成: 2026-07-21
-- 前提: supabase/schema.sql を先に実行しておくこと（members テーブルと RLS 有効化）
-- 認証方式: メール＋パスワード（Supabase Auth）※依頼主決定 2026-07-21
--
-- 🔴 Supabaseダッシュボードの設定で「Confirm email」を必ず ON のままにすること。
--    下の handle_new_auth_user は「サインアップしたメールと一致する既存会員の行に紐づける」。
--    メール確認をOFFにすると、他人のメールアドレスを騙って登録するだけで
--    その会員のアカウントを乗っ取れてしまう。メール確認ONが安全性の前提。
-- ============================================================

-- ============================================================
-- 1. 運営judgment用ヘルパー
-- ============================================================
-- ログイン中のユーザーが運営(admin)かどうかを返す。
--
-- 🔴 SECURITY DEFINER が必須。
--    members のポリシーの中で members を参照するため、通常の関数だと
--    RLSが再帰して無限ループ（infinite recursion detected）になる。
--    SECURITY DEFINER は所有者権限で走りRLSを迂回するのでこれを防げる。
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM members
     WHERE auth_user_id = auth.uid()
       AND role = 'admin'
       AND is_withdrawn = FALSE
  );
$$;

REVOKE ALL   ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS 'ログイン中ユーザーが運営ロールか判定。RLS再帰回避のため SECURITY DEFINER';

-- ============================================================
-- 2. members の RLSポリシー
-- ============================================================
-- 方針:
--   - 本人は自分の行を読める
--   - 運営(admin)は全行を読み書きできる
--   - それ以外（未ログイン含む）は一切読めない
--
-- 会員同士がお互いを見る「メンバー一覧」は、このファイル末尾の
-- SECURITY DEFINER 関数 member_directory() から安全な列だけを返す。
-- members 自体を一般会員へ開放しない（email/phone/price/admin_note を守る）。
DROP POLICY IF EXISTS members_select_own   ON members;
DROP POLICY IF EXISTS members_select_admin ON members;
DROP POLICY IF EXISTS members_admin_all    ON members;
DROP POLICY IF EXISTS members_update_own   ON members;

-- 本人：自分の行を読める
CREATE POLICY members_select_own ON members
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- 運営：全行を読み書きできる
CREATE POLICY members_admin_all ON members
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 本人：自分の行を更新できる（プロフィール編集用）
-- 権限昇格や台帳改ざんは下のトリガで防ぐ
CREATE POLICY members_update_own ON members
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- 3. 権限昇格・台帳改ざんの防止
-- ============================================================
-- RLSは「どの行を触れるか」しか制御できず「どの列を変えられるか」は制御できない。
-- ∴ 本人が自分の行を更新できる以上、放置すると role を 'admin' に書き換えて
--    運営権限を自力で取得できてしまう。運営専用の列は常に元の値へ戻す。
CREATE OR REPLACE FUNCTION public.protect_member_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 運営本人の操作、またはサーバー側(service_role)の操作なら制限しない
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 会員が自分で書き換えてはいけない列を元に戻す
  NEW.role              := OLD.role;
  NEW.member_no         := OLD.member_no;
  NEW.auth_user_id      := OLD.auth_user_id;
  NEW.is_withdrawn      := OLD.is_withdrawn;
  NEW.withdrawn_at      := OLD.withdrawn_at;
  NEW.withdrawal_reason := OLD.withdrawal_reason;
  NEW.admin_note        := OLD.admin_note;
  NEW.price             := OLD.price;
  NEW.renewal_status    := OLD.renewal_status;
  NEW.renewal_fee       := OLD.renewal_fee;
  NEW.renewal_note      := OLD.renewal_note;
  NEW.referral_fee      := OLD.referral_fee;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_protect_admin_fields ON members;
CREATE TRIGGER trg_members_protect_admin_fields
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.protect_member_admin_fields();

COMMENT ON FUNCTION public.protect_member_admin_fields() IS '会員が自分でrole等の運営専用列を書き換えるのを防ぐ（権限昇格対策）';

-- ============================================================
-- 4. サインアップ時の会員行の紐づけ / 作成
-- ============================================================
-- 🔴 これがないと会員台帳が壊れる。
--    既存会員がサインアップしたとき
--    無条件に新規行を作ると、同じ人が台帳に2行できて「アプリが会員管理のマスター」
--    という運用方針が最初から破綻する。
--
-- 動作:
--   ① 同じメールの既存会員がいて、まだ誰にも紐づいていない → その行に紐づける（＝アカウント引き取り）
--   ② いなければ新規会員として1行作る（role=user／未更新）
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  TEXT := LOWER(TRIM(NEW.email));
  v_name   TEXT;
  v_target UUID;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  -- ① 紐づけ先の既存会員を1件だけ決める
  --    （メール重複が1組あるため順序を固定し、在籍者・会員番号あり・古い順を優先）
  SELECT id INTO v_target
    FROM members
   WHERE auth_user_id IS NULL
     AND LOWER(TRIM(email)) = v_email
   ORDER BY is_withdrawn ASC, member_no ASC NULLS LAST, created_at ASC
   LIMIT 1;

  IF v_target IS NOT NULL THEN
    UPDATE members SET auth_user_id = NEW.id WHERE id = v_target;
    RETURN NEW;
  END IF;

  -- ② 新規会員として作成
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    SPLIT_PART(v_email, '@', 1)
  );

  INSERT INTO members (name, name_normalized, email, renewal_status, source, auth_user_id)
  VALUES (
    v_name,
    LOWER(REGEXP_REPLACE(v_name, '[\s　]+', '', 'g')),
    v_email,
    '未更新',
    'contact_only',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMENT ON FUNCTION public.handle_new_auth_user() IS 'サインアップ時に同メールの既存会員へ紐づける。無ければ新規会員行を作成';
