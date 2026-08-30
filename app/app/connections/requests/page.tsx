// ============================================================
// つながり申請
// ============================================================
// 連絡先（SNS）を教えてもらう入口は、この申請1本だけ。
// 2026-08-30 まではここに「SNSリンクの開示申請」という別の申請が並んでいたが、
// 同じ用件が2種類の申請に割れていて、相手にも細切れに届いていた。
// 何を教えるかは、申請を受けた本人が承認するときに選ぶ。
// ============================================================

import { ConnectionRequestsPanel } from "@/components/app/connection-requests-panel";
import { ConnectionsHeader } from "../connections-header";

export default function RequestsPage() {
  return (
    <div className="min-h-screen">
      <ConnectionsHeader description="つながりたいと伝える・伝えられる画面です" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <ConnectionRequestsPanel />
      </div>
    </div>
  );
}
