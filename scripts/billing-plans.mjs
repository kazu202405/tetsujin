// ============================================================
// 会費プランの価格ID（Stripe）を照合して登録する
// ============================================================
// 使い方:
//   node scripts/billing-plans.mjs check
//     → billing_plans に入っている価格IDを Stripe の実物と突き合わせる
//
//   node scripts/billing-plans.mjs set <code>=<price_id> [...]
//     → 照合に通ったものだけ billing_plans に書き込む
//     → --dry-run を付けると照合だけして書き込まない
//
//   例:
//     node scripts/billing-plans.mjs set \
//       monthly_2750=price_xxx yearly_30000=price_yyy
//
// 必要な環境変数（.env.local）:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / STRIPE_SECRET_KEY
//
// ------------------------------------------------------------
// 🔴 なぜ「照合してから書く」のか
// ------------------------------------------------------------
// billing_plans.stripe_price_id はプラン1つにつき1本しか持てない＝
// テスト用と本番用を並べて持てない。しかもローカル開発も本番Supabaseを
// 見ているので、ここに間違った価格IDが入ると本番の請求先が狂う。
//
// 貼り間違い・金額違い・年額と月額の取り違え・本番モードの価格の混入は
// 「Stripeに問い合わせれば必ず分かる」ので、書く前に必ず確認する。
//
// 本番モード(livemode=true)の価格は既定で拒否する。本番へ切り替えるときだけ
// --allow-live を付ける。これが無いと、テスト中にうっかり本番価格を入れて
// 実際の請求が飛ぶ事故が起きうる。
// ------------------------------------------------------------
import { readFileSync, existsSync } from "fs";
import Stripe from "stripe";

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

const yen = (n) => `${Number(n).toLocaleString("ja-JP")}円`;

/** billing_plans を読む（PostgREST。他スクリプトと同じ作法） */
async function fetchPlans(url, key) {
  const res = await fetch(
    `${url}/rest/v1/billing_plans?select=code,label,amount,interval,stripe_price_id,is_active&order=sort_order`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`billing_plans の取得に失敗: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Stripe の価格が、DB のプラン定義と一致しているか調べる。
 * 返り値: { ok, livemode, problems[], detail }
 */
async function verifyPrice(stripe, plan, priceId) {
  const problems = [];

  let price;
  try {
    // 商品名も一緒に見たいので展開する（人が目視で気づけるように）
    price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  } catch (e) {
    return {
      ok: false,
      livemode: null,
      problems: [`Stripeに存在しない、またはこの鍵では見えない（${e.message}）`],
      detail: null,
    };
  }

  if (!price.active) problems.push("価格が無効(active=false)になっている");
  if (price.currency !== "jpy") problems.push(`通貨が ${price.currency}（jpy であるべき）`);

  if (price.type !== "recurring" || !price.recurring) {
    problems.push("継続課金(サブスク)の価格になっていない＝都度払いで作られている");
  } else {
    if (price.recurring.interval !== plan.interval) {
      const ja = { month: "月ごと", year: "年ごと" };
      problems.push(
        `請求間隔が ${ja[price.recurring.interval] ?? price.recurring.interval}（${ja[plan.interval]} であるべき）`,
      );
    }
    if (price.recurring.interval_count !== 1) {
      problems.push(`請求間隔の回数が ${price.recurring.interval_count}（1 であるべき）`);
    }
  }

  if (price.unit_amount !== plan.amount) {
    problems.push(`金額が ${yen(price.unit_amount)}（${yen(plan.amount)} であるべき）`);
  }

  return {
    ok: problems.length === 0,
    livemode: price.livemode,
    problems,
    detail: {
      productName: typeof price.product === "object" ? price.product.name : String(price.product),
      amount: price.unit_amount,
      interval: price.recurring?.interval ?? "(都度払い)",
      active: price.active,
    },
  };
}

function printResult(plan, priceId, result) {
  const mark = result.ok ? "✅" : "❌";
  const mode = result.livemode === null ? "" : result.livemode ? " 🔴本番モード" : " [テストモード]";
  console.log(`\n${mark} ${plan.code}  ${plan.label}${mode}`);
  console.log(`   価格ID: ${priceId}`);
  if (result.detail) {
    const d = result.detail;
    const ja = { month: "月ごと", year: "年ごと" };
    console.log(`   Stripe側: 「${d.productName}」 ${yen(d.amount)} / ${ja[d.interval] ?? d.interval}`);
  }
  for (const p of result.problems) console.log(`   ⚠️  ${p}`);
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const command = args[0];
  const allowLive = args.includes("--allow-live");
  const dryRun = args.includes("--dry-run");
  const assignments = args.slice(1).filter((a) => a.includes("="));

  if (command !== "check" && command !== "set") {
    console.error("使い方:");
    console.error("  node scripts/billing-plans.mjs check");
    console.error("  node scripts/billing-plans.mjs set <code>=<price_id> [...] [--allow-live]");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!url || !key) {
    console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です（.env.local を確認）");
    process.exit(1);
  }
  if (!stripeKey) {
    console.error("❌ STRIPE_SECRET_KEY が未設定です（.env.local を確認）");
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey, { maxNetworkRetries: 2, timeout: 20000 });
  const plans = await fetchPlans(url, key);
  const byCode = new Map(plans.map((p) => [p.code, p]));

  // 何を照合するか決める
  //   check → DB に既に入っている価格ID
  //   set   → コマンドラインで渡された価格ID
  const targets = [];
  if (command === "check") {
    for (const plan of plans) {
      if (plan.stripe_price_id) targets.push([plan, plan.stripe_price_id]);
      else console.log(`\n⬜ ${plan.code}  ${plan.label} … 価格ID未設定`);
    }
    if (targets.length === 0) {
      console.log("\n価格IDが入っているプランはありません。");
      return;
    }
  } else {
    if (assignments.length === 0) {
      console.error("❌ <code>=<price_id> を1つ以上指定してください");
      process.exit(1);
    }
    for (const a of assignments) {
      const [code, priceId] = a.split("=");
      const plan = byCode.get(code);
      if (!plan) {
        console.error(`❌ 知らないプラン code です: ${code}`);
        console.error(`   使えるのは: ${plans.map((p) => p.code).join(", ")}`);
        process.exit(1);
      }
      targets.push([plan, priceId]);
    }
  }

  // 照合
  const results = [];
  for (const [plan, priceId] of targets) {
    const result = await verifyPrice(stripe, plan, priceId);
    printResult(plan, priceId, result);
    results.push({ plan, priceId, result });
  }

  const failed = results.filter((r) => !r.result.ok);
  const live = results.filter((r) => r.result.livemode === true);

  console.log("\n" + "─".repeat(56));

  if (command === "check") {
    console.log(failed.length === 0 ? "✅ すべて一致しています" : `❌ ${failed.length}件に問題があります`);
    if (live.length > 0) console.log(`🔴 本番モードの価格が ${live.length}件 入っています`);
    process.exit(failed.length === 0 ? 0 : 1);
  }

  // --- set: 全部通っていなければ1件も書かない -------------------
  // 一部だけ書くと「どれが古い値か」が分からなくなるため。
  if (failed.length > 0) {
    console.log(`❌ ${failed.length}件が照合に通らなかったので、1件も書き込みません。`);
    process.exit(1);
  }
  if (dryRun) {
    console.log("✅ 照合はすべて通りました（--dry-run のため書き込んでいません）");
    if (live.length > 0) console.log(`🔴 ただし本番モードの価格が ${live.length}件 含まれています`);
    return;
  }
  if (live.length > 0 && !allowLive) {
    console.log("🔴 本番モードの価格が含まれています。書き込みを中止しました。");
    console.log("   本番へ切り替える意図なら --allow-live を付けて再実行してください。");
    process.exit(1);
  }

  for (const { plan, priceId } of results) {
    const res = await fetch(`${url}/rest/v1/billing_plans?code=eq.${plan.code}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ stripe_price_id: priceId }),
    });
    if (!res.ok) {
      console.error(`❌ ${plan.code} の保存に失敗: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    console.log(`保存: ${plan.code} → ${priceId}`);
  }

  console.log(`\n✅ ${results.length}件を billing_plans に登録しました（${live.length > 0 ? "本番モード" : "テストモード"}）`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
