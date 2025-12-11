import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInputForm(props: ChatInputProps) {
  const { onSubmit, isLoading } = props;
  return (
    <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={(e) => {
            onSubmit(e);
          }}
          className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/20 transition-all focus-within:bg-white"
        >
          <input
            name="input"
            placeholder="Ask anything..."
            className="flex-1 p-3 bg-transparent border-none focus:outline-none text-sm min-h-[48px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading}
            className={cn(
              "w-10 h-10 rounded-xl mb-0.5 transition-all duration-300",
              isLoading
                ? "bg-slate-200 text-slate-400 hover:bg-slate-200"
                : "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 hover:shadow-lg shadow-md",
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send size={18} />
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
  );
}
