"use client";

/**
 * 流式对话页：历史记录用接口数据 + MessageItem 渲染；当前轮补充「问题」并保留 ResponseSection 流式输出。
 */
import type { UIMessage } from "ai";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MessageItem from "@/app/agent/_components/message/message-item";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { ChatMessageShell } from "@/components/chat/chat-message-shell";
import Markdown from "@/components/markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchChatHistory } from "@/lib/chat/api";
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
  const router = useRouter();
  const threadId = typeof params.threadId === "string" ? params.threadId : "";
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
    if (!threadId) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    fetchChatHistory({ threadId })
      .then((data) => setHistoryMessages(data))
      .catch(() => setHistoryMessages([]))
      .finally(() => setHistoryLoading(false));
  }, [threadId]);

  const handleSend = useCallback(
    (body: Record<string, unknown>) => {
      setPendingUserMessage(extractUserText(body));
      send(body);
    },
    [send],
  );

  if (!threadId) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
          <p className="text-sm text-muted-foreground">无效的会话 ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-4/5 flex-1 flex-col px-4 sm:px-6 2xl:max-w-3/5 4xl:max-w-2/5">
        <div className="sticky top-4 z-20 mb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80"
            onClick={() => router.push("/agui/rxjs")}
          >
            <ArrowLeft className="size-4" aria-hidden />
            返回会话列表
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-6 sm:py-8">
          {error != null ? (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10 text-destructive">
              <AlertDescription>错误: {error}</AlertDescription>
            </Alert>
          ) : null}

          <Conversation className="h-full">
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
                <ChatMessageShell role="user">
                  <div className="wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <Markdown>{pendingUserMessage}</Markdown>
                  </div>
                </ChatMessageShell>
              ) : null}

              <ResponseSection
                blocks={blocks}
                streamingTool={streamingTool}
                streamingText={streamingText}
                layout="message"
              />
            </ConversationContent>
          </Conversation>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-border/80 bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:py-6">
          <ActionCard
            resourceId={threadId}
            messageId={messageId}
            loading={loading}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
