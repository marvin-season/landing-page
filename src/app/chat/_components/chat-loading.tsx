import { Loader2 } from "lucide-react";
import { MotionDiv } from "@/components/ui";

export function ChatLoading() {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.15,
      }}
      className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="w-8 h-8 rounded-lg bg-white text-primary border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
      <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm shadow-sm px-6 py-5 flex items-center gap-2">
        <span className="text-sm text-slate-500">Thinking...</span>
      </div>
    </MotionDiv>
  );
}
