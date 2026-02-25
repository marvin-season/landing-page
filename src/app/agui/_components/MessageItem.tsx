import type { Message as AgentMessage, Message as TMessage } from "@ag-ui/core";
import { memo } from "react";
import { getToolResult } from "@/app/agui/_components/ConversationPanel";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { logger } from "@/lib/logger";

// 获取消息文本内容
function getMessageContent(message: AgentMessage): string {
  if (message.role === "user") {
    const content = message.content;
    if (typeof content === "string") return content;
    return "";
  }
  if (message.role === "assistant") {
    return message.content || "";
  }

  return "";
}

interface MessageItemProps {
  message: TMessage;
  messages: TMessage[];
}

export const MessageItem = memo(
  (props: MessageItemProps) => {
    const { message, messages } = props;
    // 跳过 tool message，它们会作为工具调用的输出显示
    if (message.role === "tool") return null;

    // 跳过 developer/system message
    if (message.role === "developer" || message.role === "system") return null;

    // 跳过 activity message
    if (message.role === "activity") return null;

    const content = getMessageContent(message);
    logger("message", message);

    return (
      <div>
        {/* 消息内容 */}
        {message.role === "assistant" &&
          message.toolCalls?.map((toolCall, index) => {
            const result = getToolResult(messages, toolCall.id);
            const toolArgs = toolCall.function?.arguments
              ? JSON.parse(toolCall.function.arguments)
              : {};

            return (
              <Tool key={index}>
                <ToolHeader
                  type="tool-invocation"
                  state={result ? "output-available" : "input-streaming"}
                  className="cursor-pointer"
                />
                <ToolContent>
                  <ToolInput input={toolArgs} />
                  <ToolOutput
                    output={result?.output}
                    errorText={result?.error}
                  />
                </ToolContent>
              </Tool>
            );
          })}
        {content && (
          <Message from={message.role}>
            <MessageContent>
              <MessageResponse>{content}</MessageResponse>
            </MessageContent>
          </Message>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.message.content === nextProps.message.content;
  },
);
