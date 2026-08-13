"use client";

// SNSプラットフォームのアイコン。
// SNS欄（social-links-section）と名刺カード（profile-sheet-card）の両方で使うため
// ここに置いている。LINE は lucide に無いのでインラインSVG。

import { Globe, Instagram, Twitter, Facebook, Link as LinkIcon } from "lucide-react";
import type { SocialPlatform } from "@/lib/social-links";

export function PlatformIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
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
