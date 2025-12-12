import "@/css/globals.css";
import { ChatShell } from "@/app/chat/_components/chat-shell";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ChatShell>{children}</ChatShell>
      </body>
    </html>
  );
}
