import { Sparkles } from "lucide-react";
import { useCurrentSession } from "@/store/session-store";

export function ChatHeader(props: { sessionId: string }) {
  const { sessionId } = props;
  const currentSession = useCurrentSession(sessionId);
  return (
    <header className="sticky flex items-center top-0 z-10 h-16 shrink-0 shadow-sm border-slate-200/60 bg-white/60 backdrop-blur-md supports-backdrop-filter:bg-white/60">
      <div className="flex items-center gap-2 px-4">
        <Sparkles size={18} className="text-blue-300" />
        <div className="truncate text-base font-semibold leading-tight text-slate-900">
          {currentSession?.title}
        </div>
      </div>
    </header>
  );
}
