"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Palette,
  Pencil,
  Eye,
  Upload,
  Camera,
} from "lucide-react";

// テーマカラープリセット（シック〜カラフルまで幅広く）
const themeColors = [
  { name: "ネイビー", primary: "#2a2a3e" },
  { name: "ロイヤルブルー", primary: "#2b4a8c" },
  { name: "スカイ", primary: "#2e7d9c" },
  { name: "ティール", primary: "#1a6b6b" },
  { name: "フォレスト", primary: "#2a6b45" },
  { name: "オリーブ", primary: "#5c6b2a" },
  { name: "マスタード", primary: "#b08b1a" },
  { name: "テラコッタ", primary: "#a0522d" },
  { name: "コーラル", primary: "#c45c4a" },
  { name: "ローズ", primary: "#b83560" },
  { name: "ボルドー", primary: "#7a2040" },
  { name: "ラベンダー", primary: "#6a5acd" },
  { name: "プラム", primary: "#6b2d6b" },
  { name: "モカ", primary: "#5c3d1e" },
  { name: "スレート", primary: "#4a4a4a" },
  { name: "チャコール", primary: "#2d2d2d" },
];

interface ProfileData {
  memberNumber: string;
  nameKanji: string;
  nameFurigana: string;
  nickname: string;
  job: string;
  industry: string;
  location: string;
  hobbies: string;
  myHistory: string;
  tetsujinBenefit: string;
  hitokoto: string;
  lineUrl: string;
  instagramUrl: string;
  photoUrl: string;
}

// 登録フォームから引っ張ってくるモックデータ
const initialData: ProfileData = {
  memberNumber: "001",
  nameKanji: "田中 一郎",
  nameFurigana: "たなか いちろう",
  nickname: "いっちー、たなかさん",
  job: "経営コンサルタント\n（組織変革・事業再建）",
  industry: "コンサル",
  location: "大阪市、東京",
  hobbies: "サウナ\n築地の朝市巡り\nワイン",
  myHistory:
    "新卒で入った会社が倒産寸前で、再建プロジェクトに飛び込んだのが原点。30歳の時、クライアント企業の再建に成功して独立を決意。今は中小企業の組織変革を支援しています。人の可能性を最後まで信じることがモットーです。",
  tetsujinBenefit:
    "組織診断・経営相談の初回無料\n（TETSUJIN会メンバー限定）",
  hitokoto:
    "●人の可能性を信じ抜く。\n●約束を守ること。小さな信頼の積み重ね。\n●現場に足を運ぶこと。",
  lineUrl: "",
  instagramUrl: "",
  photoUrl:
    "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
};

export default function ProfileSheetPage() {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [data, setData] = useState<ProfileData>(initialData);
  const [themeIndex, setThemeIndex] = useState(0);
  const [customColor, setCustomColor] = useState("#2a2a3e");
  const [huePosition, setHuePosition] = useState(0);
  const [useCustom, setUseCustom] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // 外側クリックでカラーピッカーを閉じる
  useEffect(() => {
    if (!showColorPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [showColorPicker]);

  const theme = useCustom
    ? { name: "カスタム", primary: customColor }
    : themeColors[themeIndex];

  // HSL→HEX変換（S=60%, L=25%で白文字が映える濃色）
  const hueToHex = useCallback((hue: number) => {
    const h = hue / 360;
    const s = 0.6;
    const l = 0.25;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }, []);

  // バーのクリック/ドラッグで色選択
  const pickColorFromBar = useCallback(
    (clientX: number) => {
      if (!hueBarRef.current) return;
      const rect = hueBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHuePosition(x);
      setCustomColor(hueToHex(Math.round(x * 360)));
      setUseCustom(true);
    },
    [hueToHex]
  );

  const update = (key: keyof ProfileData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportJpeg = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `TETSUJIN_${data.nameKanji.replace(/\s/g, "")}.jpeg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch {
      alert("画像の書き出しに失敗しました。もう一度お試しください。");
    }
  };

  // 名前をルビ表示用に分割
  const kanjiParts = data.nameKanji.split(/[\s　]+/);
  const furiganaParts = data.nameFurigana.split(/[\s　]+/);

  const inputClass =
    "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all";
  const textareaClass =
    "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none";

  // 左カラム用ヘッダー（白文字 + 白の薄い下線、左右余白あり）
  const BarHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-5">
      <div className="pb-1.5 border-b-2 border-white/30 text-lg font-extrabold tracking-widest text-white">
        {children}
      </div>
    </div>
  );

  // 右カラム用ヘッダー（テキスト + 下線、左右に余白）
  const LineHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-5">
      <div
        className="pb-1.5 border-b-[3px] text-lg font-extrabold tracking-wider"
        style={{ color: theme.primary, borderColor: theme.primary }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/app/mypage"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                プロフィールシート
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* テーマカラー */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-base text-gray-600 hover:border-gray-300 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <Palette className="w-4 h-4" />
                </button>
                {showColorPicker && (
                  <div ref={colorPickerRef} className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-56 z-20">
                    <p className="text-xs font-bold text-gray-500 mb-2">
                      プリセット
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {themeColors.map((c, i) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            setThemeIndex(i);
                            setUseCustom(false);
                          }}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            !useCustom && themeIndex === i
                              ? "border-gray-900 scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.primary }}
                          title={c.name}
                        />
                      ))}
                    </div>

                    {/* カスタムカラー: ドラッグ対応色相バー + HEX入力 */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 mb-2">
                        カスタムカラー
                      </p>
                      {/* 色相バー（クリック＆ドラッグ対応） */}
                      <div
                        ref={hueBarRef}
                        className="h-7 rounded-lg cursor-pointer relative select-none"
                        style={{
                          background:
                            "linear-gradient(to right, hsl(0,60%,25%), hsl(30,60%,25%), hsl(60,60%,25%), hsl(90,60%,25%), hsl(120,60%,25%), hsl(150,60%,25%), hsl(180,60%,25%), hsl(210,60%,25%), hsl(240,60%,25%), hsl(270,60%,25%), hsl(300,60%,25%), hsl(330,60%,25%), hsl(360,60%,25%))",
                        }}
                        onMouseDown={(e) => {
                          pickColorFromBar(e.clientX);
                          const onMove = (ev: MouseEvent) => pickColorFromBar(ev.clientX);
                          const onUp = () => {
                            window.removeEventListener("mousemove", onMove);
                            window.removeEventListener("mouseup", onUp);
                          };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        onTouchStart={(e) => {
                          pickColorFromBar(e.touches[0].clientX);
                          const onMove = (ev: TouchEvent) => pickColorFromBar(ev.touches[0].clientX);
                          const onEnd = () => {
                            window.removeEventListener("touchmove", onMove);
                            window.removeEventListener("touchend", onEnd);
                          };
                          window.addEventListener("touchmove", onMove);
                          window.addEventListener("touchend", onEnd);
                        }}
                      >
                        {/* インジケーター */}
                        {useCustom && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-7 rounded border-2 border-white shadow-md pointer-events-none"
                            style={{
                              left: `${huePosition * 100}%`,
                              backgroundColor: customColor,
                            }}
                          />
                        )}
                      </div>
                      {/* HEX入力 + プレビュー */}
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-200 shrink-0"
                          style={{ backgroundColor: useCustom ? customColor : theme.primary }}
                        />
                        <input
                          type="text"
                          value={useCustom ? customColor : theme.primary}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                              setCustomColor(v);
                              setUseCustom(true);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                          placeholder="#2a2a3e"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 編集/プレビュー切替 */}
              <button
                onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
              >
                {mode === "edit" ? (
                  <>
                    <Eye className="w-4 h-4" /> プレビュー
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" /> 編集
                  </>
                )}
              </button>

              {/* JPEG出力 */}
              <button
                onClick={handleExportJpeg}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                画像保存
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_595px] gap-8">
          {/* 編集フォーム */}
          {mode === "edit" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  基本情報
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      会員番号
                    </label>
                    <input
                      type="text"
                      value={data.memberNumber}
                      onChange={(e) => update("memberNumber", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      名前（漢字）
                    </label>
                    <input
                      type="text"
                      value={data.nameKanji}
                      onChange={(e) => update("nameKanji", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      名前（ふりがな）
                    </label>
                    <input
                      type="text"
                      value={data.nameFurigana}
                      onChange={(e) => update("nameFurigana", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      読んでもらいたい名前
                    </label>
                    <input
                      type="text"
                      value={data.nickname}
                      onChange={(e) => update("nickname", e.target.value)}
                      className={inputClass}
                      placeholder="ニックネーム、呼び名"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      写真
                    </label>
                    <div className="flex items-center gap-3">
                      {data.photoUrl && (
                        <img
                          src={data.photoUrl}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-base text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
                        <Camera className="w-4 h-4" />
                        写真を変更
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                update("photoUrl", ev.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  プロフィール
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      職業
                    </label>
                    <textarea
                      rows={2}
                      value={data.job}
                      onChange={(e) => update("job", e.target.value)}
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      業種
                    </label>
                    <input
                      type="text"
                      value={data.industry}
                      onChange={(e) => update("industry", e.target.value)}
                      className={inputClass}
                      placeholder="IT・テック、飲食、不動産..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      居住地
                    </label>
                    <input
                      type="text"
                      value={data.location}
                      onChange={(e) => update("location", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      趣味
                    </label>
                    <textarea
                      rows={2}
                      value={data.hobbies}
                      onChange={(e) => update("hobbies", e.target.value)}
                      className={textareaClass}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  自己紹介
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      MY生歴
                    </label>
                    <textarea
                      rows={5}
                      value={data.myHistory}
                      onChange={(e) => update("myHistory", e.target.value)}
                      className={textareaClass}
                      placeholder="こんな人間でこんな生き方してきて、今こんなことしてます。"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      TETSUJIN特典
                    </label>
                    <textarea
                      rows={3}
                      value={data.tetsujinBenefit}
                      onChange={(e) => update("tetsujinBenefit", e.target.value)}
                      className={textareaClass}
                      placeholder="メンバーにだけの特典をアピール！"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      一言
                    </label>
                    <textarea
                      rows={3}
                      value={data.hitokoto}
                      onChange={(e) => update("hitokoto", e.target.value)}
                      className={textareaClass}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  SNSリンク
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      LINEのURL（任意）
                    </label>
                    <input
                      type="url"
                      value={data.lineUrl}
                      onChange={(e) => update("lineUrl", e.target.value)}
                      className={inputClass}
                      placeholder="https://line.me/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      InstagramのURL（任意）
                    </label>
                    <input
                      type="url"
                      value={data.instagramUrl}
                      onChange={(e) => update("instagramUrl", e.target.value)}
                      className={inputClass}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== プレビューカード（A4サイズ 595×842px @72dpi） ===== */}
          <div
            className={
              mode === "edit" ? "" : "col-span-full flex justify-center"
            }
          >
            <div
              ref={cardRef}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col"
              style={{ width: 595, height: 842 }}
            >
              {/* メインコンテンツ: 左右2カラム */}
              <div className="flex flex-1 min-h-0">
                {/* ===== 左カラム ===== */}
                <div className="w-[42%] flex flex-col justify-between">
                  {/* 上部ゾーン: ヘッダー + 写真 + 名前（薄いテーマカラー背景） */}
                  <div
                    className="flex flex-col"
                    style={{ backgroundColor: `${theme.primary}26` }}
                  >
                    {/* TETSUJIN NO.ヘッダー（左カラム内） */}
                    <div
                      className="px-4 py-2"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <span
                        className="text-white text-sm font-bold"
                        style={{ letterSpacing: "0.15em" }}
                      >
                        TETSUJIN　NO.{data.memberNumber}
                      </span>
                    </div>

                    <div className="px-4 pt-3 pb-3">
                    {/* 写真 */}
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

                    {/* ルビ付き名前 */}
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
                      {/* ニックネーム */}
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {data.nickname}
                      </p>
                    </div>
                  </div>
                  </div>

                  {/* 下部ゾーン: テーマカラー100%背景 + 白系文字 */}
                  <div
                    className="flex-1 flex flex-col justify-between py-2"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {/* 職業 */}
                    <div className="flex-1">
                      <BarHeader>職業</BarHeader>
                      <div className="px-5 py-2 text-base text-white/80 leading-relaxed">
                        {data.job.split("\n").map((line, i) => (
                          <p key={i}>{line.startsWith("●") || line.startsWith("（") || line.startsWith("(") ? line : `●${line}`}</p>
                        ))}
                      </div>
                    </div>

                    {/* 居住地 */}
                    <div className="flex-1">
                      <BarHeader>居住地</BarHeader>
                      <p className="px-5 py-2 text-base text-white/80">
                        {data.location}
                      </p>
                    </div>

                    {/* 趣味 */}
                    <div className="flex-1">
                      <BarHeader>趣味</BarHeader>
                      <div className="px-5 py-2 text-base text-white/80 leading-relaxed">
                        {data.hobbies.split("\n").map((line, i) => (
                          <p key={i}>{line.startsWith("●") ? line : `●${line}`}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 左右の区切り線 */}
                <div className="w-px bg-gray-100" />

                {/* ===== 右カラム: 下線ヘッダー、3セクションが高さいっぱいに分散 ===== */}
                <div className="flex-1 flex flex-col justify-between py-3">
                  {/* MY生歴 */}
                  <div className="flex-[2]">
                    <LineHeader>MY生歴</LineHeader>
                    <p className="px-5 py-3 text-base text-gray-600 whitespace-pre-wrap leading-[1.9]">
                      {data.myHistory}
                    </p>
                  </div>

                  {/* TETSUJIN特典 */}
                  <div className="flex-1">
                    <LineHeader>TETSUJIN特典</LineHeader>
                    <p className="px-5 py-3 text-base text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {data.tetsujinBenefit}
                    </p>
                  </div>

                  {/* 一言 */}
                  <div className="flex-1">
                    <LineHeader>一言</LineHeader>
                    <p className="px-5 py-3 text-base text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {data.hitokoto}
                    </p>
                  </div>
                </div>
              </div>

              {/* SNSリンク（あれば表示） */}
              {(data.lineUrl || data.instagramUrl) && (
                <div className="px-5 pb-3 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-2 mx-5">
                  {data.lineUrl && <span>LINE: {data.lineUrl}</span>}
                  {data.instagramUrl && (
                    <span>Instagram: {data.instagramUrl}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
