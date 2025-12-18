"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect } from "react";
import { ChatError } from "@/app/chat/_components/chat-error";
import { ChatInputForm } from "@/app/chat/_components/chat-input-form";
import { ChatLoading } from "@/app/chat/_components/chat-loading";
import { MessageItem } from "@/app/chat/_components/message/message-item";
import { EmptySession } from "@/app/chat/_components/session/empty-session";
import { useDisplayMessages } from "@/app/chat/_hooks/use-display-messages";
import { useMessagesPagination } from "@/app/chat/_hooks/use-messages-pagination";
import { getLastUserMessage } from "@/app/chat/_utils";
import { MotionDiv, ScrollArea } from "@/components/ui";
import { useCurrentMessages, useMessageStore } from "@/store/message-store";
import { useCurrentSession, useSessionStore } from "@/store/session-store";

export function ChatMain(props: { sessionId: string }) {
  const { sessionId } = props;
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
  const hasDisplayMessages = displayMessages.length > 0;

  const { onPagination } = useMessagesPagination({
    messages,
    selectedMessageId,
    setSelectedMessageId,
  });

  if (!currentSession) {
    return <EmptySession />;
  }

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 h-full bg-slate-50/30 ${
        hasDisplayMessages ? "" : "justify-center"
      }`}
    >
      {hasDisplayMessages && (
        <ScrollArea
          onScrollUp={() => onPagination("previous")}
          onScrollDown={() => onPagination("next")}
          className="-mt-16 flex-1 min-h-0 overflow-y-auto scroll-smooth p-4 pt-20 sm:p-6 sm:pt-22 mx-auto w-full lg:max-w-4xl space-y-6 pb-6"
        >
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
        </ScrollArea>
      )}

      <MotionDiv
        initial={{ y: 10, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.25 }}
      >
        <ChatInputForm
          className="sticky bottom-0 z-20 w-full lg:max-w-3xl mx-auto shrink-0 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          onSubmit={async (data) => {
            setSelectedMessageId(undefined);
            sendMessage({ text: data.input });
          }}
          onStop={() => {
            stop();
          }}
          isLoading={isLoading}
        />
      </MotionDiv>
    </div>
  );
}
