"use client";

import { cn } from "@landing-page/utils";
import { type AppLinkProps, Link } from "@/components/link/link";

export function SidebarListLink({
  active = false,
  className,
  ...props
}: AppLinkProps & { active?: boolean }) {
  return (
    <Link
      {...props}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-lg border-l-2 px-2.5 py-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "border-l-primary bg-primary/10 font-medium text-foreground"
          : "border-l-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className,
      )}
    />
  );
}
