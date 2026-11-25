"use client";

import { cn } from "@landing-page/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/agent/worlds",
    label: "作品",
    match: (path: string) => path === "/agent/worlds",
  },
  {
    href: "/agent/worlds/templates",
    label: "预设模板",
    match: (path: string) => path === "/agent/worlds/templates",
  },
] as const;

export function WorldLobbyNav() {
  const pathname = usePathname();
  return (
    <nav
      className="inline-flex rounded-lg bg-muted p-0.5"
      aria-label="开放世界分区"
    >
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
