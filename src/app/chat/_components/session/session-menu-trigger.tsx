"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useChatSettingsStore } from "@/store/chat-settings-store";

export function SessionMenuTrigger(props: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;
  const openSidebar = useChatSettingsStore((s) => s.openSidebar);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openSidebar}
      className={cn("md:hidden z-10", className)}
      aria-label="Open menu"
    >
      {children || <Menu className="size-5" />}
    </Button>
  );
}
