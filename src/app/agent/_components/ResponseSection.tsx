"use client";

import { ChatMessageShell } from "@/components/chat/chat-message-shell";
import Markdown from "@/components/markdown";
import type {
  ContentBlock,
  StreamingToolCall,
} from "@/lib/stream/chat-stream-state";
import type { ToolStreamingPhase } from "./ToolBlock";
import { ToolBlock } from "./ToolBlock";

type ResponseSectionProps = {
  blocks: ContentBlock[];
  streamingTool: StreamingToolCall | null;
  streamingText: string | null;
  layout?: "section" | "message";
};

function getStreamingPhase(tool: StreamingToolCall): ToolStreamingPhase {
  if (tool.output !== undefined) return "done";
  if (tool.input !== undefined) return "calling";
  return "input-streaming";
}

export function ResponseSection({
  blocks,
  streamingTool,
  streamingText,
}: ResponseSectionProps) {
  const hasStreamingText = streamingText != null && streamingText !== "";
  const hasContent =
    blocks.length > 0 || hasStreamingText || streamingTool !== null;

  if (!hasContent) return null;

  return (
    <ChatMessageShell role="assistant" bubbleClassName="space-y-4">
      <div className="flex flex-col gap-4">
        {blocks.map((block) =>
          block.kind === "text" ? (
            <Markdown key={block.id} hasNextChunk={false}>
              {block.content}
            </Markdown>
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
            streamingPhase={getStreamingPhase(streamingTool)}
          />
        ) : null}
        {streamingText != null && streamingText !== "" ? (
          <Markdown hasNextChunk={true}>{streamingText}</Markdown>
        ) : null}
      </div>
    </ChatMessageShell>
  );
}
