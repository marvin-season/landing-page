import { AgentProvider } from "@/app/agui/_components/AgentProvider";
import { ChatModeSwitcher } from "@/components/chat/chat-mode-switcher";
import "@/css/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-scroll">
        <AgentProvider>
          <ChatModeSwitcher />
          {children}
        </AgentProvider>
      </body>
    </html>
  );
}
