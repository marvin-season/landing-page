"use client";

import { MotionDiv } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCurrentMessages, useMessageStore } from "@/store/message-store";

export function ChatHistory(props: { sessionId: string; className?: string }) {
  const { sessionId, className } = props;
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

  if (messagePairs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "max-w-[260px] bg-white flex flex-col space-y-2 h-full shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      <div className="p-2 my-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        History
      </div>
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
    <MotionDiv
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative p-2.5 rounded-lg cursor-pointer text-left w-full border border-transparent",
        isSelected
          ? "bg-slate-100 border-slate-200 shadow-xs"
          : "hover:bg-slate-50 hover:border-slate-100",
      )}
      onClick={onClick}
    >
      {/* 问题 - 突出显示 */}
      <div
        className={cn(
          "text-xs font-semibold leading-snug mb-1 truncate",
          isSelected ? "text-slate-900" : "text-slate-800",
        )}
      >
        {questionText}
      </div>

      {/* 回答 - 次要展示 */}
      {assistantText && (
        <div
          className={cn(
            "text-xs leading-relaxed truncate",
            isSelected ? "text-slate-600" : "text-slate-500",
          )}
        >
          {assistantText}
        </div>
      )}
    </MotionDiv>
  );
}
