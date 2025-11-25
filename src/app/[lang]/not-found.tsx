import Link from "next/link";
import "@/css/globals.css";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <p className="text-lg text-muted-foreground">Page not found</p>
          <Link
            href={`/`}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Go Home
          </Link>
        </div>
      </body>
    </html>
  );
}
