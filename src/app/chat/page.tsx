
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatMain } from "@/components/chat/chat-main";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatPage() {

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Use key to force re-mount ChatMain when session changes to reset useChat internal state */}
        <ChatMain  />
      </div>
      <ChatHistory />
    </div>
  );
}
