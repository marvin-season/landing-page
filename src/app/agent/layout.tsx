import "@/css/globals.css";
import { ChatModeSwitcher } from "@/components/chat/chat-mode-switcher";
import TankQueryClientProvider from "@/components/trpc/provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-scroll">
        <TankQueryClientProvider>
          <ChatModeSwitcher />
          {children}
        </TankQueryClientProvider>
      </body>
    </html>
  );
}
