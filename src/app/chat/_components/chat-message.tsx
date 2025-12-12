import type { ChatStatus, UIMessage } from "ai";
import { MessageItem } from "@/app/chat/_components/message/message-item";

export function ChatMessage(props: {
  messages: UIMessage[];
  status: ChatStatus;
}) {
  const { messages, status } = props;

  return (
    <>
      {messages.map((m) => {
        return <MessageItem key={m.id} m={m} status={status} />;
      })}
    </>
  );
}
