"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ChatModeTabsProps = {
  sessionId?: string;
  resourceId?: string;
  className?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/agent") return pathname === "/agent" || pathname.startsWith("/agent/");
  if (href === "/agui") return pathname === "/agui";
  if (href.startsWith("/agui/rxjs")) return pathname.startsWith("/agui/rxjs");
  return pathname === href;
}

export function ChatModeTabs({
  sessionId,
  resourceId,
  className,
}: ChatModeTabsProps) {
  const pathname = usePathname();

  const agentHref = sessionId ? `/agent/${sessionId}` : "/agent";
  const copilotHref = "/agui";
  const rxjsHref = resourceId ? `/agui/rxjs/${resourceId}` : "/agui/rxjs";

  const tabs = [
    { href: agentHref, label: "AISDK (Agent 主线)" },
    { href: copilotHref, label: "CopilotKit" },
    { href: rxjsHref, label: "RxJS Stream" },
  ];

  return (
    <div className={cn("w-full border-b bg-background/90 px-4 py-3", className)}>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive(pathname, tab.href)
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
