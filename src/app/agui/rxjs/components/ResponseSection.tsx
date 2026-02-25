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

type ResponseSectionProps = {
  blocks: ContentBlock[];
  streamingTool: StreamingToolCall | null;
  streamingText: string | null;
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
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/80" aria-hidden />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          响应内容
        </h2>
        <div className="h-px flex-1 bg-border/80" aria-hidden />
      </div>
      <div className="flex flex-col gap-4">
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
    </section>
  );
}
