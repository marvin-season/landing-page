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
        <Link href="/agui/raw">Try Raw AG-UI</Link>
        <AgentProvider>{children}</AgentProvider>
      </body>
    </html>
  );
}
