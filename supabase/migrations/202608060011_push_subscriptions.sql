-- ============================================================
-- 端末プッシュ通知（Web Push）の購読先
-- ============================================================
-- 前提：202608060010_recommendations_and_meetings.sql 適用済み。
--
-- これまでは Service Worker と PWA の土台だけがあり、
-- 「テスト通知が自分の端末に出る」ところで止まっていた。
-- 実際に届けるには、端末ごとの購読情報を保存しておく必要がある。
--
-- 送信のきっかけは notifications テーブルへのINSERT。
-- Supabase の Database Webhook からアプリの /api/push/dispatch を呼ぶ。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  -- 同じ端末を二重登録しないための鍵
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_member
  ON public.push_subscriptions(member_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 自分の端末だけを登録・解除できる。
-- 送信側（サーバー）は service_role で読むため、ここに読み取りポリシーは要らない。
DROP POLICY IF EXISTS push_subscriptions_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id())
  WITH CHECK (member_id = public.current_member_id());

COMMENT ON TABLE public.push_subscriptions IS 'Web Push の購読先（端末ごと）。送信は service_role から行う';
