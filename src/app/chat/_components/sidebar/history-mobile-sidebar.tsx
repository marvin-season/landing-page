"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { ChatHistory } from "@/app/chat/_components/sidebar/chat-history";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HistoryMobileSidebar(props: { sessionId: string }) {
  const { sessionId } = props;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
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
        onClick={() => setIsHistoryOpen(false)}
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
            onClick={() => setIsHistoryOpen(false)}
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
  );
}
