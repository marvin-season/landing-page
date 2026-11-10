import type { UIMessageChunk } from "ai";
import { type Observable, scan } from "rxjs";
import {
  type AiSdkChatRequest,
  aiSdkChatStreamAdapter,
  type ChatStreamAdapter,
  createChatEventStream,
} from "./chat-event-stream";

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
 * 将单个 AI SDK 事件归约为下一份状态；纯函数，不发请求、不创建订阅。
 * 初始值为 initialChatStreamState，协议 error 事件会抛错。
 */
export function reduceChatStreamState(
  state: ChatStreamState,
  event: UIMessageChunk,
): ChatStreamState {
  const t = event.type;

  // AI SDK 的协议错误属于状态层语义，通用 core 不识别任何事件字段。
  if (t === "error") throw new Error(event.errorText);

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

/** 将尚未结束的文本写入 blocks，返回收尾后的状态；不结束订阅或工具调用。 */
export function flushChatStreamText(state: ChatStreamState): ChatStreamState {
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

/** 提取已完成文本与正在生成的文本，忽略工具调用；不修改状态。 */
export function getChatStreamText(state: ChatStreamState): string {
  const fromBlocks = state.blocks
    .filter((block): block is TextBlock => block.kind === "text")
    .map((block) => block.content)
    .join("");
  return `${fromBlocks}${state.streamingText}`;
}

/**
 * 非 React 入口：默认读取 AI SDK 事件，第三方协议可传入 adapter。
 * 每条事件输出一份累积的聊天状态。
 * 完成时不自动收尾文本，需要时由调用方使用 flushChatStreamText。
 */
export function createChatStateStream(
  input: AiSdkChatRequest,
  adapter?: undefined,
): Observable<ChatStreamState>;
export function createChatStateStream<TInput>(
  input: TInput,
  adapter: ChatStreamAdapter<TInput>,
): Observable<ChatStreamState>;
export function createChatStateStream<TInput>(
  input: TInput,
  adapter?: ChatStreamAdapter<TInput>,
): Observable<ChatStreamState> {
  // 公开重载保证：省略 adapter 时 input 必须是 AiSdkChatRequest。
  const resolvedAdapter =
    adapter ?? (aiSdkChatStreamAdapter as ChatStreamAdapter<TInput>);
  return createChatEventStream(input, resolvedAdapter).pipe(
    scan(reduceChatStreamState, initialChatStreamState),
  );
}
