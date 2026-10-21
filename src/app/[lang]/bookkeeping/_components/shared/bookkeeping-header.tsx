"use client";

import type { ReactNode } from "react";
import { AnnouncementSheet } from "../announcements/announcement-sheet";
import { BookkeepingTitle } from "./bookkeeping-layout";

export function BookkeepingHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <BookkeepingTitle>{title}</BookkeepingTitle>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <AnnouncementSheet />
      </div>
      {children}
    </header>
  );
}
