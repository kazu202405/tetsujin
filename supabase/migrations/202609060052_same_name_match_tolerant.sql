-- ============================================================
-- 同名の照合を「表記ゆれ」に強くする
-- ============================================================
-- 前提：202608310041_application_same_name_members.sql 適用済み。
--
-- ------------------------------------------------------------
-- 🔴 なぜ要るか（2026-09-06 実測）
-- ------------------------------------------------------------
-- 承認前に出す「同じ名前の在籍会員」は name_normalized
-- （空白を取って小文字化）の完全一致で探していた。
-- ところが二重になっていた2件は、どちらも一致しない書き方だった。
--
--   林佑二（会員番号167）      ⇔ 林　佑ニ   … 「二」がカタカナの「ニ」
--   大山重行（会員番号338）    ⇔ 大山重行(カピバラ) … 括弧の呼び名つき
--
-- ∴ 候補は1件も出ず、運営の画面には注意書きすら出なかった。
--    「気づかせる」仕組みがあっても、照合が固いと無言で素通りする。
--
-- 同じ形の重複が在籍者にあと5組あった（いずれも 名簿の行＝会員番号あり
-- ／ 問い合わせの行＝メールあり の対）。この照合では1組も出ない：
--   三枝　稚奈(みつえ　わかな) ⇔ 三枝稚奈(324) … 括弧
--   大山みどり（みどりん）     ⇔ 大山みどり(339) … 括弧（全角）
--   高瀬将人                   ⇔ 髙瀬将人(401)   … はしごだか
--   廣瀨 和則                  ⇔ 廣瀬和則(359)   … 旧字
--   朝山理惠                   ⇔ 朝山理恵(406)   … 旧字
--
-- ------------------------------------------------------------
-- 直し方
-- ------------------------------------------------------------
-- 照合用の鍵を1つ作り、両側を同じ手順で潰してから比べる。
--   ① NFKC で正規化（半角カナ・全角英数を揃える）
--   ② 括弧の中を落とす（呼び名・ふりがな）
--   ③ 空白と区切り文字を取る
--   ④ 見た目が同じ字を寄せる（カタカナ↔漢字・旧字↔新字）
--   ⑤ 小文字化
--
-- 🔴 name_normalized は書き換えない。あちらは会員検索（前方一致）が
--    使っていて、括弧を落とすと「大山重行(カピバラ)」を括弧まで
--    打った人が探せなくなる。照合用の鍵は別に持つ。
--
-- 🔴 自動では紐づけない（前の版のまま）。同姓同名は実在するので、
--    機械は気づかせるだけにして判断は運営に残す。
--    ゆるくした結果、別人が候補に出ることは起こりうる＝それでよい。
--
-- 🔴 translate() は「置換前」と「置換後」の文字数が違うと、はみ出した分を
--    黙って削除する。必ず同じ文字数（現在25文字）に保つこと。
-- ============================================================

CREATE OR REPLACE FUNCTION public.name_search_key(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(
    TRANSLATE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          NORMALIZE(COALESCE(p_name, ''), NFKC),
          -- ② 括弧とその中身（呼び名・ふりがな）
          '[（(][^）)]*[）)]', '', 'g'
        ),
        -- ③ 空白・中黒・句読点
        '[[:space:]　・.,]+', '', 'g'
      ),
      -- ④ 見た目が同じ字。左右は必ず同じ文字数（25文字）
      'ニハカタエロトムヒミ髙𠮷濵邉邊澤嶋嶌廣惠瀨眞德齋齊',
      '二八力夕工口卜厶匕彡高吉浜辺辺沢島島広恵瀬真徳斎斉'
    )
  );
$$;

COMMENT ON FUNCTION public.name_search_key(TEXT) IS
  '同一人物の照合に使う名前の鍵。括弧の中・空白・旧字やカタカナの見た目違いを潰す。表示や検索には使わない';

-- ------------------------------------------------------------
-- 同名の候補（202608310041 の関数を、比べ方だけ差し替えて作り直す）
-- ------------------------------------------------------------
-- 🔴 CREATE OR REPLACE は全文置換。前の版から変えたのは JOIN の1行だけで、
--    戻り値・is_admin() の条件・並び順・除外条件はそのまま写している。
DROP FUNCTION IF EXISTS public.pending_application_same_name_members();

CREATE FUNCTION public.pending_application_same_name_members()
RETURNS TABLE (
  application_id  UUID,
  member_id       UUID,
  member_no       INTEGER,
  name            TEXT,
  job             TEXT,
  email           TEXT,
  phone           TEXT,
  start_year      SMALLINT,
  start_month     SMALLINT,
  has_login       BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    a.id,
    m.id, m.member_no, m.name, m.job, m.email, m.phone,
    m.start_year, m.start_month,
    m.auth_user_id IS NOT NULL
  FROM public.applications AS a
  JOIN public.members AS m
    ON public.name_search_key(m.name) = public.name_search_key(a.name)
  WHERE public.is_admin()
    AND a.status = 'pending'
    AND m.is_withdrawn = FALSE
    -- 既にこの申請から作られた行は「同名の既存会員」ではないので出さない
    AND (a.member_id IS NULL OR m.id <> a.member_id)
  ORDER BY a.created_at DESC, m.member_no ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.pending_application_same_name_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_application_same_name_members() TO authenticated;

COMMENT ON FUNCTION public.pending_application_same_name_members() IS
  '申請と同じ名前の在籍会員。表記ゆれ（括弧・旧字・カタカナ）を寄せて比べる。自動では紐づけない';

-- ------------------------------------------------------------
-- 適用の確認（このまま流して結果を見る）
-- ------------------------------------------------------------
-- 期待する結果:
--   ① 3行とも一致（t）になること
--   ② 在籍者の中で鍵が重なる組が出ること（2026-09-06 時点で5組）
SELECT
  public.name_search_key('林　佑ニ')            = public.name_search_key('林佑二')   AS katakana_ni,
  public.name_search_key('大山重行(カピバラ)')  = public.name_search_key('大山重行')  AS kakko,
  public.name_search_key('髙瀬将人')            = public.name_search_key('高瀬将人')  AS hashigodaka;

SELECT
  public.name_search_key(name) AS 照合キー,
  COUNT(*)                     AS 行数,
  STRING_AGG(
    name || COALESCE('（番号' || member_no || '）', '（番号なし）'), ' ⇔ '
    ORDER BY member_no NULLS LAST
  )                            AS 会員
FROM public.members
WHERE is_withdrawn = FALSE
GROUP BY 1
HAVING COUNT(*) > 1
ORDER BY 2 DESC;
