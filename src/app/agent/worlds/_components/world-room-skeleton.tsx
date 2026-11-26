export function WorldRoomSkeleton({
  showHeader = false,
}: {
  showHeader?: boolean;
}) {
  return (
    <div role="status" className="flex h-full min-h-0 flex-1 flex-col">
      <span className="sr-only">正在加载作品…</span>
      {showHeader ? (
        <div
          aria-hidden="true"
          className="flex shrink-0 animate-pulse flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 motion-reduce:animate-none"
        >
          <div className="flex h-11 items-center gap-2">
            <div className="size-9 rounded-md bg-muted" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 rounded-md bg-muted sm:w-44" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </div>
          <div className="h-8 w-32 rounded-md bg-muted" />
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable"
      >
        <div className="mx-auto flex w-full max-w-5xl animate-pulse flex-col gap-4 px-5 py-6 sm:px-8 motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="h-9 w-28 rounded-md bg-muted sm:w-40" />
            <div className="h-9 w-20 rounded-md bg-muted sm:w-24" />
          </div>
          <div className="h-6 w-40 rounded-md bg-muted" />
          {[1, 2, 3].map((paragraph) => (
            <div key={paragraph} className="space-y-3 py-2">
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
