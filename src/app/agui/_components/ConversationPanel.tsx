import type { Message as AgentMessage, AssistantMessage } from "@ag-ui/core";
import { memo } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
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

// 检查是否是 AssistantMessage
function isAssistantMessage(
  message: AgentMessage,
): message is AssistantMessage {
  return message.role === "assistant";
}

// 获取 tool message 的结果
function getToolResult(
  messages: AgentMessage[],
  toolCallId: string,
): { output?: string; error?: string } | undefined {
  const toolMessage = messages.find(
    (m) => m.role === "tool" && m.toolCallId === toolCallId,
  );
  if (toolMessage && toolMessage.role === "tool") {
    return {
      output: toolMessage.content,
      error: toolMessage.error,
    };
  }
  return undefined;
}

const ConversationPanel = (props: { messages: AgentMessage[] }) => {
  const { messages } = props;

  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.map((message) => {
          // 跳过 tool message，它们会作为工具调用的输出显示
          if (message.role === "tool") return null;

          // 跳过 developer/system message
          if (message.role === "developer" || message.role === "system")
            return null;

          // 跳过 activity message
          if (message.role === "activity") return null;

          const content = getMessageContent(message);

          return (
            <div key={message.id}>
              {/* 工具调用 */}
              {isAssistantMessage(message) &&
                message.toolCalls?.map((toolCall) => {
                  const result = getToolResult(messages, toolCall.id);
                  const toolArgs = toolCall.function?.arguments
                    ? JSON.parse(toolCall.function.arguments)
                    : {};

                  return (
                    <Tool key={toolCall.id}>
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
        })}

        <ConversationScrollButton />
      </ConversationContent>
    </Conversation>
  );
};

export default memo(ConversationPanel);
