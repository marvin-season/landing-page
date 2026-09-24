import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({
  title,
  description,
  backHref,
  backLabel = "返回管理",
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-20">
      <header>
        {backHref ? (
          <Link
            href={backHref}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {backLabel}
          </Link>
        ) : null}
        <h1
          className={
            backHref
              ? "mt-2 text-xl font-semibold text-foreground"
              : "text-xl font-semibold text-foreground"
          }
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}
