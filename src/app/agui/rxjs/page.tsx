"use client";

/**
 * 流式对话示例页：仅消费 useChatStreamState 的 state，不处理底层事件。
 */
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { cn } from "@/lib/utils";

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

function TextBlock({ content }: { content: string }) {
  return (
    <Card className="border-border/80 bg-muted/10 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {content}
        </p>
      </CardContent>
    </Card>
  );
}

function ToolBlock({
  toolName,
  input,
  output,
  isStreaming,
}: {
  toolName: string;
  input: unknown;
  output?: unknown;
  isStreaming?: boolean;
}) {
  const inputStr =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const outputStr =
    output === undefined
      ? undefined
      : typeof output === "string"
        ? output
        : JSON.stringify(output, null, 2);

  return (
    <Card
      className={cn(
        "border-primary/20 bg-primary/5 shadow-sm transition-shadow",
        isStreaming && "ring-1 ring-primary/30 shadow-md",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-primary">
          {isStreaming ? (
            <span className="flex size-2 animate-pulse rounded-full bg-primary" />
          ) : null}
          工具调用 · {toolName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs">
          <span className="text-muted-foreground">
            {isStreaming ? "输入（流式）：" : "输入："}
          </span>
          <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap text-foreground/90 wrap-anywhere">
            {inputStr || "…"}
          </pre>
        </div>
        {outputStr !== undefined ? (
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs">
            <span className="text-muted-foreground">输出：</span>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap text-foreground/90 wrap-anywhere">
              {outputStr}
            </pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StreamingCursor() {
  return (
    <span
      className="inline-block h-4 w-0.5 animate-pulse rounded-full bg-primary align-middle"
      aria-hidden
    />
  );
}

export default function RxjsPage() {
  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

  const hasStreamingText =
    streamingText != null && streamingText !== "";
  const hasContent =
    blocks.length > 0 || hasStreamingText || streamingTool !== null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          流式对话示例
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          使用 useChatStreamState 消费流式 state，不处理底层事件。
        </p>
      </header>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2 pt-6 sm:pt-6">
          <div className="space-y-1.5 min-w-0">
            <CardTitle className="text-base font-medium">操作</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {messageId != null
                ? `当前 messageId: ${messageId}`
                : "点击按钮发送示例请求"}
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => send(CHAT_BODY)}
            disabled={loading}
            size="md"
            className="shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                请求中…
              </>
            ) : (
              "查询北京天气"
            )}
          </Button>
        </CardHeader>
      </Card>

      {error != null ? (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertDescription>错误: {error}</AlertDescription>
        </Alert>
      ) : null}

      {hasContent ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/80" aria-hidden />
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              响应内容
            </h2>
            <div className="h-px flex-1 bg-border/80" aria-hidden />
          </div>
          <div className="flex flex-col gap-4">
            {blocks.map((block, i) =>
              block.kind === "text" ? (
                <TextBlock key={`${block.id}-${i}`} content={block.content} />
              ) : (
                <ToolBlock
                  key={block.toolCallId}
                  toolName={block.toolName}
                  input={block.input}
                  output={block.output}
                />
              ),
            )}
            {streamingTool !== null ? (
              <ToolBlock
                toolName={streamingTool.toolName}
                input={
                  streamingTool.input !== undefined
                    ? streamingTool.input
                    : (streamingTool.inputStreaming ?? "…")
                }
                output={streamingTool.output}
                isStreaming
              />
            ) : null}
            {streamingText != null && streamingText !== "" ? (
              <Card className="border-primary/20 bg-primary/5 shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {streamingText}
                    <StreamingCursor />
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
