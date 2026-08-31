"use client";

// ============================================================
// お願いごと（仕事の依頼板）＊本部だけに見えるモック
// ============================================================
// 依頼主決定（2026-08-20）：
//   ・まずは見た目のイメージだけ。本部だけが見える状態で反応を見る
//   ・依頼を出せるのは会員全員
//   ・報酬は目安を書く（幅で表示）
//   ・依頼をこなした数でランクが上がる
//
// 🔴 データはこのファイルの中に置いている（DBを作っていない）。
//    会員に出す形が決まる前にテーブルを作ると作り直しになるため。
//
// 🔴 テツジンは場を貸すだけ（依頼主決定）。
//    金額の取り決め・支払い・トラブルは当事者間。
//    報酬額を表示する以上、公開前に規約への追記が要る。
//
// ------------------------------------------------------------
// 見せ方の方針
// ------------------------------------------------------------
// 縦一列に並べると、上から順に読まないと何があるか分からない。
// ∴ 2列のカードにして、種類のアイコン・報酬・締切を
//    決まった位置に置く。目を同じ場所に動かすだけで比べられる。
//
// 🔴 色の意味は1つに絞る。
//    種類ごとに色を塗ると全部が主張して、結局どれも目立たない。
//    色は「全部に付ける」より「例外にだけ付ける」方が効く。
//      種類     … アイコンの形で表す（色は小さなタイルの中だけ）
//      急ぎ     … 赤。少数だから目立つ。「まだ間に合うか」は判断の入口
//      募集状況 … 完了を薄くする＋フィルタ。色は使わない
// ============================================================

import { useState } from "react";
import Link from "next/link";
import {
  Coins, Users, Clock, Plus, ShieldAlert, CheckCircle2, Search, X,
  Palette, PenLine, Package, UserSearch, Calculator, Sparkles, Flame,
  type LucideIcon,
} from "lucide-react";
import { useCurrentMember } from "@/lib/current-member";
import { isAdminRole } from "@/lib/member-roles";
import { MemberAvatar } from "@/components/app/member-avatar";
import { QuestCover } from "@/components/app/quest-cover";
import { RichText } from "@/components/app/rich-text";

// ------------------------------------------------------------
// 種類（アイコンと色）
// ------------------------------------------------------------
// 一覧を眺めたときに「何の依頼か」が読む前に分かるようにする。
const KINDS: Record<string, { label: string; Icon: LucideIcon; tile: string }> = {
  design:  { label: "デザイン", Icon: Palette,      tile: "bg-gray-100 text-gray-600" },
  writing: { label: "文章・発信", Icon: PenLine,    tile: "bg-gray-100 text-gray-600" },
  supply:  { label: "仕入れ・外注", Icon: Package,  tile: "bg-gray-100 text-gray-600" },
  hiring:  { label: "人・採用", Icon: UserSearch,   tile: "bg-gray-100 text-gray-600" },
  finance: { label: "お金・士業", Icon: Calculator, tile: "bg-gray-100 text-gray-600" },
};

// ------------------------------------------------------------
// ランク（依頼をこなした数）
// ------------------------------------------------------------
const RANKS = [
  { name: "見習い", min: 0, color: "bg-gray-100 text-gray-600", ring: "ring-gray-200" },
  { name: "駆け出し", min: 1, color: "bg-sky-100 text-sky-700", ring: "ring-sky-200" },
  { name: "一人前", min: 3, color: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
  { name: "ベテラン", min: 6, color: "bg-amber-100 text-amber-700", ring: "ring-amber-300" },
  { name: "マスター", min: 10, color: "bg-purple-100 text-purple-700", ring: "ring-purple-300" },
];
const rankOf = (n: number) => [...RANKS].reverse().find((r) => n >= r.min) ?? RANKS[0];
const nextRankOf = (n: number) => RANKS.find((r) => r.min > n) ?? null;

// ------------------------------------------------------------
// モックデータ
// ------------------------------------------------------------
type QuestStatus = "open" | "choosing" | "done";

interface Quest {
  id: string;
  kind: keyof typeof KINDS;
  title: string;
  body: string;
  owner: string;
  ownerJob: string;
  tags: string[];
  rewardFrom: number | null;
  rewardTo: number | null;
  applicants: number;
  deadline: string;
  urgent?: boolean;
  imageUrl?: string | null;
  status: QuestStatus;
  applied?: boolean;
}

const QUESTS: Quest[] = [
  {
    id: "q1", kind: "design",
    title: "新しい店舗のロゴを作ってほしい",
    body: "9月に2店舗目を出します。既存のロゴが古いので、看板と名刺に使える形で作り直したいです。方向性は一緒に考えてもらえると助かります。",
    owner: "田中 誠", ownerJob: "飲食店経営",
    tags: ["広告・デザイン", "大阪府"],
    rewardFrom: 50000, rewardTo: 100000,
    applicants: 3, deadline: "9月10日まで", imageUrl: "/quest-images/restaurant-logo.jpg", status: "open",
  },
  {
    id: "q2", kind: "writing",
    title: "ホームページの文章を見直してほしい",
    body: "自分で書いたまま3年が経っていて、今のサービス内容と合っていません。全体で10ページほどです。SEOまでは求めていません。",
    owner: "鈴木 一郎", ownerJob: "社会保険労務士",
    tags: ["マーケティング・SNS", "士業"],
    rewardFrom: 30000, rewardTo: 50000,
    applicants: 5, deadline: "8月31日まで", urgent: true, imageUrl: "/quest-images/website-copy.jpg", status: "choosing",
  },
  {
    id: "q3", kind: "supply",
    title: "値札シールの印刷をお願いできる方を探しています",
    body: "小ロット（500枚程度）で、耐水のものを探しています。継続的にお願いできる方だとありがたいです。",
    owner: "佐藤 美咲", ownerJob: "小売・EC",
    tags: ["メーカー・製造・卸", "小売・EC"],
    rewardFrom: null, rewardTo: null,
    applicants: 1, deadline: "急ぎません", imageUrl: "/quest-images/label-printing.jpg", status: "open",
  },
  {
    id: "q4", kind: "hiring",
    title: "採用面接に同席してもらえる方",
    body: "はじめて正社員を採ります。人を見る目に自信がないので、経験のある方に同席していただきたいです。1回2時間ほど、3回程度を想定しています。",
    owner: "山本 健太", ownerJob: "建築・住宅",
    tags: ["人材・採用", "兵庫県"],
    rewardFrom: 20000, rewardTo: 30000,
    applicants: 2, deadline: "9月5日まで", imageUrl: "/quest-images/hiring-interview.jpg", status: "open", applied: true,
  },
  {
    id: "q5", kind: "finance",
    title: "確定申告まわりの相談にのってほしい",
    body: "今年から法人化しました。何から手をつければいいか整理したいです。継続の顧問もご相談できれば。",
    owner: "中村 優子", ownerJob: "美容サロン経営",
    tags: ["士業", "京都府"],
    rewardFrom: 30000, rewardTo: null,
    applicants: 4, deadline: "完了", imageUrl: "/quest-images/accounting-tax.jpg", status: "done",
  },
  {
    id: "q6", kind: "design",
    title: "展示会で使うパネルのデザイン",
    body: "10月の展示会に出ます。A0サイズ3枚と、卓上のちいさいものを2枚お願いしたいです。写真と文章はこちらで用意します。",
    owner: "小林 大輔", ownerJob: "製造業",
    tags: ["広告・デザイン", "メーカー・製造・卸"],
    rewardFrom: 80000, rewardTo: 150000,
    applicants: 0, deadline: "9月20日まで", imageUrl: "/quest-images/exhibition-panels.jpg", status: "open",
  },
];

const MY_DONE_COUNT = 4;

// 募集状況は色で主張させない。完了カード全体を薄くする方が一覧では効く。
const STATUS_META: Record<QuestStatus, { label: string; className: string }> = {
  open: { label: "募集中", className: "bg-gray-900 text-white" },
  choosing: { label: "選定中", className: "bg-gray-100 text-gray-500" },
  done: { label: "完了", className: "bg-gray-100 text-gray-400" },
};

function reward(q: Quest) {
  if (q.rewardFrom == null) return { main: "相談", sub: "" };
  const f = (q.rewardFrom / 10000).toLocaleString();
  if (q.rewardTo == null) return { main: `${f}万円`, sub: "〜" };
  return { main: `${f}〜${(q.rewardTo / 10000).toLocaleString()}`, sub: "万円" };
}

export default function QuestsPage() {
  const currentMember = useCurrentMember();
  const [filter, setFilter] = useState<"all" | "open" | "applied">("all");
  const [detail, setDetail] = useState<Quest | null>(null);

  // 🔴 本部だけに見せる。会員にはまだ出さない。
  if (!isAdminRole(currentMember?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-gray-500">このページは準備中です。</p>
      </div>
    );
  }

  const rank = rankOf(MY_DONE_COUNT);
  const next = nextRankOf(MY_DONE_COUNT);
  const list = QUESTS.filter((q) =>
    filter === "open" ? q.status === "open" : filter === "applied" ? q.applied : true,
  );
  const openCount = QUESTS.filter((q) => q.status === "open").length;

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--tetsu-pink)]" />
            お願いごと
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            いま {openCount}件 募集中です
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <p className="flex items-start gap-2 mb-5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <b>これは本部だけに見えている見本です。</b>
            会員には表示されません。中身のデータもすべて仮のもので、実際の依頼ではありません。
          </span>
        </p>

        {/* 自分のランク */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-4 flex-shrink-0 ${rank.ring} ${rank.color}`}>
              <span className="text-lg font-bold">{MY_DONE_COUNT}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${rank.color}`}>
                  {rank.name}
                </span>
                <span className="text-xs text-gray-500">お引き受け {MY_DONE_COUNT}件</span>
              </div>
              {next ? (
                <>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full bg-[var(--tetsu-pink)] transition-all"
                      style={{ width: `${Math.min((MY_DONE_COUNT / next.min) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    あと{next.min - MY_DONE_COUNT}件で「{next.name}」になります
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-gray-400">最高ランクです</p>
              )}
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {([
            ["all", "すべて"],
            ["open", "募集中"],
            ["applied", "応募した"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                filter === key
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
          <button className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tetsu-pink)] text-white text-xs font-bold hover:opacity-90">
            <Plus className="w-3.5 h-3.5" />
            お願いごとを出す
          </button>
        </div>

        {/* 一覧：2列のカード。同じ位置に同じ情報が来るので見比べられる。 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((q) => {
            const kind = KINDS[q.kind];
            const r = reward(q);
            const dim = q.status === "done";
            return (
              <button
                key={q.id}
                onClick={() => setDetail(q)}
                className={`group relative text-left bg-white rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  dim ? "opacity-50 border border-gray-100" : ""
                } ${
                  // 🔴 色を使うのはここだけ。少数だから赤が効く。
                  !dim && q.urgent
                    ? "border-2 border-red-300 hover:border-red-400"
                    : "border border-gray-100 hover:border-gray-300"
                }`}
              >
                {/* 表紙。写真が無くても必ず絵が出るので一覧が揃う。 */}
                <div className="relative aspect-[320/130] w-full">
                  <QuestCover kind={q.kind} imageUrl={q.imageUrl} className="w-full h-full" />
                  <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur text-[10px] font-bold text-gray-700">
                    <kind.Icon className="w-3 h-3" />
                    {kind.label}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                        {q.title}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {!dim && q.urgent && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          <Flame className="w-3 h-3" />
                          急ぎ
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[q.status].className}`}
                      >
                        {STATUS_META[q.status].label}
                      </span>
                    </div>
                  </div>

                  {/* 報酬をいちばん大きく。金額が判断の起点になるため。 */}
                  <div className="flex items-baseline gap-1 mb-3">
                    <Coins className="w-4 h-4 text-amber-500 self-center" />
                    <span className="text-xl font-bold text-gray-900 leading-none">{r.main}</span>
                    <span className="text-xs text-gray-500">{r.sub}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {q.applicants}人
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${!dim && q.urgent ? "text-red-600 font-bold" : ""}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {q.deadline}
                    </span>
                    {q.applied && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold ml-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        応募済み
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <MemberAvatar name={q.owner} className="w-6 h-6 flex-shrink-0" />
                    <p className="text-[11px] text-gray-500 truncate">
                      {q.owner}・{q.ownerJob}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {list.length === 0 && (
          <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-8 text-center">
            <Search className="w-5 h-5 text-gray-300 mx-auto mb-2" />
            この条件のお願いごとはありません
          </p>
        )}

        <p className="mt-6 text-[11px] text-gray-400 leading-relaxed">
          報酬の金額・お支払い・進め方は、お願いした方と引き受けた方のあいだで直接お決めください。
          TETSUJIN会は場をご用意するだけで、取引そのものには関わりません。
        </p>
      </div>

      {/* 詳細 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="relative aspect-[320/110] w-full">
              <QuestCover kind={detail.kind} imageUrl={detail.imageUrl} className="w-full h-full" />
              <button
                onClick={() => setDetail(null)}
                className="absolute right-3 top-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute left-4 bottom-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur text-[10px] font-bold text-gray-700">
                {(() => {
                  const Icon = KINDS[detail.kind].Icon;
                  return <Icon className="w-3 h-3" />;
                })()}
                {KINDS[detail.kind].label}
              </span>
            </div>
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 leading-snug">{detail.title}</h2>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <MemberAvatar name={detail.owner} className="w-10 h-10" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{detail.owner}</p>
                  <p className="text-[11px] text-gray-500">{detail.ownerJob}</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                <RichText text={detail.body} />
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full bg-[var(--tetsu-warm)] text-[10px] text-gray-600"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <dl className="space-y-2 text-xs mb-5">
                <div className="flex justify-between gap-3 py-2 border-b border-gray-100">
                  <dt className="text-gray-500">報酬の目安</dt>
                  <dd className="font-bold text-gray-900">
                    {reward(detail).main}
                    {reward(detail).sub}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-2 border-b border-gray-100">
                  <dt className="text-gray-500">期限</dt>
                  <dd className={detail.urgent ? "text-red-600 font-bold" : "text-gray-700"}>
                    {detail.deadline}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-2 border-b border-gray-100">
                  <dt className="text-gray-500">応募</dt>
                  <dd className="text-gray-700">{detail.applicants}人</dd>
                </div>
              </dl>

              {detail.status === "open" && !detail.applied && (
                <>
                  <button className="w-full py-3 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90">
                    引き受けたいと伝える
                  </button>
                  <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                    お願いした方にお知らせが届きます。選ばれた場合のみ、その後のやりとりに進みます。
                  </p>
                </>
              )}
              {detail.applied && (
                <p className="text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl py-3 font-bold">
                  応募済みです。お返事をお待ちください。
                </p>
              )}
              {detail.status === "choosing" && !detail.applied && (
                <p className="text-center text-xs text-amber-700 bg-amber-50 rounded-xl py-3 font-bold">
                  選定中のため、新しい応募は受け付けていません。
                </p>
              )}
              {detail.status === "done" && (
                <p className="text-center text-xs text-gray-500 bg-gray-50 rounded-xl py-3 font-bold">
                  このお願いごとは完了しています。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pb-10">
        <Link href="/app/mypage" className="text-[11px] text-gray-400 hover:text-gray-700">
          ← マイページに戻る
        </Link>
      </div>
    </div>
  );
}
