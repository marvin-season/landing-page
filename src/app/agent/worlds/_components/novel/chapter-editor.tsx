"use client";

import { SelectItem, Textarea } from "@landing-page/design-system";
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
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  confirmAgentNavigation,
  useUnsavedNavigation,
} from "@/app/agent/_components/use-unsaved-navigation";
import { ComposerDock, FloatingComposer } from "../floating-composer";
import { WorldSelect } from "../world-select";
import { ChapterDiffView } from "./chapter-diff-view";
import { writeChapterEditorDraft } from "./chapter-editor-drafts";
import { ChapterRewriteForm } from "./chapter-generation-form";
import { useRegisterPromptReuse } from "./chapter-prompt-reuse";
import {
  type ChapterTextRange,
  type ChapterTextSelection,
  replaceTextRange,
  textareaSelectionRange,
} from "./chapter-text";
import { type Chapter, maxChapterLength } from "./model";
import {
  localActionHint,
  NovelActionButton,
  NovelActionTooltip,
  rewriteHint,
  stopGenerationHint,
} from "./novel-action-tooltip";
import { PromptHistoryDialog } from "./prompt-history-dialog";
import { useChapterEditorDraft } from "./use-chapter-editor-draft";
import type { useNovel } from "./use-novel";

export function ChapterEditor({
  roomKey,
  base,
  chapters,
  initialText,
  generation,
  writer,
  ended,
  compactContext,
  onCompactContextChange,
  onSave,
  onSelectChapter,
  onExit,
  rewriteRequirements,
  onRewriteRequirementsChange,
  composerRequest,
  onRequestComposer,
  onBeginChapterRewrite,
  onDiscardRewrite,
}: {
  roomKey: string;
  base: Chapter;
  chapters: readonly Chapter[];
  initialText?: string;
  generation?:
    | {
        kind: "chapter";
        onGenerate: () => boolean;
        renderForm: (props: {
          disabled: boolean;
          onGenerate: () => void;
        }) => ReactNode;
      }
    | { kind: "rewrite"; range?: ChapterTextRange };
  writer: Pick<
    ReturnType<typeof useNovel>,
    | "busy"
    | "generationStopped"
    | "draftIncomplete"
    | "draftBackupFailed"
    | "backupDraftText"
    | "error"
    | "stop"
    | "preview"
  >;
  ended: boolean;
  compactContext: boolean;
  onCompactContextChange: (checked: boolean) => void;
  onSave: (chapter: Chapter) => Promise<boolean>;
  onSelectChapter: (id: string) => void;
  onExit: () => void | Promise<void>;
  rewriteRequirements: string;
  onRewriteRequirementsChange: (requirements: string) => void;
  composerRequest: number;
  onDiscardRewrite: () => void;
  onRequestComposer: () => void;
  onBeginChapterRewrite: (range?: ChapterTextRange) => boolean;
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
  const [draftConflict, setDraftConflict] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [target, setTarget] = useState<ChapterTextSelection | null>(null);
  const [appliedRange, setAppliedRange] = useState<ChapterTextRange | null>(
    null,
  );
  const [caretBefore, setCaretBefore] = useState<string | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const polishInput = useRef<HTMLTextAreaElement>(null);
  const seenSelection = useRef("");
  const [selectionExpand, setSelectionExpand] = useState(0);
  const focusedNewChapter = useRef(false);
  const generatedScrollTop = useRef<number | null>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const caretMirror = useRef<HTMLDivElement>(null);
  const caretBar = useRef<HTMLDivElement>(null);
  const pendingSelection = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingCaret = useRef<number | null>(null);
  const generatingDraft = Boolean(generation);
  const isRewrite = generation?.kind === "rewrite";
  const rewriteRange = isRewrite ? generation.range : undefined;
  const isNewChapter = !chapters.some((chapter) => chapter.id === base.id);
  const waitingForRewrite =
    isRewrite && useGeneratedText && !writer.preview.trim();
  const rewriteThinking = writer.busy && waitingForRewrite;
  const showingPreview =
    generatingDraft && useGeneratedText && !waitingForRewrite;
  const draftText = showingPreview
    ? replaceTextRange(base.text, writer.preview, rewriteRange)
    : draft.text;
  const draftStatus = useChapterEditorDraft(
    roomKey,
    base.id,
    !isNewChapter && !waitingForRewrite,
    draftText === base.text ? undefined : draftText,
    base.text,
    (text, conflict) => {
      setDraft((current) => ({ ...current, text }));
      setDraftConflict(conflict);
    },
  );
  const draftLoading = draftStatus === "loading";
  const draftReadFailed = draftStatus === "read-error";
  const draftUnavailable = draftLoading || draftReadFailed;
  const draftWriting = draftStatus === "saving";
  const draftWriteFailed = draftStatus === "write-error";
  const currentDraft = generation ? { ...base, text: draftText } : draft;
  const revealGeneratedText = showingPreview && !writer.generationStopped;
  const textToReveal = showingPreview ? writer.preview : draftText;
  const newTextLength = textToReveal.length - revealedLength;
  const frameLength =
    isRewrite && revealGeneratedText
      ? Math.min(textToReveal.length, Math.max(1, revealedLength))
      : revealGeneratedText
        ? Math.min(
            textToReveal.length,
            revealedLength + Math.max(24, Math.ceil(newTextLength / 8)),
          )
        : textToReveal.length;
  const visibleLength =
    frameLength < textToReveal.length &&
    (textToReveal.codePointAt(frameLength - 1) ?? 0) > 0xffff
      ? frameLength + 1
      : frameLength;
  const revealPending = visibleLength < textToReveal.length;
  const visibleText = revealPending
    ? replaceTextRange(
        base.text,
        textToReveal.slice(0, visibleLength),
        rewriteRange,
      )
    : draftText;
  const editorBusy = writer.busy || revealPending;
  const dirty =
    draftText !== base.text &&
    (!generatingDraft || !useGeneratedText || Boolean(draftText.trim()));
  const exceedsLimit = draftText.length > maxChapterLength;
  const selectedRange =
    target ??
    (!showingPreview && !appliedRange && draftText === base.text
      ? rewriteRange
      : undefined);
  const highlight = draftLoading
    ? null
    : showingPreview && rewriteRange
      ? { start: rewriteRange.start, end: rewriteRange.start + visibleLength }
      : (selectedRange ?? appliedRange);
  const hasHighlight = Boolean(highlight);
  const cannotSave =
    !dirty ||
    draftUnavailable ||
    saving ||
    editorBusy ||
    exceedsLimit ||
    ((generatingDraft || isNewChapter) && !draftText.trim());
  const isPassage = Boolean(target || rewriteRange);
  const polishLabel = isPassage ? "润色选段" : "润色本章";
  const polishAvailable =
    !showDiff && (!generation || (isRewrite && editorBusy));
  const polishNeedsSave = !generatingDraft && (dirty || isNewChapter);
  useUnsavedNavigation(
    (generatingDraft && writer.busy) ||
      draftWriting ||
      (dirty && (isNewChapter || draftWriteFailed)),
    generatingDraft && writer.busy
      ? "章节正在生成，离开会中断本次生成。确定离开吗？"
      : isNewChapter
        ? "新章尚未保存为正文，确定离开吗？"
        : draftWriting
          ? "正在将草稿保存到本机，确定离开吗？"
          : "草稿未能保存到本机，确定离开吗？",
  );
  useRegisterPromptReuse((text) => {
    if (editorBusy || ended || saving || showDiff || isRewrite) return false;
    onRewriteRequirementsChange(text);
    if (polishAvailable) onRequestComposer();
    return true;
  });

  useLayoutEffect(() => {
    if (focusedNewChapter.current || generation || !isNewChapter) return;
    focusedNewChapter.current = true;
    editor.current?.focus({ preventScroll: true });
  }, [generation, isNewChapter]);

  useLayoutEffect(() => {
    if (isRewrite || revealedLength === visibleLength || !revealGeneratedText)
      return;
    const frame = requestAnimationFrame(() => setRevealedLength(visibleLength));
    return () => cancelAnimationFrame(frame);
  }, [isRewrite, revealGeneratedText, revealedLength, visibleLength]);

  const rewriteHasMore = isRewrite && revealPending;
  const advanceRewrite = useEffectEvent((from: number) => {
    if (!rewriteHasMore || visibleLength !== from) return;
    const remaining = textToReveal.length - from;
    const step = Math.max(2, Math.ceil(remaining / 12));
    setRevealedLength(Math.min(textToReveal.length, from + step));
  });

  // Incoming deltas extend the buffer without restarting the display timer.
  useEffect(() => {
    if (!rewriteHasMore) return;
    const timer = setTimeout(() => advanceRewrite(visibleLength), 40);
    return () => clearTimeout(timer);
  }, [rewriteHasMore, visibleLength]);

  useLayoutEffect(() => {
    const input = editor.current;
    if (!showingPreview || !visibleText || !input) return;
    // Updating the textarea value can move the viewport to the caret.
    input.scrollTop = generatedScrollTop.current ?? input.scrollHeight;
  }, [showingPreview, visibleText]);

  useLayoutEffect(() => {
    if (!isRewrite || editorBusy || !useGeneratedText) return;
    if (showingPreview) {
      setDraft({ ...base, text: draftText });
      if (rewriteRange)
        setAppliedRange({
          start: rewriteRange.start,
          end: rewriteRange.start + writer.preview.length,
        });
    }
    setUseGeneratedText(false);
  }, [
    base,
    draftText,
    editorBusy,
    isRewrite,
    rewriteRange,
    showingPreview,
    useGeneratedText,
    writer.preview,
  ]);

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

  const placeCaretBar = useCallback(() => {
    const input = editor.current;
    const mirrorLayer = caretMirror.current;
    const bar = caretBar.current;
    if (!input || !mirrorLayer || !bar) return;
    if (document.activeElement !== input) {
      bar.style.visibility = "hidden";
      return;
    }
    mirrorLayer.style.width = `${input.clientWidth}px`;
    const style = getComputedStyle(input);
    const lineHeight = Number.parseFloat(style.lineHeight) || 28;
    const padBottom = Number.parseFloat(style.paddingBottom) || 0;
    const lineTop =
      mirrorLayer.scrollHeight - padBottom - lineHeight - input.scrollTop;
    bar.style.visibility = "visible";
    bar.style.top = `${input.clientTop + lineTop}px`;
    bar.style.height = `${lineHeight}px`;
  }, []);

  const syncCaret = useCallback(() => {
    const input = editor.current;
    if (!input || document.activeElement !== input) {
      setCaretBefore(null);
      return;
    }
    const caret =
      input.selectionDirection === "backward"
        ? input.selectionStart
        : input.selectionEnd;
    const before = input.value.slice(0, caret);
    setCaretBefore((current) => (current === before ? current : before));
  }, []);

  useLayoutEffect(() => {
    const input = editor.current;
    if (!hasHighlight || showDiff || !input) return;
    const observer = new ResizeObserver(syncMirror);
    observer.observe(input);
    return () => observer.disconnect();
  }, [hasHighlight, showDiff, syncMirror]);

  // Keep the highlight aligned after a streamed update changes the textarea's scroll position.
  // biome-ignore lint/correctness/useExhaustiveDependencies: visibleText is the committed mirror and textarea text
  useLayoutEffect(() => {
    if (hasHighlight && !showDiff) syncMirror();
  }, [hasHighlight, showDiff, syncMirror, visibleText]);

  // Remeasure after the caret prefix and the textarea value commit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: those values are the committed mirror and textarea text
  useLayoutEffect(() => {
    syncCaret();
    placeCaretBar();
  }, [caretBefore, placeCaretBar, syncCaret, visibleText]);

  useEffect(() => {
    const input = editor.current;
    if (!input) return;
    const onScroll = () => {
      syncMirror();
      placeCaretBar();
    };
    const observer = new ResizeObserver(() => {
      const mirrorLayer = caretMirror.current;
      if (mirrorLayer) mirrorLayer.style.width = `${input.clientWidth}px`;
      placeCaretBar();
    });
    input.addEventListener("scroll", onScroll);
    input.addEventListener("focus", syncCaret);
    input.addEventListener("blur", syncCaret);
    input.addEventListener("keyup", syncCaret);
    input.addEventListener("mouseup", syncCaret);
    document.addEventListener("selectionchange", syncCaret);
    observer.observe(input);
    return () => {
      input.removeEventListener("scroll", onScroll);
      input.removeEventListener("focus", syncCaret);
      input.removeEventListener("blur", syncCaret);
      input.removeEventListener("keyup", syncCaret);
      input.removeEventListener("mouseup", syncCaret);
      document.removeEventListener("selectionchange", syncCaret);
      observer.disconnect();
    };
  }, [placeCaretBar, syncCaret, syncMirror]);

  useEffect(() => () => clearTimeout(pendingSelection.current), []);

  const selectionKey = target ? `${target.start}:${target.end}` : "";
  useLayoutEffect(() => {
    if (selectionKey && selectionKey !== seenSelection.current)
      setSelectionExpand((count) => count + 1);
    seenSelection.current = selectionKey;
  }, [selectionKey]);

  function closeRewrite() {
    if (writer.busy) return;
    clearTimeout(pendingSelection.current);
    setTarget(null);
  }

  async function save() {
    if (cannotSave) return;
    if (draftConflict && !window.confirm("这份草稿基于旧正文。确定用它替换现在的章节正文？")) return;
    clearTimeout(pendingSelection.current);
    if (!isRewrite) closeRewrite();
    setSaving(true);
    setSaveFailed(false);
    if (generation) {
      setDraft(currentDraft);
      setUseGeneratedText(false);
    }
    try {
      const saved = await onSave(currentDraft);
      setSaveFailed(!saved);
      if (saved) {
        setDraftConflict(false);
        setAppliedRange(null);
        setShowDiff(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function discardDraft() {
    if (dirty && !window.confirm("放弃草稿，恢复已保存的正文？")) return;
    setSaving(true);
    try {
      await writeChapterEditorDraft(roomKey, base.id, undefined);
      onDiscardRewrite();
      setDraft(base);
      setDraftConflict(false);
      setUseGeneratedText(false);
      setShowDiff(false);
      setSaveFailed(false);
      setAppliedRange(null);
      closeRewrite();
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function deleteSelection() {
    if (!target || editorBusy) return;
    const { start, end } = target;
    const before = draft.text.slice(0, start);
    pendingCaret.current = before.replace(/\r\n?/g, "\n").length;
    const text = before + draft.text.slice(end);
    if (isNewChapter) writer.backupDraftText(text);
    setDraft({ ...draft, text });
    setAppliedRange(null);
    closeRewrite();
  }

  function submitPolish() {
    if (
      generation ||
      saving ||
      ended ||
      editorBusy ||
      draftUnavailable ||
      polishNeedsSave
    )
      return;
    const range = target ?? undefined;
    if (!(range ? base.text.slice(range.start, range.end) : draftText).trim())
      return;
    if (!onBeginChapterRewrite(range)) return;
    clearTimeout(pendingSelection.current);
    generatedScrollTop.current = range
      ? (editor.current?.scrollTop ?? 0)
      : null;
    setTarget(null);
    setRevealedLength(0);
    setUseGeneratedText(true);
    setSaveFailed(false);
  }

  const polishComposer = (
    <FloatingComposer
      label={polishLabel}
      wrapTrigger={(trigger) => (
        <NovelActionTooltip hint={rewriteHint(isPassage, compactContext)}>
          {trigger}
        </NovelActionTooltip>
      )}
      draft={rewriteRequirements.trim()}
      requestOpen={composerRequest}
      expandRequest={selectionExpand}
      onFocusInput={() => polishInput.current?.focus({ preventScroll: true })}
    >
      <ChapterRewriteForm
        embedded
        isPassage={isPassage}
        inputRef={polishInput}
        title={polishLabel}
        requirements={rewriteRequirements}
        onChange={onRewriteRequirementsChange}
        compactContext={compactContext}
        onCompactContextChange={onCompactContextChange}
        disabled={
          ended ||
          saving ||
          editorBusy ||
          draftUnavailable ||
          (target
            ? !draft.text.slice(target.start, target.end).trim()
            : !draftText.trim())
        }
        submitDisabled={polishNeedsSave}
        submitLabel={
          rewriteThinking
            ? "思考中…"
            : isRewrite
              ? "正在润色…"
              : polishNeedsSave
                ? "保存章节后可润色"
                : "开始润色"
        }
        onGenerate={submitPolish}
        onDelete={target ? deleteSelection : undefined}
      />
    </FloatingComposer>
  );

  return (
    <ComposerDock composer={polishAvailable ? polishComposer : null}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/95">
        <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-3">
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <NovelActionButton
              hint={localActionHint("返回阅读页，保留本机草稿。")}
              size="sm"
              variant="ghost"
              className="shrink-0"
              disabled={editorBusy || saving || draftWriting}
              onClick={async () => {
                if (!isNewChapter && !confirmAgentNavigation()) return;
                if (isNewChapter) setSaving(true);
                try {
                  await onExit();
                } finally {
                  if (isNewChapter) setSaving(false);
                }
              }}
            >
              <ArrowLeft data-icon="inline-start" />
              返回阅读
            </NovelActionButton>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <WorldSelect
                label="章节目录"
                size="sm"
                className="max-w-md"
                value={base.id}
                disabled={
                  isNewChapter ||
                  draftWriting ||
                  (dirty && draftWriteFailed) ||
                  saving ||
                  editorBusy
                }
                title={draftWriteFailed ? "草稿未能保存到本机" : undefined}
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
                (draftReadFailed ||
                  draftWriteFailed ||
                  (dirty && saveFailed)) &&
                  "text-destructive",
              )}
            >
              {generation && editorBusy
                ? rewriteThinking
                  ? "思考中…"
                  : draftText
                    ? "正在生成…"
                    : "等待输出…"
                : saving
                  ? "保存中…"
                  : draftLoading
                    ? "读取草稿中…"
                    : draftReadFailed
                      ? "草稿读取失败"
                      : draftWriteFailed
                        ? "草稿未能保存到本机"
                        : saveFailed
                          ? "保存章节失败"
                          : draftWriting
                            ? "保存草稿中…"
                            : dirty && !isNewChapter
                              ? "草稿已存本机"
                              : generatingDraft || dirty
                                ? "未保存"
                                : "已保存"}
            </span>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <h2 className="flex items-center gap-1.5 font-medium">
                {generation && editorBusy ? (
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : null}
              </h2>
              <span
                className={cn(
                  "whitespace-nowrap text-xs text-muted-foreground",
                  exceedsLimit && "text-destructive",
                )}
              >
                {visibleText.length} / {maxChapterLength} 字
              </span>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!generation && !ended ? <PromptHistoryDialog roomKey={roomKey} /> : null}
            {!isNewChapter && (dirty || isRewrite) ? (
              <NovelActionButton
                hint={localActionHint("恢复已保存的正文。")}
                size="sm"
                variant="ghost"
                disabled={editorBusy || saving || draftWriting}
                onClick={() => void discardDraft()}
              >
                {dirty ? "放弃草稿" : "返回编辑"}
              </NovelActionButton>
            ) : null}
            {generation && writer.busy ? (
              <NovelActionButton
                hint={stopGenerationHint}
                type="button"
                size="sm"
                variant="outline"
                onClick={writer.stop}
              >
                <Square data-icon="inline-start" />
                停止生成
              </NovelActionButton>
            ) : null}
            {showDiff ? (
              <NovelActionButton
                hint={localActionHint("关闭对比，继续编辑草稿。")}
                size="sm"
                variant="outline"
                disabled={editorBusy || saving}
                onClick={() => setShowDiff(false)}
              >
                <PencilLine data-icon="inline-start" />
                返回编辑
              </NovelActionButton>
            ) : (
              <NovelActionButton
                hint={localActionHint("对比已保存正文和当前草稿。")}
                size="sm"
                variant="outline"
                disabled={!dirty || editorBusy || saving}
                onClick={() => {
                  if (target) closeRewrite();
                  setShowDiff(true);
                }}
              >
                <GitCompareArrows data-icon="inline-start" />
                查看修改
              </NovelActionButton>
            )}
            <NovelActionButton
              hint={localActionHint(
                isNewChapter
                  ? "保存草稿并加入章节目录。"
                  : "将草稿保存为章节正文。",
              )}
              size="sm"
              disabled={cannotSave}
              onClick={() => void save()}
            >
              <Save data-icon="inline-start" />
              {generation ? "应用草稿" : "保存章节"}
            </NovelActionButton>
          </div>
        </div>
        {draftConflict ? (
          <p role="alert" className="px-5 py-2 text-sm text-muted-foreground">
            正文已更新，这份草稿基于旧版本。保存前请查看修改。
          </p>
        ) : null}
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
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-5 py-4 sm:px-8">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <div
                className={cn(
                  "relative flex min-h-48 flex-1 overflow-hidden",
                  polishAvailable &&
                    "[--editor-bottom-padding:calc(var(--composer-dock-height,0px)+1.5rem)]",
                )}
              >
                <div
                  ref={caretBar}
                  aria-hidden
                  className="pointer-events-none absolute right-px left-px bg-foreground/5"
                  style={{ visibility: "hidden" }}
                />
                <div
                  ref={caretMirror}
                  aria-hidden
                  className={cn(
                    "pointer-events-none invisible absolute top-0 overflow-hidden wrap-break-word whitespace-pre-wrap px-3 pt-2 text-sm leading-7",
                    polishAvailable ? "pb-(--editor-bottom-padding)" : "pb-2",
                  )}
                >
                  {caretBefore}
                  {"\u200b"}
                </div>
                {highlight ? (
                  <div
                    ref={mirror}
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-px overflow-hidden wrap-break-word whitespace-pre-wrap px-3 pt-2 text-sm leading-7 text-transparent",
                      polishAvailable ? "pb-(--editor-bottom-padding)" : "pb-2",
                    )}
                  >
                    {visibleText.slice(0, highlight.start)}
                    <mark className="text-transparent bg-primary/25">
                      {visibleText.slice(highlight.start, highlight.end)}
                    </mark>
                    {visibleText.slice(highlight.end)}
                    {"\u200b"}
                  </div>
                ) : null}
                <Textarea
                  ref={editor}
                  variant="plain"
                  aria-label="章节正文"
                  readOnly={editorBusy || saving || draftUnavailable}
                  value={draftLoading ? "" : visibleText}
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
                        !rewriteRange &&
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
                    if (isNewChapter)
                      writer.backupDraftText(event.target.value);
                    setDraft({ ...draft, text: event.target.value });
                  }}
                  onSelect={(event) => {
                    if (
                      generatingDraft ||
                      saving ||
                      draftUnavailable ||
                      writer.busy
                    )
                      return;
                    const input = event.currentTarget;
                    clearTimeout(pendingSelection.current);
                    pendingSelection.current = setTimeout(() => {
                      if (document.activeElement !== input) return;
                      const {
                        selectionStart,
                        selectionEnd,
                        selectionDirection,
                      } = input;
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
                      setAppliedRange(null);
                      setTarget(selection);
                    }, 100);
                  }}
                  className={cn(
                    "relative min-h-48 flex-1 resize-none leading-7 focus:border-transparent",
                    polishAvailable && "pb-(--editor-bottom-padding)",
                    selectedRange && "selection:bg-transparent",
                  )}
                />
              </div>
              {isNewChapter && writer.draftBackupFailed ? (
                <p role="alert" className="text-xs text-destructive">
                  草稿未能保存到本机，请重试或先保存章节。
                </p>
              ) : null}
              {generation || target || saveFailed ? (
                <>
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
                  {generation?.kind === "chapter"
                    ? generation.renderForm({
                        disabled: ended || saving || editorBusy,
                        onGenerate: () => {
                          if (
                            dirty &&
                            !window.confirm(
                              "重新生成会替换当前草稿，确定继续吗？",
                            )
                          )
                            return;
                          if (generation.onGenerate()) {
                            generatedScrollTop.current = null;
                            setRevealedLength(0);
                            setUseGeneratedText(true);
                            setSaveFailed(false);
                          }
                        },
                      })
                    : null}
                </>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </ComposerDock>
  );
}
