// ============================================================
// イベント 一覧 / 作成
// ============================================================
// 一覧は event_list()＋event_participant_list() を1回ずつ呼び、
// 参加者はクライアント側で組み立てられる形にして返す。
// （イベントごとに参加者を問い合わせると往復が増えるため）
// ============================================================
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, requireMember } from "@/lib/supabase/api";
import { signAvatarPaths } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  title: string;
  series_name: string | null;
  event_date: string;
  start_time: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  is_canceled: boolean;
  requires_approval: boolean;
  host_id: string | null;
  host_name: string | null;
  host_avatar_path: string | null;
  participant_count: number;
  pending_count: number;
  my_status: "pending" | "approved" | "declined" | null;
  my_role: "owner" | "admin" | "member" | null;
  is_manager: boolean;
  is_mine: boolean;
  following_series: boolean;
}

interface ParticipantRow {
  event_id: string;
  member_id: string;
  name: string;
  job: string | null;
  avatar_path: string | null;
  status: "pending" | "approved" | "declined";
  role: "owner" | "admin" | "member";
  message: string | null;
  joined_at: string;
}

export async function GET() {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const [eventsResult, participantsResult] = await Promise.all([
    supabase.rpc("event_list", { p_include_past: true }),
    supabase.rpc("event_participant_list", { p_event_id: null }),
  ]);

  if (eventsResult.error) {
    console.error("event_list failed", { code: eventsResult.error.code });
    return NextResponse.json(
      { error: "イベントを取得できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const participants = (participantsResult.data ?? []) as ParticipantRow[];

  const avatarUrls = await signAvatarPaths(
    supabase,
    // 主催者は event_participants に行を持たないので、参加者とは別に集めて
    // 同じ一括署名に載せる（1件ずつ署名すると往復が増える）
    [...participants.map((p) => p.avatar_path), ...events.map((e) => e.host_avatar_path)],
  );

  type Person = {
    id: string;
    name: string;
    job: string;
    avatarUrl: string | null;
    role: "owner" | "admin" | "member";
    message: string | null;
  };
  const approved = new Map<string, Person[]>();
  const pending = new Map<string, Person[]>();

  for (const p of participants) {
    const person: Person = {
      id: p.member_id,
      name: p.name,
      job: p.job ?? "",
      avatarUrl: p.avatar_path ? avatarUrls[p.avatar_path] ?? null : null,
      role: p.role,
      message: p.message,
    };
    const bucket = p.status === "pending" ? pending : p.status === "approved" ? approved : null;
    if (!bucket) continue;
    const list = bucket.get(p.event_id) ?? [];
    list.push(person);
    bucket.set(p.event_id, list);
  }

  return NextResponse.json(
    events.map((e) => ({
      id: e.id,
      title: e.title,
      seriesName: e.series_name,
      date: e.event_date,
      time: e.start_time ?? "",
      location: e.location ?? "",
      description: e.description ?? "",
      capacity: e.capacity,
      isCanceled: e.is_canceled,
      requiresApproval: e.requires_approval,
      hostId: e.host_id,
      hostName: e.host_name ?? "運営",
      hostAvatarUrl: e.host_avatar_path ? avatarUrls[e.host_avatar_path] ?? null : null,
      participantCount: Number(e.participant_count),
      pendingCount: Number(e.pending_count),
      myStatus: e.my_status,
      myRole: e.my_role,
      isManager: e.is_manager,
      isMine: e.is_mine,
      followingSeries: e.following_series,
      participants: approved.get(e.id) ?? [],
      // 承認待ちは管理できる人にだけ返す
      pendingParticipants: e.is_manager ? pending.get(e.id) ?? [] : [],
    })),
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const guard = await requireMember();
  if (!guard.ok) return guard.response;
  const { supabase, member } = guard;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    seriesName?: string | null;
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    capacity?: number | null;
    requiresApproval?: boolean;
  } | null;

  const title = body?.title?.trim();
  const date = body?.date?.trim();

  if (!title || !date) {
    return NextResponse.json(
      { error: "タイトルと開催日は必須です" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "開催日の形式が正しくありません" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const capacity =
    typeof body?.capacity === "number" && body.capacity > 0 ? Math.floor(body.capacity) : null;

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: title.slice(0, 120),
      series_name: body?.seriesName?.trim() || null,
      event_date: date,
      start_time: body?.time?.trim() || null,
      location: body?.location?.trim() || null,
      description: body?.description?.trim() || null,
      capacity,
      requires_approval: body?.requiresApproval === true,
      host_id: member.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("event insert failed", { code: error.code });
    return NextResponse.json(
      { error: "イベントを作成できませんでした" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  // 主催者は自動的に参加者に入れる（名簿と参加数が実態と合うように）
  await supabase
    .from("event_participants")
    .upsert({ event_id: data.id, member_id: member.id }, { onConflict: "event_id,member_id" });

  return NextResponse.json({ id: data.id }, { headers: NO_STORE_HEADERS });
}
