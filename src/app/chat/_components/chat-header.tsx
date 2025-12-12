import dayjs from "dayjs";
import { Clock, Sparkles } from "lucide-react";
import { MotionDiv } from "@/components/ui";
import type { ISession } from "@/store/session-store";

export function ChatHeader(props: {
  currentSession: ISession;
  messagesCount: number;
}) {
  const { currentSession, messagesCount } = props;
  return (
    <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div className="font-medium text-slate-900 truncate max-w-xl flex items-center gap-2.5">
        <span className="bg-primary/10 p-1.5 rounded-lg text-primary">
          <Sparkles size={16} />
        </span>
        <MotionDiv
          className="flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="truncate text-sm font-semibold">
            {currentSession?.title || "New Conversation"}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            {messagesCount} messages in this session
          </span>
        </MotionDiv>
      </div>
      <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
        <Clock size={12} />
        {dayjs(currentSession?.createdAt).format("MMM D, HH:mm")}
      </div>
    </div>
  );
}
