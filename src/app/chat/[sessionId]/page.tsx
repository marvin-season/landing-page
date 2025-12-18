import { use } from "react";
import { ChatHistory } from "@/app/chat/_components/chat-history";
import { ChatMain } from "@/app/chat/_components/chat-main";
import { ChatHeader } from "@/app/chat/_components/header";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  return (
    <div className="flex-1 flex min-w-0 min-h-0 h-full">
      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col">
        <ChatHeader sessionId={sessionId} />
        <ChatMain sessionId={sessionId} />
      </div>
      <ChatHistory
        sessionId={sessionId}
        className="hidden lg:flex h-full shrink-0 border-l border-slate-200 p-2"
      />
    </div>
  );
}
