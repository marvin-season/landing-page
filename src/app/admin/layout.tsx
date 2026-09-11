import { ThemeMenu } from "@/components/theme/theme-menu";
import { ThemeProvider } from "@/components/theme/theme-provider";
import TankQueryClientProvider from "@/components/trpc/provider";
import "@/css/globals.css";
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
