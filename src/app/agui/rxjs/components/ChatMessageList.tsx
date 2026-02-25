"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatStreamState } from "@/lib/stream/chat-stream-state";
import type { ChatDisplayMessage } from "../hooks/use-chat-history";
import { ChatMessageBubble } from "./ChatMessageBubble";

type ChatMessageListProps = {
  messages: ChatDisplayMessage[];
  streamingState: ChatStreamState | null;
  loading: boolean;
  historyLoading?: boolean;
};

export function ChatMessageList({
  messages,
  streamingState,
  loading,
  historyLoading,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 流式输出时需随内容更新滚动到底
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on stream content change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loading, streamingState]);

  const hasStreaming =
    loading &&
    streamingState &&
    (streamingState.blocks.length > 0 ||
      (streamingState.streamingText != null &&
        streamingState.streamingText !== "") ||
      streamingState.streamingTool !== null);

  if (historyLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">加载历史消息…</p>
      </div>
    );
  }

  if (messages.length === 0 && !hasStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">暂无消息</p>
        <p className="text-xs text-muted-foreground">在下方输入问题开始对话</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 px-1">
      <div className="flex flex-col gap-6 py-4">
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        {hasStreaming && streamingState ? (
          <ChatMessageBubble streaming={streamingState} />
        ) : null}
      </div>
    </ScrollArea>
  );
}
