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
  showPresets?: boolean;
};

export function ActionCard({
  loading,
  onSend,
  showPresets = true,
}: ActionCardProps) {
  const [inputValue, setInputValue] = useState("");

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
    <div className="agent-hand-border agent-paper-panel z-10 flex flex-col gap-3 px-4 py-4">
      {showPresets ? (
        <div className="flex flex-wrap gap-2">
          {PRESET_QUESTIONS.map((preset) => (
            <Button
              key={preset.text}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleSendText(preset.text)}
              className="agent-doodle-chip text-xs font-bold hover:bg-white"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="输入问题后发送…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          className="agent-sketched-input min-w-0 flex-1"
          aria-label="输入消息"
        />
        <Button
          type="submit"
          disabled={loading || !inputValue.trim()}
          size="md"
          className="agent-sketched-button shrink-0 font-bold"
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
