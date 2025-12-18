import { use } from "react";
import { ChatMain } from "@/app/chat/_components/chat-main";
import { ChatHeader } from "@/app/chat/_components/header";
import { ChatHistory } from "@/app/chat/_components/sidebar/chat-history";
import { HistoryMobileSidebar } from "@/app/chat/_components/sidebar/history-mobile-sidebar";

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
        <div className="hidden lg:flex h-full shrink-0">
          <ChatHistory sessionId={sessionId} />
        </div>
        <HistoryMobileSidebar sessionId={sessionId} />
      </div>
    </div>
  );
}
