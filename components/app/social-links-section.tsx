"use client";

// ============================================================
// SNSリンク（本人の編集 / 他の会員から見た表示）
// ============================================================
// 見えないリンクの URL は API の時点で返ってこない（DB側で NULL にしている）。
// ∴ ここでは「表示するかどうか」だけを扱えばよい。
// ============================================================

import { useEffect, useState } from "react";
import {
  Globe,
  Instagram,
  Twitter,
  Facebook,
  Link as LinkIcon,
  Plus,
  Trash2,
  Eye,
  Lock,
  Users,
  ExternalLink,
  Save,
} from "lucide-react";
import {
  SocialPlatform,
  SocialVisibility,
  SOCIAL_PLATFORM_META,
  VISIBILITY_META,
  socialHref,
} from "@/lib/social-links";
import {
  type OwnSocialLink,
  type VisibleSocialLink,
  fetchMySocialLinks,
  fetchProfileSocialLinks,
  saveMySocialLinks,
} from "@/lib/social-api";
import { setCached } from "@/lib/client-cache";
import { PlatformIcon } from "./platform-icon";

function VisibilityBadge({ visibility }: { visibility: SocialVisibility }) {
  const Icon = visibility === "public" ? Eye : visibility === "approved" ? Users : Lock;
  const color =
    visibility === "public"
      ? "bg-green-50 text-green-700 border-green-200"
      : visibility === "approved"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {VISIBILITY_META[visibility].label}
    </span>
  );
}

function linkTitle(platform: SocialPlatform, label: string | null): string {
  if (platform === "other") return label?.trim() || "リンク";
  return SOCIAL_PLATFORM_META[platform].label;
}

function SocialLinkChip({
  link,
  showVisibility,
}: {
  link: VisibleSocialLink;
  showVisibility?: boolean;
}) {
  const meta = SOCIAL_PLATFORM_META[link.platform];
  const href = socialHref(link.platform, link.url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      <span
        className={`w-7 h-7 rounded-lg ${meta.color} text-white flex items-center justify-center flex-shrink-0`}
      >
        <PlatformIcon platform={link.platform} className="w-4 h-4" />
      </span>
      <span className="text-sm text-gray-700 group-hover:text-gray-900">
        {linkTitle(link.platform, link.label)}
      </span>
      {showVisibility && <VisibilityBadge visibility={link.visibility} />}
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
    </a>
  );
}

// ============================================================
// 閲覧モード
// ============================================================
// 🔴 ここに「開示を申請」ボタンは置かない（2026-08-30に廃止）。
//    連絡先を教えてもらう入口は、この上にある「つながり申請」1本だけ。
//    リンクごとに申請できると、相手には同じ人から2件3件と細切れに届き、
//    しかも何のためにつながりたいのかが伝わらない。
//    ∴ ここは「何を持っているか」と「まだ見えていないこと」を示すだけにする。
function ViewerLinks({ ownerId }: { ownerId: string }) {
  const [links, setLinks] = useState<VisibleSocialLink[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchProfileSocialLinks(ownerId)
      .then((rows) => {
        if (cancelled) return;
        setLinks(rows);
        setStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (status === "loading") return null;
  if (status === "error") {
    return <p className="text-xs text-gray-400">SNSリンクを取得できませんでした</p>;
  }
  if (links.length === 0) return null;

  const visible = links.filter((l) => l.visible);
  const locked = links.filter((l) => !l.visible);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">SNS・リンク</h3>

      {visible.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visible.map((link) => (
            <SocialLinkChip key={link.id} link={link} />
          ))}
        </div>
      )}

      {/* まだ教えてもらっていないもの。鍵の理由と、開け方だけを書く */}
      {locked.length > 0 && (
        <div className={visible.length > 0 ? "mt-4 pt-4 border-t border-gray-100" : ""}>
          <div className="flex flex-wrap gap-2 mb-2">
            {locked.map((link) => (
              <span
                key={link.id}
                className="inline-flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50"
              >
                <span className="w-7 h-7 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm text-gray-400">
                  {linkTitle(link.platform, link.label)}
                </span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            「連絡先を教えてもらう」から申し込むと、相手が教えると決めたものだけ見えます。
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 編集モード（本人）
// ============================================================
function OwnerLinks({ onSaved }: { onSaved?: () => void }) {
  const [links, setLinks] = useState<OwnSocialLink[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMySocialLinks()
      .then((rows) => {
        if (cancelled) return;
        setLinks(rows);
        setStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (index: number, patch: Partial<OwnSocialLink>) =>
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const result = await saveMySocialLinks(links);
    setSaving(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: "保存しました" });
    // 採番されたIDを取り込む（次の保存で作り直しにならないように）
    try {
      const saved = await fetchMySocialLinks();
      setLinks(saved);
      // 🔴 マイページの「連絡先を登録しませんか」は覚えている内容で出す。
      //    ここで入れ替えないと、登録したのに戻ると案内が出たままになる。
      setCached("my-social-links", saved);
    } catch {
      /* 取得できなくても保存自体は済んでいる */
    }
    // 名刺カードのプレビューに「全員に公開」の分を反映させる
    onSaved?.();
  };

  if (status === "loading") return null;
  if (status === "error") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <p className="text-sm text-gray-500">SNSリンクを取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-bold text-gray-900">SNS・リンク</h3>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        「承認した人だけ」にすると、連絡先を聞かれたときに自分が選んで教えた相手にだけ
        表示されます。教える前は、リンクがあること自体は見えますがURLは渡りません。
      </p>

      {message && (
        <p
          className={`mb-3 text-xs rounded-lg px-3 py-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={link.id ?? `new-${index}`} className="p-3 bg-gray-50 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={link.platform}
                onChange={(e) => update(index, { platform: e.target.value as SocialPlatform })}
                className="px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {(Object.keys(SOCIAL_PLATFORM_META) as SocialPlatform[]).map((p) => (
                  <option key={p} value={p}>
                    {SOCIAL_PLATFORM_META[p].label}
                  </option>
                ))}
              </select>

              <select
                value={link.visibility}
                onChange={(e) => update(index, { visibility: e.target.value as SocialVisibility })}
                className="px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {(Object.keys(VISIBILITY_META) as SocialVisibility[]).map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_META[v].label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
                className="ml-auto p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                aria-label="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {link.platform === "other" && (
              <input
                value={link.label ?? ""}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="表示名（例: note）"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            )}

            <input
              value={link.url}
              onChange={(e) => update(index, { url: e.target.value })}
              placeholder={SOCIAL_PLATFORM_META[link.platform].placeholder}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          setLinks((prev) => [
            ...prev,
            { platform: "line", label: null, url: "", visibility: "approved" },
          ])
        }
        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        リンクを追加
      </button>
    </div>
  );
}

export function SocialLinksSection({
  ownerMode,
  viewerMode,
  onSaved,
}: {
  ownerMode?: boolean;
  viewerMode?: { ownerId: string };
  /** 本人の保存後に呼ばれる（名刺カードのプレビュー更新用） */
  onSaved?: () => void;
}) {
  if (ownerMode) return <OwnerLinks onSaved={onSaved} />;
  if (viewerMode) return <ViewerLinks ownerId={viewerMode.ownerId} />;
  return null;
}
