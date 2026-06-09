"use client";

// プロフィールシート（A4カード 595×842px）の描画専用コンポーネント。
// オーナーの編集ページ（/app/mypage/profile-sheet）と
// 他メンバーの閲覧ページ（/app/profile/[id]）で共有する。
// - 値が空のセクションは非表示（メンバーごとに埋まっている項目だけ出す）
// - SNSフッターは snsLinks がある時だけ（閲覧側は空にして下に開示申請UIを置く）

import { Upload } from "lucide-react";
import { SocialPlatform, SOCIAL_PLATFORM_META } from "@/lib/social-links";

// 名刺カードに載せるSNS（自由に追加/削除）
export interface SheetSnsLink {
  id: string;
  platform: SocialPlatform;
  label?: string; // platform="other" のときのラベル
  url: string;
}

export interface ProfileSheetData {
  memberNumber: string;
  nameKanji: string;
  nameFurigana: string;
  nickname: string;
  job: string;
  location: string;
  hobbies: string;
  myHistory: string;
  tetsujinBenefit: string;
  hitokoto: string;
  snsLinks: SheetSnsLink[];
  photoUrl: string;
}

// SNSリンクの表示ラベル
export function snsLabel(link: SheetSnsLink): string {
  if (link.platform === "other") return link.label?.trim() || "リンク";
  return SOCIAL_PLATFORM_META[link.platform].label;
}

const has = (v: string | undefined) => !!v && v.trim().length > 0;

interface Props {
  data: ProfileSheetData;
  primaryColor: string;
  scale?: number;
  // オーナーの JPEG 書き出し用に内側カード div の ref を受け取る
  cardRef?: React.Ref<HTMLDivElement>;
}

export function ProfileSheetCard({ data, primaryColor, scale = 1, cardRef }: Props) {
  const kanjiParts = data.nameKanji.split(/[\s　]+/).filter(Boolean);
  const furiganaParts = data.nameFurigana.split(/[\s　]+/);

  const BarHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-5">
      <div className="pb-1.5 border-b-2 border-white/30 text-lg font-extrabold tracking-widest text-white">
        {children}
      </div>
    </div>
  );

  const LineHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-5">
      <div
        className="pb-1.5 border-b-[3px] text-lg font-extrabold tracking-wider"
        style={{ color: primaryColor, borderColor: primaryColor }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: 595 * scale,
        height: 842 * scale,
        overflow: "hidden",
      }}
    >
      <div
        ref={cardRef}
        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col"
        style={{
          width: 595,
          height: 842,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* メインコンテンツ: 左右2カラム */}
        <div className="flex flex-1 min-h-0">
          {/* ===== 左カラム ===== */}
          <div className="w-[42%] flex flex-col justify-between">
            {/* 上部: ヘッダー + 写真 + 名前 */}
            <div className="flex flex-col" style={{ backgroundColor: `${primaryColor}26` }}>
              <div className="px-4 py-2" style={{ backgroundColor: primaryColor }}>
                <span className="text-white text-sm font-bold" style={{ letterSpacing: "0.15em" }}>
                  TETSUJIN{has(data.memberNumber) ? `　NO.${data.memberNumber}` : ""}
                </span>
              </div>

              <div className="px-4 pt-3 pb-3">
                {data.photoUrl ? (
                  <img
                    src={data.photoUrl}
                    alt={data.nameKanji}
                    className="w-[75%] aspect-[5/6] object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-[75%] aspect-[5/6] bg-gray-200 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-gray-400" />
                  </div>
                )}

                <div className="mt-3">
                  <p
                    className="text-3xl font-extrabold text-gray-900 leading-tight"
                    style={{ fontFamily: "'Noto Serif JP', serif" }}
                  >
                    {kanjiParts.map((kanji, i) => (
                      <span key={i} className={i > 0 ? "ml-2" : ""}>
                        <ruby>
                          {kanji}
                          <rp>(</rp>
                          <rt className="text-[11px] font-normal text-gray-400">
                            {furiganaParts[i] || ""}
                          </rt>
                          <rp>)</rp>
                        </ruby>
                      </span>
                    ))}
                  </p>
                  {has(data.nickname) && (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{data.nickname}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 下部: テーマカラー背景 */}
            <div
              className="flex-1 flex flex-col justify-between py-2"
              style={{ backgroundColor: primaryColor }}
            >
              {has(data.job) && (
                <div className="flex-1">
                  <BarHeader>職業</BarHeader>
                  <div className="px-5 py-2 text-base text-white/80 leading-relaxed">
                    {data.job.split("\n").map((line, i) => (
                      <p key={i}>
                        {line.startsWith("●") || line.startsWith("（") || line.startsWith("(")
                          ? line
                          : `●${line}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {has(data.location) && (
                <div className="flex-1">
                  <BarHeader>居住地</BarHeader>
                  <p className="px-5 py-2 text-base text-white/80">{data.location}</p>
                </div>
              )}

              {has(data.hobbies) && (
                <div className="flex-1">
                  <BarHeader>趣味</BarHeader>
                  <div className="px-5 py-2 text-base text-white/80 leading-relaxed">
                    {data.hobbies.split("\n").map((line, i) => (
                      <p key={i}>{line.startsWith("●") ? line : `●${line}`}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 区切り線 */}
          <div className="w-px bg-gray-100" />

          {/* ===== 右カラム ===== */}
          <div className="flex-1 flex flex-col justify-between py-3">
            {has(data.myHistory) && (
              <div className="flex-[2]">
                <LineHeader>MY生歴</LineHeader>
                <p className="px-5 py-3 text-base text-gray-600 whitespace-pre-wrap leading-[1.9]">
                  {data.myHistory}
                </p>
              </div>
            )}

            {has(data.tetsujinBenefit) && (
              <div className="flex-1">
                <LineHeader>TETSUJIN特典</LineHeader>
                <p className="px-5 py-3 text-base text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {data.tetsujinBenefit}
                </p>
              </div>
            )}

            {has(data.hitokoto) && (
              <div className="flex-1">
                <LineHeader>一言</LineHeader>
                <p className="px-5 py-3 text-base text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {data.hitokoto}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SNSリンク（owner の名刺出力用。閲覧側は空にして下に開示申請UIを置く） */}
        {data.snsLinks.filter((l) => has(l.url)).length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 border-t border-gray-100 pt-2 mx-5">
            {data.snsLinks
              .filter((l) => has(l.url))
              .map((l) => (
                <span key={l.id}>
                  {snsLabel(l)}: {l.url}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
