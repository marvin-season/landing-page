"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    sendMessage({ text: inputValue });
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-(--spacing(16)))] max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Bot className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">开始一个新的对话...</p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex items-start gap-3 max-w-[85%]",
              m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                m.role === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-900",
              )}
            >
              {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div
              className={cn(
                "p-3.5 rounded-2xl text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-slate-900 text-white rounded-tr-none"
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm",
              )}
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return <span key={i}>{part.text}</span>;
                }
                if (part.type === "reasoning") {
                  return (
                    <div
                      key={i}
                      className="text-xs text-slate-500 border-l-2 border-slate-300 pl-2 mb-2 italic"
                    >
                      {part.text}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-900 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-500 text-sm border border-red-100 flex items-center justify-center">
            出错了: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative flex items-center gap-2"
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入消息..."
          className="flex-1 p-4 pr-12 rounded-full border border-slate-200/60 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all text-sm"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !inputValue.trim()}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9",
            (!inputValue.trim() || isLoading) && "opacity-50 cursor-not-allowed",
          )}
        >
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
