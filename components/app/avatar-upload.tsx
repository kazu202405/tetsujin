// ============================================================
// プロフィール写真のアップロード
// ============================================================
// 画像はブラウザから直接 Storage（非公開バケット avatars）へ送る。
// Next.js のAPIを経由すると本文サイズ上限に当たるため。
// 置き場所は "<自分のmembers.id>/<ファイル名>" 固定。Storage側のポリシーが
// 「先頭フォルダ＝自分のID」でしか書けないようにしているので、他人の枠には置けない。
// ============================================================
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { MemberAvatar } from "./member-avatar";
import { AvatarCropper } from "./avatar-cropper";
import { useCurrentMember } from "@/lib/current-member";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AVATAR_BUCKET } from "@/lib/supabase/storage";

// 保存するのはトリミング後の512px JPEG（100KB前後）なので、
// 元ファイルはスマホの高画素写真を想定して余裕を持たせる。
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  variant = "card",
  onChanged,
}: {
  /** card = 設定画面のカード表示 / inline = 他の画面に埋め込む小さい表示 */
  variant?: "card" | "inline";
  /** 変更直後に呼ぶ。埋め込み先が自前で写真を持っている場合の即時反映用。 */
  onChanged?: (previewUrl: string | null) => void;
} = {}) {
  const member = useCurrentMember();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // トリミング待ちのファイル（選んだ直後は保存せず、まず位置調整へ）
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  if (!isSupabaseConfigured || !member) return null;

  const selectFile = (file: File) => {
    setError(null);
    setDone(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("JPEG / PNG / WebP の画像を選んでください");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("画像は15MBまでです");
      return;
    }
    setPendingFile(file);
  };

  // トリミング確定後：512px JPEG を Storage へ上げて members に紐づける
  const handleCropped = async (blob: Blob) => {
    setPendingFile(null);
    setBusy(true);

    const supabase = createClient();
    const path = `${member.id}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });

    if (uploadError) {
      setBusy(false);
      setError("アップロードできませんでした");
      return;
    }

    // 古い写真は残しても意味がないので、差し替え後に消す
    const previousPath = member.avatar_path;

    const { error: updateError } = await supabase
      .from("members")
      .update({ avatar_path: path })
      .eq("id", member.id);

    if (updateError) {
      // 参照されないファイルが残らないよう、ひも付けに失敗したら上げた画像も消す
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
      setBusy(false);
      setError("写真を保存できませんでした");
      return;
    }

    if (previousPath && previousPath !== path) {
      await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
    }

    setBusy(false);
    setDone("写真を更新しました");
    // 署名URLの再発行を待たずに見た目を切り替えるため、手元の画像をそのまま渡す
    onChanged?.(URL.createObjectURL(blob));
    router.refresh();
  };

  const handleRemove = async () => {
    if (!member.avatar_path) return;
    setError(null);
    setDone(null);
    setBusy(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("members")
      .update({ avatar_path: null })
      .eq("id", member.id);

    if (updateError) {
      setBusy(false);
      setError("写真を削除できませんでした");
      return;
    }

    await supabase.storage.from(AVATAR_BUCKET).remove([member.avatar_path]);
    setBusy(false);
    setDone("写真を削除しました");
    onChanged?.(null);
    router.refresh();
  };

  const controls = (
    <>
      <div className="flex items-center gap-4">
        <MemberAvatar name={member.name} url={member.avatar_url} size="lg" />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            {member.avatar_path ? "写真を変更" : "写真を選ぶ"}
          </button>

          {member.avatar_path && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              削除
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // 同じファイルを選び直しても onChange が起きるようにリセットする
          e.target.value = "";
          if (file) selectFile(file);
        }}
      />

      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(blob) => void handleCropped(blob)}
        />
      )}

      {error && <p className="mt-4 text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2">{error}</p>}
      {done && <p className="mt-4 text-xs bg-green-50 text-green-700 rounded-lg px-3 py-2">{done}</p>}

      <p className="mt-4 text-[11px] text-gray-400">
        JPEG / PNG / WebP・15MBまで。選んだあとに位置と大きさを調整できます
      </p>
    </>
  );

  // 埋め込み用（プロフィールシート編集など）。写真の実体は設定画面と共通。
  if (variant === "inline") return <div>{controls}</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-base font-bold text-gray-900 mb-1">プロフィール写真</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-5">
        掲示板・メンバー一覧・プロフィールに表示されます。未設定の場合はお名前の頭文字が表示されます。
      </p>
      {controls}
    </div>
  );
}
