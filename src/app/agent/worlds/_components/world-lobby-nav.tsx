"use client";

import { cn } from "@landing-page/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  worldsHomePath,
  worldsTemplatesPath,
  worldsWorksPath,
} from "@/lib/worlds-paths";

const items = [
  {
    href: worldsHomePath,
    label: "首页",
  },
  {
    href: worldsWorksPath,
    label: "我的作品",
  },
  {
    href: worldsTemplatesPath,
    label: "预设模板",
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
        const active = item.href === pathname;
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
