"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "agent" | "copilot" | "rxjs";

function getCurrentMode(pathname: string): Mode {
  if (pathname.startsWith("/agui/rxjs")) return "rxjs";
  if (pathname.startsWith("/agui")) return "copilot";
  return "agent";
}

function getSharedResourceId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "agent" && segments[1]) return segments[1];
  if (segments[0] === "agui" && segments[1] === "rxjs" && segments[2]) {
    return segments[2];
  }
  return null;
}

export function ChatModeSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const mode = getCurrentMode(pathname);
  const resourceId = getSharedResourceId(pathname);

  const handleModeChange = useCallback(
    (nextMode: string) => {
      if (nextMode === mode) return;
      if (nextMode === "home") {
        router.push("/");
        return;
      }
      if (nextMode === "agent") {
        router.push(resourceId ? `/agent/${resourceId}` : "/agent");
        return;
      }
      if (nextMode === "copilot") {
        router.push("/agui");
        return;
      }
      router.push(resourceId ? `/agui/rxjs/${resourceId}` : "/agui/rxjs");
    },
    [mode, resourceId, router],
  );

  return (
    <div className="fixed left-4 bottom-4 z-50">
      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger className="w-[190px] rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur">
          <SelectValue placeholder="选择模式" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="home">Home</SelectItem>
          <SelectItem value="agent">AISDK (Agent 主线)</SelectItem>
          <SelectItem value="copilot">CopilotKit</SelectItem>
          <SelectItem value="rxjs">RxJS Stream</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
