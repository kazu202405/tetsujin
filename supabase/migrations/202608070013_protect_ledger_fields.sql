-- ============================================================
-- 台帳の項目を運営専用にする
-- ============================================================
-- 前提：202608060012_notification_prefs.sql 適用済み。
--
-- 🔴 これまで会員本人が自分の行を更新できる範囲に
--    氏名・メール・電話・会員種別・入会年月 が含まれていた。
--    画面には出していないが、APIの権限としては通ってしまう。
--
--    これらは会員台帳として運営が管理する項目で、
--    特にメールアドレスは「サインアップ時にどの会員行へ紐づけるか」の
--    鍵になっているため、本人に書き換えさせない。
--
-- 本人が変更してよいのは、プロフィールとして自分で名乗る部分だけ：
--   nickname / job / grip / avatar_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_member_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 権限・在籍・お金まわり（従来から保護）
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

  -- 台帳の本人特定に関わる項目（今回追加）
  NEW.name               := OLD.name;
  NEW.name_normalized    := OLD.name_normalized;
  NEW.email              := OLD.email;
  NEW.phone              := OLD.phone;
  NEW.membership_type    := OLD.membership_type;
  NEW.start_year         := OLD.start_year;
  NEW.start_month        := OLD.start_month;
  NEW.referrer           := OLD.referrer;
  NEW.source             := OLD.source;
  NEW.import_sheet       := OLD.import_sheet;

  RETURN NEW;
END;
$$;

-- 同じメールが複数の会員に入ると、サインアップ時にどちらへ紐づくか決まらない。
-- 運営が編集するときに気づけるよう、重複を探しやすくしておく。
CREATE INDEX IF NOT EXISTS idx_members_email_lower
  ON public.members (LOWER(TRIM(email)))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.members.email IS
  '連絡先。サインアップ時に会員行へ紐づける鍵でもあるため運営のみ変更可';
