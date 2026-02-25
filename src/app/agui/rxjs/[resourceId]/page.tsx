"use client";

/**
 * 流式对话页：历史记录用接口数据 + MessageItem 渲染；当前轮补充「问题」并保留 ResponseSection 流式输出。
 */
import type { UIMessage } from "ai";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MessageItem from "@/app/agent/_components/message/message-item";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message as MessageBubble,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { ActionCard } from "../components/ActionCard";
import { ResponseSection } from "../components/ResponseSection";

function extractUserText(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const first = messages[0];
  if (!first || typeof first !== "object") return "";
  const parts = (first as { parts?: Array<{ type?: string; text?: string }> })
    .parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p?.type === "text" && p.text)
    .map((p) => p.text)
    .join("")
    .trim();
}

export default function RxjsResourcePage() {
  const params = useParams();
  const resourceId =
    typeof params.resourceId === "string" ? params.resourceId : "";

  const [historyMessages, setHistoryMessages] = useState<UIMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );

  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

  const hasCurrentOutput =
    blocks.length > 0 ||
    (streamingText != null && streamingText !== "") ||
    streamingTool !== null;

  useEffect(() => {
    if (!resourceId) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    fetch(`/api/chat?resourceId=${encodeURIComponent(resourceId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        setHistoryMessages(Array.isArray(data) ? (data as UIMessage[]) : []);
      })
      .catch(() => setHistoryMessages([]))
      .finally(() => setHistoryLoading(false));
  }, [resourceId]);

  const handleSend = useCallback(
    (body: Record<string, unknown>) => {
      setPendingUserMessage(extractUserText(body));
      send(body);
    },
    [send],
  );

  if (!resourceId) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">无效的会话 ID</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <ActionCard
        resourceId={resourceId}
        messageId={messageId}
        loading={loading}
        onSend={handleSend}
      />

      {error != null ? (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertDescription>错误: {error}</AlertDescription>
        </Alert>
      ) : null}

      <Conversation className="flex-1">
        <ConversationContent>
          {historyLoading ? (
            <p className="py-4 text-sm text-muted-foreground">加载历史…</p>
          ) : (
            historyMessages.map((message) => (
              <MessageItem
                key={message.id}
                m={message}
                status={loading ? "streaming" : "ready"}
              />
            ))
          )}

          {pendingUserMessage != null && (loading || hasCurrentOutput) ? (
            <MessageBubble from="user">
              <MessageContent>
                <MessageResponse>{pendingUserMessage}</MessageResponse>
              </MessageContent>
            </MessageBubble>
          ) : null}

          <ResponseSection
            blocks={blocks}
            streamingTool={streamingTool}
            streamingText={streamingText}
          />
        </ConversationContent>
      </Conversation>
    </div>
  );
}
