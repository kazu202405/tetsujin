"use client";

import { createContext, useContext } from "react";

export type CurrentMember = {
  id: string;
  member_no: number | null;
  name: string;
  nickname: string | null;
  email: string | null;
  job: string | null;
  grip: string | null;
  membership_type: string | null;
  role: "admin" | "manager" | "user";
  is_withdrawn: boolean;
  avatar_path?: string | null;
  /** 表示用の署名URL。非公開バケットのためサーバー側（AppLayout）で発行する。 */
  avatar_url?: string | null;
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
