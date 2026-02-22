import { members } from "./mock-data";

export interface DashboardMember {
  id: string;
  slug: string;
  name: string;
  photoUrl: string;
  roleTitle: string;
  jobTitle: string;
  headline: string;
  trustScore: number;
  recommendationCount: number;
  contextTags: string[];
  referrer: string;
  industry: string;
}

export const dashboardMembers: DashboardMember[] = [
  {
    ...pick(members[0]),
    trustScore: 92,
    recommendationCount: 18,
    contextTags: ["接待・会食向き", "経営者同士の会食"],
    referrer: "創設メンバー",
    industry: "コンサル",
  },
  {
    ...pick(members[1]),
    trustScore: 85,
    recommendationCount: 12,
    contextTags: ["カジュアル", "一人で集中", "ビジネスに効く"],
    referrer: "田中 一郎",
    industry: "IT・テック",
  },
  {
    ...pick(members[2]),
    trustScore: 97,
    recommendationCount: 31,
    contextTags: ["接待・会食向き", "和食", "個室あり"],
    referrer: "田中 一郎",
    industry: "飲食",
  },
  {
    ...pick(members[3]),
    trustScore: 78,
    recommendationCount: 8,
    contextTags: ["接待・会食向き", "個室あり"],
    referrer: "渡辺 剛",
    industry: "不動産",
  },
  {
    ...pick(members[4]),
    trustScore: 81,
    recommendationCount: 14,
    contextTags: ["ヘルシー", "一人で集中", "読了後に語りたい一冊"],
    referrer: "山本 恵美",
    industry: "医療",
  },
  {
    ...pick(members[5]),
    trustScore: 88,
    recommendationCount: 22,
    contextTags: ["接待・会食向き", "ワインが充実"],
    referrer: "鈴木 健二",
    industry: "コンサル",
  },
  {
    id: "7",
    slug: "ogawa-risa",
    name: "小川 理沙",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    roleTitle: "Creative Director",
    jobTitle: "デザイナー",
    headline: "空間とブランドで、想いをカタチに",
    trustScore: 74,
    recommendationCount: 9,
    contextTags: ["カジュアル", "一人で集中", "大人の趣味"],
    referrer: "佐藤 裕樹",
    industry: "クリエイティブ",
  },
  {
    id: "8",
    slug: "morita-shun",
    name: "森田 駿",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    roleTitle: "代表取締役",
    jobTitle: "人材紹介業",
    headline: "人と企業の最高の出会いを創る",
    trustScore: 83,
    recommendationCount: 15,
    contextTags: ["カジュアル", "大人数OK", "週末のアクティビティ"],
    referrer: "田中 一郎",
    industry: "経営者",
  },
  {
    id: "9",
    slug: "fujita-mai",
    name: "藤田 舞",
    photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face",
    roleTitle: "CEO",
    jobTitle: "Eコマース経営",
    headline: "ローカルの魅力を、世界に届ける",
    trustScore: 79,
    recommendationCount: 11,
    contextTags: ["カジュアル", "ヘルシー", "週末のアクティビティ"],
    referrer: "中村 明子",
    industry: "IT・テック",
  },
  {
    id: "10",
    slug: "honda-koji",
    name: "本田 浩二",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    roleTitle: "オーナー",
    jobTitle: "飲食店グループ経営",
    headline: "食で街を元気にする",
    trustScore: 95,
    recommendationCount: 28,
    contextTags: ["接待・会食向き", "和食", "個室あり"],
    referrer: "山本 恵美",
    industry: "飲食",
  },
];

function pick(m: (typeof members)[number]) {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    photoUrl: m.photoUrl,
    roleTitle: m.roleTitle,
    jobTitle: m.jobTitle,
    headline: m.headline,
  };
}

export const industryFilters = [
  "全員",
  "経営者",
  "IT・テック",
  "飲食",
  "不動産",
  "医療",
  "クリエイティブ",
  "コンサル",
];

export const communityStats = {
  memberCount: 48,
  recommendationCount: 156,
  monthlyPosts: 23,
};

// --- Profile page data ---

export interface Recommendation {
  id: string;
  restaurantName: string;
  area: string;
  genre: string;
  story: string;
  contextTags: string[];
  postedAt: string;
}

export interface Endorsement {
  fromId: string;
  fromName: string;
  fromPhotoUrl: string;
  tags: [string, string, string];
  comment: string;
}

export interface ProfileStory {
  origin: string;        // きっかけ
  turning: string;       // 転機
  now: string;           // 今
  passion: string;       // 好きなもの
  values: string;        // 大事にしていること
  coreValues: [string, string, string]; // 大切にしていること（3つ）
  childhood: string;     // 学生の頃はどんな子供だった？
  lookingFor: string;    // こんな人と繋がりたい
  endorsements: Endorsement[]; // 他者からの一言
}

export interface MemberProfile extends DashboardMember {
  storyOrigin: string;
  storyNow: string;
  profileStory: ProfileStory;
  servicesSummary: string;
  referralChain: string[];
  recommendations: Recommendation[];
}

const storyMap: Record<string, { storyOrigin: string; storyNow: string; profileStory: ProfileStory; servicesSummary: string }> = {
  "1": { storyOrigin: members[0].storyOrigin, storyNow: members[0].storyNow, servicesSummary: members[0].servicesSummary, profileStory: {
    origin: "新卒で入った会社が倒産寸前で、再建プロジェクトに飛び込んだのが原点。",
    turning: "30歳の時、クライアント企業の再建に成功。組織が変わる瞬間の熱量に取り憑かれて独立を決意。",
    now: "経営コンサルタントとして、中小企業の組織変革を支援しています。",
    passion: "週末の築地の朝市巡り。あと最近はサウナにハマってます。",
    values: "人の可能性を最後まで信じること。「もう無理」の先にいつもブレイクスルーがある。",
    coreValues: ["約束を守ること。小さな信頼の積み重ねが全て。", "相手の可能性を最後まで信じ抜くこと。", "現場に足を運ぶこと。数字だけでは見えないものがある。"],
    childhood: "野球少年。キャプテンを任されてから、チームをまとめることが好きになった。",
    lookingFor: "業界問わず、組織づくりに本気で向き合っている経営者の方。",
    endorsements: [
      { fromId: "2", fromName: "佐藤 裕樹", fromPhotoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", tags: ["熱い", "信頼できる", "面倒見がいい"], comment: "本気で人に向き合う人。困った時に真っ先に相談したくなる存在です。" },
      { fromId: "3", fromName: "山本 恵美", fromPhotoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", tags: ["頼れる兄貴", "行動力", "グルメ"], comment: "お店選びのセンスが抜群。紹介してもらった人とは必ず良いご縁になります。" },
    ],
  } },
  "2": { storyOrigin: members[1].storyOrigin, storyNow: members[1].storyNow, servicesSummary: members[1].servicesSummary, profileStory: {
    origin: "大学時代に作ったアプリがバズって、そのまま起業。",
    turning: "東京での成功に満足できず、地方のDXに可能性を感じて福岡に移住。",
    now: "地方自治体や中小企業のDX支援を行うIT企業を経営しています。",
    passion: "プログラミングと釣り。コードも魚も、粘った先に大物がかかる。",
    values: "テクノロジーは人を幸せにするためにある。効率化の先にある「ゆとり」を届けたい。",
    coreValues: ["技術は手段。目的は人の幸せであること。", "地方にこそ、テクノロジーの恩恵を届けたい。", "コードの美しさにこだわること。美しいコードは壊れにくい。"],
    childhood: "パソコンオタク。文化祭でゲームを作って売ってた。",
    lookingFor: "地方でビジネスをしている方、DXに興味のある経営者の方。",
    endorsements: [
      { fromId: "1", fromName: "田中 一郎", fromPhotoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", tags: ["天才肌", "実行力", "謙虚"], comment: "技術力だけでなく、ビジネスの本質を理解している稀有なエンジニア経営者。" },
    ],
  } },
  "3": { storyOrigin: members[2].storyOrigin, storyNow: members[2].storyNow, servicesSummary: members[2].servicesSummary, profileStory: {
    origin: "母の手料理が原点。食卓の幸せを広げたくて料理の道へ。",
    turning: "パリの三ツ星で修行中、日本の食材の素晴らしさに改めて気づいた。",
    now: "大阪・北新地で割烹を経営。地元の食材にこだわった和食を提供しています。",
    passion: "早朝の市場巡りと、器集め。料理は器で完成すると思っています。",
    values: "食を通じて人を笑顔にすること。一皿に想いを込める。",
    coreValues: ["素材への敬意を忘れないこと。", "お客様の表情を見て、料理を仕上げること。", "季節を大切にすること。旬のものに勝る調味料はない。"],
    childhood: "おばあちゃん子。台所に立って一緒に料理するのが日課だった。",
    lookingFor: "食に情熱のある方、コラボイベントを一緒にやれる方。",
    endorsements: [
      { fromId: "1", fromName: "田中 一郎", fromPhotoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", tags: ["本物の料理人", "温かい", "情熱"], comment: "料理だけでなく、人柄が素晴らしい。お店に行くたびに元気をもらえる。" },
    ],
  } },
  "4": { storyOrigin: members[3].storyOrigin, storyNow: members[3].storyNow, servicesSummary: members[3].servicesSummary, profileStory: {
    origin: "父の不動産会社に入社。従来のやり方に疑問を持ち始めた。",
    turning: "古いビルのリノベーションで街が変わるのを目の当たりにして、事業を転換。",
    now: "リノベーション特化の不動産デベロッパーとして、街に価値を生む開発をしています。",
    passion: "街歩きと建築巡り。古い建物のポテンシャルを見つけるのが好き。",
    values: "街に価値を生む開発。利益だけでなく、そこに暮らす人の豊かさを考える。",
    coreValues: ["その街に暮らす人の目線で考えること。", "古いものの中にある価値を見逃さないこと。", "利益と社会貢献は両立できると信じること。"],
    childhood: "LEGOに没頭してた。何かを作ることがずっと好き。",
    lookingFor: "不動産に興味のある方、オフィス移転やリノベを検討中の方。",
    endorsements: [
      { fromId: "6", fromName: "渡辺 剛", fromPhotoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face", tags: ["ビジョナリー", "誠実", "センスがいい"], comment: "数字だけでなく、街の未来を考えて開発する姿勢に共感しています。" },
    ],
  } },
  "5": { storyOrigin: members[4].storyOrigin, storyNow: members[4].storyNow, servicesSummary: members[4].servicesSummary, profileStory: {
    origin: "勤務医時代、患者さんの生活習慣を変えることの難しさと大切さを痛感。",
    turning: "予防医療に特化したクリニックを開業。経営の面白さにも目覚める。",
    now: "クリニック経営と並行して、企業向け健康経営コンサルも手掛けています。",
    passion: "ヨガと読書。心と体の健康は経営の土台だと実感しています。",
    values: "治療より予防。一人ひとりの人生に寄り添う医療を目指しています。",
    coreValues: ["治療より予防。病気になる前に手を差し伸べたい。", "エビデンスに基づいた判断を大切にすること。", "患者さんの人生全体を見て、寄り添うこと。"],
    childhood: "生き物が好きな理科少女。カエルの観察日記を3年間続けた。",
    lookingFor: "健康経営に関心のある経営者の方、ヘルスケア領域でコラボできる方。",
    endorsements: [
      { fromId: "1", fromName: "田中 一郎", fromPhotoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", tags: ["聡明", "芯が強い", "優しい"], comment: "健康経営セミナーで共演。エビデンスに基づいた話が説得力抜群です。" },
    ],
  } },
  "6": { storyOrigin: members[5].storyOrigin, storyNow: members[5].storyNow, servicesSummary: members[5].servicesSummary, profileStory: {
    origin: "証券会社で機関投資家向けの営業を経験。数字の向こうにある人生に興味を持った。",
    turning: "リーマンショックを経て、個人の経営者に寄り添うアドバイザーとして独立。",
    now: "経営者の資産運用と事業承継を専門にサポートしています。",
    passion: "ワインと日本酒。銘柄の背景を知ると味が変わるのが面白い。",
    values: "数字の向こうにある人生を見ること。お金は手段であって目的ではない。",
    coreValues: ["お金は手段。その先にある人生を一緒に考えること。", "リスクから目を背けず、正直に伝えること。", "長期的な信頼関係を最優先にすること。"],
    childhood: "将棋部。先を読む習慣はここで身についた。",
    lookingFor: "資産運用や事業承継を考えている経営者の方。",
    endorsements: [
      { fromId: "4", fromName: "鈴木 健二", fromPhotoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", tags: ["冷静", "頭が切れる", "頼りになる"], comment: "複雑な案件でも的確なアドバイスをくれる。ワインの話も面白い。" },
    ],
  } },
  "7": { storyOrigin: "美大卒業後、大手広告代理店でブランディングを経験。独立後はカフェやレストランの空間デザインを手掛けています。", storyNow: "「食べる」だけでなく「過ごす」体験をデザインすることにこだわっています。空間が変われば、料理の味まで変わる。", servicesSummary: "ブランドデザイン / 店舗空間設計 / VI制作", profileStory: {
    origin: "美大時代にカフェでバイトしていて、空間が人の気持ちを変えることに気づいた。",
    turning: "大手広告代理店を辞めて独立。飲食店の空間デザインに絞ることを決意。",
    now: "カフェやレストランの空間デザインを専門に手掛けています。",
    passion: "インテリアショップ巡りとスケッチ。旅先では必ずカフェに入ります。",
    values: "空間は体験そのもの。居心地の良さは、細部の積み重ねでしか生まれない。",
    coreValues: ["細部にこだわること。神は細部に宿る。", "使う人の気持ちを想像して設計すること。", "美しさと機能性は両立できると信じること。"],
    childhood: "絵を描くのが好きで、部屋の模様替えばかりしてた。",
    lookingFor: "店舗の新規出店やリブランディングを考えている方。",
    endorsements: [
      { fromId: "3", fromName: "山本 恵美", fromPhotoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", tags: ["センス抜群", "こだわり", "話しやすい"], comment: "うちの店の内装もお願いしました。空間が変わるとお客さんの表情も変わる。" },
    ],
  } },
  "8": { storyOrigin: "リクルートで法人営業を経験後、人材紹介会社を設立。経営者同士をつなぐことが一番の喜びです。", storyNow: "人と人をつなぐ場として、食事の場が最も大切だと気づきました。良いお店を知っていることが、最高の営業ツールです。", servicesSummary: "エグゼクティブ人材紹介 / 経営者マッチング / 採用コンサルティング", profileStory: {
    origin: "リクルート時代、人の転職で人生が変わる瞬間を何度も見た。",
    turning: "「会社に合う人」でなく「人に合う会社」を見つけたいと思い独立。",
    now: "経営幹部の人材紹介と経営者同士のマッチングを行っています。",
    passion: "ワインと人脈づくり。良い出会いは良い食事から生まれると信じています。",
    values: "人と人を繋ぐことで、双方の人生が豊かになること。",
    coreValues: ["紹介は責任。双方が幸せになる出会いだけを届けること。", "人の良いところを見つけて、言葉にすること。", "損得ではなく、ご縁で動くこと。"],
    childhood: "クラスの仲裁役。人と人の間に立つのが得意だった。",
    lookingFor: "経営幹部の採用を考えている方、良い人材を探している経営者の方。",
    endorsements: [
      { fromId: "1", fromName: "田中 一郎", fromPhotoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", tags: ["人脈の鬼", "気配り", "ムードメーカー"], comment: "森田さんに紹介された人で外れたことがない。人を見る目が本物。" },
    ],
  } },
  "9": { storyOrigin: "地方の特産品をECで全国に届ける事業を立ち上げました。生産者さんの想いを伝えることが使命です。", storyNow: "生産者さんに会いに行くたびに、地元のお店で食事をするのが楽しみ。その土地の味が、その土地の人の温かさを教えてくれます。", servicesSummary: "EC事業運営 / 地方創生プロデュース / D2Cブランド構築", profileStory: {
    origin: "旅先で出会った農家さんの想いに感動して、届ける仕事をしようと決めた。",
    turning: "クラウドファンディングで初プロジェクトが大成功。地方創生の道へ。",
    now: "地方の特産品をECで全国に届ける事業を運営しています。",
    passion: "全国の生産者さんを訪ねること。その土地の食と人に出会う旅。",
    values: "つくる人の想いを、届ける人が伝える。食のストーリーを大切にしたい。",
    coreValues: ["つくる人の想いを、そのまま届けること。", "現地に行くこと。画面越しでは伝わらないものがある。", "売れる仕組みより、伝わる仕組みをつくること。"],
    childhood: "田舎育ちで、おじいちゃんの畑で遊んでた。土の匂いが好きだった。",
    lookingFor: "地方の食材やプロダクトに興味のある方、ECやD2Cに関心のある方。",
    endorsements: [
      { fromId: "3", fromName: "山本 恵美", fromPhotoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", tags: ["情熱的", "行動力", "食への愛"], comment: "藤田さんが届けてくれる食材は、どれもストーリーがあって料理が楽しくなる。" },
    ],
  } },
  "10": { storyOrigin: "料理人として修行を積んだ後、30歳で独立。今は和食を中心に3店舗を経営しています。", storyNow: "お店は「美味しい」だけでは足りない。来てくれた人の人生の一場面に寄り添える場所でありたいと思っています。", servicesSummary: "飲食店グループ経営 / メニュー開発 / 飲食店コンサルティング", profileStory: {
    origin: "高校時代に母が作ってくれた弁当がきっかけ。料理で人を幸せにしたいと思った。",
    turning: "修行先の親方に「お前は経営者になれ」と言われ、30歳で独立。",
    now: "和食を中心に3店舗を経営。後進の育成にも力を入れています。",
    passion: "食材の産地巡りと器探し。料理は五感で楽しむもの。",
    values: "お店は料理だけじゃない。来てくれた人の大切な時間に寄り添う場所でありたい。",
    coreValues: ["料理は愛情。手を抜いた瞬間、味に出る。", "スタッフを家族のように大切にすること。", "お客様の「大切な一日」に寄り添う場所であること。"],
    childhood: "母の手伝いで台所に立つのが日課。給食のおかわりじゃんけんは負けなし。",
    lookingFor: "飲食業に興味のある方、新メニューやコラボを一緒に考えられる方。",
    endorsements: [
      { fromId: "8", fromName: "森田 駿", fromPhotoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", tags: ["職人気質", "人情", "本物"], comment: "料理への情熱はもちろん、スタッフへの愛情が深い。一緒にいると元気になれる人。" },
    ],
  } },
};

const recommendationsMap: Record<string, Recommendation[]> = {
  "1": [
    { id: "r1", restaurantName: "鮨 まつもと", area: "大阪・北新地", genre: "寿司", story: "大切な商談の前日に訪れた一軒。大将の丁寧な仕事に心が落ち着き、翌日の商談は見事に成功。以来、勝負の前夜はここと決めています。", contextTags: ["接待・会食向き", "個室あり"], postedAt: "2025-12-10" },
    { id: "r2", restaurantName: "リストランテ ルーチェ", area: "大阪・西天満", genre: "イタリアン", story: "クライアントとの会食で何度も使わせてもらっているお店。シェフの温かい人柄と、落ち着いた雰囲気が商談を後押ししてくれます。", contextTags: ["接待・会食向き", "経営者同士の会食"], postedAt: "2025-11-22" },
  ],
  "2": [
    { id: "r3", restaurantName: "珈琲 蘭館", area: "大阪・本町", genre: "カフェ", story: "コードを書く手が止まった時、ここのカウンターに座ると不思議とアイデアが降りてくる。マスターの淹れるコーヒーは思考を整理してくれる。", contextTags: ["一人で集中", "カジュアル"], postedAt: "2025-12-05" },
  ],
  "3": [
    { id: "r4", restaurantName: "割烹 田中", area: "大阪・北新地", genre: "和食", story: "季節の食材を使った料理は、食べるたびに日本の四季を感じさせてくれます。大将との会話も楽しみのひとつ。", contextTags: ["接待・会食向き", "和食"], postedAt: "2025-12-15" },
    { id: "r5", restaurantName: "ビストロ マルシェ", area: "大阪・中之島", genre: "フレンチ", story: "気取らないフレンチが最高。シェフが市場で仕入れたその日の食材で作る料理は、毎回違う感動がある。", contextTags: ["カジュアル", "経営者同士の会食"], postedAt: "2025-11-30" },
    { id: "r6", restaurantName: "蕎麦 よしむら", area: "京都・祇園", genre: "蕎麦", story: "修行先の大将に連れて行ってもらったお店。蕎麦の香りと、静かな空間が心を洗ってくれます。", contextTags: ["一人で集中", "和食"], postedAt: "2025-10-18" },
  ],
  "4": [
    { id: "r7", restaurantName: "焼肉 万両", area: "大阪・南森町", genre: "焼肉", story: "不動産の契約が成立した日、お客様をお連れする定番のお店。個室の落ち着いた空間が、信頼関係をさらに深めてくれます。", contextTags: ["接待・会食向き", "個室あり"], postedAt: "2025-11-08" },
  ],
  "5": [
    { id: "r8", restaurantName: "自然食レストラン みどり", area: "大阪・中崎町", genre: "自然食", story: "患者さんに食事指導をする立場として、まず自分が本物の食を知る必要がある。ここの料理は、体が喜ぶのがわかります。", contextTags: ["ヘルシー", "一人で集中"], postedAt: "2025-12-01" },
  ],
  "6": [
    { id: "r9", restaurantName: "ワインバー CAVA", area: "大阪・心斎橋", genre: "ワインバー", story: "100種類以上のワインリストから、ソムリエが商談相手の好みに合わせてセレクトしてくれる。ここでの食事が、何度も取引につながった。", contextTags: ["接待・会食向き", "ワインが充実"], postedAt: "2025-12-08" },
  ],
  "7": [
    { id: "r10", restaurantName: "カフェ LIGHT", area: "大阪・靱公園", genre: "カフェ", story: "内装デザインの参考にもなる、美しい空間。光の入り方、家具の配置、すべてが計算されていて、でも居心地がいい。仕事の合間に立ち寄りたくなる。", contextTags: ["一人で集中", "カジュアル"], postedAt: "2025-11-25" },
  ],
  "8": [
    { id: "r11", restaurantName: "炭火焼鳥 やまもと", area: "大阪・福島", genre: "焼鳥", story: "候補者との面談後、ここで一杯やりながら本音を引き出す。カウンター席の距離感が、人と人の距離を縮めてくれる。", contextTags: ["カジュアル", "経営者同士の会食"], postedAt: "2025-12-12" },
  ],
  "9": [
    { id: "r12", restaurantName: "農家レストラン みのり", area: "長野・安曇野", genre: "和食", story: "取引先の農家さんに連れて行ってもらった一軒。採れたての野菜がこんなに美味しいのかと衝撃を受けました。子どもたちも大喜び。", contextTags: ["家族向き", "ヘルシー"], postedAt: "2025-11-15" },
  ],
  "10": [
    { id: "r13", restaurantName: "天ぷら 大阪あら川", area: "大阪・本町", genre: "天ぷら", story: "同業として尊敬する大将の仕事。さつまいもの天ぷらを食べた時、料理とは素材への敬意だと改めて教わりました。", contextTags: ["接待・会食向き", "和食"], postedAt: "2025-12-03" },
    { id: "r14", restaurantName: "日本料理 かが万", area: "大阪・北浜", genre: "日本料理", story: "海外のゲストをお連れすると必ず感動される。日本料理の可能性を見せてくれるお店です。", contextTags: ["接待・会食向き", "個室あり"], postedAt: "2025-10-28" },
  ],
};

const referralChainMap: Record<string, string[]> = {
  "1": ["創設メンバー"],
  "2": ["創設メンバー", "田中 一郎"],
  "3": ["創設メンバー", "田中 一郎"],
  "4": ["創設メンバー", "田中 一郎", "渡辺 剛"],
  "5": ["創設メンバー", "田中 一郎", "山本 恵美"],
  "6": ["創設メンバー", "田中 一郎", "渡辺 剛", "鈴木 健二"],
  "7": ["創設メンバー", "田中 一郎", "佐藤 裕樹"],
  "8": ["創設メンバー", "田中 一郎"],
  "9": ["創設メンバー", "田中 一郎", "山本 恵美", "中村 明子"],
  "10": ["創設メンバー", "田中 一郎", "山本 恵美"],
};

// --- Referral tree data ---

export interface TreeNode {
  id: string;
  name: string;
  photoUrl: string;
  roleTitle: string;
  trustScore: number;
  children: TreeNode[];
}

function dm(id: string) {
  const m = dashboardMembers.find((x) => x.id === id)!;
  return { id: m.id, name: m.name, photoUrl: m.photoUrl, roleTitle: m.roleTitle, trustScore: m.trustScore };
}

export const referralTree: TreeNode = {
  id: "0",
  name: "創設メンバー",
  photoUrl: "",
  roleTitle: "ガイアの酒場",
  trustScore: 100,
  children: [
    {
      ...dm("1"),
      children: [
        {
          ...dm("2"),
          children: [
            { ...dm("7"), children: [] },
          ],
        },
        {
          ...dm("3"),
          children: [
            {
              ...dm("5"),
              children: [
                { ...dm("9"), children: [] },
              ],
            },
            { ...dm("10"), children: [] },
          ],
        },
        { ...dm("8"), children: [] },
        {
          ...dm("6"),
          children: [
            { ...dm("4"), children: [] },
          ],
        },
      ],
    },
  ],
};

// --- Discover page data ---

export interface DiscoverRecommendation extends Recommendation {
  memberId: string;
  memberName: string;
  memberPhotoUrl: string;
  memberTrustScore: number;
}

export function getAllRecommendations(): DiscoverRecommendation[] {
  return dashboardMembers.flatMap((m) => {
    const recs = recommendationsMap[m.id] || [];
    return recs.map((r) => ({
      ...r,
      memberId: m.id,
      memberName: m.name,
      memberPhotoUrl: m.photoUrl,
      memberTrustScore: m.trustScore,
    }));
  });
}

export function getMemberProfile(id: string): MemberProfile | undefined {
  const member = dashboardMembers.find((m) => m.id === id);
  if (!member) return undefined;

  const story = storyMap[id] || { storyOrigin: "", storyNow: "", servicesSummary: "", profileStory: { origin: "", turning: "", now: "", passion: "", values: "", coreValues: ["", "", ""] as [string, string, string], childhood: "", lookingFor: "", endorsements: [] } };

  return {
    ...member,
    ...story,
    referralChain: referralChainMap[id] || [],
    recommendations: recommendationsMap[id] || [],
  };
}
