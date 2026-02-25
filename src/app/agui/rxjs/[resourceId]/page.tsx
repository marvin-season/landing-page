"use client";

/**
 * 流式对话页：由路由参数 [resourceId] 标识会话，仅消费 useChatStreamState 的 state。
 */
import { useParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatStreamState } from "@/lib/stream/use-chat-stream-state";
import { ActionCard } from "../components/ActionCard";
import { ResponseSection } from "../components/ResponseSection";

export default function RxjsResourcePage() {
  const params = useParams();
  const resourceId = typeof params.resourceId === "string" ? params.resourceId : "";

  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

  if (!resourceId) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">无效的会话 ID</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <ActionCard
        resourceId={resourceId}
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
