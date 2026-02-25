"use client";

/**
 * 流式对话示例页：仅消费 useChatStreamState 的 state，不处理底层事件。
 */
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { ActionCard } from "./components/ActionCard";
import { ResponseSection } from "./components/ResponseSection";

export default function RxjsPage() {
  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <ActionCard
        messageId={messageId}
        loading={loading}
        onSend={(body) => send(body)}
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
