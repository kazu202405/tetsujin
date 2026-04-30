// 自分（CURRENT_USER）と他メンバーのつながり状態（モック）
// ※ 既存の app/app/connections/page.tsx 内のローカル mockConnections と同じ顔ぶれ

export const CURRENT_USER_ID = "1";

// 自分が「出会った／つながっている」相手の member id 一覧
const myConnectionIds: Set<string> = new Set([
  "10", // 本田 浩二
  "7", // 小川 理沙
  "2", // 佐藤 裕樹
  "5", // 中村 明子
  "8", // 森田 駿
  "4", // 鈴木 健二
]);

export function isConnectedWithMe(targetId: string): boolean {
  return myConnectionIds.has(targetId);
}
