"use client";

import { Button } from "@landing-page/design-system";
import { BrandStatusPage } from "@/components/brand-status-page";
import { jetbrainsMono } from "@/lib/fonts";
import { SITE_NAME } from "@/lib/site";
import "@/styles/globals.css";

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
        <title>{`闹脾气了 · ${SITE_NAME}`}</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${jetbrainsMono.variable} ${jetbrainsMono.className} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        <BrandStatusPage
          eyebrow="哎呀"
          title="闹脾气了"
          description="页面有点不听话。再试一次，或者先回家看看小新在干嘛。"
          detail={
            <>
              <p className="break-words">
                {error.message || "页面遇到了一些问题，请稍后再试。"}
              </p>
              {error.digest ? (
                <p className="mt-1 font-mono text-[11px] opacity-70">
                  {error.digest}
                </p>
              ) : null}
            </>
          }
          actions={
            <>
              <Button type="button" onClick={reset}>
                再试一次
              </Button>
              <Button variant="outline" asChild>
                <a href="/">回首页</a>
              </Button>
            </>
          }
        />
      </body>
    </html>
  );
}
