"use client";

import { History, Menu, SlidersHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import { ChatSettings } from "@/app/chat/_components/setting/chat-settings";
import { Drawer } from "@/components/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useChatSettingsStore } from "@/store/chat-settings-store";
import { useCurrentSession } from "@/store/session-store";

const ChatHistory = dynamic(
  () => import("../chat-history").then((mod) => mod.ChatHistory),
  {
    ssr: false,
  },
);

const ChatSidebar = dynamic(
  () => import("../sidebar/chat-sidebar").then((mod) => mod.ChatSidebar),
  {
    ssr: false,
  },
);

export function ChatHeader(props: { sessionId: string }) {
  const { sessionId } = props;
  const currentSession = useCurrentSession(sessionId);

  const paginationDisplay = useChatSettingsStore((s) =>
    s.hasSetting("pagination-display"),
  );
  return (
    <header className="sticky flex items-center top-0 z-10 h-16 shrink-0 shadow-xs border-slate-200/60 bg-white/60 backdrop-blur-md supports-backdrop-filter:bg-white/60 p-4">
      <Drawer
        side="left"
        trigger={<Menu size={16} className="lg:hidden z-10" />}
      >
        <ChatSidebar className="w-full border-r-0" />
      </Drawer>
      <div className="-ml-10 flex-1 flex items-center justify-center gap-2 px-4">
        <span className="max-w-[150px] truncate text-base font-semibold leading-tight text-slate-900">
          {currentSession?.title}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {paginationDisplay && (
          <Drawer
            side="right"
            className="px-4"
            trigger={<History size={16} className="lg:hidden" />}
          >
            <ChatHistory sessionId={sessionId} className="max-w-auto" />
          </Drawer>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SlidersHorizontal size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="max-w-[400px] min-w-[300px] p-4"
            align="end"
          >
            <ChatSettings />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
