import "@/css/globals.css";
import Provider from "./_components/provider";

export default async function RawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-scroll">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
