"use client";

import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatError } from "@/app/agent/_components/chat-error";
import ChatInputForm from "@/app/agent/_components/chat-input-form";
import { ChatLoading } from "@/app/agent/_components/chat-loading";
import MessageItem from "@/app/agent/_components/message/message-item";
import { EmptySession } from "@/app/agent/_components/session/empty-session";
import { useDisplayMessages } from "@/app/agent/_hooks/use-display-messages";
import { useMessagesPagination } from "@/app/agent/_hooks/use-messages-pagination";
import { getLastUserMessage } from "@/app/agent/_utils";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildSubmitMessageBody } from "@/lib/chat/api";
import {
  buildPendingUserMessage,
  buildStreamingAssistantMessage,
} from "@/lib/chat/streaming-message";
import { AgentConstant } from "@/lib/constant/agent";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { useCurrentMessages, useMessageStore } from "@/store/message-store";
import { useCurrentSession, useSessionStore } from "@/store/session-store";
import { ModelSelector } from "./model-selector";

export function ChatMain() {
  const { updateSession } = useSessionStore();
  const { selectedMessageId, setSelectedMessageId } = useMessageStore();

  const currentSession = useCurrentSession();
  const sessionId = currentSession?.id ?? "";
  const { messages: currentMessages, refetch } = useCurrentMessages(sessionId);
  const {
    state: streamState,
    send,
    loading: isLoading,
    error,
    stop,
  } = useChatStreamState("/api/chat");

  const [pendingUser, setPendingUser] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [needRefreshAfterStream, setNeedRefreshAfterStream] = useState(false);

  const status: ChatStatus = isLoading ? "streaming" : "ready";

  const streamingAssistant = useMemo(
    () => buildStreamingAssistantMessage(streamState, sessionId),
    [streamState, sessionId],
  );
  const pendingUserMessage = useMemo(
    () =>
      pendingUser
        ? buildPendingUserMessage(pendingUser.text, pendingUser.id)
        : null,
    [pendingUser],
  );

  const messages = useMemo(() => {
    const merged: UIMessage[] = [...currentMessages];
    if (pendingUserMessage && (isLoading || streamingAssistant)) {
      merged.push(pendingUserMessage);
    }
    const hasSameAssistantInHistory =
      streamingAssistant != null &&
      currentMessages.some((m) => m.id === streamingAssistant.id);
    if (streamingAssistant && !hasSameAssistantInHistory) {
      merged.push(streamingAssistant);
    }
    return merged;
  }, [currentMessages, pendingUserMessage, isLoading, streamingAssistant]);

  useEffect(() => {
    const lastUserMessage = getLastUserMessage(messages);
    if (lastUserMessage && !pendingUser) {
      setSelectedMessageId(lastUserMessage.id);
    }
  }, [messages, pendingUser, setSelectedMessageId]);

  useEffect(() => {
    if (!needRefreshAfterStream || isLoading) return;
    setNeedRefreshAfterStream(false);
    setPendingUser(null);
    void refetch();
  }, [needRefreshAfterStream, isLoading, refetch]);

  const displayMessages = useDisplayMessages(messages, selectedMessageId);
  const isNewSession = displayMessages.length === 0;

  const { onPagination } = useMessagesPagination({
    messages,
    selectedMessageId,
    setSelectedMessageId,
  });

  const handleSubmit = useCallback(
    async (data: { input: string }) => {
      const text = data.input.trim();
      if (!text || !sessionId) return;

      const pendingId = crypto.randomUUID();
      setPendingUser({ id: pendingId, text });
      setSelectedMessageId(pendingId);
      setNeedRefreshAfterStream(true);

      send(
        buildSubmitMessageBody({
          resourceId: sessionId,
          text,
          agentId: AgentConstant.GENERAL_AGENT,
        }),
      );

      updateSession(sessionId, {
        hasMessages: true,
        ...(currentSession?.title === "New Conversation"
          ? { title: text.slice(0, 30) }
          : {}),
      });
    },
    [
      sessionId,
      setSelectedMessageId,
      send,
      updateSession,
      currentSession?.title,
    ],
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  if (!currentSession) {
    return <EmptySession />;
  }

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 h-full bg-slate-50/30 ${
        !isNewSession ? "" : "justify-center"
      }`}
    >
      {!isNewSession && (
        <ScrollArea
          onScrollUp={() => onPagination("previous")}
          onScrollDown={() => onPagination("next")}
          className="-mt-16 flex-1 min-h-0 overflow-y-auto scroll-smooth p-4 pt-20 sm:p-6 sm:pt-22 mx-auto w-full lg:max-w-7xl space-y-6 pb-6"
        >
          {displayMessages.map((m, index) => {
            return (
              <MotionDiv
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.15 * ((index + 1) / displayMessages.length),
                }}
              >
                <MessageItem m={m} status={status} />
              </MotionDiv>
            );
          })}

          {isLoading &&
            displayMessages[displayMessages.length - 1]?.role === "user" && (
              <ChatLoading />
            )}

          {error && <ChatError message={error} />}
        </ScrollArea>
      )}

      <MotionDiv
        layout="position"
        initial={{ y: 10, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {!currentSession?.hasMessages && <ModelSelector />}

        <ChatInputForm
          className="sticky bottom-0 z-20 w-full lg:max-w-3xl mx-auto shrink-0 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          onSubmit={handleSubmit}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </MotionDiv>
    </div>
  );
}
