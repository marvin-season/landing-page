import { AgentProvider } from "@/app/agui/_components/AgentProvider";
import "@/css/globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-scroll">
        <nav className="flex gap-4 p-4 border-b">
          <Link href="/agui" className="hover:underline">
            Home
          </Link>
          <Link href="/agui/mastra" className="hover:underline">
            Mastra Chat
          </Link>
          <Link href="/agui/raw" className="hover:underline">
            Raw AG-UI
          </Link>
        </nav>
        <AgentProvider>{children}</AgentProvider>
      </body>
    </html>
  );
}
