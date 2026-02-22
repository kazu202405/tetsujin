import { Member, Tag } from "./types";

export const tags: Tag[] = [
  { id: "1", name: "IT・テクノロジー", type: "industry" },
  { id: "2", name: "飲食・フード", type: "industry" },
  { id: "3", name: "不動産", type: "industry" },
  { id: "4", name: "コンサルティング", type: "industry" },
  { id: "5", name: "医療・ヘルスケア", type: "industry" },
  { id: "6", name: "東京", type: "region" },
  { id: "7", name: "大阪", type: "region" },
  { id: "8", name: "福岡", type: "region" },
  { id: "9", name: "組織づくり", type: "challenge" },
  { id: "10", name: "事業承継", type: "challenge" },
  { id: "11", name: "新規事業", type: "challenge" },
  { id: "12", name: "マーケティング", type: "strength" },
  { id: "13", name: "ファイナンス", type: "strength" },
  { id: "14", name: "人材育成", type: "strength" },
];

export const members: Member[] = [
  {
    id: "1",
    slug: "tanaka-ichiro",
    name: "田中 一郎",
    photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    headline: "人の可能性を信じ、組織を変える",
    roleTitle: "代表取締役",
    jobTitle: "経営コンサルタント",
    storyOrigin: "大手商社で10年間、海外事業の立ち上げに携わってきました。数字を追いかける日々の中で、いつしか「人」を見失っていた自分に気づいたのは、部下が突然退職を申し出た時でした。",
    storyTurningPoint: "その部下の「田中さんは、僕のことを駒としか見ていなかった」という言葉が、今も胸に刺さっています。",
    storyNow: "今は「人が育つ組織」をテーマに、中小企業の経営支援をしています。",
    storyFuture: "このコミュニティで出会う経営者の皆さんと、人を大切にする経営の輪を広げていきたい。",
    servicesSummary: "組織開発コンサルティング / 経営者向けコーチング / リーダーシップ研修",
    tags: [tags[3], tags[5], tags[8], tags[13]],
    status: "published",
    allowDirectContact: true,
    contactLinks: { site: "https://example.com", line: "https://line.me/example" },
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
  {
    id: "2",
    slug: "sato-yuki",
    name: "佐藤 裕樹",
    photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
    headline: "テクノロジーで、地方の可能性を解き放つ",
    roleTitle: "CEO",
    jobTitle: "IT起業家",
    storyOrigin: "福岡の小さな町で育ちました。東京の大学を出て、そのまま都内のIT企業に就職。",
    storyTurningPoint: "父が倒れたという連絡を受け、久しぶりに帰省した時。シャッター商店街になった地元を見て、胸が締め付けられました。",
    storyNow: "地方企業のDX支援を専門にしています。",
    storyFuture: "地方には、まだまだ眠っている価値がたくさんあります。",
    servicesSummary: "地方企業向けDXコンサルティング / SaaS開発 / IT人材育成",
    tags: [tags[0], tags[7], tags[10], tags[11]],
    status: "published",
    allowDirectContact: true,
    contactLinks: { site: "https://example.com" },
    createdAt: "2024-02-10",
    updatedAt: "2024-02-10",
  },
  {
    id: "3",
    slug: "yamamoto-emi",
    name: "山本 恵美",
    photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
    headline: "食を通じて、人と人をつなぐ",
    roleTitle: "オーナーシェフ",
    jobTitle: "飲食店経営",
    storyOrigin: "料理人として20年、様々なレストランで腕を磨いてきました。",
    storyTurningPoint: "コロナ禍で店を閉めざるを得なくなった時、常連のお客様から届いた手紙。",
    storyNow: "今は小さな店を営みながら、地域のコミュニティスペースとしても開放しています。",
    storyFuture: "食は、人を幸せにする力を持っています。",
    servicesSummary: "レストラン経営 / ケータリング / 食を通じたチームビルディング",
    tags: [tags[1], tags[6], tags[8], tags[13]],
    status: "published",
    allowDirectContact: false,
    contactLinks: {},
    createdAt: "2024-03-05",
    updatedAt: "2024-03-05",
  },
  {
    id: "4",
    slug: "suzuki-kenji",
    name: "鈴木 健二",
    photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face",
    headline: "不動産で、人生のステージを創る",
    roleTitle: "代表取締役社長",
    jobTitle: "不動産デベロッパー",
    storyOrigin: "父から引き継いだ小さな不動産会社。",
    storyTurningPoint: "ある日、お客様から「この家のおかげで、家族の絆が深まりました」と言われた時。",
    storyNow: "今は地域密着型の不動産開発に注力しています。",
    storyFuture: "まちづくりを通じて、地域の価値を高めていきたい。",
    servicesSummary: "不動産開発 / リノベーション / まちづくりコンサルティング",
    tags: [tags[2], tags[5], tags[9], tags[12]],
    status: "published",
    allowDirectContact: true,
    contactLinks: { site: "https://example.com", sns: "https://twitter.com/example" },
    createdAt: "2024-03-20",
    updatedAt: "2024-03-20",
  },
  {
    id: "5",
    slug: "nakamura-akiko",
    name: "中村 明子",
    photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
    headline: "予防医療で、健康寿命を延ばす",
    roleTitle: "院長",
    jobTitle: "医師・クリニック経営",
    storyOrigin: "大学病院で救急医療に携わっていました。",
    storyTurningPoint: "ある患者さんが、定期検診を受けていれば助かったはずの病気で亡くなった時。",
    storyNow: "予防医療に特化したクリニックを開業し、企業の健康経営支援も行っています。",
    storyFuture: "日本の健康寿命を延ばすことが、私のライフワークです。",
    servicesSummary: "予防医療クリニック運営 / 企業健康経営コンサルティング / ヘルスケア講演",
    tags: [tags[4], tags[5], tags[10], tags[13]],
    status: "published",
    allowDirectContact: true,
    contactLinks: { site: "https://example.com" },
    createdAt: "2024-04-01",
    updatedAt: "2024-04-01",
  },
  {
    id: "6",
    slug: "watanabe-takeshi",
    name: "渡辺 剛",
    photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
    headline: "お金の不安をなくし、挑戦を支える",
    roleTitle: "代表パートナー",
    jobTitle: "ファイナンシャルアドバイザー",
    storyOrigin: "証券会社で富裕層向けの資産運用を担当していました。",
    storyTurningPoint: "独立を決意したのは、親しい友人が資金繰りで会社を畳んだ時。",
    storyNow: "中小企業経営者に特化した財務コンサルティングを行っています。",
    storyFuture: "お金の不安がなくなれば、もっと大胆に挑戦できる。",
    servicesSummary: "財務コンサルティング / 事業承継支援 / 資産運用アドバイス",
    tags: [tags[3], tags[6], tags[9], tags[12]],
    status: "published",
    allowDirectContact: true,
    contactLinks: { site: "https://example.com", line: "https://line.me/example" },
    createdAt: "2024-04-15",
    updatedAt: "2024-04-15",
  },
];

export function getPublishedMembers(): Member[] {
  return members.filter((m) => m.status === "published");
}

export function getMemberBySlug(slug: string): Member | undefined {
  return members.find((m) => m.slug === slug && m.status === "published");
}

export function searchMembers(
  query: string,
  selectedTags: string[]
): Member[] {
  const published = getPublishedMembers();

  return published.filter((member) => {
    const matchesQuery =
      !query ||
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.jobTitle.toLowerCase().includes(query.toLowerCase()) ||
      member.roleTitle.toLowerCase().includes(query.toLowerCase()) ||
      member.headline.toLowerCase().includes(query.toLowerCase()) ||
      member.servicesSummary.toLowerCase().includes(query.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tagId) =>
        member.tags.some((tag) => tag.id === tagId)
      );

    return matchesQuery && matchesTags;
  });
}
