"use client";

import { useState } from "react";
import { PageHeader } from "@/components/marketing/page-header";
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

●個人事業主　　1,650円/月×12か月
　　　　　　　　合計　19,800円

●法人経営者　　2,500円/月×12か月
　　　　　　　　合計　30,000円

のお支払いとなります。お支払い頂いた日が契約日となります。契約日から１年間有効です。入会金・月額は人数やコミュニティ内のサービス向上に伴い、変更していきます。

※更新時は、その時の料金×0.83を基準に調整、算出させていただきます。

（４）解約
事業間取引となるため、クーリングオフはございません。途中解約したくなった場合、いづれの月であっても返金はされません。その上での解約希望がございましたら、運営陣までお知らせいただくと、運営側から解約の手続きを取らせて頂きます。

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
  const [paymentMethod, setPaymentMethod] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAgreed) {
      alert("規約および概要書面をご確認・同意の上、お申し込みください。");
      return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      <PageHeader title="新規会員登録" breadcrumb="新規会員登録" />

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
                仮申し込みが完了しました
              </h2>
              <p className="text-gray-500 mb-2">
                お申し込みありがとうございます。
              </p>
              <p className="text-gray-500 mb-6">
                運営にて確認後、承認させていただきます。
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-left max-w-md mx-auto">
                <p className="text-sm font-bold text-amber-800 mb-2">お支払いについて</p>
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
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--tetsu-warm)] rounded-2xl p-8 sm:p-10 border border-gray-100">
              {/* 理念 */}
              <div className="text-center mb-10">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                  TETSUJIN会の理念
                </p>
                <p
                  className="text-lg font-bold text-gray-900"
                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                >
                  繋がりを通じて、誠実と信頼を基盤に自己実現を叶える
                </p>
              </div>

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
                  <select required className={selectClass} defaultValue="">
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
                    required
                    className={inputClass}
                    placeholder="example@email.com"
                  />
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
                    required
                    className={inputClass}
                    placeholder="経営コンサルタント"
                  />
                </div>

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
                  <select required className={selectClass} defaultValue="">
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
                      <p className="text-sm text-gray-600">
                        {memberType === "個人"
                          ? "1,650円/月 × 12か月 = ¥19,800（年額）"
                          : "2,500円/月 × 12か月 = ¥30,000（年額）"}
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
                        {memberType === "個人" ? "¥19,800" : "¥30,000"}
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
                  <button
                    type="submit"
                    disabled={!termsAgreed || !memberType || !paymentMethod}
                    className="inline-flex items-center gap-2 px-10 py-4 bg-[var(--tetsu-pink)] text-white rounded-full text-base font-bold hover:bg-[var(--tetsu-pink-light)] transition-all shadow-lg shadow-pink-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--tetsu-pink)]"
                  >
                    仮申し込みをする
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
