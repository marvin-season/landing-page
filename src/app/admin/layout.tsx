import type { Metadata } from "next";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { ThemeProvider } from "@/components/theme/theme-provider";
import TankQueryClientProvider from "@/components/trpc/provider";
import { brandedTitle, SITE_NAME } from "@/lib/site";
import "@/css/globals.css";

export const metadata: Metadata = {
  title: brandedTitle(`Admin · ${SITE_NAME}`),
  description: "Internal tools and experiments",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="shinchan:font-sans">
        <ThemeProvider>
          <ThemeMenu />
          <TankQueryClientProvider>{children}</TankQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
