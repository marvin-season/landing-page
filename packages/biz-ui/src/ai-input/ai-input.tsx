"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Tiptap } from "@tiptap/react";
import type { ReactNode, Ref } from "react";
import { MentionMenu } from "./mention-menu";
import type { AiInputHandle, AiInputSubmitValue, AiMentionItem } from "./types";
import { useAiInput } from "./use-ai-input";

function IconArrowUp() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

function IconSquare() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="currentColor"
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export type AiInputProps<T = unknown> = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  mentions?: AiMentionItem<T>[];
  defaultMentions?: AiMentionItem<T>[];
  onMentionsChange?: (mentions: AiMentionItem<T>[]) => void;
  mentionItems?: readonly AiMentionItem<T>[];
  mentionTrigger?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  canSubmit?: boolean;
  maxLength?: number;
  rows?: number;
  header?: ReactNode;
  footer?: ReactNode;
  emptyMentionLabel?: string;
  sendLabel?: string;
  stopLabel?: string;
  removeMentionLabel?: string;
  hint?: ReactNode;
  className?: string;
  onSubmit?: (value: AiInputSubmitValue<T>) => void;
  onStop?: () => void;
  ref?: Ref<AiInputHandle | null>;
};

const editorCls = cn(
  "max-h-40 min-h-20 w-full bg-transparent",
  "[&_.tiptap]:min-h-20 [&_.tiptap]:max-h-40 [&_.tiptap]:overflow-y-auto [&_.tiptap]:bg-transparent [&_.tiptap]:text-sm [&_.tiptap]:leading-6 [&_.tiptap]:outline-none",
  "[&_.tiptap_p]:m-0",
  "[&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_.is-editor-empty:first-child::before]:float-left [&_.tiptap_.is-editor-empty:first-child::before]:h-0 [&_.tiptap_.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
);

export function AiInput<T = unknown>({
  header,
  footer,
  hint,
  className,
  rows = 3,
  ...props
}: AiInputProps<T>) {
  const {
    editor,
    mentions,
    mentionOpen,
    filteredItems,
    activeIndex,
    listId,
    submitEnabled,
    disabled,
    loading,
    emptyMentionLabel,
    sendLabel,
    stopLabel,
    removeMentionLabel,
    formProps,
    setActiveIndex,
    selectMention,
    removeMention,
    onStop,
  } = useAiInput(props);

  return (
    <form
      {...formProps}
      className={cn(
        "relative rounded-2xl border border-border bg-background p-3 shadow-sm transition-shadow duration-300 focus-within:ring-2 focus-within:ring-ring/30 motion-reduce:transition-none",
        className,
      )}
    >
      {mentionOpen ? (
        <MentionMenu
          items={filteredItems}
          activeIndex={Math.min(
            activeIndex,
            Math.max(filteredItems.length - 1, 0),
          )}
          emptyLabel={emptyMentionLabel}
          listId={listId}
          onActiveIndexChange={setActiveIndex}
          onSelect={selectMention}
        />
      ) : null}
      {header}
      {mentions.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {mentions.map((mention) => (
            <span
              key={mention.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/70 py-1 pr-1 pl-2.5 text-xs"
            >
              {mention.icon ? (
                <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-3.5">
                  {mention.icon}
                </span>
              ) : null}
              <span className="truncate">{mention.label}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-5"
                disabled={disabled}
                aria-label={`${removeMentionLabel} ${mention.label}`}
                onClick={() => removeMention(mention.id)}
              >
                <IconClose />
              </Button>
            </span>
          ))}
        </div>
      ) : null}
      {editor ? (
        <Tiptap editor={editor}>
          <Tiptap.Content
            className={cn(
              editorCls,
              disabled && "cursor-not-allowed opacity-50",
            )}
            style={{ minHeight: `${Math.max(rows, 1) * 1.5}rem` }}
          />
        </Tiptap>
      ) : (
        <div
          aria-hidden
          className={editorCls}
          style={{ minHeight: `${Math.max(rows, 1) * 1.5}rem` }}
        />
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0 text-[11px] text-muted-foreground">
          {footer ?? hint}
        </div>
        {loading && onStop ? (
          <Button
            type="button"
            size="icon"
            className="size-8 shrink-0"
            aria-label={stopLabel}
            onClick={onStop}
          >
            <IconSquare />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="size-8 shrink-0"
            aria-label={sendLabel}
            disabled={disabled || loading || !submitEnabled}
          >
            <IconArrowUp />
          </Button>
        )}
      </div>
    </form>
  );
}
