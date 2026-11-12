"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { useChatStreamState } from "@landing-page/utils/stream";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  CloudSun,
  Mail,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatMessageShell } from "@/components/chat/chat-message-shell";
import Markdown from "@/components/markdown";
import { MessageItem } from "@/components/message/message-item";
import { buildSubmitMessageBody } from "@/lib/stream/chat-request";
import { useTRPC } from "@/lib/trpc";
import { ActionCard } from "../../_components/ActionCard";
import { ResponseSection } from "../../_components/ResponseSection";
import { ThreadHistoryLoading } from "../../_components/ThreadHistoryLoading";
import { PRESET_QUESTIONS } from "../../constants";

/**
 * 流式对话页：历史记录用接口数据 + MessageItem 渲染；当前轮补充「问题」并保留 ResponseSection 流式输出。
 */

type AgentThreadContentProps = {
  threadId: string;
};

const capabilityItems = [
  {
    icon: CloudSun,
    title: "实时查询",
    description: "天气、指数、数据检索",
  },
  {
    icon: WandSparkles,
    title: "内容生成",
    description: "拆解问题、整理方案",
  },
  {
    icon: Mail,
    title: "工具调用",
    description: "按需执行邮件等任务",
  },
] as const;

export function AgentThreadContent({ threadId }: AgentThreadContentProps) {
  const trpc = useTRPC();

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

  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );

  const { state, send, loading, error } = useChatStreamState({
    onComplete: () => {
      void refetchHistory();
    },
  });
  const { messageId, blocks, streamingText, streamingTool } = state;
  // 流结束后继续显示当前轮，直到历史记录包含这条回复，再一起切换。
  const showPendingTurn =
    pendingUserMessage != null &&
    (loading || !historyMessages.some((message) => message.id === messageId));

  const handleSendText = (text: string) => {
    setPendingUserMessage(text);
    send({
      url: "/api/chat",
      body: buildSubmitMessageBody({ text, threadId }),
    });
  };

  const showEmptyState =
    !historyLoading &&
    historyMessages.length === 0 &&
    !loading &&
    pendingUserMessage == null;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        <div className="min-h-0 flex-1 flex flex-col pt-6 sm:pt-8">
          {error != null ? (
            <Alert className="mb-4 border-destructive/30 text-destructive">
              <AlertDescription className="text-destructive">
                Error: {error}
              </AlertDescription>
            </Alert>
          ) : null}

          <Conversation className="min-h-0">
            <ConversationContent className="pb-0 [&>*:last-child]:mb-0">
              {historyLoading ? (
                <ThreadHistoryLoading />
              ) : showEmptyState ? (
                <div className="flex min-h-full items-center justify-center py-8">
                  <div className="w-full max-w-3xl space-y-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                        <Bot className="size-5" />
                      </div>
                      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                        What can I help you work through?
                      </h1>
                      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                        Ask a question, request a lookup, or start from one of
                        the examples below.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {capabilityItems.map((item) => (
                        <div
                          key={item.title}
                          className="rounded-lg border bg-card p-4"
                        >
                          <item.icon className="mb-3 size-5 text-muted-foreground" />
                          <h2 className="text-sm font-medium">{item.title}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border bg-card p-3">
                      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                        <Sparkles className="size-3.5" />
                        Try a prompt
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {PRESET_QUESTIONS.map((preset, index) => {
                          const Icon = index === 1 ? TrendingUp : Sparkles;
                          return (
                            <Button
                              key={preset.text}
                              type="button"
                              variant="ghost"
                              disabled={loading}
                              onClick={() => handleSendText(preset.text)}
                              className="h-auto justify-start px-3 py-3 text-left text-xs"
                            >
                              <Icon className="size-4 shrink-0" />
                              <span className="min-w-0 whitespace-normal">
                                {preset.label}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                historyMessages.map((message) => (
                  <MessageItem key={message.id} m={message} />
                ))
              )}
              {showPendingTurn && pendingUserMessage != null && (
                <ChatMessageShell role="user">
                  <div className="wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <Markdown>{pendingUserMessage}</Markdown>
                  </div>
                </ChatMessageShell>
              )}
              {showPendingTurn && (
                <ResponseSection
                  blocks={blocks}
                  streamingTool={streamingTool}
                  streamingText={streamingText}
                />
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="回到底部" title="回到底部" />
          </Conversation>
        </div>

        <div className="sticky bottom-0 shrink-0 bg-background pt-2 pb-4 sm:pb-6">
          <ActionCard
            messageId={messageId}
            loading={loading || historyLoading}
            showPresets={!showEmptyState && !historyLoading}
            onSend={({ text }) => handleSendText(text)}
          />
        </div>
      </div>
    </div>
  );
}
