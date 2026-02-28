import type { ChatStatus, UIMessage } from "ai";
import { isToolOrDynamicToolUIPart } from "ai";
import { BrainCircuit } from "lucide-react";
import { ToolBlock } from "@/app/agent/_components/ToolBlock";
import Markdown from "@/components/markdown";

type ToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function getToolName(part: ToolPart): string {
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.toolName ?? "tool";
}

function getStreamingPhase(
  part: ToolPart,
): "input-streaming" | "calling" | "done" {
  const s = part.state;
  if (s === "output-available" || s === "output-error") return "done";
  if (s === "input-available") return "calling";
  return "input-streaming";
}

export default function AssistantMessageParts(props: {
  m: UIMessage;
  status: ChatStatus;
}) {
  const { m } = props;
  return (
    <div className="space-y-4 wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {m.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <Markdown key={i} hasNextChunk={part.state === "streaming"}>
              {part.text}
            </Markdown>
          );
        }
        if (part.type === "reasoning") {
          return (
            <div
              key={i}
              className="my-3 overflow-hidden rounded-xl border border-border/50 bg-muted/30"
            >
              <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                <BrainCircuit className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Reasoning
                </span>
              </div>
              <Markdown
                className="p-3 text-xs leading-relaxed text-muted-foreground"
                hasNextChunk={part.state === "streaming"}
              >
                {part.text}
              </Markdown>
            </div>
          );
        }
        if (isToolOrDynamicToolUIPart(part)) {
          const toolPart = part as ToolPart;
          const toolName = getToolName(toolPart);
          const isStreaming =
            toolPart.state === "input-streaming" ||
            toolPart.state === "input-available";
          const output =
            toolPart.state === "output-available"
              ? toolPart.output
              : toolPart.state === "output-error" && toolPart.errorText
                ? { error: toolPart.errorText }
                : undefined;
          return (
            <div key={i} className="first:mt-0 w-full max-w-full">
              <ToolBlock
                toolName={toolName}
                input={toolPart.input ?? "…"}
                output={output}
                isStreaming={isStreaming}
                streamingPhase={getStreamingPhase(toolPart)}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
