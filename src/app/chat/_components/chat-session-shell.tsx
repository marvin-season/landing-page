"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { ChatHistory } from "@/app/chat/_components/chat-history";
import { ChatMain } from "@/app/chat/_components/chat-main";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatSessionShell(props: { sessionId: string }) {
  const { sessionId } = props;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const openHistory = useCallback(() => setIsHistoryOpen(true), []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);

  return (
    <div className="flex-1 flex min-w-0 min-h-0">
      <ChatMain sessionId={sessionId} onOpenHistory={openHistory} />

      {/* Desktop history */}
      <div className="hidden lg:flex h-full shrink-0">
        <ChatHistory sessionId={sessionId} />
      </div>

      {/* Mobile history drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50",
          isHistoryOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!isHistoryOpen}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close history"
          onClick={closeHistory}
          className={cn(
            "absolute inset-0 bg-black/30 transition-opacity",
            isHistoryOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Panel */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-[320px] max-w-[92vw] bg-white shadow-xl border-l border-slate-200 transition-transform duration-200 will-change-transform",
            isHistoryOpen ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-14 px-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">History</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeHistory}
              aria-label="Close history"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="h-[calc(100dvh-56px)] overflow-y-auto">
            <ChatHistory
              sessionId={sessionId}
              showHeader={false}
              className="w-full border-l-0 shadow-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
