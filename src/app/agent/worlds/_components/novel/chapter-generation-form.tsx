import { Button, Input, Switch } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { PenLine, Trash2, WandSparkles } from "lucide-react";
import { type ReactNode, type Ref, useLayoutEffect, useRef } from "react";
import {
  isChapterTargetValid,
  maxChapterLength,
  minChapterTarget,
} from "./model";
import { WritingInstructions } from "./writing-instructions";

export type ChapterGenerationOptions = {
  chapterGoal: string;
  words: string;
};

function WritingGenerationForm({
  children,
  embedded,
  onSubmit,
}: {
  children: ReactNode;
  embedded?: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col gap-2",
        !embedded &&
          "rounded-lg border border-input bg-background p-3 focus-within:border-ring",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export function ChapterGenerationForm({
  options,
  disabled,
  embedded,
  inputRef,
  hint,
  submitDisabled = false,
  submitLabel,
  onChange,
  onGenerate,
  onWriteManually,
  manualDisabled,
}: {
  options: ChapterGenerationOptions;
  disabled: boolean;
  embedded?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  hint?: string;
  submitDisabled?: boolean;
  submitLabel: string;
  onChange: (next: ChapterGenerationOptions) => void;
  onGenerate: () => void;
  onWriteManually?: () => void;
  manualDisabled?: boolean;
}) {
  const validTarget = isChapterTargetValid(options.words);
  return (
    <WritingGenerationForm
      embedded={embedded}
      onSubmit={() => {
        if (!disabled && !submitDisabled && validTarget) onGenerate();
      }}
    >
      <h3 className="text-sm font-medium">下一章要求</h3>
      <WritingInstructions
        ref={inputRef}
        plain={embedded}
        label="下一章要求"
        value={options.chapterGoal}
        disabled={disabled}
        placeholder="可指定本章事件、伏笔、结尾或情绪；留空则按大纲继续。"
        onChange={(event) =>
          onChange({ ...options, chapterGoal: event.target.value })
        }
      />
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          每章字数
          <Input
            value={options.words}
            disabled={disabled}
            inputMode="numeric"
            maxLength={4}
            aria-label="每章字数"
            onChange={(event) =>
              onChange({ ...options, words: event.target.value })
            }
            className="h-8 w-16 px-2 text-sm"
          />
          <span>
            {minChapterTarget}–{maxChapterLength}
          </span>
        </label>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {onWriteManually ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              disabled={manualDisabled ?? disabled}
              onClick={onWriteManually}
            >
              <PenLine data-icon="inline-start" />
              手动写下一章
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            className="min-w-28 whitespace-nowrap"
            disabled={disabled || submitDisabled || !validTarget}
          >
            <WandSparkles data-icon="inline-start" />
            {submitLabel}
          </Button>
        </div>
      </div>
      {hint ? (
        <p className="wrap-break-word text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </WritingGenerationForm>
  );
}

export function ChapterRewriteForm({
  title = "润色整章",
  requirements,
  onChange,
  compactContext,
  onCompactContextChange,
  disabled,
  submitDisabled,
  embedded,
  inputRef,
  submitLabel,
  onGenerate,
  onCancel,
  onDelete,
}: {
  title?: string;
  requirements: string;
  onChange: (requirements: string) => void;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  disabled: boolean;
  submitDisabled?: boolean;
  embedded?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  submitLabel: string;
  onGenerate: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const instructions = useRef<HTMLTextAreaElement>(null);
  const autoFocus = Boolean(onCancel);
  useLayoutEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches)
      instructions.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <WritingGenerationForm
      embedded={embedded}
      onSubmit={() => !disabled && !submitDisabled && onGenerate()}
    >
      <h3 className="text-sm font-medium">{title}</h3>
      <WritingInstructions
        ref={inputRef ?? instructions}
        plain={embedded}
        className="focus:border-transparent"
        label="润色指令（选填）"
        value={requirements}
        disabled={disabled}
        placeholder="润色指令（选填），例如：收紧对话节奏"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (!disabled && event.key === "Escape") onCancel?.();
        }}
      />
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={compactContext}
            disabled={disabled}
            onCheckedChange={onCompactContextChange}
          />
          精简上下文
        </label>
        <div className="ml-auto flex items-center gap-2">
          {onDelete ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="删除选区"
              title="删除选区"
              disabled={disabled}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
          {onCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={onCancel}
            >
              取消
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            className="min-w-28 whitespace-nowrap"
            disabled={disabled || submitDisabled}
          >
            <WandSparkles data-icon="inline-start" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </WritingGenerationForm>
  );
}
