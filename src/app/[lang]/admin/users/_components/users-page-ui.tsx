import { cn } from "@landing-page/utils";
import { Link } from "@/components/link/link";

const SKELETON_ROW_COUNT = 4;

export function UsersPageHeader() {
  return (
    <header>
      <Link
        href="/admin"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        返回管理
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-pretty text-foreground">
        账号
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        查看登录账号。只有超级管理员可以创建账号或修改密码。
      </p>
    </header>
  );
}

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function UsersSkeleton() {
  return (
    <div
      className="mt-8 flex flex-col gap-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">加载中…</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Pulse className="h-10 flex-1" />
        <Pulse className="h-8 w-24" />
      </div>
      <div className="flex gap-1.5">
        <Pulse className="h-7 w-16 rounded-full" />
        <Pulse className="h-7 w-24 rounded-full" />
        <Pulse className="h-7 w-20 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm shinchan:matte-surface apple:glass-surface md:grid md:min-h-96 md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="border-b md:border-r md:border-b-0">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="flex items-center gap-3 px-4 py-3"
            >
              <Pulse className="size-9 rounded-full" />
              <div className="flex-1">
                <Pulse className="h-4 w-24" />
                <Pulse className="mt-2 h-3 w-16" />
              </div>
              <Pulse className="h-3 w-12" />
            </div>
          ))}
        </div>
        <div className="hidden p-6 md:block" aria-hidden="true">
          <div className="flex items-start gap-4">
            <Pulse className="size-12 rounded-full" />
            <div className="flex-1">
              <Pulse className="h-5 w-28" />
              <Pulse className="mt-2 h-4 w-40" />
            </div>
          </div>
          <Pulse className="mt-8 h-px w-full" />
          <Pulse className="mt-6 h-4 w-20" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Pulse className="h-9" />
            <Pulse className="h-9" />
          </div>
        </div>
      </div>
    </div>
  );
}
