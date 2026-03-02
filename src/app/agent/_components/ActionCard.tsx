"use client";

import { Loader2, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_QUESTIONS } from "../constants";

type ActionCardProps = {
  messageId: string | null;
  loading: boolean;
  onSend: ({ text }: { text: string }) => void;
};

export function ActionCard({ loading, onSend }: ActionCardProps) {
  const [inputValue, setInputValue] = useState("hello");

  const handleSendText = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || loading) return;
      onSend({ text: t });
    },
    [loading, onSend],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || loading) return;
      handleSendText(inputValue);
      setInputValue("");
    },
    [inputValue, loading, handleSendText],
  );

  return (
    <div className="flex flex-col gap-2 px-4">
      <div className="flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((preset) => (
          <Button
            key={preset.text}
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleSendText(preset.text)}
            className="rounded-full text-xs font-medium"
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="输入问题后发送…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          className="min-w-0 flex-1"
          aria-label="输入消息"
        />
        <Button
          type="submit"
          disabled={loading || !inputValue.trim()}
          size="md"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <>
              <Send className="size-4" aria-hidden />
              发送
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
