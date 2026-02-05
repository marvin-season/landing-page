import { MessageItem } from "@/app/agui/_components/MessageItem";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { logger } from "@/lib/logger";
import { useCurrentAgent } from "../store";

export const MessageList = () => {
  const messages = useCurrentAgent((state) => state.agent.messages);
  logger("messages", messages);

  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.map((message) => {
          return <MessageItem key={message.id} message={message} />;
        })}
      </ConversationContent>
    </Conversation>
  );
};
