"use client";

import { cn } from "@landing-page/utils";
import { Globe, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { Link } from "@/components/link/link";
import { isWorldsPath } from "./agent-paths";

const items = [
  { href: "/agent", label: "对话", worlds: false, icon: MessageSquare },
  { href: "/agent/worlds", label: "开放世界", worlds: true, icon: Globe },
] as const;

export function WorkspaceNav({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const worlds = isWorldsPath(pathname);

  return (
    <nav
      className={cn("grid grid-cols-2 rounded-lg bg-muted p-0.5", className)}
      aria-label="工作区"
    >
      {items.map((item) => {
        const active = item.worlds === worlds;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
