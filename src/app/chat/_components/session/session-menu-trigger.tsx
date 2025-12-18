"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui";
import { useChatSettingsStore } from "@/store/chat-settings-store";

export function SessionMenuTrigger(props: { children?: React.ReactNode }) {
  const { children } = props;
  const openSidebar = useChatSettingsStore((s) => s.openSidebar);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openSidebar}
      className="md:hidden"
      aria-label="Open menu"
    >
      {children || <Menu className="size-4" />}
    </Button>
  );
}
