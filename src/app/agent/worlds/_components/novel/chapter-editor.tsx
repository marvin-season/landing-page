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
import { ComposerDock, FloatingComposer } from "../floating-composer";
import { WorldSelect } from "../world-select";
import { ChapterDiffView } from "./chapter-diff-view";
import { ChapterRewriteForm } from "./chapter-generation-form";
import { useRegisterPromptReuse } from "./chapter-prompt-reuse";
import {
  type ChapterTextRange,
  type ChapterTextSelection,
  textareaSelectionRange,
} from "./chapter-text";
import { type Chapter, maxChapterLength } from "./model";
import { RewritePanel } from "./rewrite-form";
import { useChapterEditorDraft } from "./use-chapter-editor-draft";
import type { useNovel } from "./use-novel";

export function ChapterEditor({
  roomKey,
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
  rewriteRequirements,
  onRewriteRequirementsChange,
  composerRequest,
  onRequestComposer,
  onBeginChapterRewrite,
}: {
  roomKey: string;
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
  onExit: () => void | Promise<void>;
  rewriteRequirements: string;
  onRewriteRequirementsChange: (requirements: string) => void;
  composerRequest: number;
  onRequestComposer: () => void;
  onBeginChapterRewrite: () => boolean;
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
  const isNewChapter = !chapters.some((chapter) => chapter.id === base.id);
  const waitingForRewrite =
    generation?.kind === "rewrite" &&
    useGeneratedText &&
    !writer.preview.trim();
  const draftText =
    generation && useGeneratedText && (!waitingForRewrite || writer.busy)
      ? writer.preview
      : draft.text;
  const draftStatus = useChapterEditorDraft(
    roomKey,
    base.id,
    !isNewChapter && !waitingForRewrite,
    draftText === base.text ? undefined : draftText,
    (text) => {
      setDraft((current) => ({ ...current, text }));
      if (initialSelection && text !== base.text) {
        writer.discardRewrite({ selectionOnly: true });
        setTarget(null);
      }
    },
  );
  const draftLoading = draftStatus === "loading";
  const draftReadFailed = draftStatus === "read-error";
  const draftUnavailable = draftLoading || draftReadFailed;
  const draftWriting = draftStatus === "saving";
  const draftWriteFailed = draftStatus === "write-error";
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
  const editingLocked =
    !draftUnavailable &&
    Boolean(target && (writer.busy || writer.rewriteReady));
  const cannotSave =
    !dirty ||
    draftUnavailable ||
    saving ||
    editingLocked ||
    editorBusy ||
    exceedsLimit ||
    ((generatingDraft || isNewChapter) && !draftText.trim());
  const selectionPending = editingLocked;
  const polishLabel = target ? "润色选段" : "润色本章";
  const polishAvailable = !showDiff && generation?.kind !== "chapter";
  const polishNeedsSave = !generatingDraft && (dirty || isNewChapter);
  useUnsavedNavigation(
    (generatingDraft && writer.busy) ||
      selectionPending ||
      draftWriting ||
      (dirty && !editingLocked && (isNewChapter || draftWriteFailed)),
    (generatingDraft || target) && writer.busy
      ? "章节正在生成，离开会中断本次生成。确定离开吗？"
      : isNewChapter
        ? "新章尚未保存为正文，确定离开吗？"
        : selectionPending
          ? "草稿尚未应用，确定离开吗？"
          : draftWriting
            ? "正在将草稿保存到本机，确定离开吗？"
            : "草稿未能保存到本机，确定离开吗？",
  );
  useRegisterPromptReuse((text) => {
    if (writer.busy || writer.rewriteReady || ended || saving || showDiff)
      return false;
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
    if (generation?.kind !== "rewrite" || writer.busy || !useGeneratedText)
      return;
    if (writer.preview.trim()) setDraft({ ...base, text: writer.preview });
    setUseGeneratedText(false);
  }, [base, generation?.kind, useGeneratedText, writer.busy, writer.preview]);

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
    if (!highlight || !input) return;
    syncMirror();
    const observer = new ResizeObserver(syncMirror);
    observer.observe(input);
    return () => observer.disconnect();
  }, [highlight, syncMirror]);

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
    writer.discardRewrite({ selectionOnly: true });
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
    const text = before + draft.text.slice(end);
    if (isNewChapter) writer.backupDraftText(text);
    setDraft({ ...draft, text });
    setAppliedRange(null);
    closeRewrite();
  }

  function submitPolish() {
    if (saving || ended || editorBusy || draftUnavailable || polishNeedsSave)
      return;
    if (target) {
      if (!draft.text.slice(target.start, target.end).trim()) return;
      if (
        !writer.rewrite(draft.id, rewriteRequirements, {
          range: { start: target.start, end: target.end },
          compactContext,
        })
      )
        return;
      return;
    }
    if (!draftText.trim()) return;
    if (dirty && !window.confirm("重新生成会替换当前草稿，确定继续吗？"))
      return;
    if (!onBeginChapterRewrite()) return;
    generatedScrollTop.current = null;
    setRevealedLength(0);
    setUseGeneratedText(true);
    setSaveFailed(false);
  }

  const polishComposer = (
    <FloatingComposer
      label={polishLabel}
      draft={rewriteRequirements.trim()}
      forceOpen={selectionPending}
      requestOpen={composerRequest}
      expandRequest={selectionExpand}
      onFocusInput={() => polishInput.current?.focus({ preventScroll: true })}
    >
      {selectionPending && target ? (
        <RewritePanel
          embedded
          key={`${target.start}:${target.end}`}
          autoFocus={false}
          isPassage
          preview={writer.task === "rewrite" ? writer.preview : ""}
          requirements={rewriteRequirements}
          draftReady={writer.rewriteReady}
          compactContext={compactContext}
          onCompactContextChange={onCompactContextChange}
          writer={writer}
          ended={ended || !draft.text.slice(target.start, target.end).trim()}
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
            });
          }}
        />
      ) : (
        <ChapterRewriteForm
          embedded
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
            polishNeedsSave
              ? "保存章节后可润色"
              : generation?.kind === "rewrite"
                ? "重新生成"
                : "开始润色"
          }
          onGenerate={submitPolish}
          onDelete={target ? deleteSelection : undefined}
        />
      )}
    </FloatingComposer>
  );

  return (
    <ComposerDock composer={polishAvailable ? polishComposer : null}>
      <div className="@container flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/95">
        <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-3">
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              disabled={editorBusy || editingLocked || saving || draftWriting}
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
            </Button>
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
                  editingLocked ||
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
                ? draftText
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
              !isNewChapter && "@3xl:max-w-none @3xl:flex-row",
            )}
          >
            {!isNewChapter ? (
              <section className="hidden min-h-0 min-w-0 flex-1 flex-col gap-2 border-r border-border p-4 @3xl:flex">
                <h2 className="flex min-h-6 shrink-0 items-center text-sm font-medium text-muted-foreground">
                  已保存正文
                </h2>
                <div className="min-h-0 flex-1 overflow-y-auto wrap-break-word whitespace-pre-wrap px-3 py-2 pb-(--composer-dock-height) text-sm leading-7">
                  {base.text}
                </div>
              </section>
            ) : null}
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
                  "relative flex min-h-48 flex-1 overflow-hidden",
                  target && "@3xl:min-h-0",
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
                  className="pointer-events-none invisible absolute top-0 overflow-hidden wrap-break-word whitespace-pre-wrap px-3 py-2 text-sm leading-7"
                >
                  {caretBefore}
                  {"\u200b"}
                </div>
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
                  readOnly={
                    editorBusy || editingLocked || saving || draftUnavailable
                  }
                  placeholder={
                    generation?.kind === "rewrite" && writer.busy
                      ? "等待输出…"
                      : undefined
                  }
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
                      editingLocked ||
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
                      writer.discardRewrite({ selectionOnly: true });
                      setAppliedRange(null);
                      setTarget(selection);
                    }, 100);
                  }}
                  className={cn(
                    "relative min-h-48 flex-1 resize-none leading-7 focus:border-transparent",
                    polishAvailable && "scroll-pb-(--composer-dock-height)",
                    target && "selection:bg-transparent",
                    target && "@3xl:min-h-0",
                  )}
                />
              </div>
              {isNewChapter && writer.draftBackupFailed ? (
                <p role="alert" className="text-xs text-destructive">
                  草稿未能保存到本机，请重试或先保存章节。
                </p>
              ) : null}
              {generation ? (
                <>
                  {writer.error &&
                  (generation.kind === "chapter" || !selectionPending) ? (
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
                  {generation.kind === "chapter"
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
