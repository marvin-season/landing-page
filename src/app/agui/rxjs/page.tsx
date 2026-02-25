"use client";

/**
 * 流式对话示例页：仅消费 useChatStreamState 的 state，不处理底层事件。
 */
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { ActionCard } from "./components/ActionCard";
import { ResponseSection } from "./components/ResponseSection";
import { CHAT_BODY } from "./constants";

export default function RxjsPage() {
  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

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

      <ActionCard
        messageId={messageId}
        loading={loading}
        onSend={() => send(CHAT_BODY)}
      />

      {error != null ? (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertDescription>错误: {error}</AlertDescription>
        </Alert>
      ) : null}

      <ResponseSection
        blocks={blocks}
        streamingTool={streamingTool}
        streamingText={streamingText}
      />
    </div>
  );
}
