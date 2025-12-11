import type { UIMessage } from "ai";
import { Bot, BrainCircuit, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChatMessage(props: { messages: UIMessage[] }) {
  const { messages } = props;

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

  return (
    <>
      {messages.map((m) => {
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
            </div>
          </div>
        );
      })}
    </>
  );
}
