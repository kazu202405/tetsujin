"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/marketing/page-header";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

const genderOptions = ["女", "男", "その他"];

const ageOptions = [
  "２０代前半", "２０代後半", "３０代前半", "３０代後半",
  "４０代前半", "４０代後半", "５０代前半", "５０代後半",
  "６０代前半", "６０代後半", "７０代", "８０代",
];

const monthOptions = [
  "１月", "２月", "３月", "４月", "５月", "６月",
  "７月", "８月", "９月", "１０月", "１１月", "１２月",
];

const termsText = `１．事業社名
　　異業種TETSUJIN会
　　代表者　川原志保

２．目的
会員メンバーさんが人脈を広げる・経済的にも自立できる（事業が発展できる）・自己成長できる・知見を広げる機会を提供いたします。結果を保証するものではありません。「繋がりを通じて、誠実と信頼を基盤に自己実現を叶える」を理念にしているビジネスコミュニティーである。

３．コミュニティ内容及び料金

（１）会員登録
事業をされている方・これからしようとしている方がご登録できます。法人・個人は問いません。ただし、特定の宗教・ネットワークビジネスの勧誘目的はご入会できません。年齢制限は設けておりません。

（２）活動内容

【交流会】
オンラインZOOM交流会は月に４回程度
オフライン交流会は月に15回以上あり、通常交流会・月１飲み会はTETSUJIN会運営陣が主催をします。また、会員メンバーさんが主催する各部の部活動交流会があります。

【ディスコード】
アプリを使用して、24時間365日メンバーさんと繋がれます。ここで、イベント＆事業の告知、紹介＆依頼、つぶやきなど多種多様なコーナーがあり、自分のスタイルに合わせて活用ができます。

（３）料金（1年契約となります）

●年会費　　　　33,000円（1年分）

のお支払いとなります。月々のお支払いをご希望の場合は、月額3,000円をお選びいただけます。

お支払い頂いた日が契約日となります。契約日から１年間有効です。入会金・会費は人数やコミュニティ内のサービス向上に伴い、変更していきます。

※既にご入会いただいている方の会費は、従来の金額を継続いたします。

※更新時は、その時の料金×0.83を基準に調整、算出させていただきます。

（４）解約
事業間取引となるため、クーリングオフはございません。途中解約したくなった場合、いづれの月であっても返金はされません。その上での解約をご希望の場合は、メンバーページの設定画面からお手続きいただくか、運営陣までお知らせください。

４．免責事項
運営陣が以下に該当する方と判断したとき、強制退会を命じます。

・他の会員メンバーさんに対する人権侵害・ハラスメント行為をしている。
・宗教やネットワークビジネス等の執拗な勧誘をしている。
・コミュニティ内の秩序を乱している。

５．規約変更
TETSUJIN会は必要に応じ、事前に会員の同意を得ることなく、本規約を改定することができるものとし、会員は改定後の規約に従うものとします。

６．相談窓口
会員活動に関するお悩みやお問い合わせがございましたら下記または、運営陣まで一報をお願いいたします。

　Mail:　tetsujin.community@gmail.com`;

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [memberType, setMemberType] = useState<"個人" | "法人" | "">("");
  const [gender, setGender] = useState("");
  const [genderOther, setGenderOther] = useState("");

  // つながりの設定（立場・業種・地域）。
  // 既存441名でいちばん欠けているのがこの3つなので、新規はここで必ず埋める。
  // 趣味・興味・つながりたい目的はフォームに置かない（長いほど申込みが落ちる）。
  const [matchOptions, setMatchOptions] = useState<
    { category: string; code: string; label: string }[]
  >([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/matching-options")
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((body) => {
        if (body) setMatchOptions(body.options);
      })
      .catch(() => {
        /* 取れなくても申込みは通せる（選択肢が出ないだけ） */
      });
  }, []);

  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    code: string,
  ) => set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  const [paymentMethod, setPaymentMethod] = useState("");

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // 入力内容を運営へ送る（以前は画面を切り替えるだけで、どこにも届いていなかった）
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!termsAgreed) {
      setSendError("規約および概要書面をご確認・同意の上、お申し込みください。");
      return;
    }

    const form = new FormData(e.currentTarget);
    setSending(true);
    setSendError(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          gender: gender === "その他" ? genderOther || "その他" : gender,
          ageRange: form.get("ageRange"),
          email: form.get("email"),
          phone: form.get("phone"),
          job: form.get("job"),
          referrer: form.get("referrer"),
          startMonth: form.get("startMonth"),
          membershipType: memberType,
          paymentMethod,
          positions,
          industries,
          regions,
          termsAgreed: true,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setSendError(body?.error || "送信できませんでした。時間をおいて再度お試しください。");
        setSending(false);
        return;
      }
    } catch {
      setSendError("送信できませんでした。通信環境をご確認ください。");
      setSending(false);
      return;
    }

    setSending(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ------------------------------------------------------------
  // ログイン済みの人がここに来る場合
  // ------------------------------------------------------------
  // アプリでアカウントだけ作った人は「ご登録内容を教えてください」から
  // ここへ送られる。その中には名簿にメールが無いだけの在籍会員も混ざる
  // （システムからは新規と区別がつかない）。
  //
  // 🔴 メールはアカウントのものに固定する。ここで別のメールを書かれると、
  //    承認しても auth_user_id が繋がらず、本人は永久に入れないまま
  //    「承認されたのに入れない」になる。突き合わせの鍵はメールしかない。
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setAccountEmail(data.user?.email ?? null);
      })
      .catch(() => {
        /* 取れなければ通常の申込フォームとして出す */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const RequiredBadge = () => (
    <span className="px-1.5 py-0.5 bg-[var(--tetsu-pink)] text-white text-xs rounded font-bold">
      必須
    </span>
  );

  const inputClass =
    "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent transition-all";

  const selectClass =
    "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tetsu-pink)] focus:border-transparent transition-all appearance-none cursor-pointer";

  return (
    <>
      <PageHeader
        title={accountEmail ? "ご登録内容の入力" : "新規会員登録"}
        breadcrumb={accountEmail ? "ご登録内容の入力" : "新規会員登録"}
      />

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
                {accountEmail ? "ご登録内容を受け付けました" : "仮申し込みが完了しました"}
              </h2>
              <p className="text-gray-500 mb-2">
                お申し込みありがとうございます。
              </p>
              <p className="text-gray-500 mb-6">
                運営にて確認後、承認させていただきます。
              </p>
              {/* 🔴 この経路には、名簿にメールが無いだけの在籍会員が混ざる。
                     そのまま「3日以内にお支払いを」と出すと、払い済みの人が
                     二重に払いかねない。∴ 先に断りを入れる。 */}
              {accountEmail && (
                <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-md mx-auto">
                  運営が名簿と照合します。すでに会員の方は、承認され次第そのまま
                  ご利用いただけるようになります（お支払いは不要です）。
                </p>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-left max-w-md mx-auto">
                <p className="text-sm font-bold text-amber-800 mb-2">
                  お支払いについて{accountEmail && "（はじめてご入会の方）"}
                </p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  本日を含め３日以内にお支払いをお願いいたします。
                </p>
                <div className="mt-4 space-y-3 text-sm text-amber-700">
                  <div>
                    <p className="font-bold">●銀行振込</p>
                    <p>PayPay銀行</p>
                    <p>ビジネス営業部支店（店番号005）</p>
                    <p>口座番号　8077578</p>
                    <p>異業種テツジン会　川原志保</p>
                  </div>
                  <div>
                    <p className="font-bold">●PayPay　支払い</p>
                    <p>ID：shiho75</p>
                  </div>
                  {/* カード決済は準備中（Stripeは2026年10月から稼働予定）。
                      書いておかないと「カードは使えないのか」と問い合わせになり、
                      使えるようになったことにも気づいてもらえない。 */}
                  <div className="pt-1 border-t border-amber-200">
                    <p className="font-bold">●クレジットカード決済</p>
                    <p>
                      ただいま準備中です。ご利用いただけるようになりましたら、
                      アプリ内でお知らせします。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 sm:p-10 border border-gray-100">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 名前 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      名前
                    </span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className={inputClass}
                    placeholder="山田 太郎"
                  />
                </div>

                {/* 性別 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      性別
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {genderOptions.map((g) => (
                      <label key={g} className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={gender === g}
                          onChange={(e) => setGender(e.target.value)}
                          required
                          className="w-4 h-4 text-[var(--tetsu-pink)] border-gray-300 focus:ring-[var(--tetsu-pink)]"
                        />
                        <span className="text-sm text-gray-700">{g}</span>
                      </label>
                    ))}
                  </div>
                  {gender === "その他" && (
                    <input
                      type="text"
                      className={`${inputClass} mt-2`}
                      placeholder="自由入力"
                      value={genderOther}
                      onChange={(e) => setGenderOther(e.target.value)}
                    />
                  )}
                </div>

                {/* 年代 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      年代
                    </span>
                  </label>
                  <select name="ageRange" required className={selectClass} defaultValue="">
                    <option value="" disabled>
                      選択してください
                    </option>
                    {ageOptions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      メールアドレス
                    </span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className={inputClass + (accountEmail ? " bg-gray-50 text-gray-500" : "")}
                    placeholder="example@email.com"
                    defaultValue={accountEmail ?? undefined}
                    readOnly={Boolean(accountEmail)}
                  />
                  {accountEmail && (
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      ログイン中のアカウントのメールアドレスです。
                      ここを変えると承認後もご利用いただけないため、変更できません。
                    </p>
                  )}
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      電話番号
                    </span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className={inputClass}
                    placeholder="090-1234-5678"
                  />
                </div>

                {/* 職業 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      職業
                    </span>
                  </label>
                  <input
                    type="text"
                    name="job"
                    required
                    className={inputClass}
                    placeholder="経営コンサルタント"
                  />
                </div>

                {/* つながりの設定（立場・業種・地域） */}
                {matchOptions.length > 0 && (
                  <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      あなたのことを教えてください
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      会員同士でつながる相手を探すときに使います。
                      <b>入れていない項目では見つけてもらえません。</b>
                      あとからマイページで変更できます。
                    </p>

                    {(
                      [
                        ["position", "立場・事業形態", positions, setPositions],
                        ["industry", "業種", industries, setIndustries],
                        ["region", "活動している地域", regions, setRegions],
                      ] as const
                    ).map(([category, title, list, set]) => (
                      <div key={category} className="mb-4 last:mb-0">
                        <p className="text-xs font-bold text-gray-700 mb-2">{title}</p>
                        <div className="flex flex-wrap gap-2">
                          {matchOptions
                            .filter((o) => o.category === category)
                            .map((o) => {
                              const on = list.includes(o.code);
                              return (
                                <button
                                  key={o.code}
                                  type="button"
                                  onClick={() => toggle([...list], set, o.code)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                    on
                                      ? "bg-gray-900 text-white border-gray-900"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                                  }`}
                                >
                                  {o.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 紹介者 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      紹介者
                    </span>
                  </label>
                  <input
                    type="text"
                    name="referrer"
                    required
                    className={inputClass}
                    placeholder="紹介してくれた方のお名前"
                  />
                </div>

                {/* 開始スタート月 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      開始スタート月
                    </span>
                  </label>
                  <select name="startMonth" required className={selectClass} defaultValue="">
                    <option value="" disabled>
                      選択してください
                    </option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 法人・個人 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      法人・個人枠どちらですか？
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["法人", "個人"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMemberType(type)}
                        className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          memberType === type
                            ? "border-[var(--tetsu-pink)] bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)]"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {memberType && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-bold text-gray-900 mb-1">
                        {memberType === "個人" ? "個人事業主" : "法人経営者"}
                      </p>
                      {/* 2026-08-26 料金改定：新規は立場によらず年33,000円。
                          法人／個人の選択は、料金ではなく会員情報として引き続き伺う。 */}
                      <p className="text-sm text-gray-600">
                        年会費 ¥33,000（1年分）
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        月々のお支払いをご希望の場合は月額3,000円をお選びいただけます。
                      </p>
                    </div>
                  )}
                </div>

                {/* 規約および概要書面 */}
                <div className="border-t border-gray-200 pt-8">
                  <button
                    type="button"
                    onClick={() => setTermsOpen(!termsOpen)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h3 className="text-base font-bold text-gray-900">
                      【規約および概要書面】
                    </h3>
                    {termsOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {termsOpen && (
                    <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6 max-h-80 overflow-y-auto">
                      <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
                        {termsText}
                      </pre>
                    </div>
                  )}

                  <label className="inline-flex items-start gap-3 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-[var(--tetsu-pink)] border-gray-300 rounded focus:ring-[var(--tetsu-pink)]"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">
                      この書面を受領し、「規約および概要書面」について全て確認しました。
                      <br />
                      <span className="text-xs text-gray-500">
                        お支払いは、本日を含め３日以内にお願いいたします。
                      </span>
                    </span>
                  </label>
                </div>

                {/* 支払方法 */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <RequiredBadge />
                      どちらに振り込みをされますか？
                    </span>
                  </label>

                  {/* 総支払金額 */}
                  {memberType && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        総支払金額
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        ¥33,000
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          （会費１年分）
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {["銀行振込", "PayPay"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          paymentMethod === method
                            ? "border-[var(--tetsu-pink)] bg-[var(--tetsu-pink-pale)] text-[var(--tetsu-pink)]"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "銀行振込" && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                      <p>PayPay銀行</p>
                      <p>ビジネス営業部支店（店番号005）</p>
                      <p>口座番号　8077578</p>
                      <p className="font-bold">異業種テツジン会　川原志保</p>
                    </div>
                  )}
                  {paymentMethod === "PayPay" && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                      <p>
                        PayPay ID：<span className="font-bold">shiho75</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* 送信ボタン */}
                <div className="text-center pt-6">
                  {sendError && (
                    <p className="mb-4 text-sm bg-red-50 text-red-700 rounded-xl px-4 py-3">
                      {sendError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!termsAgreed || !memberType || !paymentMethod || sending}
                    className="inline-flex items-center gap-2 px-10 py-4 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--tetsu-pink)]"
                  >
                    {sending ? "送信中..." : "仮申し込みをする"}
                  </button>
                  <p className="text-xs text-gray-400 mt-3">
                    ※ 運営にて確認後、承認されるとアカウントが有効になります
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
