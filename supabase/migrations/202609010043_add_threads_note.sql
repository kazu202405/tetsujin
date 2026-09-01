-- ============================================================
-- SNSに Threads と note を足す
-- ============================================================
-- 前提：202608050007_connections_and_social_links.sql
--       202608300030_sns_disclosure_by_approval.sql 適用済み。
--
-- 「その他」でも登録できるが、選ぶ人が多いと分かったので正式に足す
-- （依頼主判断 2026-09-01）。
--
-- 🔴 プラットフォームは3か所に散っている。DBのCHECK、APIの許可リスト、
--    通知の名前対応表。どれか1つ忘れると
--      ・CHECKを忘れる → 保存が23514で落ちる
--      ・APIを忘れる   → 400で弾かれる
--      ・通知を忘れる  → 「リンクを開示しました」と種類が消えた文面になる
--    ここではDBの2つを直す（APIとコードは別途）。
--
-- 🔴 制約名は決め打ちにしない。名前が違うと DROP IF EXISTS が素通りして
--    古い制約が残り、新しい値が保存できないのに移行は成功して見える。
-- ============================================================

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
       AND pg_get_constraintdef(con.oid) ILIKE '%platform%'
  LOOP
    EXECUTE format('ALTER TABLE public.member_social_links DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.member_social_links
  ADD CONSTRAINT member_social_links_platform_check
  CHECK (platform IN ('line','instagram','x','facebook','threads','note','website','other'));

-- ------------------------------------------------------------
-- 通知の名前対応表に2つ足す
-- ------------------------------------------------------------
-- 🔴 複製元は最後にこの関数を定義した 202608300030。
--    202608050007（最初の版）から取ると、status を見る条件が消えて
--    「承認した本人に申請が来ました」が復活する。

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
    WHEN 'threads' THEN 'Threads'
    WHEN 'note' THEN 'note'
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
