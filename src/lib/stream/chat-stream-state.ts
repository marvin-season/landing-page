import type { Observable } from "rxjs";
import { scan } from "rxjs";
import type { ChatStreamEvent } from "./chat-stream";
import { fromChatStream } from "./chat-stream";

/** 已完成的文本块 */
export type TextBlock = { kind: "text"; id: string; content: string };

/** 工具调用块（含输入与输出） */
export type ToolCallBlock = {
  kind: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
};

/** 流式中的工具调用（输入可能仍在 delta 中） */
export type StreamingToolCall = {
  toolCallId: string;
  toolName: string;
  inputStreaming: string;
  input?: unknown;
  output?: unknown;
};

export type ContentBlock = TextBlock | ToolCallBlock;

/**
 * 流式对话的 UI 状态：由事件归约得到，可在任意处订阅使用
 */
export type ChatStreamState = {
  messageId: string | null;
  blocks: ContentBlock[];
  streamingText: string;
  /** 当前文本段 id，仅归约内部使用 */
  currentTextId: string | null;
  streamingTool: StreamingToolCall | null;
};

export const initialChatStreamState: ChatStreamState = {
  messageId: null,
  blocks: [],
  streamingText: "",
  currentTextId: null,
  streamingTool: null,
};

function pushTextBlock(
  blocks: ContentBlock[],
  id: string,
  content: string,
): ContentBlock[] {
  if (!content.trim()) return blocks;
  return [...blocks, { kind: "text", id, content }];
}

/**
 * 纯函数：根据单条流事件归约出下一状态。
 * 可在任意处复用（React、Node、测试等），与 UI 解耦。
 */
export function reduceChatStreamEvent(
  state: ChatStreamState,
  event: ChatStreamEvent,
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

/**
 * 流结束时的收尾归约：把未 flush 的当前文本段写入 blocks
 */
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

/**
 * 返回「流式状态」的 Observable：每收到一条事件就发出当前归约后的状态。
 * 可在任意处订阅（React、Node、测试等），与 UI 解耦。
 */
export function fromChatStreamState(
  url: string,
  body: Record<string, unknown>,
): Observable<ChatStreamState> {
  return fromChatStream(url, body).pipe(
    scan(reduceChatStreamEvent, initialChatStreamState),
  );
}

export { fromChatStream };
