import TankQueryClientProvider from "@/components/trpc/provider";
import "@/css/globals.css";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TankQueryClientProvider>{children}</TankQueryClientProvider>
      </body>
    </html>
  );
}
