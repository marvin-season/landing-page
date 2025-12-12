import type { UIMessage } from "ai";
import type { IMessageStore } from "@/store/message-store";

export function usePageMessages(params: {
  messages: UIMessage[];
  selectedMessageId?: string;
  setSelectedMessageId: IMessageStore["setSelectedMessageId"];
}) {
  const { messages, selectedMessageId, setSelectedMessageId } = params;
  const onPageChange = (step: -2 | 2) => {
    if (!selectedMessageId) return;
    const index = messages.findLastIndex((m) => m.id === selectedMessageId);
    if (index === -1) return;

    const targetMessage = messages[index + step];
    if (targetMessage) {
      setSelectedMessageId(targetMessage.id);
    } else {
      setSelectedMessageId(step > 0 ? messages.at(-1)?.id : messages.at(0)?.id);
    }
  };

  return {
    onPageChange,
  };
}
