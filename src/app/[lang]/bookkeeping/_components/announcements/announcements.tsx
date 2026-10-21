"use client";

import { Trans } from "@lingui/react/macro";
import { BookkeepingHeader } from "../shared/bookkeeping-header";
import { BookkeepingPage } from "../shared/bookkeeping-layout";
import { AnnouncementFeed } from "./announcement-feed";

export function Announcements() {
  return (
    <BookkeepingPage className="min-h-0 flex-1 overflow-hidden">
      <BookkeepingHeader
        title={<Trans>公告</Trans>}
        description={<Trans>更新与提醒</Trans>}
      />
      <AnnouncementFeed />
    </BookkeepingPage>
  );
}
