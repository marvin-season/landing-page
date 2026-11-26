import { cn } from "@landing-page/utils";
import type { ReactNode } from "react";

export function WorldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
      {children}
    </div>
  );
}

export function WorldCard({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group flex items-start gap-2 min-w-0 border rounded-lg p-4 transition-all duration-300 hover:shadow-xl cursor-pointer flex-col data-[interactive=true]:cursor-pointer",
        className,
      )}
      data-interactive={Boolean(onClick)}
      onClick={onClick}
    >
      {children}
    </article>
  );
}

export function WorldCardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto flex w-full items-center justify-between gap-3 pt-1">
      {children}
    </div>
  );
}
