"use client";

import { Button, SelectItem, Textarea } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import {
  ArrowLeft,
  GitCompareArrows,
  LoaderCircle,
  PencilLine,
  Save,
  Square,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  confirmAgentNavigation,
  useUnsavedNavigation,
} from "@/app/agent/_components/use-unsaved-navigation";
import { WorldSelect } from "../world-select";
import { ChapterDiffView } from "./chapter-diff-view";
import {
  type ChapterTextRange,
  type ChapterTextSelection,
  textareaSelectionRange,
} from "./chapter-text";
import { type Chapter, maxChapterLength } from "./model";
import { RewritePanel } from "./rewrite-form";
import type { useNovel } from "./use-novel";

export function ChapterEditor({
  base,
  chapters,
  initialText,
  initialSelection,
  generation,
  writer,
  ended,
  compactContext,
  onCompactContextChange,
  onSave,
  onSelectChapter,
  onExit,
}: {
  base: Chapter;
  chapters: readonly Chapter[];
  initialText?: string;
  initialSelection?: ChapterTextSelection;
  generation?: {
    kind: "chapter" | "rewrite";
    onGenerate: () => boolean;
    renderForm: (props: {
      disabled: boolean;
      onGenerate: () => void;
    }) => ReactNode;
  };
  writer: Pick<
    ReturnType<typeof useNovel>,
    | "busy"
    | "generationStopped"
    | "draftIncomplete"
    | "draftBackupFailed"
    | "backupDraftText"
    | "error"
    | "stop"
    | "task"
    | "preview"
    | "rewriteReady"
    | "rewrite"
    | "discardRewrite"
    | "applyDraftRewrite"
  >;
  ended: boolean;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  onSave: (chapter: Chapter) => Promise<boolean>;
  onSelectChapter: (id: string) => void;
  onExit: () => void;
}) {
  const [draft, setDraft] = useState(() =>
    initialText === undefined ? base : { ...base, text: initialText },
  );
  const [useGeneratedText, setUseGeneratedText] = useState(
    initialText === undefined,
  );
  const [revealedLength, setRevealedLength] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [target, setTarget] = useState<ChapterTextSelection | null>(
    () => initialSelection ?? null,
  );
  const [appliedRange, setAppliedRange] = useState<ChapterTextRange | null>(
    null,
  );
  const editor = useRef<HTMLTextAreaElement>(null);
  const focusedNewChapter = useRef(false);
  const generatedScrollTop = useRef<number | null>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const pendingSelection = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingCaret = useRef<number | null>(null);
  const generatingDraft = Boolean(generation);
  const draftText =
    generation && useGeneratedText ? writer.preview : draft.text;
  const currentDraft = generation ? { ...base, text: draftText } : draft;
  const revealGeneratedText =
    generatingDraft && useGeneratedText && !writer.generationStopped;
  // Reveal a burst over a few frames without delaying ordinary text deltas.
  const newTextLength = draftText.length - revealedLength;
  const frameLength = revealGeneratedText
    ? Math.min(
        draftText.length,
        revealedLength + Math.max(24, Math.ceil(newTextLength / 8)),
      )
    : draftText.length;
  const visibleLength =
    frameLength < draftText.length &&
    (draftText.codePointAt(frameLength - 1) ?? 0) > 0xffff
      ? frameLength + 1
      : frameLength;
  const visibleText = draftText.slice(0, visibleLength);
  const editorBusy = writer.busy || visibleLength < draftText.length;
  const dirty =
    draftText !== base.text &&
    (!generatingDraft || !useGeneratedText || Boolean(draftText.trim()));
  const exceedsLimit = draftText.length > maxChapterLength;
  const highlight = target ?? appliedRange;
  const editingLocked = Boolean(target && (writer.busy || writer.rewriteReady));
  const cannotSave =
    !dirty ||
    saving ||
    editingLocked ||
    editorBusy ||
    exceedsLimit ||
    (generatingDraft && !draftText.trim());
  useUnsavedNavigation(
    (generatingDraft && writer.busy) || (dirty && !editingLocked),
    generatingDraft && writer.busy
      ? "章节正在生成，离开会中断本次生成。确定离开吗？"
      : generatingDraft
        ? "草稿尚未应用，确定离开吗？"
        : "章节有未保存的修改，确定放弃并离开吗？",
  );

  const isNewChapter = !chapters.some((chapter) => chapter.id === base.id);
  useLayoutEffect(() => {
    if (focusedNewChapter.current || generation || !isNewChapter) return;
    focusedNewChapter.current = true;
    editor.current?.focus({ preventScroll: true });
  }, [generation, isNewChapter]);

  useLayoutEffect(() => {
    if (revealedLength === visibleLength || !revealGeneratedText) return;
    const frame = requestAnimationFrame(() => setRevealedLength(visibleLength));
    return () => cancelAnimationFrame(frame);
  }, [revealGeneratedText, revealedLength, visibleLength]);

  useLayoutEffect(() => {
    const input = editor.current;
    if (!generatingDraft || !useGeneratedText || !visibleText || !input) return;
    // Updating the textarea value can move the viewport to the caret.
    input.scrollTop = generatedScrollTop.current ?? input.scrollHeight;
  }, [generatingDraft, useGeneratedText, visibleText]);

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    const input = editor.current;
    if (target || caret === null || !input) return;
    pendingCaret.current = null;
    input.focus({ preventScroll: true });
    input.setSelectionRange(caret, caret);
  }, [target]);

  const syncMirror = useCallback(() => {
    const input = editor.current;
    const layer = mirror.current;
    if (!input || !layer) return;
    layer.style.width = `${input.clientWidth}px`;
    layer.scrollTop = input.scrollTop;
  }, []);

  useLayoutEffect(() => {
    const input = editor.current;
    if (!highlight || !input) return;
    syncMirror();
    const observer = new ResizeObserver(syncMirror);
    observer.observe(input);
    return () => observer.disconnect();
  }, [highlight, syncMirror]);

  useEffect(() => () => clearTimeout(pendingSelection.current), []);

  function closeRewrite() {
    if (writer.busy) return;
    clearTimeout(pendingSelection.current);
    writer.discardRewrite();
    setTarget(null);
  }

  async function save() {
    if (cannotSave) return;
    clearTimeout(pendingSelection.current);
    if (generation?.kind !== "rewrite") closeRewrite();
    setAppliedRange(null);
    setSaving(true);
    setSaveFailed(false);
    if (generation) {
      setDraft(currentDraft);
      setUseGeneratedText(false);
    }
    try {
      const saved = await onSave(currentDraft);
      setSaveFailed(!saved);
      if (saved) setShowDiff(false);
    } finally {
      setSaving(false);
    }
  }

  function deleteSelection() {
    if (!target || editingLocked) return;
    const { start, end } = target;
    const before = draft.text.slice(0, start);
    pendingCaret.current = before.replace(/\r\n?/g, "\n").length;
    setDraft({ ...draft, text: before + draft.text.slice(end) });
    setAppliedRange(null);
    closeRewrite();
  }

  return (
    <div className="@container flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/95">
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-3">
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            disabled={editorBusy || editingLocked || saving}
            onClick={() => {
              if (generation) {
                if (dirty && !window.confirm("确定丢弃草稿并返回阅读吗？"))
                  return;
              } else if (!confirmAgentNavigation()) {
                return;
              }
              onExit();
            }}
          >
            <ArrowLeft data-icon="inline-start" />
            返回阅读
          </Button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <WorldSelect
              label="章节目录"
              size="sm"
              className="max-w-md"
              value={base.id}
              disabled={
                generatingDraft ||
                dirty ||
                saving ||
                editingLocked ||
                writer.busy
              }
              title={dirty ? "保存当前章节后可切换" : undefined}
              onValueChange={(value) => {
                closeRewrite();
                setShowDiff(false);
                onSelectChapter(value);
              }}
            >
              {isNewChapter ? (
                <SelectItem value={base.id}>{base.title}（新章）</SelectItem>
              ) : null}
              {chapters.map((chapter, index) => (
                <SelectItem key={chapter.id} value={chapter.id}>
                  {chapter.title || `第${index + 1}章`}
                </SelectItem>
              ))}
            </WorldSelect>
          </div>
          <span
            role="status"
            className={cn(
              "min-w-12 shrink-0 whitespace-nowrap text-xs text-muted-foreground",
              dirty && saveFailed && "text-destructive",
            )}
          >
            {generation && editorBusy
              ? draftText
                ? "正在生成…"
                : "等待输出…"
              : saving
                ? "保存中…"
                : generatingDraft || dirty
                  ? saveFailed
                    ? "保存失败"
                    : generation && writer.draftIncomplete && useGeneratedText
                      ? "未写完 · 未保存"
                      : generation &&
                          writer.generationStopped &&
                          useGeneratedText
                        ? "已停止 · 未保存"
                        : "未保存"
                  : "已保存"}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {generation && writer.busy ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={writer.stop}
            >
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          ) : null}
          {showDiff ? (
            <Button
              size="sm"
              variant="outline"
              disabled={editorBusy || saving}
              onClick={() => setShowDiff(false)}
            >
              <PencilLine data-icon="inline-start" />
              返回编辑
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty || editingLocked || editorBusy || saving}
              onClick={() => {
                if (target) closeRewrite();
                setShowDiff(true);
              }}
            >
              <GitCompareArrows data-icon="inline-start" />
              查看修改
            </Button>
          )}
          <Button size="sm" disabled={cannotSave} onClick={() => void save()}>
            <Save data-icon="inline-start" />
            {generation ? "应用草稿" : "保存章节"}
          </Button>
        </div>
      </div>
      {showDiff ? (
        <section className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-3">
          {saveFailed && writer.error ? (
            <p role="alert" className="text-xs text-destructive">
              {writer.error}
            </p>
          ) : null}
          <ChapterDiffView base={base} draft={currentDraft} />
        </section>
      ) : (
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col",
            (target || generation) && "@3xl:min-h-72",
          )}
        >
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-4">
            <div className="flex min-h-6 shrink-0 items-center">
              <h2 className="flex items-center gap-1.5 text-sm font-medium">
                {generation && editorBusy ? (
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : null}
                编辑草稿
              </h2>
              <span
                className={cn(
                  "ml-auto text-xs text-muted-foreground",
                  exceedsLimit && "text-destructive",
                )}
              >
                {visibleLength} / {maxChapterLength} 字
              </span>
            </div>
            <div
              className={cn(
                "relative flex min-h-48 flex-1",
                target && "@3xl:min-h-0",
              )}
            >
              {highlight ? (
                <div
                  ref={mirror}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-px overflow-hidden wrap-break-word whitespace-pre-wrap px-3 py-2 text-sm leading-7 text-transparent"
                >
                  {draft.text.slice(0, highlight.start)}
                  <mark
                    className={cn(
                      "text-transparent",
                      target ? "bg-primary/25" : "bg-emerald-500/25",
                    )}
                  >
                    {draft.text.slice(highlight.start, highlight.end)}
                  </mark>
                  {draft.text.slice(highlight.end)}
                  {"\u200b"}
                </div>
              ) : null}
              <Textarea
                ref={editor}
                variant="plain"
                aria-label="章节正文"
                readOnly={editorBusy || editingLocked || saving}
                placeholder={
                  generation?.kind === "rewrite" && writer.busy
                    ? "等待输出…"
                    : undefined
                }
                value={visibleText}
                maxLength={
                  draftText.length > maxChapterLength
                    ? undefined
                    : maxChapterLength
                }
                onScroll={(event) => {
                  if (generatingDraft && useGeneratedText) {
                    const { scrollTop, scrollHeight, clientHeight } =
                      event.currentTarget;
                    generatedScrollTop.current =
                      scrollHeight - clientHeight - scrollTop <= 2
                        ? null
                        : scrollTop;
                  }
                  syncMirror();
                }}
                onBlur={() => clearTimeout(pendingSelection.current)}
                onPointerDown={() => clearTimeout(pendingSelection.current)}
                onChange={(event) => {
                  clearTimeout(pendingSelection.current);
                  if (target) closeRewrite();
                  setAppliedRange(null);
                  setUseGeneratedText(false);
                  if (generation) writer.backupDraftText(event.target.value);
                  setDraft({ ...draft, text: event.target.value });
                }}
                onSelect={(event) => {
                  if (generatingDraft || editingLocked || saving || writer.busy)
                    return;
                  const input = event.currentTarget;
                  clearTimeout(pendingSelection.current);
                  pendingSelection.current = setTimeout(() => {
                    if (document.activeElement !== input) return;
                    const { selectionStart, selectionEnd, selectionDirection } =
                      input;
                    const selection = textareaSelectionRange(
                      draft.text,
                      selectionStart,
                      selectionEnd,
                      selectionDirection,
                    );
                    if (!selection) {
                      if (target) closeRewrite();
                      return;
                    }
                    if (
                      target?.start === selection.start &&
                      target.end === selection.end
                    )
                      return;
                    writer.discardRewrite();
                    setAppliedRange(null);
                    setTarget(selection);
                  }, 100);
                }}
                className={cn(
                  "relative min-h-48 flex-1 resize-none leading-7",
                  target && "selection:bg-transparent",
                  target && "@3xl:min-h-0",
                )}
              />
            </div>
            {generation ? (
              <>
                {writer.draftBackupFailed ? (
                  <p role="alert" className="text-xs text-destructive">
                    草稿备份失败，刷新前请先应用草稿或复制正文。
                  </p>
                ) : null}
                {writer.error ? (
                  <p
                    role={writer.draftIncomplete ? "status" : "alert"}
                    className={cn(
                      "text-xs",
                      writer.draftIncomplete
                        ? "text-muted-foreground"
                        : "text-destructive",
                    )}
                  >
                    {writer.error}
                  </p>
                ) : null}
                {generation.renderForm({
                  disabled: ended || saving || editorBusy,
                  onGenerate: () => {
                    if (
                      dirty &&
                      !window.confirm("重新生成会替换当前草稿，确定继续吗？")
                    )
                      return;
                    if (generation.onGenerate()) {
                      generatedScrollTop.current = null;
                      setRevealedLength(0);
                      setUseGeneratedText(true);
                      setSaveFailed(false);
                    }
                  },
                })}
              </>
            ) : null}
            {target ? (
              <RewritePanel
                key={`${target.start}:${target.end}`}
                autoFocus={false}
                isPassage
                preview={writer.task === "rewrite" ? writer.preview : ""}
                draftReady={writer.rewriteReady}
                compactContext={compactContext}
                onCompactContextChange={onCompactContextChange}
                writer={writer}
                ended={
                  ended || !draft.text.slice(target.start, target.end).trim()
                }
                onDelete={deleteSelection}
                onClose={closeRewrite}
                onApply={() => {
                  const next = writer.applyDraftRewrite(draft);
                  if (!next) return;
                  setDraft(next);
                  setAppliedRange({
                    start: target.start,
                    end: target.start + writer.preview.length,
                  });
                  setTarget(null);
                }}
                onRewrite={(requirements) => {
                  clearTimeout(pendingSelection.current);
                  writer.rewrite(draft.id, requirements, {
                    range: { start: target.start, end: target.end },
                    compactContext,
                    draft,
                  });
                }}
              />
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
