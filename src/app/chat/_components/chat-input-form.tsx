"use client";

import { CircleStopIcon, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit?: (data: { input: string }) => Promise<void>;
  onStop: () => void;
  isLoading?: boolean;
}

export function ChatInputForm(props: ChatInputProps) {
  const { onSubmit, onStop, isLoading } = props;
  return (
    <div className="sticky bottom-0 z-20 w-full shrink-0 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto">
        <form
          action={(formData) => {
            const input = formData.get("input") as string;
            if (input.trim() === "") {
              return;
            }
            onSubmit?.({ input: formData.get("input") as string });
          }}
          className="relative flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-lg backdrop-blur-md transition-all focus-within:border-primary/20 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10"
        >
          <input
            name="input"
            placeholder="Ask anything..."
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 h-12 px-3 bg-transparent border-none focus:outline-none text-base sm:text-sm leading-6"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              type="button"
              variant={"ghost"}
              size="icon"
              onClick={onStop}
              className="h-12 w-12 rounded-xl"
            >
              <CircleStopIcon size={24} />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={isLoading}
              className={cn(
                "h-12 w-12 rounded-xl transition-all duration-300",
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
          )}
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
