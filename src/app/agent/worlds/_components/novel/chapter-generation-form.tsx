import { Button } from "@landing-page/design-system";
import { PenLine } from "lucide-react";
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

export function ChapterGenerationForm({
  options,
  disabled,
  submitDisabled = false,
  submitLabel,
  onChange,
  onGenerate,
}: {
  options: ChapterGenerationOptions;
  disabled: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  onChange: (next: ChapterGenerationOptions) => void;
  onGenerate: () => void;
}) {
  const validTarget = isChapterTargetValid(options.words);
  return (
    <form
      className="flex w-full min-w-0 shrink-0 flex-col gap-2 rounded-lg border border-input bg-background p-3 focus-within:border-ring"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !submitDisabled && validTarget) onGenerate();
      }}
    >
      <h3 className="text-sm font-medium">下一章要求</h3>
      <WritingInstructions
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
          生成上限
          <input
            value={options.words}
            disabled={disabled}
            inputMode="numeric"
            maxLength={4}
            aria-label="每章生成字数上限"
            onChange={(event) =>
              onChange({ ...options, words: event.target.value })
            }
            className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <span>
            {minChapterTarget}–{maxChapterLength}
          </span>
        </label>
        <Button
          type="submit"
          size="sm"
          className="ml-auto min-w-28 whitespace-nowrap"
          disabled={disabled || submitDisabled || !validTarget}
        >
          <PenLine data-icon="inline-start" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
