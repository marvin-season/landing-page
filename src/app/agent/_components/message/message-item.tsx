import type { ChatStatus, UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import { memo } from "react";
import AssistantMessageParts from "@/app/agent/_components/message/assistant-message-parts";
import UserMessageParts from "@/app/agent/_components/message/user-message-parts";
import { cn } from "@/lib/utils";

export function MessageItem(props: { m: UIMessage; status: ChatStatus }) {
  const { m, status } = props;
  const isUser = m.role === "user";

  return isUser ? (
    <div className="mb-4 flex gap-3 justify-end">
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          "bg-primary/10 text-foreground",
          "border border-border/50 shadow-sm",
        )}
      >
        <UserMessageParts m={m} />
      </div>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
        aria-hidden
      >
        <User className="size-4" />
      </div>
    </div>
  ) : (
    <div className="mb-4 flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        <Bot className="size-4" />
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          "bg-muted/40 text-foreground",
          "border border-border/50 shadow-sm",
        )}
      >
        <AssistantMessageParts m={m} status={status} />
      </div>
    </div>
  );
}

export default memo(MessageItem);
