// プロフィールシートのデータ供給（mock）
// - 各メンバーのシート項目を「プロフィール由来の基本値 ＜ サンプル拡充 ＜ 本人の保存値」で合成
// - 本人（マイページ）の編集は localStorage に永続化し、閲覧ページがそれを読む
"use client";

import { useEffect, useState } from "react";
import { getMemberProfile, MemberProfile } from "./dashboard-data";
import type { ProfileSheetData } from "@/components/app/profile-sheet-card";

// メンバーごとのテーマ色（本人が未設定のときの既定。id から決定）
const SHEET_PALETTE = [
  "#2a2a3e",
  "#2b4a8c",
  "#1a6b6b",
  "#a0522d",
  "#b83560",
  "#6b2d6b",
  "#5c3d1e",
  "#2a6b45",
];

const STORAGE_PREFIX = "tetsujin-profile-sheet-";
const EVENT_NAME = "tetsujin-sheet-update";

interface StoredSheet {
  data: ProfileSheetData;
  themeColor: string;
}

// メンバーごとのシート用サンプル（mock 拡充）。他人の閲覧シートをリッチに見せるための補完。
// プロフィールに無い項目（ふりがな/ニックネーム/居住地/趣味/特典/会員番号）を中心に。
const SHEET_SAMPLES: Record<string, Partial<ProfileSheetData>> = {
  "1": {
    memberNumber: "001",
    nameFurigana: "たなか いちろう",
    nickname: "いっちー、たなかさん",
    job: "経営コンサルタント\n（組織変革・事業再建）",
    location: "大阪市、東京",
    hobbies: "サウナ\n築地の朝市巡り\nワイン",
    myHistory:
      "新卒で入った会社が倒産寸前で、再建プロジェクトに飛び込んだのが原点。30歳の時、クライアント企業の再建に成功して独立を決意。今は中小企業の組織変革を支援しています。人の可能性を最後まで信じることがモットーです。",
    tetsujinBenefit: "組織診断・経営相談の初回無料（TETSUJIN会メンバー限定）",
    hitokoto:
      "●人の可能性を信じ抜く。\n●約束を守ること。小さな信頼の積み重ね。\n●現場に足を運ぶこと。",
  },
  "2": {
    memberNumber: "002",
    nameFurigana: "さとう ゆうき",
    nickname: "ゆうきくん",
    location: "大阪市・リモート",
    hobbies: "ガジェット集め\nボードゲーム\nランニング",
    tetsujinBenefit: "業務効率化ツールの導入相談を無料サポート",
  },
  "3": {
    memberNumber: "003",
    nameFurigana: "やまもと えみ",
    nickname: "えみさん",
    location: "大阪市北区",
    hobbies: "食べ歩き\n器集め\n旅行",
    tetsujinBenefit: "お店の貸切・個室を会員価格でご案内",
  },
  "4": {
    memberNumber: "004",
    nameFurigana: "すずき けんじ",
    nickname: "けんちゃん",
    location: "大阪市・神戸",
    hobbies: "ゴルフ\n建築巡り\nキャンプ",
    tetsujinBenefit: "不動産・オフィス移転のご相談を初回無料",
  },
  "5": {
    memberNumber: "005",
    nameFurigana: "なかむら あきこ",
    nickname: "あきこ先生",
    location: "大阪市中央区",
    hobbies: "ヨガ\n自然食\n読書",
    tetsujinBenefit: "健康経営セミナーを会員限定で開催",
  },
  "6": {
    memberNumber: "006",
    nameFurigana: "わたなべ たけし",
    nickname: "たけしさん",
    location: "大阪市・京都",
    hobbies: "登山\n日本酒\n投資勉強会",
    tetsujinBenefit: "財務・資産運用の個別相談を初回無料",
  },
  "7": {
    memberNumber: "007",
    nameFurigana: "おがわ りさ",
    nickname: "りさ",
    location: "大阪市西区",
    hobbies: "アート鑑賞\nカフェ巡り\nDIY",
    tetsujinBenefit: "ロゴ・名刺デザインの初回ラフを無料作成",
  },
  "8": {
    memberNumber: "008",
    nameFurigana: "もりた しゅん",
    nickname: "しゅんさん",
    location: "大阪市・全国出張",
    hobbies: "ワイン\nフットサル\nBBQ",
    tetsujinBenefit: "採用・人材紹介のご相談を会員価格で",
  },
  "9": {
    memberNumber: "009",
    nameFurigana: "ふじた まい",
    nickname: "まいちゃん",
    location: "長野・大阪",
    hobbies: "ヨガ\n地方特産品探し\nアウトドア",
    tetsujinBenefit: "EC・物販の立ち上げ相談を初回無料",
  },
  "10": {
    memberNumber: "010",
    nameFurigana: "ほんだ こうじ",
    nickname: "こうじさん",
    location: "大阪市・各店舗",
    hobbies: "食べ歩き\n釣り\n日本酒",
    tetsujinBenefit: "系列店の個室・貸切を会員特典でご案内",
  },
};

// プロフィール由来の基本マッピング（あるものだけ。無い欄は空＝カード側で非表示）
export function baseSheetFromProfile(profile: MemberProfile): ProfileSheetData {
  const story = profile.profileStory;
  const myHistory = story?.origin
    ? [story.origin, story.turning, story.now].filter(Boolean).join("\n\n")
    : profile.headline ?? "";
  const hitokoto =
    story?.coreValues && story.coreValues.length > 0
      ? story.coreValues.map((v) => `●${v}`).join("\n")
      : story?.values ?? profile.headline ?? "";

  return {
    memberNumber: "",
    nameKanji: profile.name,
    nameFurigana: "",
    nickname: "",
    job: [profile.roleTitle, profile.jobTitle].filter(Boolean).join("\n"),
    location: "",
    hobbies: story?.passion ?? "",
    myHistory,
    tetsujinBenefit: "",
    hitokoto,
    lineUrl: "",
    instagramUrl: "",
    photoUrl: profile.photoUrl,
  };
}

export function defaultThemeColor(id: string): string {
  const n = Number(id);
  if (Number.isFinite(n)) return SHEET_PALETTE[n % SHEET_PALETTE.length];
  return SHEET_PALETTE[0];
}

function readStored(id: string): StoredSheet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && obj.data) return obj as StoredSheet;
    return null;
  } catch {
    return null;
  }
}

// 合成: 基本（プロフィール）＜ サンプル拡充 ＜ 本人保存値
function composeSheet(id: string): ProfileSheetData {
  const profile = getMemberProfile(id);
  const base = profile
    ? baseSheetFromProfile(profile)
    : ({
        memberNumber: "",
        nameKanji: "",
        nameFurigana: "",
        nickname: "",
        job: "",
        location: "",
        hobbies: "",
        myHistory: "",
        tetsujinBenefit: "",
        hitokoto: "",
        lineUrl: "",
        instagramUrl: "",
        photoUrl: "",
      } as ProfileSheetData);
  const sample = SHEET_SAMPLES[id] ?? {};
  const stored = readStored(id);
  return { ...base, ...sample, ...(stored?.data ?? {}) };
}

function composeTheme(id: string): string {
  const stored = readStored(id);
  return stored?.themeColor ?? defaultThemeColor(id);
}

// 保存（マイページの編集）
export function saveSheetData(
  id: string,
  data: ProfileSheetData,
  themeColor: string
) {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + id,
      JSON.stringify({ data, themeColor } satisfies StoredSheet)
    );
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

// SSR安全な購読フック。マウント前は基本＋サンプル、マウント後は保存値を反映
export function useSheetData(id: string): {
  data: ProfileSheetData;
  themeColor: string;
} {
  const [state, setState] = useState<{
    data: ProfileSheetData;
    themeColor: string;
  }>(() => ({ data: composeServerSafe(id), themeColor: defaultThemeColor(id) }));

  useEffect(() => {
    const load = () =>
      setState({ data: composeSheet(id), themeColor: composeTheme(id) });
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, [id]);

  return state;
}

// SSR/初期描画用（localStorage を見ない＝基本＋サンプル）
function composeServerSafe(id: string): ProfileSheetData {
  const profile = getMemberProfile(id);
  const base = profile
    ? baseSheetFromProfile(profile)
    : composeSheet(id); // profile 無いケースはそのまま
  const sample = SHEET_SAMPLES[id] ?? {};
  return { ...base, ...sample };
}

// 編集ページ用：保存値（あれば）を初期ロード
export function loadOwnSheet(id: string): {
  data: ProfileSheetData;
  themeColor: string;
} {
  return { data: composeSheet(id), themeColor: composeTheme(id) };
}

// 本人が一度でも保存済みか（編集ページの初期テーマ反映の判定に使う）
export function hasOwnSheet(id: string): boolean {
  return readStored(id) !== null;
}
