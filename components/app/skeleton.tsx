// ============================================================
// 読み込み中に出す「画面の雰囲気」
// ============================================================
// 遷移してからサーバーの返事が来るまで、これまでは前の画面のまま
// 固まって見えていた（スマホだと「重い」と感じるのはここ）。
//
// Next.js は loading.tsx を置くと、遷移した瞬間にこれを出してくれる。
// あわせて、リンクを踏む前にこの器を先に読み込んでおけるようになるため、
// タブの切り替えがその場で反応するようになる。
//
// 中身が出るまでの時間は変わらない。変わるのは「止まって見えない」こと。
// ============================================================

function Bar({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded-md bg-gray-200/70 animate-pulse`} />;
}

/** 見出しだけの器（本文は各画面のスケルトンが描く） */
export function SkeletonHeader({ rightAction = false }: { rightAction?: boolean }) {
  return (
    <div className="sticky top-14 lg:top-0 z-30 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Bar w="w-32" h="h-6" />
            <Bar w="w-56" h="h-3" />
          </div>
          {rightAction && <Bar w="w-24" h="h-10" />}
        </div>
      </div>
    </div>
  );
}

/** 人が縦に並ぶ画面（メンバー・出会い・申請） */
export function ListSkeleton({
  rows = 6,
  rightAction = false,
  withSearch = false,
}: {
  rows?: number;
  rightAction?: boolean;
  withSearch?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <SkeletonHeader rightAction={rightAction} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-3">
        {withSearch && <Bar h="h-12" />}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100"
          >
            <div className="w-11 h-11 rounded-full bg-gray-200/70 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Bar w="w-28" h="h-4" />
              <Bar w="w-40" h="h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** カードが縦に積まれる画面（掲示板・会を探す・お知らせ） */
export function CardSkeleton({
  rows = 4,
  rightAction = false,
}: {
  rows?: number;
  rightAction?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <SkeletonHeader rightAction={rightAction} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200/70 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Bar w="w-24" h="h-3.5" />
                <Bar w="w-16" h="h-3" />
              </div>
            </div>
            <Bar />
            <Bar w="w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 設定・マイページのように箱が並ぶ画面 */
export function PanelSkeleton({ panels = 3 }: { panels?: number }) {
  return (
    <div className="min-h-screen">
      <SkeletonHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-6">
        {Array.from({ length: panels }).map((_, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 space-y-4">
            <Bar w="w-32" h="h-5" />
            <Bar h="h-11" />
            <Bar h="h-11" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 画面の中で一部だけ読み込み中のときに差し込む行 */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100"
        >
          <div className="w-11 h-11 rounded-full bg-gray-200/70 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bar w="w-28" h="h-4" />
            <Bar w="w-40" h="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
