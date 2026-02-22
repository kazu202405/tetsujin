export interface Tag {
  id: string;
  name: string;
  type: "industry" | "region" | "challenge" | "strength";
}

export interface Member {
  id: string;
  slug: string;
  name: string;
  photoUrl: string;
  headline: string;
  roleTitle: string;
  jobTitle: string;
  storyOrigin: string;
  storyTurningPoint: string;
  storyNow: string;
  storyFuture: string;
  servicesSummary: string;
  tags: Tag[];
  status: "draft" | "published" | "private";
  allowDirectContact: boolean;
  contactLinks: {
    line?: string;
    site?: string;
    sns?: string;
  };
  createdAt: string;
  updatedAt: string;
}
