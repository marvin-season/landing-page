import type { ChatStatus, UIMessage } from "ai";
import { BrainCircuit } from "lucide-react";
import Markdown from "@/components/ui/markdown";

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
    return null;
  });
}
