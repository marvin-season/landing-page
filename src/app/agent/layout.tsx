import "@/css/globals.css";
import { AgentSidebar } from "@/app/agent/_components/AgentSidebar";
import { ChatModeSwitcher } from "@/components/chat/chat-mode-switcher";
import TankQueryClientProvider from "@/components/trpc/provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-hidden">
        <TankQueryClientProvider>
          <ChatModeSwitcher />
          <div className="flex h-full flex-col md:flex-row">
            <AgentSidebar />
            <main className="min-h-0 min-w-0 flex-1 overflow-auto md:flex-1">
              {children}
            </main>
          </div>
        </TankQueryClientProvider>
      </body>
    </html>
  );
}
