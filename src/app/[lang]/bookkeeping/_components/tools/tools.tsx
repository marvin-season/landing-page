"use client";

import { Trans } from "@lingui/react/macro";
import { BookkeepingEmptyState } from "../shared/bookkeeping-empty-state";
import { BookkeepingHeader } from "../shared/bookkeeping-header";
import { BookkeepingPage } from "../shared/bookkeeping-layout";

export function Tools() {
  return (
    <BookkeepingPage className="min-h-0 flex-1 overflow-hidden">
      <BookkeepingHeader title="工具" />
      <BookkeepingEmptyState
        mood="ponder"
        className="min-h-0 flex-1 rounded-xl bg-card"
        title={<Trans>还没有工具</Trans>}
        description={<Trans>小工具正在准备中，之后会放在这里。</Trans>}
      />
    </BookkeepingPage>
  );
}
