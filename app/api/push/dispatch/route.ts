// ============================================================
// お知らせを端末プッシュとして送る
// ============================================================
// 呼び出し元は Supabase の Database Webhook（notifications への INSERT）。
// アプリのどの経路から通知が作られても、ここを1本通れば端末に届く。
//
// 🔴 誰でも叩けると任意の会員へ好きな通知を送れてしまうため、
//    共有シークレット（PUSH_DISPATCH_SECRET）を必須にしている。
//    設定されていない環境では動作させない（既定で開けっ放しにしない）。
// ============================================================
import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:tetsujin.community@gmail.com";
const DISPATCH_SECRET = process.env.PUSH_DISPATCH_SECRET ?? "";

interface NotificationRow {
  id: string;
  recipient_id: string;
  title: string;
  message: string | null;
  href: string | null;
}

export async function POST(request: Request) {
  if (!DISPATCH_SECRET) {
    return NextResponse.json(
      { error: "PUSH_DISPATCH_SECRET が未設定です" },
      { status: 503, headers: HEADERS },
    );
  }
  if (request.headers.get("x-dispatch-secret") !== DISPATCH_SECRET) {
    return NextResponse.json({ error: "認証できません" }, { status: 401, headers: HEADERS });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json(
      { error: "VAPIDキーが未設定です" },
      { status: 503, headers: HEADERS },
    );
  }
  if (!isServiceRoleConfigured) {
    return NextResponse.json(
      { error: "サーバー側のSupabase設定が不足しています" },
      { status: 503, headers: HEADERS },
    );
  }

  // Database Webhook は { type, table, record } の形で送ってくる。
  // 手動で叩くときのために record 直渡しも受ける。
  const body = (await request.json().catch(() => null)) as
    | { record?: NotificationRow }
    | NotificationRow
    | null;
  const record = (body && "record" in body ? body.record : body) as NotificationRow | undefined;

  if (!record?.recipient_id || !record.title) {
    return NextResponse.json({ error: "通知の内容が不正です" }, { status: 400, headers: HEADERS });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("member_id", record.recipient_id);

  if (error) {
    console.error("push subscriptions select failed", { code: error.code });
    return NextResponse.json(
      { error: "購読先を取得できませんでした" },
      { status: 500, headers: HEADERS },
    );
  }
  if (!subscriptions || subscriptions.length === 0) {
    // 端末登録がないだけ。アプリ内のお知らせは既に作られているので失敗ではない。
    return NextResponse.json({ sent: 0, reason: "no_subscription" }, { headers: HEADERS });
  }

  // アイコンのバッジ用に、その人の未読数を数えて一緒に送る。
  // 通知が届いてもバッジは自動では付かないため、端末側で明示的に設定する。
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", record.recipient_id)
    .is("read_at", null);

  const payload = JSON.stringify({
    title: record.title,
    body: record.message ?? "",
    url: record.href ?? "/app/notifications",
    badge: unread ?? 0,
  });

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 は購読が失効している。残しておくと毎回失敗するので消す。
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error("web push send failed", { statusCode });
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent, removed: staleIds.length }, { headers: HEADERS });
}
