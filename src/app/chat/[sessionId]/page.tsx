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
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
      <ChatHeader sessionId={sessionId} />
      <div className="flex-1 min-w-0 min-h-0 h-full flex">
        <ChatMain sessionId={sessionId} />
        {/* Desktop history */}
        <ChatHistory
          sessionId={sessionId}
          className="hidden lg:flex h-full shrink-0"
        />
      </div>
    </div>
  );
}
