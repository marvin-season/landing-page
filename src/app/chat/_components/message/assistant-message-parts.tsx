import type { ChatStatus, UIMessage } from "ai";
import { BrainCircuit } from "lucide-react";
import { MemoTextChunk } from "./text-chunk";

export default function AssistantMessageParts(props: {
  m: UIMessage;
  status: ChatStatus;
}) {
  const { m } = props;
  return m.parts.map((part, i) => {
    if (part.type === "text") {
      if (part.state === "streaming") {
        // 按照标点符号进行分割
        return part.text
          .split(/([。！？,，.!?、；;])/)
          .filter((chunk) => chunk.length > 0)
          .map((chunk, i) => <MemoTextChunk key={i} text={chunk} />);
      }
      return (
        <span key={i} className="whitespace-pre-wrap leading-7 text-slate-700">
          {part.text}
        </span>
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
          <div className="p-3 font-mono text-xs leading-relaxed opacity-90">
            {part.text}
          </div>
        </div>
      );
    }
    return null;
  });
}
