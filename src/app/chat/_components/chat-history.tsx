"use client";

import { ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, useCurrentSessionMessages } from "@/store/chat-store";

export function ChatHistory({ sessionId }: { sessionId: string }) {
  const { selectedMessageId, setSelectedMessageId } = useChatStore();

  // Use selector to efficiently subscribe to only the messages of the current session
  const messages = useCurrentSessionMessages(sessionId);

  // Filter only user messages to show as "history items"
  const userMessages = messages.filter((m) => m.role === "user");

  return (
    <div className="w-[280px] border-l border-slate-200 bg-white flex flex-col h-full shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.02)]">
      <div className="p-4 border-b border-slate-200 flex items-center gap-2 font-medium text-sm text-slate-700 bg-slate-50/50">
        <History size={16} />
        Context History
      </div>

      <div className="flex-1 overflow-y-auto">
        {userMessages.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No history yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Start chatting to see your conversation trail
            </p>
          </div>
        ) : (
          <div className="flex flex-col p-2 space-y-1">
            {userMessages.map((msg, index) => {
              // Find the text content for preview
              const textContent =
                msg.parts?.find((p) => p.type === "text")?.text ||
                "image/content";

              return (
                <button
                  type="button"
                  key={msg.id}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer transition-all duration-200 text-left w-full border border-transparent",
                    selectedMessageId === msg.id
                      ? "bg-slate-100 border-slate-200 shadow-sm"
                      : "hover:bg-slate-50 hover:border-slate-100",
                  )}
                  onClick={() => setSelectedMessageId(msg.id)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium",
                        selectedMessageId === msg.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      User Step
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-sm leading-relaxed line-clamp-2",
                      selectedMessageId === msg.id
                        ? "text-slate-900 font-medium"
                        : "text-slate-600",
                    )}
                  >
                    {textContent}
                  </div>

                  {selectedMessageId === msg.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
