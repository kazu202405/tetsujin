// ============================================================
// 運営(admin)アカウントを作成する
// ============================================================
// 使い方:
//   node scripts/create-admin.mjs <メールアドレス> <パスワード> [表示名]
//
// 例:
//   node scripts/create-admin.mjs tetsujin.community@gmail.com "強いパスワード" "運営"
//
// 必要な環境変数（.env.local）:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// 動作:
//   1. Admin API で認証ユーザーを作成する（email_confirm=true ＝ 確認メール不要で即ログイン可）
//   2. auth.users への INSERT トリガ(handle_new_auth_user)が members 行を
//      「同じメールの既存会員に紐づけ」or「新規作成」する
//   3. その members 行の role を 'admin' に更新する
//
// 冪等性: 既に同じメールの認証ユーザーがいる場合は作成せず、role の付与だけ行う。
// ============================================================
import { readFileSync, existsSync } from "fs";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  const [email, password, displayName] = process.argv.slice(2);

  if (!email || !password) {
    console.error("使い方: node scripts/create-admin.mjs <メールアドレス> <パスワード> [表示名]");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("❌ パスワードは8文字以上にしてください。");
    process.exit(1);
  }

  loadEnvLocal();
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です（.env.local を確認）");
    process.exit(1);
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const normalizedEmail = email.trim().toLowerCase();

  // --- 1. 既存の認証ユーザーを探す ---
  const listRes = await fetch(
    `${url}/auth/v1/admin/users?page=1&per_page=1000`,
    { headers },
  );
  if (!listRes.ok) {
    console.error(`❌ ユーザー一覧の取得に失敗 (${listRes.status}): ${await listRes.text()}`);
    process.exit(1);
  }
  const { users = [] } = await listRes.json();
  let user = users.find((u) => (u.email ?? "").toLowerCase() === normalizedEmail);

  // --- 2. なければ作成 ---
  if (user) {
    console.log(`ℹ️  認証ユーザーは既に存在します（${normalizedEmail}）。ロール付与のみ行います。`);
  } else {
    const createRes = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        email_confirm: true, // 運営アカウントは確認メールを挟まず即利用可にする
        user_metadata: { name: displayName || "運営" },
      }),
    });
    if (!createRes.ok) {
      console.error(`❌ 認証ユーザーの作成に失敗 (${createRes.status}): ${await createRes.text()}`);
      process.exit(1);
    }
    user = await createRes.json();
    console.log(`✅ 認証ユーザーを作成しました（${normalizedEmail}）`);
  }

  // --- 3. members 行を確認（トリガが作成 or 紐づけ済みのはず） ---
  const memberRes = await fetch(
    `${url}/rest/v1/members?auth_user_id=eq.${user.id}&select=id,name,member_no,role,email`,
    { headers },
  );
  if (!memberRes.ok) {
    console.error(`❌ 会員行の取得に失敗 (${memberRes.status}): ${await memberRes.text()}`);
    process.exit(1);
  }
  const members = await memberRes.json();

  if (members.length === 0) {
    console.error("❌ 紐づく会員行が見つかりません。");
    console.error("   supabase/policies.sql（handle_new_auth_user トリガ）が適用されているか確認してください。");
    process.exit(1);
  }

  const member = members[0];
  console.log(`   紐づく会員: ${member.name}（会員番号 ${member.member_no ?? "なし"}）`);

  // --- 4. role を owner（管理者）にする ---
  // このスクリプトは最初の1人を立ち上げるためのもの。
  // 管理者は管理者しか任命できないので、ここで運営(admin)にしてしまうと
  // 誰も権限を配れない状態から抜け出せなくなる。
  const patchRes = await fetch(`${url}/rest/v1/members?id=eq.${member.id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ role: "owner" }),
  });
  if (!patchRes.ok) {
    console.error(`❌ ロールの付与に失敗 (${patchRes.status}): ${await patchRes.text()}`);
    process.exit(1);
  }
  const [updated] = await patchRes.json();

  console.log(`\n✅ 完了。管理者（全権限）アカウントとして使えます。`);
  console.log(`   メール : ${normalizedEmail}`);
  console.log(`   会員名 : ${updated.name}`);
  console.log(`   ロール : ${updated.role}`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
