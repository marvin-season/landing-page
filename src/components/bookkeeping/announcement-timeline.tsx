"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Announcement } from "@/lib/bookkeeping-announcements/model";

export function AnnouncementTimeline({ items }: { items: Announcement[] }) {
  const { i18n } = useLingui();
  const dateFormat = new Intl.DateTimeFormat(
    i18n.locale === "pseudo" ? "en" : i18n.locale,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    },
  );
  return (
    <ol className="ml-2 border-l border-border/70">
      {items.map((item, index) => (
        <li key={item.id} className="relative pl-5 pb-6 last:pb-1">
          <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary ring-4 ring-background" />
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={item.publishedAt}>
              {dateFormat.format(new Date(item.publishedAt))}
            </time>
            {index === 0 ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                <Trans>最新</Trans>
              </span>
            ) : null}
          </div>
          <article className="rounded-xl border border-border/60 bg-card px-3.5 py-3">
            <h2 className="text-sm font-semibold text-foreground break-words">
              {item.title}
            </h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
              {item.body}
            </p>
          </article>
        </li>
      ))}
    </ol>
  );
}
