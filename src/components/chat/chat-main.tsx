"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import dayjs from "dayjs";
import {
  Bot,
  BrainCircuit,
  Clock,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, setMessages, status, error } = useChat({
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

  console.log("messages", messages);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setSelectedMessageId(null);
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  const renderParts = (m: UIMessage) => {
    return m.parts.map((part, i) => {
      if (part.type === "text") {
        return (
          <span
            key={i}
            className="whitespace-pre-wrap leading-7 text-slate-700"
          >
            {part.text}
          </span>
        );
      }
      if (part.type === "reasoning") {
        return (
          <div
            key={i}
            className="my-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="bg-slate-100/50 px-3 py-2 flex items-center gap-2 border-b border-slate-200/50">
              <BrainCircuit size={14} className="text-violet-500" />
              <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">
                Reasoning Process
              </span>
            </div>
            <div className="p-3 font-mono text-xs leading-relaxed opacity-90">
              {part.text}
            </div>
          </div>
        );
      }
      return null;
    });
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
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="font-medium text-slate-900 truncate max-w-xl flex items-center gap-2.5">
          <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <Sparkles size={16} />
          </span>
          <div className="flex flex-col">
            <span className="truncate text-sm font-semibold">
              {currentSession?.title || "New Conversation"}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {messages.length} messages in this session
            </span>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
          <Clock size={12} />
          {dayjs().format("MMM D, HH:mm")}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          {displayMessages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
                  isUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                    isUser
                      ? "bg-slate-900 text-white"
                      : "bg-white text-primary border border-slate-100",
                  )}
                >
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div
                  className={cn(
                    "flex-1 max-w-[85%]",
                    isUser ? "text-right" : "text-left",
                  )}
                >
                  {isUser ? (
                    <div className="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md inline-block text-left">
                      {m.parts.map((p, i) =>
                        p.type === "text" ? (
                          <span
                            key={i}
                            className="whitespace-pre-wrap text-sm leading-relaxed"
                          >
                            {p.text}
                          </span>
                        ) : null,
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm px-6 py-5">
                      {renderParts(m)}
                    </div>
                  )}

                  <div
                    className={cn(
                      "text-[10px] text-slate-400 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
                      isUser ? "pr-1" : "pl-1",
                    )}
                  >
                    {dayjs().format("HH:mm")}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading &&
            displayMessages.length === 1 &&
            displayMessages[0].role === "user" && (
              <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-lg bg-white text-primary border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm px-6 py-5 flex items-center gap-2">
                  <span className="text-sm text-slate-500">Thinking...</span>
                </div>
              </div>
            )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Error: {error.message}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={onSubmit}
            className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/20 transition-all focus-within:bg-white"
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 p-3 bg-transparent border-none focus:outline-none text-sm min-h-[48px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !inputValue.trim()}
              className={cn(
                "w-10 h-10 rounded-xl mb-0.5 transition-all duration-300",
                !inputValue.trim() || isLoading
                  ? "bg-slate-200 text-slate-400 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 hover:shadow-lg shadow-md",
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send size={18} className={inputValue.trim() ? "ml-0.5" : ""} />
              )}
            </Button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 opacity-70">
              <Sparkles size={10} />
              AI-generated content can be inaccurate.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
