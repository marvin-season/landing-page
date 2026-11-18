"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Check, LoaderCircle, Square, WandSparkles, X } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  MarkdownProse,
  UnifiedMarkdown,
} from "@/components/ui/unified-markdown";
import { renderChapterMarkdown } from "./chapter-markdown";
import { selectedChapterText } from "./chapter-selection";
import type { ChapterTextRange } from "./model";

export type RewriteTarget = { range?: ChapterTextRange; atStart: boolean };

export function ChapterReading({
  title,
  text,
  canSelect,
  onSelect,
  target,
  preview,
  draftReady,
  writer,
  onClose,
  onApply,
  onRewrite,
  ended,
}: {
  title: string;
  text: string;
  canSelect: boolean;
  onSelect: (target: RewriteTarget) => void;
  target: RewriteTarget | null;
  preview: string;
  draftReady: boolean;
  writer: { busy: boolean; error: string; stop: () => void };
  onClose: () => void;
  onApply: () => boolean;
  onRewrite: (requirements: string) => void;
  ended: boolean;
}) {
  const body = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLFormElement>(null);
  const output = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const [appliedRange, setAppliedRange] = useState<ChapterTextRange>();
  const start = target?.range?.start ?? 0;
  const end = target?.range?.end ?? text.length;
  const markStart = target ? start : appliedRange?.start;
  const markEnd = target ? end : appliedRange?.end;
  const content = useMemo(
    () =>
      renderChapterMarkdown(
        text,
        markStart !== undefined && markEnd !== undefined
          ? { start: markStart, end: markEnd }
          : undefined,
      ),
    [markEnd, markStart, text],
  );
  const showInstructions = !writer.busy && !draftReady;

  useLayoutEffect(() => {
    const element = output.current;
    if (writer.busy && preview && element && followOutput.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [preview, writer.busy]);

  const captureSelection = useEffectEvent(() => {
    const selection = window.getSelection();
    if (
      !canSelect ||
      !body.current ||
      !selection ||
      selection.isCollapsed ||
      !selection.rangeCount
    )
      return;
    const range = selection.getRangeAt(0);
    const selected = selectedChapterText(body.current, text, range);
    if (!selected) return;
    const atStart =
      selection.anchorNode !== range.startContainer ||
      selection.anchorOffset !== range.startOffset;
    onSelect({ range: selected, atStart });
  });

  useEffect(() => {
    if (!canSelect) return;
    let pointerDown = false;
    let pending: ReturnType<typeof setTimeout>;
    function deferSelection() {
      clearTimeout(pending);
      if (!pointerDown) pending = setTimeout(captureSelection, 100);
    }
    function startSelection() {
      pointerDown = true;
      clearTimeout(pending);
    }
    function finishSelection() {
      pointerDown = false;
      deferSelection();
    }
    document.addEventListener("pointerdown", startSelection);
    document.addEventListener("pointerup", finishSelection);
    document.addEventListener("pointercancel", finishSelection);
    document.addEventListener("selectionchange", deferSelection);
    return () => {
      clearTimeout(pending);
      document.removeEventListener("pointerdown", startSelection);
      document.removeEventListener("pointerup", finishSelection);
      document.removeEventListener("pointercancel", finishSelection);
      document.removeEventListener("selectionchange", deferSelection);
    };
  }, [canSelect]);

  useLayoutEffect(() => {
    const article = body.current;
    const form = popup.current;
    if (!target || !article || !form) return;
    const marks = article.querySelectorAll("[data-rewrite-mark]");
    const atStart = target.atStart;
    const anchor = (atStart ? marks[0] : marks[marks.length - 1]) ?? article;
    if (!target.range) anchor.scrollIntoView({ block: "nearest" });

    function position() {
      if (!form) return;
      const rects = anchor.getClientRects();
      const rect =
        rects[atStart ? 0 : rects.length - 1] ?? anchor.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = form;
      const margin = 8;
      const left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - width - margin),
      );
      const preferredTop =
        rect.bottom + height + 2 * margin <= window.innerHeight
          ? rect.bottom + margin
          : rect.top - height - margin;
      const top = Math.max(
        margin,
        Math.min(preferredTop, window.innerHeight - height - margin),
      );
      form.style.left = `${left}px`;
      form.style.top = `${top}px`;
      form.style.visibility = "visible";
    }

    const observer = new ResizeObserver(position);
    observer.observe(form);
    observer.observe(article);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    position();
    if (window.matchMedia("(pointer: fine)").matches) {
      form.querySelector("textarea")?.focus({ preventScroll: true });
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [target]);

  return (
    <article className="flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-xl">{title}</h3>
        {!target && appliedRange ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-500" />
            已应用润色
          </span>
        ) : null}
      </div>
      <div ref={body}>
        <MarkdownProse
          className={
            target
              ? "[&_[data-rewrite-mark]]:bg-primary/20 [&_[data-rewrite-mark]]:text-inherit"
              : "[&_[data-rewrite-mark]]:bg-emerald-400/30 [&_[data-rewrite-mark]]:text-inherit"
          }
        >
          {content}
        </MarkdownProse>
      </div>
      {target
        ? createPortal(
            <form
              ref={popup}
              className={cn(
                "invisible fixed z-50 flex max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg",
                showInstructions ? "w-80" : "w-xl",
              )}
              onSubmit={(event) => {
                event.preventDefault();
                if (showInstructions && !ended) {
                  const requirements = new FormData(event.currentTarget).get(
                    "requirements",
                  );
                  followOutput.current = true;
                  onRewrite(String(requirements ?? ""));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && !writer.busy) onClose();
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {writer.busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}
                  {draftReady
                    ? "润色草稿 · 待应用"
                    : writer.busy
                      ? "正在润色…"
                      : target.range
                        ? "润色选段"
                        : "润色整章"}
                </span>
                {showInstructions ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label="取消润色"
                    onClick={onClose}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
              <textarea
                name="requirements"
                aria-label="润色指令"
                placeholder="例如：收紧对话节奏，保留悬念"
                rows={2}
                maxLength={4000}
                hidden={!showInstructions}
                className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {!showInstructions ? (
                <div
                  ref={output}
                  className="min-h-20 max-h-[55dvh] overflow-y-auto overscroll-contain wrap-break-word rounded-md border border-border bg-background px-3 py-2"
                  onScroll={(event) => {
                    const { scrollHeight, clientHeight, scrollTop } =
                      event.currentTarget;
                    followOutput.current =
                      scrollHeight - clientHeight - scrollTop <= 24;
                  }}
                >
                  <UnifiedMarkdown
                    content={preview}
                    hasNextChunk={writer.busy}
                    className="prose-sm"
                  />
                </div>
              ) : null}
              {writer.error ? (
                <p
                  role="alert"
                  className="wrap-break-word text-xs text-destructive"
                >
                  {writer.error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                {draftReady ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={onClose}
                    >
                      丢弃
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={ended}
                      onClick={() => {
                        if (onApply())
                          setAppliedRange({
                            start,
                            end: start + preview.length,
                          });
                      }}
                    >
                      <Check data-icon="inline-start" />
                      应用替换
                    </Button>
                  </>
                ) : writer.busy ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={writer.stop}
                  >
                    <Square data-icon="inline-start" />
                    停止
                  </Button>
                ) : (
                  <Button type="submit" size="sm" disabled={ended}>
                    <WandSparkles data-icon="inline-start" />
                    开始润色
                  </Button>
                )}
              </div>
            </form>,
            document.body,
          )
        : null}
    </article>
  );
}
