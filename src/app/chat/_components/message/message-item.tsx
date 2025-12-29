import type { ChatStatus, UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import { memo } from "react";
import AssistantMessageParts from "@/app/chat/_components/message/assistant-message-parts";
import UserMessageParts from "@/app/chat/_components/message/user-message-parts";

export function MessageItem(props: { m: UIMessage; status: ChatStatus }) {
  const { m, status } = props;
  const isUser = m.role === "user";

  return isUser ? (
    <div className="flex flex-col items-end gap-2">
      <User size={20} className="text-sky-900" />
      <div className="max-w-full bg-sky-200/60 text-black rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md">
        <UserMessageParts m={m} />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-start gap-2">
      <Bot size={20} />
      <div className="max-w-full bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm px-6 py-5">
        <AssistantMessageParts m={m} status={status} />
      </div>
    </div>
  );
}

export default memo(MessageItem);
