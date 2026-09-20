import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { brandedTitle, SITE_NAME } from "@/lib/site";
import "@/css/globals.css";

export const metadata: Metadata = {
  title: brandedTitle(`Sign in · ${SITE_NAME}`),
  description: "Sign in to continue",
};

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
