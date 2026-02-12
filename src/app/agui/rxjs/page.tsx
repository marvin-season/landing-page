"use client";

import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";

const CHAT_BODY = {
  resourceId: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  id: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  messages: [
    {
      parts: [{ type: "text", text: "北京天气" }],
      id: "peNWQiE4DCSazZyo",
      role: "user",
    },
  ],
  trigger: "submit-message",
} as const;

export default function RxjsPage() {
  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-4">
      <button
        type="button"
        onClick={() => send(CHAT_BODY)}
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
                  ? typeof streamingTool.input === "string"
                    ? streamingTool.input
                    : JSON.stringify(streamingTool.input, null, 2)
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
