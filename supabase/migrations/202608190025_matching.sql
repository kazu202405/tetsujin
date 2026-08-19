-- ============================================================
-- つながりマッチング（フェーズ1：設定項目とデータの土台）
-- ============================================================
-- 出典：「TETSUJIN会 AIマッチングシステム 設定項目・マッチング設計」
--
-- 依頼主決定（2026-08-19）：
--   ・AIは使わない。項目マッチだけで足りる
--     （必須条件で絞り、残りの一致数で並べるだけ＝集合演算。
--      AIを挟むと「なぜこの人が出たか説明できない」「毎月結果が揺れる」
--      「費用がかかる」を抱えるだけで、得るものがほとんど無い）
--   ・提案は月3人まで（10人だと母数441名では出ない／多いと人は選ばない）
--   ・地域などは任意。ただし「任意だとマッチしない」と画面に明記する
--
-- ------------------------------------------------------------
-- 🔴 資料に書かれていなかった最大の点：向きが2つ要る
-- ------------------------------------------------------------
-- 資料の7カテゴリは「どんな人とつながりたいか（探す側）」しか定義していない。
-- だが「大阪の法人経営者を探す」が成立するには、
-- 探される側が「大阪」「法人経営者」と登録していなければならない。
-- ∴ 「自分のこと」と「探している条件」を別々に持つ。
--
-- ------------------------------------------------------------
-- 🔴 年代・性別は members から引く（ここに持たない）
-- ------------------------------------------------------------
-- members.age_range / gender に既に入っている（441名中 323/336名）。
-- ここにも持つと入力口が2つになり、食い違ったときにどちらが正か分からなくなる。
-- SNSリンクで実際に起きた事故と同じ形なので繰り返さない。
-- ∴ ライフスタイル系（ママ・パパ・子育て中）だけをここで持つ。
--
-- 選択肢は表で持つ。コードに埋めると増減のたびにデプロイが要るため。
-- ============================================================

-- ------------------------------------------------------------
-- 選択肢のマスタ
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matching_options (
  category   TEXT    NOT NULL CHECK (category IN (
               'purpose',    -- ① つながりたい目的（探す側だけが使う）
               'position',   -- ② 立場・事業形態
               'industry',   -- ③ 業種
               'region',     -- ④ 地域
               'lifestyle',  -- ⑤ 人・属性のうち年代/性別以外
               'hobby',      -- ⑥ 趣味・好きなこと
               'interest'    -- ⑦ 興味・関心のあるテーマ
             )),
  code       TEXT    NOT NULL,
  label      TEXT    NOT NULL,
  -- 「商品・サービスを提案したい」だけは相手に営業目的だと事前表示する
  is_sales   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (category, code)
);

ALTER TABLE public.matching_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matching_options_select ON public.matching_options;
CREATE POLICY matching_options_select ON public.matching_options
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS matching_options_admin ON public.matching_options;
CREATE POLICY matching_options_admin ON public.matching_options
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 自分のこと（探される側のデータ）
-- ------------------------------------------------------------
-- 配列で持つ。441名規模なら結合表にするより素直で、
-- 重なりの判定（&&）と件数の数え方が両方そのまま書ける。
CREATE TABLE IF NOT EXISTS public.member_matching_profile (
  member_id  UUID        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  positions  TEXT[]      NOT NULL DEFAULT '{}',
  industries TEXT[]      NOT NULL DEFAULT '{}',
  regions    TEXT[]      NOT NULL DEFAULT '{}',
  lifestyles TEXT[]      NOT NULL DEFAULT '{}',
  hobbies    TEXT[]      NOT NULL DEFAULT '{}',
  interests  TEXT[]      NOT NULL DEFAULT '{}',
  -- 自由記述。選択肢に無いことを書いてもらう（検索の補助）
  note       TEXT        CHECK (note IS NULL OR char_length(note) <= 1000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_profile_industries
  ON public.member_matching_profile USING GIN (industries);
CREATE INDEX IF NOT EXISTS idx_matching_profile_regions
  ON public.member_matching_profile USING GIN (regions);
CREATE INDEX IF NOT EXISTS idx_matching_profile_positions
  ON public.member_matching_profile USING GIN (positions);

DROP TRIGGER IF EXISTS trg_matching_profile_set_updated_at ON public.member_matching_profile;
CREATE TRIGGER trg_matching_profile_set_updated_at
  BEFORE UPDATE ON public.member_matching_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.member_matching_profile ENABLE ROW LEVEL SECURITY;

-- 会員同士で見える（これが見えないとマッチングの意味が無い）。書けるのは本人と運営。
DROP POLICY IF EXISTS matching_profile_select ON public.member_matching_profile;
CREATE POLICY matching_profile_select ON public.member_matching_profile
  FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS matching_profile_write_own ON public.member_matching_profile;
CREATE POLICY matching_profile_write_own ON public.member_matching_profile
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (member_id = public.current_member_id() OR public.is_admin());

-- ------------------------------------------------------------
-- 探している条件
-- ------------------------------------------------------------
-- 🔴 こちらは本人と運営しか見られない。
--    「誰を探しているか」は営業の手の内でもあり、全員に見えると
--    先回りされたり気まずさが生まれる。マッチングの判定はサーバー側で行う。
CREATE TABLE IF NOT EXISTS public.member_matching_wants (
  member_id  UUID        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  purposes   TEXT[]      NOT NULL DEFAULT '{}',
  positions  TEXT[]      NOT NULL DEFAULT '{}',
  industries TEXT[]      NOT NULL DEFAULT '{}',
  regions    TEXT[]      NOT NULL DEFAULT '{}',
  lifestyles TEXT[]      NOT NULL DEFAULT '{}',
  hobbies    TEXT[]      NOT NULL DEFAULT '{}',
  interests  TEXT[]      NOT NULL DEFAULT '{}',
  age_ranges TEXT[]      NOT NULL DEFAULT '{}',  -- members.age_range と突き合わせる
  genders    TEXT[]      NOT NULL DEFAULT '{}',  -- members.gender と突き合わせる
  -- 「ここだけは絶対に外せない」カテゴリ名の配列。
  -- 例: {'position','region'} なら立場と地域は完全一致が条件。
  -- 全部をANDにすると誰も出てこないので、必須は本人に選ばせる。
  required   TEXT[]      NOT NULL DEFAULT '{}',
  note       TEXT        CHECK (note IS NULL OR char_length(note) <= 1000),
  -- 探すのを一旦やめたいとき用。消さずに止められるようにする。
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_matching_wants_set_updated_at ON public.member_matching_wants;
CREATE TRIGGER trg_matching_wants_set_updated_at
  BEFORE UPDATE ON public.member_matching_wants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.member_matching_wants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matching_wants_own ON public.member_matching_wants;
CREATE POLICY matching_wants_own ON public.member_matching_wants
  FOR ALL TO authenticated
  USING (member_id = public.current_member_id() OR public.is_admin())
  WITH CHECK (member_id = public.current_member_id() OR public.is_admin());

-- ------------------------------------------------------------
-- 選択肢の初期値
-- ------------------------------------------------------------
-- 「問わない」は入れない。空＝問わない、として扱う。
-- 選択肢として置くと「問わない」と「未選択」の2つの空が生まれて判定が濁る。
INSERT INTO public.matching_options (category, code, label, is_sales, sort_order) VALUES
-- ① つながりたい目的
('purpose','outsource','仕事を依頼したい・外注先を探したい',FALSE,10),
('purpose','propose','商品・サービスを提案したい',TRUE,20),
('purpose','collab','協業・コラボしたい',FALSE,30),
('purpose','newbiz','新規事業・プロジェクトを一緒にしたい',FALSE,40),
('purpose','sales_channel','販路・取引先を広げたい',FALSE,50),
('purpose','supplier','仕入先・商品を探したい',FALSE,60),
('purpose','hiring','人材・採用についてつながりたい',FALSE,70),
('purpose','advice','相談・アドバイスがほしい',FALSE,80),
('purpose','exchange','情報交換・意見交換したい',FALSE,90),
('purpose','fellow','一緒に活動できる仲間を探したい',FALSE,100),
('purpose','network','まずは人脈・交流を広げたい',FALSE,110),
('purpose','other','その他',FALSE,120),
-- ② 立場・事業形態
('position','corp_owner','法人経営者',FALSE,10),
('position','executive','取締役・役員',FALSE,20),
('position','sole_proprietor','個人事業主・フリーランス',FALSE,30),
('position','employee','会社員',FALSE,40),
-- ③ 業種
('industry','it','IT・Web・AI・システム',FALSE,10),
('industry','creative','広告・デザイン・クリエイティブ',FALSE,20),
('industry','marketing','マーケティング・SNS',FALSE,30),
('industry','professional','士業',FALSE,40),
('industry','consulting','コンサルティング・専門サービス',FALSE,50),
('industry','finance','金融・保険・資産形成',FALSE,60),
('industry','realestate','不動産・建築・住宅',FALSE,70),
('industry','beauty','美容',FALSE,80),
('industry','health','健康・医療・福祉',FALSE,90),
('industry','food','飲食・食品',FALSE,100),
('industry','retail','小売・EC',FALSE,110),
('industry','manufacturing','メーカー・製造・卸',FALSE,120),
('industry','hr','人材・採用',FALSE,130),
('industry','education','教育・スクール',FALSE,140),
('industry','travel','旅行・観光・宿泊',FALSE,150),
('industry','entertainment','イベント・エンターテインメント',FALSE,160),
('industry','agriculture','農業・一次産業',FALSE,170),
('industry','logistics','物流・運送',FALSE,180),
('industry','other','その他',FALSE,190),
-- ⑤ 人・属性（年代・性別は members から引くのでここには置かない）
('lifestyle','mom','ママ',FALSE,10),
('lifestyle','dad','パパ',FALSE,20),
('lifestyle','parenting','子育て中',FALSE,30),
-- ⑦ 興味・関心
('interest','social','社会貢献・ボランティア（動物保護などを含む）',FALSE,10),
('interest','local','地方創生・地域活性化',FALSE,20),
('interest','children','子ども・子育て・教育',FALSE,30),
('interest','women','女性活躍・女性支援',FALSE,40),
('interest','welfare','福祉・高齢者支援',FALSE,50),
('interest','wellness','健康・ウェルネス',FALSE,60),
('interest','ai','AI・テクノロジー',FALSE,70),
('interest','startup','新規事業・スタートアップ',FALSE,80),
('interest','global','海外・インバウンド',FALSE,90),
('interest','growth','自己成長・学び',FALSE,100),
('interest','other','その他',FALSE,110)
ON CONFLICT (category, code) DO UPDATE
  SET label = EXCLUDED.label, is_sales = EXCLUDED.is_sales, sort_order = EXCLUDED.sort_order;

-- ⑥ 趣味（資料の29項目。資料自身が「15〜20に整理してよい」としているので、
--    利用状況を見て is_active で減らせるようにしてある）
INSERT INTO public.matching_options (category, code, label, sort_order) VALUES
('hobby','golf','ゴルフ',10),
('hobby','tennis','テニス',20),
('hobby','running','ランニング・マラソン',30),
('hobby','fitness','筋トレ・フィットネス',40),
('hobby','baseball','野球',50),
('hobby','football','サッカー・フットサル',60),
('hobby','sports_other','その他スポーツ',70),
('hobby','sports_watch','スポーツ観戦',80),
('hobby','drink','お酒・飲みに行くこと',90),
('hobby','gourmet','グルメ・食べ歩き',100),
('hobby','cafe','カフェ',110),
('hobby','cooking','料理',120),
('hobby','travel_jp','国内旅行',130),
('hobby','travel_abroad','海外旅行',140),
('hobby','camp','キャンプ・アウトドア',150),
('hobby','fishing','釣り',160),
('hobby','sauna','サウナ・温泉',170),
('hobby','car','車・バイク・ドライブ',180),
('hobby','music','音楽',190),
('hobby','movie','映画・ドラマ',200),
('hobby','reading','読書',210),
('hobby','art','アート',220),
('hobby','game','ゲーム',230),
('hobby','photo','写真',240),
('hobby','pet','ペット・動物',250),
('hobby','fashion','美容・ファッション',260),
('hobby','wellbeing','健康',270),
('hobby','childcare','子育て',280),
('hobby','other','その他',290)
ON CONFLICT (category, code) DO UPDATE
  SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ④ 地域（47都道府県＋海外）
INSERT INTO public.matching_options (category, code, label, sort_order)
SELECT 'region', code, label, ROW_NUMBER() OVER ()
FROM (VALUES
  ('hokkaido','北海道'),('aomori','青森県'),('iwate','岩手県'),('miyagi','宮城県'),
  ('akita','秋田県'),('yamagata','山形県'),('fukushima','福島県'),('ibaraki','茨城県'),
  ('tochigi','栃木県'),('gunma','群馬県'),('saitama','埼玉県'),('chiba','千葉県'),
  ('tokyo','東京都'),('kanagawa','神奈川県'),('niigata','新潟県'),('toyama','富山県'),
  ('ishikawa','石川県'),('fukui','福井県'),('yamanashi','山梨県'),('nagano','長野県'),
  ('gifu','岐阜県'),('shizuoka','静岡県'),('aichi','愛知県'),('mie','三重県'),
  ('shiga','滋賀県'),('kyoto','京都府'),('osaka','大阪府'),('hyogo','兵庫県'),
  ('nara','奈良県'),('wakayama','和歌山県'),('tottori','鳥取県'),('shimane','島根県'),
  ('okayama','岡山県'),('hiroshima','広島県'),('yamaguchi','山口県'),('tokushima','徳島県'),
  ('kagawa','香川県'),('ehime','愛媛県'),('kochi','高知県'),('fukuoka','福岡県'),
  ('saga','佐賀県'),('nagasaki','長崎県'),('kumamoto','熊本県'),('oita','大分県'),
  ('miyazaki','宮崎県'),('kagoshima','鹿児島県'),('okinawa','沖縄県'),('overseas','海外')
) AS t(code, label)
ON CONFLICT (category, code) DO UPDATE
  SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 入力がどれだけ埋まっているか（本人向けの進み具合／運営の把握用）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_matching_setup()
RETURNS TABLE (
  has_profile     BOOLEAN,
  has_wants       BOOLEAN,
  profile_filled  INTEGER,  -- 自分のこと 6カテゴリのうち何個入れたか
  wants_filled    INTEGER   -- 探している条件 のうち何個入れたか
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.member_id IS NOT NULL,
    w.member_id IS NOT NULL,
    COALESCE(
      (CASE WHEN COALESCE(array_length(p.positions,1),0)  > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(p.industries,1),0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(p.regions,1),0)    > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(p.lifestyles,1),0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(p.hobbies,1),0)    > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(p.interests,1),0)  > 0 THEN 1 ELSE 0 END), 0),
    COALESCE(
      (CASE WHEN COALESCE(array_length(w.purposes,1),0)   > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(w.positions,1),0)  > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(w.industries,1),0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(w.regions,1),0)    > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(w.lifestyles,1),0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(w.hobbies,1),0)    > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(array_length(w.interests,1),0)  > 0 THEN 1 ELSE 0 END), 0)
  FROM public.members AS m
  LEFT JOIN public.member_matching_profile AS p ON p.member_id = m.id
  LEFT JOIN public.member_matching_wants   AS w ON w.member_id = m.id
  WHERE m.id = public.current_member_id();
$$;

REVOKE ALL ON FUNCTION public.my_matching_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_matching_setup() TO authenticated;
