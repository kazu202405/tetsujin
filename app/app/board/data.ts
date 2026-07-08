// 掲示板の投稿データ（mock）
// - board 本体とマイページのプレビューが同じ元データを参照するための単一ソース。
// - TODO: 本連携は入金後に Supabase（posts / comments テーブル）へ。

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    photoUrl: string;
    roleTitle: string;
  };
  content: string;
  postedAt: string;
  replies: Comment[];
}

export interface Post {
  id: string;
  channelId: string;
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
  postedAt: string; // "YYYY-MM-DD HH:MM"
}

// 現在のユーザー情報
export const currentUser = {
  id: "1",
  name: "田中 一郎",
  photoUrl:
    "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
  roleTitle: "経営コンサルタント",
};

// モックデータ
export const mockPosts: Post[] = [
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

// モックコメントデータ
export const mockComments: Record<string, Comment[]> = {
  p1: [
    {
      id: "c1-1",
      author: { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", roleTitle: "IT起業家" },
      content: "高橋さん、入会おめでとうございます！大阪のWeb界隈、盛り上がってますよね。ぜひ情報交換しましょう！",
      postedAt: "2026-03-02 15:00",
      replies: [
        {
          id: "c1-1-r1",
          author: { id: "a1", name: "高橋 美咲", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face", roleTitle: "Webデザイナー" },
          content: "佐藤さん、ありがとうございます！ぜひよろしくお願いします🙌",
          postedAt: "2026-03-02 15:30",
          replies: [],
        },
      ],
    },
    {
      id: "c1-2",
      author: { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", roleTitle: "経営コンサルタント" },
      content: "ようこそ！高橋さんのポートフォリオ、以前拝見しましたがとても素敵でした。",
      postedAt: "2026-03-02 16:00",
      replies: [],
    },
  ],
  p3: [
    {
      id: "c3-1",
      author: { id: "a1", name: "高橋 美咲", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face", roleTitle: "Webデザイナー" },
      content: "レビューしますよ！UIデザインの観点からフィードバックできると思います。",
      postedAt: "2026-03-03 09:30",
      replies: [
        {
          id: "c3-1-r1",
          author: { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", roleTitle: "IT起業家" },
          content: "ありがとうございます！DM送りますね！",
          postedAt: "2026-03-03 09:45",
          replies: [],
        },
      ],
    },
  ],
  p5: [
    {
      id: "c5-1",
      author: { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", roleTitle: "オーナーシェフ" },
      content: "素敵！うちのお店もいつかリニューアルする時にお願いしたいです✨",
      postedAt: "2026-03-01 17:00",
      replies: [],
    },
    {
      id: "c5-2",
      author: { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", roleTitle: "経営コンサルタント" },
      content: "光の使い方が素晴らしいですね。どこのカフェですか？",
      postedAt: "2026-03-01 18:00",
      replies: [
        {
          id: "c5-2-r1",
          author: { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", roleTitle: "デザイナー" },
          content: "ありがとうございます！北浜のカフェです。今度ご案内しますよ☕",
          postedAt: "2026-03-01 19:00",
          replies: [],
        },
      ],
    },
  ],
  p8: [
    {
      id: "c8-1",
      author: { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産デベロッパー" },
      content: "おめでとうございます！北新地なら物件探しお手伝いできますよ。",
      postedAt: "2026-03-03 12:30",
      replies: [],
    },
    {
      id: "c8-2",
      author: { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", roleTitle: "医師・クリニック経営" },
      content: "プレオープン楽しみにしてます！2号店のコンセプトは？",
      postedAt: "2026-03-03 13:00",
      replies: [
        {
          id: "c8-2-r1",
          author: { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", roleTitle: "オーナーシェフ" },
          content: "和モダンで、カウンター中心の小さなお店にする予定です！詳細はまた投稿しますね。",
          postedAt: "2026-03-03 14:00",
          replies: [],
        },
      ],
    },
  ],
};
