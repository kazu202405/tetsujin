"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Hash,
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
} from "lucide-react";

// チャンネル定義
const channels = [
  { id: "welcome", name: "新規ご入会挨拶", icon: PartyPopper, color: "text-pink-500" },
  { id: "chat", name: "つぶやき・雑談", icon: Coffee, color: "text-amber-500" },
  { id: "gallery", name: "みんなのギャラリー", icon: ImagePlus, color: "text-blue-500" },
  { id: "exchange", name: "○○さんと交流しました", icon: Handshake, color: "text-green-500" },
  { id: "club", name: "部活動：全", icon: Dumbbell, color: "text-purple-500" },
  { id: "announce", name: "告知します！", icon: Megaphone, color: "text-red-500" },
  { id: "referral", name: "紹介と依頼", icon: ArrowUpRight, color: "text-indigo-500" },
] as const;

type ChannelId = (typeof channels)[number]["id"];

interface Post {
  id: string;
  channelId: ChannelId;
  author: {
    id: string;
    name: string;
    photoUrl: string;
    roleTitle: string;
  };
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  postedAt: string;
}

// モックデータ
const mockPosts: Post[] = [
  {
    id: "p1",
    channelId: "welcome",
    author: { id: "a1", name: "高橋 美咲", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face", roleTitle: "Webデザイナー" },
    content: "はじめまして！Webデザイナーの高橋です。田中さんのご紹介で入会しました。大阪でフリーランスとして活動しています。皆さんとの交流を楽しみにしています！よろしくお願いします🙏",
    likes: 12,
    comments: 5,
    isLiked: true,
    postedAt: "2026-03-02 14:30",
  },
  {
    id: "p2",
    channelId: "welcome",
    author: { id: "a2", name: "松本 大輔", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産仲介業" },
    content: "初めまして、松本です！不動産仲介をやっております。鈴木さんからのご紹介です。物件のことならなんでもご相談ください。これからよろしくお願いします！",
    likes: 8,
    comments: 3,
    isLiked: false,
    postedAt: "2026-03-01 10:15",
  },
  {
    id: "p3",
    channelId: "chat",
    author: { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", roleTitle: "IT起業家" },
    content: "今日は梅田のスターバックスでリモートワーク中。新しいアプリのプロトタイプが完成しました！誰かレビューしてくれる人いませんか〜？",
    likes: 6,
    comments: 4,
    isLiked: false,
    postedAt: "2026-03-03 09:00",
  },
  {
    id: "p4",
    channelId: "chat",
    author: { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", roleTitle: "医師・クリニック経営" },
    content: "花粉の季節ですね...。今年は特にひどいそうです。対策はお早めに！ちなみにうちのクリニックでも花粉症の初診受け付けてますので、お気軽にどうぞ。",
    likes: 15,
    comments: 7,
    isLiked: true,
    postedAt: "2026-03-02 18:45",
  },
  {
    id: "p5",
    channelId: "gallery",
    author: { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", roleTitle: "デザイナー" },
    content: "先日手掛けたカフェの内装が完成しました！コンセプトは「光と木のぬくもり」。オーナーさんにもとても喜んでいただけて嬉しいです。",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop",
    likes: 24,
    comments: 8,
    isLiked: true,
    postedAt: "2026-03-01 16:20",
  },
  {
    id: "p6",
    channelId: "exchange",
    author: { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", roleTitle: "経営コンサルタント" },
    content: "本田さんと北新地の鮨まつもとで会食しました！飲食業界のリアルな話を聞けて、めちゃくちゃ勉強になりました。新メニュー開発のコラボも進みそうです。",
    likes: 18,
    comments: 6,
    isLiked: false,
    postedAt: "2026-03-01 22:00",
  },
  {
    id: "p7",
    channelId: "club",
    author: { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", roleTitle: "人材紹介業" },
    content: "【ゴルフ部】今月の活動報告です⛳\n3/15（土）枚方カントリーで12名でラウンドしてきました。天気も最高で、スコアも...まあまあでした（笑）。来月は4/19を予定しています。初心者大歓迎です！",
    likes: 10,
    comments: 4,
    isLiked: false,
    postedAt: "2026-03-02 20:30",
  },
  {
    id: "p8",
    channelId: "announce",
    author: { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", roleTitle: "オーナーシェフ" },
    content: "🎉 お知らせ！\n4月から北新地に2号店をオープンすることになりました。TETSUJIN会メンバーさんにはプレオープンにご招待したいと思います。詳細は追ってお知らせしますので、お楽しみに！",
    likes: 32,
    comments: 14,
    isLiked: true,
    postedAt: "2026-03-03 12:00",
  },
  {
    id: "p9",
    channelId: "referral",
    author: { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産デベロッパー" },
    content: "【紹介依頼】\n中之島エリアで50坪前後のオフィスを探しているクライアントがいます。リノベーション済みの物件があれば理想的です。心当たりのある方、DMいただけると嬉しいです！",
    likes: 5,
    comments: 3,
    isLiked: false,
    postedAt: "2026-03-02 11:00",
  },
  {
    id: "p10",
    channelId: "referral",
    author: { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face", roleTitle: "ファイナンシャルアドバイザー" },
    content: "【ご紹介】\n先日お話しした事業承継のセミナー、4月に開催が決まりました。定員20名で、メンバーさん優先でご案内します。興味ある方はコメントかDMください！",
    likes: 9,
    comments: 5,
    isLiked: false,
    postedAt: "2026-03-01 15:30",
  },
];

export default function BoardPage() {
  const [activeChannel, setActiveChannel] = useState<ChannelId>("welcome");
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState(mockPosts);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const channelPosts = useMemo(
    () => posts.filter((p) => p.channelId === activeChannel),
    [posts, activeChannel]
  );

  const activeChannelData = channels.find((c) => c.id === activeChannel)!;

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: `p${Date.now()}`,
      channelId: activeChannel,
      author: {
        id: "1",
        name: "田中 一郎",
        photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
        roleTitle: "経営コンサルタント",
      },
      content: newPost,
      likes: 0,
      comments: 0,
      isLiked: false,
      postedAt: new Date().toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\//g, "-"),
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost("");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* チャンネルサイドバー（デスクトップ） */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">掲示板</h2>
          <p className="text-xs text-gray-400 mt-0.5">チャンネルを選択</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {channels.map((ch) => {
            const count = posts.filter((p) => p.channelId === ch.id).length;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                  activeChannel === ch.id
                    ? "bg-gray-100 text-gray-900 font-bold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <ch.icon className={`w-4 h-4 flex-shrink-0 ${ch.color}`} />
                <span className="flex-1 truncate">{ch.name}</span>
                {count > 0 && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
            {/* モバイルチャンネル選択 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            >
              <Hash className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <activeChannelData.icon
                className={`w-5 h-5 ${activeChannelData.color}`}
              />
              <h1 className="text-base font-bold text-gray-900">
                {activeChannelData.name}
              </h1>
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {channelPosts.length}件の投稿
            </span>
          </div>

          {/* モバイルチャンネルリスト */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannel(ch.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left ${
                    activeChannel === ch.id
                      ? "bg-gray-100 text-gray-900 font-bold"
                      : "text-gray-500"
                  }`}
                >
                  <ch.icon className={`w-4 h-4 ${ch.color}`} />
                  {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 投稿フォーム */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-3">
            <img
              src="https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face"
              alt=""
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow flex-shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`${activeChannelData.name}に投稿...`}
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePost}
                  disabled={!newPost.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  投稿
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 投稿一覧 */}
        <div className="flex-1 overflow-y-auto">
          {channelPosts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {channelPosts.map((post) => (
                <div
                  key={post.id}
                  className="px-4 sm:px-6 py-5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex gap-3">
                    <Link href={`/app/profile/${post.author.id}`}>
                      <img
                        src={post.author.photoUrl}
                        alt={post.author.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow hover:ring-2 hover:ring-amber-300 transition-all flex-shrink-0"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/app/profile/${post.author.id}`}
                          className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
                        >
                          {post.author.name}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {post.author.roleTitle}
                        </span>
                        <span className="text-xs text-gray-300 ml-auto flex-shrink-0">
                          {post.postedAt}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                        {post.content}
                      </p>

                      {post.imageUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden max-w-lg">
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                            post.isLiked
                              ? "text-pink-500"
                              : "text-gray-400 hover:text-pink-500"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`}
                          />
                          {post.likes}
                        </button>
                        <button className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          {post.comments}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <activeChannelData.icon
                className={`w-10 h-10 mx-auto mb-3 ${activeChannelData.color} opacity-30`}
              />
              <p className="text-sm text-gray-400">
                まだ投稿がありません
              </p>
              <p className="text-xs text-gray-300 mt-1">
                最初の投稿をしてみましょう
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
