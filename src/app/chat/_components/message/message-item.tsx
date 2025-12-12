import type { ChatStatus, UIMessage } from "ai";
import { Bot, User } from "lucide-react";
import AssistantMessageParts from "@/app/chat/_components/message/assistant-message-parts";
import UserMessageParts from "@/app/chat/_components/message/user-message-parts";

export function MessageItem(props: { m: UIMessage; status: ChatStatus }) {
  const { m, status } = props;
  const isUser = m.role === "user";

  return (
    <div className={"flex-1"}>
      {isUser ? (
        <div className="flex flex-col items-end gap-2">
          <User size={24} />
          <div className="w-fit bg-slate-900 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md inline-block text-left">
            <UserMessageParts m={m} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Bot size={24} />
          <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm px-6 py-5 max-w-[90vw]">
            <AssistantMessageParts m={m} status={status} />
          </div>
        </div>
      )}
    </div>
  );
}
