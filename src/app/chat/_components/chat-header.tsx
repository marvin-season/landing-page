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
    <div className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-3 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-9">
      {/* Left: Icon + Title + Time */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
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
        <span className="bg-primary/10 p-2 rounded-lg text-primary flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </span>
        {/* Title, Time, Message Count */}
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-semibold text-slate-900 leading-tight">
            {currentSession?.title || "New Conversation"}
          </span>
          <MotionDiv
            className="flex items-center gap-4 mt-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 text-[11px] text-slate-400 leading-4">
              <Clock size={12} className="shrink-0" />
              <span>
                {dayjs(currentSession?.createdAt).format("MMM D, HH:mm")}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              {messagesCount} messages
            </span>
          </MotionDiv>
        </div>
      </div>
      {/* Right: Page Actions */}
      <div className="flex items-center gap-2 ml-3 sm:ml-6">
        {/* Mobile: history */}
        {onOpenHistory ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenHistory}
            className="lg:hidden"
            aria-label="Open history"
          >
            <PanelRight className="size-4" />
          </Button>
        ) : null}

        <div className="flex flex-col justify-center items-center gap-1">
          <button
            type="button"
            aria-label="Previous Page"
            onClick={() => onPageChange("previous")}
            className="rounded-md p-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronUpIcon
              size={18}
              className="text-slate-500 hover:text-slate-900"
            />
          </button>
          <button
            type="button"
            aria-label="Next Page"
            onClick={() => onPageChange("next")}
            className="rounded-md p-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronDownIcon
              size={18}
              className="text-slate-500 hover:text-slate-900"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
