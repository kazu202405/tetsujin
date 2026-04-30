"use client";

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
} from "lucide-react";
import {
  SocialLink,
  SocialPlatform,
  SocialVisibility,
  SOCIAL_PLATFORM_META,
  VISIBILITY_META,
  filterVisibleLinks,
} from "@/lib/social-links";

// 各プラットフォーム用アイコン（LINE は lucide に無いのでインラインSVG）
function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  if (platform === "line") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M19.952 9.422c0-3.708-3.717-6.726-8.286-6.726S3.38 5.714 3.38 9.422c0 3.323 2.946 6.105 6.929 6.633.27.058.637.178.73.41.085.21.055.541.027.755l-.118.708c-.036.21-.166.823.722.448.888-.374 4.788-2.819 6.532-4.826h-.001c1.205-1.32 1.751-2.66 1.751-4.128zm-11.21 1.978a.16.16 0 0 1-.16.16h-2.32a.16.16 0 0 1-.16-.16V8.078a.16.16 0 0 1 .16-.16h.581a.16.16 0 0 1 .16.16v2.583h1.579a.16.16 0 0 1 .16.16zm1.4 0a.16.16 0 0 1-.16.16h-.582a.16.16 0 0 1-.16-.16V8.078a.16.16 0 0 1 .16-.16h.582a.16.16 0 0 1 .16.16zm3.704 0a.16.16 0 0 1-.16.16h-.581a.16.16 0 0 1-.13-.066l-1.488-2.012V11.4a.16.16 0 0 1-.16.16h-.582a.16.16 0 0 1-.16-.16V8.078a.16.16 0 0 1 .16-.16h.598a.16.16 0 0 1 .128.064l1.482 2.013V8.078a.16.16 0 0 1 .161-.16h.581a.16.16 0 0 1 .161.16zm2.973-2.741a.16.16 0 0 1-.16.16h-1.579v.61h1.579a.16.16 0 0 1 .16.161v.581a.16.16 0 0 1-.16.16h-1.579v.609h1.579a.16.16 0 0 1 .16.16v.582a.16.16 0 0 1-.16.16h-2.32a.16.16 0 0 1-.16-.16V8.078a.16.16 0 0 1 .16-.16h2.32a.16.16 0 0 1 .16.16z" />
      </svg>
    );
  }
  if (platform === "instagram") return <Instagram className={className} />;
  if (platform === "x") return <Twitter className={className} />;
  if (platform === "facebook") return <Facebook className={className} />;
  if (platform === "website") return <Globe className={className} />;
  return <LinkIcon className={className} />;
}

function VisibilityBadge({ visibility }: { visibility: SocialVisibility }) {
  const Icon =
    visibility === "public" ? Eye : visibility === "connections" ? Users : Lock;
  const color =
    visibility === "public"
      ? "bg-green-50 text-green-700 border-green-200"
      : visibility === "connections"
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

// SNSリンクのチップ表示（外部リンク）
function SocialLinkChip({ link, showVisibility }: { link: SocialLink; showVisibility?: boolean }) {
  const meta = SOCIAL_PLATFORM_META[link.platform];
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-lg text-white flex-shrink-0 ${meta.color}`}
      >
        <PlatformIcon platform={link.platform} className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900 truncate">
            {link.label || meta.label}
          </p>
          {showVisibility && <VisibilityBadge visibility={link.visibility} />}
        </div>
        <p className="text-xs text-gray-400 truncate">{link.url}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
    </a>
  );
}

// オーナー用：編集可能な行
function EditableRow({
  link,
  onChange,
  onDelete,
}: {
  link: SocialLink;
  onChange: (next: SocialLink) => void;
  onDelete: () => void;
}) {
  const meta = SOCIAL_PLATFORM_META[link.platform];

  return (
    <div className="bg-gray-50/60 rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-lg text-white flex-shrink-0 ${meta.color}`}
        >
          <PlatformIcon platform={link.platform} className="w-4 h-4" />
        </div>
        <select
          value={link.platform}
          onChange={(e) =>
            onChange({ ...link, platform: e.target.value as SocialPlatform })
          }
          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          {(Object.keys(SOCIAL_PLATFORM_META) as SocialPlatform[]).map((p) => (
            <option key={p} value={p}>
              {SOCIAL_PLATFORM_META[p].label}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {link.platform === "other" && (
        <input
          type="text"
          value={link.label || ""}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
          placeholder="ラベル（例: note、YouTube）"
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      )}

      <input
        type="url"
        value={link.url}
        onChange={(e) => onChange({ ...link, url: e.target.value })}
        placeholder={meta.placeholder}
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(VISIBILITY_META) as SocialVisibility[]).map((v) => {
          const Icon = v === "public" ? Eye : v === "connections" ? Users : Lock;
          const active = link.visibility === v;
          return (
            <button
              key={v}
              onClick={() => onChange({ ...link, visibility: v })}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[11px] font-medium border transition-all ${
                active
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
              title={VISIBILITY_META[v].description}
            >
              <Icon className="w-3.5 h-3.5" />
              {VISIBILITY_META[v].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// localStorage キー（mock永続化用）
const storageKey = (memberId: string) => `tetsujin-social-links-${memberId}`;

interface SocialLinksSectionProps {
  // 自分視点のときに渡す
  ownerMode?: {
    memberId: string;
    initialLinks: SocialLink[];
  };
  // 他人視点のとき（自分のプロフィールページ閲覧時は isOwner=true で全リンクを表示）
  viewerMode?: {
    links: SocialLink[];
    isConnected: boolean;
    isOwner?: boolean;
  };
}

export function SocialLinksSection({ ownerMode, viewerMode }: SocialLinksSectionProps) {
  // ============ 自分視点（編集可能） ============
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<SocialLink[]>(
    ownerMode?.initialLinks ?? []
  );

  // localStorage から読み込み（クライアントサイド only）
  useEffect(() => {
    if (!ownerMode) return;
    try {
      const raw = localStorage.getItem(storageKey(ownerMode.memberId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLinks(parsed);
      }
    } catch {
      /* fallback: initialLinks のまま */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: SocialLink[]) => {
    setLinks(next);
    if (!ownerMode) return;
    try {
      localStorage.setItem(storageKey(ownerMode.memberId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const addLink = () => {
    const newLink: SocialLink = {
      id: `s-${Date.now()}`,
      platform: "line",
      url: "",
      visibility: "connections",
    };
    persist([...links, newLink]);
    setEditing(true);
  };

  const updateLink = (id: string, next: SocialLink) => {
    persist(links.map((l) => (l.id === id ? next : l)));
  };

  const removeLink = (id: string) => {
    persist(links.filter((l) => l.id !== id));
  };

  if (ownerMode) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">SNSリンク</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              公開範囲はリンクごとに設定できます
            </p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            {editing ? "完了" : "編集"}
          </button>
        </header>

        {links.length === 0 && !editing && (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
            <LinkIcon className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-3">まだSNSリンクが登録されていません</p>
            <button
              onClick={() => {
                setEditing(true);
                addLink();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              追加する
            </button>
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            {links.map((link) => (
              <EditableRow
                key={link.id}
                link={link}
                onChange={(next) => updateLink(link.id, next)}
                onDelete={() => removeLink(link.id)}
              />
            ))}
            <button
              onClick={addLink}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              SNSを追加
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <SocialLinkChip key={link.id} link={link} showVisibility />
            ))}
          </div>
        )}
      </section>
    );
  }

  // ============ 閲覧視点（公開範囲フィルタ） ============
  if (!viewerMode) return null;
  const isOwnerView = viewerMode.isOwner === true;
  const visible = filterVisibleLinks(viewerMode.links, {
    isOwner: isOwnerView,
    isConnected: viewerMode.isConnected,
  });

  if (visible.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-900 mb-4">SNS・リンク</h2>
      <div className="space-y-2">
        {visible.map((link) => (
          <SocialLinkChip key={link.id} link={link} showVisibility={isOwnerView} />
        ))}
      </div>
    </section>
  );
}
