"use client";

import { Button } from "@landing-page/design-system";
import { ArrowLeft, LoaderCircle, Settings2, Users } from "lucide-react";
import Link from "next/link";

export function RoomHeader({
  title,
  running,
  ended,
  phase,
  paused,
  reason,
  actionPending,
  onOpenNotes,
  onEdit,
}: {
  title: string;
  running: boolean;
  ended: boolean;
  phase: string;
  paused: boolean;
  reason?: string;
  actionPending: boolean;
  onOpenNotes: () => void;
  onEdit: () => void;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/agent/worlds" aria-label="返回世界列表">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-normal">{title}</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {running ? <LoaderCircle className="size-3 animate-spin" /> : null}
            {ended
              ? "故事已结束"
              : running
                ? phase
                : paused
                  ? reason || "已暂停"
                  : reason || "故事尚未开始"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenNotes}
          className="xl:hidden"
        >
          <Users data-icon="inline-start" />
          世界
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={running || actionPending}
          onClick={onEdit}
        >
          <Settings2 data-icon="inline-start" />
          设定
        </Button>
      </div>
    </header>
  );
}
