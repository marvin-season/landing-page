import type { ChatStatus, UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import AssistantMessageParts from "@/app/chat/_components/message/assistant-message-parts";
import { cn } from "@/lib/utils";

export function MessageItem(props: { m: UIMessage; status: ChatStatus }) {
  const { m, status } = props;
  const isUser = m.role === "user";

  return (
    <div
      key={m.id}
      className={cn("flex gap-4 ", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
          isUser
            ? "bg-slate-900 text-white"
            : "bg-white text-primary border border-slate-100",
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div
        className={cn(
          "flex-1 max-w-[85%]",
          isUser ? "text-right" : "text-left",
        )}
      >
        {isUser ? (
          <div className="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md inline-block text-left">
            {m.parts.map((p, i) =>
              p.type === "text" ? (
                <span
                  key={i}
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                >
                  {p.text}
                </span>
              ) : null,
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm px-6 py-5">
            <AssistantMessageParts m={m} status={status} />
          </div>
        )}
      </div>
    </div>
  );
}
