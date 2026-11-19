"use client";

import { Button, Switch } from "@landing-page/design-system";
import {
  Check,
  LoaderCircle,
  Square,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  type Ref,
  type RefObject,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";

export type RewriteControls = {
  preview: string;
  draftReady: boolean;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  writer: { busy: boolean; error: string; stop: () => void };
  ended: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onApply: () => void;
  onRewrite: (requirements: string) => void;
};

export function RewritePopover({
  anchor,
  bounds,
  atStart = true,
  autoFocus = true,
  ...props
}: RewriteControls & {
  anchor: RefObject<HTMLElement | null>;
  bounds?: RefObject<HTMLElement | null>;
  atStart?: boolean;
  autoFocus?: boolean;
  isPassage: boolean;
}) {
  const popup = useRef<HTMLFormElement>(null);

  useLayoutEffect(() => {
    const form = popup.current;
    const mark = anchor.current;
    if (!form || !mark) return;
    const boundary = bounds?.current;
    let frame = 0;

    function position() {
      if (!form || !mark) return;
      const rects = mark.getClientRects();
      const rect =
        rects[atStart ? 0 : rects.length - 1] ?? mark.getBoundingClientRect();
      const area = boundary?.getBoundingClientRect();
      const margin = 8;
      const maxRight =
        Math.min(window.innerWidth, area?.right ?? window.innerWidth) - margin;
      const minLeft = Math.max(0, area?.left ?? 0) + margin;
      const maxBottom = window.innerHeight - margin;
      if (area) form.style.maxWidth = `${maxRight - minLeft}px`;
      const anchorTop = Math.max(area?.top ?? margin, rect.top);
      const anchorBottom = Math.min(area?.bottom ?? maxBottom, rect.bottom);
      const left = Math.max(
        minLeft,
        Math.min(rect.left, maxRight - form.offsetWidth),
      );
      const top =
        anchorBottom + margin + form.offsetHeight <= maxBottom
          ? anchorBottom + margin
          : anchorTop - form.offsetHeight - margin;

      form.style.left = `${left}px`;
      form.style.top = `${Math.max(margin, Math.min(top, maxBottom - form.offsetHeight))}px`;
      form.style.visibility = "visible";
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(form);
    if (boundary) observer.observe(boundary);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    position();
    schedule();
    if (autoFocus && window.matchMedia("(pointer: fine)").matches)
      form.querySelector("textarea")?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [anchor, atStart, autoFocus, bounds]);

  return createPortal(
    <RewriteForm
      {...props}
      formRef={popup}
      className="invisible fixed z-50 flex max-h-[min(36rem,calc(100dvh-1rem))] w-md max-w-[calc(100vw-1rem)] flex-col overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5"
    />,
    document.body,
  );
}

export function RewriteForm({
  className,
  formRef,
  isPassage,
  preview,
  draftReady,
  compactContext,
  onCompactContextChange,
  writer,
  ended,
  onClose,
  onDelete,
  onApply,
  onRewrite,
}: RewriteControls & {
  className: string;
  formRef?: Ref<HTMLFormElement>;
  isPassage: boolean;
}) {
  const output = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const instructionsId = useId();
  const showInstructions = !writer.busy && !draftReady;

  useLayoutEffect(() => {
    const element = output.current;
    if (writer.busy && preview && element && followOutput.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [preview, writer.busy]);

  return (
    <form
      ref={formRef}
      className={className}
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
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <WandSparkles className="size-4" />
          </span>
          <h3 className="text-sm font-semibold">
            {isPassage ? "润色选段" : "润色整章"}
          </h3>
        </div>
        {writer.busy ? (
          <span
            role="status"
            className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
          >
            <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
            生成中
          </span>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="关闭润色"
            title="关闭润色"
            onClick={onClose}
          >
            <X />
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-col gap-3 px-4 py-3">
        <div className={showInstructions ? "flex flex-col gap-2" : "hidden"}>
          <label
            htmlFor={instructionsId}
            className="flex items-baseline justify-between gap-2 text-xs font-medium"
          >
            润色指令
            <span className="font-normal text-muted-foreground">选填</span>
          </label>
          <textarea
            id={instructionsId}
            name="requirements"
            placeholder="例如：收紧对话节奏，保留悬念"
            rows={3}
            maxLength={4000}
            className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {!showInstructions ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            <span>润色草稿</span>
            {draftReady ? (
              <span className="text-muted-foreground">待应用</span>
            ) : null}
          </div>
        ) : null}
        {!showInstructions ? (
          <div
            ref={output}
            className="min-h-20 max-h-[45dvh] overflow-y-auto overscroll-contain wrap-break-word rounded-md border border-border bg-muted/35 px-3 py-2"
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
          <p role="alert" className="wrap-break-word text-xs text-destructive">
            {writer.error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
        {showInstructions ? (
          <label className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={compactContext}
              onCheckedChange={onCompactContextChange}
            />
            精简上下文
          </label>
        ) : null}
        {showInstructions && onDelete ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 data-icon="inline-start" />
            删除选区
          </Button>
        ) : null}
        {draftReady ? (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              丢弃
            </Button>
            <Button type="button" size="sm" disabled={ended} onClick={onApply}>
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
    </form>
  );
}
