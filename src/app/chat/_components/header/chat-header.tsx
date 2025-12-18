"use client";

import { History } from "lucide-react";
import dynamic from "next/dynamic";
import { SessionMenuTrigger } from "@/app/chat/_components/session/session-menu-trigger";
import { Drawer } from "@/components/drawer";
import { useCurrentSession } from "@/store/session-store";

const ChatHistory = dynamic(
  () => import("../chat-history").then((mod) => mod.ChatHistory),
  {
    ssr: false,
  },
);

export function ChatHeader(props: { sessionId: string }) {
  const { sessionId } = props;
  const currentSession = useCurrentSession(sessionId);
  return (
    <header className="sticky flex items-center top-0 z-10 h-16 shrink-0 shadow-xs border-slate-200/60 bg-white/60 backdrop-blur-md supports-backdrop-filter:bg-white/60">
      <SessionMenuTrigger />
      <div className="-ml-10 flex-1 flex items-center justify-center gap-2 px-4">
        <span className="max-w-[100px] truncate text-base font-semibold leading-tight text-slate-900">
          {currentSession?.title}
        </span>
      </div>
      <Drawer
        side="right"
        trigger={<History size={16} className="lg:hidden mr-4" />}
        title="Context History"
      >
        <ChatHistory sessionId={sessionId} className="" />
      </Drawer>
    </header>
  );
}
