"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { announcementPageSchema } from "./model";

export class AnnouncementRequestError extends Error {
  constructor(readonly status: number) {
    super(`Announcement request failed: ${status}`);
  }
}

export async function announcementRequest(url: string, init?: RequestInit) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
  if (!response.ok) throw new AnnouncementRequestError(response.status);
  return response.json();
}

export function useAnnouncementFeed(locale: string, q = "", admin = false) {
  return useInfiniteQuery({
    queryKey: [
      "bookkeeping-announcements",
      admin ? "admin" : "public",
      locale,
      q,
    ],
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        locale: locale === "en" ? "en" : "zh",
        q,
      });
      if (pageParam) params.set("cursor", pageParam);
      const prefix = admin ? "/api/admin" : "/api";
      return announcementPageSchema.parse(
        await announcementRequest(
          `${prefix}/bookkeeping/announcements?${params}`,
          { signal },
        ),
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    retry: false,
    // Fail promptly offline so the page can offer built-in announcements and retry.
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: "always",
  });
}
