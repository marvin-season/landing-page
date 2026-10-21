"use client";

import { BookkeepingHeader } from "../shared/bookkeeping-header";
import { BookkeepingPage } from "../shared/bookkeeping-layout";

export function Tools() {
  return (
    <BookkeepingPage className="min-h-0 flex-1 overflow-hidden">
      <BookkeepingHeader title="工具" />
    </BookkeepingPage>
  );
}
