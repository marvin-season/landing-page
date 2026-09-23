"use client";

import "@/css/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <title>出错了 · 蜡笔小新</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,color-mix(in_oklab,var(--destructive)_10%,transparent),transparent_58%)]"
          />
          <div className="relative flex max-w-md flex-col items-center gap-4 text-center">
            <h1 className="text-6xl font-bold tracking-tight text-muted-foreground/40">
              出错了
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {error.message || "页面遇到了一些问题，请稍后再试。"}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
