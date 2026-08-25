import Link from "next/link";
import { ShieldAlert } from "lucide-react";

// ============================================================
// ログインはできたが、会員として登録されていない人に出す画面
// ============================================================
// 2026-08-25 の修正で、サインアップしても名簿に無いメールアドレスなら
// 会員行は作られなくなった（migration 0029）。
// その結果ここに来る人が生まれるので、行き止まりにせず案内を出す。
//
// 「あなたは登録されていません」だけだと、入会済みなのにメールアドレスが
// 名簿と違うだけ、という人が詰まる。∴ 問い合わせ先を必ず添える。
export function NotAMember({ email }: { email?: string | null }) {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-6 h-6 text-amber-500" />
        </div>

        <h1 className="text-lg font-extrabold text-gray-900 mb-3">
          会員として登録されていません
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          アカウントは作成できましたが、このメールアドレスは
          TETSUJIN会の会員名簿に見つかりませんでした。
          {email && (
            <>
              <br />
              <span className="inline-block mt-2 text-xs text-gray-500 break-all">
                {email}
              </span>
            </>
          )}
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 leading-relaxed mb-6">
          <p className="font-bold text-gray-900 mb-2 text-xs">考えられる原因</p>
          <ul className="space-y-1.5 text-xs">
            <li>・入会申込がまだ承認されていない</li>
            <li>・入会時に登録したメールアドレスと違う</li>
            <li>・まだ入会のお申し込みをされていない</li>
          </ul>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          お心当たりのある方は、運営までご連絡ください。
          <br />
          <a
            href="mailto:tetsujin.community@gmail.com"
            className="text-[var(--tetsu-pink)] font-bold hover:underline"
          >
            tetsujin.community@gmail.com
          </a>
        </p>

        <Link
          href="/register"
          className="inline-block w-full py-3 rounded-xl bg-[var(--tetsu-pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          入会のお申し込みはこちら
        </Link>
      </div>
    </section>
  );
}
