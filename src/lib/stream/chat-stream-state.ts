import type { UIMessageChunk } from "ai";
import type { Observable } from "rxjs";
import { scan } from "rxjs";
import { fromChatStream } from "./chat-stream";

// ---------------------------------------------------------------------------
// 内容块类型（用于 state.blocks）
// ---------------------------------------------------------------------------

/** 已完成的文本块 */
export type TextBlock = { kind: "text"; id: string; content: string };

/** 已完成的工具调用 */
export type ToolCallBlock = {
  kind: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
};

/** 进行中的工具调用 */
export type StreamingToolCall = {
  toolCallId: string;
  toolName: string;
  inputStreaming: string;
  input?: unknown;
  output?: unknown;
};

/** 内容块（文本或工具调用） */
export type ContentBlock = TextBlock | ToolCallBlock;

// ---------------------------------------------------------------------------
// 归约状态（ChatStreamState）
// ---------------------------------------------------------------------------

/**
 * 流式对话状态
 * @property messageId 消息ID
 * @property blocks 已确定的内容块
 * @property streamingText 正在生成的文本
 * @property streamingTool 正在调用的工具
 */
export type ChatStreamState = {
  messageId: string | null;
  blocks: ContentBlock[];
  streamingText: string;
  currentTextId: string | null;
  streamingTool: StreamingToolCall | null;
};

/** 初始状态 */
export const initialChatStreamState: ChatStreamState = {
  messageId: null,
  blocks: [],
  streamingText: "",
  currentTextId: null,
  streamingTool: null,
};

/** 追加非空文本块 */
function pushTextBlock(
  blocks: ContentBlock[],
  id: string,
  content: string,
): ContentBlock[] {
  if (!content.trim()) return blocks;
  return [...blocks, { kind: "text", id, content }];
}

/**
 * 状态归约函数：根据事件更新状态
 */
export function reduceChatStreamEvent(
  state: ChatStreamState,
  event: UIMessageChunk,
): ChatStreamState {
  const t = event.type;

  if (t === "start") {
    const raw = "messageId" in event ? event.messageId : undefined;
    return {
      ...state,
      messageId: typeof raw === "string" ? raw : null,
    };
  }

  if (t === "text-start" && "id" in event) {
    const nextBlocks = pushTextBlock(
      state.blocks,
      state.currentTextId ?? (typeof event.id === "string" ? event.id : ""),
      state.streamingText,
    );
    return {
      ...state,
      blocks: nextBlocks,
      streamingText: "",
      currentTextId: typeof event.id === "string" ? event.id : null,
    };
  }

  if (t === "text-delta" && "id" in event && "delta" in event) {
    return {
      ...state,
      streamingText: state.streamingText + String(event.delta),
    };
  }

  if (t === "text-end" && "id" in event) {
    const nextBlocks = pushTextBlock(
      state.blocks,
      state.currentTextId ?? (typeof event.id === "string" ? event.id : ""),
      state.streamingText,
    );
    return {
      ...state,
      blocks: nextBlocks,
      streamingText: "",
      currentTextId: null,
    };
  }

  if (
    t === "tool-input-start" &&
    "toolCallId" in event &&
    "toolName" in event
  ) {
    const nextBlocks = pushTextBlock(
      state.blocks,
      state.currentTextId ?? "",
      state.streamingText,
    );
    return {
      ...state,
      blocks: nextBlocks,
      streamingText: "",
      currentTextId: null,
      streamingTool: {
        toolCallId: String(event.toolCallId),
        toolName: String(event.toolName),
        inputStreaming: "",
      },
    };
  }

  if (
    t === "tool-input-delta" &&
    "toolCallId" in event &&
    "inputTextDelta" in event
  ) {
    const prev = state.streamingTool;
    return {
      ...state,
      streamingTool: prev
        ? {
            ...prev,
            inputStreaming: prev.inputStreaming + String(event.inputTextDelta),
          }
        : null,
    };
  }

  if (
    t === "tool-input-available" &&
    "toolCallId" in event &&
    "input" in event
  ) {
    const prev = state.streamingTool;
    return {
      ...state,
      streamingTool: prev ? { ...prev, input: event.input } : null,
    };
  }

  if (
    t === "tool-output-available" &&
    "toolCallId" in event &&
    "output" in event
  ) {
    const prev = state.streamingTool;
    const toolCallId = String(event.toolCallId);
    if (!prev) return state;
    const block: ToolCallBlock = {
      kind: "tool-call",
      toolCallId: prev.toolCallId,
      toolName: prev.toolName,
      input: prev.input ?? prev.inputStreaming,
      output: event.output,
    };
    const hasExisting = state.blocks.some(
      (x) => x.kind === "tool-call" && x.toolCallId === toolCallId,
    );
    return {
      ...state,
      blocks: hasExisting ? state.blocks : [...state.blocks, block],
      streamingTool: null,
    };
  }

  return state;
}

/** 结束时刷新剩余文本到 blocks */
export function flushChatStreamState(state: ChatStreamState): ChatStreamState {
  if (!state.currentTextId || !state.streamingText.trim())
    return { ...state, streamingText: "" };
  return {
    ...state,
    blocks: pushTextBlock(
      state.blocks,
      state.currentTextId,
      state.streamingText,
    ),
    streamingText: "",
    currentTextId: null,
  };
}

/** 创建状态流 Observable */
export function fromChatStreamState(
  url: string,
  body: Record<string, unknown>,
): Observable<ChatStreamState> {
  return fromChatStream(url, body).pipe(
    scan(reduceChatStreamEvent, initialChatStreamState),
  );
}

export { fromChatStream };
