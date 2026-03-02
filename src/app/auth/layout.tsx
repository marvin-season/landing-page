import { SessionProvider } from "next-auth/react";
import "@/css/globals.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
