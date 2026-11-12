"use client";

import { cn } from "@landing-page/utils";
import { usePathname } from "next/navigation";
import { Link } from "@/components/link/link";
import { isWorldsPath } from "./agent-paths";

const items = [
  { href: "/agent", label: "对话", worlds: false },
  { href: "/agent/worlds", label: "开放世界", worlds: true },
] as const;

export function WorkspaceNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const worlds = isWorldsPath(pathname);

  return (
    <nav className="grid grid-cols-2 gap-1 p-2" aria-label="工作区">
      {items.map((item) => {
        const active = item.worlds === worlds;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
