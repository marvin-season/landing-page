"use client";

import { SessionMenuTrigger } from "@/app/chat/_components/session/session-menu-trigger";
import { useCurrentSession } from "@/store/session-store";

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
    </header>
  );
}
