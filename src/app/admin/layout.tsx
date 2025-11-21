import TankQueryClientProvider from "@/components/trpc/provider";

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
