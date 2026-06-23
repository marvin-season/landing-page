"use client";

import { cn } from "@landing-page/utils";
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
} from "@/components/ai-elements/conversation";
import { ChatMessageShell } from "@/components/chat/chat-message-shell";
import Markdown from "@/components/markdown";
import { MessageItem } from "@/components/message/message-item";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { useTRPC } from "@/lib/trpc";
import { ActionCard } from "../../_components/ActionCard";
import { ResponseSection } from "../../_components/ResponseSection";
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
    className: "agent-blue-fill rotate-[-0.8deg]",
  },
  {
    icon: WandSparkles,
    title: "内容生成",
    description: "拆解问题、整理方案",
    className: "agent-yellow-fill rotate-[0.7deg]",
  },
  {
    icon: Mail,
    title: "工具调用",
    description: "按需执行邮件等任务",
    className: "agent-green-fill rotate-[-0.4deg]",
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
    onComplete: refetchHistory,
  });
  const { messageId, blocks, streamingText, streamingTool } = state;

  const handleSendText = (text: string) => {
    setPendingUserMessage(text);
    send({ text, threadId, url: "/api/chat" });
  };

  const showEmptyState =
    !historyLoading &&
    historyMessages.length === 0 &&
    !loading &&
    pendingUserMessage == null;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <span className="agent-doodle-corner right-8 top-6 hidden rotate-[7deg] md:block">
        stream notes
      </span>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        <div className="min-h-0 flex-1 overflow-y-auto py-6 sm:py-8">
          {error != null ? (
            <Alert className="agent-hand-border-soft mb-4 bg-white/80 text-destructive">
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
          ) : null}

          <Conversation className="h-full">
            <ConversationContent>
              {historyLoading ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Loading history...
                </p>
              ) : showEmptyState ? (
                <div className="flex min-h-full items-center justify-center py-8">
                  <div className="agent-paper-panel agent-hand-border w-full max-w-3xl space-y-6 px-5 py-6 sm:px-7">
                    <div className="text-center">
                      <div className="agent-hand-border-soft agent-crayon-fill mx-auto mb-4 flex size-14 rotate-[-2deg] items-center justify-center">
                        <Bot className="size-6" />
                      </div>
                      <p className="agent-doodle-chip mx-auto inline-flex px-3 py-1 text-sm font-bold text-[var(--agent-muted-ink)]">
                        New conversation
                      </p>
                      <h1 className="mt-3 text-2xl font-black tracking-tight md:text-4xl">
                        What can I help you work through?
                      </h1>
                      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--agent-muted-ink)]">
                        Ask a question, request a lookup, or start from one of
                        the examples below.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {capabilityItems.map((item) => (
                        <div
                          key={item.title}
                          className={cn(
                            "agent-hand-border-soft p-4 transition-transform hover:rotate-0",
                            item.className,
                          )}
                        >
                          <item.icon className="mb-3 size-5" />
                          <h2 className="text-sm font-black">{item.title}</h2>
                          <p className="mt-1 text-xs text-[var(--agent-muted-ink)]">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="agent-hand-border-soft bg-white/55 p-3">
                      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold text-[var(--agent-muted-ink)]">
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
                              className="agent-doodle-chip h-auto justify-start px-3 py-3 text-left text-xs hover:bg-white"
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
              {loading && pendingUserMessage != null && (
                <ChatMessageShell role="user">
                  <div className="wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <Markdown>{pendingUserMessage}</Markdown>
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

        <div className="sticky bottom-0 shrink-0 bg-[linear-gradient(to_top,var(--agent-paper)_70%,transparent)] pt-2 pb-4 backdrop-blur supports-backdrop-filter:bg-[rgba(255,253,244,0.82)] sm:py-6">
          <ActionCard
            messageId={messageId}
            loading={loading}
            showPresets={!showEmptyState}
            onSend={({ text }) => handleSendText(text)}
          />
        </div>
      </div>
    </div>
  );
}
