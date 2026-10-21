"use client";

import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@landing-page/design-system";
import { Trans } from "@lingui/react/macro";
import { Megaphone } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnnouncementFeed } from "./announcement-feed";

export function AnnouncementSheet() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Sheet key={`${pathname}?${searchParams.toString()}`}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="shrink-0">
          <Megaphone data-icon="inline-start" />
          <Trans>公告</Trans>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="h-dvh w-full gap-3 overflow-hidden sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 pr-12 pb-0">
          <SheetTitle>
            <Trans>公告</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>更新与提醒</Trans>
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[env(safe-area-inset-bottom)]">
          <AnnouncementFeed />
        </div>
      </SheetContent>
    </Sheet>
  );
}
