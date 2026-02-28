"use client";

import { CircleStopIcon, Loader2, Send, Sparkles } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit?: (data: { input: string }) => Promise<void>;
  onStop: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ChatInputForm(props: ChatInputProps) {
  const { onSubmit, onStop, isLoading, className } = props;
  return (
    <div className={className}>
      <form
        action={(formData) => {
          const input = formData.get("input") as string;
          if (input.trim() === "") {
            return;
          }
          onSubmit?.({ input: formData.get("input") as string });
        }}
        className="relative flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 lg:py-2 py-1 lg:px-3 px-1.5 shadow-lg backdrop-blur-md transition-all"
      >
        <input
          name="input"
          placeholder="Ask anything..."
          inputMode="text"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 h-10 lg:h-12 lg:px-3 px-2 bg-transparent border-none focus:outline-none lg:text-base text-sm leading-6"
          disabled={isLoading}
        />
        {isLoading ? (
          <Button
            type="button"
            variant={"ghost"}
            size="icon"
            onClick={onStop}
            className="rounded-xl"
          >
            <CircleStopIcon size={24} />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={isLoading}
            className={cn(
              "rounded-xl transition-all duration-300",
              isLoading
                ? "bg-slate-200 text-slate-400 hover:bg-slate-200"
                : "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 hover:shadow-lg shadow-md",
            )}
          >
            {isLoading ? (
              <Loader2 className="lg:size-4 size-3 animate-spin" />
            ) : (
              <Send className="lg:size-4 size-3" />
            )}
          </Button>
        )}
      </form>
      <div className="text-center mt-3">
        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 opacity-70">
          <Sparkles className="lg:size-4 size-3" />
          AI-generated content can be inaccurate.
        </span>
      </div>
    </div>
  );
}

export default memo(ChatInputForm);
