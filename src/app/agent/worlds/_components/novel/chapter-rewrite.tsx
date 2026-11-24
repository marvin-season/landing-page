"use client";

import { Button, Input } from "@landing-page/design-system";
import { Check } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MarkdownProse } from "@/components/ui/unified-markdown";
import { renderChapterMarkdown } from "./chapter-markdown";
import { maxChapterTitleLength } from "./model";

export function ChapterReading({
  title,
  text,
  brief,
  rewriting,
  appliedLength,
  reuseDisabled,
  renameDisabled,
  onRename,
  onReuseBrief,
}: {
  title: string;
  text: string;
  brief?: string;
  rewriting: boolean;
  appliedLength?: number;
  reuseDisabled?: boolean;
  renameDisabled?: boolean;
  onRename?: (title: string) => void;
  onReuseBrief?: (brief: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const cancelRename = useRef(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const markEnd = rewriting ? text.length : appliedLength;
  const content = useMemo(
    () =>
      renderChapterMarkdown(
        text,
        markEnd !== undefined ? { start: 0, end: markEnd } : undefined,
      ),
    [markEnd, text],
  );
  useLayoutEffect(() => {
    if (rewriting) heading.current?.scrollIntoView({ block: "nearest" });
  }, [rewriting]);
  useLayoutEffect(() => {
    if (!editingTitle) return;
    titleInput.current?.focus();
    titleInput.current?.select();
  }, [editingTitle]);

  function commitTitle() {
    if (cancelRename.current) {
      cancelRename.current = false;
      return;
    }
    setEditingTitle(false);
    const next = titleDraft.replace(/[\r\n]+/g, " ").trim();
    if (next !== title) onRename?.(next);
  }

  return (
    <article className="flex flex-col gap-4 pb-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editingTitle ? (
          <Input
            ref={titleInput}
            aria-label="章名"
            className="h-auto max-w-xl font-serif text-xl"
            maxLength={maxChapterTitleLength}
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelRename.current = true;
                setTitleDraft(title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <h3 ref={heading} className="font-serif text-xl">
            <button
              type="button"
              className="rounded-sm px-1 -mx-1 text-left enabled:hover:bg-muted/60 disabled:cursor-default"
              disabled={renameDisabled || !onRename}
              title={renameDisabled ? undefined : "修改章名"}
              onClick={() => {
                setTitleDraft(title);
                setEditingTitle(true);
              }}
            >
              {title}
            </button>
          </h3>
        )}
        {!rewriting && appliedLength !== undefined ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-500" />
            已应用润色
          </span>
        ) : null}
      </div>
      {brief ? (
        <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              本章要求
            </p>
            {onReuseBrief ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={reuseDisabled}
                onClick={() => onReuseBrief(brief)}
              >
                用作下一章要求
              </Button>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{brief}</p>
        </div>
      ) : null}
      <div>
        <MarkdownProse
          className={
            rewriting
              ? "[&_[data-rewrite-mark]]:bg-primary/20 [&_[data-rewrite-mark]]:text-inherit"
              : "[&_[data-rewrite-mark]]:bg-emerald-400/30 [&_[data-rewrite-mark]]:text-inherit"
          }
        >
          {content}
        </MarkdownProse>
      </div>
    </article>
  );
}
