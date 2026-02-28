import { Skeleton } from "@/components/ui/skeleton";

function MessageSkeleton(props: { side: "left" | "right"; lines?: number }) {
  const { side, lines = 2 } = props;
  const isLeft = side === "left";

  return (
    <div className={`flex gap-4 ${isLeft ? "" : "justify-end"}`}>
      {isLeft && <Skeleton className="h-8 w-8 rounded-lg shrink-0" />}
      <div className={`flex flex-col gap-2 ${isLeft ? "" : "items-end"}`}>
        {Array.from({ length: lines }).map((_, i) => {
          const width =
            i === 0
              ? isLeft
                ? "w-[220px] sm:w-[320px]"
                : "w-[200px] sm:w-[280px]"
              : isLeft
                ? "w-[160px] sm:w-[240px]"
                : "w-[120px] sm:w-[180px]";
          return <Skeleton key={i} className={`h-4 ${width}`} />;
        })}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex-1 flex min-w-0 min-h-0 h-full">
      {/* Main */}
      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col">
        {/* Header */}
        <header className="sticky flex items-center top-0 z-10 h-16 shrink-0 shadow-xs border-slate-200/60 bg-white/60 backdrop-blur-md supports-backdrop-filter:bg-white/60">
          <div className="px-4">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
          <div className="-ml-10 flex-1 flex items-center justify-center gap-2 px-4">
            <Skeleton className="h-5 w-[120px] rounded-md" />
          </div>
          <div className="mr-4 lg:hidden">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </header>

        {/* Chat body */}
        <div className="flex-1 flex flex-col min-h-0 h-full bg-slate-50/30">
          <div className="-mt-16 flex-1 min-h-0 overflow-hidden p-4 pt-20 sm:p-6 sm:pt-22 mx-auto w-full lg:max-w-4xl space-y-6 pb-6">
            <MessageSkeleton side="left" lines={2} />
            <MessageSkeleton side="right" lines={2} />
            <MessageSkeleton side="left" lines={3} />
            <MessageSkeleton side="right" lines={1} />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-[88px]" />
                <Skeleton className="h-4 w-[56px]" />
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="sticky bottom-0 z-20 w-full lg:max-w-3xl mx-auto shrink-0 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right history (desktop) */}
      <div className="hidden lg:flex h-full shrink-0 border-l border-slate-200 p-2">
        <div className="max-w-[260px] w-[260px] bg-white flex flex-col space-y-2 h-full shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.02)] p-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
