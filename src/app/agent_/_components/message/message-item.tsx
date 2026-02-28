import type { ChatStatus, UIMessage } from "ai";
import { memo } from "react";
import AssistantMessageParts from "@/app/agent/_components/message/assistant-message-parts";
import UserMessageParts from "@/app/agent/_components/message/user-message-parts";
import { ChatMessageShell } from "@/components/chat/chat-message-shell";

export function MessageItem(props: { m: UIMessage; status: ChatStatus }) {
  const { m, status } = props;
  const isUser = m.role === "user";

  return isUser ? (
    <ChatMessageShell role="user">
      <UserMessageParts m={m} />
    </ChatMessageShell>
  ) : (
    <ChatMessageShell role="assistant">
      <AssistantMessageParts m={m} status={status} />
    </ChatMessageShell>
  );
}

export default memo(MessageItem);
