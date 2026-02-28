import type { UIMessage } from "ai";
import { memo } from "react";
import { ChatMessageShell } from "@/components/chat/chat-message-shell";
import AssistantMessageParts from "./assistant-message-parts";
import UserMessageParts from "./user-message-parts";

export function MessageItem(props: { m: UIMessage }) {
  const { m } = props;
  const isUser = m.role === "user";

  return isUser ? (
    <ChatMessageShell role="user">
      <UserMessageParts m={m} />
    </ChatMessageShell>
  ) : (
    <ChatMessageShell role="assistant">
      <AssistantMessageParts m={m} />
    </ChatMessageShell>
  );
}

export default memo(MessageItem);
