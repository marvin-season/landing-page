import { Card } from "@landing-page/design-system";
import { Link } from "@/components/link/link";

const SKELETON_CARD_COUNT = 3;

export function UsersPageHeader() {
  return (
    <header>
      <Link
        href="/admin"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        返回管理
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-foreground">账号</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        查看登录账号。只有超级管理员可以创建账号或修改密码。
      </p>
    </header>
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
      <span className="sr-only">加载中</span>
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <Card key={index} aria-hidden="true">
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="mt-2 h-3.5 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        </Card>
      ))}
    </div>
  );
}
