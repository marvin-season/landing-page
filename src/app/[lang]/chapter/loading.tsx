import { Skeleton } from "@/components/ui/skeleton";

const ChapterDirectoryLoading = () => {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(280px,1fr)_minmax(340px,1.1fr)]">
      <div className="flex flex-col items-center gap-6 lg:items-start">
        <Skeleton className="h-[360px] w-[280px] rounded-[32px] sm:h-[360px] sm:w-[280px]" />
        <Skeleton className="h-10 w-48 rounded-full" />
        <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-10 w-3/4 rounded-2xl" />
          <Skeleton className="h-16 w-2/3 rounded-3xl" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-border/60 bg-card/80 p-6 backdrop-blur"
          >
            <div className="flex w-full items-start justify-between">
              <div className="flex flex-1 flex-col gap-3 pr-6">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-6 w-full rounded-lg" />
                <Skeleton className="h-4 w-4/5 rounded-lg" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChapterDirectoryLoading;
