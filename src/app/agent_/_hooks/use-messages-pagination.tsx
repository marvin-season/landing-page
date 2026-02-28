import type { UIMessage } from "ai";
import { useCallback, useMemo } from "react";
import { getUserMessages } from "@/app/agent/_utils";
import { useChatSettingsStore } from "@/store/chat-settings-store";
import type { IMessageStore } from "@/store/message-store";

/**
 *
 * @param params.messages 消息列表
 * @param params.selectedMessageId 选中的消息用户消息id
 * @param params.setSelectedMessageId 设置选中的消息用户消息id
 * @returns 分页操作函数, 向前/向后翻页
 */
export function useMessagesPagination(params: {
  messages: UIMessage[];
  selectedMessageId?: string;
  setSelectedMessageId: IMessageStore["setSelectedMessageId"];
}) {
  const { messages, selectedMessageId, setSelectedMessageId } = params;
  const isSettingEnabled = useChatSettingsStore((s) => s.isSettingEnabled);
  const userMessages = useMemo(() => getUserMessages(messages), [messages]);

  const onPagination = useCallback(
    (direction: "previous" | "next") => {
      if (isSettingEnabled("fixed-chat")) return;

      if (!selectedMessageId) return;
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
    },
    [isSettingEnabled, selectedMessageId, setSelectedMessageId, userMessages],
  );

  return {
    onPagination,
  };
}
