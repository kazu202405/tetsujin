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
