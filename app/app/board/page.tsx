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
  type LucideIcon, ChevronUp, ChevronDown, Settings } from "lucide-react";
import { markBoardVisited } from "@/lib/board-data";
import { useCurrentMember } from "@/lib/current-member";
import { isAdminRole } from "@/lib/member-roles";
import { MemberAvatar } from "@/components/app/member-avatar";
import { MentionTextarea } from "@/components/app/mention-textarea";
import {
  type BoardChannel,
  type BoardComment,
  type BoardPost,
  createChannel,
  createComment,
  createPost,
  deleteChannel,
  deleteComment,
  deletePost,
  editComment,
  editPost,
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
import { RichText } from "@/components/app/rich-text";

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
  const isAdmin = isAdminRole(me?.role);

  const { channels, status: channelStatus, reload: reloadChannels } = useBoardChannels();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [postsStatus, setPostsStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  // 送信中のコメント（投稿id か 親コメントid）。二重送信を止めるために持つ
  const [sendingComment, setSendingComment] = useState<string | null>(null);
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

  // オンボーディングの「掲示板を見た」
  useEffect(() => {
    markBoardVisited();
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
    // 開いたチャンネルだけを既読にする。掲示板全体を既読にすると
    // 見ていないチャンネルの未読まで消えて、バッジが当てにならなくなる。
    void markBoardRead(activeChannelId).then(reloadChannels);
  }, [activeChannelId, loadPosts, reloadChannels]);

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

    // 🔴 送信中は同じ相手への2回目を受け付けない。指で2回叩くと同じコメントが
    //    2つ並ぶ（実際に起きた）。ボタンを disabled にするだけでは、
    //    描き直しが間に合わない一瞬に2回目が入るので、ここでも止める。
    const key = parentCommentId ?? postId;
    if (sendingComment === key) return;
    setSendingComment(key);

    const result = await createComment(postId, { content, parentCommentId });
    setSendingComment(null);
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

  // 🔴 並び替えは「隣と sort_order を入れ替える」だけにする。
  //    全件に連番を振り直すと、途中で1件失敗したときに順番が壊れた状態で
  //    残る。2件だけなら、失敗しても元のままか、入れ替わったかのどちらか。
  const handleMoveChannel = async (id: string, dir: -1 | 1) => {
    setChannelError(null);
    const list = [...channels].sort((a, b) => a.sort_order - b.sort_order);
    const i = list.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;

    const a = list[i];
    const b = list[j];
    // 値が同じだと入れ替えても順番が変わらないので、その場合だけずらす
    const aNext = b.sort_order === a.sort_order ? a.sort_order + dir * 10 : b.sort_order;

    const r1 = await updateChannel(a.id, { sort_order: aNext });
    if (!r1.ok) {
      setChannelError(r1.error);
      return;
    }
    const r2 = await updateChannel(b.id, { sort_order: a.sort_order });
    if (!r2.ok) {
      setChannelError(`${r2.error}（並びが途中まで変わっています。もう一度お試しください）`);
    }
    await reloadChannels();
  };

  // ---------- 投稿・コメントの編集／削除 ----------
  // 🔴 編集できるのは本人だけ、削除は本人か運営。判定はDB側にもある。
  //    ここはボタンを出すかどうかを決めるだけで、守っているのはDB。
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [boardError, setBoardError] = useState<string | null>(null);
  // 🔴 削除は取り消せない（運営が他人の投稿も消せる）ので必ず一度確認する
  const [confirmDeletePost, setConfirmDeletePost] = useState<string | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<
    { id: string; postId: string } | null
  >(null);

  const afterChange = async (postId?: string) => {
    if (activeChannelId) await loadPosts(activeChannelId);
    if (postId) await loadComments(postId);
    await reloadChannels();
  };

  const submitEditPost = async (id: string) => {
    setBoardError(null);
    const result = await editPost(id, editingPostText);
    if (!result.ok) {
      setBoardError(result.error);
      return;
    }
    setEditingPostId(null);
    await afterChange();
  };

  const removePost = async (id: string) => {
    setBoardError(null);
    const result = await deletePost(id);
    if (!result.ok) {
      setBoardError(result.error);
      return;
    }
    await afterChange();
  };

  const submitEditComment = async (id: string, postId: string) => {
    setBoardError(null);
    const result = await editComment(id, editingCommentText);
    if (!result.ok) {
      setBoardError(result.error);
      return;
    }
    setEditingCommentId(null);
    await afterChange(postId);
  };

  const removeComment = async (id: string, postId: string) => {
    setBoardError(null);
    const result = await deleteComment(id);
    if (!result.ok) {
      setBoardError(result.error);
      return;
    }
    await afterChange(postId);
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
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-xl font-bold text-gray-900">掲示板</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{posts.length}件の投稿</span>
              {/* 🔴 以前はチャンネルタブの末尾に「＋」だけの丸ボタンを置いていたが、
                     ①名前が無く（マウスを乗せたときだけ表示＝スマホでは出ない）
                     ②「追加」に見えて「管理・並び替え」に読めず
                     ③タブ列の最後なので画面が狭いと右端に隠れる
                     の3つで、運営が見つけられなかった。見出しの横に名前付きで出す。 */}
              {isAdmin && (
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors flex-shrink-0"
                >
                  <Settings className="w-3.5 h-3.5" />
                  チャンネル管理
                </button>
              )}
            </div>
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
                  {/* 数字は未読数。読んだら消えるので「まだ見ていない分」が一目で分かる。
                      以前は総投稿数で、見ても減らないため何の数字か伝わらなかった。 */}
                  {ch.unread_count > 0 && (
                    <span
                      className={`text-[10px] font-bold min-w-[16px] px-1 py-px rounded-full text-center ${
                        isActive ? "bg-white/25 text-white" : "bg-red-500 text-white"
                      }`}
                    >
                      {ch.unread_count}
                    </span>
                  )}
                </button>
              );
            })}
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
                {channels.map((ch, idx) => {
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
                        onClick={() => handleMoveChannel(ch.id, -1)}
                        disabled={idx === 0}
                        className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                        title="上へ"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveChannel(ch.id, 1)}
                        disabled={idx === channels.length - 1}
                        className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                        title="下へ"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
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
              <MemberAvatar name={me?.name ?? "会員"} url={me?.avatar_url} size="md" className="mt-0.5" />
              <div className="flex-1">
                <MentionTextarea
                  value={newPost}
                  onChange={setNewPost}
                  placeholder={`${activeChannel?.name ?? "チャンネル"}に投稿...（@で宛先）`}
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
                          {post.editedAt && (
                            <span className="ml-1 text-gray-300">（編集済み）</span>
                          )}
                        </span>
                        {/* 編集は本人だけ。削除は本人か運営。 */}
                        {(post.isMine || isAdmin) && editingPostId !== post.id && (
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            {post.isMine && (
                              <button
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setEditingPostText(post.content);
                                  setBoardError(null);
                                }}
                                className="p-1 text-gray-300 hover:text-gray-600 rounded"
                                title="編集"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeletePost(post.id)}
                              className="p-1 text-gray-300 hover:text-red-500 rounded"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )}
                      </div>

                      {editingPostId === post.id ? (
                        <div className="mb-3">
                          <textarea
                            value={editingPostText}
                            onChange={(e) => setEditingPostText(e.target.value)}
                            rows={4}
                            maxLength={5000}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setEditingPostId(null)}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              やめる
                            </button>
                            <button
                              onClick={() => void submitEditPost(post.id)}
                              disabled={!editingPostText.trim()}
                              className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-30"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                          <RichText text={post.content} mentions={post.mentions} />
                        </p>
                      )}

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
                                  {/* 🔴 削除済みで返信が無いコメントは出さない。
                                         「削除されました」だけが並ぶと読みにくいだけ。
                                         返信がぶら下がっているものは残す（消すと
                                         会話のつながりが読めなくなるため）。 */}
                                  {comments
                                    .filter(
                                      (c) => !c.isDeleted || (c.replies?.filter((r) => !r.isDeleted).length ?? 0) > 0,
                                    )
                                    .map((comment) => (
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
                                            {comment.isDeleted ? (
                                              <p className="text-xs text-gray-400 italic">
                                                このコメントは削除されました
                                              </p>
                                            ) : editingCommentId === comment.id ? (
                                              <div>
                                                <textarea
                                                  value={editingCommentText}
                                                  onChange={(e) =>
                                                    setEditingCommentText(e.target.value)
                                                  }
                                                  rows={3}
                                                  maxLength={2000}
                                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                                                />
                                                <div className="flex justify-end gap-2 mt-1.5">
                                                  <button
                                                    onClick={() => setEditingCommentId(null)}
                                                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] text-gray-600"
                                                  >
                                                    やめる
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      void submitEditComment(comment.id, post.id)
                                                    }
                                                    disabled={!editingCommentText.trim()}
                                                    className="px-3 py-1 rounded-lg bg-gray-900 text-white text-[10px] font-bold disabled:opacity-30"
                                                  >
                                                    保存
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                <RichText text={comment.content} mentions={comment.mentions} />
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1 ml-1">
                                            <span className="text-[10px] text-gray-300">
                                              {formatPostedAt(comment.createdAt)}
                                              {comment.editedAt && !comment.isDeleted && (
                                                <span className="ml-1">（編集済み）</span>
                                              )}
                                            </span>
                                            {!comment.isDeleted &&
                                              (comment.isMine || isAdmin) &&
                                              editingCommentId !== comment.id && (
                                                <>
                                                  {comment.isMine && (
                                                    <button
                                                      onClick={() => {
                                                        setEditingCommentId(comment.id);
                                                        setEditingCommentText(comment.content);
                                                        setBoardError(null);
                                                      }}
                                                      className="text-[10px] text-gray-400 hover:text-gray-700"
                                                    >
                                                      編集
                                                    </button>
                                                  )}
                                                  <button
                                                    onClick={() =>
                                                      setConfirmDeleteComment({
                                                        id: comment.id,
                                                        postId: post.id,
                                                      })
                                                    }
                                                    className="text-[10px] text-gray-400 hover:text-red-500"
                                                  >
                                                    削除
                                                  </button>
                                                </>
                                              )}
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
                                              {(comment.replies?.filter((r) => !r.isDeleted).length ?? 0) > 0 &&
                                                ` ${comment.replies?.filter((r) => !r.isDeleted).length}件`}
                                            </button>
                                          </div>

                                          {/* 返信一覧（折りたたみ） */}
                                          {(comment.replies?.filter((r) => !r.isDeleted).length ?? 0) > 0 &&
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
                                                返信 {comment.replies?.filter((r) => !r.isDeleted).length}件を表示
                                              </button>
                                            )}
                                          {(comment.replies?.filter((r) => !r.isDeleted).length ?? 0) > 0 &&
                                            expandedReplies.has(comment.id) && (
                                              <div className="mt-2 space-y-2 ml-2">
                                                {comment.replies?.filter((r) => !r.isDeleted).map((reply) => (
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
                                                        {editingCommentId === reply.id ? (
                                                          <div>
                                                            <textarea
                                                              value={editingCommentText}
                                                              onChange={(e) =>
                                                                setEditingCommentText(e.target.value)
                                                              }
                                                              rows={3}
                                                              maxLength={2000}
                                                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                                                            />
                                                            <div className="flex justify-end gap-2 mt-1.5">
                                                              <button
                                                                onClick={() =>
                                                                  setEditingCommentId(null)
                                                                }
                                                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] text-gray-600"
                                                              >
                                                                やめる
                                                              </button>
                                                              <button
                                                                onClick={() =>
                                                                  void submitEditComment(
                                                                    reply.id,
                                                                    post.id,
                                                                  )
                                                                }
                                                                disabled={!editingCommentText.trim()}
                                                                className="px-3 py-1 rounded-lg bg-gray-900 text-white text-[10px] font-bold disabled:opacity-30"
                                                              >
                                                                保存
                                                              </button>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                            <RichText text={reply.content} mentions={reply.mentions} />
                                                          </p>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-3 mt-0.5 ml-1">
                                                        <span className="text-[10px] text-gray-300">
                                                          {formatPostedAt(reply.createdAt)}
                                                          {reply.editedAt && (
                                                            <span className="ml-1">（編集済み）</span>
                                                          )}
                                                        </span>
                                                        {(reply.isMine || isAdmin) &&
                                                          editingCommentId !== reply.id && (
                                                            <>
                                                              {reply.isMine && (
                                                                <button
                                                                  onClick={() => {
                                                                    setEditingCommentId(reply.id);
                                                                    setEditingCommentText(
                                                                      reply.content,
                                                                    );
                                                                    setBoardError(null);
                                                                  }}
                                                                  className="text-[10px] text-gray-400 hover:text-gray-700"
                                                                >
                                                                  編集
                                                                </button>
                                                              )}
                                                              <button
                                                                onClick={() =>
                                                                  setConfirmDeleteComment({
                                                                    id: reply.id,
                                                                    postId: post.id,
                                                                  })
                                                                }
                                                                className="text-[10px] text-gray-400 hover:text-red-500"
                                                              >
                                                                削除
                                                              </button>
                                                            </>
                                                          )}
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
                                                name={me?.name ?? "会員"} url={me?.avatar_url}
                                                size="xs"
                                                className="mt-0.5"
                                              />
                                              <div className="flex-1 flex gap-1.5">
                                                <MentionTextarea
                                                  value={replyText}
                                                  minRows={1}
                                                  maxRows={8}
                                                  onChange={setReplyText}
                                                  onKeyDownExtra={(e) => {
                                                    if (
                                                      e.key === "Enter" &&
                                                      (e.metaKey || e.ctrlKey)
                                                    ) {
                                                      e.preventDefault();
                                                      void submitComment(post.id, comment.id);
                                                    }
                                                  }}
                                                  placeholder={`${replyTarget.authorName}さんに返信...（@で宛先）`}
                                                  wrapperClassName="flex-1"
                                                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                                                  autoFocus
                                                />
                                                <button
                                                  onClick={() =>
                                                    void submitComment(post.id, comment.id)
                                                  }
                                                  disabled={
                                                    !replyText.trim() ||
                                                    sendingComment === comment.id
                                                  }
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
                        <MemberAvatar name={me?.name ?? "会員"} url={me?.avatar_url} size="sm" className="mt-0.5" />
                        <div className="flex-1 flex gap-1.5">
                          {/* 🔴 1行入力だったので改行が入れられず、しかもEnterで
                                 送信していた。スマホのEnterは改行キーなので、
                                 改行したつもりで投稿されてしまう（実際に起きた）。
                                 テキストエリアにして、送信は送信ボタンだけにする。
                                 パソコン向けに Ctrl/⌘+Enter だけ残す。 */}
                          <MentionTextarea
                            value={commentInputs[post.id] ?? ""}
                            minRows={1}
                            maxRows={8}
                            onChange={(next) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: next }))
                            }
                            onKeyDownExtra={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                void submitComment(post.id);
                              }
                            }}
                            placeholder="コメントを追加...（@で宛先・改行できます）"
                            wrapperClassName="flex-1"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                          />
                          <button
                            onClick={() => void submitComment(post.id)}
                            disabled={
                              !(commentInputs[post.id] ?? "").trim() ||
                              sendingComment === post.id
                            }
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

      {/* エラーは画面の下に出す。編集も削除も画面のどこからでも押せるため */}
      {boardError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%]">
          <p className="text-xs bg-red-600 text-white rounded-xl px-4 py-3 shadow-lg">
            {boardError}
            <button
              onClick={() => setBoardError(null)}
              className="ml-2 underline"
            >
              閉じる
            </button>
          </p>
        </div>
      )}

      {/* 削除の確認。取り消せないので必ず一度止める */}
      {(confirmDeletePost || confirmDeleteComment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {confirmDeletePost ? "この投稿を削除しますか？" : "このコメントを削除しますか？"}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {confirmDeletePost
                ? "元に戻せません。付いているコメントも見えなくなります。"
                : "元に戻せません。返信が付いている場合は「削除されました」と表示され、返信は残ります。"}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setConfirmDeletePost(null);
                  setConfirmDeleteComment(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                やめる
              </button>
              <button
                onClick={() => {
                  if (confirmDeletePost) {
                    const id = confirmDeletePost;
                    setConfirmDeletePost(null);
                    void removePost(id);
                  } else if (confirmDeleteComment) {
                    const t = confirmDeleteComment;
                    setConfirmDeleteComment(null);
                    void removeComment(t.id, t.postId);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
