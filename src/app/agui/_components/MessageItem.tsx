import type { Message as AgentMessage, Message as TMessage } from "@ag-ui/core";
import { memo } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

// 获取消息文本内容
function getMessageContent(message: AgentMessage): string {
  if (message.role === "user") {
    const content = message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
    }
    return "";
  }
  if (message.role === "assistant") {
    return message.content || "";
  }
  if (message.role === "tool") {
    return message.content;
  }
  return "";
}

export const MessageItem = memo((props: { message: TMessage }) => {
  const { message } = props;
  // 跳过 tool message，它们会作为工具调用的输出显示
  if (message.role === "tool") return null;

  // 跳过 developer/system message
  if (message.role === "developer" || message.role === "system") return null;

  // 跳过 activity message
  if (message.role === "activity") return null;

  const content = getMessageContent(message);

  return (
    <div>
      {/* 消息内容 */}
      {content && (
        <Message from={message.role}>
          <MessageContent>
            <MessageResponse>{content}</MessageResponse>
          </MessageContent>
        </Message>
      )}
    </div>
  );
});
