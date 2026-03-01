"use client";

/**
 * 流式对话页：历史记录用接口数据 + MessageItem 渲染；当前轮补充「问题」并保留 ResponseSection 流式输出。
 */
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { ChatMessageShell } from "@/components/chat/chat-message-shell";
import Markdown from "@/components/markdown";
import { MessageItem } from "@/components/message/message-item";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { useTRPC } from "@/lib/trpc";
import { ActionCard } from "../_components/ActionCard";
import { ResponseSection } from "../_components/ResponseSection";

export default function AgentThreadPage() {
  const params = useParams();
  const trpc = useTRPC();
  const threadId = params.threadId as string;

  const {
    data: historyMessages = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    ...trpc.thread.detailMessages.queryOptions({ threadId }),
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: !!threadId,
  });

  const { state, send, loading, error, userState } = useChatStreamState(
    "/api/chat",
    {
      onComplete: refetchHistory,
    },
  );
  const { messageId, blocks, streamingText, streamingTool } = state;

  if (!threadId) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
          <p className="text-sm text-muted-foreground">Invalid thread ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        <div className="min-h-0 flex-1 overflow-y-auto py-6 sm:py-8">
          {error != null ? (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10 text-destructive">
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
          ) : null}

          <Conversation className="h-full">
            <ConversationContent>
              {historyLoading ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Loading history...
                </p>
              ) : (
                historyMessages.map((message) => (
                  <MessageItem key={message.id} m={message} />
                ))
              )}
              {loading && userState.pendingUserMessage != null && (
                <ChatMessageShell role="user">
                  <div className="wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <Markdown>{userState.pendingUserMessage}</Markdown>
                  </div>
                </ChatMessageShell>
              )}
              {loading && (
                <ResponseSection
                  blocks={blocks}
                  streamingTool={streamingTool}
                  streamingText={streamingText}
                />
              )}
            </ConversationContent>
          </Conversation>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-border/80 bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:py-6">
          <ActionCard
            messageId={messageId}
            loading={loading}
            onSend={({ text }) => send({ text, threadId })}
          />
        </div>
      </div>
    </div>
  );
}
