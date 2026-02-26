import type { UIMessage } from "ai";
import type {
  ChatStreamState,
  ContentBlock,
  StreamingToolCall,
} from "@/lib/stream/chat-stream-state";

type ToolPartState = "input-streaming" | "input-available" | "output-available";

function toToolPartType(toolName: string) {
  return `tool-${toolName}` as const;
}

function mapStreamingToolState(tool: StreamingToolCall): ToolPartState {
  if (tool.output !== undefined) return "output-available";
  if (tool.input !== undefined) return "input-available";
  return "input-streaming";
}

function blockToPart(block: ContentBlock) {
  if (block.kind === "text") {
    return { type: "text" as const, text: block.content, state: "done" as const };
  }
  return {
    type: toToolPartType(block.toolName),
    toolName: block.toolName,
    toolCallId: block.toolCallId,
    input: block.input,
    output: block.output,
    state: "output-available" as const,
  };
}

export function buildStreamingAssistantMessage(
  state: ChatStreamState,
  sessionId: string,
): UIMessage | null {
  const parts: Array<Record<string, unknown>> = state.blocks.map(
    (block) => blockToPart(block) as Record<string, unknown>,
  );

  if (state.streamingTool) {
    parts.push({
      type: toToolPartType(state.streamingTool.toolName),
      toolName: state.streamingTool.toolName,
      toolCallId: state.streamingTool.toolCallId,
      input:
        state.streamingTool.input !== undefined
          ? state.streamingTool.input
          : state.streamingTool.inputStreaming,
      output: state.streamingTool.output,
      state: mapStreamingToolState(state.streamingTool),
    });
  }

  if (state.streamingText.trim().length > 0) {
    parts.push({
      type: "text" as const,
      text: state.streamingText,
      state: "streaming" as const,
    });
  }

  if (parts.length === 0) return null;

  return {
    id: state.messageId ?? `streaming-${sessionId}`,
    role: "assistant",
    parts,
  } as UIMessage;
}

export function buildPendingUserMessage(
  text: string,
  id: string,
): UIMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
  } as UIMessage;
}
