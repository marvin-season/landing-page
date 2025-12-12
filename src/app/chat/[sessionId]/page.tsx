import { use } from "react";
import { ChatSessionShell } from "@/app/chat/_components/chat-session-shell";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  return <ChatSessionShell sessionId={sessionId} />;
}
