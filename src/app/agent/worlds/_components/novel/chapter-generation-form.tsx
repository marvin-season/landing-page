import { Button, Input, Switch } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { PenLine, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { type ReactNode, type Ref, useLayoutEffect, useRef } from "react";
import {
  isChapterTargetValid,
  maxChapterLength,
  minChapterTarget,
} from "./model";
import {
  compactContextHint,
  localActionHint,
  minimalContextHint,
  NovelActionButton,
  NovelActionTooltip,
  nextChapterActionHint,
  rewriteHint,
} from "./novel-action-tooltip";
import { WritingInstructions } from "./writing-instructions";

export type ChapterGenerationOptions = {
  chapterGoal: string;
  words: string;
};

export const emptyNovelQuickStarts = [
  {
    id: "farmer-and-snake",
    title: "农夫和蛇",
    description: "伊索寓言精简版",
    prompt:
      "写伊索寓言《农夫与蛇》精简版：寒冬里农夫救起冻僵的蛇，蛇苏醒后反咬恩人。用具体场景、动作和短对白呈现，章末点出忘恩负义的寓意，不要说教旁白。",
  },
  {
    id: "crow-and-water",
    title: "乌鸦喝水",
    description: "经典寓言精简版",
    prompt:
      "写《乌鸦喝水》精简版：口渴的乌鸦发现瓶中水位太低，衔石子使水位上升后喝到水。用观察、试探和连续动作展开，突出聪明与坚持，不要写成说明文。",
  },
  {
    id: "wusong-tiger",
    title: "武松打虎",
    description: "水浒开场白",
    prompt:
      "写《水浒传》武松打虎的开场：景阳冈酒店「三碗不过岗」、武松酒后执意上山，山路渐静、风动林响，遇见大虫前的气氛与人物神态。白话叙事，停在虎影将现处。",
  },
] as const;

export function EmptyNovelContinuation({
  disabled,
  onOpen,
  onSelectExample,
}: {
  disabled: boolean;
  onOpen: () => void;
  onSelectExample: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-10 text-center">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          还没有章节。写下下一章要求开始续写，或从下方案例快速开始。
        </p>
        <p className="text-xs text-muted-foreground">
          也可从文件菜单导入已有小说。
        </p>
      </div>
      <div className="w-full space-y-2 rounded-lg border bg-card p-3 text-left">
        <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" />
          快速开始
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {emptyNovelQuickStarts.map((example) => (
            <Button
              key={example.id}
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => onSelectExample(example.prompt)}
              className="h-auto flex-col items-start gap-1 px-3 py-3 text-left"
            >
              <span className="text-sm font-medium">{example.title}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {example.description}
              </span>
            </Button>
          ))}
        </div>
      </div>
      <NovelActionButton
        hint={localActionHint(
          "展开下一章要求，填写后可手动写作或发起 AI 续写。",
        )}
        type="button"
        size="sm"
        disabled={disabled}
        onClick={onOpen}
      >
        <PenLine data-icon="inline-start" />
        填写下一章要求
      </NovelActionButton>
    </div>
  );
}

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
  skills,
  disabled,
  embedded,
  inputRef,
  hint,
  submitDisabled = false,
  submitLabel,
  onChange,
  onSkillsChange,
  onGenerate,
  onWriteManually,
  manualDisabled,
}: {
  options: ChapterGenerationOptions;
  skills?: string[];
  disabled: boolean;
  embedded?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  hint?: string;
  submitDisabled?: boolean;
  submitLabel: string;
  onChange: (next: ChapterGenerationOptions) => void;
  onSkillsChange?: (skills: string[]) => void;
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
      <WritingInstructions
        ref={inputRef}
        plain={embedded}
        label="下一章要求"
        value={options.chapterGoal}
        disabled={disabled}
        skills={skills}
        onSkillsChange={onSkillsChange}
        placeholder="可指定本章事件、伏笔、结尾或情绪；输入 / 限定 Writer 可选用的技法。"
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
            <NovelActionButton
              hint={localActionHint("打开空白新章，保存前仅保留为本机草稿。")}
              type="button"
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              disabled={manualDisabled ?? disabled}
              onClick={onWriteManually}
            >
              <PenLine data-icon="inline-start" />
              手动续写
            </NovelActionButton>
          ) : null}
          <NovelActionButton
            hint={
              onWriteManually
                ? nextChapterActionHint
                : {
                    ...nextChapterActionHint,
                    action: "在同一位置重新生成新章草稿。",
                  }
            }
            type="submit"
            size="sm"
            className="min-w-28 whitespace-nowrap"
            disabled={disabled || submitDisabled || !validTarget}
          >
            <WandSparkles data-icon="inline-start" />
            {submitLabel}
          </NovelActionButton>
        </div>
      </div>
      {hint ? (
        <p className="wrap-break-word text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </WritingGenerationForm>
  );
}

export function ChapterRewriteForm({
  title,
  requirements,
  onChange,
  skills,
  onSkillsChange,
  compactContext,
  onCompactContextChange,
  minimalContext = false,
  onMinimalContextChange,
  disabled,
  submitDisabled,
  embedded,
  inputRef,
  isPassage = false,
  submitLabel,
  onGenerate,
  onCancel,
  onDelete,
}: {
  title?: string;
  requirements: string;
  onChange: (requirements: string) => void;
  skills?: string[];
  onSkillsChange?: (skills: string[]) => void;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  minimalContext?: boolean;
  onMinimalContextChange?: (checked: boolean) => void;
  disabled: boolean;
  submitDisabled?: boolean;
  embedded?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  isPassage?: boolean;
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
      {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
      <WritingInstructions
        ref={inputRef ?? instructions}
        plain={embedded}
        className="focus:border-transparent"
        label="润色指令（选填）"
        value={requirements}
        disabled={disabled}
        skills={skills}
        onSkillsChange={onSkillsChange}
        placeholder="润色指令（选填）；输入 / 限定 Writer 可选用的技法"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (!disabled && event.key === "Escape") onCancel?.();
        }}
      />
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <NovelActionTooltip hint={compactContextHint(isPassage)}>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={compactContext || minimalContext}
                disabled={disabled || minimalContext}
                onCheckedChange={onCompactContextChange}
              />
              精简上下文
            </label>
          </NovelActionTooltip>
          {isPassage && onMinimalContextChange ? (
            <NovelActionTooltip hint={minimalContextHint}>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={minimalContext}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    onMinimalContextChange(checked);
                    if (checked && !compactContext)
                      onCompactContextChange(true);
                  }}
                />
                极简模式
              </label>
            </NovelActionTooltip>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onDelete ? (
            <NovelActionButton
              hint={localActionHint("从本机草稿中删除选中的文字。")}
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="删除选区"
              disabled={disabled}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </NovelActionButton>
          ) : null}
          {onCancel ? (
            <NovelActionButton
              hint={localActionHint("关闭当前润色表单。")}
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={onCancel}
            >
              取消
            </NovelActionButton>
          ) : null}
          <NovelActionButton
            hint={rewriteHint(
              isPassage,
              compactContext || minimalContext,
              isPassage && minimalContext,
            )}
            type="submit"
            size="sm"
            className="min-w-28 whitespace-nowrap"
            disabled={disabled || submitDisabled}
          >
            <WandSparkles data-icon="inline-start" />
            {submitLabel}
          </NovelActionButton>
        </div>
      </div>
    </WritingGenerationForm>
  );
}
