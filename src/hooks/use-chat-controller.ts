import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useChatStore, useCurrentSession } from "@/store/session-store";

export function useChatController() {
  const {
    currentSessionId,
    updateSessionMessages,
    updateSessionTitle,
    selectedMessageId,
    setSelectedMessageId,
  } = useChatStore();

  const currentSessionMessages = useCurrentSession();
  
  const currentSession = useChatStore(
    useShallow((state) =>
      state.currentSessionId
        ? state.sessions.find((s) => s.id === state.currentSessionId)
        : undefined,
    ),
  );

  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, setMessages, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    initialMessages: [], // We manage this manually via useEffect
    id: currentSessionId || undefined,
    onFinish: ({ messages: allMessages }) => {
      // Sync full history to store on every completion
      if (currentSessionId) {
        updateSessionMessages(currentSessionId, allMessages);
        
        // Reset selection to show latest
        setSelectedMessageId(null);

        // Update title logic
        if (
          currentSession?.title === "New Conversation" &&
          allMessages.length > 0
        ) {
          // Find the first user message text
          const firstUserText = allMessages
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

  // Sync stored messages to local state when session changes
  // Only sync if we are not currently streaming to avoid overwriting active state
  useEffect(() => {
    if (status === 'ready' || status === 'error') {
       setMessages(currentSessionMessages);
    }
  }, [currentSessionMessages, setMessages, status]);

  const displayMessages = useMemo(() => {
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setSelectedMessageId(null);
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  return {
    currentSession,
    messages, // Exposing raw messages if needed, but displayMessages is preferred
    displayMessages,
    inputValue,
    setInputValue,
    handleSubmit,
    isLoading,
    error,
    stop,
  };
}

