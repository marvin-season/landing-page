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
import {
  useChatStore,
  useCurrentSession,
  useCurrentSessionMessages,
} from "@/store/chat-store";

export function ChatMain({ sessionId }: { sessionId: string }) {
  const {
    currentSessionId,
    updateSessionMessages,
    updateSessionTitle,
    selectedMessageId,
    setSelectedMessageId,
  } = useChatStore();

  const currentSessionMessages = useCurrentSessionMessages(sessionId);

  const currentSession = useCurrentSession(sessionId);
  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    id: sessionId,
    onFinish: ({ messages }) => {
      console.log("onFinish", messages);
      // Sync full history to store on every completion
      if (currentSessionId) {
        updateSessionMessages(currentSessionId, messages);

        // Reset selection to show latest
        setSelectedMessageId(null);

        // Update title if it's the first exchange (User + Assistant)
        // Check if we previously had 0 messages, and now we have 2 (User+AI)
        // Or simple check: if title is "New Conversation" and we have content
        if (
          currentSession?.title === "New Conversation" &&
          messages.length > 0
        ) {
          // Find the first user message text
          const firstUserText = messages
            .find((m) => m.role === "user")
            ?.parts.find((p) => p.type === "text")?.text;

          if (firstUserText) {
            updateSessionTitle(currentSessionId, firstUserText.slice(0, 30));
          }
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    setMessages(currentSessionMessages);
  }, [currentSessionMessages, setMessages]);

  const displayMessages = useMemo(() => {
    // We use 'messages' from useChat hook which reflects the current active state
    // But if we are just browsing (no active stream), 'messages' is initialized from 'storedMessages'

    // If we are actively streaming/loading, we definitely want to show 'messages' (which includes the streaming part)
    // If selectedMessageId is active, we filter based on that ID.

    if (messages.length === 0) return [];

    let targetUserMsgIndex = -1;

    if (selectedMessageId) {
      targetUserMsgIndex = messages.findIndex(
        (m) => m.id === selectedMessageId && m.role === "user",
      );
    }

    // Default to the last user message if no specific selection
    if (targetUserMsgIndex === -1) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          targetUserMsgIndex = i;
          break;
        }
      }
    }

    if (targetUserMsgIndex === -1) return [];

    const userMsg = messages[targetUserMsgIndex];
    const assistantMessages = [];
    // Get all messages after the user message until the next user message
    for (let i = targetUserMsgIndex + 1; i < messages.length; i++) {
      if (messages[i].role === "user") break;
      assistantMessages.push(messages[i]);
    }

    return [userMsg, ...assistantMessages];
  }, [messages, selectedMessageId]);

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
        title={currentSession.title}
        messagesCount={messages.length}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          <ChatMessage messages={displayMessages} />

          {isLoading &&
            displayMessages.length === 1 &&
            displayMessages[0].role === "user" && <ChatLoading />}

          {error && <ChatError message={error.message} />}
        </div>
      </div>

      <ChatInputForm
        onSubmit={async (data) => {
          setSelectedMessageId(null);
          sendMessage({ text: data.input });
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
