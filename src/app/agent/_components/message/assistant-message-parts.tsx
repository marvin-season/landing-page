import type { ChatStatus, UIMessage } from "ai";
import { isToolOrDynamicToolUIPart } from "ai";
import { BrainCircuit } from "lucide-react";
import { ToolBlock } from "@/app/agui/rxjs/components/ToolBlock";
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
  return m.parts.map((part, i) => {
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
          className="my-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="bg-slate-100/50 px-3 py-2 flex items-center gap-2 border-b border-slate-200/50">
            <BrainCircuit size={14} className="text-violet-500" />
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">
              Reasoning Process
            </span>
          </div>
          <Markdown
            className="p-3 font-mono text-xs leading-relaxed opacity-90"
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
        <div key={i} className="mt-4 first:mt-0">
          <ToolBlock
            toolName={toolName}
            input={toolPart.input ?? {}}
            output={output}
            isStreaming={isStreaming}
            streamingPhase={getStreamingPhase(toolPart)}
          />
        </div>
      );
    }
    return null;
  });
}
