import "@/css/globals.css";
import type { Metadata } from "next";
import { ChatSidebar } from "@/app/chat/_components/sidebar/chat-sidebar";
import { MobileSidebar } from "@/app/chat/_components/sidebar/mobile-sidebar";

export const metadata: Metadata = {
  icons: {
    icon: [{ url: "/bot.svg", type: "image/svg+xml" }],
    shortcut: ["/bot.svg"],
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-dvh min-h-dvh bg-white overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:flex h-full shrink-0">
            <ChatSidebar />
          </div>

          {/* Mobile sidebar */}
          <MobileSidebar />
          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
