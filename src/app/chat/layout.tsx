import "@/css/globals.css";
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-white overflow-hidden">
        <ChatSidebar />
        <div className="flex-1 flex flex-col h-full min-w-0">{children}</div>
        <ChatHistory />
      </body>
    </html>
  );
}
