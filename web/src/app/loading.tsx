// 全局加载状态 — 骨架屏 + 脉冲动画
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      {/* Logo + 加载指示器 */}
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10">
          {/* 旋转光环 */}
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
          {/* 内部脉冲点 */}
          <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/30" />
        </div>
        <span className="text-2xl font-bold text-zinc-100">
          Agent<span className="text-blue-500">Store</span>
        </span>
      </div>

      {/* 骨架屏 — 模拟卡片列表 */}
      <div className="mx-auto w-full max-w-4xl space-y-4 px-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 rounded bg-zinc-800" />
                <div className="h-4 w-full rounded bg-zinc-800/60" />
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-5 w-16 rounded bg-zinc-800/40" />
              <div className="h-5 w-20 rounded bg-zinc-800/40" />
              <div className="h-5 w-12 rounded bg-zinc-800/40" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-zinc-500">加载中…</p>
    </div>
  );
}
