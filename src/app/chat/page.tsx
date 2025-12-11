import { Bot } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
      <div className="w-20 h-20 bg-linear-to-br from-white to-slate-50 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
        <Bot className="w-10 h-10 opacity-10" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-slate-600">
          How can I help you today?
        </p>
        <p className="text-sm text-slate-400">
          Ask any question or start a conversation
        </p>
      </div>
    </div>
  );
}
