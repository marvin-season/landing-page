"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { MentionMenu, mentionMenuKey, nextMentionIndex } from "./mention-menu";
import {
  consumeMentionQuery,
  filterMentionItems,
  getActiveMention,
} from "./mention-query";
import type { AiInputSubmitValue, AiMentionItem } from "./types";

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
  ref?: Ref<HTMLTextAreaElement>;
};

export function AiInput<T = unknown>({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  mentions: mentionsProp,
  defaultMentions,
  onMentionsChange,
  mentionItems,
  mentionTrigger = "@",
  placeholder,
  label,
  disabled = false,
  loading = false,
  maxLength = 8000,
  rows = 3,
  header,
  footer,
  emptyMentionLabel = "No matches",
  sendLabel = "Send message",
  stopLabel = "Stop response",
  removeMentionLabel = "Remove",
  hint,
  className,
  onSubmit,
  onStop,
  ref,
}: AiInputProps<T>) {
  const listId = useId();
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledMentions, setUncontrolledMentions] = useState<
    AiMentionItem<T>[]
  >(() => defaultMentions ?? []);
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);

  const value = valueProp ?? uncontrolledValue;
  const mentions = mentionsProp ?? uncontrolledMentions;
  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const selectedIds = useMemo(
    () => new Set(mentions.map((item) => item.id)),
    [mentions],
  );
  const mentionRange = mentionItems
    ? getActiveMention(value, caret, mentionTrigger)
    : null;
  const mentionOpen =
    mentionRange !== null &&
    Boolean(mentionItems) &&
    dismissedStart !== mentionRange.start;
  const filteredItems = useMemo(
    () =>
      mentionOpen && mentionRange
        ? filterMentionItems(
            mentionItems ?? [],
            mentionRange.query,
            selectedIds,
          )
        : [],
    [mentionItems, mentionOpen, mentionRange, selectedIds],
  );
  const canSubmit = Boolean(value.trim() || mentions.length > 0);

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [onValueChange, valueProp],
  );

  const setMentions = useCallback(
    (next: AiMentionItem<T>[]) => {
      if (mentionsProp === undefined) setUncontrolledMentions(next);
      onMentionsChange?.(next);
    },
    [mentionsProp, onMentionsChange],
  );

  const syncCaret = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    setCaret(textarea.selectionStart);
  }, []);

  const selectMention = useCallback(
    (item: AiMentionItem<T>) => {
      const textarea = innerRef.current;
      const range = getActiveMention(
        value,
        textarea?.selectionStart ?? caret,
        mentionTrigger,
      );
      if (!range) return;
      setDismissedStart(null);
      const next = consumeMentionQuery(value, range);
      setValue(next.value);
      setMentions(selectedIds.has(item.id) ? mentions : [...mentions, item]);
      setActiveIndex(0);
      requestAnimationFrame(() => {
        const node = innerRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(next.caret, next.caret);
        setCaret(next.caret);
      });
    },
    [
      caret,
      mentionTrigger,
      mentions,
      selectedIds,
      setMentions,
      setValue,
      value,
    ],
  );

  const submit = useCallback(() => {
    if (disabled || loading || !canSubmit) return;
    onSubmit?.({ text: value.trim(), mentions });
    if (valueProp === undefined) setUncontrolledValue("");
    if (mentionsProp === undefined) setUncontrolledMentions([]);
  }, [
    canSubmit,
    disabled,
    loading,
    mentions,
    mentionsProp,
    onSubmit,
    value,
    valueProp,
  ]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      const action = mentionMenuKey(event, filteredItems.length);
      if (action) {
        event.preventDefault();
        if (action === "close") {
          setDismissedStart(mentionRange?.start ?? null);
          return;
        }
        if (action === "up" || action === "down") {
          setActiveIndex((current) =>
            nextMentionIndex(current, filteredItems.length, action),
          );
          return;
        }
        const item = filteredItems[activeIndex];
        if (item) selectMention(item);
        return;
      }
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.nativeEvent.keyCode !== 229
    ) {
      event.preventDefault();
      submit();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  return (
    <form
      onSubmit={handleSubmit}
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
                onClick={() =>
                  setMentions(mentions.filter((item) => item.id !== mention.id))
                }
              >
                <IconClose />
              </Button>
            </span>
          ))}
        </div>
      ) : null}
      <textarea
        ref={setTextareaRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        maxLength={maxLength}
        rows={rows}
        role="combobox"
        aria-expanded={mentionOpen}
        aria-controls={mentionOpen ? listId : undefined}
        aria-activedescendant={
          mentionOpen && filteredItems[activeIndex]
            ? `${listId}-${filteredItems[activeIndex].id}`
            : undefined
        }
        aria-autocomplete="list"
        className="block max-h-40 min-h-20 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => {
          const next = event.target.value;
          const nextCaret = event.target.selectionStart;
          const nextRange = getActiveMention(next, nextCaret, mentionTrigger);
          if (!nextRange || nextRange.start !== dismissedStart) {
            setDismissedStart(null);
          }
          setValue(next);
          setCaret(nextCaret);
          setActiveIndex(0);
        }}
        onClick={(event) => syncCaret(event.currentTarget)}
        onKeyUp={(event) => syncCaret(event.currentTarget)}
        onSelect={(event) => syncCaret(event.currentTarget)}
        onKeyDown={handleKeyDown}
      />
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
            disabled={disabled || loading || !canSubmit}
          >
            <IconArrowUp />
          </Button>
        )}
      </div>
    </form>
  );
}
