import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "@/css/globals.css";
import "@/css/agent-sketch.css";
import { AgentSidebar } from "@/app/agent/_components/AgentSidebar";
import { auth } from "@/auth";
import { LocatorRuntime } from "@/components/locator-runtime";
import { ThemeProvider } from "@/components/theme/theme-provider";
import TankQueryClientProvider from "@/components/trpc/provider";
import { brandedTitle, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: brandedTitle(`Agent · ${SITE_NAME}`),
  description: "Ask, think, and act",
};

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/agent");
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="agent-sketch h-dvh overflow-hidden shinchan:font-sans">
        <ThemeProvider>
          <TankQueryClientProvider>
            <div className="flex h-full flex-col md:flex-row">
              <AgentSidebar user={session.user} />
              <LocatorRuntime />
              <main className="relative min-h-0 min-w-0 flex-1 overflow-auto md:flex-1">
                {children}
              </main>
            </div>
          </TankQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
