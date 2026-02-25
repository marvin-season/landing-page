"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ContentBlock,
  TextBlock,
  ToolCallBlock,
} from "@/lib/stream/chat-stream-state";

/** 历史消息项：与 API 返回格式对齐，便于展示 */
export type ChatDisplayMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content?: string;
      blocks?: ContentBlock[];
    };

/** API 返回的消息部分（与 toAISdkV5Messages 结构兼容） */
type ApiTextPart = { type: "text"; text?: string };
type ApiToolPart = {
  type: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
};
type ApiMessagePart = ApiTextPart | ApiToolPart;
type ApiMessage = {
  id?: string;
  role: string;
  parts?: ApiMessagePart[];
};

function extractText(parts: ApiMessagePart[] = []): string {
  return parts
    .filter(
      (p): p is ApiTextPart & { text: string } =>
        p.type === "text" && (p as ApiTextPart).text != null,
    )
    .map((p) => p.text)
    .join("");
}

/** 将 API assistant message 的 parts 转为 ContentBlock[]（文本 + 工具调用），用于与流式回复一致的展示与交互 */
function partsToBlocks(
  parts: ApiMessagePart[],
  messageId: string,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.type === "text") {
      const text = (p as ApiTextPart).text;
      if (text != null && text.trim() !== "") {
        blocks.push({
          kind: "text",
          id: `${messageId}-text-${i}`,
          content: text,
        } satisfies TextBlock);
      }
    } else if (typeof p.type === "string" && p.type.startsWith("tool-")) {
      const toolPart = p as ApiToolPart;
      const toolName = toolPart.type.slice("tool-".length) || "tool";
      blocks.push({
        kind: "tool-call",
        toolCallId: toolPart.toolCallId ?? `hist-${messageId}-tool-${i}`,
        toolName,
        input: toolPart.input ?? {},
        output: toolPart.output,
      } satisfies ToolCallBlock);
    }
    /* 忽略 step-start 等其它 part 类型 */
  }
  return blocks;
}

function normalizeMessage(
  m: ApiMessage,
  index: number,
): ChatDisplayMessage | null {
  const id = typeof m.id === "string" ? m.id : `msg-${index}`;
  const role =
    m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : null;
  if (!role) return null;
  const parts = m.parts ?? [];
  const text = extractText(parts);
  if (role === "user") {
    return { id, role: "user", content: text };
  }
  const blocks = partsToBlocks(parts, id);
  return {
    id,
    role: "assistant",
    content: blocks.length === 0 ? text || undefined : undefined,
    blocks: blocks.length > 0 ? blocks : undefined,
  };
}

export function useChatHistory(resourceId: string | null) {
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!resourceId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/chat?resourceId=${encodeURIComponent(resourceId)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `请求失败: ${res.status}`);
      }
      const data = (await res.json()) as ApiMessage[];
      const list = Array.isArray(data)
        ? data
            .map(normalizeMessage)
            .filter((x): x is ChatDisplayMessage => x != null)
        : [];
      setMessages(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { messages, isLoading, error, refetch };
}
