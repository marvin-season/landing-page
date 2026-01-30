export default function RawLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-scroll">{children}</body>
    </html>
  );
}
