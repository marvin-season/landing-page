import { use } from "react";
import { ChatMain } from "@/components/chat/chat-main";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  return <ChatMain sessionId={sessionId} />;
}
