"use client";

import { useCallback, useRef, useState } from "react";
import { fromChatStream } from "@/lib/stream/chat-stream";

const CHAT_BODY = {
  resourceId: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  id: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  messages: [
    {
      parts: [
        {
          type: "text",
          text: "北京天气",
        },
      ],
      id: "peNWQiE4DCSazZyo",
      role: "user",
    },
  ],
  trigger: "submit-message",
} as const;

/** 已完成的文本块 */
type TextBlock = { kind: "text"; id: string; content: string };

/** 工具调用块（含输入与输出） */
type ToolCallBlock = {
  kind: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
};

/** 流式中的工具调用（输入可能仍在 delta 中） */
type StreamingToolCall = {
  toolCallId: string;
  toolName: string;
  inputStreaming: string;
  input?: unknown;
  output?: unknown;
};

type ContentBlock = TextBlock | ToolCallBlock;

export default function RxjsPage() {
  const [messageId, setMessageId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streamingTool, setStreamingTool] = useState<StreamingToolCall | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const flushTextBlock = useCallback((id: string, content: string) => {
    if (!content.trim()) return;
    setBlocks((prev) => [...prev, { kind: "text", id, content }]);
  }, []);

  const handleClick = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;

    setError(null);
    setMessageId(null);
    setBlocks([]);
    setStreamingText("");
    setStreamingTool(null);
    setLoading(true);

    let currentTextId: string | null = null;
    let currentTextContent = "";

    const subscription = fromChatStream("/api/chat", CHAT_BODY).subscribe({
      next: (event) => {
        const t = event.type;
        if (t === "start") {
          const raw =
            "messageId" in event ? event.messageId : undefined;
          setMessageId(
            typeof raw === "string" ? raw : null,
          );
          return;
        }
        if (t === "text-start" && "id" in event) {
          if (currentTextId !== null)
            flushTextBlock(currentTextId, currentTextContent);
          currentTextId = typeof event.id === "string" ? event.id : null;
          currentTextContent = "";
          setStreamingText("");
          return;
        }
        if (t === "text-delta" && "id" in event && "delta" in event) {
          const delta = String(event.delta);
          currentTextContent += delta;
          setStreamingText(currentTextContent);
          return;
        }
        if (t === "text-end" && "id" in event) {
          flushTextBlock(
            currentTextId ?? (typeof event.id === "string" ? event.id : ""),
            currentTextContent,
          );
          currentTextId = null;
          currentTextContent = "";
          setStreamingText("");
          return;
        }
        if (t === "tool-input-start" && "toolCallId" in event && "toolName" in event) {
          if (currentTextId !== null) {
            flushTextBlock(currentTextId, currentTextContent);
            currentTextId = null;
            currentTextContent = "";
          }
          setStreamingText("");
          setStreamingTool({
            toolCallId: String(event.toolCallId),
            toolName: String(event.toolName),
            inputStreaming: "",
          });
          return;
        }
        if (t === "tool-input-delta" && "toolCallId" in event && "inputTextDelta" in event) {
          setStreamingTool((prev) =>
            prev
              ? {
                  ...prev,
                  inputStreaming: prev.inputStreaming + String(event.inputTextDelta),
                }
              : null,
          );
          return;
        }
        if (t === "tool-input-available" && "toolCallId" in event && "input" in event) {
          setStreamingTool((prev) =>
            prev ? { ...prev, input: event.input } : null,
          );
          return;
        }
        if (t === "tool-output-available" && "toolCallId" in event && "output" in event) {
          const toolCallId = String(event.toolCallId);
          const output = event.output;
          setStreamingTool((prev) => {
            if (!prev) return null;
            const block: ToolCallBlock = {
              kind: "tool-call",
              toolCallId: prev.toolCallId,
              toolName: prev.toolName,
              input: prev.input ?? prev.inputStreaming,
              output,
            };
            setBlocks((b) =>
              b.some(
                (x) =>
                  x.kind === "tool-call" && x.toolCallId === toolCallId,
              )
                ? b
                : [...b, block],
            );
            return null;
          });
          return;
        }
      },
      error: (err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
      complete: () => {
        if (currentTextId !== null)
          flushTextBlock(currentTextId, currentTextContent);
        setStreamingText("");
        setLoading(false);
        subscriptionRef.current = null;
      },
    });

    subscriptionRef.current = subscription;
  }, [flushTextBlock]);

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {loading ? "请求中…" : "查询北京天气"}
      </button>
      {messageId != null && (
        <p className="text-muted-foreground text-sm">messageId: {messageId}</p>
      )}
      <div className="flex flex-col gap-3">
        {blocks.map((block, i) =>
          block.kind === "text" ? (
            <div
              key={`${block.id}-${i}`}
              className="rounded border border-border bg-muted/20 p-3"
            >
              <p className="whitespace-pre-wrap text-sm">{block.content}</p>
            </div>
          ) : (
            <div
              key={block.toolCallId}
              className="rounded border border-amber-500/40 bg-amber-500/5 p-3"
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                工具调用 · {block.toolName}
              </p>
              <div className="mb-2 rounded bg-muted/50 p-2 font-mono text-xs">
                <span className="text-muted-foreground">输入：</span>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                  {typeof block.input === "string"
                    ? block.input
                    : JSON.stringify(block.input, null, 2)}
                </pre>
              </div>
              {block.output !== undefined && (
                <div className="rounded bg-muted/50 p-2 font-mono text-xs">
                  <span className="text-muted-foreground">输出：</span>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                    {typeof block.output === "string"
                      ? block.output
                      : JSON.stringify(block.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ),
        )}
        {streamingText && (
          <div className="rounded border border-border bg-muted/20 p-3">
            <p className="whitespace-pre-wrap text-sm">{streamingText}</p>
            <span className="inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />
          </div>
        )}
        {streamingTool && (
          <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              工具调用中 · {streamingTool.toolName}
            </p>
            <div className="rounded bg-muted/50 p-2 font-mono text-xs">
              <span className="text-muted-foreground">输入（流式）：</span>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                {streamingTool.input !== undefined
                  ? (typeof streamingTool.input === "string"
                      ? streamingTool.input
                      : JSON.stringify(streamingTool.input, null, 2))
                  : streamingTool.inputStreaming || "…"}
              </pre>
              {streamingTool.output !== undefined && (
                <>
                  <span className="text-muted-foreground">输出：</span>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                    {typeof streamingTool.output === "string"
                      ? streamingTool.output
                      : JSON.stringify(streamingTool.output, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {error != null && (
        <p className="text-destructive text-sm">错误: {error}</p>
      )}
    </div>
  );
}
