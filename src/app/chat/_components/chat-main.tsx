"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot } from "lucide-react";
import { useEffect } from "react";
import { ChatError } from "@/app/chat/_components/chat-error";
import { ChatHeader } from "@/app/chat/_components/chat-header";
import { ChatInputForm } from "@/app/chat/_components/chat-input-form";
import { ChatLoading } from "@/app/chat/_components/chat-loading";
import { MessageItem } from "@/app/chat/_components/message/message-item";
import { useDisplayMessages } from "@/app/chat/_hooks/use-display-messages";
import { useMessagesPagination } from "@/app/chat/_hooks/use-messages-pagination";
import { usePageWheel } from "@/app/chat/_hooks/use-page-wheel";
import { getLastUserMessage } from "@/app/chat/_utils";
import { MotionDiv } from "@/components/ui";
import { useCurrentMessages, useMessageStore } from "@/store/message-store";
import { useCurrentSession, useSessionStore } from "@/store/session-store";

export function ChatMain(props: {
  sessionId: string;
  onOpenHistory?: () => void;
}) {
  const { sessionId, onOpenHistory } = props;
  const { updateSessionTitle } = useSessionStore();
  const { selectedMessageId, addMessages, setSelectedMessageId } =
    useMessageStore();
  const currentMessages = useCurrentMessages(sessionId);

  const currentSession = useCurrentSession(sessionId);
  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    id: sessionId,
    onFinish: ({ messages }) => {
      console.log("onFinish", messages);
      // update
      addMessages(sessionId, messages);
      const lastUserMessage = getLastUserMessage(messages);
      if (lastUserMessage) {
        setSelectedMessageId(lastUserMessage.id);
      }

      if (currentSession?.title === "New Conversation") {
        // Find the first user message text
        const firstUserText = messages
          .find((m) => m.role === "user")
          ?.parts.find((p) => p.type === "text")?.text;

        if (firstUserText) {
          updateSessionTitle(sessionId, firstUserText.slice(0, 30));
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    setMessages(currentMessages);
    const lastUserMessage = getLastUserMessage(currentMessages);
    if (lastUserMessage) {
      setSelectedMessageId(lastUserMessage.id);
    }
  }, [currentMessages, setMessages, setSelectedMessageId]);

  const displayMessages = useDisplayMessages(messages, selectedMessageId);

  const { onPagination } = useMessagesPagination({
    messages,
    selectedMessageId,
    setSelectedMessageId,
  });

  const { handleWheel, scrollContainerRef } = usePageWheel({
    onScrollUp: () => onPagination("previous"),
    onScrollDown: () => onPagination("next"),
  });

  if (!currentSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 text-slate-400 gap-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
          <Bot className="w-8 h-8 opacity-20" />
        </div>
        <p>Select or create a chat to begin</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
      <ChatHeader
        currentSession={currentSession}
        messagesCount={currentMessages.length}
        onPageChange={onPagination}
        onOpenHistory={onOpenHistory}
      />

      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-6 pb-6">
          {displayMessages.map((m, index) => {
            return (
              <MotionDiv
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 * index }}
              >
                <MessageItem key={m.id} m={m} status={status} />
              </MotionDiv>
            );
          })}

          {isLoading &&
            displayMessages[displayMessages.length - 1].role === "user" && (
              <ChatLoading />
            )}

          {error && <ChatError message={error.message} />}
        </div>
      </div>

      <ChatInputForm
        onSubmit={async (data) => {
          setSelectedMessageId(undefined);
          sendMessage({ text: data.input });
        }}
        onStop={() => {
          stop();
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
