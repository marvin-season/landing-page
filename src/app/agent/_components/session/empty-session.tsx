import { Bot } from "lucide-react";

export function EmptySession() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 text-slate-400 gap-4">
      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
        <Bot className="w-8 h-8 opacity-20" />
      </div>
      <p>Select or create a chat to begin</p>
    </div>
  );
}
