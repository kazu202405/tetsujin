"use client";

import { createContext, useContext } from "react";
import type { MemberRoleCode } from "@/lib/member-roles";

export type CurrentMember = {
  id: string;
  member_no: number | null;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  job: string | null;
  grip: string | null;
  membership_type: string | null;
  role: MemberRoleCode;
  is_withdrawn: boolean;
  avatar_path?: string | null;
  /** 表示用の署名URL。非公開バケットのためサーバー側（AppLayout）で発行する。 */
  avatar_url?: string | null;
  // 会費の表示に使う（設定画面）
  price?: number | null;
  start_year?: number | null;
  start_month?: number | null;
  renewal_status?: string | null;
};

const CurrentMemberContext = createContext<CurrentMember | null>(null);

export function CurrentMemberProvider({
  member,
  children,
}: {
  member: CurrentMember | null;
  children: React.ReactNode;
}) {
  return (
    <CurrentMemberContext.Provider value={member}>
      {children}
    </CurrentMemberContext.Provider>
  );
}

export function useCurrentMember() {
  return useContext(CurrentMemberContext);
}
