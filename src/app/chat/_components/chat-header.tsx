"use client";

import dayjs from "dayjs";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Clock,
  Menu,
  PanelRight,
  Sparkles,
} from "lucide-react";
import { useChatShell } from "@/app/chat/_components/chat-shell";
import { MotionDiv } from "@/components/ui";
import { Button } from "@/components/ui/button";
import type { ISession } from "@/store/session-store";

export function ChatHeader(props: {
  currentSession: ISession;
  messagesCount: number;
  onPageChange: (direction: "previous" | "next") => void;
  onOpenHistory?: () => void;
}) {
  const { currentSession, messagesCount, onPageChange, onOpenHistory } = props;
  const { openSidebar } = useChatShell();
  return (
    <header className="sticky top-0 z-10 h-16 shrink-0 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl supports-backdrop-filter:bg-white/60">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-3 sm:px-8">
        {/* Left: menu + icon + title */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Mobile: sidebar */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openSidebar}
            className="md:hidden shrink-0"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          {/* Chat Icon */}
          <span className="flex shrink-0 items-center justify-center rounded-xl bg-primary/10 p-2 text-primary">
            <Sparkles size={18} />
          </span>
          {/* Title, Time, Message Count */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-tight text-slate-900">
              {currentSession?.title || "New Conversation"}
            </div>
            <MotionDiv
              className="mt-0.5 hidden items-center gap-3 text-[11px] leading-4 text-slate-400 sm:flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} className="shrink-0 opacity-80" />
                {dayjs(currentSession?.createdAt).format("MMM D, HH:mm")}
              </span>
              <span className="opacity-70">·</span>
              <span className="opacity-80">{messagesCount} messages</span>
            </MotionDiv>
          </div>
        </div>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Pagination group */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white/70 shadow-xs backdrop-blur-md">
            <button
              type="button"
              aria-label="Previous Page"
              onClick={() => onPageChange("previous")}
              className="grid size-8 place-items-center rounded-l-xl text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronUpIcon size={16} />
            </button>
            <div className="h-6 w-px bg-slate-200/70" />
            <button
              type="button"
              aria-label="Next Page"
              onClick={() => onPageChange("next")}
              className="grid size-8 place-items-center rounded-r-xl text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronDownIcon size={16} />
            </button>
          </div>
          {/* Mobile: history */}
          {onOpenHistory ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenHistory}
              className="lg:hidden shrink-0"
              aria-label="Open history"
            >
              <PanelRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
