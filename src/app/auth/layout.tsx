import { SessionProvider } from "next-auth/react";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "@/css/globals.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased shinchan:font-sans">
        <ThemeProvider>
          <ThemeMenu />
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
