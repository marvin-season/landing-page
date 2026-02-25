"use client";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { ChatStreamState } from "@/lib/stream/chat-stream-state";
import type { ChatDisplayMessage } from "../hooks/use-chat-history";
import { AssistantBubbleContent } from "./AssistantBubbleContent";

type ChatMessageBubbleProps =
  | { message: ChatDisplayMessage; streaming?: never }
  | { message?: never; streaming: ChatStreamState };

export function ChatMessageBubble(props: ChatMessageBubbleProps) {
  if ("streaming" in props && props.streaming) {
    const s = props.streaming;
    const hasContent =
      s.blocks.length > 0 ||
      (s.streamingText != null && s.streamingText !== "") ||
      s.streamingTool !== null;
    if (!hasContent) return null;
    return (
      <Message from="assistant">
        <MessageContent>
          <AssistantBubbleContent
            blocks={s.blocks}
            streamingTool={s.streamingTool}
            streamingText={s.streamingText}
          />
        </MessageContent>
      </Message>
    );
  }

  const msg = props.message;
  if (msg.role === "user") {
    return (
      <Message from="user">
        <MessageContent>
          <MessageResponse>{msg.content}</MessageResponse>
        </MessageContent>
      </Message>
    );
  }

  const content = msg.content;
  const blocks = msg.blocks ?? [];
  const hasBlocks = blocks.length > 0;
  if (!content && !hasBlocks) return null;

  return (
    <Message from="assistant">
      <MessageContent>
        {hasBlocks ? (
          <AssistantBubbleContent
            blocks={blocks}
            streamingTool={null}
            streamingText={null}
          />
        ) : (
          <MessageResponse>{content}</MessageResponse>
        )}
      </MessageContent>
    </Message>
  );
}
