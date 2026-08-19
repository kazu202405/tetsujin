// ============================================================
// 会員データの型と取得（管理画面で共有）
// ============================================================
// もとは会員DB・生会員DB・会員管理の3画面がそれぞれ持っていたが、
// データが Supabase の members 1つになったので共通化した。
// ============================================================
"use client";

import { useEffect, useState } from "react";
import type { MemberRoleCode } from "@/lib/member-roles";

export interface MemberDbRow {
  id: string;
  member_no: number | string | null;
  name: string;
  nickname: string | null;
  referrer: string | null;
  start_year: number | null;
  start_month: number | null;
  renewal_status: string | null;
  renewal_fee: number | null;
  renewal_note: string | null;
  price: number | null;
  referral_fee: number | null;
  job: string | null;
  grip: string | null;
  frequency: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  age_range: string | null;
  membership_type: string | null;
  payment_method: string | null;
  contact_submitted_at: string | null;
  source: "both" | "member_only" | "contact_only";
  is_withdrawn: boolean;
  import_sheet: string | null;
  auth_user_id: string | null;
  role: MemberRoleCode;
  withdrawn_at?: string | null;
  withdrawal_reason?: string | null;
  admin_note?: string | null;
  // 会費（Stripe）
  billing_plan_code?: string | null;
  billing_starts_on?: string | null;
  stripe_customer_id?: string | null;
  /** 会費免除（無料会員）。プラン未設定(null)＝「まだ決めていない」とは別物 */
  billing_exempt?: boolean | null;
  avatar_path?: string | null;
  /** サーバー側で発行した署名URL（写真なしは null） */
  avatar_url?: string | null;
  referrer_member_id?: string | null;
}

/** スタート月の表示（年があれば「YYYY年M月」、月だけなら「M月」） */
export function formatStartMonth(
  r: Pick<MemberDbRow, "start_year" | "start_month">
): string | null {
  if (r.start_year && r.start_month) return `${r.start_year}年${r.start_month}月`;
  if (r.start_month) return `${r.start_month}月`;
  if (r.start_year) return `${r.start_year}年`;
  return null;
}

export function useMembersDb() {
  const [rows, setRows] = useState<MemberDbRow[] | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/members", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: MemberDbRow[]) => {
        if (cancelled) return;
        setRows(data);
        setLoadStatus("loaded");
      })
      .catch(() => {
        // 取得できないときはダミーへ落とさない。
        // 実データのつもりで偽の会員を見てしまう方が危ない。
        if (cancelled) return;
        setRows([]);
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loadStatus };
}
