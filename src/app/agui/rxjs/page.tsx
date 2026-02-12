"use client";

import { useCallback, useRef, useState } from "react";
import { fromChatStream } from "@/lib/stream/chat-stream";

const CHAT_BODY = {
  resourceId: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  id: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  messages: [
    {
      parts: [{ type: "text", text: "hi" }],
      id: "yGMFp1VEgsBxxZH7",
      role: "user",
    },
  ],
  trigger: "submit-message",
} as const;

export default function RxjsPage() {
  const [messageId, setMessageId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const handleClick = useCallback(() => {
    // 若正在请求，先取消上一次订阅
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;

    setError(null);
    setMessageId(null);
    setText("");
    setLoading(true);

    const subscription = fromChatStream("/api/chat", CHAT_BODY).subscribe({
      next: (event) => {
        switch (event.type) {
          case "start":
            setMessageId(
              "messageId" in event ? String(event.messageId) : null,
            );
            break;
          case "text-delta":
            setText((prev) => prev + event.delta);
            break;
          default:
            break;
        }
      },
      error: (err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
      complete: () => {
        setLoading(false);
        subscriptionRef.current = null;
      },
    });

    subscriptionRef.current = subscription;
  }, []);

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {loading ? "请求中…" : "Click me"}
      </button>
      {messageId != null && (
        <p className="text-muted-foreground text-sm">messageId: {messageId}</p>
      )}
      {text && (
        <div className="rounded border bg-muted/30 p-3">
          <p className="text-sm font-medium text-muted-foreground">
            流式内容：
          </p>
          <p className="mt-1 whitespace-pre-wrap">{text}</p>
        </div>
      )}
      {error != null && (
        <p className="text-destructive text-sm">错误: {error}</p>
      )}
    </div>
  );
}
