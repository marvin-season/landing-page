import type { UIMessage } from "ai";
import { getUserMessages } from "@/app/chat/_utils";
import type { IMessageStore } from "@/store/message-store";

export function useMessagesPagination(params: {
  messages: UIMessage[];
  selectedMessageId?: string;
  setSelectedMessageId: IMessageStore["setSelectedMessageId"];
}) {
  const { messages, selectedMessageId, setSelectedMessageId } = params;
  const onPagination = (direction: "previous" | "next") => {
    if (!selectedMessageId) return;
    const userMessages = getUserMessages(messages);
    const currentMessageIndex = userMessages.findIndex(
      (m) => m.id === selectedMessageId,
    );
    if (currentMessageIndex === -1) return;

    const targetMessageIndex =
      direction === "previous"
        ? currentMessageIndex - 1
        : currentMessageIndex + 1;
    if (targetMessageIndex < 0 || targetMessageIndex >= userMessages.length)
      return;
    const targetMessage = userMessages[targetMessageIndex];
    if (targetMessage) {
      setSelectedMessageId(targetMessage.id);
    }
  };

  return {
    onPagination,
  };
}
