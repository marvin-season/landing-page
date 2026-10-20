"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDebounce } from "ahooks";
import { LoaderCircle, Megaphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnnouncementTimeline } from "@/components/bookkeeping/announcement-timeline";
import { getBuiltinAnnouncements } from "@/lib/bookkeeping-announcements/builtin";
import { useAnnouncementFeed } from "@/lib/bookkeeping-announcements/client";
import { compareAnnouncements } from "@/lib/bookkeeping-announcements/model";
import { pageTitleCls } from "../../_styles/layout";
import { SearchInput } from "../shared/search-input";

export function Announcements() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AnnouncementFeed />
    </QueryClientProvider>
  );
}

function AnnouncementFeed() {
  const { t, i18n } = useLingui();
  const [search, setSearch] = useState("");
  const query = useDebounce(search.trim().slice(0, 100), { wait: 300 });
  const feed = useAnnouncementFeed(i18n.locale, query);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { hasNextPage, isFetching, isError, fetchNextPage } = feed;

  useEffect(() => {
    if (
      !scrolled ||
      !hasNextPage ||
      isFetching ||
      isError ||
      !sentinelRef.current
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage({ cancelRefetch: false });
      },
      { root: scrollRef.current, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [scrolled, hasNextPage, isFetching, isError, fetchNextPage]);

  const fallback = getBuiltinAnnouncements(i18n.locale).filter(
    (item) =>
      Date.parse(item.publishedAt) <= Date.now() &&
      `${item.title}\n${item.body}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const items = [
    ...new Map(
      (feed.data?.pages.flatMap((page) => page.items) ?? fallback).map(
        (item) => [item.id, item],
      ),
    ).values(),
  ].sort(compareAnnouncements);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="shrink-0">
        <h1 className={pageTitleCls}>
          <Trans>公告</Trans>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          <Trans>更新与提醒</Trans>
        </p>
      </header>
      <div className="shrink-0 [&_[data-slot=input]]:h-9 [&_[data-slot=button]]:size-9">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setScrolled(false);
            scrollRef.current?.scrollTo({ top: 0 });
          }}
          label={t`搜索公告…`}
        />
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 pb-4"
        onScroll={(event) => {
          if (event.currentTarget.scrollTop > 0) setScrolled(true);
        }}
      >
        {feed.isError ? (
          <Alert className="mb-4">
            <AlertDescription>
              <p>{feed.data ? t`加载失败` : t`网络无法连接，`}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={feed.isFetching}
                onClick={() =>
                  void (feed.isFetchNextPageError
                    ? feed.fetchNextPage()
                    : feed.refetch())
                }
              >
                <Trans>Retry</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <AnnouncementTimeline items={items} />
        {items.length === 0 && !feed.isPending ? (
          <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <Megaphone className="size-6" />
            <Trans>暂无匹配的公告</Trans>
          </div>
        ) : null}
        <div
          ref={sentinelRef}
          className="flex min-h-12 items-center justify-center py-3 text-xs text-muted-foreground"
        >
          {feed.isFetching ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-3.5 animate-spin" />
              <Trans>加载公告中…</Trans>
            </span>
          ) : feed.hasNextPage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void feed.fetchNextPage()}
            >
              <Trans>加载更早的公告</Trans>
            </Button>
          ) : feed.isSuccess && items.length > 0 ? (
            <Trans>已展示全部公告</Trans>
          ) : null}
        </div>
      </div>
    </div>
  );
}
