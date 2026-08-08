"use client";

// ============================================================
// 掲示板（実データ）
// ============================================================
// 投稿・コメント・いいね・チャンネルはすべて Supabase が正。
// チャンネルは以前 localStorage にあり会員ごとに別物が見えていたため、
// 運営が管理する1つの正本（board_channels）に統一している。
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Send,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  PartyPopper,
  Coffee,
  ImagePlus,
  Handshake,
  Dumbbell,
  Megaphone,
  ArrowUpRight,
  Plus,
  Star,
  Bookmark,
  Lightbulb,
  Music,
  Pencil,
  Trash2,
  X,
  EyeOff,
  Reply,
  CornerDownRight,
  type LucideIcon,
} from "lucide-react";
import { markBoardVisited } from "@/lib/board-data";
import { useCurrentMember } from "@/lib/current-member";
import { MemberAvatar } from "@/components/app/member-avatar";
import { AutoTextarea } from "@/components/app/auto-textarea";
import {
  type BoardChannel,
  type BoardComment,
  type BoardPost,
  createChannel,
  createComment,
  createPost,
  deleteChannel,
  fetchComments,
  fetchPosts,
  formatPostedAt,
  markBoardRead,
  toggleLike,
  updateChannel,
  uploadPostImage,
  useBoardChannels,
} from "@/lib/board-api";
import { CardSkeleton, LoadingRows } from "@/components/app/skeleton";

// アイコンマップ（文字列キー → コンポーネント）
const iconMap: Record<string, LucideIcon> = {
  PartyPopper,
  Coffee,
  ImagePlus,
  Handshake,
  Dumbbell,
  Megaphone,
  ArrowUpRight,
  MessageCircle,
  Star,
  Bookmark,
  Lightbulb,
  Music,
};

const iconKeys = Object.keys(iconMap);

const colorOptions = [
  { key: "pink", class: "text-pink-500", bg: "bg-pink-500" },
  { key: "amber", class: "text-amber-500", bg: "bg-amber-500" },
  { key: "blue", class: "text-blue-500", bg: "bg-blue-500" },
  { key: "green", class: "text-green-500", bg: "bg-green-500" },
  { key: "purple", class: "text-purple-500", bg: "bg-purple-500" },
  { key: "red", class: "text-red-500", bg: "bg-red-500" },
  { key: "indigo", class: "text-indigo-500", bg: "bg-indigo-500" },
  { key: "teal", class: "text-teal-500", bg: "bg-teal-500" },
];

function getColorClass(colorKey: string): string {
  return colorOptions.find((c) => c.key === colorKey)?.class ?? "text-gray-500";
}

function getIconComponent(iconKey: string): LucideIcon {
  return iconMap[iconKey] ?? Star;
}

// @メンション部分をハイライト表示
function renderMentionText(text: string) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-amber-600 font-bold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// 退会者はプロフィールへ飛ばさない（既存方針＝名前は残すがクリック不可）
//
// 🔴 whitespace-nowrap は必須。日本語は文字と文字の間どこでも改行できるので、
//    フレックスの中に置くと「この要素の最小幅＝1文字」と見なされ、
//    幅が足りないときに名前が縦一列に潰れる。
function AuthorName({
  author,
  className,
}: {
  author: BoardPost["author"];
  className: string;
}) {
  const base = `${className} whitespace-nowrap`;
  if (author.isWithdrawn) {
    return <span className={`${base} text-gray-400`}>{author.name}（退会）</span>;
  }
  return (
    <Link href={`/app/profile/${author.id}`} className={base}>
      {author.name}
    </Link>
  );
}

export default function BoardPage() {
  const me = useCurrentMember();
  const isAdmin = me?.role === "admin";

  const { channels, status: channelStatus, reload: reloadChannels } = useBoardChannels();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [postsStatus, setPostsStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 添付画像（ギャラリー等で使う）。送信時にStorageへ上げてからパスを渡す。
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);

  // コメント（開いた投稿だけ取得する）
  const [commentsMap, setCommentsMap] = useState<Record<string, BoardComment[]>>({});
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<
    { postId: string; commentId: string; authorName: string } | null
  >(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // チャンネル管理フォーム
  const [newChName, setNewChName] = useState("");
  const [newChIcon, setNewChIcon] = useState("Star");
  const [newChColor, setNewChColor] = useState("blue");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [channelError, setChannelError] = useState<string | null>(null);

  // 掲示板を開いたら既読化（未読バッジ用）＋オンボーディングの「掲示板を見た」
  useEffect(() => {
    markBoardVisited();
    void markBoardRead();
  }, []);

  // 最初のチャンネルを選ぶ／選択中が消えたら先頭へ戻す
  useEffect(() => {
    if (channels.length === 0) return;
    if (!activeChannelId || !channels.some((c) => c.id === activeChannelId)) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const loadPosts = useCallback(async (channelId: string) => {
    setPostsStatus("loading");
    try {
      setPosts(await fetchPosts(channelId));
      setPostsStatus("loaded");
    } catch {
      setPosts([]);
      setPostsStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!activeChannelId) return;
    void loadPosts(activeChannelId);
  }, [activeChannelId, loadPosts]);

  const activeChannel: BoardChannel | undefined = useMemo(
    () => channels.find((c) => c.id === activeChannelId),
    [channels, activeChannelId]
  );

  // ---------- 投稿 ----------
  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handlePost = async () => {
    if (!newPost.trim() || !activeChannelId || posting) return;
    setPosting(true);
    setError(null);

    let imagePath: string | null = null;
    if (imageFile && me) {
      const uploaded = await uploadPostImage(me.id, imageFile);
      if (!uploaded.ok) {
        setPosting(false);
        setError(uploaded.error);
        return;
      }
      imagePath = uploaded.path;
    }

    const result = await createPost({
      channelId: activeChannelId,
      content: newPost.trim(),
      imagePath,
    });
    setPosting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewPost("");
    clearImage();
    await loadPosts(activeChannelId);
    void reloadChannels();
  };

  // ---------- いいね ----------
  const handleLike = async (post: BoardPost) => {
    const nextLiked = !post.likedByMe;
    // 先に画面を変えて、失敗したら戻す
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: nextLiked, likeCount: p.likeCount + (nextLiked ? 1 : -1) }
          : p
      )
    );
    const result = await toggleLike(post.id, nextLiked);
    if (!result.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount }
            : p
        )
      );
      setError(result.error);
    }
  };

  // ---------- コメント ----------
  const loadComments = useCallback(async (postId: string) => {
    try {
      const items = await fetchComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: items }));
    } catch {
      setError("コメントを取得できませんでした");
    }
  }, []);

  const toggleComments = async (postId: string) => {
    const opening = expandedPostId !== postId;
    setExpandedPostId(opening ? postId : null);
    setReplyTarget(null);
    setReplyText("");
    if (opening && !commentsMap[postId]) await loadComments(postId);
  };

  const submitComment = async (postId: string, parentCommentId?: string) => {
    const raw = parentCommentId ? replyText : commentInputs[postId] ?? "";
    const content = raw.trim();
    if (!content) return;

    const result = await createComment(postId, { content, parentCommentId });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (parentCommentId) {
      setReplyTarget(null);
      setReplyText("");
      setExpandedReplies((prev) => new Set(prev).add(parentCommentId));
    } else {
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    }

    await loadComments(postId);
    setExpandedPostId(postId);
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
    );
  };

  // ---------- チャンネル管理（運営のみ） ----------
  const handleAddChannel = async () => {
    const name = newChName.trim();
    if (!name) return;
    setChannelError(null);
    const result = await createChannel({ name, icon_key: newChIcon, color: newChColor });
    if (!result.ok) {
      setChannelError(result.error);
      return;
    }
    setNewChName("");
    setNewChIcon("Star");
    setNewChColor("blue");
    await reloadChannels();
  };

  const confirmEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setChannelError(null);
    const result = await updateChannel(editingId, {
      name: editName.trim(),
      icon_key: editIcon,
      color: editColor,
    });
    if (!result.ok) {
      setChannelError(result.error);
      return;
    }
    setEditingId(null);
    await reloadChannels();
  };

  const handleDeleteChannel = async (id: string) => {
    setChannelError(null);
    const result = await deleteChannel(id);
    if (!result.ok) {
      setChannelError(result.error);
      return;
    }
    await reloadChannels();
  };

  const handleArchiveChannel = async (id: string) => {
    setChannelError(null);
    const result = await updateChannel(id, { is_archived: true });
    if (!result.ok) {
      setChannelError(result.error);
      return;
    }
    await reloadChannels();
  };

  // ---------- 読み込み前・未ログイン ----------
  if (channelStatus === "loading") {
    return <CardSkeleton rows={3} />;
  }
  if (channelStatus === "error") {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <p className="text-sm text-gray-600 mb-2">掲示板を表示できませんでした。</p>
        <p className="text-xs text-gray-400">
          ログインが切れている可能性があります。ページを再読み込みしてください。
        </p>
      </div>
    );
  }

  const currentIcon = activeChannel ? getIconComponent(activeChannel.icon_key) : Star;
  const currentColor = activeChannel ? getColorClass(activeChannel.color) : "text-gray-500";

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">掲示板</h1>
            <span className="text-xs text-gray-400">{posts.length}件の投稿</span>
          </div>

          {/* チャンネルタブ */}
          <div className="flex flex-wrap gap-2 items-center">
            {channels.map((ch) => {
              const Icon = getIconComponent(ch.icon_key);
              const colorCls = getColorClass(ch.color);
              const isActive = activeChannelId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    isActive
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : colorCls}`} />
                  {ch.name}
                  {ch.post_count > 0 && (
                    <span
                      className={`text-[10px] ${isActive ? "text-gray-300" : "text-gray-400"}`}
                    >
                      {ch.post_count}
                    </span>
                  )}
                </button>
              );
            })}
            {/* チャンネル管理は運営のみ */}
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors bg-white text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600"
                title="チャンネル管理"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* チャンネル管理モーダル（運営のみ） */}
        {showModal && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowModal(false);
                setEditingId(null);
                setChannelError(null);
              }}
            />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-gray-900">チャンネル管理</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setChannelError(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                ここでの変更は全会員に反映されます。投稿があるチャンネルは削除できません（「非表示」で一覧から外せます）。
              </p>

              {channelError && (
                <p className="mb-4 text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2">
                  {channelError}
                </p>
              )}

              {/* 既存チャンネル一覧 */}
              <div className="space-y-1.5 mb-5">
                {channels.map((ch) => {
                  const Icon = getIconComponent(ch.icon_key);
                  const colorCls = getColorClass(ch.color);

                  if (editingId === ch.id) {
                    return (
                      <div key={ch.id} className="p-3 bg-gray-50 rounded-xl space-y-2.5">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <div className="flex flex-wrap gap-1">
                          {iconKeys.map((ik) => {
                            const Ic = iconMap[ik];
                            return (
                              <button
                                key={ik}
                                onClick={() => setEditIcon(ik)}
                                className={`p-1.5 rounded-md transition-colors ${
                                  editIcon === ik
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-gray-400 hover:text-gray-600 border border-gray-200"
                                }`}
                              >
                                <Ic className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5">
                          {colorOptions.map((co) => (
                            <button
                              key={co.key}
                              onClick={() => setEditColor(co.key)}
                              className={`w-5 h-5 rounded-full ${co.bg} transition-all ${
                                editColor === co.key
                                  ? "ring-2 ring-offset-1 ring-gray-900 scale-110"
                                  : "opacity-50 hover:opacity-80"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={confirmEdit}
                            className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ch.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl transition-colors group"
                    >
                      <Icon className={`w-4 h-4 ${colorCls}`} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{ch.name}</span>
                      <span className="text-[10px] text-gray-400">{ch.post_count}件</span>
                      <button
                        onClick={() => {
                          setEditingId(ch.id);
                          setEditName(ch.name);
                          setEditIcon(ch.icon_key);
                          setEditColor(ch.color);
                        }}
                        className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="編集"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveChannel(ch.id)}
                        className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="非表示にする"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="削除する"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 新規追加フォーム */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 mb-3">新規チャンネル追加</p>
                <div className="space-y-3">
                  <input
                    value={newChName}
                    onChange={(e) => setNewChName(e.target.value)}
                    placeholder="例: お知らせ"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  />
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5">アイコン</p>
                    <div className="flex flex-wrap gap-1.5">
                      {iconKeys.map((ik) => {
                        const Ic = iconMap[ik];
                        return (
                          <button
                            key={ik}
                            onClick={() => setNewChIcon(ik)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              newChIcon === ik
                                ? "bg-gray-900 text-white"
                                : "bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-200"
                            }`}
                          >
                            <Ic className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5">カラー</p>
                    <div className="flex gap-2">
                      {colorOptions.map((co) => (
                        <button
                          key={co.key}
                          onClick={() => setNewChColor(co.key)}
                          className={`w-6 h-6 rounded-full ${co.bg} transition-all ${
                            newChColor === co.key
                              ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                              : "opacity-50 hover:opacity-80"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddChannel}
                    disabled={!newChName.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 text-sm bg-red-50 text-red-700 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 投稿フォーム */}
        <div className="py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <MemberAvatar name={me?.name ?? "会員"} size="md" className="mt-0.5" />
              <div className="flex-1">
                <AutoTextarea
                  value={newPost}
                  onChange={setNewPost}
                  placeholder={`${activeChannel?.name ?? "チャンネル"}に投稿...`}
                  minRows={2}
                  maxRows={16}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all"
                />
                {imagePreview && (
                  <div className="relative mt-2 inline-block">
                    <img
                      src={imagePreview}
                      alt="添付画像"
                      className="max-h-40 rounded-xl border border-gray-200"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center shadow hover:bg-gray-700 transition-colors"
                      title="画像を外す"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    title="画像を添付"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      clearImage();
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                  />
                  <button
                    onClick={handlePost}
                    disabled={!newPost.trim() || posting || !activeChannelId}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {posting ? "送信中..." : "投稿"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 投稿一覧 */}
        <div className="space-y-4 pb-24">
          {postsStatus === "loading" && (
            <LoadingRows rows={3} />
          )}

          {postsStatus === "loaded" &&
            posts.map((post) => {
              const comments = commentsMap[post.id] ?? [];
              const isExpanded = expandedPostId === post.id;
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div className="flex gap-3">
                    {post.author.isWithdrawn ? (
                      <MemberAvatar
                        name={post.author.name}
                        url={post.author.avatarUrl}
                        grayscale
                      />
                    ) : (
                      <Link href={`/app/profile/${post.author.id}`}>
                        <MemberAvatar name={post.author.name} url={post.author.avatarUrl} />
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* 幅が足りないときは職業から削る。名前は削らない */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <AuthorName
                            author={post.author}
                            className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
                          />
                          {post.author.job && (
                            <span className="text-xs text-gray-400 truncate">
                              {post.author.job}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-300 flex-shrink-0">
                          {formatPostedAt(post.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                        {post.content}
                      </p>

                      {post.imageUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden max-w-lg">
                          <img src={post.imageUrl} alt="" className="w-full h-48 object-cover" />
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post)}
                          className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                            post.likedByMe
                              ? "text-pink-500"
                              : "text-gray-400 hover:text-pink-500"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${post.likedByMe ? "fill-current" : ""}`}
                          />
                          {post.likeCount}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                            isExpanded ? "text-amber-600" : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          <MessageCircle
                            className={`w-4 h-4 ${isExpanded ? "fill-current" : ""}`}
                          />
                          {post.commentCount}
                        </button>
                      </div>

                      {/* コメントスレッド（展開式） */}
                      {post.commentCount > 0 && (
                        <div className="mt-3">
                          {!isExpanded ? (
                            <button
                              onClick={() => toggleComments(post.id)}
                              className="text-xs text-gray-400 hover:text-amber-600 transition-colors"
                            >
                              コメント {post.commentCount}件を表示
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleComments(post.id)}
                                className="text-xs text-amber-600 hover:text-amber-700 transition-colors mb-3"
                              >
                                コメントを閉じる
                              </button>
                              <div className="pt-3 border-t border-gray-100">
                                <div className="space-y-3">
                                  {comments.map((comment) => (
                                    <div key={comment.id}>
                                      <div className="flex gap-2.5">
                                        <MemberAvatar
                                          name={comment.author.name}
                                          url={comment.author.avatarUrl}
                                          size="sm"
                                          grayscale={comment.author.isWithdrawn}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="bg-gray-50 rounded-xl px-3 py-2">
                                            <div className="flex items-center gap-1.5 mb-0.5 min-w-0 overflow-hidden">
                                              <AuthorName
                                                author={comment.author}
                                                className="text-xs font-bold text-gray-800 hover:text-amber-700 transition-colors"
                                              />
                                              {comment.author.job && (
                                                <span className="text-[10px] text-gray-400 truncate">
                                                  {comment.author.job}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                              {comment.content}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-3 mt-1 ml-1">
                                            <span className="text-[10px] text-gray-300">
                                              {formatPostedAt(comment.createdAt)}
                                            </span>
                                            <button
                                              onClick={() => {
                                                if (replyTarget?.commentId === comment.id) {
                                                  setReplyTarget(null);
                                                  setReplyText("");
                                                } else {
                                                  setReplyTarget({
                                                    postId: post.id,
                                                    commentId: comment.id,
                                                    authorName: comment.author.name,
                                                  });
                                                  setReplyText(`@${comment.author.name} `);
                                                  setExpandedReplies((prev) =>
                                                    new Set(prev).add(comment.id)
                                                  );
                                                }
                                              }}
                                              className={`inline-flex items-center gap-1 text-[10px] font-medium transition-colors ${
                                                replyTarget?.commentId === comment.id
                                                  ? "text-amber-600"
                                                  : "text-gray-400 hover:text-gray-600"
                                              }`}
                                            >
                                              <Reply className="w-3 h-3" />
                                              返信
                                              {(comment.replies?.length ?? 0) > 0 &&
                                                ` ${comment.replies?.length}件`}
                                            </button>
                                          </div>

                                          {/* 返信一覧（折りたたみ） */}
                                          {(comment.replies?.length ?? 0) > 0 &&
                                            !expandedReplies.has(comment.id) && (
                                              <button
                                                onClick={() =>
                                                  setExpandedReplies((prev) =>
                                                    new Set(prev).add(comment.id)
                                                  )
                                                }
                                                className="mt-1.5 ml-2 inline-flex items-center gap-1.5 text-[11px] text-amber-600 hover:text-amber-700 font-medium transition-colors"
                                              >
                                                <CornerDownRight className="w-3 h-3" />
                                                返信 {comment.replies?.length}件を表示
                                              </button>
                                            )}
                                          {(comment.replies?.length ?? 0) > 0 &&
                                            expandedReplies.has(comment.id) && (
                                              <div className="mt-2 space-y-2 ml-2">
                                                {comment.replies?.map((reply) => (
                                                  <div key={reply.id} className="flex gap-2">
                                                    <CornerDownRight className="w-3 h-3 text-gray-300 flex-shrink-0 mt-2" />
                                                    <MemberAvatar
                                                      name={reply.author.name}
                                                      url={reply.author.avatarUrl}
                                                      size="xs"
                                                      grayscale={reply.author.isWithdrawn}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <div className="bg-gray-50/70 rounded-lg px-2.5 py-1.5">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                          <AuthorName
                                                            author={reply.author}
                                                            className="text-[11px] font-bold text-gray-800 hover:text-amber-700 transition-colors"
                                                          />
                                                        </div>
                                                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                          {renderMentionText(reply.content)}
                                                        </p>
                                                      </div>
                                                      <div className="flex items-center gap-3 mt-0.5 ml-1">
                                                        <span className="text-[10px] text-gray-300">
                                                          {formatPostedAt(reply.createdAt)}
                                                        </span>
                                                        <button
                                                          onClick={() => {
                                                            setReplyTarget({
                                                              postId: post.id,
                                                              commentId: comment.id,
                                                              authorName: reply.author.name,
                                                            });
                                                            setReplyText(
                                                              `@${reply.author.name} `
                                                            );
                                                            setExpandedReplies((prev) =>
                                                              new Set(prev).add(comment.id)
                                                            );
                                                          }}
                                                          className="text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                          返信
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                          {/* 返信入力欄 */}
                                          {replyTarget?.commentId === comment.id && (
                                            <div className="mt-2 ml-2 flex gap-2 items-start">
                                              <CornerDownRight className="w-3 h-3 text-gray-300 flex-shrink-0 mt-2.5" />
                                              <MemberAvatar
                                                name={me?.name ?? "会員"}
                                                size="xs"
                                                className="mt-0.5"
                                              />
                                              <div className="flex-1 flex gap-1.5">
                                                <input
                                                  value={replyText}
                                                  onChange={(e) => setReplyText(e.target.value)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                      e.preventDefault();
                                                      void submitComment(post.id, comment.id);
                                                    }
                                                  }}
                                                  placeholder={`${replyTarget.authorName}さんに返信...`}
                                                  className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                                                  autoFocus
                                                />
                                                <button
                                                  onClick={() =>
                                                    void submitComment(post.id, comment.id)
                                                  }
                                                  disabled={!replyText.trim()}
                                                  className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-30"
                                                >
                                                  <Send className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* コメント入力欄（常に表示） */}
                      <div
                        className={`flex gap-2.5 items-start ${
                          post.commentCount > 0 ? "mt-3 pt-3 border-t border-gray-100" : "mt-3"
                        }`}
                      >
                        <MemberAvatar name={me?.name ?? "会員"} size="sm" className="mt-0.5" />
                        <div className="flex-1 flex gap-1.5">
                          <input
                            value={commentInputs[post.id] ?? ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void submitComment(post.id);
                              }
                            }}
                            placeholder="コメントを追加..."
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                          />
                          <button
                            onClick={() => void submitComment(post.id)}
                            disabled={!(commentInputs[post.id] ?? "").trim()}
                            className="p-2 text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-30"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {postsStatus === "loaded" && posts.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              {(() => {
                const EmptyIcon = currentIcon;
                return (
                  <EmptyIcon className={`w-10 h-10 mx-auto mb-3 ${currentColor} opacity-30`} />
                );
              })()}
              <p className="text-sm text-gray-400">まだ投稿がありません</p>
              <p className="text-xs text-gray-300 mt-1">最初の投稿をしてみましょう</p>
            </div>
          )}

          {postsStatus === "error" && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-500">投稿を取得できませんでした</p>
              <button
                onClick={() => activeChannelId && loadPosts(activeChannelId)}
                className="mt-3 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                再読み込み
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
