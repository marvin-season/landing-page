"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { ChevronDown } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";

const columns = 10;

export type ChapterIndexEntry = {
  id: string;
  title: string;
  pending?: boolean;
};

export function ChapterIndex({
  chapters,
  value,
  disabled,
  onSelect,
}: {
  chapters: ChapterIndexEntry[];
  value: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const selected = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === value),
  );
  const active = chapters[open ? cursor : selected];
  const label = chapters[selected] ? `第${selected + 1}章` : "章节";

  function focusAt(index: number) {
    const next = Math.max(0, Math.min(chapters.length - 1, index));
    setCursor(next);
    const cell = cells.current[next];
    cell?.focus();
    cell?.scrollIntoView({ block: "nearest" });
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -columns,
      ArrowDown: columns,
      Home: -chapters.length,
      End: chapters.length,
    }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    focusAt(cursor + step);
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setCursor(selected);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 shrink-0 gap-1 px-2.5 font-normal tabular-nums"
          aria-label="章节目录"
          disabled={disabled}
        >
          {label}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[18.25rem] p-2"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusAt(selected);
        }}
      >
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-xs">
            {active
              ? active.pending
                ? `${active.title} · 正在构思`
                : active.title
              : "没有章节"}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            每行十章
          </span>
        </div>
        <div
          className="grid max-h-52 grid-cols-10 gap-1 overflow-y-auto"
          onKeyDown={onGridKeyDown}
        >
          {chapters.map((chapter, index) => {
            const current = chapter.id === value;
            return (
              <button
                key={chapter.id}
                ref={(node) => {
                  cells.current[index] = node;
                }}
                type="button"
                aria-current={current ? "true" : undefined}
                aria-label={
                  chapter.pending
                    ? `第${index + 1}章 ${chapter.title}，正在构思`
                    : `第${index + 1}章 ${chapter.title}`
                }
                title={chapter.title}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md text-[11px] tabular-nums text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  current &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  chapter.pending && "border border-dashed border-primary/50",
                )}
                onMouseEnter={() => setCursor(index)}
                onFocus={() => setCursor(index)}
                onClick={() => {
                  onSelect(chapter.id);
                  setOpen(false);
                }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
