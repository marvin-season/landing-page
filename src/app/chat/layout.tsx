import "@/css/globals.css";
import { ChatSidebar } from "@/app/chat/_components/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-white overflow-hidden">
          <ChatSidebar />
          {children}
        </div>
      </body>
    </html>
  );
}
