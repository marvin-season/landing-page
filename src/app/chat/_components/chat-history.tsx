"use client";

import { History } from "lucide-react";
import { MotionButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCurrentMessages, useMessageStore } from "@/store/message-store";

export function ChatHistory(props: {
  sessionId: string;
  showHeader?: boolean;
  className?: string;
}) {
  const { sessionId, showHeader = true, className } = props;
  const { selectedMessageId, setSelectedMessageId } = useMessageStore();

  const messages = useCurrentMessages(sessionId);

  const userMessages = messages.filter((m) => m.role === "user");

  const messagePairs = userMessages.map((userMsg) => {
    const userIndex = messages.findIndex((m) => m.id === userMsg.id);
    const assistantMsg =
      userIndex !== -1 && messages[userIndex + 1]?.role === "assistant"
        ? messages[userIndex + 1]
        : null;
    return { userMsg, assistantMsg };
  });

  return (
    <div
      className={cn(
        "w-[280px] border-l border-slate-200 bg-white flex flex-col h-full shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      {showHeader ? (
        <div className="h-16 p-4 border-b border-slate-200 flex items-center gap-2 font-medium text-sm text-slate-700 bg-slate-50/50">
          <History size={16} />
          Context History
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {messagePairs.length === 0 ? (
          <EmptyHistory />
        ) : (
          <div className="flex flex-col p-2 space-y-2">
            {messagePairs.map(({ userMsg, assistantMsg }) => {
              // Find the text content for preview
              const questionText =
                userMsg.parts?.find((p) => p.type === "text")?.text ||
                "image/content";

              const assistantText = assistantMsg
                ? assistantMsg.parts?.find((p) => p.type === "text")?.text || ""
                : "";

              const isSelected = selectedMessageId === userMsg.id;

              return (
                <Item
                  key={userMsg.id}
                  questionText={questionText}
                  assistantText={assistantText}
                  isSelected={isSelected}
                  onClick={() => setSelectedMessageId(userMsg.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <History className="w-6 h-6 text-slate-300" />
      </div>
      <p className="text-sm text-slate-500 font-medium">No history yet</p>
      <p className="text-xs text-slate-400 mt-1">
        Start chatting to see your conversation trail
      </p>
    </div>
  );
}

function Item(props: {
  questionText: string;
  assistantText: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { questionText, assistantText, isSelected, onClick } = props;
  return (
    <MotionButton
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      type="button"
      className={cn(
        "group relative p-3 rounded-xl cursor-pointer text-left w-full border border-transparent",
        isSelected
          ? "bg-slate-100 border-slate-200 shadow-sm"
          : "hover:bg-slate-50 hover:border-slate-100",
      )}
      onClick={onClick}
    >
      {/* 问题 - 突出显示 */}
      <div
        className={cn(
          "text-sm font-semibold leading-snug mb-2",
          isSelected ? "text-slate-900" : "text-slate-800",
        )}
      >
        {questionText}
      </div>

      {/* 回答 - 次要展示，超出两行省略 */}
      {assistantText && (
        <div
          className={cn(
            "text-xs leading-relaxed line-clamp-2",
            isSelected ? "text-slate-600" : "text-slate-500",
          )}
        >
          {assistantText}
        </div>
      )}
    </MotionButton>
  );
}
