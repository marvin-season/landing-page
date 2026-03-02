import { redirect } from "next/navigation";
import "@/css/globals.css";
import { AgentSidebar } from "@/app/agent/_components/AgentSidebar";
import { auth } from "@/auth";
import { ChatModeSwitcher } from "@/components/chat/chat-mode-switcher";
import TankQueryClientProvider from "@/components/trpc/provider";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/agent");
  }

  console.log(session);
  return (
    <html lang="en">
      <body className="h-dvh overflow-hidden">
        <TankQueryClientProvider>
          <div className="flex h-full flex-col md:flex-row">
            <AgentSidebar user={session.user} />
            <main className="min-h-0 min-w-0 flex-1 overflow-auto md:flex-1">
              <ChatModeSwitcher />

              {children}
            </main>
          </div>
        </TankQueryClientProvider>
      </body>
    </html>
  );
}
