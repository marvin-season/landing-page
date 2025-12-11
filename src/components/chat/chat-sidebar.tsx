"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";

export function ChatSidebar() {
  const { sessions, currentSessionId, createSession, deleteSession } =
    useChatStore();

  // Initialize a session if none exists on mount
  useEffect(() => {
    // Only run on client side and if no sessions exist
    if (sessions.length === 0) {
      createSession();
    }
  }, [sessions.length, createSession]);

  return (
    <div className="w-[280px] border-r border-slate-200 bg-slate-50/50 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-white">
        <Link href="/chat">
          <Button className="w-full justify-start gap-2 shadow-sm">
            <Plus size={16} />
            New Chat
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Sessions
        </div>
        {sessions.map((session) => (
          <Link
            href={`/chat/${session.id}`}
            key={session.id}
            className={cn(
              "group relative flex items-center justify-between w-full p-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm",
              currentSessionId === session.id
                ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900 font-medium"
                : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900",
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare
                size={16}
                className={cn(
                  "shrink-0 transition-opacity",
                  currentSessionId === session.id
                    ? "opacity-100 text-primary"
                    : "opacity-50 group-hover:opacity-75",
                )}
              />
              <span className="truncate">{session.title}</span>
            </div>

            <div
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-200",
                "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                type="button"
                title="Delete session"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
