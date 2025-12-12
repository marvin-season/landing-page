import type { UIMessage } from "ai";
import { useMemo } from "react";

/**
 * 根据选中的消息id，获取显示的消息列表
 * @param messages 消息列表
 * @param selectedMessageId 选中的消息用户消息id
 * @returns 显示的消息列表
 */
export function useDisplayMessages(
  messages: UIMessage[],
  selectedMessageId?: string,
) {
  const displayMessages = useMemo(() => {
    if (messages.length === 0) return [];
    if (selectedMessageId) {
      const index = messages.findLastIndex((m) => m.id === selectedMessageId);
      if (index !== -1) {
        return messages.slice(index < 0 ? 0 : index, index + 2).filter(Boolean);
      }
    }
    return messages.slice(-2);
  }, [messages, selectedMessageId]);

  return displayMessages;
}
