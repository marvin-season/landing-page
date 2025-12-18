import { use } from "react";
import { ChatHistory } from "@/app/chat/_components/chat-history";
import { ChatMain } from "@/app/chat/_components/chat-main";
import { MessageMobileSidebar } from "@/app/chat/_components/sidebar/message-mobile-sidebar";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  return (
    <div className="flex-1 flex min-w-0 min-h-0 h-full">
      <ChatMain sessionId={sessionId} />
      {/* Desktop history */}
      <div className="hidden lg:flex h-full shrink-0">
        <ChatHistory sessionId={sessionId} />
      </div>
      <MessageMobileSidebar sessionId={sessionId} />
    </div>
  );
}
