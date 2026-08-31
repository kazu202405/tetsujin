"use client";

// ============================================================
// つながりの設定
// ============================================================
// 🔴 向きが2つある。ここを混ぜると会員が何を入れているか分からなくなる。
//    「自分のこと」   … 探される側のデータ。会員同士で見える。
//    「探している条件」… 本人と運営だけ。誰を探しているかは手の内でもある。
//
// 全部入れる必要はない、が資料の方針。ただし
// 「入れていない項目ではマッチしない」ことは必ず画面に出す
// （任意にした結果「候補が出ない」と言われるのを防ぐ）。
// ============================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Search, User, AlertCircle, Eye, Lock } from "lucide-react";

interface Option {
  category: string;
  code: string;
  label: string;
  is_sales: boolean;
  /** 運営が「使わない」にした項目。新しくは選べないが、選んでいた人には出す */
  is_active: boolean;
}

type Bag = Record<string, string[]>;

/** 画面に出す順番と見出し */
// 🔴 見出しに必ず向きを入れる（あなたの〜 / 相手の〜）。
//    どちらのタブも同じカテゴリが並ぶので、「立場・事業形態」とだけ
//    書かれていると、自分のことなのか相手に求める条件なのかが
//    カード単体では読めない。
const PROFILE_SECTIONS: { key: string; category: string; title: string; hint?: string }[] = [
  { key: "positions", category: "position", title: "あなたの立場・事業形態" },
  { key: "industries", category: "industry", title: "あなたの業種" },
  { key: "regions", category: "region", title: "あなたが活動している地域", hint: "複数選べます" },
  { key: "lifestyles", category: "lifestyle", title: "あなたの属性" },
  { key: "hobbies", category: "hobby", title: "あなたの趣味・好きなこと" },
  { key: "interests", category: "interest", title: "あなたの興味・関心のあるテーマ" },
];

const WANTS_SECTIONS: { key: string; category: string; title: string; hint?: string }[] = [
  { key: "purposes", category: "purpose", title: "つながりたい目的", hint: "何のためにつながりたいかです" },
  { key: "positions", category: "position", title: "相手の立場・事業形態" },
  { key: "industries", category: "industry", title: "相手の業種" },
  { key: "regions", category: "region", title: "相手の地域" },
  { key: "age_ranges", category: "age_range", title: "相手の年代" },
  { key: "genders", category: "gender", title: "相手の性別" },
  { key: "lifestyles", category: "lifestyle", title: "相手の属性" },
  { key: "hobbies", category: "hobby", title: "相手の趣味" },
  { key: "interests", category: "interest", title: "相手の興味・関心" },
];

// 🔴 台帳の既存表記に合わせる（全角＋前半/後半）。336名分が既にこの形なので、
//    「40代」など別表記で保存すると同じ人が別の値で存在することになる。
//    APIの許可リストと必ず一致させること（片方だけ増やすと保存が400で弾かれる）。
const AGE_RANGES = [
  "２０代前半", "２０代後半", "３０代前半", "３０代後半", "４０代前半", "４０代後半",
  "５０代前半", "５０代後半", "６０代前半", "６０代後半", "７０代以上",
];
const GENDERS = ["男", "女"];

// ------------------------------------------------------------
// 地域のまとめ選択
// ------------------------------------------------------------
// 🔴 47都道府県を1つずつ押させない。「全国で活動している」人が
//    47回タップするのは現実的でなく、途中でやめる＝地域が空のまま
//    になる。地域が空だと、地域で探している人からは見つからない。
//
// 区分は一般的な8地方区分。どの県が入るかはボタンを押す前に
// title で読めるようにする（「関西に三重は入るのか」で迷わせない）。
//
// 運営が地域を足した場合、その項目はどのまとめにも入らない
// （個別に押せば選べる）。まとめの中身を勝手に広げるより、
// 押した内容が毎回同じである方が信用できる。
const REGION_GROUPS: { label: string; codes: string[] }[] = [
  {
    label: "北海道・東北",
    codes: ["hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"],
  },
  {
    label: "関東",
    codes: ["ibaraki", "tochigi", "gunma", "saitama", "chiba", "tokyo", "kanagawa"],
  },
  {
    label: "中部",
    codes: [
      "niigata", "toyama", "ishikawa", "fukui", "yamanashi",
      "nagano", "gifu", "shizuoka", "aichi",
    ],
  },
  {
    label: "関西",
    codes: ["mie", "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama"],
  },
  { label: "中国", codes: ["tottori", "shimane", "okayama", "hiroshima", "yamaguchi"] },
  { label: "四国", codes: ["tokushima", "kagawa", "ehime", "kochi"] },
  {
    label: "九州・沖縄",
    codes: ["fukuoka", "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa"],
  },
];

/** 全国＝47都道府県。海外は含めない（「全国」は国内のことなので） */
const ALL_PREFECTURES = REGION_GROUPS.flatMap((g) => g.codes);

/** 必須指定に使うカテゴリ名（DB側の required に入れる値） */
const REQUIRED_KEY: Record<string, string> = {
  purposes: "purpose",
  positions: "position",
  industries: "industry",
  regions: "region",
  age_ranges: "age_range",
  genders: "gender",
  lifestyles: "lifestyle",
  hobbies: "hobby",
  interests: "interest",
};

/** 地域だけに出すまとめ選択。押すと、その地方の県をまとめて付け外しする。 */
function BulkPicker({
  options,
  selected,
  onBulk,
}: {
  options: Option[];
  selected: string[];
  onBulk: (codes: string[], on: boolean) => void;
}) {
  const nameOf = (code: string) => options.find((o) => o.code === code)?.label ?? code;

  const button = (label: string, codes: string[]) => {
    // 全部入っていれば「外す」、そうでなければ「付ける」。
    // 半分だけ選んでいる状態から押したときは、まず全部付くほうが素直
    // （いきなり消えると、それまでの選択まで失われたように見える）。
    const all = codes.every((c) => selected.includes(c));
    return (
      <button
        key={label}
        type="button"
        onClick={() => onBulk(codes, !all)}
        // 🔴 中身を読めるようにする。「関西に三重は入るのか」で
        //    迷わせないため、押す前に確かめられること自体が必要。
        title={codes.map(nameOf).join("・")}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
          all
            ? "bg-gray-700 text-white border-gray-700"
            : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-gray-100">
      {button("全国", ALL_PREFECTURES)}
      {REGION_GROUPS.map((g) => button(g.label, g.codes))}
    </div>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  // 🔴 使わなくなった項目は、自分が選んでいるときだけ出す。
  //    黙って消すと、本人には見えないのに候補の判定には効き続け、
  //    外すこともできなくなる。選び直せないことが分かる見た目にする。
  const visible = options.filter((o) => o.is_active || selected.includes(o.code));

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((o) => {
        const on = selected.includes(o.code);
        const retired = !o.is_active;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => onToggle(o.code)}
            title={retired ? "いまは使われていない項目です。外すと選び直せません" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              on
                ? retired
                  ? "bg-gray-400 text-white border-gray-400"
                  : "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {o.label}
            {retired && <span className="ml-1 opacity-70">（終了）</span>}
            {o.is_sales && (
              <span className={`ml-1 ${on ? "text-amber-200" : "text-amber-600"}`}>※</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function MatchingSettingsPage() {
  const [tab, setTab] = useState<"profile" | "wants">("profile");
  const [options, setOptions] = useState<Option[]>([]);
  const [profile, setProfile] = useState<Bag>({});
  const [wants, setWants] = useState<Bag>({});
  const [required, setRequired] = useState<string[]>([]);
  const [profileNote, setProfileNote] = useState("");
  const [wantsNote, setWantsNote] = useState("");
  const [me, setMe] = useState<{ ageRange: string | null; gender: string | null }>({
    ageRange: null,
    gender: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/me/matching", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (!body) {
          setMessage({ type: "error", text: "設定を読み込めませんでした" });
          setLoading(false);
          return;
        }
        setOptions(body.options as Option[]);
        setMe(body.me);
        const p = body.profile ?? {};
        const w = body.wants ?? {};
        setProfile(
          Object.fromEntries(PROFILE_SECTIONS.map((s) => [s.key, (p[s.key] as string[]) ?? []])),
        );
        setWants(
          Object.fromEntries(WANTS_SECTIONS.map((s) => [s.key, (w[s.key] as string[]) ?? []])),
        );
        setRequired((w.required as string[]) ?? []);
        setProfileNote(p.note ?? "");
        setWantsNote(w.note ?? "");
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: "error", text: "設定を読み込めませんでした（通信エラー）" });
        setLoading(false);
      });
  }, []);

  const byCategory = useMemo(() => {
    const m: Record<string, Option[]> = {};
    for (const o of options) (m[o.category] ??= []).push(o);
    return m;
  }, [options]);

  const toggle = (bag: Bag, setBag: (b: Bag) => void, key: string, code: string) => {
    const cur = bag[key] ?? [];
    setBag({ ...bag, [key]: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] });
  };

  // まとめ選択。付けるときは重複させない、外すときは指定分だけ抜く
  // （その地方以外の選択や、まとめに入っていない項目は触らない）。
  const setMany = (
    bag: Bag,
    setBag: (b: Bag) => void,
    key: string,
    codes: string[],
    on: boolean,
  ) => {
    const cur = bag[key] ?? [];
    const next = on
      ? [...cur, ...codes.filter((c) => !cur.includes(c))]
      : cur.filter((c) => !codes.includes(c));
    setBag({ ...bag, [key]: next });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // 年代・性別は members の列なので別のAPI。まとめて押せた方が親切なので同時に送る。
      const [res, meRes] = await Promise.all([
        fetch("/api/me/matching", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: { ...profile, note: profileNote },
            wants: { ...wants, required, note: wantsNote },
          }),
        }),
        fetch("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gender: me.gender, ageRange: me.ageRange }),
        }),
      ]);
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      const meBody = (await meRes.json().catch(() => null)) as { error?: string } | null;
      setMessage(
        res.ok && meRes.ok
          ? { type: "success", text: "保存しました" }
          : {
              type: "error",
              text: body?.error ?? meBody?.error ?? "保存できませんでした",
            },
      );
    } catch {
      setMessage({ type: "error", text: "保存できませんでした（通信エラー）" });
    }
    setSaving(false);
  };

  const profileCount = PROFILE_SECTIONS.filter((s) => (profile[s.key] ?? []).length > 0).length;
  const wantsCount = WANTS_SECTIONS.filter((s) => (wants[s.key] ?? []).length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔴 タブと「誰に見えるか」を見出しと一緒に固定する。
             どちらのタブも同じ見た目の白いカードが並ぶので、
             スクロールしてタブが流れると、いま自分のことを書いているのか
             相手に求める条件を書いているのかが画面から読めなくなる。 */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 pt-4 flex items-center gap-3">
          <Link href="/app/mypage" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">つながりの設定</h1>
        </div>

        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("profile")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === "profile"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <User className="w-4 h-4" />
              自分のこと
              <span
                className={`text-[10px] ${tab === "profile" ? "text-gray-300" : "text-gray-400"}`}
              >
                {profileCount}/{PROFILE_SECTIONS.length}
              </span>
            </button>
            <button
              onClick={() => setTab("wants")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === "wants"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <Search className="w-4 h-4" />
              探している条件
              <span
                className={`text-[10px] ${tab === "wants" ? "text-gray-300" : "text-gray-400"}`}
              >
                {wantsCount}/{WANTS_SECTIONS.length}
              </span>
            </button>
          </div>

          {/* 🔴 一番間違えると困るのは「誰に見えるか」。1行にして常に出す。
                 公開側は白、自分だけの側は塗り＝閉じている見た目にする。
                 色は足さない（この画面では琥珀＝必須条件・営業目的で既に
                 意味を持っているので、増やすと読み手が混乱する）。 */}
          {tab === "profile" ? (
            <p className="flex items-center gap-1.5 mt-2 mb-3 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <Eye className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span>
                <b className="text-gray-900">他の会員から見えます。</b>
                あなたを探している人に見つけてもらうための情報です。
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 mt-2 mb-3 text-[11px] text-gray-600 bg-gray-200/70 border border-gray-300 rounded-lg px-3 py-1.5">
              <Lock className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
              <span>
                <b className="text-gray-900">あなたと運営だけが見ます。</b>
                誰を探しているかは相手に伝わりません。
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-5 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            全部を入れる必要はありませんが、<b>入れていない項目ではマッチしません</b>。
          </span>
        </p>

        {message && (
          <p
            className={`mb-4 text-xs rounded-lg px-3 py-2 ${
              message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tab === "profile" ? (
              <>
                {/* 年代・性別は会員台帳の列だが、契約の事実ではなく本人の属性。
                    本人が直せる（DBのトリガでも止めていない）ので、ここで編集させる。 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-1">年代・性別</h2>
                  <p className="text-[11px] text-gray-400 mb-3">
                    会員情報にも反映されます。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-[11px] text-gray-500 mb-1">年代</span>
                      <select
                        value={me.ageRange ?? ""}
                        onChange={(e) => setMe((m) => ({ ...m, ageRange: e.target.value || null }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">未登録</option>
                        {AGE_RANGES.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-gray-500 mb-1">性別</span>
                      <select
                        value={me.gender ?? ""}
                        onChange={(e) => setMe((m) => ({ ...m, gender: e.target.value || null }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">未登録</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {(!me.ageRange || !me.gender) && (
                    <p className="flex items-start gap-1.5 mt-3 text-[11px] text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      未登録の項目は、その条件で探している人からは見つけてもらえません。
                    </p>
                  )}
                </div>

                {PROFILE_SECTIONS.map((s) => (
                  <div key={s.key} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h2 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h2>
                    {s.hint && <p className="text-[11px] text-gray-400 mb-3">{s.hint}</p>}
                    <div className={s.hint ? "" : "mt-3"}>
                      {s.category === "region" && (
                        <BulkPicker
                          options={byCategory[s.category] ?? []}
                          selected={profile[s.key] ?? []}
                          onBulk={(codes, on) => setMany(profile, setProfile, s.key, codes, on)}
                        />
                      )}
                      <Chips
                        options={byCategory[s.category] ?? []}
                        selected={profile[s.key] ?? []}
                        onToggle={(code) => toggle(profile, setProfile, s.key, code)}
                      />
                    </div>
                  </div>
                ))}

                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-1">あなたについての自由記述</h2>
                  <p className="text-[11px] text-gray-400 mb-3">
                    選択肢に無いことがあれば書いてください（できること、得意なことなど）。他の会員から見えます。
                  </p>
                  <textarea
                    value={profileNote}
                    onChange={(e) => setProfileNote(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </>
            ) : (
              <>
                {WANTS_SECTIONS.map((s) => {
                  const reqKey = REQUIRED_KEY[s.key];
                  const isRequired = required.includes(reqKey);
                  const hasAny = (wants[s.key] ?? []).length > 0;
                  return (
                    <div key={s.key} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h2 className="text-sm font-bold text-gray-900">{s.title}</h2>
                        {/* 目的は「絶対条件」になじまないので必須指定を出さない */}
                        {s.key !== "purposes" && (
                          <button
                            type="button"
                            disabled={!hasAny}
                            onClick={() =>
                              setRequired((r) =>
                                r.includes(reqKey) ? r.filter((c) => c !== reqKey) : [...r, reqKey],
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex-shrink-0 transition-colors disabled:opacity-30 ${
                              isRequired
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-white text-gray-500 border-gray-200"
                            }`}
                          >
                            {isRequired ? "必須条件" : "必須にする"}
                          </button>
                        )}
                      </div>
                      {s.hint && <p className="text-[11px] text-gray-400 mb-3">{s.hint}</p>}
                      <div className={s.hint ? "" : "mt-3"}>
                        {s.category === "region" && (
                          <BulkPicker
                            options={byCategory[s.category] ?? []}
                            selected={wants[s.key] ?? []}
                            onBulk={(codes, on) => setMany(wants, setWants, s.key, codes, on)}
                          />
                        )}
                        <Chips
                          options={byCategory[s.category] ?? []}
                          selected={wants[s.key] ?? []}
                          onToggle={(code) => toggle(wants, setWants, s.key, code)}
                        />
                      </div>
                      {isRequired && (
                        <p className="mt-3 text-[11px] text-amber-700">
                          この条件に当てはまらない人は候補に出ません。絞りすぎると候補がいなくなります。
                        </p>
                      )}
                      {s.key === "purposes" && (wants.purposes ?? []).includes("propose") && (
                        <p className="mt-3 text-[11px] text-amber-700 leading-relaxed">
                          ※「商品・サービスを提案したい」を選ぶと、申請したときに
                          <b>営業・提案の目的であることが相手に先に伝わります</b>。
                          目的を伝えたうえで相手に選んでもらう仕組みです。
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-1">探している相手についての自由記述</h2>
                  <p className="text-[11px] text-gray-400 mb-3">
                    どんな人を探しているか、選択肢で表せないことがあれば書いてください。相手には見えません。
                  </p>
                  <textarea
                    value={wantsNote}
                    onChange={(e) => setWantsNote(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 保存はいつでも押せるよう下に固定（項目が多く、上まで戻るのが手間なので） */}
      {!loading && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              保存する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
