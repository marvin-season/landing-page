"use client";

import { Card, CardContent } from "@/components/ui/card";
import type {
  ContentBlock,
  StreamingToolCall,
} from "@/lib/stream/chat-stream-state";
import { StreamingCursor } from "./StreamingCursor";
import { TextBlock } from "./TextBlock";
import type { ToolStreamingPhase } from "./ToolBlock";
import { ToolBlock } from "./ToolBlock";

function getStreamingPhase(tool: StreamingToolCall): ToolStreamingPhase {
  if (tool.output !== undefined) return "done";
  if (tool.input !== undefined) return "calling";
  return "input-streaming";
}

type AssistantBubbleContentProps = {
  /** 已完成的内容块（文本 + 工具） */
  blocks: ContentBlock[];
  /** 流式工具调用（可选） */
  streamingTool: StreamingToolCall | null;
  /** 流式文本（可选） */
  streamingText: string | null;
};

/** 与 ResponseSection 一致的助理回复内容：文本块 + 工具块 + 流式文本/工具 */
export function AssistantBubbleContent({
  blocks,
  streamingTool,
  streamingText,
}: AssistantBubbleContentProps) {
  const hasStreamingText = streamingText != null && streamingText !== "";
  const hasContent =
    blocks.length > 0 || hasStreamingText || streamingTool !== null;

  if (!hasContent) return null;

  return (
    <div className="flex flex-col gap-3">
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
          streamingPhase={getStreamingPhase(streamingTool)}
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
  );
}
