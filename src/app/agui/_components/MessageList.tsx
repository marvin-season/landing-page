import ConversationPanel from "@/app/agui/_components/ConversationPanel";
import { useCurrentAgent } from "../store";

export const MessageList = () => {
  const messages = useCurrentAgent((state) => state.agent.messages);
  return <ConversationPanel messages={messages} />;
};
