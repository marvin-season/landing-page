import { use } from "react";
import { ChatHistory } from "@/app/chat/_components/chat-history";
import { ChatMain } from "@/app/chat/_components/chat-main";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  return (
    <div className="flex-1 flex min-w-0">
      <ChatMain sessionId={sessionId} />
      <ChatHistory />
    </div>
  );
}
