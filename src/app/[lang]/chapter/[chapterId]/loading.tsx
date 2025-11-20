import { Skeleton } from "@/components/ui/skeleton";

const ChapterLoading = () => {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-48 rounded-full" />
      <Skeleton className="h-12 w-3/4 rounded-2xl" />
      <Skeleton className="h-6 w-full rounded-lg" />
      <Skeleton className="h-5 w-4/5 rounded-lg" />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-border/70 bg-card/70 p-6 backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-5/6 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-32 min-w-[160px] flex-1 rounded-3xl"
          />
        ))}
      </div>
    </div>
  );
};

export default ChapterLoading;
