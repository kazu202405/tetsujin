-- ============================================================
-- 業種の選択肢を組み直す
-- ============================================================
-- 前提：202608310033_matching_options_admin.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 これまでの19項目が選びにくかった理由
-- ------------------------------------------------------------
-- ① 軸が混ざっている
--    「広告・デザイン・クリエイティブ」と「マーケティング・SNS」が重なる。
--    「士業」と「コンサルティング・専門サービス」も重なる。
--    重なる選択肢が並ぶと、選ぶ人が迷ったうえに、人によって別の箱に入る
--    ＝同じ仕事の人が違う業種として登録され、探しても出てこなくなる。
-- ② 別の業種が1つに同居している
--    「不動産・建築・住宅」（不動産業と建設業は別）
--    「健康・医療・福祉」（医療・介護・フィットネスは別）
--    「メーカー・製造・卸」（製造と商社は別）
-- ③ 行き場のない仕事が多い
--    結婚相談所・写真・冠婚葬祭のようなサービス業が「その他」しか無い。
--
-- ∴ 一般的な業種分類に寄せ、重なりを外し、同居を割り、
--    受け皿（生活関連サービス）を足す。
--
-- ------------------------------------------------------------
-- 依頼主決定（2026-08-31）：会員の職業データに合わせるのではなく、
-- 一般的で選びやすい形にする。既存の紐づけがずれても構わない。
-- ------------------------------------------------------------
-- 実際には、いま選ばれている6コード
-- （it / finance / realestate / manufacturing / entertainment / consulting）は
-- すべて新しい一覧にも同じコードで残るので、ずれは起きない。
--
-- 🔴 コードは会員のデータが指す名前なので、意味が変わらないものは
--    コードを引き継ぐ（表示名だけ変える）。意味が変わるものは
--    新しいコードを作る。同じコードのまま意味をすり替えると、
--    既に選んでいる人の登録内容が黙って別の業種に化ける。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 新しい一覧に入れ替える
-- ------------------------------------------------------------
-- 並び順は意味のまとまり順。10刻みにして、あとから間に足せるようにする。
INSERT INTO public.matching_options (category, code, label, sort_order, is_active) VALUES
  -- デジタル・広告
  ('industry','it',            'IT・ソフトウェア・Web',    10, TRUE),
  ('industry','marketing',     '広告・マーケティング・PR',  20, TRUE),
  ('industry','creative',      'デザイン・クリエイティブ',  30, TRUE),
  -- 専門サービス
  ('industry','consulting',    'コンサルティング',          40, TRUE),
  ('industry','professional',  '士業',                      50, TRUE),
  ('industry','finance',       '金融・保険',                60, TRUE),
  -- 住まい・建物
  ('industry','realestate',    '不動産',                    70, TRUE),
  ('industry','construction',  '建設・工事・設備',          80, TRUE),
  -- ものづくり・流通
  ('industry','manufacturing', 'メーカー・製造',            90, TRUE),
  ('industry','wholesale',     '商社・卸売',               100, TRUE),
  ('industry','retail',        '小売・EC',                 110, TRUE),
  ('industry','logistics',     '運輸・物流',               120, TRUE),
  -- くらし
  ('industry','food',          '飲食',                     130, TRUE),
  ('industry','beauty',        '美容・リラクゼーション',   140, TRUE),
  ('industry','wellness',      '健康・フィットネス',       150, TRUE),
  ('industry','medical',       '医療',                     160, TRUE),
  ('industry','care',          '介護・福祉',               170, TRUE),
  ('industry','lifeservice',   '生活関連サービス',         180, TRUE),
  -- 人・学び・体験
  ('industry','education',     '教育・スクール',           190, TRUE),
  ('industry','hr',            '人材・採用',               200, TRUE),
  ('industry','travel',        '旅行・宿泊・レジャー',     210, TRUE),
  ('industry','entertainment', 'イベント・エンタメ',       220, TRUE),
  -- その他
  ('industry','agriculture',   '農林水産',                 230, TRUE),
  ('industry','other',         'その他',                   240, TRUE)
ON CONFLICT (category, code) DO UPDATE
  SET label      = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      is_active  = TRUE;

-- ------------------------------------------------------------
-- 2. 新しい一覧に無い業種を止める
-- ------------------------------------------------------------
-- 🔴 まず無効化する。いきなり消すと、選んでいる人の登録が
--    参照先を失う（外部キーが無いので誰にも見えないまま壊れる）。
--    今回消えるのは health（健康・医療・福祉）だけで、
--    医療 / 介護・福祉 / 健康・フィットネス の3つに割った。
UPDATE public.matching_options
   SET is_active = FALSE
 WHERE category = 'industry'
   AND code NOT IN (
     'it','marketing','creative','consulting','professional','finance',
     'realestate','construction','manufacturing','wholesale','retail','logistics',
     'food','beauty','wellness','medical','care','lifeservice',
     'education','hr','travel','entertainment','agriculture','other'
   );

-- ------------------------------------------------------------
-- 3. 誰も選んでいないものだけ消す
-- ------------------------------------------------------------
-- 判定は画面と同じ関数を使う。ここで数えるので、
-- 「実行する直前に誰かが選んだ」場合も取りこぼさない（選ばれていれば
-- 消えずに無効のまま残り、その人の登録は保たれる）。
DELETE FROM public.matching_options AS o
 WHERE o.category = 'industry'
   AND o.is_active = FALSE
   AND public.matching_option_usage('industry', o.code) = 0;
