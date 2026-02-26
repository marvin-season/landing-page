import "@/css/globals.css";
import { ChatModeSwitcher } from "@/components/chat/chat-mode-switcher";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-scroll">
        <ChatModeSwitcher />
        {children}
      </body>
    </html>
  );
}
