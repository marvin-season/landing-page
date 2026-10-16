"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import { Pin } from "lucide-react";
import type { ReactNode } from "react";
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
  const pinnedItems = items.filter((item) => item.pinned);
  const timelineItems = items.filter((item) => !item.pinned);
  const latest = timelineItems.reduce<Announcement | undefined>(
    (newest, item) =>
      !newest || item.publishedAt > newest.publishedAt ? item : newest,
    undefined,
  );
  return (
    <div className="flex flex-col gap-5">
      {pinnedItems.length > 0 ? (
        <section className="">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Pin className="size-3.5" />
            置顶公告
          </h2>
          <ul className="flex flex-col gap-2.5">
            {pinnedItems.map((item) => (
              <li key={item.id}>
                <AnnouncementCard item={item}>
                  <time
                    dateTime={item.publishedAt}
                    className="mt-2 block text-xs text-muted-foreground"
                  >
                    {dateFormat.format(new Date(item.publishedAt))}
                  </time>
                </AnnouncementCard>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {timelineItems.length > 0 ? (
        <section>
          {pinnedItems.length > 0 ? (
            <h2 className="mb-3 text-xs font-medium text-muted-foreground">
              公告动态
            </h2>
          ) : null}
          <ol className="ml-2 border-l border-border/70">
            {timelineItems.map((item) => (
              <li key={item.id} className="relative pl-5 pb-6 last:pb-1">
                <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary ring-4 ring-background" />
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={item.publishedAt}>
                    {dateFormat.format(new Date(item.publishedAt))}
                  </time>
                  {item.id === latest?.id ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      <Trans>最新</Trans>
                    </span>
                  ) : null}
                </div>
                <AnnouncementCard item={item} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function AnnouncementCard({
  item,
  children,
}: {
  item: Announcement;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border/60 bg-card px-3.5 py-3">
      <h3 className="text-sm font-semibold text-foreground break-words">
        {item.title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
        {item.body}
      </p>
      {children}
    </article>
  );
}
