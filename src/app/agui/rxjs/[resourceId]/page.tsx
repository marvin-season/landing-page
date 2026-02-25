"use client";

import { nanoid } from "nanoid";
/**
 * 流式对话页：展示历史消息 + 当前会话，发送后流式展示助理回复（类主流智能问答）。
 */
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ChatStreamState } from "@/lib/stream/chat-stream-state";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { ChatInput } from "../components/ChatInput";
import { ChatMessageList } from "../components/ChatMessageList";
import type { ChatDisplayMessage } from "../hooks/use-chat-history";
import { useChatHistory } from "../hooks/use-chat-history";

export default function RxjsResourcePage() {
  const params = useParams();
  const resourceId =
    typeof params.resourceId === "string" ? params.resourceId : "";

  const {
    messages: historyMessages,
    isLoading: historyLoading,
    error: historyError,
  } = useChatHistory(resourceId || null);
  const [sessionMessages, setSessionMessages] = useState<ChatDisplayMessage[]>(
    [],
  );

  const { state, send, loading, error } = useChatStreamState("/api/chat");

  const handleSend = useCallback(
    (body: Record<string, unknown>) => {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const userMsg = messages[0];
      const text =
        userMsg &&
        typeof userMsg === "object" &&
        Array.isArray((userMsg as { parts?: unknown[] }).parts)
          ? ((userMsg as { parts: { type: string; text?: string }[] }).parts
              .filter((p) => p.type === "text" && p.text)
              .map((p) => p.text)
              .join("") ?? "")
          : "";
      if (text) {
        setSessionMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "user", content: text },
        ]);
      }
      send(body, {
        onComplete: (flushed: ChatStreamState) => {
          setSessionMessages((prev) => [
            ...prev,
            {
              id: flushed.messageId ?? nanoid(),
              role: "assistant",
              blocks: flushed.blocks.length > 0 ? flushed.blocks : undefined,
              content:
                flushed.blocks.length === 0 && flushed.streamingText
                  ? flushed.streamingText
                  : undefined,
            },
          ]);
        },
      });
    },
    [send],
  );

  const displayMessages = useMemo(
    () => [...historyMessages, ...sessionMessages],
    [historyMessages, sessionMessages],
  );

  if (!resourceId) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">无效的会话 ID</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      {(error ?? historyError) != null ? (
        <Alert className="mb-4 border-destructive/50 bg-destructive/10 text-destructive">
          <AlertDescription>错误: {error ?? historyError}</AlertDescription>
        </Alert>
      ) : null}

      <ChatMessageList
        messages={displayMessages}
        streamingState={state}
        loading={loading}
        historyLoading={historyLoading}
      />

      <ChatInput
        resourceId={resourceId}
        loading={loading}
        onSend={handleSend}
      />
    </div>
  );
}
