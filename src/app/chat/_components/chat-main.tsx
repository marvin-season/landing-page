"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ChatError } from "@/app/chat/_components/chat-error";
import { ChatHeader } from "@/app/chat/_components/chat-header";
import { ChatInputForm } from "@/app/chat/_components/chat-input-form";
import { ChatLoading } from "@/app/chat/_components/chat-loading";
import { ChatMessage } from "@/app/chat/_components/chat-message";
import { useCurrentMessages, useMessageStore } from "@/store/message-store";
import { useCurrentSession, useSessionStore } from "@/store/session-store";

export function ChatMain({ sessionId }: { sessionId: string }) {
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
      const userMessages = messages.filter((m) => m.role === "user");
      if (userMessages.length > 0) {
        setSelectedMessageId(userMessages[userMessages.length - 1].id);
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
  }, [currentMessages, setMessages]);

  const displayMessages = useMemo(() => {
    if (messages.length === 0) return [];
    if (selectedMessageId) {
      const index = messages.findLastIndex((m) => m.id === selectedMessageId);
      if (index !== -1) {
        const userMsg = messages[index];
        const assistantMessage = messages[index + 1];
        return [userMsg, assistantMessage].filter(Boolean);
      }
    }
    return messages.slice(-2);
  }, [messages, selectedMessageId]);

  const onPageChange = (step: -2 | 2) => {
    if (!selectedMessageId) return;
    const index = messages.findLastIndex((m) => m.id === selectedMessageId);
    if (index === -1) return;

    const targetMessage = messages[index + step];
    if (targetMessage) {
      setSelectedMessageId(targetMessage.id);
    }
  };

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
    <div className="flex-1 flex flex-col h-full bg-slate-50/30">
      <ChatHeader
        currentSession={currentSession}
        messagesCount={currentMessages.length}
        onPageChange={onPageChange}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          <ChatMessage messages={displayMessages} status={status} />

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
