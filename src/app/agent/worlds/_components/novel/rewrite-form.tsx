"use client";

import { Button, Switch } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import {
  Check,
  LoaderCircle,
  Square,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { WritingInstructions } from "./writing-instructions";

type RewriteControls = {
  preview: string;
  requirements?: string;
  draftReady: boolean;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  writer: {
    busy: boolean;
    error: string;
    stop: () => void;
    draftIncomplete?: boolean;
  };
  ended: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onApply: () => void;
  onRewrite: (requirements: string) => void;
};

export function RewritePanel({
  autoFocus = true,
  isPassage,
  preview,
  requirements = "",
  draftReady,
  compactContext,
  onCompactContextChange,
  writer,
  ended,
  onClose,
  onDelete,
  onApply,
  onRewrite,
  embedded = false,
}: RewriteControls & {
  autoFocus?: boolean;
  isPassage: boolean;
  embedded?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const instructions = useRef<HTMLTextAreaElement>(null);
  const showInstructions = !writer.busy && !draftReady;
  const submittedRequirements = requirements.trim();

  useLayoutEffect(() => {
    if (!showInstructions) {
      form.current?.focus({ preventScroll: true });
    } else if (autoFocus && window.matchMedia("(pointer: fine)").matches) {
      instructions.current?.focus({ preventScroll: true });
    }
  }, [autoFocus, showInstructions]);

  return (
    <form
      ref={form}
      className={cn(
        "flex min-w-0 shrink-0 flex-col overflow-hidden outline-none",
        !embedded &&
          "rounded-lg border border-border bg-popover text-popover-foreground",
        showInstructions ? "max-h-[min(16rem,55dvh)]" : "h-[min(26rem,48dvh)]",
        !embedded &&
          (isPassage
            ? "@3xl:max-h-[60%]"
            : "mx-auto mb-4 w-[calc(100%-2rem)] max-w-3xl"),
      )}
      tabIndex={-1}
      onSubmit={(event) => {
        event.preventDefault();
        if (showInstructions && !ended) {
          const requirements = new FormData(event.currentTarget).get(
            "requirements",
          );
          onRewrite(String(requirements ?? ""));
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && showInstructions) onClose();
      }}
    >
      <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <WandSparkles className="size-4 shrink-0 text-primary" />
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
        ) : draftReady ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            待应用
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
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-col",
          showInstructions ? "gap-2 overflow-y-auto px-3" : "flex-1 gap-1 px-2",
        )}
      >
        <div className={showInstructions ? "shrink-0" : "hidden"}>
          <WritingInstructions
            ref={instructions}
            label="润色指令（选填）"
            placeholder="润色指令（选填），例如：收紧对话节奏"
          />
        </div>
        {!showInstructions && submittedRequirements ? (
          <p className="max-h-16 shrink-0 overflow-y-auto px-1 wrap-break-word text-sm leading-5">
            {submittedRequirements}
          </p>
        ) : null}
        {!showInstructions ? (
          <Conversation
            className="min-h-0 rounded-md bg-muted/25"
            role="region"
            aria-label="润色草稿"
            initial="instant"
            resize="instant"
          >
            <ConversationContent
              className="gap-0 px-3 pt-3 pb-10 sm:px-4"
              scrollClassName="overflow-y-auto overscroll-contain"
            >
              {preview ? (
                <div className="wrap-break-word whitespace-pre-wrap text-sm leading-7">
                  {preview}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">等待正文…</p>
              )}
            </ConversationContent>
            <ConversationScrollButton
              className="right-2 bottom-2 left-auto size-8 translate-x-0"
              aria-label="跳到草稿末尾"
              title="跳到草稿末尾"
            />
          </Conversation>
        ) : null}
        {writer.error ? (
          <p
            role={writer.draftIncomplete ? "status" : "alert"}
            className={cn(
              "shrink-0 wrap-break-word text-xs",
              writer.draftIncomplete
                ? "text-muted-foreground"
                : "text-destructive",
              !showInstructions && "px-1 py-1",
            )}
          >
            {writer.error}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 px-3 py-2">
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
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="删除选区"
            title="删除选区"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
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
            variant="ghost"
            className="mr-auto"
            onClick={(event) => {
              event.preventDefault();
              writer.stop();
            }}
          >
            <Square data-icon="inline-start" />
            停止生成
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
