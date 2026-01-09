import { ChatMain } from "@/app/chat/_components/chat-main";
import { ChatHeader } from "@/app/chat/_components/header/chat-header";
import { MessageList } from "@/app/chat/_components/message/message-list";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params: _ }: SessionPageProps) {
  return (
    <div className="flex-1 flex min-w-0 min-h-0 h-full">
      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col">
        <ChatHeader />
        <ChatMain />
      </div>
      <MessageList className="hidden lg:flex h-full shrink-0 border-l border-slate-200 p-2" />
    </div>
  );
}
